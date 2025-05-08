from flask_socketio import join_room
from flask import request
from db.models import Notification
from sqlalchemy.orm import Session
from datetime import datetime
from utils.backend_utils import OperationResult, OperationStatus

socketio = None
user_sessions = {}


def send_notification(username: str, message: str) -> OperationResult:
    if socketio:
        if user_sessions[username] is None:
            return OperationResult(
                OperationStatus.SUCCESS,
                msg=f"Пользователь {username} не подключён, уведомление остается непрочитанным"
            )
        socketio.emit('notification', message, room=username)
        # Обновляем статус уведомления в базе
        from db.crudcore import get_all_by_conditions
        notif_res = get_all_by_conditions(
            Notification,
            [
                {'username': username},
                {'message': message},
                {'delivered': False}
            ]
        )
        if notif_res.status == OperationStatus.SUCCESS:
            notif_list = notif_res.data
            first_notif = next(iter(sorted(notif_list, key=lambda n: n.created_at)), None)

            if first_notif:
                first_notif.delivered = True
                first_notif.delivered_at = datetime.utcnow()
                from db.crudcore import update_record
                return update_record(
                    entity_class=Notification,
                    record_id=first_notif.id,
                    data={
                        'username': first_notif.username,
                        'message': first_notif.message,
                        'delivered': first_notif.delivered,
                        'delivered_at': first_notif.delivered_at
                    }
                )
        else:
            return notif_res
    else:
        return OperationResult(
            OperationStatus.CONNECTION_ERROR,
            msg="Проблема с socketio"
        )


def send_pending_notifications(username) -> OperationResult:
    print(f"send_pending_notifications : username={username}")
    from db.crudcore import get_all_by_conditions
    notif_res = get_all_by_conditions(
        Notification,
        [
            {'username': username},
            {'delivered': False}
        ]
    )
    if notif_res.status != OperationStatus.SUCCESS:
        if notif_res.message and "Не найдено" in notif_res.message:
            print(f"Уведомлений для {username} нет")
            return OperationResult(
                OperationStatus.SUCCESS,
                msg=f"Уведомлений для {username} нет"
            )
        return notif_res

    from db.crudcore import bulk_update_records
    notif_reads = []
    for notif in notif_res.data:
        socketio.emit('notification', notif.message, room=username)
        notif.delivered = True
        notif.delivered_at = datetime.utcnow()
        notif_reads.append(notif)
    upres = bulk_update_records(Notification, notif_reads)
    return upres


def register_socket_handlers(sio):

    global socketio
    socketio = sio

    @socketio.on('connect')
    def on_connect():
        username = request.args.get('username')
        if username:
            user_sessions[username] = request.sid
            join_room(username)
            # накопившиеся уведомления:
            send_pending_notifications(username)
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

