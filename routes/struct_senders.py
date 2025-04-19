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
        print_data_in_func(form_data, "process_water_consumption_single")
        # Получение данных из формы
        measurement_date = form_data.get("measurement_date")
        water_point_id = form_data.get("water_point_id")  # Предполагаем, что water_point_id есть в форме
        if not measurement_date or not water_point_id:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg="Недостаточно данных для определения журнала учета водопотребления"
            )
        month = datetime.datetime.strptime(measurement_date, "%Y-%m-%d").month
        # Поиск журнала по water_point_id и месяцу
        log_result = find_water_consumption_log(water_point_id, month)
        if log_result.status != OperationStatus.SUCCESS:
            return log_result
        log = log_result.data
        # Поля, которые нужно взять из формы для записи
        valid_fields = {
            "measurement_date",
            "operating_time_days",
            "water_consumption_m3_per_day",
            "meter_readings",
            "person_signature"
        }
        # Формируем данные для записи, берём только нужные поля
        record_data = {field: form_data[field] for field in valid_fields if field in form_data}
        record_data["log_id"] = log.id

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
    pprint.pprint(form_data)
    quarter = form_data["quarter"]
    report_data = form_data["data"]

    month_mapping = {
        1: [Month.JANUARY, Month.FEBRUARY, Month.MARCH],
        2: [Month.APRIL, Month.MAY, Month.JUNE],
        3: [Month.JULY, Month.AUGUST, Month.SEPTEMBER],
        4: [Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER],
    }
    months = month_mapping.get(quarter)
    if not months:
        raise ValueError(f"Invalid quarter: {quarter}")

    category_mapping = {
        "fact": ConsumersCategories.ACTUAL,
        "population": ConsumersCategories.POPULATION,
        "other": ConsumersCategories.OTHER,
    }

    for month, data in zip(months, report_data):
        for category_key, value in data.items():
            if category_key not in category_mapping:
                continue
            entry = {
                "category": category_mapping[category_key],
                "month": month,
                "value": value,
                "water_point_id": water_point_id
            }
            if not create_record_entity(WaterConsumptionLogByCategories, entry):
                return OperationResult(
                    status=OperationStatus.DATABASE_ERROR,
                    msg=f"Ошибка в create_record_entity для {WaterConsumptionLogByCategories.__tablename__}"
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
