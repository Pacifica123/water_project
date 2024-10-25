from flask import Flask,  Blueprint, request, jsonify, g, redirect, url_for, session
# from flask_sqlalchemy import SQLAlchemy
import os
import json

from db.config import LONG_KEY
from db.setup import setup_database, get_session
from routes import register_routes


def save_to_stub(data):
    with open('data_stub.json', 'w') as f:
        json.dump(data, f)


def load_from_stub():
    if os.path.exists('data_stub.json'):
        with open('data_stub.json', 'r') as f:
            return json.load(f)


def create_app():
    app = Flask(__name__)
    app.secret_key = LONG_KEY
    engine = setup_database()

    @app.before_request
    def before_request():
        g.session = get_session(engine)

    @app.teardown_request
    def teardown_request(exception=None):
        session = g.pop('session', None)
        if session is not None:
            session.close()

    register_routes(app)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
