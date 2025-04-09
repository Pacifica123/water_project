from utils.backend_utils import *
from utils.db_utils import *

from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
from db import models

from sqlalchemy import Enum
import sys


def permisionpointlink_by_mf(filters: dict) -> OperationResult:
    """
    Функция для получения связок разрешений точек забора/сброса по фильтрам.

    :param filters: Словарь фильтров, где ключ - имя столбца, а значение - значение для фильтрации.
    :return: OperationResult с отфильтрованными данными.
    """

    # Шаг 1: Извлечь organisation_id из словаря filters
    organisation_id = filters.get('organisation_id')
    if organisation_id is None:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg="Отсутствует organisation_id в фильтрах")

    # Шаг 2: Получить все записи WaterPoint
    water_points_result = get_all_from_table(WaterPoint)

    if water_points_result.status != OperationStatus.SUCCESS:
        return OperationResult(water_points_result.status, msg=water_points_result.message)

    # Шаг 3: Отфильтровать записи WaterPoint по organisation_id
    filtered_water_points = [point for point in water_points_result.data if point.organisation_id == int(organisation_id)]

    pprint.pprint(filtered_water_points)

    # Шаг 4: Получить все записи PointPermissionLink
    point_permission_links_result = get_all_from_table(PointPermissionLink)

    if point_permission_links_result.status != OperationStatus.SUCCESS:
        return OperationResult(point_permission_links_result.status, msg=point_permission_links_result.message)

    # Шаг 5: Отфильтровать записи PointPermissionLink по совпадению с отфильтрованными WaterPoint
    filtered_point_permission_links = [
        link for link in point_permission_links_result.data
        if link.point_id in [point.id for point in filtered_water_points]
    ]
    pprint.pprint(filtered_point_permission_links)

    # Применить функцию replace_fks
    from utils.db_utils import replace_fks
    result_with_replaced_fks = replace_fks(OperationResult(OperationStatus.SUCCESS, data=filtered_point_permission_links), 'point_permission_link')

    if result_with_replaced_fks.status != OperationStatus.SUCCESS:
        return result_with_replaced_fks

    # Преобразовать каждую запись в словарь
    converted_links = [convert_to_dict(link) for link in result_with_replaced_fks.data]

    return OperationResult(OperationStatus.SUCCESS, data=converted_links)



def get_enum_options(enum_type: str) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")

    try:
        print(" --> до сюда дошло")
        enum_class = getattr(models, enum_type)
        if not enum_class:
            return OperationResult(OperationStatus.VALIDATION_ERROR, msg=f"ENUM '{enum_type}' не найден")

        return OperationResult(OperationStatus.SUCCESS, data=[{'value': e.value, 'label': e.name} for e in enum_class])

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def handle_schema(modelName: str) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    from utils.db_utils import format_options
    try:
        # Ищем класс модели по __tablename__
        model_class = None
        for name, obj in globals().items():
            if hasattr(obj, "__tablename__") and obj.__tablename__ == modelName:
                model_class = obj
                break

        if model_class is None:
            raise ValueError(f"Не найден класс модели для таблицы {modelName}")

        # Используем model.__table__.columns для доступа к столбцам
        columns = model_class.__table__.columns

        schema = []
        for column in columns:
            field = {
                "field": column.name,
                "type": str(column.type),
                "foreignKey": False,
                "isEnum": False,
                "enumType": None,
                "options": []
            }

            # Проверяем, является ли столбец внешним ключом
            if column.foreign_keys:
                field["foreignKey"] = True

                # Получаем записи из связанной таблицы
                related_table_name = list(column.foreign_keys)[0].column.table.name
                related_model_class = None
                for name, obj in globals().items():
                    if hasattr(obj, "__tablename__") and obj.__tablename__ == related_table_name:
                        related_model_class = obj
                        break

                if related_model_class is None:
                    raise ValueError(f"Не найден класс модели для таблицы {related_table_name}")

                related_records_result = get_all_from_table(related_model_class)

                if related_records_result.status == OperationStatus.SUCCESS:
                    related_records = related_records_result.data
                    # Формируем опции, используя комбинацию полей
                    field["options"] = format_options(related_records, related_model_class)

            # Обнаружение ENUM типа
            if isinstance(column.type, Enum):

                field.update({
                    "type": "ENUM",
                    "isEnum": True,
                    "enumType": column.type.enum_class.__name__
                })

            schema.append(field)

        # Возвращаем результат только после обработки всех столбцов
        return OperationResult(OperationStatus.SUCCESS, data=schema)

    except Exception as e:
        print(f"Error in handle_schema: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def get_water_logs(filter_k: str, filter_v: any) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        # 0) Сначала получить пункт учета и его id нужно:
        print(f"Ключ фильтра в get_water_logs такой: {filter_k}")
        print(f"Значение фильтра в get_water_logs такой: {filter_v}")
        if "°" in str(filter_v) and str(filter_k) == "point_id":
            point_try = get_all_by_foreign_key(WaterPoint, "latitude_longitude", filter_v)
            if point_try.status != OperationStatus.SUCCESS:
                pprint.pprint(point_try)
                return point_try
            point_id = point_try.data[0].id
            print(f"айдишка пункта учета - {point_id}")

            # 1) Получить журналы учета водопотребления (скорее всего по пункту учета)
            logs = get_all_by_foreign_key(WaterConsumptionLog, "point_id", point_id)
            if logs.status != OperationStatus.SUCCESS:
                pprint.pprint(logs)
                return logs

            # 2) Для каждого журнала получить записи
            log_data = []
            for log in logs.data:
                records = get_all_by_foreign_key(RecordWCL, "log_id", log.id)
                if records.status != OperationStatus.SUCCESS:
                    pprint.pprint(records)
                    return records

                # 3) Дополнительные данные (точка водозабора, организация)
                point = get_record_by_id(WaterPoint, point_id)
                org = get_all_by_foreign_key(Organisations, "id", log.exploitation_org_id).data[0]

                # 4) Компонуем данные
                log_data.append({
                    'log': log,
                    'records': records.data,
                    'water_point': point,
                    'organisation': org
                })

            return OperationResult(OperationStatus.SUCCESS, data=log_data)
        else:
            return OperationResult(OperationStatus.NOT_REALIZED)

    except Exception as e:
        print(f"Error in get_water_logs: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def get_points_consumption(filter_k: str, filter_v: any) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        # 1) Добыча точек водозабора
        points = get_all_by_foreign_key(WaterPoint, filter_k, filter_v)
        if points.status != OperationStatus.SUCCESS:
            pprint.pprint(points)
            return points
#         2) Для каждой точки ищем по внешключу связку точка-разрешенеи
        consumption_data = []
        for p in points.data:
            links = get_all_by_foreign_key(PointPermissionLink, "point_id", p.id)
            if links.status != OperationStatus.SUCCESS:
                pprint.pprint(links)
                return links

#         3) Через каждую связку достать разрешение
            for l in links.data:
                permissions = get_all_by_foreign_key(Permissions, "id", l.permission_id)
                if permissions.status != OperationStatus.SUCCESS:
                    pprint.pprint(permissions)
                    return permissions
                permission = permissions.data[0]
                org = get_all_by_foreign_key(Organisations, "id", permission.organisation_id).data
#         4) Через организацию еще достать приборы
            meter = get_all_by_foreign_key(Meters, "id", p.organisation_id).data

#         5) компонуем
            consumption_data.append({
                'water_point': p,
                'permission': permission,
                'organisation': org,
                'meter': meter
            })
        return OperationResult(OperationStatus.SUCCESS, data=consumption_data)

    except Exception as e:
        print(f"Error in get_points_consumption: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def get_header_for_e31_32(filter_k, filter_v) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        # ищем по point_id скорее всего
        logs = get_all_by_foreign_key(WaterPoint, filter_k, filter_v)
        if logs.status != OperationStatus.SUCCESS:
            pprint.pprint(logs)
            return logs
        replace_logs = replace_fks(logs, WCLfor3132.__tablename__)
        if replace_logs.status != OperationStatus.SUCCESS:
            pprint.pprint(replace_logs)
        return replace_logs

    except Exception as e:
        print("в get_header_for_e31_32 что-то сломалось")
        print(e)
