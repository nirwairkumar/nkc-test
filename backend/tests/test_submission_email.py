"""The "your candidates are submitting" email: when it fires and what it says."""
from app.services import submission_email as se


def test_milestones_are_sparse():
    hits = [n for n in range(1, 301) if se.is_milestone(n)]
    assert hits == [1, 5, 10, 25, 50, 100, 200, 300]


def test_first_submission_wording_and_link():
    mail = se.build_email("Solid State", "abc-123", 1, "Sumit Patil")
    assert mail["subject"] == 'Your first candidate just submitted "Solid State"'
    assert "Hi Sumit," in mail["html"]
    assert "https://app.testoza.com/test-analysis/abc-123" in mail["html"]


def test_title_is_escaped():
    mail = se.build_email("<script>x</script>", "t1", 5, None)
    assert "<script>x" not in mail["html"]
    assert "5 candidates" in mail["subject"]


def test_does_nothing_without_smtp(monkeypatch):
    called = []

    class Boom:
        def table(self, *_):
            called.append(True)
            raise AssertionError("must not touch the database without SMTP")

    monkeypatch.setattr(se, "_smtp_ready", lambda: None)
    se._notify(Boom(), "creator", "test", "Title")
    assert called == []
