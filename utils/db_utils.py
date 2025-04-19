from db.crudcore import (
    get_record_by_id, create_record_entity, get_all_by_foreign_key, get_all_by_conditions, create_records_entities
)
from utils.backend_utils import OperationStatus, OperationResult, get_model_class_by_tablename, print_operation_result
from sqlalchemy.inspection import inspect
import json
# import inspect
from db.models import *
from sqlalchemy import types
import pprint
import importlib
from routes.struct_getters import get_water_logs
import sys

import secrets
import string


def generate_password(length=12):
    """
    Генерирует случайный пароль заданной длины.

    :param length: Длина пароля (по умолчанию 12 символов).
    :return: Сгенерированный пароль.
    """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


def create_org_user(orgdata) -> OperationResult:
    users_data = {
            "last_name": orgdata['legal_form'],
            "first_name": orgdata['organisation_name'],
            "username": "employee"+str(orgdata['organisation_id']),
            "email": orgdata['postal_address'],
            "password": generate_password(),
            "role": UserRoles.EMPLOYEE,
            "organisation_id": orgdata['organisation_id']
    }
    if create_record_entity(User, users_data):
        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg=f"Пользователь организации создан, временные данные: логин - {users_data['username']} временный пароль - {users_data['password']}",
            data={'username': users_data['username'], 'password': users_data['password']}
        )
    return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Не удалось создать аккаунт для организации"
        )


def process_water_point_fks(record):
    print("===== Вошли в process_water_point_fks =====")

    # Преобразуем объект записи в словарь
    record_dict = record.__dict__.copy()
    record_dict.pop('_sa_instance_state', None)  # Удаляем ненужные атрибуты SQLAlchemy

    if 'point_id' in record_dict:
        point_id = record_dict['point_id']

        # Если point_id — это целое число, загружаем объект WaterPoint из базы данных
        if isinstance(point_id, int):
            print(f"point_id — это целое число: {point_id}, загружаем WaterPoint из БД")
            point_result = get_record_by_id(WaterPoint, point_id)
            if point_result.status == OperationStatus.SUCCESS:
                print("Точка найдена успешно")
                point_data = point_result.data.to_dict()
                print(f"Данные точки: {point_data}")
                record_dict['point_id'] = point_data
            else:
                print("Не удалось найти точку по идентификатору")
                return record_dict

        # Если point_id уже является словарем
        elif isinstance(point_id, dict):
            print("point_id уже является словарем")
            point_data = point_id

        else:
            print(f"Неизвестный тип point_id: {type(point_id)}")
            return record_dict

        # Проверяем наличие water_body_id в данных точки
        if 'water_body_id' in record_dict['point_id']:
            water_body_id = record_dict['point_id']['water_body_id']
            print(f"Идентификатор водного объекта: {water_body_id}")

            water_object_result = get_record_by_id(WaterObjectRef, water_body_id)
            if water_object_result.status == OperationStatus.SUCCESS:
                print("Водный объект найден успешно")
                water_object_data = water_object_result.data.to_dict()
                print(f"Данные водного объекта: {water_object_data}")

                record_dict['point_id']['water_body_id'] = water_object_data

                # Обработка связей для Codes
                if 'code_type_id' in water_object_data:
                    code_type_id = water_object_data['code_type_id']
                    code_type_result = get_record_by_id(Codes, code_type_id)
                    if code_type_result.status == OperationStatus.SUCCESS:
                        code_type_data = code_type_result.data.to_dict()
                        water_object_data['code_type_id'] = code_type_data

                if 'code_obj_id' in water_object_data:
                    code_obj_id = water_object_data['code_obj_id']
                    code_obj_result = get_record_by_id(Codes, code_obj_id)
                    if code_obj_result.status == OperationStatus.SUCCESS:
                        code_obj_data = code_obj_result.data.to_dict()
                        water_object_data['code_obj_id'] = code_obj_data
            else:
                print("Водный объект не найден")
        else:
            print("В данных точки нет water_body_id")
    else:
        print("В записи нет point_id")

    print("===== Вышли из process_water_point_fks =====")
    return record_dict


def process_water_consumption_logs_fks(result: OperationResult) -> OperationResult:
    print("===== Вошли в process_water_consumption_logs_fks =====")

    if result.status != OperationStatus.SUCCESS:
        print("Результат операции не успешный")
        return result

    records = result.data
    print(f"Количество записей: {len(records)}")

    processed_records = [process_water_point_fks(record) for record in records]

    print("===== Вышли из process_water_consumption_logs_fks =====")

    return OperationResult(status=OperationStatus.SUCCESS, data=processed_records)


def is_valid_entity_type(entity_type: str) -> bool:
    res = get_all_models()
    if res.status != OperationStatus.SUCCESS:
        return False
    valid_types = [item[1] for item in res.data]  # берем __tablename__
    return entity_type in valid_types



def format_options(records, model_class):
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    # Определяем поля, которые будут использованы для формирования опций
    inspector = inspect(model_class)
    columns = inspector.columns

    # Список строковых полей
    text_columns = [col.name for col in columns if isinstance(col.type, (types.String, types.Text, types.VARCHAR))]
    print(f"Строковые поля: {text_columns}")

    options = []
    for record in records:
        # Формируем метку, соединяя все строковые поля
        label_parts = []
        for col in text_columns:
            value = getattr(record, col)
            print(f"Поле {col}: {value}")
            if value and str(value) != "[object Object]" and col != "created_by":
                label_parts.append(str(value))

        label = ", ".join(label_parts)  # Используем запятую с пробелом в качестве разделителя

        print(f"Метка до проверки: {label}")

        # Если метка пустая, используем id в качестве метки
        if not label:
            print("Метка пустая, используем id")
            label = str(record.id)

        print(f"Метка после проверки: {label}")

        options.append({"value": record.id, "label": label})

    return options


def find_water_consumption_log(water_point_id: int, month: int) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        # Получение журналов учета водопотребления для точки водозабора
        logs_result = get_water_logs("point_id", water_point_id)
        print_operation_result(logs_result, "find_water_consumption_log")
        if logs_result.status != OperationStatus.SUCCESS:
            return logs_result
        month_enum_map = {
            1: Month.JANUARY,
            2: Month.FEBRUARY,
            3: Month.MARCH,
            4: Month.APRIL,
            5: Month.MAY,
            6: Month.JUNE,
            7: Month.JULY,
            8: Month.AUGUST,
            9: Month.SEPTEMBER,
            10: Month.OCTOBER,
            11: Month.NOVEMBER,
            12: Month.DECEMBER
        }
        target_month = month_enum_map.get(month)
        if target_month is None:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"Недопустимый номер месяца: {month}"
            )

        # Поиск журнала, соответствующего указанному месяцу
        target_log = None

        for log_data in logs_result.data:
            log = log_data['log']
            records = log_data['records']
            if log.month == target_month:
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


def try_create_code(code_symbol: str, code_type: CodeType, code_value: str) -> OperationResult:
    """
    Если код существует то SUCCESS
    """
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    # Проверяем, существует ли уже такой код
    conditions = [
        {'code_symbol': code_symbol},
        {'code_type': code_type}
    ]
    existing_code_result = get_all_by_conditions(Codes, conditions)

    if existing_code_result.status == OperationStatus.SUCCESS and existing_code_result.data:
        # Код уже существует, возвращаем успех с отметкой о том, что код был найден
        return OperationResult(
            status=OperationStatus.SUCCESS,
            data={'id': existing_code_result.data[0].id},
            msg="Код уже существует."
        )
    new_code = Codes(
        code_symbol=code_symbol,
        code_value=code_value,
        code_type=code_type
    )
    new_code_list = [new_code]

    # Попытка создать запись
    create_result = create_records_entities(new_code_list)

    if create_result.status == OperationStatus.SUCCESS:
        # Получить id созданного кода
        new_code_rez = get_all_by_conditions(
            Codes,
            conditions
        )

        if new_code_rez.status == OperationStatus.SUCCESS and len(new_code_rez.data) == 1:
            new_code = new_code_rez.data[0]
            return OperationResult(
                status=OperationStatus.SUCCESS,
                data={'id': new_code.id}
            )
        else:
            return new_code_rez

    return create_result


def get_all_models() -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        # Список моделей с русскоязычными именами
        models_list = [
            ["Пользователи", User.__tablename__],
            ["Протокол химического анализа", ChemicalAnalysisProtocol.__tablename__],
            ["Место отбора проб", SamplingLocation.__tablename__],
            ["КОДЫ", Codes.__tablename__],
            ["Вещества", SubstancesRef.__tablename__],
            ["Нормативы", StandartsRef.__tablename__],
            ["Концентрации", Concentrates.__tablename__],
            ["Марки приборов", MetersBrandRef.__tablename__],
            ["Все журналы", WaterConsumptionLog.__tablename__],
            ["Приборы", Meters.__tablename__],
            ["Организации", Organisations.__tablename__],
            ["Разрешения", Permissions.__tablename__],
            ["Бассейны", WaterPoolRef.__tablename__],
            ["Водохозяйственные участки", WaterAreaRef.__tablename__],
            ["Водные объекты", WaterObjectRef.__tablename__],
            ["Точки", WaterPoint.__tablename__],
            ["История", History.__tablename__],
            ["Квартальные справки", WaterConsumptionLogByCategories.__tablename__],
            ["WCLfor3132", WCLfor3132.__tablename__],
            ["RecordWCL", RecordWCL.__tablename__],
        ]

        return OperationResult(OperationStatus.SUCCESS, data=models_list)

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=f"Неизвестная ошибка: {e}")


def is_valid_foreign_key(table_name, id) -> bool:
    result = get_record_by_id(get_model_class_by_tablename(table_name), id)
    return result.status == OperationStatus.SUCCESS


def replace_fks(operation_result: OperationResult, tablename: str) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    if operation_result.status != OperationStatus.SUCCESS:
        print("Сработал if operation_result.status != OperationStatus.SUCCESS")
        return operation_result

    records = operation_result.data
    if not records:
        print("Сработал if not records")
        return operation_result  # Ничего не заменяем, если записей нет

    # Получаем класс модели из имени таблицы
    model_class = get_model_class_by_tablename(tablename)
    if not model_class:
        print("if not model_class")
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Не удалось получить класс модели для таблицы {tablename}."
        )

    # mapper = inspect(model_class)

    new_records = []

    # Проходим по всем записям
    for record in records:
        # Используем __dict__ для получения всех атрибутов записи
        record_dict = record.__dict__.copy()  # Копируем атрибуты

        # Удаляем атрибуты SQLAlchemy, которые не нужны (например, _sa_instance_state)
        record_dict.pop('_sa_instance_state', None)
        # print(f"--- сейчас идет {  } ---")
        # Проходим по всем полям модели
        for column in model_class.__table__.columns:
            pprint.pprint(model_class)
            print(f"Столбец: {column.name}, Внешние ключи: {column.foreign_keys}")

            # Проверяем, является ли атрибут внешним ключом
            if column.foreign_keys:
                foreign_key_value = getattr(record, column.name)
                print(f"Обрабатываем запись: {record}, внешний ключ: {column.name}, значение: {foreign_key_value}")  # Отладочный вывод
                if foreign_key_value is not None:
                    # Получаем класс связанной модели
                    related_model_class = next(iter(column.foreign_keys)).column.table.name
                    related_record_result = get_record_by_id(get_model_class_by_tablename(related_model_class), foreign_key_value)

                    if related_record_result.status == OperationStatus.SUCCESS:
                        # Добавляем связанные данные в словарь записи
                        record_dict[column.name] = related_record_result.data.to_dict()  # Сохраняем объект как словарь
                        print(f"Заменили {column.name} на {related_record_result.data}")  # Отладочный вывод

        new_records.append(record_dict)  # Добавляем новый словарь в список

    return OperationResult(status=OperationStatus.SUCCESS, data=new_records)


def recognize_model(data: any) -> OperationResult:
    """
    Универсальная функция для определения соответствующей модели по данным формы.
    """
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        if isinstance(data, str):  # Если пришел JSON в виде строки, пытаемся распарсить
#             TODO на свое
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                return OperationResult(OperationStatus.VALIDATION_ERROR, "Неправильный JSON формат")
        print("--- это не json ---")
        if not isinstance(data, dict):
            return OperationResult(OperationStatus.VALIDATION_ERROR, "Данные должны быть словарем для соответствия моделям")


        # Получаем все классы моделей

        try:
            models_module = importlib.import_module('db.models')
            models = [cls for _, cls in inspect.getmembers(models_module, inspect.isclass) if issubclass(cls, Base) and cls is not Base]
        except Exception as e:
            print(e)
        # pprint.pprint(models[1])


        try:
            print(len(models))

            for model in models:
                try:
                    model_fields = {col.name for col in model.__table__.columns}  # Получаем поля модели
                    if model_fields.issuperset(data.keys()):  # Проверяем, совпадают ли ключи
                        instance = model(**{k: v for k, v in data.items() if k in model_fields})

                        pprint.pprint(instance)
                        return OperationResult(OperationStatus.SUCCESS, "Модель распознана", instance)
                except Exception:
                    continue  # Игнорируем ошибки при попытке создания модели
        except Exception as e:
            print(e);
        return OperationResult(OperationStatus.VALIDATION_ERROR, "Модель не распознана")

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, f"Неизвестная ошибка: {str(e)}")
