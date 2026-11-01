"""
Pictures pasted into a test are saved to Storage, and the test keeps only their URLs
(app/services/question_images.py). Run from backend/:
python -m pytest tests/test_question_images.py -q
"""

import base64
import hashlib
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.routers.tests import write as write_router
from app.services import question_images as qi
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + bytes(range(40))
JPEG = b"\xff\xd8\xff\xe0" + b"\x10JFIF" + bytes(range(60))
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


def data_url(raw: bytes, mime: str = "image/png") -> str:
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


def url_for(raw: bytes, ext: str) -> str:
    return qi.public_url(f"q/{hashlib.sha256(raw).hexdigest()}.{ext}")


class FakeBucket:
    def __init__(self, store, fail=False):
        self.store, self.fail = store, fail

    def upload(self, path, file, file_options=None):
        if self.fail:
            raise RuntimeError("storage is down")
        self.store[path] = {"bytes": file, "options": file_options}


def storage(uploads, fail=False):
    return SimpleNamespace(storage=SimpleNamespace(from_=lambda _bucket: FakeBucket(uploads, fail)))


@pytest.fixture(autouse=True)
def fresh_cache():
    qi._stored.clear()
    yield
    qi._stored.clear()


def test_each_picture_is_stored_once_and_every_copy_points_at_it():
    question = {
        "id": "1",
        "question": "Which graph?",
        "image": data_url(PNG),
        "optionImages": {"A": data_url(JPEG, "image/jpeg"), "B": ""},
        "options": {"C": f"See ![fig]({data_url(PNG)}) here"},
    }
    values = {
        "questions": [question],
        "sections": [{"id": "s1", "name": "Physics", "questions": [dict(question)]}],
        "institution_logo": data_url(PNG),
        "title": "Unit test 3",
    }
    uploads = {}
    moved = qi.externalize_images(storage(uploads), values)

    png_url, jpg_url = url_for(PNG, "png"), url_for(JPEG, "jpg")
    q, sq = values["questions"][0], values["sections"][0]["questions"][0]
    assert q["image"] == png_url and sq["image"] == png_url
    assert q["optionImages"] == {"A": jpg_url, "B": ""}
    assert q["options"]["C"] == f"See ![fig]({png_url}) here"
    assert values["institution_logo"] == png_url
    assert values["title"] == "Unit test 3"

    # Two different pictures, so two files, whatever the number of copies.
    assert sorted(uploads) == sorted(f"q/{hashlib.sha256(r).hexdigest()}.{e}" for r, e in [(PNG, "png"), (JPEG, "jpg")])
    png_file = uploads[f"q/{hashlib.sha256(PNG).hexdigest()}.png"]
    assert png_file["bytes"] == PNG
    assert png_file["options"]["content-type"] == "image/png"
    assert png_file["options"]["cache-control"] == "31536000"
    assert moved == {png_url: data_url(PNG), jpg_url: data_url(JPEG, "image/jpeg")}


def test_a_resave_does_not_upload_again():
    uploads = {}
    qi.externalize_images(storage(uploads), {"questions": [{"image": data_url(PNG)}]})
    uploads.clear()
    values = {"questions": [{"image": data_url(PNG)}]}
    qi.externalize_images(storage(uploads), values)
    assert uploads == {}
    assert values["questions"][0]["image"] == url_for(PNG, "png")


def test_svg_and_broken_base64_stay_inline():
    svg, broken = data_url(SVG, "image/svg+xml"), "data:image/png;base64,iVBORw0KGgo=="
    values = {"questions": [{"image": svg}, {"image": broken}]}
    uploads = {}
    assert qi.externalize_images(storage(uploads), values) == {}
    assert values["questions"] == [{"image": svg}, {"image": broken}]
    assert uploads == {}


def test_base64_that_runs_into_other_characters_is_not_cut_short():
    # A data URL the pattern can't read to its end is left alone, never half-replaced.
    odd = data_url(PNG) + "-_tail"
    values = {"questions": [{"image": odd}]}
    qi.externalize_images(storage({}), values)
    assert values["questions"][0]["image"] == odd


def test_a_failed_upload_keeps_the_picture_inline():
    values = {"questions": [{"image": data_url(PNG)}]}
    assert qi.externalize_images(storage({}, fail=True), values) == {}
    assert values["questions"][0]["image"] == data_url(PNG)


def test_saving_a_test_stores_urls(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user("teacher-token", email="asha@abc.in")
    db.tables["admins"] = []
    db.tables["tests"] = [{"id": "t1", "created_by": teacher, "settings": {}, "questions": [], "sections": []}]
    uploads = {}
    db.storage = storage(uploads).storage
    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(write_router, "notify_test_updated", lambda *_: None)
    auth_core._admin_cache.clear()
    app.dependency_overrides[get_db] = lambda: db
    try:
        res = TestClient(app).put(
            "/api/tests/t1",
            json={"questions": [{"id": "1", "question": "Q", "image": data_url(PNG)}]},
            headers={"Authorization": "Bearer teacher-token"},
        )
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 200, res.text
    assert db.tables["tests"][0]["questions"][0]["image"] == url_for(PNG, "png")
    assert list(uploads) == [f"q/{hashlib.sha256(PNG).hexdigest()}.png"]
