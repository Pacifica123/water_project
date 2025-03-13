from datetime import date, datetime
from flask import Blueprint, g

from data.examples import unwanted_columns
from db.crudcore import (
    read_all_employees, find_employee_by_username,
    get_all_from_table, create_user, create_record_entity,
    update_employee, update_record, soft_delete_record,
    get_all_by_foreign_key, get_record_by_id
)
from db.models import (
    Codes, Permissions, StandartsRef, User, UserRoles, WaterConsumptionLogByCategories, RecordWCL, WaterConsumptionLog, ConsumersCategories, Month, PointPermissionLink, PointMeterLink, Permissions, Meters, Organisations, WCLfor3132, WaterPoint)
from utils.backend_chain_validation import validate_data
from utils.backend_utils import (
    print_data_in_func, parce_year_and_quarter, check_quarter_data_exist,
    get_last_day, OperationResult, OperationStatus,
    print_entity_data, serialize_to_json, get_model_class_by_tablename,
    get_required_fields, print_operation_result, serialize_to_json_old
)
from utils.db_utils import replace_fks, recognize_model
import pprint

backend = Blueprint('backend', __name__)

# ====================== CRUD Functions ======================

def get_users() -> OperationResult:
    employees = read_all_employees()
    if not employees:
        return OperationResult(
            OperationStatus.DATABASE_ERROR,
            msg="нет данных или список сотрудников пуст",
            data=None
        )
    return OperationResult(
        OperationStatus.SUCCESS,
        msg="",
        data=employees
    )

def backend_login(username: str, password: str) -> OperationResult:
    employee = find_employee_by_username(username)

    if employee is None:
        return OperationResult(
            status=OperationStatus.AUTHENTICATION_ERROR,
            msg="Пользователь не найден"
        )

    # Проверка пароля
    if employee.password != password:
        return OperationResult(
            status=OperationStatus.AUTHENTICATION_ERROR,
            msg="Неверный пароль"
        )

    return OperationResult(
        status=OperationStatus.SUCCESS,
        msg="авторизация завершилась успешно",
        data=employee # БЫЛО : data=serialize_to_json_old(employee)
    )


def check_login(username: str, need_role: UserRoles) -> bool:
    """возвращает True если роль соответствует требуемой или это главный админ"""
    employee = find_employee_by_username(username)
    if employee.role == need_role or employee.role == UserRoles.ADMIN:
        return True
    return False


def edit_or_add_employee(user_data) -> OperationResult:
    username = user_data.get('username')
    if username:
        emply = find_employee_by_username(username)
        if emply:
            return update_employee(username, user_data)
        else:
            if create_user(user_data):
                return OperationResult(
                    status=OperationStatus.SUCCESS,
                    msg='Создан новый пользователь'
                )
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg='Не удалось создать нового пользователя'
            )
    return OperationResult(status=OperationStatus.UNDEFINE_ERROR)

def edit_concrete_record(selected_model, selected_id, newdata) -> OperationResult:
    ...


def get_all_record_from(tablename: str) -> OperationResult:
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    res = get_all_from_table(cls)
    print_operation_result(res)
    return replace_fks(res, tablename)

def add_to(tablename: str, data) -> OperationResult:
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))

    if create_record_entity(cls, data):
        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg=f"Запись успешно добавилась в БД {tablename}"
        )

    return OperationResult(
        status=OperationStatus.DATABASE_ERROR,
        msg=f"Ошибка при создании записи в {tablename} или запись уже существует или такой сущности нет в БД"
    )

def update_record_in(tablename: str, record_id: int, data: dict) -> OperationResult:
    cls = get_model_class_by_tablename(tablename)
    if cls is None:
        return OperationResult(status=OperationStatus.UNDEFINE_ERROR)

    required_fields = get_required_fields(cls)
    res = update_record(cls, record_id, data, required_fields)
    print_data_in_func(res.status, "update_record_in")
    return res

def delete_record_from(tablename: str, record_id: int) -> OperationResult:
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    return soft_delete_record(cls, record_id)

def delete_users(tablename: str, users_id: int) -> OperationResult:
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    return soft_delete_record(cls, users_id)

# ====================== Data Processing Functions ======================
def get_structs(selected_template: str, filter_k: str, filter_v: any) -> OperationResult:
    match selected_template:
        case "point_consumption":
            return get_points_consumption(filter_k, filter_v)
        case "exel31_32":
            return get_header_for_e31_32(filter_k, filter_v)
        case "water_logs":
            return get_water_logs(filter_k, filter_v)
        case _:
            return OperationResult(OperationStatus.VALIDATION_ERROR, msg="не поддерживаемая структура в get_structs")
            # raise ValueError(f"не поддерживаемая структура в get_structs")


def get_water_logs(filter_k: str, filter_v: any) -> OperationResult:
    try:
        # 0) Сначала получить пункт учета и его id нужно:
        print(filter_k)
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
                point = get_record_by_id(WaterPoint.__tablename__, point_id)
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
    try:
#         1) Добыча точек водозабора
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
    try:
#         ищем по point_id скорее всего
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

def get_fdata_by_selected(selected_template: str) -> OperationResult:
    """Возвращает необходимые данные для формы заполнения."""
    tables = {
        'accounting_for_water_consumption': ['organisation', 'water_point', 'devices', 'water_body'],
        'excel_template_3.1': ['organisation', 'water_pool', 'organisation_hydrounit_codes', 'water_area', 'permissions', 'device_brand', 'devices', 'water_body', 'water_treatment', 'sampling_location', 'surface_water_withdrawal'],
        'excel_template_3.2': ['organisation', 'water_pool', 'organisation_hydrounit_codes', 'water_area', 'permissions', 'device_brand', 'devices', 'water_body'],
        'Payment_calculation': []
    }.get(selected_template)

    if tables is None:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, "Неизвестный шаблон", None)

    all_data = {}
    for table in tables:
        result = get_all_record_from(table)
        if result.status == OperationStatus.SUCCESS:
            all_data[table] = serialize_to_json(result.data)
        else:
            print_operation_result(result)
            return OperationResult(result.status, f"Ошибка при получении данных из таблицы {table}", None)

    return OperationResult(OperationStatus.SUCCESS, "Данные успешно получены", all_data)


def find_water_consumption_log(water_point_id: int, month: int) -> OperationResult:
    try:
        # Получение журналов учета водопотребления для точки водозабора
        logs_result = get_water_logs("point_id", water_point_id)
        if logs_result.status != OperationStatus.SUCCESS:
            return logs_result

        # Поиск журнала, соответствующего указанному месяцу
        target_log = None
        for log_data in logs_result.data:
            log = log_data['log']
            records = log_data['records']

            # Проверка записей на соответствие месяцу
            for record in records:
                record_month = record.measurement_date.month
                if record_month == month:
                    target_log = log
                    break

            if target_log:
                break

        if not target_log:
            return OperationResult(
                OperationStatus.DATABASE_ERROR,
                msg=f"Не найден журнал учета водопотребления для точки {water_point_id} и месяца {month}"
            )

        return OperationResult(OperationStatus.SUCCESS, data=target_log)

    except Exception as e:
        print(f"Error in find_water_consumption_log: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))



# --------- send form processing funstions --------- #

def form_processing_to_entity(selected_template: str, form_data: any) -> OperationResult:
    match selected_template:
        case "send_quarter":
            return send_quarter(form_data)
        case "water_consumption_single":
            return process_water_consumption_single(form_data)
        case "water_consumption_many":
            pass
        case "excel_template_3.1":
            return send_extempl31or32(form_data)
        case "excel_template_3.2":
            return send_extempl31or32(form_data)
        case "Payment_calculation":
            pass
        case _:
            raise ValueError(f"Неизвестная форма или ее отсутсвие : {selected_template}")

def process_water_consumption_single(form_data: dict) -> OperationResult:
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
        month = datetime.strptime(measurement_date, "%Y-%m-%d").month  # Пример формата даты

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
        result = add_to(RecordWCL.__tablename__, record_data)
        if result.status != OperationStatus.SUCCESS:
            return result

        return OperationResult(status=OperationStatus.SUCCESS, msg="Данные успешно сохранены")

    except Exception as e:
        print(f"Error in process_water_consumption_single: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def send_quarter(form_data: any):
    # water_point_id = form_data["water_point_id"]
    # water_point_name = form_data["waterObject"][""]
    pprint.pprint(form_data)
    water_object_code = form_data["waterObjectCode"]
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
                }
                result = add_to(WaterConsumptionLogByCategories.__tablename__, entry)
                if result.status != OperationStatus.SUCCESS:
                    return result

    return OperationResult(status=OperationStatus.SUCCESS, msg="Данные успешно сохранены")


def send_extempl31or32(form_data: any) -> OperationResult:
    # TODO ПЕРЕДЕЛАТЬ В ЦИКЛ ДЛЯ МНОЖЕСТВА ЗАПИСЕЙ
    table31or32 = form_data["table31or32"]
    pprint.pprint(table31or32)
    oprez = recognize_model(table31or32)

    print_operation_result(oprez, "send_extempl31or32")
    if oprez.status == OperationStatus.SUCCESS:
        final_rez = add_to(WCLfor3132.__tablename__, oprez.data)
        return final_rez
    return oprez
# ====================== File Parsing Functions ======================

def parce_exel(typeform, xls_file):
    # todo: Валидация через цепочку обязанностей (аналогично для parce_word)
    ...

def ocr_parce_pdf(pdf_file):
    ...

def confirm_pase(typeform, data) -> OperationResult:
    # todo: целый список match case функций для добавления конкретных typeform
    ...

