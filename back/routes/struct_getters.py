from utils.backend_utils import *
from utils.db_utils import *
from sqlalchemy import inspect, types, extract, func
from typing import List, Dict, Any
from datetime import date, datetime
from db.crudcore import *
from db.models import *
from db import models
from sqlalchemy import Enum
import sys
import pprint


def get_struct32(filters: dict) -> OperationResult:
    """
    Формирует структуру для Form32:
      - waterPool: бассейновые округа → участки → гидроединицы
      - permissions: все активные разрешения
      - instrumentBrands: все активные приборы (для выбора на фронте) с данными калибровки
      - waterObjects: водные объекты с кодами, координатами, sectionId и permissibleDischarge
    """
    org_id = filters.get('org_id')
    if org_id is None:
        return OperationResult(OperationStatus.FAILURE, message="org_id не передан")
    # 1) Собираем карту area_id → pool_id и сами бассейновые округа + участки
    pool_res = get_all_by_conditions(WaterPoolRef, [
        {'organisation_id': org_id},
        {'is_deleted': False}
    ])
    if pool_res.status != OperationStatus.SUCCESS:
        return pool_res
    pools = pool_res.data or []
    waterPool = []
    area_to_pool = {}  # для дальнейшей фильтрации waterObjects

    for pool in pools:
        # Получаем все участки в этом бассейне
        area_res = get_all_by_conditions(WaterAreaRef, [
            {'water_pool_id': pool.id},
            {'is_deleted': False}
        ])
        if area_res.status != OperationStatus.SUCCESS:
            return area_res
        areas = area_res.data or []

        sections = []
        for area in areas:
            # код участка из таблицы Codes
            code_area_res = get_record_by_id(Codes, area.code_area_id)
            code_area = code_area_res.data if code_area_res.status == OperationStatus.SUCCESS else None
            # гидроединица - первые три сегмента кода участка
            hydro_code = None
            if code_area and code_area.code:
                # допустим код_area.code = "13.01.02.006"
                parts = code_area.code.split('.')
                hydro_code = '.'.join(parts[:3])
            hydro_unit = {
                'id': area.id,
                'name': area.name,         # или другое поле названия участка
                'code': hydro_code or ''
            }
            sections.append({
                'id': area.id,
                'name': area.name,
                'code': code_area.code if code_area else '',
                'hydroUnits': [hydro_unit]
            })
            area_to_pool[area.id] = pool.id
        waterPool.append({
            'id': pool.id,
            'name': pool.pool_name,   # или pool.name
            'sections': sections
        })
    # 2) permissions — все активные разрешения для этой организации
    ppl_res = get_all_by_conditions(Permissions, [
        {'organisation_id': org_id},
        {'active': True},
        {'is_deleted': False}
    ])
    if ppl_res.status != OperationStatus.SUCCESS:
        return ppl_res
    permissions = [convert_to_dict(p) for p in (ppl_res.data or [])]
    # 3) instrumentBrands — все приборы, привязанные к точкам этой организации, is_active=True
    #    можно аналогично через PointMeterLink, но здесь возьмём напрямую:
    mlink_res = get_all_by_conditions(PointMeterLink, [
        {'point.organisation_id': org_id},  # если связь так выражается
        {'is_active': True}
    ])
    if mlink_res.status != OperationStatus.SUCCESS:
        return mlink_res
    instrumentBrands = []
    seen_meters = set()
    for link in (mlink_res.data or []):
        meter_res = get_record_by_id(Meters, link.meter_id)
        if meter_res.status != OperationStatus.SUCCESS:
            return meter_res
        m = meter_res.data
        if m.id in seen_meters:
            continue
        seen_meters.add(m.id)
        instrumentBrands.append({
            'id': m.id,
            'name': m.name,                                          # заменить на корректное поле
            'calibration': {
                'lastCalibrationDate': m.last_calibration_date or '', # YYYY-MM-DD
                'calibrationPeriodMonths': m.calibration_period_months or 0
            }
        })

    # 4) waterObjects — все объекты в участках org_id с координатами и discharge
    #    Координаты берём из WaterPoint.latitude_longitude, discharge — из Permissions
    wp_res = get_all_by_conditions(WaterPoint, [
        {'organisation_id': org_id},
        {'point_type': PermissionType.WATER_DISCHARGE},  # если есть такой тип
        {'is_deleted': False}
    ])
    if wp_res.status != OperationStatus.SUCCESS:
        return wp_res
    points = wp_res.data or []
    waterObjects = []
    for p in points:
        # привязанный water object
        wor_res = get_record_by_id(WaterObjectRef, p.water_body_id)
        if wor_res.status != OperationStatus.SUCCESS:
            return wor_res
        wor = wor_res.data
        # коды объекта и типа (code_obj_id, code_type_id)
        code_obj_res  = get_record_by_id(Codes, wor.code_obj_id)
        code_type_res = get_record_by_id(Codes, wor.code_type_id)
        code_obj  = code_obj_res.data if code_obj_res.status == OperationStatus.SUCCESS else None
        code_type = code_type_res.data if code_type_res.status == OperationStatus.SUCCESS else None
        # discharge — ищем активное разрешение на сброс для этой точки
        ppl_link_res = get_all_by_conditions(PointPermissionLink, [
            {'point_id': p.id},
            {'active': True}
        ])
        if ppl_link_res.status != OperationStatus.SUCCESS:
            return ppl_link_res
        discharge = 0
        for link in (ppl_link_res.data or []):
            perm_res = get_record_by_id(Permissions, link.permission_id)
            if perm_res.status != OperationStatus.SUCCESS:
                return perm_res
            perm = perm_res.data
            # предполагаем поле perm.permissible_discharge_thousand_m3
            discharge = getattr(perm, 'permissible_discharge_thousand_m3', discharge)
            break  # берём первое
        waterObjects.append({
            'id': wor.id,
            'name': getattr(wor, 'name', ''),
            'codes': {
                'objectCode': code_obj.code if code_obj else '',
                'subsystemCode': code_type.code if code_type else ''
            },
            'coordinates': p.latitude_longitude or '',
            'sectionId': wor.water_area_id,
            'permissibleDischargeThousandM3': discharge
        })
    return OperationResult(OperationStatus.SUCCESS, data={
        'waterPool': waterPool,
        'permissions': permissions,
        'instrumentBrands': instrumentBrands,
        'waterObjects': waterObjects
    })


def get_struct31(filters: dict) -> OperationResult:
    """
    Функция для получения структуры 3.1 (открытие формы).

    На вход ожидается org_id.
    На выход:
      - пункты учета (только WATER_WITHDRAWAL)
      - водный объект + его коды
      - водохозяйственный участок + бассейновый округ
      - разрешения (active=True)
      - последний прибор (is_active=True)
    """
    print(f"===== Зашло в функцию {sys._getframe().f_code.co_name} =====")
    org_id = filters.get('org_id')
    if org_id is None:
        return OperationResult(OperationStatus.FAILURE, message="org_id не передан в фильтрах")
    # Уже сразу фильтруем по org_id и по типу точки:
    wp_res = get_all_by_conditions(
        WaterPoint,
        [
            {'organisation_id': org_id},
            {'point_type': PermissionType.WATER_WITHDRAWAL}
        ]
    )
    if wp_res.status != OperationStatus.SUCCESS:
        return wp_res
    points = wp_res.data or []
    result_list = []
    for p in points:
        # базовая структура
        point_dict = {
            'id': p.id,
            'latitude_longitude': p.latitude_longitude,
            'point_type': p.point_type.value,
        }
        # 1) водный объект + коды
        wor = get_record_by_id(WaterObjectRef, p.water_body_id)
        if wor.status != OperationStatus.SUCCESS:
            return wor
        wor_obj = wor.data
        # коды
        code_type = get_record_by_id(Codes, wor_obj.code_type_id)
        code_obj  = get_record_by_id(Codes, wor_obj.code_obj_id)
        point_dict['water_object'] = {
            'id': wor_obj.id,
            'name': getattr(wor_obj, 'name', None),
            'code_type': convert_to_dict(code_type.data) if code_type.status == OperationStatus.SUCCESS else None,
            'code_object': convert_to_dict(code_obj.data)  if code_obj.status  == OperationStatus.SUCCESS else None,
        }
        # 2) водохозяйственный участок
        war = get_record_by_id(WaterAreaRef, wor_obj.water_area_id)
        if war.status != OperationStatus.SUCCESS:
            return war
        area = war.data
        # код участка
        code_area = get_record_by_id(Codes, area.code_area_id)
        # бассейновый округ
        wpr = get_record_by_id(WaterPoolRef, area.water_pool_id)
        if wpr.status != OperationStatus.SUCCESS:
            return wpr
        pool = wpr.data
        point_dict['water_area'] = {
            'id': area.id,
            'code_area': convert_to_dict(code_area.data) if code_area.status == OperationStatus.SUCCESS else None,
            'pool_name': pool.pool_name,
        }

        # 3) разрешения (active=True)
        ppl_res = get_all_by_conditions(PointPermissionLink, [
            {'point_id': p.id}, {'active': True}
        ])
        if ppl_res.status != OperationStatus.SUCCESS:
            return ppl_res
        permissions = []
        for link in ppl_res.data or []:
            perm = get_record_by_id(Permissions, link.permission_id)
            if perm.status != OperationStatus.SUCCESS:
                return perm
            permissions.append(convert_to_dict(perm.data))
        point_dict['permissions'] = permissions
        # 4) последний прибор (is_active=True)
        pml_res = get_all_by_conditions(PointMeterLink, [
            {'point_id': p.id}, {'is_active': True}
        ])
        if pml_res.status != OperationStatus.SUCCESS:
            return pml_res
        last_meter = None
        if pml_res.data:
            mlink = pml_res.data[0]
            meter = get_record_by_id(Meters, mlink.meter_id)
            if meter.status != OperationStatus.SUCCESS:
                return meter
            last_meter = convert_to_dict(meter.data)
        point_dict['last_meter'] = last_meter
        result_list.append(point_dict)

    print(f"===== Вышло из функции {sys._getframe().f_code.co_name} =====")
    return OperationResult(OperationStatus.SUCCESS, data=result_list)


def getall_coord_points(filters: dict) -> OperationResult:
    """
    Возвращает маркеры, привязанные к записям журнала WaterConsumptionLog.
    Для каждой записи логов (разный месяц, статус) формируется отдельный маркер,
    даже если point_id/organisation_id/координаты совпадают.
    """
    try:
        # 1. Берём все логи по фильтрам
        if not filters:
            log_res = get_all_from_table(WaterConsumptionLog)
        else:
            bad = [k for k in filters if not hasattr(WaterConsumptionLog, k)]
            if bad:
                return OperationResult(
                    OperationStatus.VALIDATION_ERROR,
                    msg=f"Неизвестные фильтры для журнала: {bad}"
                )
            conditions = [{"column": k, "value": v} for k, v in filters.items()]
            log_res = get_all_by_conditions(WaterConsumptionLog, conditions)
        if log_res.status != OperationStatus.SUCCESS:
            return log_res
        logs = log_res.data  # List[WaterConsumptionLog]
    except SQLAlchemyError as e:
        return OperationResult(OperationStatus.DATABASE_ERROR, msg=str(e))

    # 2. Собираем все уникальные точки, чтобы один раз достать из БД
    point_ids = {log.point_id for log in logs}
    points_cache: Dict[int, WaterPoint] = {}
    for pid in point_ids:
        p_res = get_record_by_id(WaterPoint, pid)
        if p_res.status == OperationStatus.SUCCESS and p_res.data:
            points_cache[pid] = p_res.data
        else:
            # если вдруг точки нет — пропускаем все её логи
            points_cache[pid] = None

    # 3. Собираем все уникальные организации
    org_ids = {
        wp.organisation_id
        for wp in points_cache.values()
        if wp is not None
    }
    org_cache: Dict[int, str] = {}
    for oid in org_ids:
        o_res = get_record_by_id(Organisations, oid)
        org_cache[oid] = (
            o_res.data.organisation_name
            if o_res.status == OperationStatus.SUCCESS and o_res.data
            else f"id={oid}"
        )

    # 4. Формируем результат: одну запись на каждый WaterConsumptionLog
    markers: List[Dict[str, Any]] = []
    for log in logs:
        wp = points_cache.get(log.point_id)
        if not wp:
            continue  # точки нет, пропускаем

        # парсим координаты точки
        try:
            lat, lng = parse_dms_to_decimal(wp.latitude_longitude)
        except ValueError:
            print(f"[WARN] Bad coords for point {wp.id!r}: {wp.latitude_longitude!r}")
            continue

        # подпись и статус берём из кэша/лога
        label = org_cache.get(wp.organisation_id, f"id={wp.organisation_id}")
        status = log.log_status.value if hasattr(log.log_status, 'value') else str(log.log_status)
        month  = log.month.value if hasattr(log.month, 'value') else str(log.month)
        markers.append({
            "lat": float(lat),
            "lng": float(lng),
            "label": label,
            "status": status,
            "month": month,
        })

    return OperationResult(
        OperationStatus.SUCCESS,
        msg="Markers by consumption logs",
        data=markers
    )


def get_actual_from_log_by_mf(filters: dict) -> OperationResult:
    try:
        months = filters.get("months") or filters.get("months[]")
        if isinstance(months, str):
            months = [months]
        elif months is None:
            months = []

        year = filters.get("year")
        water_point_id = filters.get("water_point_id")

        if not (year and water_point_id and months):
            return OperationResult(
                status=OperationStatus.VALIDATION_ERROR,
                msg="Не заданы обязательные фильтры: year, water_point_id, months"
            )
        from collections import defaultdict

        all_logs = []
        for month_name in months:
            try:
                month_enum = Month[month_name]
                log_conditions = [
                    {"point_id": int(water_point_id)},
                    {"month": month_enum}  # передаем один enum, а не список
                ]
                logs_result = get_all_by_conditions(WaterConsumptionLog, log_conditions)
                if logs_result.status == OperationStatus.SUCCESS:
                    all_logs.extend(logs_result.data)
            except KeyError:
                continue  # Пропускаем неверные месяцы

        # Фильтруем по году
        logs = [log for log in all_logs if log.start_date.year == int(year)]

        log_ids = [log.id for log in logs]

        all_records = []
        for log_id in log_ids:
            rec_conditions = [{"log_id": log_id}]
            recs_result = get_all_by_conditions(RecordWCL, rec_conditions)
            if recs_result.status == OperationStatus.SUCCESS:
                all_records.extend(recs_result.data)

        month_to_sum = defaultdict(float)
        logid_to_month = {log.id: log.month.name for log in logs}

        for rec in all_records:
            log_month = logid_to_month.get(rec.log_id)
            if log_month:
                month_to_sum[log_month] += float(rec.water_consumption_m3_per_day) # * float(rec.operating_time_days)

        result = {m: round(month_to_sum.get(m, 0.0), 2) for m in months}

        return OperationResult(OperationStatus.SUCCESS, data=result)

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


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

    water_point_ids = {wp.id for wp in water_points_result.data if wp.organisation_id == organisation_id}
    if not water_point_ids:
        return OperationResult(OperationStatus.SUCCESS, data=[], msg="Точек нет")

    # Получаем все связи разрешений
    point_permission_links_result = get_all_from_table(PointPermissionLink)
    if point_permission_links_result.status != OperationStatus.SUCCESS:
        return point_permission_links_result

    filtered_links = [link for link in point_permission_links_result.data if link.point_id in water_point_ids]

    # Получаем все разрешения разом
    permissions_result = get_all_from_table(Permissions)
    if permissions_result.status != OperationStatus.SUCCESS:
        return permissions_result
    permissions_dict = {p.id: p for p in permissions_result.data}

    # Подменяем permission_id на словарь (а не на объект!)
    for link in filtered_links:
        perm_obj = permissions_dict.get(link.permission_id)
        if perm_obj:
            link.permission_id = perm_obj.to_dict()

    # Конвертируем объекты в словари (PointPermissionLink)
    converted_links = [convert_to_dict(link) for link in filtered_links]

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


def get_orgstatistics(org_id) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    print("Организаци №", org_id)
    result = get_all_from_table(WaterPoint)
    if result.status != OperationStatus.SUCCESS:
        return result
    filtered_points = [point for point in result.data if point.organisation_id == int(org_id)]
    result_dict = {"point_count": len(filtered_points)}
    return OperationResult(OperationStatus.SUCCESS, data=result_dict)
