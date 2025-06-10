from db.models import Notification
from db.crudcore import create_record_entity
from utils.backend_utils import OperationResult, OperationStatus
from datetime import datetime

import json


def create_and_send_notification(username: str, message: str) -> OperationResult:
    notif_type = "Общее"
    print(message)
    try:
        data = json.loads(str(message).replace("'", '"'))
        if isinstance(data, dict) and 'type' in data:
            notif_type = data['type']
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Ошибка JSONDecode или TypeError - {e}")
        pass

    notif = {
        'username': username,
        'message': str(message),
        'delivered': False,
        'delivered_at': datetime.utcnow()
    }

    if not create_record_entity(Notification, notif):
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Не удалось сохранить уведомление в БД"
        )

    from routes.socket_handlers import send_notification
    res = send_notification(username, message)
    return res
