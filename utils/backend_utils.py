from datetime import datetime, date
import json
from typing import Any
import re

import sqlalchemy
from flask import g
from sqlalchemy import func, extract
from sqlalchemy.exc import NoResultFound

from db.models import Base
import inspect

import enum

class OperationStatus:
    SUCCESS = "success"
    DATABASE_ERROR = "db_error"
    CONNECTION_ERROR = "conn_error"
    DATA_DUPLICATE_ERROR = "dupl_error"
    UNDEFINE_ERROR = "undef_error"
    CHOICE_WARNING = "choice_warning"
    AUTHENTICATION_ERROR = "auth_error"
    VALIDATION_ERROR = "invalid_error"
    NOT_REALIZED = "this_functional_dont_work"


class OperationResult:
    def __init__(self, status, msg=None, data=None):
        self.status = status
        self.message = msg
        self.data = data


def print_operation_result(result, func_name=None):
    if func_name is None:
        # Получаем имя вызывающей функции, если оно не передано
        func_name = inspect.currentframe().f_back.f_code.co_name

    print(f"Function: {func_name}")
    print(f"Status: {result.status}")

    if result.message:
        print(f"Message: {result.message}")

    if result.data:
        print("Data:")
        if isinstance(result.data, dict):
            for key, value in result.data.items():
                print(f"- {key}: {value}")
        else:
            print(result.data)

    print()


def clear_fields(json_str, fields):
    # Десериализуем JSON-строку в словарь
    data = json.loads(json_str)
    # Удаляем указанные поля
    for field in fields:
        data.pop(field, None)
    # Сериализуем обратно в JSON-строку
    return json.dumps(data)


def get_required_fields(entity_class) -> list:
    """
    Извлечение обязательных полей из модели SQLAlchemy, исключая поле id.

    :param entity_class: Класс сущности SQLAlchemy.
    :return: Список обязательных полей.
    """
    required_fields = []
    for column in sqlalchemy.inspect(entity_class).c:
        if column.nullable is False and column.name != 'id':  # Исключаем поле id
            required_fields.append(column.name)
    return required_fields


def is_valid_date(date) -> bool:
    """
    Проверяет, является ли входное значение 'date' корректной датой в формате YYYY-MM-DD
    и не является ли датой из будущего.

    :param date: Дата в виде строки, объекта datetime или другого типа, который можно преобразовать в строку
    :return: True, если дата корректна и не из будущего, иначе False
    """
    try:
        # Преобразуем входное значение в строку
        date_str = str(date)

        # Пытаемся преобразовать строку в объект datetime
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')

        # Проверяем, что дата не из будущего
        if date_obj > datetime.now():
            return False

        return True
    except (ValueError, TypeError):
        # Если возникла ошибка преобразования или некорректный тип данных, значит дата некорректна
        return False


def is_valid_email(email: str) -> bool:
    """
    Проверяет, является ли строка 'email' корректным email-адресом.

    :param email: Email-адрес в виде строки
    :return: True, если email корректен, иначе False
    """
    # Проверяем, что email является строкой и не превышает 100 символов
    if not isinstance(email, str) or len(email) > 100:
        return False

    # Регулярное выражение для проверки корректности email
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    # Проверяем соответствие регулярному выражению
    return re.match(email_regex, email) is not None


def get_model_class_by_tablename(tablename: str):
    """
    Получает класс модели по имени таблицы.

    :param tablename: Имя таблицы, для которой нужно найти класс модели.
    :return: Класс модели, если найден, иначе None.
    """
    # Проходим по всем классам, которые наследуются от Base
    for cls in Base.__subclasses__():
        # Проверяем, есть ли атрибут __tablename__ и совпадает ли он с переданным именем
        if hasattr(cls, '__tablename__') and cls.__tablename__ == tablename:
            return cls
    return None


def extract_value_from_json(json_str: str, key: str) -> OperationResult:
    """
    Извлекает значение из JSON-строки по заданному ключу.

    :param json_str: Строка в формате JSON.
    :param key: Ключ, значение которого нужно извлечь.
    :return: Экземпляр OperationResult с результатом операции.
    """
    try:
        # Попытка распарсить строку JSON
        parsed_json = json.loads(json_str)
    except json.JSONDecodeError:
        # Если строка не является корректным JSON
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Строка не является корректным JSON."
        )

    # Проверка наличия ключа
    if key in parsed_json:
        return OperationResult(
            status=OperationStatus.SUCCESS,
            data=parsed_json[key]
        )
    else:
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg=f"Ключ '{key}' не найден в JSON."
        )


def process_enums(data, is_need_json=False):
    """
    Обработка перечислений в списке словарей с возможностью сериализации для jsonify.

    :param data: Список словарей, содержащих перечисления.
    :param is_need_json: Флаг, определяющий, требуется ли подготовка к JSON-сериализации.
    :return: Список словарей с перечислениями и сложными объектами, приведенными к JSON-совместимым форматам.
    """

    def convert_value(value):
        """Преобразование значения для JSON-сериализации."""
        if isinstance(value, enum.Enum):
            return value.name  # Перечисление -> строка
        elif isinstance(value, (datetime, date)):
            return value.isoformat()  # Даты -> строка в ISO формате
        elif isinstance(value, dict):
            return {k: convert_value(v) for k, v in value.items()}  # Рекурсивно для вложенных словарей
        elif isinstance(value, list):
            return [convert_value(v) for v in value]  # Рекурсивно для списков
        else:
            return value  # Если это примитивный тип, оставляем без изменений

    processed_data = []
    for item in data:
        processed_item = {}
        for key, value in item.items():
            if is_need_json:
                processed_item[key] = convert_value(value)
            else:
                # Только замена перечислений, если флаг не поднят
                processed_item[key] = value.name if isinstance(value, enum.Enum) else value

        processed_data.append(processed_item)

    return processed_data


def serialize_to_json_records(records: list) -> str:
    """
    Сериализует список записей в JSON-формат.
    :param records: Список объектов для сериализации.
    :return: OperationResult с сериализованным JSON.
    """
    try:
        json_records = []
        for record in records:
            result = serialize_to_json_old(record)
            json_records.append(json.loads(result))

        json_str = json.dumps(json_records)
        return json_str
    except Exception as e:
        print_data_in_func(e, "serialize_to_json_records")
        # return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))



def serialize_to_json(obj: Any) -> Any:
    """
    Сериализует объект в JSON-формат.

    :param obj: Объект, который нужно сериализовать.
    :return: Строка в формате JSON или сериализуемый объект.
    """
    if isinstance(obj, list):
        return [serialize_to_json(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: serialize_to_json(value) for key, value in obj.items()}
    elif hasattr(obj, '__dict__'):
        # Преобразуем объект в словарь, исключая не сериализуемые атрибуты
        return {key: serialize_to_json(value) for key, value in obj.__dict__.items() if not isinstance(value, (set, bytes))}
    else:
        # Для простых типов данных (строка, число и т.д.)
        return obj


def serialize_to_json_old(obj: Any) -> str:
    """
    Сериализует объект в JSON-формат.
    :param obj: Объект, который нужно сериализовать.
    :return: Строка в формате JSON.
    """
    print_data_in_func(obj, "serialize_to_json_old")
    # Проверка, является ли объект экземпляром класса
    if hasattr(obj, '__dict__'):
        # Извлечение атрибутов объекта
        obj_dict = obj.__dict__
    else:

        raise ValueError("Переданный объект не является экземпляром класса.")
    # Преобразование в JSON
    return json.dumps(obj_dict, default=str)


def print_entity_data(entity):
    """
    Функция для вывода данных всех полей записи сущности.

    :param entity: Объект сущности SQLAlchemy.
    """
    # Получаем все поля сущности
    for column in entity.__table__.columns:
        # Получаем значение поля
        value = getattr(entity, column.name)
        print(f"{column.name}: {value}")


def print_data_in_func(data, funcname):
    if data and funcname:
        print(f'\n\n DATA: {data} \nIN FUNCTION {funcname} \n\n')
    else:
        print(f'НЕВОЗМОЖНО ОТОБРАЗИТЬ None ДАННЫЕ ИЛИ НЕ ЗАДАНА ФУНКЦИЯ')


def parce_year_and_quarter(data):
    """
    Обязательный формат данных:
    \n data.get('year') = 20xx
    \n data.get('quarter') = 1-4
    :return: тюрпл/кортеж в формате (год, квартал)
    """
    if data.get('year') and data.get('quarter'):
        current_year = data.get('year')
        current_quarter = data.get('quarter')
    else:
        print('\n\n В данных не найдено информации о годе или квартале внесения данных. \
         \nПо умолчанию будет считать текущая дата')
        today = datetime.date.today()
        current_year = today.year
        if today.month in [1, 2, 3]:
            current_quarter = 1
        elif today.month in [4, 5, 6]:
            current_quarter = 2
        elif today.month in [7, 8, 9]:
            current_quarter = 3
        else:
            current_quarter = 4

    return current_year, current_quarter


def parce_year_and_month(data):
    """
    Обязательный формат данных:
    \n data.get('year') = 20xx
    \n data.get('month') = 1-12
    :return: тюрпл/кортеж в формате (год, месяц)
    """
    if data.get('year') and data.get('moth'):
        current_year = data.get('year')
        current_month = data.get('moth')
    else:
        print('\n\n В данных не найдено информации о годе или месяце внесения данных. \
         \nПо умолчанию будет считаться текущая дата')
        today = datetime.date.today()
        current_year = today.year
        current_month = today.month

    return current_year, current_month


def check_quarter_data_exist(quarter, year, tablename):
    session = g.session
    #  todo : на исправлении
    # Получаем модель по имени таблицы
    model = None
    for mapper in Base.registry.mappers:
        if mapper.local_table.name == tablename:
            model = mapper.class_
            break

    if model is None:
        print(f"Модель для таблицы {tablename} не найдена.")
        return None

    try:
        start_m = (quarter - 1) * 3 + 1
        end_m = (quarter - 1) * 3 + 3

        query = session.query(
            func.count(extract('year', getattr(Base, 'date'))),
            func.count(extract('month', getattr(Base, 'date')))
        ).filter(
            extract('month', getattr(Base, 'date')).between(start_m, end_m),
            extract('year', getattr(Base, 'date')) == year
        ).group_by(
            extract('year', getattr(Base, 'date')),
            extract('month', getattr(Base, 'date'))
        ).having(
            func.count(extract('year', getattr(Base, 'date'))) > 0
        ).first()

        if query:
            return query
        else:
            return None
    except (AttributeError, NoResultFound) as e:
        print(f"Ошибка в функции check_quarter_data_exist: {e}")
        return None


def get_last_day(year, month):
    # print_data_in_func({year, month}, 'get_last_day')
    match month:
        # Январь, Март, Май, Июль, Август, Октябрь, Декабрь
        case 1 | 3 | 5 | 7 | 8 | 10 | 12:
            return 31
        # Апрель, Июнь, Сентябрь, Ноябрь
        case 4 | 6 | 9 | 11:
            return 30
        case 2:
            if (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0):
                return 29  # Високосный
            else:
                return 28  # Невисокосный
        case _:
            raise ValueError("Invalid month")


def convert_to_dict(record):
    print_data_in_func(record, "convert_to_dict")
    if hasattr(record, '__table__'):  # Если record — объект SQLAlchemy
        return {column.name: getattr(record, column.name) for column in record.__table__.columns}
    else:  # Если record — словарь
        return record  # Просто возвращаем словарь как есть
