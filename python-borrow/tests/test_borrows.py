BORROW_TIME = "2026-11-04T02:00:00Z"
DUE_TIME = "2026-11-11T02:00:00Z"


def payload(**overrides):
    body = {
        "personId": 1,
        "materialId": 1,
        "quantity": 2,
        "borrowTime": BORROW_TIME,
        "dueTime": DUE_TIME,
    }
    body.update(overrides)
    return body


def create(client, **overrides):
    return client.post("/borrows", json=payload(**overrides))


def test_create_borrow(client):
    resp = create(client)

    assert resp.status_code == 201
    data = resp.get_json()
    assert data["id"] > 0
    assert data["personId"] == 1
    assert data["materialId"] == 1
    assert data["quantity"] == 2
    assert data["borrowTime"] == BORROW_TIME
    assert data["dueTime"] == DUE_TIME
    assert data["returnTime"] is None
    assert data["status"] == "BORROWED"


def test_create_requires_fields_and_positive_quantity(client):
    for body in (
        {"materialId": 1, "quantity": 2, "borrowTime": BORROW_TIME, "dueTime": DUE_TIME},
        {"personId": 1, "quantity": 2, "borrowTime": BORROW_TIME, "dueTime": DUE_TIME},
        {"personId": 1, "materialId": 1, "borrowTime": BORROW_TIME, "dueTime": DUE_TIME},
        {"personId": 1, "materialId": 1, "quantity": 0, "borrowTime": BORROW_TIME, "dueTime": DUE_TIME},
        {"personId": 1, "materialId": 1, "quantity": -1, "borrowTime": BORROW_TIME, "dueTime": DUE_TIME},
    ):
        resp = client.post("/borrows", json=body)
        assert resp.status_code == 400, body
        assert resp.get_json()["code"] == 400


def test_create_rejects_due_time_not_after_borrow_time(client):
    from datetime import datetime, timedelta, timezone

    borrow = datetime(2026, 11, 4, 2, 0, tzinfo=timezone.utc)
    due = borrow - timedelta(seconds=1)

    resp = create(client, borrowTime=borrow.isoformat().replace("+00:00", "Z"), dueTime=due.isoformat().replace("+00:00", "Z"))

    assert resp.status_code == 400


def test_list_filters(client):
    create(client, personId=1, materialId=1)
    create(client, personId=2, materialId=2)

    by_person = client.get("/borrows?personId=1")
    assert by_person.status_code == 200
    assert [b["personId"] for b in by_person.get_json()] == [1]

    by_material = client.get("/borrows?materialId=2")
    assert [b["materialId"] for b in by_material.get_json()] == [2]

    by_status = client.get("/borrows?status=BORROWED")
    assert len(by_status.get_json()) == 2

    empty = client.get("/borrows?status=RETURNED")
    assert empty.get_json() == []


def test_get_missing_returns_404(client):
    resp = client.get("/borrows/999")

    assert resp.status_code == 404
    assert resp.get_json()["code"] == 404


def test_return_transition(client):
    created = create(client).get_json()

    resp = client.put(f"/borrows/{created['id']}", json={"status": "RETURNED", "returnTime": "2026-11-05T00:00:00Z"})

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "RETURNED"
    assert data["returnTime"] == "2026-11-05T00:00:00Z"


def test_returned_cannot_transition_back(client):
    created = create(client).get_json()
    client.put(f"/borrows/{created['id']}", json={"status": "RETURNED", "returnTime": "2026-11-05T00:00:00Z"})

    resp = client.put(f"/borrows/{created['id']}", json={"status": "BORROWED"})

    assert resp.status_code == 409


def test_put_rejects_quantity(client):
    created = create(client).get_json()

    resp = client.put(f"/borrows/{created['id']}", json={"quantity": 5})

    assert resp.status_code == 400


def test_put_rejects_due_time(client):
    created = create(client).get_json()

    resp = client.put(f"/borrows/{created['id']}", json={"dueTime": DUE_TIME})

    assert resp.status_code == 400


def test_delete(client):
    created = create(client).get_json()

    resp = client.delete(f"/borrows/{created['id']}")
    assert resp.status_code == 204

    assert client.get(f"/borrows/{created['id']}").status_code == 404


def test_health(client):
    resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}
