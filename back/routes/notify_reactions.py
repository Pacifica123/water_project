from utils.backend_utils import *
from utils.db_utils import *
from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
import sys
from typing import Any, List, Optional, Dict, Tuple
import json
from utils.notify_utils import create_and_send_notification


def handle_notification_reaction(notification: dict) -> OperationResult:
    """
    Dispatcher for notification reactions.
    """
    # Determine notification type
    raw = notification.get('raw')

    payload_type = raw.get('type') or 'general'
    if payload_type == 'Общее':
        payload_type = raw.get("parsed").get("type")
    print(f" === In handle_notification_reaction: type = {payload_type} ===")
    pprint.pprint(raw)

    match payload_type:
        case 'paymentform':
            return _handle_payment_form_reaction(notification)
        case 'waterreportform':
            return _handle_water_report_form_reaction(notification)
        case 'waterlog_complete':
            return _handle_waterlog_reaction(raw)
        case _:
            print(f"No reaction handler for type: {payload_type}")
            return OperationResult(
                status=OperationStatus.VALIDATION_ERROR,
                msg=f"Unsupported notification type: {payload_type}")


def _handle_waterlog_reaction(notification: dict) -> OperationResult:
    # 1. records -> любое из взять id и по записи найти RecordWCL и через log_id выйти на WaterConsumptionLog
    # 2. изменить статус: approve -> log_status.CLOSED и revise -> log_status.UNDER_CORRECTION
    # 3. достать org_id и послать ему уведомление о том что произошло
    print(notification)
    return OperationResult(status=OperationStatus.NOT_REALIZED,
                               msg=f"Пока не реализовано")


def _handle_payment_form_reaction(notification: dict) -> OperationResult:
    reaction = notification.get('reaction')
    msg = ""

    permission_number = notification.get('raw').get("parsed").get("permission_number")
    p_res = get_all_by_conditions(Permissions, [{"permission_number": permission_number}])
    print_operation_result(p_res)
    p = p_res.data[0]
    pprint.pprint(p)
    if not int(p.organisation_id):
        pprint.pprint(p)
    org = get_record_by_id(Organisations, int(p.organisation_id)).data
    username = get_all_by_conditions(User, [{"organisation_id": org.id}]).data[0].username
    print(f"[username]: {username}")
    if reaction == 'revise':
        print(" >> Action: mark water report for revision")
        msg = {
            "header": "Форма оплаты от такого-то числа была отклонена"
            }
        # return OperationResult(status=OperationStatus.NOT_REALIZED,
        #                 msg=f"Пока не реализовано")
    elif reaction == 'approve':
        print(" >> Action: approve water report")
        msg = {
            "header": "Форма оплаты была успешно принята"
            }
        #
        # return OperationResult(status=OperationStatus.NOT_REALIZED,
        #                        msg=f"Пока не реализовано")
    # отправить msg на организацию
    else:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR,
                               msg=f"Unknown reaction for waterreportform: {reaction}")
    try:
        print("[debug] зашло в try")
        return create_and_send_notification(username, msg)
    except Exception as e:
        print(e)
        return OperationResult(
            OperationStatus.UNDEFINE_ERROR
            )


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
