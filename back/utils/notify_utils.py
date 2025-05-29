from db.models import Notification
from db.crudcore import create_record_entity
from utils.backend_utils import OperationResult, OperationStatus


def create_and_send_notification(username: str, message: str) -> OperationResult:
    notif = {
        'username': username,
        'message': message,
        'delivered': False
    }
    if not create_record_entity(Notification, notif):
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Не удалось сохранить уведомление в БД"
        )

    from routes.socket_handlers import send_notification
    res = send_notification(username, message)
    return res
