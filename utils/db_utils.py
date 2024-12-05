from db.crudcore import get_record_by_id
from utils.backend_utils import OperationStatus, OperationResult, get_model_class_by_tablename
from sqlalchemy.inspection import inspect

def is_valid_foreign_key(table_name, id) -> bool:
    result = get_record_by_id(get_model_class_by_tablename(table_name), id)
    return result.status == OperationStatus.SUCCESS


def replace_fks(operation_result: OperationResult, tablename: str) -> OperationResult:
    print(' ->Сюда зашло')
    if operation_result.status != OperationStatus.SUCCESS:
        return operation_result

    records = operation_result.data
    if not records:
        return operation_result  # Ничего не заменяем, если записей нет

    # Получаем класс модели из имени таблицы
    model_class = get_model_class_by_tablename(tablename)
    if not model_class:
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
