from utils.backend_utils import *
from utils.db_utils import *
from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
import sys


def create_full_waterpoint(
    data_point: dict,
    data_meter: dict,
    data_permission: dict,
) -> OperationResult:
    # Вспомогательный парсер дат
    parse_date = lambda src, key: datetime.strptime(src[key], "%d.%m.%Y").date()

    # 1. Проверка наличия идёт/создаётся ли счётчик
    has_existing_meter = bool(data_point.get("meter_id") and data_meter.get("id"))
    if not has_existing_meter:
        # 1.1. Если нет ни существующего, ни нужных полей для поиска/создания
        if not all(data_meter.get(k) for k in ("serial_number", "brand_id")):
            return OperationResult(
                status=OperationStatus.VALIDATION_ERROR,
                msg="Нет обязательного поля"
            )
        # 1.2. Пытаемся найти по serial_number + brand_id
        find = get_all_by_conditions(
            Meters,
            [
                {"serial_number": data_meter["serial_number"]},
                {"brand_id": data_meter["brand_id"]},
            ],
        )
        if find.status == OperationStatus.SUCCESS:
            meters = find.data
            if len(meters) != 1:
                print_data_in_func(
                    meters, "create_full_waterpoint: найдено несколько приборов"
                )
                return OperationResult(
                    status=OperationStatus.CHOICE_WARNING,
                    data=meters,
                    msg="Было найдено несколько схожих приборов"
                )
            data_point["meter_id"] = meters[0].id

        elif "Не найдено" in find.message:
            # 1.3. Создаём новый прибор
            try:
                meter_payload = {
                    "organisation_id": int(data_point["organisation_id"]),
                    "brand_id": data_meter["brand_id"],
                    "serial_number": data_meter["serial_number"],
                    "verification_date": parse_date(data_meter, "verification_date"),
                    "verification_interval": int(data_meter["verification_interval"]),
                    "next_verification_date": parse_date(data_meter, "next_verification_date"),
                }
                if not create_record_entity(Meters, meter_payload):
                    raise RuntimeError("Ошибка при создании нового прибора")
                data_point["meter_id"] = get_last_record_id(Meters)
            except Exception as e:
                print(e)
                print_data_in_func(
                    {**data_point, **data_meter, **data_permission},
                    "create_full_waterpoint: ошибка создания прибора"
                )
                return OperationResult(
                    status=OperationStatus.DATABASE_ERROR,
                    msg="Ошибка при создании нового прибора"
                )
        else:
            # 1.4. Неизвестная ошибка поиска
            print_operation_result(find)
            return find

    # 2. Подготовка всех полезадок
    waterpoint_payload = {
        "organisation_id": int(data_point["organisation_id"]),
        "meter_id": int(data_point["meter_id"]),
        "water_body_id": int(data_point["water_body_id"]),
        "latitude_longitude": data_point["latitude_longitude"],
        "point_type": data_point["point_type"],
    }
    permission_payload = {
        "organisation_id": int(data_point["organisation_id"]),
        "permission_number": data_permission["permission_number"],
        "registration_date": parse_date(data_meter, "registration_date"),
        "expiration_date": parse_date(data_meter, "expiration_date"),
        "permission_type": data_permission["permission_type"],
        "allowed_volume_org": float(data_permission["allowed_volume_org"]),
        "allowed_volume_pop": float(data_permission["allowed_volume_pop"]),
        "method_type": data_permission["method_type"],
    }
    link_meter_payload = {
        "point_id": None,  # заполнится после создания WP
        "meter_id": data_point["meter_id"],
        "is_active": True,
    }
    link_permission_payload = {
        "point_id": None,
        "permission_id": None,
        "actual_start_date": parse_date(data_meter, "actual_start_date"),
        "actual_end_date": parse_date(data_meter, "actual_end_date"),
        "active": False,
    }

    # 3. Создание записей и связей в БД
    try:
        # Словарь моделей и их полезадок + читаемый текст ошибки
        to_create = [
            (WaterPoint, waterpoint_payload, "пункта учета"),
            (Permissions, permission_payload, "разрешения"),
        ]
        ids = {}
        for model, payload, desc in to_create:
            if not create_record_entity(model, payload):
                raise RuntimeError(f"Ошибка при создании нового {desc}")
            ids[model.__name__] = get_last_record_id(model)

        # Проставляем связи
        link_meter_payload["point_id"] = ids["WaterPoint"]
        link_permission_payload["point_id"] = ids["WaterPoint"]
        link_permission_payload["permission_id"] = ids["Permissions"]

        # Берём сами записи связей (ошибки не критичны — либо создадутся, либо упадут в ЛОГ)
        create_record_entity(PointMeterLink, link_meter_payload)
        create_record_entity(PointPermissionLink, link_permission_payload)

        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg="Все записи таблиц успешно созданы"
        )

    except Exception as e:
        print(e)
        print_data_in_func(
            {**data_point, **data_meter, **data_permission},
            "create_full_waterpoint: ошибка при создании записей WP/P"
        )
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=str(e)
        )


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
