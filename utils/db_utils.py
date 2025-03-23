from db.crudcore import (
    get_record_by_id, create_record_entity, get_all_by_foreign_key, get_all_by_conditions, create_records_entities
)
from utils.backend_utils import OperationStatus, OperationResult, get_model_class_by_tablename
from sqlalchemy.inspection import inspect
import json
import inspect
from db.models import *
from sqlalchemy.orm import DeclarativeBase
import pprint
import importlib


def try_create_code(code_symbol: str, code_type: CodeType, code_value: str) -> OperationResult:
    """
    Если код существует то SUCCESS
    """
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
            ["Линки пока отсутствуют", "abc"],
            # Добавьте сюда другие модели
        ]

        return OperationResult(OperationStatus.SUCCESS, data=models_list)

    except Exception as e:
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=f"Неизвестная ошибка: {e}")


def is_valid_foreign_key(table_name, id) -> bool:
    result = get_record_by_id(get_model_class_by_tablename(table_name), id)
    return result.status == OperationStatus.SUCCESS


def replace_fks(operation_result: OperationResult, tablename: str) -> OperationResult:
    print(' ->Сюда зашло')
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
