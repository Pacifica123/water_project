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
            return _handle_waterlog_reaction(raw, str(notification.get('reaction')))
        case _:
            print(f"No reaction handler for type: {payload_type}")
            return OperationResult(
                status=OperationStatus.VALIDATION_ERROR,
                msg=f"Unsupported notification type: {payload_type}")


def _handle_waterlog_reaction(notification: dict, reaction: str) -> OperationResult:
    import re
    import ast
    print("--------------------------------------------------------------")
    text_str = notification.get('text')
    print(f"type of text: {type(text_str)}")
    print(text_str)

    # Предобработка строки
    text_str = re.sub(r"datetime\.datetime\(\s*(\d+),\s*(\d+),\s*(\d+),.*?\)", r"'\1-\2-\3'", text_str)
    text_str = re.sub(r"Decimal\('([\d\.]+)'\)", r"\1", text_str)

    try:
        text_dict = ast.literal_eval(text_str)
    except Exception as e:
        print(f"Ошибка при разборе строки: {e}")
        text_dict = {}

    records = text_dict.get('records')
    print(records)
    print(reaction)

    if not records or not isinstance(records, list):
        return OperationResult(status=OperationStatus.VALIDATION_ERROR,
                               msg="В уведомлении отсутствуют записи для обработки")

    first_record_id = records[0].get('id')
    if not first_record_id:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR,
                               msg="В первой записи отсутствует поле 'id'")




    # Получаем запись RecordWCL по id
    res_record = get_record_by_id(RecordWCL, first_record_id)
    if res_record.status != OperationStatus.SUCCESS:
        return OperationResult(status=res_record.status,
                               msg=f"Не удалось получить RecordWCL с id={first_record_id}: {res_record.message}")

    record_wcl = res_record.data
    if not record_wcl:
        return OperationResult(status=OperationStatus.NOT_REALIZED,
                               msg="RecordWCL не найден")

    # Получаем связанный WaterConsumptionLog по log_id из RecordWCL
    log_id = record_wcl.log_id
    res_log = get_record_by_id(WaterConsumptionLog, log_id)
    if res_log.status != OperationStatus.SUCCESS:
        return OperationResult(status=res_log.status,
                               msg=f"Не удалось получить WaterConsumptionLog с id={log_id}: {res_log.message}")

    water_log = res_log.data
    if not water_log:
        return OperationResult(status=OperationStatus.NOT_REALIZED,
                               msg="WaterConsumptionLog не найден")

    status_map = {
        'approve': log_status.CLOSED,
        'revise': log_status.UNDER_CORRECTION
    }
    new_status = status_map.get(reaction)
    if not new_status:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR,
                               msg="В уведомлении отсутствует корректный статус ('approve' или 'revise')")

    # Обновляем статус журнала
    res_update = update_record(WaterConsumptionLog, log_id, {'log_status': new_status})
    if res_update.status != OperationStatus.SUCCESS:
        print_operation_result(res_update)
        return OperationResult(status=res_update.status,
                               msg=f"Не удалось обновить статус WaterConsumptionLog: {res_update.message}")

    # Извлекаем org_id для уведомления
    org_id = water_log.exploitation_org_id
    user = get_all_by_conditions(User, [{'organisation_id': org_id}]).data[0]

    nmsg = ""
    if new_status == log_status.CLOSED:
        nmsg = "Отправленный журнал принят и закрыт"
    else:
        nmsg = "Отправленный журнал отправлен на доработку"
    print(nmsg)
    create_and_send_notification(user.username, nmsg)

    return OperationResult(status=OperationStatus.SUCCESS,
                           msg=f"Статус журнала водопотребления (id={log_id}) обновлен на {new_status.value}, уведомление отправлено организации id={org_id}")



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
