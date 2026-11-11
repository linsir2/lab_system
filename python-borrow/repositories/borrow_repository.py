from extensions import db
from models.borrow_record import BorrowRecord


class BorrowRepository:
    def list_records(self, person_id=None, material_id=None, status=None):
        query = BorrowRecord.query
        if person_id is not None:
            query = query.filter(BorrowRecord.person_id == person_id)
        if material_id is not None:
            query = query.filter(BorrowRecord.material_id == material_id)
        if status is not None:
            query = query.filter(BorrowRecord.status == status)
        return query.order_by(BorrowRecord.id.desc()).all()

    def get(self, borrow_id):
        return db.session.get(BorrowRecord, borrow_id)

    def create(self, data):
        record = BorrowRecord(**data)
        db.session.add(record)
        db.session.commit()
        db.session.refresh(record)
        return record

    def update(self, record, data):
        for key, value in data.items():
            setattr(record, key, value)
        db.session.commit()
        db.session.refresh(record)
        return record

    def delete(self, record):
        db.session.delete(record)
        db.session.commit()
