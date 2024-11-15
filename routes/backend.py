from datetime import date
from flask import Blueprint, g

from data.examples import unwanted_columns
from db.crudcore import (
    read_all_employees, find_employee_by_username,
    get_all_from_table, create_user, create_record_entity,
    update_employee, update_record, soft_delete_record
)
from db.models import Codes, Permissions, StandartsRef, User
from utils.backend_chain_validation import validate_data
from utils.backend_utils import (
    print_data_in_func, parce_year_and_quarter, check_quarter_data_exist,
    get_last_day, OperationResult, OperationStatus,
    print_entity_data, serialize_to_json, get_model_class_by_tablename,
    get_required_fields, print_operation_result, serialize_to_json_old
)

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
        data=serialize_to_json_old(employee)
    )

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
    return res

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

# ====================== File Parsing Functions ======================

def parce_exel(typeform, xls_file):
    # todo: Валидация через цепочку обязанностей (аналогично для parce_word)
    ...

def ocr_parce_pdf(pdf_file):
    ...

def confirm_pase(typeform, data) -> OperationResult:
    # todo: целый список match case функций для добавления конкретных typeform
    ...

