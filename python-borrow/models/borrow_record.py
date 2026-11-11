from datetime import datetime, timezone

from extensions import db


def to_naive_utc(value):
    if not isinstance(value, str):
        raise ValueError("time must be a string")
    text = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("invalid time") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def format_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class BorrowRecord(db.Model):
    __tablename__ = "borrow_record"
    __table_args__ = (
        db.Index("idx_borrow_person", "person_id"),
        db.Index("idx_borrow_material", "material_id"),
        db.Index("idx_borrow_status", "status"),
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    person_id = db.Column(db.BigInteger, nullable=False)
    material_id = db.Column(db.BigInteger, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    borrow_time = db.Column(db.DateTime, nullable=False)
    due_time = db.Column(db.DateTime, nullable=False)
    return_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(
        db.String(20),
        nullable=False,
        default="BORROWED",
        server_default="BORROWED",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "personId": self.person_id,
            "materialId": self.material_id,
            "quantity": self.quantity,
            "borrowTime": format_utc(self.borrow_time),
            "dueTime": format_utc(self.due_time),
            "returnTime": format_utc(self.return_time),
            "status": self.status,
        }
