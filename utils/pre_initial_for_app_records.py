from flask import g

from db.models import Codes, Employees


def init_records(session):
    init_hydrograph_unit_recods(session)
    init_test_user(session)
    ...


def init_hydrograph_unit_recods(session):
    data = [
        {'13.01.01': 'Бия и Катунь'},
        {'13.01.02': 'Обь до впадения Чулыма (без Томи)'},
        {'13.01.03': 'Томь'},
        {'13.01.04': 'Чулым'},
        {'13.01.05': 'Обь на участке от Чулыма до Кети'},
        {'13.01.06': 'Кеть'},
        {'13.01.07': 'Обь на участке от Кети до Васюгана'},
        {'13.01.08': 'Васюган'},
        {'13.01.09': 'Обь на участке от Васюгана до Ваха'},
        {'13.01.10': 'Вах'},
        {'13.01.11': 'Обь ниже Ваха до впадения Иртыша'},
    ]
    for unit in data:
        # Извлекаем ключ и значение из словаря
        for code_symbol, code_value in unit.items():
            # Проверяем, существует ли уже запись с таким code_symbol
            existing_code = session.query(Codes).filter_by(code_symbol=code_symbol).first()
            if existing_code is None:
                # Создаем новый объект Codes и сохраняем его в базе данных
                new_code = Codes(
                    code_symbol=code_symbol,
                    code_value=code_value,
                    code_type='hydrographic_unit_code'
                )
                new_code.save(session)  # Сохраняем запись в сессии
            else:
                print(f"Запись с code_symbol {code_symbol} уже существует. Пропускаем.")


def init_test_user(session):
    emp = Employees(
        last_name='test',
        first_name='test',
        birth_date='12.12.2012',
        username='test',
        email='test@test.test',
        password='123',
        is_admin=True
    )
    existing_code = session.query(Employees).filter_by(username=emp.username).first()
    if existing_code is None:
        emp.save(session)

