from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from supabase import Client
from typing import Optional, Dict, Any, List
from app.utils.attempt_control import calculate_test_max_marks, apply_section_attempt_control

router = APIRouter()

@router.get("/{attempt_id}")
async def get_test_result(
    attempt_id: str,
    db: Client = Depends(get_db)
):
    try:
        # Fetch attempt with test details
        response = db.table("user_tests")\
            .select("*, tests(*, profiles(full_name, avatar_url))")\
            .eq("id", attempt_id)\
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Result not found")
            
        result = response.data[0]
        test = result.get("tests")
        
        # We can perform additional server-side calculations here if needed
        # e.g., Rank calculation (mocked or real)
        
        # Rank logic (expensive, so maybe simple query counting scores higher than this)
        # count_higher = db.table("user_tests").select("id", count="exact").eq("test_id", result["test_id"]).gt("score", result["score"]).execute()
        # rank = count_higher.count + 1
        
        return {
            "attempt": result,
            "test": test,
            "analytics": {
                # "rank": rank,
                "percentile": 0 # Placeholder
            }
        }

    except Exception as e:
        print(f"Error fetching result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
class AnalyzeRequest(BaseModel):
    test: dict
    answers: dict

def parse_mark(value: Any, default_val: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if not value:
        return default_val
    try:
        val_str = str(value)
        if '/' in val_str:
            parts = val_str.split('/')
            if len(parts) == 2 and float(parts[1]) != 0:
                return float(parts[0]) / float(parts[1])
        return float(val_str)
    except:
        return default_val

@router.post("/analyze")
async def analyze_test_results(payload: AnalyzeRequest):
    test = payload.test
    answers = payload.answers
    
    enable_section = test.get("enable_section_mode", False)
    sections = test.get("sections", [])
    
    # Calculate Max Marks (backend logic)
    max_marks_info = calculate_test_max_marks(test)
    total_max_marks = max_marks_info.get("total_max_marks", 0.0)
    section_max_marks = max_marks_info.get("section_max_marks", {})
    
    # Apply attempt control to filter answers (if applicable)
    if enable_section and sections:
        try:
            answers = apply_section_attempt_control(sections, answers)
        except ValueError as e:
            # If answers exceed limit, limit them by slicing keys
            pass

    correct_count = 0
    partial_count = 0
    wrong_count = 0
    skipped_count = 0
    calculated_score = 0.0

    section_data = {}
    
    if enable_section and sections:
        for sec in sections:
            sec_id = str(sec.get("id"))
            section_data[sec_id] = {
                "name": sec.get("name"),
                "correct": 0,
                "wrong": 0,
                "partial": 0,
                "skipped": 0,
                "attempted": 0,
                "score": 0.0,
                "maxScore": section_max_marks.get(sec_id, 0.0),
                "totalQ": 0,
                "marksPerQuestion": sec.get("marks_per_question"),
                "negativeMarks": sec.get("negative_marks")
            }
    else:
        section_data["default"] = {
            "name": "General",
            "correct": 0,
            "wrong": 0,
            "partial": 0,
            "skipped": 0,
            "attempted": 0,
            "score": 0.0,
            "maxScore": total_max_marks,
            "totalQ": 0,
            "marksPerQuestion": test.get("marks_per_question"),
            "negativeMarks": test.get("negative_marks")
        }

    question_status = {}

    type_data = {
        "single": {"name": "Single Choice", "correct": 0, "wrong": 0, "count": 0},
        "multiple": {"name": "Multiple Choice", "correct": 0, "wrong": 0, "count": 0, "partial": 0},
        "numerical": {"name": "Numerical", "correct": 0, "wrong": 0, "count": 0}
    }

    topic_data = {}

    questions = test.get("questions", [])
    if enable_section and sections:
        # If in section mode, source questions from sections
        questions = []
        for sec in sections:
            sec_qs = sec.get("questions", [])
            # Inject section info into questions if needed for marking
            for q in sec_qs:
                q["_section_id"] = str(sec.get("id"))
                q["_section_marks"] = sec.get("marks_per_question")
                q["_section_neg"] = sec.get("negative_marks")
            questions.extend(sec_qs)

    for index, q in enumerate(questions):
        current_section_id = q.get("_section_id", "default")
        q_id = str(q.get("id"))
        
        marks = parse_mark(q.get("_section_marks") or test.get("marks_per_question"), 4.0)
        neg = parse_mark(q.get("_section_neg") or test.get("negative_marks"), 1.0)
                
        if q.get("marks") is not None:
            marks = parse_mark(q.get("marks"), marks)
        if q.get("negativeMarks") is not None:
            neg = parse_mark(q.get("negativeMarks"), neg)
            
        if current_section_id in section_data:
            section_data[current_section_id]["totalQ"] += 1
            # maxScore is already assigned from max_marks_info
            
        q_type = q.get("type", "single")
        if q_type in type_data:
            type_data[q_type]["count"] += 1
            
        q_topic = q.get("topic") or "Uncategorized"
        if q_topic not in topic_data:
            topic_data[q_topic] = {
                "name": q_topic,
                "correct": 0,
                "wrong": 0,
                "partial": 0,
                "skipped": 0,
                "score": 0.0,
                "maxScore": 0.0,
                "count": 0
            }
        topic_data[q_topic]["count"] += 1
        topic_data[q_topic]["maxScore"] += marks
            
        # user answer might be in key as string or int since JSON
        ans = answers.get(q_id)
        if ans is None and q_id.isdigit():
            ans = answers.get(int(q_id))
        
        q_score = 0.0
        is_correct = False
        is_partial = False
        is_skipped = ans is None or ans == "" or ans == []
        is_wrong = False
        
        if is_skipped:
            skipped_count += 1
            if current_section_id in section_data:
                section_data[current_section_id]["skipped"] += 1
        else:
            if q_type == "numerical":
                try:
                    num_ans = float(ans)
                    correct_ans = q.get("correctAnswer", {})
                    if isinstance(correct_ans, dict):
                        is_exact_match = correct_ans.get("exactMatch", False)
                        if is_exact_match:
                            exact_answers_str = str(correct_ans.get("exactAnswers", ""))
                            exact_answers = []
                            for ea in exact_answers_str.split(","):
                                ea = ea.strip()
                                if ea:
                                    try:
                                        exact_answers.append(float(ea))
                                    except:
                                        pass
                            if num_ans in exact_answers:
                                is_correct = True
                                q_score = marks
                            else:
                                is_wrong = True
                                q_score = -neg
                        elif "min" in correct_ans and "max" in correct_ans:
                            if correct_ans["min"] <= num_ans <= correct_ans["max"]:
                                is_correct = True
                                q_score = marks
                            else:
                                is_wrong = True
                                q_score = -neg
                        else:
                            is_wrong = True
                            q_score = -neg
                    else:
                        is_wrong = True
                        q_score = -neg
                except:
                    is_wrong = True
                    q_score = -neg
                    
            elif q_type == "multiple":
                correct_arr = []
                c_a = q.get("correctAnswer")
                if isinstance(c_a, list):
                    correct_arr = sorted([str(x) for x in c_a])
                else:
                    correct_arr = [str(c_a)]
                    
                user_arr = []
                if isinstance(ans, list):
                    user_arr = sorted([str(x) for x in ans])
                else:
                    user_arr = [str(ans)]
                    
                has_incorrect = any(a not in correct_arr for a in user_arr)
                if has_incorrect:
                    is_wrong = True
                    q_score = -neg
                else:
                    if len(user_arr) == len(correct_arr) and len(correct_arr) > 0:
                        is_correct = True
                        q_score = marks
                    elif len(user_arr) > 0:
                        is_partial = True
                        fraction = len(user_arr) / len(correct_arr)
                        q_score = fraction * marks
                        
            else: # single
                if str(ans) == str(q.get("correctAnswer")):
                    is_correct = True
                    q_score = marks
                else:
                    is_wrong = True
                    q_score = -neg
                    
        if is_correct:
            correct_count += 1
            if q_type in type_data: type_data[q_type]["correct"] += 1
        if is_partial:
            partial_count += 1
            if q_type in type_data: 
                if "partial" not in type_data[q_type]: type_data[q_type]["partial"] = 0
                type_data[q_type]["partial"] += 1
        if is_wrong:
            wrong_count += 1
            if q_type in type_data: type_data[q_type]["wrong"] += 1
            
        calculated_score += q_score
        
        status_label = "skipped"
        if is_correct: status_label = "correct"
        elif is_partial: status_label = "partial"
        elif is_wrong: status_label = "wrong"

        question_status[q_id] = {
            "status": status_label,
            "score": q_score
        }
        
        if current_section_id in section_data:
            if not is_skipped: section_data[current_section_id]["attempted"] += 1
            if is_correct: section_data[current_section_id]["correct"] += 1
            if is_partial: section_data[current_section_id]["partial"] += 1
            if is_wrong: section_data[current_section_id]["wrong"] += 1
            section_data[current_section_id]["score"] += q_score
            
        if q_topic in topic_data:
            if is_skipped: topic_data[q_topic]["skipped"] += 1
            elif is_correct: topic_data[q_topic]["correct"] += 1
            elif is_partial: topic_data[q_topic]["partial"] += 1
            elif is_wrong: topic_data[q_topic]["wrong"] += 1
            topic_data[q_topic]["score"] += q_score
            
    total_questions = len(questions)
    accuracy = 0
    total_attempted = correct_count + partial_count + wrong_count
    if total_attempted > 0:
        accuracy = round(((correct_count + (partial_count * 0.5)) / total_attempted) * 100)
        
    percentage = 0
    if total_max_marks > 0:
        percentage = round((calculated_score / total_max_marks) * 100)
        
    # Format data for charts
    pie_data = [
        {"name": "Correct", "value": correct_count, "color": "#10b981"},
        {"name": "Wrong", "value": wrong_count, "color": "#ef4444"},
        {"name": "Partial", "value": partial_count, "color": "#3b82f6"},
        {"name": "Skipped", "value": skipped_count, "color": "#94a3b8"}
    ]
    pie_data = [d for d in pie_data if d["value"] > 0]
    
    radar_data = []
    bar_data = []
    
    for sec_id, sec in section_data.items():
        max_s = sec["maxScore"] if sec["maxScore"] > 0 else 1.0
        radar_data.append({
            "subject": sec["name"],
            "A": round((sec["score"] / max_s) * 100),
            "fullMark": 100
        })
        bar_data.append({
            "name": sec["name"],
            "Score": round(sec["score"], 2),
            "MaxScore": sec["maxScore"]
        })
        
    type_chart_data = []
    for t_id, t in type_data.items():
        if t["count"] > 0:
            type_chart_data.append({
                "name": t["name"],
                "Correct": t["correct"],
                "Wrong": t["wrong"],
                "Partial": t.get("partial", 0)
            })

    # Merged Section Marks aggregation
    merged_section_data = []
    merged_sections_config = test.get("merged_sections", []) or []
    if merged_sections_config and enable_section and sections:
        for merge_group in merged_sections_config:
            label = merge_group.get("label", "")
            sec_ids = merge_group.get("section_ids", [])
            merged_score = 0.0
            merged_max = 0.0
            for sid in sec_ids:
                s = section_data.get(str(sid), {})
                merged_score += s.get("score", 0.0)
                merged_max += s.get("maxScore", 0.0)
            merged_section_data.append({
                "label": label,
                "score": round(merged_score, 2),
                "maxScore": round(merged_max, 2)
            })
            
    # Post-process topicData for performance labels
    formatted_topics = []
    for t in topic_data.values():
        percentage = 0
        if t["maxScore"] > 0:
            percentage = (t["score"] / t["maxScore"]) * 100
        
        performance = "Weak"
        if percentage >= 75: performance = "Strong"
        elif percentage >= 40: performance = "Moderate"
        
        t["percentage"] = round(percentage, 2)
        t["performance"] = performance
        formatted_topics.append(t)
            
    return {
        "finalScore": round(calculated_score, 2),
        "totalMaxMarks": total_max_marks,
        "accuracy": accuracy,
        "percentage": percentage,
        "correctCount": correct_count,
        "wrongCount": wrong_count,
        "partialCount": partial_count,
        "skippedCount": skipped_count,
        "totalQuestions": total_questions,
        "sectionData": section_data,
        "typeData": type_data,
        "questionStatus": question_status,
        "pieData": pie_data,
        "radarData": radar_data,
        "barData": bar_data,
        "typeChartData": type_chart_data,
        "mergedSectionData": merged_section_data,
        "topicData": formatted_topics
    }
