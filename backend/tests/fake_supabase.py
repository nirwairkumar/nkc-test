"""
A small in-memory stand-in for the supabase-py client, enough for the exam-session
routes: table().select/insert/update/delete with eq/neq/in_/is_/lt/gt/gte/lte, order,
limit, plus auth.get_claims and auth.admin.{get_user_by_id, create_user}.

Unique constraints mirror supabase/migrations/20261002120000_exam_sessions.sql, so the
code paths that rely on a 23505 (duplicate key) error are exercised for real.
"""

import copy
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, Callable, Dict, List, Optional


class DuplicateKey(Exception):
    def __init__(self, constraint: str):
        super().__init__(f'duplicate key value violates unique constraint "{constraint}"')
        self.code = "23505"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULTS: Dict[str, Callable[[], Dict[str, Any]]] = {
    "exam_sessions": lambda: {
        "created_at": _now(), "updated_at": _now(), "late_entry_minutes": 15, "start_mode": "auto",
        "started_at": None, "identity_mode": "name", "allow_walk_in": True, "results_release": "on_end",
        "results_released_at": None, "ended_at": None, "class_id": None, "retest_of": None,
    },
    "session_participants": lambda: {
        "status": "joined", "device_changes": 0, "joined_at": _now(), "started_at": None, "last_seen_at": None,
        "answered": 0, "progress": 0, "violations": 0, "extra_minutes": 0, "force_submit_at": None,
        "answers_draft": None, "submitted_at": None, "attempt_id": None, "roster_student_id": None, "roll_no": None,
    },
    "roster_students": lambda: {"created_at": _now(), "updated_at": _now(), "pin_hash": None, "pin_set_at": None, "parent_phone": None},
    "user_tests": lambda: {"created_at": _now(), "session_id": None, "participant_id": None, "violation_count": 0},
    "test_registrations": lambda: {"started_at": _now(), "last_active_at": None, "metadata": None},
    "classes": lambda: {"created_at": _now()},
}

# (table, constraint name, columns, condition on the row)
UNIQUES = [
    ("exam_sessions", "exam_sessions_open_code_uidx", ("join_code",), lambda r: r.get("ended_at") is None),
    ("session_participants", "session_participants_identity_unique", ("session_id", "identity_key"), lambda r: True),
    ("session_participants", "session_participants_token_uidx", ("device_token_hash",), lambda r: r.get("device_token_hash") is not None),
    ("user_tests", "user_tests_one_per_participant", ("participant_id",), lambda r: r.get("participant_id") is not None),
    ("roster_students", "roster_students_roll_unique", ("class_id", "roll_key"), lambda r: True),
]


def _cmp_value(v: Any) -> Any:
    return "" if v is None else v


def _get(row: Dict[str, Any], col: str) -> Any:
    """Column value, including PostgREST JSON paths like settings->conduct_exam->>join_code."""
    if "->" not in col:
        return row.get(col)
    parts = col.split("->")
    as_text = parts[-1].startswith(">")
    value: Any = row.get(parts[0])
    for part in parts[1:]:
        key = part.lstrip(">")
        value = value.get(key) if isinstance(value, dict) else None
    if as_text and value is not None and not isinstance(value, str):
        value = str(value).lower() if isinstance(value, bool) else str(value)
    return value


class Query:
    def __init__(self, db: "FakeSupabase", table: str):
        self.db = db
        self.table = table
        self.filters: List[Callable[[Dict[str, Any]], bool]] = []
        self.op = "select"
        self.payload: Any = None
        self._order: List[tuple] = []
        self._limit: Optional[int] = None
        self._count = False

    # builders
    def select(self, _cols: str = "*", count: Optional[str] = None):
        self.op = "select"
        self._count = bool(count)
        return self

    def insert(self, payload: Any):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload: Dict[str, Any]):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: _get(r, col) == val)
        return self

    def neq(self, col, val):
        self.filters.append(lambda r: r.get(col) != val)
        return self

    def in_(self, col, vals):
        vals = list(vals)
        self.filters.append(lambda r: r.get(col) in vals)
        return self

    def is_(self, col, val):
        assert val == "null"
        self.filters.append(lambda r: r.get(col) is None)
        return self

    def lt(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) < val)
        return self

    def gt(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) > val)
        return self

    def gte(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) >= val)
        return self

    def lte(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) <= val)
        return self

    def order(self, col, desc: bool = False, **_):
        self._order.append((col, desc))
        return self

    def limit(self, n):
        self._limit = n
        return self

    # run
    def _matches(self) -> List[Dict[str, Any]]:
        rows = self.db.tables.setdefault(self.table, [])
        return [r for r in rows if all(f(r) for f in self.filters)]

    def execute(self):
        rows = self.db.tables.setdefault(self.table, [])
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            created = []
            for item in items:
                row = {"id": str(uuid.uuid4()), **(DEFAULTS.get(self.table, dict)()), **copy.deepcopy(item)}
                self.db._check_unique(self.table, row)
                rows.append(row)
                created.append(row)
            return SimpleNamespace(data=copy.deepcopy(created), count=None)
        if self.op == "update":
            out = []
            for row in self._matches():
                candidate = {**row, **copy.deepcopy(self.payload)}
                self.db._check_unique(self.table, candidate, ignore=row)
                row.update(copy.deepcopy(self.payload))
                out.append(copy.deepcopy(row))
            return SimpleNamespace(data=out, count=None)
        if self.op == "delete":
            gone = self._matches()
            self.db.tables[self.table] = [r for r in rows if r not in gone]
            self.db._cascade(self.table, gone)
            return SimpleNamespace(data=copy.deepcopy(gone), count=None)
        found = self._matches()
        for col, desc in reversed(self._order):
            found.sort(key=lambda r: _cmp_value(r.get(col)), reverse=desc)
        if self._limit is not None:
            found = found[: self._limit]
        return SimpleNamespace(data=copy.deepcopy(found), count=len(found) if self._count else None)


class FakeAuthAdmin:
    def __init__(self, db: "FakeSupabase"):
        self.db = db

    def get_user_by_id(self, user_id: str):
        user = self.db.auth_users.get(user_id)
        return SimpleNamespace(user=SimpleNamespace(id=user_id, user_metadata=user.get("user_metadata", {})) if user else None)

    def create_user(self, attrs: Dict[str, Any]):
        self.db.auth_users[attrs["id"]] = attrs
        return SimpleNamespace(user=SimpleNamespace(id=attrs["id"]))


class FakeAuth:
    def __init__(self, db: "FakeSupabase"):
        self.db = db
        self.admin = FakeAuthAdmin(db)

    def get_claims(self, token: str):
        uid = self.db.tokens.get(token)
        if not uid:
            raise Exception("invalid token")
        return {"claims": {"sub": uid}}

    def get_user(self, token: str):
        uid = self.db.tokens.get(token)
        if not uid:
            raise Exception("invalid token")
        return SimpleNamespace(user=SimpleNamespace(id=uid))


class FakeSupabase:
    def __init__(self):
        self.tables: Dict[str, List[Dict[str, Any]]] = {}
        self.tokens: Dict[str, str] = {}
        self.auth_users: Dict[str, Dict[str, Any]] = {}
        self.auth = FakeAuth(self)

    def table(self, name: str) -> Query:
        return Query(self, name)

    def add_user(self, token: str, user_id: Optional[str] = None, email: Optional[str] = None) -> str:
        user_id = user_id or str(uuid.uuid4())
        self.tokens[token] = user_id
        self.auth_users[user_id] = {"id": user_id}
        self.tables.setdefault("profiles", []).append({"id": user_id, "email": email or f"{user_id[:6]}@example.com"})
        return user_id

    def _check_unique(self, table: str, row: Dict[str, Any], ignore: Optional[Dict[str, Any]] = None):
        for t, name, cols, cond in UNIQUES:
            if t != table or not cond(row):
                continue
            for other in self.tables.get(table, []):
                if other is ignore or other.get("id") == row.get("id"):
                    continue
                if cond(other) and all(other.get(c) == row.get(c) for c in cols):
                    raise DuplicateKey(name)

    def _cascade(self, table: str, gone: List[Dict[str, Any]]):
        ids = {r["id"] for r in gone}
        if table == "exam_sessions":
            self.tables["session_participants"] = [p for p in self.tables.get("session_participants", []) if p["session_id"] not in ids]
            for a in self.tables.get("user_tests", []):
                if a.get("session_id") in ids:
                    a["session_id"] = None
                    a["participant_id"] = None
