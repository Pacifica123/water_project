from datetime import date

from flask import Blueprint, g

from data.examples import unwanted_columns
from db.crudcore import read_all_employees, find_employee_by_username, get_all_from_table, create_user, \
    create_record_entity, update_employee, update_record, soft_delete_record
from db.models import SurfaceWaterWithdrawal, Codes, Permissions, Standarts, Employees
from utils.backend_chain_validation import validate_data
from utils.backend_utils import print_data_in_func, parce_year_and_quarter, check_quarter_data_exist, get_last_day, \
    OperationResult, OperationStatus, print_entity_data, serialize_to_json, get_model_class_by_tablename, \
    get_required_fields, print_operation_result

backend = Blueprint('backend', __name__)


# Требования:
# Данные отправляются в конкретные таблицы связанные с pdf ✅ (для 1й)
# Если отправление в БД неудачно - выкинуть эксепшен и обработать возвратом ошибки ✅ (для одной)
# Проверяется были ли уже введены данные текущего квартала текущего года [?] (для одной)




def add_data_form_surfacewaterwithdrawal(data) -> OperationResult:
    """
    Параметры: в соответствии с pdf 1 образца
    :return: OperationResult с параметрами status, message и data
    """
    session = g.session
    # print_data_in_func(data, 'add_data_form_surfacewaterwithdrawal')
    (year, quarter) = parce_year_and_quarter(data)
    print_data_in_func(quarter, 'add_data_form_surfacewaterwithdrawal')
    # duplicate_data = check_quarter_data_exist(
    #     quarter,
    #     year,
    #     SurfaceWaterWithdrawal.__tablename__
    # )
    duplicate_data = False
    if duplicate_data:
        return OperationResult(
            OperationStatus.DATA_DUPLICATE_ERROR,
            msg="Были найдены данные со схожей датой. Возможно пользователь хочет их изменить.",
            data=duplicate_data
        )
    new_form1 = SurfaceWaterWithdrawal(
        # да простят меня те кто потом будет это читать...
        date=date(year, (quarter-1)*3 + 1, get_last_day(year, (quarter-1)*3 + 1)),
        actual=data.get('fact_month1'),
        population=data.get('population_month1'),
        other=data.get('others_month1')
    )
    new_form2 = SurfaceWaterWithdrawal(
        date=date(year, (quarter-1)*3 + 2, get_last_day(year, (quarter-1)*3 + 2)),
        actual=data.get('fact_month2'),
        population=data.get('population_month2'),
        other=data.get('others_month2')
    )
    new_form3 = SurfaceWaterWithdrawal(
        date=date(year, (quarter-1)*3 + 3, get_last_day(year, (quarter-1)*3 + 3)),
        actual=data.get('fact_month3'),
        population=data.get('population_month3'),
        other=data.get('others_month3')
    )
    if new_form1 and new_form2 and new_form3:
        new_form1.save(session)
        new_form2.save(session)
        new_form3.save(session)
        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg="Все записи были успешно добавлены в БД"
        )
    else:
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Некоторые из месяцев не прошли в БД",
            data={
                'form1': new_form1,
                'form2': new_form2,
                'form3': new_form3
            }
        )


# def add_data_form32(data):
#     ...
#
#
# def add_data_form33(data):
#     ...


def get_users() -> OperationResult:
    """
    :return: OperationResult в котором data - список сотрудников
    """
    employees = read_all_employees()
    if len(employees) == 0 or employees is None:
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
    """
    Сверка с БД для авторизации
    :return: OperationResult с тремя вариантами:
    1) Login not found
    2) Password incorrect
    3) Successful
    """
    employee = find_employee_by_username(username)

    if employee is None:
        return OperationResult(
            status=OperationStatus.AUTHENTICATION_ERROR,
            msg="Пользователь не найден"
        )
    # Проверка пароля
    if employee.password != password:
    # if not check_password_hash(employee.password_hash, password):
        return OperationResult(
            status=OperationStatus.AUTHENTICATION_ERROR,
            msg="Неверный пароль"
        )

    return OperationResult(
        status=OperationStatus.SUCCESS,
        msg="авторизация завершилась успешно",
        data=serialize_to_json(employee)
    )


def parce_exel(typeform, xls_file):
    """
    будет через match case валидировать данные..
    """
    # todo : Валидация через цепочку обязанностей (аналогично для parce_word)
    ...


def ocr_parce_pdf(pdf_file):
    """
    Отдельная история...
    """
    ...


def confirm_pase(typeform, data) -> OperationResult:
    """
    По соглашению с сотрудником добавляем данные data в соответствии с typeform в БД
    """
    #     todo : целый список match case функций для добавления конкретных typeform
    ...


def edit_or_add_employee(user_data) -> OperationResult:
    """
    Проверки:
    - пользователь существует? (просто проверка по БД) -> если нет add -> если да edit
    - пользователь онлайн? (if 'user' in session and session['user'] == username)
    """
    res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)
    username = user_data.get('username')
    if username is not None:
        emply = find_employee_by_username(username)
        if emply is not None:
            # редактирование информации о существующем сотруднике
            return update_employee(username, user_data)
        else:
            is_created = create_user(user_data)
            if is_created:
                res.status = OperationStatus.SUCCESS
                res.message = 'Создан новый пользователь'
            else:
                res.status = OperationStatus.DATABASE_ERROR
                res.message = 'Не удалось создать нового пользователя'
    return res



def get_all_record_from(tablename: str) -> OperationResult:
    """
    match case по тназванию таблицы и вывод всех записей от туда (ну либо не всех..)
    :return: какой-то список чего-то OperationResult.data
    """
    #  res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))

    res = get_all_from_table(cls)
    print_operation_result(res)
    return res


def get_fdata_by_selected(selected_template: str) -> OperationResult:
    """
    Возвращает необходимые данные для формы заполнения
    """
    print(f"\n   get_fdata_by_selected : _{selected_template}_\n")
    match selected_template:
        case 'accounting_for_water_consumption':
            # Здесь перечисляем таблицы, данные из которых нужно получить
            tables = ['organisation', 'water_point', 'devices', 'water_body']
        case 'another_template':
            # Другой пример с другими таблицами
            tables = ['table1', 'table2']
        case _:
            # Если шаблон не распознан, возвращаем ошибку
            return OperationResult(OperationStatus.UNDEFINE_ERROR, "Неизвестный шаблон", None)

    # Сбор данных из всех указанных таблиц
    all_data = {}
    for table in tables:
        result = get_all_record_from(table)
        if result.status == OperationStatus.SUCCESS:
            all_data[table] = serialize_to_json(result.data)
        else:
            print_operation_result(result)
            return OperationResult(result.status, f"Ошибка при получении данных из таблицы {table}", None)

    # print(len(all_data['organisation']))
    # print(all_data['organisation'][0].organisation_name)
    return OperationResult(OperationStatus.SUCCESS, "Данные успешно получены", all_data)



def add_to(tablename: str, data) -> OperationResult:
    res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    if create_record_entity(cls, data):
        res.status = OperationStatus.SUCCESS
        res.message = f"Зпись успешно добавилась в БД {tablename}"
    else:
        res.status = OperationStatus.DATABASE_ERROR
        res.message = f"Ошибка при создании записи в {tablename} или запись уже существует или такой сущности нет в БД"
    return res


def update_record_in(tablename: str, record_id: int, data: dict) -> OperationResult:
    """
    Обновление записи в указанной таблице по идентификатору.

    :param tablename: Название таблицы, в которой нужно обновить запись.
    :param record_id: ID записи, которую нужно обновить.
    :param data: Словарь с новыми данными для обновления записи.
    :return: OperationResult с результатом операции.
    """
    res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)
    cls = get_model_class_by_tablename(tablename)
    print_data_in_func(cls, 'update_record_in')

    if cls is None:
        return res

    # Извлечение обязательных полей для данной сущности
    required_fields = get_required_fields(cls)

    res = update_record(cls, record_id, data, required_fields)
    print_data_in_func(res.status, "update_record_in")
    return res

def delete_record_from(tablename: str, record_id: int) -> OperationResult:
    res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    return soft_delete_record(cls, record_id)
def delete_users(tablename: str, users_id: int) -> OperationResult:
    res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)
    cls = validate_data('model_exist', get_model_class_by_tablename(tablename))
    return soft_delete_record(cls, users_id)

def convert_to_dict(record):
    return {column.name: getattr(record, column.name) for column in record.__table__.columns}




def edit_concrete_record(selected_model, selected_id, newdata) -> OperationResult:
    ...


def add_new_record(selected_model, data) -> OperationResult:
    ...

