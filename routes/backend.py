from flask import Blueprint

# from data.examples import unwanted_columns
from db.crudcore import *
from db.models import *
from utils.backend_chain_validation import validate_data
from utils.backend_utils import *
from utils.db_utils import (replace_fks, try_create_code, get_all_models)
# import pprint

from routes.struct_getters import *
from routes.struct_senders import *

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
        data=employee  # БЫЛО : data=serialize_to_json_old(employee)
    )


def check_login(username: str, need_role: UserRoles) -> bool:
    """возвращает True если роль соответствует требуемой или это главный админ
    """
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


def get_all_record_from(tablename: str) -> OperationResult:
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    res = get_all_from_table(cls)
    print_operation_result(res)
    return replace_fks(res, tablename)


def add_to(tablename: str, data) -> OperationResult:
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))

    if tablename == "organisations":
        # 1. Получить organization_code из data
        organization_code = data.get('organization_code')

        if not organization_code:
            return OperationResult(
                status=OperationStatus.VALIDATION_ERROR,
                msg="Отсутствует organization_code в данных"
            )

        # 2. Проверить, существует ли уже такой код
        existing_code_result = try_create_code(organization_code, CodeType.ORGANISATION_CODE_GUIV, data.get('organisation_name'))

        if existing_code_result.status != OperationStatus.SUCCESS:
            return existing_code_result

        # 3. Получить id созданного кода
        code_id = existing_code_result.data.get('id')

        if not code_id:
            return OperationResult(
                status=OperationStatus.UNDEFINE_ERROR,
                msg="Не удалось получить id созданного кода"
            )

        # 4. Пересобрать data с новым organization_code
        data['organization_code'] = code_id

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
        case "allModels":
            return get_all_models()
        case modelname if selected_template.startswith("schema_"):
            modelname = modelname.replace("schema_", "")
            return handle_schema(modelname)
        case enum_request if selected_template.startswith("enum_"):
            enum_type = selected_template.replace("enum_", "")
            print(f"в selected_template попал ENUM : {enum_type}")
            return get_enum_options(enum_type)
        case _:
            return OperationResult(OperationStatus.VALIDATION_ERROR, msg="не поддерживаемая структура в get_structs")



# def get_fdata_by_selected(selected_template: str) -> OperationResult:
#     """Возвращает необходимые данные для формы заполнения."""
#     tables = {
#         'accounting_for_water_consumption': ['organisation', 'water_point', 'devices', 'water_body'],
#         'excel_template_3.1': ['organisation', 'water_pool', 'organisation_hydrounit_codes', 'water_area', 'permissions', 'device_brand', 'devices', 'water_body', 'water_treatment', 'sampling_location', 'surface_water_withdrawal'],
#         'excel_template_3.2': ['organisation', 'water_pool', 'organisation_hydrounit_codes', 'water_area', 'permissions', 'device_brand', 'devices', 'water_body'],
#         'Payment_calculation': []
#     }.get(selected_template)
#
#     if tables is None:
#         return OperationResult(OperationStatus.UNDEFINE_ERROR, "Неизвестный шаблон", None)
#
#     all_data = {}
#     for table in tables:
#         result = get_all_record_from(table)
#         if result.status == OperationStatus.SUCCESS:
#             all_data[table] = serialize_to_json(result.data)
#         else:
#             print_operation_result(result)
#             return OperationResult(result.status, f"Ошибка при получении данных из таблицы {table}", None)
#
#     return OperationResult(OperationStatus.SUCCESS, "Данные успешно получены", all_data)


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
        case "payment_calculation":
            pass
        case _:
            raise ValueError(f"Неизвестная форма или ее отсутсвие : {selected_template}")




# ====================== File Parsing Functions ======================


def parce_exel(typeform, xls_file):
    # todo: Валидация через цепочку обязанностей (аналогично для parce_word)
    ...


def ocr_parce_pdf(pdf_file):
    ...


def confirm_pase(typeform, data) -> OperationResult:
    # todo: целый список match case функций для добавления конкретных typeform
    ...

