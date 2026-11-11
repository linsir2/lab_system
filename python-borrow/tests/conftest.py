import pytest

from app import create_app
from extensions import db

TEST_DATABASE_URL = "mysql+pymysql://lab:labpass@127.0.0.1:3307/lab_borrow_test"


@pytest.fixture
def app():
    app = create_app(
        {
            "SQLALCHEMY_DATABASE_URI": TEST_DATABASE_URL,
            "TESTING": True,
        }
    )
    with app.app_context():
        db.drop_all()
        db.create_all()
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
