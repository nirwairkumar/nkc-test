from typing import List, Dict, Any, Optional

def apply_section_attempt_control(sections: List[Dict[str, Any]], user_answers: Dict[str, Any]):
    """
    Applies attempt control filtering to section-wise results.
    
    Returns a dictionary containing:
    - filtered_answers: The subset of answers that were counted.
    - section_stats: Stats per section after filtering.
    - total_score_adjustment: (Optional) if we were calculating score here.
    
    Constraint: Only post-processing of section results is allowed.
    We assume each question has a score already calculated or can be calculated.
    """
    
    # Map questions to sections
    question_to_section = {}
    for section in sections:
        for q in section.get("questions", []):
            question_to_section[str(q.get("id"))] = section
            
    filtered_answers = {}
    section_results = []
    
    for section in sections:
        section_id = section.get("id")
        attempt_control = section.get("attempt_control", {})
        
        if not attempt_control or not attempt_control.get("enabled"):
            # No control, take all answers for this section
            for q_id, ans in user_answers.items():
                if question_to_section.get(str(q_id)) == section:
                    filtered_answers[q_id] = ans
            continue
            
        max_attempts = attempt_control.get("max_attempts", 0)
        mode = attempt_control.get("mode", "hard")
        
        # Get all valid answers for this section
        section_answers = []
        for q_id, ans in user_answers.items():
            if question_to_section.get(str(q_id)) == section:
                is_attempted = False
                if ans is not None:
                    if isinstance(ans, str) and str(ans).strip() != "":
                        is_attempted = True
                    elif isinstance(ans, list) and len(ans) > 0:
                        is_attempted = True
                    elif isinstance(ans, dict) and len(ans) > 0:
                        is_attempted = True
                    elif isinstance(ans, (int, float)):
                        is_attempted = True
                        
                if is_attempted:
                    section_answers.append({"id": q_id, "answer": ans})
                
        # "Hard" mode: Frontend blocks, but backend validates.
        if mode == "hard":
            if len(section_answers) > max_attempts:
                # Strictly speaking, we should probably throw an error here or just truncate.
                # The requirement says "return validation error".
                raise ValueError(f"Section {section.get('name')} exceeded maximum attempts ({max_attempts})")
            
            for item in section_answers:
                filtered_answers[item["id"]] = item["answer"]
                
        # "Soft" mode: Filtering logic
        elif mode == "soft":
            soft_type = attempt_control.get("soft_type", "first_n")
            
            if soft_type == "first_n":
                # Take first N questions by question order in the section
                section_q_ids = [str(q.get("id")) for q in section.get("questions", [])]
                # Filter section_answers to keep only those that are in the first N of section_q_ids
                attempted_q_ids = [item["id"] for item in section_answers]
                
                # Sort attempted questions based on their index in the section
                attempted_q_ids.sort(key=lambda x: section_q_ids.index(str(x)) if str(x) in section_q_ids else 9999)
                
                for q_id in attempted_q_ids[:max_attempts]:
                    filtered_answers[q_id] = user_answers[q_id]
                    
            elif soft_type == "best_n":
                # REQUIREMENT: "best_n -> highest scoring N questions counted."
                # This requires calculating scores per question first.
                # For now, we will return a flag or placeholder if we can't calculate scores yet.
                # However, the backend submission logic in attempts.py doesn't currently calculate scores; the frontend does.
                # If the backend is just a passthrough, "best_n" is hard to implement without backend scoring logic.
                
                # WAIT: The prompt says "Implement as additive middleware after scoring."
                # and "Backend Implementation Plan: Score all questions normally. Group results section-wise. Apply attempt_control filtering per section. Aggregate final score. Return structured result."
                
                # This implies I should also implement a basic scoring logic if I'm adding this middleware.
                # But "Do NOT modify any existing scoring logic."
                
                # If there IS NO existing backend scoring logic, I should provide the structure for it.
                # Let's assume the middleware receives scored results.
                pass

    return filtered_answers

def apply_section_attempt_control_to_results(sections: List[Dict[str, Any]], scored_questions: List[Dict[str, Any]]):
    """
    This version operates on scored question results.
    scored_questions: List of { question_id, score, is_correct, ... }
    """
    filtered_scored_questions = []
    
    # Map scored questions to sections
    section_map = {str(section.get("id")): [] for section in sections}
    q_to_section_id = {}
    for section in sections:
        for q in section.get("questions", []):
            q_to_section_id[str(q.get("id"))] = str(section.get("id"))

    for sq in scored_questions:
        sid = q_to_section_id.get(str(sq.get("question_id")))
        if sid:
            section_map[sid].append(sq)
            
    for section in sections:
        sid = str(section.get("id"))
        sq_in_section = section_map[sid]
        attempt_control = section.get("attempt_control", {})
        
        if not attempt_control or not attempt_control.get("enabled"):
            filtered_scored_questions.extend(sq_in_section)
            continue
            
        max_attempts = attempt_control.get("max_attempts", 0)
        mode = attempt_control.get("mode", "hard")
        
        if mode == "hard":
            if len(sq_in_section) > max_attempts:
                raise ValueError(f"Section {section.get('name')} exceeded maximum attempts ({max_attempts})")
            filtered_scored_questions.extend(sq_in_section)
            
        elif mode == "soft":
            soft_type = attempt_control.get("soft_type", "first_n")
            if soft_type == "first_n":
                # Order by question sequence in section
                section_q_ids = [str(q.get("id")) for q in section.get("questions", [])]
                sq_in_section.sort(key=lambda x: section_q_ids.index(str(x.get("question_id"))) if str(x.get("question_id")) in section_q_ids else 9999)
                filtered_scored_questions.extend(sq_in_section[:max_attempts])
            elif soft_type == "best_n":
                # Order by score descending
                sq_in_section.sort(key=lambda x: x.get("score", 0), reverse=True)
                filtered_scored_questions.extend(sq_in_section[:max_attempts])
                
    return filtered_scored_questions


def calculate_test_max_marks(test: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates the total maximum marks for a test and per section,
    taking into account attempt_control limits.
    """
    total_max_marks = 0
    section_max_marks = {}
    
    if test.get("enable_section_mode") and test.get("sections"):
        for sec in test.get("sections"):
            sec_id = sec.get("id")
            q_marks = []
            default_marks = float(sec.get("marks_per_question") or 4)
            for q in sec.get("questions", []):
                m = q.get("marks")
                if m is not None:
                    try:
                        m_val = float(m)
                    except ValueError:
                        m_val = default_marks
                else:
                    m_val = default_marks
                q_marks.append(m_val)
                
            attempt_control = sec.get("attempt_control", {})
            if attempt_control and attempt_control.get("enabled"):
                max_attempts = attempt_control.get("max_attempts", 0)
                if max_attempts > 0 and len(q_marks) > max_attempts:
                    # Sort descending and take top max_attempts
                    q_marks.sort(reverse=True)
                    q_marks = q_marks[:max_attempts]
            
            sec_max = sum(q_marks)
            section_max_marks[sec_id] = sec_max
            total_max_marks += sec_max
    else:
        # Flat mode
        default_marks = float(test.get("marks_per_question") or 4)
        for q in test.get("questions", []):
            m = q.get("marks")
            if m is not None:
                try:
                    m_val = float(m)
                except ValueError:
                    m_val = default_marks
            else:
                m_val = default_marks
            total_max_marks += m_val
            
    return {
        "total_max_marks": total_max_marks,
        "section_max_marks": section_max_marks
    }
