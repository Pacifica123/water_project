from utils.backend_utils import *
from utils.db_utils import *
from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
import sys
from typing import Any, List, Optional, Dict, Tuple
import json


def handle_notification_reaction(notification: dict) -> OperationResult:
    """
    Dispatcher for notification reactions.
    """
    # Determine notification type
    payload_type = notification.get('type') or notification.get('type\_display') or 'general'
    print(f" === In handle_notification_reaction: type = {payload_type} ===")
    pprint.pprint(notification)

    match payload_type:
        case 'waterreportform':
            return _handle_water_report_form_reaction(notification)
        # TODO: add other cases for 'registration', 'report', 'registry', etc.
        case _:
            print(f"No reaction handler for type: {payload_type}")
            return OperationResult(status=OperationStatus.VALIDATION_ERROR,
                                   msg=f"Unsupported notification type: {payload_type}")


def _handle_water_report_form_reaction(notification: dict) -> OperationResult:
    """
    Handle actions for waterreportform notifications.
    Expected fields: reaction ('approve' or 'revise').
    """
    reaction = notification.get('reaction')
    print(f" ---> _handle_water_report_form_reaction, reaction = {reaction}")
    # Placeholder logic
    if reaction == 'revise':
        print(" >> Action: mark water report for revision")
        # TODO: implement actual revision workflow
    elif reaction == 'approve':
        print(" >> Action: approve water report")
        # TODO: implement approval workflow
    else:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR,
                               msg=f"Unknown reaction for waterreportform: {reaction}")

    nid = int(notification.get('id'))
    # Попытка распарсить message из notification, если оно там есть
    message_str = notification.get('text', '{}')
    try:
        message_data = json.loads(message_str)
    except (json.JSONDecodeError, TypeError):
        message_data = {}

    # Отмечаем как прочитанное (можно добавить поле 'read' или 'delivered' в JSON)
    message_data['delivered'] = True
    message_data['delivered_at'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Формируем новые данные для обновления записи
    newdata = {
        'delivered': True,
        'delivered_at': datetime.datetime.now(),
        'message': json.dumps(message_data, ensure_ascii=False)
    }

    ures = update_record(Notification, nid, newdata)
    if ures.status != OperationStatus.SUCCESS:
        print("обновить прочтение уведы не удалось :(")
    else:
        print("уведа прочтена")
    return OperationResult(status=OperationStatus.SUCCESS,
                           msg=f"Water report {reaction} handled successfully")
