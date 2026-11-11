import os

from flask import Flask, jsonify

from config import Config
from errors import ApiError
from extensions import db


def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)
    app.json.ensure_ascii = False

    db.init_app(app)

    from routes.borrow_routes import borrow_bp

    app.register_blueprint(borrow_bp)

    @app.errorhandler(ApiError)
    def handle_api_error(error):
        return jsonify({"code": error.status, "message": error.message}), error.status

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    create_app().run(port=int(os.getenv("PORT", "8081")))
