import datetime
from typing import Optional, List, Type, Any, Dict

import sqlalchemy
from flask import g
from sqlalchemy import Date, DateTime, func
from sqlalchemy.exc import NoResultFound, SQLAlchemyError, IntegrityError

from db.models import User, UserRoles, History
from utils.backend_utils import OperationResult, OperationStatus, print_data_in_func, get_required_fields, \
    get_model_class_by_tablename

from sqlalchemy import Enum


# СЕКЦИЯ CREATE
# - - - - - - - - - - - - - - - - - - - -
def create_record_entity(entity_class, data: dict) -> bool:
    """
    Создает запись в базе данных для указанной сущности.

    :param entity_class: Класс сущности, в которую будет добавлена запись.
    :param data: Словарь с данными для создания записи.
    :return: True, если запись успешно создана, иначе False.
    """
    session = g.session
    try:

        for column in entity_class.__table__.columns:
            if isinstance(column.type, Enum):
                enum_class = column.type.enum_class
                enum_value = data.get(column.name)
                if enum_value:
                    enum_key = [e.name for e in enum_class if e.value == enum_value]
                    if enum_key:
                        data[column.name] = enum_key[0]

        # Извлечение значения created_by из data или оставляем по умолчанию
        created_by = data.get('created_by', "auto")

        # Установка текущей даты для created_at, если оно пустое или отсутствует
        created_at = data.get('created_at')
        if not created_at or created_at == '':
            created_at = datetime.datetime.utcnow()  # Используем UTC для избежания проблем с часовыми поясами

        # Исключаем поля, которые не должны быть заполнены при добавлении
        exclude_fields = ['updated_at', 'updated_by', 'deleted_at', 'deleted_by']
        record_data = {k: v for k, v in data.items() if k not in exclude_fields}
        # Добавляем обязательные поля
        record_data['created_by'] = created_by
        record_data['created_at'] = created_at
        record = entity_class(**record_data)

        session.add(record)
        session.commit()

        return True
    except IntegrityError:
        session.rollback()  # Откатываем изменения в случае ошибки
        print(f"Ошибка: запись с данными {data} уже существует.")
        return False
    except Exception as e:
        session.rollback()  # Откатываем изменения в случае любой другой ошибки
        print(f"Ошибка при создании записи: {e}")
        return False
# def create_record_entity(entity_class, data: dict) -> bool:
#     """
#     Создает запись в базе данных для указанной сущности.
#
#     :param session: Сессия SQLAlchemy для работы с базой данных.
#     :param entity_class: Класс сущности, в которую будет добавлена запись.
#     :param data: Словарь с данными для создания записи.
#     :return: True, если запись успешно создана, иначе False.
#     """
#     session = g.session
#     try:
#         # Создаем экземпляр сущности с переданными данными
#         record = entity_class(**data)
#         session.add(record)  # Добавляем запись в сессию
#         session.commit()  # Сохраняем изменения в базе данных
#         return True
#     except IntegrityError:
#         session.rollback()  # Откатываем изменения в случае ошибки
#         print(f"Ошибка: запись с данными {data} уже существует.")
#         return False
#     except Exception as e:
#         session.rollback()  # Откатываем изменения в случае любой другой ошибки
#         print(f"Ошибка при создании записи: {e}")
#         return False


def create_user(user_data) -> bool:
    """
    :return: True/False - прошла ли операция успешно
    """
    try:
        # Извлечение роли из входных данных, с установкой значения по умолчанию
        role = user_data.get('role', UserRoles.EMPLOYEE)  # Установим роль по умолчанию на EMPLOYEE

        # Создание нового пользователя
        new_user = User(
            last_name=user_data.get('last_name'),
            first_name=user_data.get('first_name'),
            middle_name=user_data.get('middle_name'),
            birth_date=user_data.get('birth_date'),
            username=user_data.get('username'),
            email=user_data.get('email'),
            password=user_data.get('password'),
            role=role,
            created=func.now()
        )

        # Сохранение пользователя в базе данных
        new_user.save(g.session)
        return True
    except Exception as e:
        print(f' ---> ОШИБКА БД: {e}')
        return False


def create_records_entities(records: List[Any]) -> OperationResult:
    """
    Создает несколько записей в базе данных для указанных сущностей.

    :param records: Список экземпляров моделей для добавления в базу данных.
    :return: OperationResult с результатом операции.
    """
    if not records:
        return OperationResult(
            status=OperationStatus.INVALID_REQUEST,
            msg="Список записей пуст."
        )

    # Определяем тип модели по первому элементу в списке
    entity_class = type(records[0])

    session = g.session
    try:
        # Добавляем все записи в сессию
        session.add_all(records)
        session.commit()

        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg=f"Записи успешно добавлены для модели {entity_class.__name__}."
        )
    except IntegrityError:
        session.rollback()  # Откатываем изменения в случае ошибки
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Ошибка: записи с такими данными уже существуют для модели {entity_class.__name__}."
        )
    except Exception as e:
        session.rollback()  # Откатываем изменения в случае любой другой ошибки
        print(f"Ошибка при добавлении записей: {e}")
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg=f"Произошла ошибка при добавлении записей для модели {entity_class.__name__}."
        )


# - - - - - - - - - - - - - - - - - - - -
# СЕКЦИЯ READ
# - - - - - - - - - - - - - - - - - - - -
def get_last_record_id(entity_class):
    """Получает id последней созданной записи в таблице."""
    session = g.session
    last_record = session.query(entity_class).order_by(entity_class.id.desc()).first()
    return last_record.id if last_record else None


def get_record_by_id(entity: Type[Any], id) -> OperationResult:
    """
    Получение записи из указанной таблицы по идентификатору.

    :param entity: Класс модели SQLAlchemy, соответствующий таблице.
    :param id: Ищем только по стандартному primary_key int.
    :return: OperationResult с найденной записью или сообщением об ошибке.
    """
    print_data_in_func(entity, "get_record_by_id")
    try:
        record = g.session.query(entity).filter_by(id=id, is_deleted=False).one()
        return OperationResult(
            status=OperationStatus.SUCCESS,
            data=record
        )
    except NoResultFound:
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Запись с идентификатором {id} не найдена в {entity}."
        )
    except SQLAlchemyError as e:
        print(f' ---> ОШИБКА БД: {e}')
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Произошла ошибка при работе с БД."
        )
    except Exception as e:
        print(f' ---> НЕОЖИДАННАЯ ОШИБКА: {e}')
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Произошла неожиданная ошибка, не связанная с БД."
        )


def get_all_from_table(entity: Type[Any]) -> OperationResult:
    """
    Универсальная реализация получения всех записей из указанной таблицы.

    :param entity: Класс модели SQLAlchemy, соответствующий таблице.
    :return: OperationResult с записями из таблицы или сообщением об ошибке.
    """
    print_data_in_func(entity, "get_all_from_table")
    try:
        records = g.session.query(entity).filter_by(is_deleted=False).all()
        return OperationResult(
            status=OperationStatus.SUCCESS,
            data=records
        )
    except NoResultFound:
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Не найдено ни одной записи в {entity} ."
        )
    except SQLAlchemyError as e:
        if isinstance(e, NoResultFound):
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg=f"Сущность {entity} не найдена в БД."
            )
        else:
            print(f' ---> ОШИБКА БД: {e}')
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg="Произошла ошибка при работе с БД."
            )
    except Exception as e:
        print(f' ---> НЕОЖИДАННАЯ ОШИБКА: {e}')
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Произошла неожиданная ошибка, не связанная с БД."
        )


def read_all_employees() -> List[User]:
    try:
        employees = g.session.query(User).all()
        return employees
    except Exception as e:
        print(f' ---> ОШИБКА БД: {e}')
        return []


def find_employee_by_id(user_id: int) -> Optional[User]:
    try:
        employee = g.session.query(User).filter(User.id == user_id).one()
        return employee
    except NoResultFound:
        return None
    except Exception as e:
        print(f'\n ---> ОШИБКА БД: {e}\n')
        return None


def find_employee_by_email(email: str) -> Optional[User]:
    try:
        employee = g.session.query(User).filter(User.login == email).one()
        return employee
    except NoResultFound:
        return None
    except Exception as e:
        print(f'\n ---> ОШИБКА БД: {e}\n')
        return None


def find_employee_by_username(username: str) -> Optional[User]:
    try:
        employee = g.session.query(User).filter(
            User.username == username,
            User.is_deleted == False
        ).one()
        return employee
    except NoResultFound:
        return None
    except Exception as e:
        print(f'\n ---> ОШИБКА БД: {e}\n')
        return None


def get_all_by_foreign_key(entity: Type[Any], foreign_key_column: str, foreign_key_id: any) -> OperationResult:
    """
    Получение всех записей из указанной таблицы по значению внешнего ключа.

    :param entity: Класс модели SQLAlchemy, соответствующий таблице.
    :param foreign_key_id: Значение внешнего ключа для фильтрации записей.
    :param foreign_key_column: Имя столбца внешнего ключа в модели.
    :return: OperationResult с записями из таблицы или сообщением об ошибке.
    """
    print_data_in_func(entity, "get_all_by_foreign_key")
    try:
        # Формируем фильтр для запроса по внешнему ключу
        filter_condition = getattr(entity, foreign_key_column) == foreign_key_id
        records = g.session.query(entity).filter(filter_condition, entity.is_deleted == False).all()

        return OperationResult(
            status=OperationStatus.SUCCESS,
            data=records
        )
    except NoResultFound:
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Не найдено ни одной записи в {entity} по внешнему ключу {foreign_key_column} = {foreign_key_id}."
        )
    except SQLAlchemyError as e:
        print(f' ---> ОШИБКА БД: {e}')
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Произошла ошибка при работе с БД."
        )
    except Exception as e:
        print(f' ---> НЕОЖИДАННАЯ ОШИБКА: {e}')
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Произошла неожиданная ошибка, не связанная с БД."
        )


def get_all_by_conditions(
    entity: Type[Any],
    conditions: List[Dict[str, Any]],
    is_deleted: bool = False
) -> OperationResult:
    """
    Получение всех записей из указанной таблицы по списку условий.

    :param entity: Класс модели SQLAlchemy, соответствующий таблице.
    :param conditions: Список словарей, где каждый словарь содержит имя столбца и значение для фильтрации.
    :param is_deleted: Флаг, указывающий, следует ли учитывать удаленные записи. По умолчанию False.
    :return: OperationResult с записями из таблицы или сообщением об ошибке.
    """
    print_data_in_func(entity, "get_all_by_conditions")

    try:
        # Формируем фильтр для запроса по условиям
        filter_conditions = []
        if 'column' in conditions[0]:
            for condition in conditions:
                column_name = condition['column']
                value = condition['value']

                # Проверяем, что столбец существует в модели
                if not hasattr(entity, column_name):
                    return OperationResult(
                        status=OperationStatus.INVALID_REQUEST,
                        msg=f"Столбец '{column_name}' не найден в модели {entity.__name__}."
                    )

                filter_conditions.append(getattr(entity, column_name) == value)
        else:
            # Если ключи — имена столбцов
            for condition in conditions:
                for column_name, value in condition.items():
                    filter_conditions.append(getattr(entity, column_name) == value)

        # Добавляем условие для удаленных записей
        if not is_deleted:
            filter_conditions.append(entity.is_deleted == False)

        # Используем функцию all() для объединения условий по логическому И
        records = g.session.query(entity).filter(*filter_conditions).all()

        return OperationResult(
            status=OperationStatus.SUCCESS,
            data=records
        )
    except NoResultFound:
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Не найдено ни одной записи в {entity} по заданным условиям."
        )
    except SQLAlchemyError as e:
        print(f' ---> ОШИБКА БД: {e}')
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Произошла ошибка при работе с БД."
        )
    except Exception as e:
        print(f' ---> НЕОЖИДАННАЯ ОШИБКА: {e}')
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Произошла неожиданная ошибка, не связанная с БД."
        )


# - - - - - - - - - - - - - - - - - - - -
# СЕКЦИЯ UPDATE
# - - - - - - - - - - - - - - - - - - - -
def update_record(entity_class, record_id, data: dict, required_fields: list = None) -> OperationResult:
    """
    Универсальная функция для обновления записи в базе данных.

    :param entity_class: Класс сущности, которому принадлежит запись.
    :param record_id: Идентификатор записи, которую нужно обновить.
    :param data: Словарь с новыми данными для обновления записи.
    :param required_fields: Список обязательных полей для обновления.
    :return: OperationResult с обновленной записью или сообщением об ошибке.
    """
    try:
        record = g.session.query(entity_class).get(record_id)
        if record is None:
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg=f"Запись с ID {record_id} не найдена в таблице {entity_class.__name__}."
            )

        for column in entity_class.__table__.columns:
            if isinstance(column.type, Enum):
                enum_class = column.type.enum_class
                enum_value = data.get(column.name)
                if enum_value:
                    enum_key = [e.name for e in enum_class if e.value == enum_value]
                    if enum_key:
                        data[column.name] = enum_key[0]

        # Исключаем поля, которые не должны быть заполнены при добавлении
        exclude_fields = ['deleted_at', 'deleted_by']
        record_data = {k: v for k, v in data.items() if k not in exclude_fields}



        # Проверка обязательных полей
        if required_fields:
            for field in required_fields:
                if field not in record_data:
                    return OperationResult(
                        status=OperationStatus.DATABASE_ERROR,
                        msg=f"Недостаточно данных для обновления. Отсутствует обязательное поле: {field}."
                    )

        # Извлечение updated_by и установка текущего времени для updated_at
        updated_by = record_data.get('updated_by')  # Получаем значение updated_by из данных
        current_time = func.now()  # Текущее время

        for key, value in record_data.items():
            if hasattr(record, key):
                setattr(record, key, value)
            else:
                print(
                    f'\n ---> ПРЕДУПРЕЖДЕНИЕ: поле {key} было проигнорировано, т.к. отсутствует в сущности {entity_class.__name__}\n')

        # Устанавливаем updated_by и updated_at
        if updated_by is not None:
            record.updated_by = updated_by  # Устанавливаем ответственного за изменение
        record.updated_at = current_time  # Устанавливаем текущее время

        g.session.commit()
        return OperationResult(
            status=OperationStatus.SUCCESS,
            data=record
        )
    except SQLAlchemyError as e:
        g.session.rollback()
        print(f' ---> ОШИБКА БД: {e}')
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Произошла ошибка при обновлении записи в БД."
        )
    except Exception as e:
        g.session.rollback()
        print(f' ---> НЕОЖИДАННАЯ ОШИБКА: {e}')
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Произошла неожиданная ошибка при обновлении записи."
        )


def update_employee(username: str, data: dict) -> OperationResult:
    """
    Обновление информации о сотруднике.
    Лишние параметры будут проигнорированы в print лог.
    Недостающие параметры вызовут исключение.
    Псевдонимы параметров заносить под именами сущности. (email=login)

    :param username: Имя пользователя сотрудника, которого нужно обновить.
    :param data: Словарь с новыми данными для обновления записи.
    :return: OperationResult с результатом операции.
    """
    res = OperationResult(status=OperationStatus.UNDEFINE_ERROR)

    # Поиск сотрудника по имени пользователя
    employee = find_employee_by_username(username)
    if employee is None:
        res.status = OperationStatus.DATABASE_ERROR
        res.msg = f"Сотрудник с именем пользователя '{username}' не найден."
        return res

    # Получаем класс сущности Employees
    cls = get_model_class_by_tablename('employees')
    # Извлечение обязательных полей для данной сущности
    required_fields = get_required_fields(cls)
    # Удаляем поле id из данных, если оно присутствует
    data.pop('id', None)

    res = update_record(cls, employee.id, data, required_fields)

    # Логируем статус операции
    print_data_in_func(res.status, "update_employee")
    return res


# - - - - - - - - - - - - - - - - - - - -
# СЕКЦИЯ DELETE
# - - - - - - - - - - - - - - - - - - - -
def soft_delete_record(entity_class, record_id, deleted_by=None) -> OperationResult:
    """
    Универсальная функция для безопасного удаления записи из базы данных.

    :param entity_class: Класс сущности, которую нужно удалить.
    :param record_id: Идентификатор записи, которую нужно удалить.
    :param deleted_by: Идентификатор пользователя, который удаляет запись.
    :return: OperationResult с результатом операции.
    """
    try:
        record = g.session.query(entity_class).get(record_id)
        if record is None:
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg=f"Запись с ID {record_id} не найдена в таблице {entity_class.__name__}."
            )

        try:
            # Пытаемся выполнить запрос, проверяя наличие связанных записей
            related_records = g.session.query(entity_class).filter(
                getattr(entity_class, 'foreign_key_field') == record_id
            ).first()

            if related_records:
                return OperationResult(
                    status=OperationStatus.DATABASE_ERROR,
                    msg=f"Невозможно удалить запись с ID {record_id}, так как она связана с другими записями."
                )
        except AttributeError:
            # Если атрибут 'foreign_key_field' не существует, просто пропускаем
            pass
        except SQLAlchemyError as e:
            # Обрабатываем другие исключения SQLAlchemy, если они возникнут
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg=f"Произошла ошибка при проверке связанных записей: {str(e)}"
            )

        # Установка флага is_deleted в True и других полей
        record.is_deleted = True
        record.deleted_at = func.now()  # Устанавливаем текущее время для deleted_at
        if deleted_by is not None:
            record.deleted_by = deleted_by  # Устанавливаем пользователя, который удаляет запись

        g.session.commit()
        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg=f"Запись с ID {record_id} успешно удалена."
        )
    except SQLAlchemyError as e:
        g.session.rollback()
        print(f' ---> ОШИБКА БД: {e}')
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg="Произошла ошибка при удалении записи в БД."
        )
    except Exception as e:
        g.session.rollback()
        print(f' ---> НЕОЖИДАННАЯ ОШИБКА: {e}')
        return OperationResult(
            status=OperationStatus.UNDEFINE_ERROR,
            msg="Произошла неожиданная ошибка при удалении записи."
        )
