from utils.backend_utils import *
from utils.db_utils import *

from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
import sys


def process_water_consumption_single(form_data: dict) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        # Получение данных из формы
        measurement_date = form_data.get("measurement_date")
        water_point_id = form_data.get("water_point_id")  # Предполагаем, что water_point_id есть в форме

        if not measurement_date or not water_point_id:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg="Недостаточно данных для определения журнала учета водопотребления"
            )

        # Определение месяца
        month = datetime.datetime.strptime(measurement_date, "%Y-%m-%d").month  # Пример формата даты

        # Поиск журнала по water_point_id и месяцу
        log_result = find_water_consumption_log(water_point_id, month)
        if log_result.status != OperationStatus.SUCCESS:
            return log_result

        log = log_result.data

        # Сопоставление полей формы с полями модели RecordWCL
        mapping = {
            "measurement_date": "measurement_date",
            "operating_time_days": "operating_time_days",
            "water_consumption_m3_per_day": "water_consumption_m3_per_day",
            "meter_readings": "meter_readings",
        }

        # Создание словаря для записи в БД
        record_data = {}
        for field_name, value in form_data.items():
            if field_name in mapping.values():
                record_data[mapping[field_name]] = value

        # Добавление log_id
        record_data["log_id"] = log.id

        # Добавление записи в БД
        # result = add_to(RecordWCL.__tablename__, record_data)
        print(" --- Метка перед if create_record_entity ---")
        if create_record_entity(RecordWCL, record_data):
            return OperationResult(
                status=OperationStatus.SUCCESS,
                msg=f"Запись успешно добавилась в БД {RecordWCL.__tablename__}"
            )

        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Ошибка при создании записи в {RecordWCL.__tablename__} или запись уже существует или такой сущности нет в БД"
        )
    except Exception as e:
        print(f"Error in process_water_consumption_single: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def send_quarter(form_data: any):
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    water_point_id = form_data["waterPointId"]
    # water_point_name = form_data["waterObject"][""]
    pprint.pprint(form_data)
    # water_object_code = form_data["waterObjectCode"]
    quarter = form_data["quarter"]
    report_data = form_data["data"]

    month_mapping = {
        1: [Month.JANUARY, Month.FEBRUARY, Month.MARCH],
        2: [Month.APRIL, Month.MAY, Month.JUNE],
        3: [Month.JULY, Month.AUGUST, Month.SEPTEMBER],
        4: [Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER],
    }

    months = month_mapping.get(quarter, [])
    if not months:
        raise ValueError(f"Invalid quarter: {quarter}")
    # Создаем словарь для сопоставления категорий с их значениями
    category_mapping = {
        "fact": ConsumersCategories.ACTUAL,
        "population": ConsumersCategories.POPULATION,
        "other": ConsumersCategories.OTHER,
    }

    for month, data in zip(months, report_data):
        for category_key, value in data.items():
            if category_key in category_mapping:
                entry = {
                    "category": category_mapping[category_key],
                    "month": month,
                    "value": value,
                    "water_point_id": water_point_id
                }
                # result = add_to(WaterConsumptionLogByCategories.__tablename__, entry)
                # if result.status != OperationStatus.SUCCESS:
                #     return result
                if not create_record_entity(WaterConsumptionLogByCategories, entry):
                    return OperationResult(
                        status=OperationStatus.DATABASE_ERROR,
                        msg=f"Ошибка в create_record_entity для {tablename}"
                    )

    return OperationResult(status=OperationStatus.SUCCESS, msg="Данные успешно сохранены")


def send_extempl31or32(form_data: any) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    # TODO ПЕРЕДЕЛАТЬ В ЦИКЛ ДЛЯ МНОЖЕСТВА ЗАПИСЕЙ
    table31or32 = form_data["table31or32"]
    pprint.pprint(table31or32)
    oprez = recognize_model(table31or32)

    print_operation_result(oprez, "send_extempl31or32")
    if oprez.status == OperationStatus.SUCCESS:
        final_rez = add_to(WCLfor3132.__tablename__, oprez.data)
        return final_rez
    return oprez
