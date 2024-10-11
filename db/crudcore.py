import datetime
from typing import Optional, List, Type, Any

import sqlalchemy
from flask import g
from sqlalchemy import Date, DateTime, func
from sqlalchemy.exc import NoResultFound, SQLAlchemyError, IntegrityError

from db.models import Employees
from utils.backend_utils import OperationResult, OperationStatus, print_data_in_func, get_required_fields, \
    get_model_class_by_tablename


# СЕКЦИЯ CREATE
# - - - - - - - - - - - - - - - - - - - -
def create_record_entity(entity_class, data: dict) -> bool:
    """
    Создает запись в базе данных для указанной сущности.

    :param session: Сессия SQLAlchemy для работы с базой данных.
    :param entity_class: Класс сущности, в которую будет добавлена запись.
    :param data: Словарь с данными для создания записи.
    :return: True, если запись успешно создана, иначе False.
    """
    session = g.session
    try:
        # Создаем экземпляр сущности с переданными данными
        record = entity_class(**data)
        session.add(record)  # Добавляем запись в сессию
        session.commit()  # Сохраняем изменения в базе данных
        return True
    except IntegrityError:
        session.rollback()  # Откатываем изменения в случае ошибки
        print(f"Ошибка: запись с данными {data} уже существует.")
        return False
    except Exception as e:
        session.rollback()  # Откатываем изменения в случае любой другой ошибки
        print(f"Ошибка при создании записи: {e}")
        return False


def create_user(user_data) -> bool:
    """
    :return: True/False - прошла ли операция успешно
    """
    try:
        Employees(
            last_name=user_data.get('last_name'),
            first_name=user_data.get('first_name'),
            middle_name=user_data.get('middle_name'),
            birth_date=user_data.get('birth_date'),
            username=user_data.get('username'),
            email=user_data.get('email'),
            password=user_data.get('password'),
            is_admin=user_data.get('is_admin'),
            created=func.now()
        ).save(g.session)
        return True
    except Exception as e:
        print(f' ---> ОШИБКА БД: {e}')
        return False


# - - - - - - - - - - - - - - - - - - - -
# СЕКЦИЯ READ
# - - - - - - - - - - - - - - - - - - - -
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


def read_all_employees() -> List[Employees]:
    try:
        employees = g.session.query(Employees).all()
        return employees
    except Exception as e:
        print(f' ---> ОШИБКА БД: {e}')
        return []


def find_employee_by_id(user_id: int) -> Optional[Employees]:
    try:
        employee = g.session.query(Employees).filter(Employees.id == user_id).one()
        return employee
    except NoResultFound:
        return None
    except Exception as e:
        print(f'\n ---> ОШИБКА БД: {e}\n')
        return None


def find_employee_by_email(email: str) -> Optional[Employees]:
    try:
        employee = g.session.query(Employees).filter(Employees.login == email).one()
        return employee
    except NoResultFound:
        return None
    except Exception as e:
        print(f'\n ---> ОШИБКА БД: {e}\n')
        return None


def find_employee_by_username(username: str) -> Optional[Employees]:
    try:
        employee = g.session.query(Employees).filter(
            Employees.username == username,
            Employees.is_deleted == False
        ).one()
        return employee
    except NoResultFound:
        return None
    except Exception as e:
        print(f'\n ---> ОШИБКА БД: {e}\n')
        return None


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

        # Проверка обязательных полей
        if required_fields:
            for field in required_fields:
                if field not in data:
                    return OperationResult(
                        status=OperationStatus.DATABASE_ERROR,
                        msg=f"Недостаточно данных для обновления. Отсутствует обязательное поле: {field}."
                    )

        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)
            else:
                print(
                    f'\n ---> ПРЕДУПРЕЖДЕНИЕ: поле {key} было проигнорировано, т.к. отсутствует в сущности {entity_class.__name__}\n')

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
def soft_delete_record(entity_class, record_id) -> OperationResult:
    """
    Универсальная функция для безопасного удаления записи из базы данных.

    :param entity_class: Класс сущности, которую нужно удалить.
    :param record_id: Идентификатор записи, которую нужно удалить.
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
        except sqlalchemy.exc.SQLAlchemyError as e:
            # Обрабатываем другие исключения SQLAlchemy, если они возникнут
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg=f"Произошла ошибка при проверке связанных записей: {str(e)}"
            )

        # Установка флага is_deleted в True
        record.is_deleted = True
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
