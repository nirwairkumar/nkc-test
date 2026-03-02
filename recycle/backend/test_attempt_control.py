import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.utils.attempt_control import apply_section_attempt_control

def test_hard_mode():
    sections = [
        {
            "id": "s1",
            "name": "Math",
            "attempt_control": {"enabled": True, "mode": "hard", "max_attempts": 2},
            "questions": [{"id": 1}, {"id": 2}, {"id": 3}]
        }
    ]
    
    # Within limit
    user_answers = {"1": "A", "2": "B"}
    filtered = apply_section_attempt_control(sections, user_answers)
    assert len(filtered) == 2
    print("Hard mode (within limit) passed")
    
    # Over limit
    user_answers = {"1": "A", "2": "B", "3": "C"}
    try:
        apply_section_attempt_control(sections, user_answers)
        assert False, "Should have raised ValueError"
    except ValueError:
        print("Hard mode (over limit) validation passed")

def test_soft_mode_first_n():
    sections = [
        {
            "id": "s1",
            "name": "Math",
            "attempt_control": {"enabled": True, "mode": "soft", "soft_type": "first_n", "max_attempts": 2},
            "questions": [{"id": 1}, {"id": 2}, {"id": 3}]
        }
    ]
    
    user_answers = {"1": "A", "2": "B", "3": "C"}
    filtered = apply_section_attempt_control(sections, user_answers)
    assert len(filtered) == 2
    assert "1" in filtered and "2" in filtered
    assert "3" not in filtered
    print("Soft mode (first_n) passed")

if __name__ == "__main__":
    test_hard_mode()
    test_soft_mode_first_n()
    print("All backend tests passed!")
