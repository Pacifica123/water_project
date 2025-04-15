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

import sys

# ====================== CRUD Single Functions ======================


def get_users() -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    res = get_all_from_table(cls)
    print_operation_result(res)
    return replace_fks(res, tablename)


def get_single_with_mf(tablename: str, filters: dict) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")

    # Вызов функции для получения всех записей
    result = get_all_record_from(tablename)

    if result.status != OperationStatus.SUCCESS:
        return result

    # Преобразование данных в список словарей
    data = [convert_to_dict(record) for record in result.data]

    # Фильтрация данных
    filtered_data = []
    for record in data:
        is_match = True
        for key, value in filters.items():
            if key not in record or record[key] != value:
                is_match = False
                break
        if is_match:
            filtered_data.append(record)

    # Обработка результатов
    if not filtered_data:
        return OperationResult(OperationStatus.SUCCESS, msg="Нет записей, удовлетворяющих фильтрам", data=filtered_data)

    return OperationResult(OperationStatus.SUCCESS, msg="Данные успешно получены и отфильтрованы", data=filtered_data)


def add_to(tablename: str, data) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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


def get_structs_mf(selected_template: str, filters: dict) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    pprint.pprint(filters)
    match selected_template:
        case "permisionpointlink":
            return permisionpointlink_by_mf(filters)
        case "logs_for_AP":
            return waterlogs_by_mf(filters)
        case "log_details":
            return log_datails_by_mf(filters)
        case "organisations_familiar":
            return organisations_familiar_by_mf(filters)
        case _:
            return OperationResult(OperationStatus.VALIDATION_ERROR, msg="не поддерживаемая структура в get_structs")


def get_structs(selected_template: str, filter_k: str, filter_v: any) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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
        case "nof_statistics":
            return get_orgstatistics(filter_v)
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
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
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



# ====================== File Processing Functions ======================
def save_file_to_db_or_fs(
    filename: str,
    file_bytes: bytes,
    file_type: FileType,
    mimetype: str,
    entity_type: str,
    entity_id: int,
    description: str = None,
    created_by: str = "auto"
) -> OperationResult:
    """
    Функция сохранения файла
    """
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")

    if not is_valid_entity_type(entity_type):
        return OperationResult(OperationStatus.VALIDATION_ERROR, f"Неверный entity_type: {entity_type}")

    check_id = get_record_by_id(get_model_class_by_tablename(entity_type), entity_id)
    if check_id.status != OperationStatus.SUCCESS:
        return check_id

    data = {
        "filename": filename,
        "file_type": file_type.value,
        "content": file_bytes,
        "mimetype": mimetype,
        "description": description,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "created_by": created_by
    }

    success = create_record_entity(FileRecord, data)
    if success:
        return OperationResult(OperationStatus.SUCCESS, "Файл успешно сохранён")
    else:
        return OperationResult(OperationStatus.DATABASE_ERROR, "Ошибка при сохранении файла")


def get_files(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    file_type: Optional[FileType] = None,
    filename: Optional[str] = None,
    limit: Optional[int] = 100
) -> OperationResult:
    """
    Функция получения файлов с параметрами фильтрации
    """
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    session = g.session
    try:
        query = session.query(FileRecord).filter(FileRecord.is_deleted == False)

        if entity_type:
            if not is_valid_entity_type(entity_type):
                return OperationResult(OperationStatus.VALIDATION_ERROR, f"Неверный entity_type: {entity_type}")
            query = query.filter(FileRecord.entity_type == entity_type)

        if entity_id is not None:
            query = query.filter(FileRecord.entity_id == entity_id)

        if file_type:
            query = query.filter(FileRecord.file_type == file_type)

        if filename:
            query = query.filter(FileRecord.filename.ilike(f"%{filename}%"))

        files = query.order_by(FileRecord.created_at.desc()).limit(limit).all()

        data = [{
            "id": f.id,
            "filename": f.filename,
            "file_type": f.file_type.value if isinstance(f.file_type, FileType) else f.file_type,
            "mimetype": f.mimetype,
            "entity_type": f.entity_type,
            "entity_id": f.entity_id,
            "description": f.description,
            "created_at": f.created_at.isoformat()
        } for f in files]

        return OperationResult(OperationStatus.SUCCESS, data=data)

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, f"Ошибка при получении файлов: {e}")


def get_file_by_id(file_id: int) -> OperationResult:
    """
    Функция получения конкретного файла по file_id (для скачивания)
    """
    session = g.session
    try:
        file_record = session.query(FileRecord).filter(
            FileRecord.id == file_id,
            FileRecord.is_deleted == False
        ).one_or_none()

        if not file_record:
            return OperationResult(OperationStatus.DATABASE_ERROR, "Файл не найден")

        data = {
            "filename": file_record.filename,
            "content": file_record.content,
            "mimetype": file_record.mimetype
        }
        return OperationResult(OperationStatus.SUCCESS, data=data)

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, f"Ошибка при получении файла: {e}")


# ====================== File Parsing Functions ======================


def parce_exel(typeform, xls_file):
    # todo: Валидация через цепочку обязанностей (аналогично для parce_word)
    ...


def ocr_parce_pdf(pdf_file):
    ...


def confirm_pase(typeform, data) -> OperationResult:
    # todo: целый список match case функций для добавления конкретных typeform
    ...

