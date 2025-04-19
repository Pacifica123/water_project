from utils.backend_utils import *
from utils.db_utils import *
from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
from db import models
from sqlalchemy import Enum
import sys
import pprint


def organisations_familiar_by_mf(filters: dict) -> OperationResult:
    """
    Функция для получения организаций, связанных с данной + все точки
    :param filters: ожидается org_id
    :return: OperationResult с отфильтрованными данными.
    """
    from utils.db_utils import replace_fks

    org_id = filters.get("org_id")
    if org_id is None:
        return OperationResult(status=OperationStatus.FAILURE, data="org_id is required")
    try:
        org_id = int(org_id)
    except ValueError:
        return OperationResult(status=OperationStatus.FAILURE, data="org_id must be an integer")
    # Получаем все точки организации
    points_res = get_all_by_foreign_key(WaterPoint, "organisation_id", org_id)
    if points_res.status != OperationStatus.SUCCESS:
        return points_res
    points_fks_res = replace_fks(points_res, WaterPoint.__tablename__)
    if points_fks_res.status != OperationStatus.SUCCESS:
        return points_fks_res
    points_data = process_enums([convert_to_dict(p) for p in points_fks_res.data], True)
    # Собираем все point_id для логов
    point_ids = [p.id for p in points_res.data]
    # Получаем все логи по всем точкам
    logs = []
    for pid in point_ids:
        log_res = get_all_by_foreign_key(WaterConsumptionLog, "point_id", pid)
        if log_res.status == OperationStatus.SUCCESS:
            logs.extend(log_res.data)
        else:
            print_operation_result(log_res)
    exploitation_org_ids = {log.exploitation_org_id for log in logs if getattr(log, "exploitation_org_id", None) is not None}
    orgs = []
    for eid in exploitation_org_ids:
        org_res = get_all_by_foreign_key(Organisations, "id", eid)
        if org_res.status == OperationStatus.SUCCESS:
            orgs.extend(org_res.data)
        else:
            print_operation_result(org_res)
    return OperationResult(
        status=OperationStatus.SUCCESS,
        data={
            "orgs": [convert_to_dict(o) for o in orgs],
            "points": points_data,
        },
    )


def log_datails_by_mf(filters: dict) -> OperationResult:
    """
    Функция для получения подробной информации о записях журнала
    :param filters: ожидается log_id.
    :return: OperationResult с отфильтрованными данными.
    """
    def check_status(result: OperationResult) -> OperationResult | None:
        if result.status != OperationStatus.SUCCESS:
            return result
        return None

    print(f"===== Зашло в функцию {sys._getframe().f_code.co_name} =====")
    log_id = filters.get("log_id")
    if not log_id:
        return OperationResult(OperationStatus.FAILURE, message="log_id не передан в фильтрах")
    # Получаем запись журнала
    headlog = get_record_by_id(WaterConsumptionLog, log_id)
    error = check_status(headlog)
    if error:
        return error
    # Получаем организацию
    org = get_record_by_id(Organisations, headlog.data.exploitation_org_id)
    error = check_status(org)
    if error:
        return error
    # Получаем записи WCL
    logres = get_all_by_foreign_key(RecordWCL, "log_id", log_id)
    if logres.status != OperationStatus.SUCCESS and "Не найдено ни одной записи" not in logres.message:
        return logres
    res_data = {
        "exploitation_org": {
            "id": org.data.id,
            "organisation_name": org.data.organisation_name,
        },
        "wcl_list": [convert_to_dict(r) for r in logres.data] if logres.data else [],
    }
    print_data_in_func(res_data, "log_details_by_mf")
    print(f"===== Вышло из функции {sys._getframe().f_code.co_name} =====")
    return OperationResult(OperationStatus.SUCCESS, data=res_data)


def waterlogs_by_mf(filters: dict) -> OperationResult:
    """
    Функция для получения журналов водопотребления по ролям.

    :param filters: ожидается role.
    :return: OperationResult с отфильтрованными данными.
    """
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")

    wpoints = get_all_from_table(WaterPoint).data
    water_object_refs = get_all_from_table(WaterObjectRef).data
    codes = get_all_from_table(Codes).data
    organisations = get_all_from_table(Organisations).data

    # Преобразуем записи WaterObjectRef, Codes и Organisations в словари
    water_object_refs_dicts = [convert_to_dict(wor) for wor in water_object_refs]
    codes_dicts = [convert_to_dict(code) for code in codes]
    organisations_dicts = [convert_to_dict(org) for org in organisations]

    from utils.db_utils import process_water_consumption_logs_fks, replace_fks
    role = filters.get('role')
    org_id = filters.get('org_id')
    if role is None:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg="Отсутствует role в фильтрах")
    if role == "UserRoles.EMPLOYEE" and org_id is None:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg="Отсутствует org_id в фильтрах для EMPLOYEE")
    logs = get_all_from_table(WaterConsumptionLog)
    result = replace_fks(logs, 'water_consumption_log')
    final_result = process_water_consumption_logs_fks(logs)

    # Объединяем данные
    for log in final_result.data:
        point_id = log.get('point_id', {}).get('id')
        if point_id:
            # Находим соответствующую запись в WaterPoint
            wpoint = next((wp for wp in wpoints if wp.id == point_id), None)
            if wpoint:
                water_body_id = wpoint.water_body_id
                organisation_id = wpoint.organisation_id

                # Находим соответствующую запись в WaterObjectRef
                water_object_ref = next((wor for wor in water_object_refs_dicts if wor['id'] == water_body_id), None)
                if water_object_ref:
                    # Добавляем информацию о water_body_id в лог
                    log['point_id']['water_body_id'] = water_object_ref

                    # Добавляем информацию о code_type_id и code_obj_id
                    code_type_id = water_object_ref.get('code_type_id')
                    code_obj_id = water_object_ref.get('code_obj_id')

                    # Находим соответствующие записи в Codes
                    code_type = next((code for code in codes_dicts if code['id'] == code_type_id), None)
                    code_obj = next((code for code in codes_dicts if code['id'] == code_obj_id), None)

                    if code_type:
                        water_object_ref['code_type_id'] = code_type
                    if code_obj:
                        water_object_ref['code_obj_id'] = code_obj

                # Находим соответствующую запись в Organisations
                organisation = next((org for org in organisations_dicts if org['id'] == organisation_id), None)
                if organisation:
                    log['point_id']['organisation_id'] = organisation

    if role in ["UserRoles.ADMIN", "UserRoles.ORG_ADMIN", "UserRoles.REPORT_ADMIN"]:
        return final_result
    elif role == "UserRoles.EMPLOYEE":
        if org_id is None:
            return OperationResult(OperationStatus.UNDEFINE_ERROR, msg="Отсутствует org_id в фильтрах для EMPLOYEE")
        # Фильтруем по org_id для EMPLOYEE
        filtered_logs = [log for log in final_result.data if log.get('point_id', {}).get('organisation_id', {}).get('id') == int(org_id)]
        return OperationResult(status=OperationStatus.SUCCESS, data=filtered_logs)
    else:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg="Неизвестная role в фильтрах")


# def permisionpointlink_by_mf(filters: dict) -> OperationResult:
#     """
#     Функция для получения связок разрешений точек забора/сброса по фильтрам.
#
#     :param filters: ожидается organisation_id.
#     :return: OperationResult с отфильтрованными данными.
#     """
#
#     # Шаг 1: Извлечь organisation_id из словаря filters
#     organisation_id = filters.get('organisation_id')
#     if organisation_id is None:
#         return OperationResult(
#             OperationStatus.UNDEFINE_ERROR,
#             msg="Отсутствует organisation_id в фильтрах")
#
#     # Шаг 2: Получить все записи WaterPoint
#     water_points_result = get_all_from_table(WaterPoint)
#     if water_points_result.status != OperationStatus.SUCCESS:
#         return OperationResult(
#             water_points_result.status,
#             msg=water_points_result.message)
#
#     # Шаг 3: Отфильтровать записи WaterPoint по organisation_id
#     filtered_water_points = [point for point in water_points_result.data if point.organisation_id == int(organisation_id)]
#
#     # Шаг 4: Получить все записи PointPermissionLink
#     point_permission_links_result = get_all_from_table(PointPermissionLink)
#     if point_permission_links_result.status != OperationStatus.SUCCESS:
#         return OperationResult(
#             point_permission_links_result.status,
#             msg=point_permission_links_result.message)
#
#     # Шаг 5: Отфильтровать записи PointPermissionLink
#     # по совпадению с отфильтрованными WaterPoint
#     filtered_point_permission_links = [
#         link for link in point_permission_links_result.data
#         if link.point_id in [point.id for point in filtered_water_points]
#     ]
#     pprint.pprint(filtered_point_permission_links)
#     from utils.db_utils import replace_fks
#     result_with_replaced_fks = replace_fks(
#         OperationResult(
#             OperationStatus.SUCCESS,
#             data=filtered_point_permission_links),
#         'point_permission_link')
#
#     if result_with_replaced_fks.status != OperationStatus.SUCCESS:
#         return result_with_replaced_fks
#     converted_links = [convert_to_dict(link) for link in result_with_replaced_fks.data]
#
#     return OperationResult(
#         OperationStatus.SUCCESS,
#         data=converted_links)
def permisionpointlink_by_mf(filters: dict) -> OperationResult:
    """
    Функция для получения связок разрешений точек забора/сброса по фильтрам.

    :param filters: ожидается organisation_id.
    :return: OperationResult с отфильтрованными данными.
    """
    organisation_id = filters.get('organisation_id')
    if organisation_id is None:
        return OperationResult(
            OperationStatus.UNDEFINE_ERROR,
            msg="Отсутствует organisation_id в фильтрах"
        )

    try:
        organisation_id = int(organisation_id)
    except (ValueError, TypeError):
        return OperationResult(
            OperationStatus.UNDEFINE_ERROR,
            msg="organisation_id должен быть целым числом"
        )

    # Получаем все точки забора/сброса
    water_points_result = get_all_from_table(WaterPoint)
    if water_points_result.status != OperationStatus.SUCCESS:
        return water_points_result

    # Фильтруем точки по organisation_id и собираем их id в множество для быстрого поиска
    water_point_ids = {wp.id for wp in water_points_result.data if wp.organisation_id == organisation_id}
    if not water_point_ids:
        # Если нет точек для данной организации, возвращаем пустой результат
        return OperationResult(OperationStatus.SUCCESS, data=[])

    # Получаем все связи разрешений
    point_permission_links_result = get_all_from_table(PointPermissionLink)
    if point_permission_links_result.status != OperationStatus.SUCCESS:
        return point_permission_links_result

    # Фильтруем связи, оставляя только те, которые относятся к выбранным точкам
    filtered_links = [link for link in point_permission_links_result.data if link.point_id in water_point_ids]

    # Заменяем внешние ключи (FK)
    from utils.db_utils import replace_fks
    replaced_result = replace_fks(
        OperationResult(OperationStatus.SUCCESS, data=filtered_links),
        'point_permission_link'
    )
    if replaced_result.status != OperationStatus.SUCCESS:
        return replaced_result

    # Конвертируем объекты в словари
    converted_links = [convert_to_dict(link) for link in replaced_result.data]

    return OperationResult(OperationStatus.SUCCESS, data=converted_links)


def get_enum_options(enum_type: str) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    try:
        enum_class = getattr(models, enum_type)
        if not enum_class:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"ENUM '{enum_type}' не найден")

        return OperationResult(
            OperationStatus.SUCCESS,
            data=[{'value': e.value, 'label': e.name} for e in enum_class])

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def handle_schema(modelName: str) -> OperationResult:
    import sys
    from utils.db_utils import format_options
    try:
        print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
        # Кэш моделей по __tablename__ для быстрого поиска
        models_by_tablename = {
            obj.__tablename__: obj
            for obj in globals().values()
            if hasattr(obj, "__tablename__")
        }
        model_class = models_by_tablename.get(modelName)
        if model_class is None:
            raise ValueError(f"Не найдена модель для таблицы {modelName}")
        schema = []
        for column in model_class.__table__.columns:
            field = {
                "field": column.name,
                "type": "ENUM" if isinstance(column.type, Enum) else str(column.type),
                "foreignKey": bool(column.foreign_keys),
                "isEnum": isinstance(column.type, Enum),
                "enumType": getattr(column.type, "enum_class", None).__name__ if isinstance(column.type, Enum) else None,
                "options": []
            }
            if field["foreignKey"]:
                related_table_name = next(iter(column.foreign_keys)).column.table.name
                related_model_class = models_by_tablename.get(related_table_name)
                if related_model_class is None:
                    raise ValueError(f"Не найден класс модели для таблицы {related_table_name}")

                related_records_result = get_all_from_table(related_model_class)
                if related_records_result.status == OperationStatus.SUCCESS:
                    field["options"] = format_options(related_records_result.data, related_model_class)
            schema.append(field)

        return OperationResult(OperationStatus.SUCCESS, data=schema)

    except Exception as e:
        print(f"Error in handle_schema: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def get_water_logs(filter_k: str, filter_v: any) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    try:
        print(f"Ключ фильтра: {filter_k}, Значение фильтра: {filter_v}")

        if filter_k != "point_id" or "°" not in str(filter_v):
            return OperationResult(OperationStatus.NOT_REALIZED)

        # Получаем пункт учета по latitude_longitude
        point_result = get_all_by_foreign_key(WaterPoint, "latitude_longitude", filter_v)
        if point_result.status != OperationStatus.SUCCESS:
            pprint.pprint(point_result)
            return point_result
        point_id = point_result.data[0].id
        # Получаем точку водозабора один раз
        point = get_record_by_id(WaterPoint, point_id)
        # Получаем журналы по пункту учета
        logs_result = get_all_by_foreign_key(WaterConsumptionLog, "point_id", point_id)
        if logs_result.status != OperationStatus.SUCCESS:
            pprint.pprint(logs_result)
            return logs_result
        log_data = []
        for log in logs_result.data:
            records_result = get_all_by_foreign_key(RecordWCL, "log_id", log.id)
            if records_result.status != OperationStatus.SUCCESS:
                pprint.pprint(records_result)
                return records_result

            org_result = get_all_by_foreign_key(Organisations, "id", log.exploitation_org_id)
            if org_result.status != OperationStatus.SUCCESS or not org_result.data:
                pprint.pprint(org_result)
                return org_result

            organisation = org_result.data[0]

            log_data.append({
                'log': log,
                'records': records_result.data,
                'water_point': point,
                'organisation': organisation
            })

        return OperationResult(OperationStatus.SUCCESS, data=log_data)

    except Exception as e:
        print(f"Error in get_water_logs: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def get_points_consumption(filter_k: str, filter_v: any) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    def check_status(result):
        if result.status != OperationStatus.SUCCESS:
            pprint.pprint(result)
            return False
        return True
    try:
        # 1) Получаем точки водозабора
        points = get_all_by_foreign_key(WaterPoint, filter_k, filter_v)
        if not check_status(points):
            return points

        consumption_data = []

        for p in points.data:
            # 2) Получаем связки точка-разрешение
            links = get_all_by_foreign_key(PointPermissionLink, "point_id", p.id)
            if not check_status(links):
                return links
            # 3) Для каждой связки получаем разрешение и организацию
            for l in links.data:
                permissions = get_all_by_foreign_key(Permissions, "id", l.permission_id)
                if not check_status(permissions):
                    return permissions
                permission = permissions.data[0]
                org_result = get_all_by_foreign_key(Organisations, "id", permission.organisation_id)
                if not check_status(org_result):
                    return org_result
                org = org_result.data[0]
                # 4) Получаем приборы через организацию (возможно, тут ошибка в исходном коде, там p.organisation_id, а не org.id)
                meters_result = get_all_by_foreign_key(Meters, "organisation_id", org.id)
                if not check_status(meters_result):
                    return meters_result
                meters = meters_result.data
                # 5) Формируем результат
                consumption_data.append({
                    'water_point': p,
                    'permission': permission,
                    'organisation': org,
                    'meter': meters
                })
        return OperationResult(OperationStatus.SUCCESS, data=consumption_data)

    except Exception as e:
        print(f"Error in get_points_consumption: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def get_header_for_e31_32(filter_k, filter_v) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    try:
        # ищем по point_id (скорее всего)
        logs = get_all_by_foreign_key(WaterPoint, filter_k, filter_v)
        if logs.status != OperationStatus.SUCCESS:
            pprint.pprint(logs)
            return logs
        replace_logs = replace_fks(logs, WCLfor3132.__tablename__)
        if replace_logs.status != OperationStatus.SUCCESS:
            pprint.pprint(replace_logs)
        return replace_logs
    except Exception as e:
        print(f"в get_header_for_e31_32 что-то сломалось {e}")


def get_orgstatistics(org_id) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    print("Организаци №", org_id)
    result = get_all_from_table(WaterPoint)
    if result.status != OperationStatus.SUCCESS:
        return result
    filtered_points = [point for point in result.data if point.organisation_id == int(org_id)]
    result_dict = {"point_count": len(filtered_points)}
    return OperationResult(OperationStatus.SUCCESS, data=result_dict)
