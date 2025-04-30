from flask_socketio import join_room
from flask import request


def register_socket_handlers(socketio):
    user_sessions = {}

    @socketio.on('connect')
    def on_connect():
        username = request.args.get('username')
        if username:
            user_sessions[username] = request.sid
            join_room(username)
        print(f"{username} connected")

    @socketio.on('disconnect')
    def on_disconnect():
        sid = request.sid
        disconnected_user = None
        for user, session_id in user_sessions.items():
            if session_id == sid:
                disconnected_user = user
                break
        if disconnected_user:
            user_sessions.pop(disconnected_user)
            print(f"{disconnected_user} disconnected")
