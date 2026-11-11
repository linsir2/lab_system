from flask import Blueprint, jsonify, request

from errors import ApiError
from models.borrow_record import to_naive_utc
from repositories.borrow_repository import BorrowRepository

borrow_bp = Blueprint("borrow", __name__)
repository = BorrowRepository()

ALLOWED_PATCH_FIELDS = {"status", "returnTime"}
CLOSING_STATUSES = {"RETURNED", "CANCELLED"}


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "invalid request body")
    return data


def int_field(data, name, required=True, minimum=None):
    if name not in data:
        if required:
            raise ApiError(400, f"{name} is required")
        return None
    value = data[name]
    if isinstance(value, bool) or not isinstance(value, int):
        raise ApiError(400, f"{name} must be an integer")
    if minimum is not None and value < minimum:
        raise ApiError(400, f"{name} must be >= {minimum}")
    return value


def time_field(data, name, required=True):
    if name not in data:
        if required:
            raise ApiError(400, f"{name} is required")
        return None
    try:
        return to_naive_utc(data[name])
    except ValueError:
        raise ApiError(400, f"invalid {name}")


def optional_int_arg(name):
    raw = request.args.get(name)
    if raw is None or raw == "":
        return None
    try:
        return int(raw)
    except ValueError:
        raise ApiError(400, f"invalid {name}")


def get_record_or_404(borrow_id):
    record = repository.get(borrow_id)
    if record is None:
        raise ApiError(404, "borrow not found")
    return record


@borrow_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


@borrow_bp.get("/borrows")
def list_borrows():
    records = repository.list_records(
        person_id=optional_int_arg("personId"),
        material_id=optional_int_arg("materialId"),
        status=request.args.get("status") or None,
    )
    return jsonify([record.to_dict() for record in records])


@borrow_bp.get("/borrows/<int:borrow_id>")
def get_borrow(borrow_id):
    return jsonify(get_record_or_404(borrow_id).to_dict())


@borrow_bp.post("/borrows")
def create_borrow():
    data = body()
    person_id = int_field(data, "personId")
    material_id = int_field(data, "materialId")
    quantity = int_field(data, "quantity", minimum=1)
    borrow_time = time_field(data, "borrowTime")
    due_time = time_field(data, "dueTime")
    if due_time <= borrow_time:
        raise ApiError(400, "dueTime must be after borrowTime")

    record = repository.create(
        {
            "person_id": person_id,
            "material_id": material_id,
            "quantity": quantity,
            "borrow_time": borrow_time,
            "due_time": due_time,
            "return_time": None,
            "status": "BORROWED",
        }
    )
    return jsonify(record.to_dict()), 201


@borrow_bp.put("/borrows/<int:borrow_id>")
def update_borrow(borrow_id):
    data = body()
    unsupported = set(data) - ALLOWED_PATCH_FIELDS
    if unsupported:
        raise ApiError(400, f"unsupported field: {sorted(unsupported)[0]}")

    record = get_record_or_404(borrow_id)
    updates = {}

    if "status" in data:
        status = data["status"]
        if status not in CLOSING_STATUSES or record.status != "BORROWED":
            raise ApiError(409, "invalid status transition")
        updates["status"] = status

    if "returnTime" in data:
        updates["return_time"] = time_field(data, "returnTime")

    final_status = updates.get("status", record.status)
    final_return_time = updates.get("return_time", record.return_time)
    if final_status == "RETURNED" and final_return_time is None:
        raise ApiError(400, "returnTime is required when status is RETURNED")

    return jsonify(repository.update(record, updates).to_dict())


@borrow_bp.delete("/borrows/<int:borrow_id>")
def delete_borrow(borrow_id):
    repository.delete(get_record_or_404(borrow_id))
    return "", 204
