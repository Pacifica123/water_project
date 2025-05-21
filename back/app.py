from flask import Flask,  Blueprint, request, jsonify, g, redirect, url_for, session
# from flask_sqlalchemy import SQLAlchemy
import os
import json
from flask_cors import CORS
from db.config import LONG_KEY
from db.setup import setup_database, get_session
from routes import register_routes
from routes.socket_handlers import register_socket_handlers
from flask_socketio import SocketIO
<<<<<<< HEAD
from flask_mail import Mail

mail = Mail()
YANDEX_EMAIL = "asasassasasasas12@yandex.ru"
YANDEX_PASSWORD = "sukfnyvhqrijchbt"
=======
>>>>>>> 919b6e2b6c11a22f78c95fcc9c9fc5a4e24227a2


def save_to_stub(data):
    with open('data_stub.json', 'w') as f:
        json.dump(data, f)


def load_from_stub():
    if os.path.exists('data_stub.json'):
        with open('data_stub.json', 'r') as f:
            return json.load(f)


def create_app(delete_db=False):
    app = Flask(__name__)
    app.secret_key = LONG_KEY
    CORS(app, supports_credentials=True)
    app.config['SESSION_TYPE'] = 'filesystem'
<<<<<<< HEAD
    # ─── Конфиг Flask-Mail ─────────────────────────────────────────────
    app.config['MAIL_SERVER'] = "smtp.yandex.ru"
    app.config['MAIL_PORT'] = 465
    app.config['MAIL_USE_SSL'] = True
    app.config['MAIL_USERNAME'] = YANDEX_EMAIL
    app.config['MAIL_PASSWORD'] = YANDEX_PASSWORD
    app.config['MAIL_DEFAULT_SENDER'] = ("Служба поддержки", YANDEX_EMAIL)
    mail.init_app(app)
    # ─────────────────────────────────────────────────────────────────
=======
    # Session(app)
    # app.config["SECRET_KEY"] = LONG_KEY
>>>>>>> 919b6e2b6c11a22f78c95fcc9c9fc5a4e24227a2
    engine = setup_database(delete_db=delete_db)
    socketio = SocketIO(app, cors_allowed_origins="*")

    @app.before_request
    def before_request():
        g.session = get_session(engine)

    @app.teardown_request
    def teardown_request(exception=None):
        session = g.pop('session', None)
        if session is not None:
            session.close()

    register_routes(app, socketio)
    register_socket_handlers(socketio)

    return app, socketio


if __name__ == '__main__':
    delete_db_flag = os.getenv('DELETE_DB', 'False') == 'True'
    app, socketio = create_app(delete_db_flag)
    # app.run(debug=True)
<<<<<<< HEAD
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
=======
    socketio.run(app, debug=True)
>>>>>>> 919b6e2b6c11a22f78c95fcc9c9fc5a4e24227a2
