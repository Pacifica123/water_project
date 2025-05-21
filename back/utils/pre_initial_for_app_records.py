from db.models import (
    Codes, User, UserRoles, WaterPoolRef,
    WaterAreaRef, WaterPoint, WaterObjectRef,
    CodeType, Organisations, MetersBrandRef, Meters,
    Permissions, PermissionType, PointPermissionLink,
    SamplingLocation
    )
from datetime import date, timedelta


def init_records(session):
    init_hydrograph_unit_recods(session)
    init_organisation_test(session)  # (не забыть OrgHUCLink) # TODO потом убрать
    init_test_user(session)  # TODO добавить разные роли
    init_water_pool_records(session)
    init_water_area_records(session)

    init_water_object_records(session)  #(по  пулам и ариям)
    init_sampling_locations(session)
    init_meters_and_brand(session)
    # init_permissions(session)     # TODO потом убрать


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
                    code_type=CodeType.HYDROGRAPHIC_UNIT_CODE
                )
                new_code.save(session)  # Сохраняем запись в сессии
            # else:
            #     print(f"Запись с code_symbol {code_symbol} уже существует. Пропускаем.")


def init_test_user(session):
    # Данные для инициализации пользователей
    users_data = [
        {
            "last_name": "Админ",
            "first_name": "Админ",
            "birth_date": "12.12.2012",
            "username": "admin",
            "email": "admin@test.test",
            "password": "123",
            "role": UserRoles.ADMIN
        },
        {
            "last_name": "Артамонов",
            "first_name": "Владимир",
            "birth_date": "01.01.1990",
            "username": "orgadmin",
            "email": "orgadmin@test.test",
            "password": "123",
            "role": UserRoles.ORG_ADMIN
        },
        {
            "last_name": "Сидоров",
            "first_name": "Олег",
            "birth_date": "02.02.1990",
            "username": "report_admin",
            "email": "report_admin@test.test",
            "password": "123",
            "role": UserRoles.REPORT_ADMIN
        },
        {
            "last_name": "ОАО",
            "first_name": "СКЭК",
            "birth_date": "03.03.1990",
            "username": "employee3",
            "email": "csc@skek.ru",
            "password": "123",
            "role": UserRoles.EMPLOYEE,
            "organisation_id": 1  # Принадлежит к первой организации
        },
        {
            "last_name": "ООО",
            "first_name": "ЛКС",
            "birth_date": "04.04.1990",
            "username": "employee4",
            "email": "employee4@test.test",
            "password": "123",
            "role": UserRoles.EMPLOYEE,
            "organisation_id": 2  # Принадлежит ко второй организации
        }
    ]

    for user_data in users_data:
        # Проверяем, существует ли уже пользователь с таким именем
        existing_user = session.query(User).filter_by(username=user_data['username']).first()

        if existing_user is None:
            # Создаем нового пользователя
            new_user = User(
                last_name=user_data['last_name'],
                first_name=user_data['first_name'],
                birth_date=user_data['birth_date'],
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password'],
                role=user_data['role']
            )

            if 'organisation_id' in user_data:
                new_user.organisation_id = user_data['organisation_id']

            new_user.save(session)  # Сохраняем запись в сессии
            print(f"Добавлен новый пользователь: {user_data['username']}.")
        else:
            print(f"Пользователь '{user_data['username']}' уже существует.")


def init_water_pool_records(session):
    data = [
        'Балтийский бассейновый округ',
        'Баренцево-Беломорский бассейновый округ',
        'Двинско-Печорский бассейновый округ',
        'Днепровский бассейновый округ',
        'Донской бассейновый округ',
        'Кубанский бассейновый округ',
        'Западно-Каспийский бассейновый округ',
        'Верхневолжский бассейновый округ',
        'Окский бассейновый округ',
        'Камский бассейновый округ',
        'Нижневолжский бассейновый округ',
        'Уральский бассейновый округ',
        'Верхнеобский бассейновый округ',
        'Иртышский бассейновый округ',
        'Нижнеобский бассейновый округ',
        'Ангаро-Байкальский бассейновый округ',
        'Енисейский бассейновый округ',
        'Ленский бассейновый округ',
        'Анадыро-Колымский бассейновый округ',
        'Амурский бассейновый округ',
        'Крымский бассейновый округ'
    ]

    for pool_name in data:
        # Проверяем, существует ли уже запись с таким названием
        existing_pool = session.query(WaterPoolRef).filter_by(pool_name=pool_name).first()

        if existing_pool is None:
            # Создаем новый объект WaterPool и сохраняем его в базе данных
            new_pool = WaterPoolRef(
                pool_name=pool_name
            )
            new_pool.save(session)  # Сохраняем запись в сессии
            print(f"Добавлен новый бассейн: {pool_name}")
        # else:
        #     print(f"Запись с названием '{pool_name}' уже существует. Пропускаем.")

def init_water_area_records(session):
    data = {
        '13.01.01.001': 'Бассейн озера Телецкое',
        '13.01.01.002': 'Бия',
        '13.01.01.003': 'Катунь',
        '13.01.01.200': 'Бессточная территория между бассейнами рек Обь, Енисей и границей РФ с Монголией',
        '13.01.02.001': 'Верховья реки Алей до Гилёвского гидроузла',
        '13.01.02.002': 'Алей от Гилёвского гидроузла и до устья',
        '13.01.02.003': 'Обь от слияния рек Бия и Катунь до города Барнаул, без реки Алей',
        '13.01.02.004': 'Чумыш',
        '13.01.02.005': 'Обь от города Барнаул до Новосибирского гидроузла, без реки Чумыш',
        '13.01.02.006': 'Иня',
        '13.01.02.007': 'Обь от Новосибирского гидроузла до впадения реки Чулым, без рек Иня и Томь',
        '13.01.03.001': 'Кондома',
        '13.01.03.002': 'Томь от истока до города Новокузнецк, без реки Кондома',
        '13.01.03.003': 'Томь от города Новокузнецк до города Кемерово',
        '13.01.03.004': 'Томь от города Кемерово и до устья',
        '13.01.04.001': 'Чулым от истока до города Ачинск',
        '13.01.04.002': 'Чулым от города Ачинск до водомерного поста в селе Зырянское',
        '13.01.04.003': 'Чулым от водомерного поста в селе Зырянское и до устья',
        '13.01.05.001': 'Обь от впадения реки Чулым до впадения реки Кеть',
        '13.01.06.001': 'Кеть',
        '13.01.07.001': 'Обь от впадения реки Кеть до впадения реки Васюган',
        '13.01.08.001': 'Васюган',
        '13.01.09.001': 'Обь от впадения реки Васюган до впадения реки Вах',
        '13.01.10.001': 'Вах',
        '13.01.11.001': 'Обь от впадения реки Вах до города Нефтеюганск',
        '13.01.11.002': 'Обь от города Нефтеюганск до впадения реки Иртыш',
        '13.02.00.001': 'Бассейн Кучукского озера',
        '13.02.00.002': 'Бассейн Кулундинского озера',
        '13.02.00.003': 'Водные объекты южнее бассейна реки Бурла без бассейнов озёр Кукучевского и Кулундинского',
        '13.02.00.004': 'Бассейн Большого Топольного озера и реки Бурла',
        '13.02.00.005':  'Бассейн озера Чаны и водные объекты до границы с бассейном реки Иртыш',
        '13.02.00.006': 'Водные объекты между бассейнами озера Чаны и реки Омь'
    }

    # Получаем ID водного бассейна "Верхнеобский бассейновый округ"
    water_pool_name = "Верхнеобский бассейновый округ"
    water_pool = session.query(WaterPoolRef).filter_by(pool_name=water_pool_name).first()

    if not water_pool:
        print(f"Ошибка: Водный бассейн '{water_pool_name}' не найден.")
        return

    for code_symbol, area_name in data.items():
        # Проверяем, существует ли уже запись с таким кодом
        existing_code = session.query(Codes).filter_by(code_symbol=code_symbol).first()

        if existing_code is None:
            # Создаем новый объект Codes и сохраняем его в базе данных
            new_code = Codes(
                code_symbol=code_symbol,
                code_value=area_name,
                code_type=CodeType.WATER_AREA_CODE
            )
            new_code.save(session)  # Сохраняем запись в сессии

            # Получаем ID только что созданного кода
            code_id = new_code.id

            # Создаем запись в WaterAreaRef
            new_water_area_ref = WaterAreaRef(
                code_area_id=code_id,
                water_pool_id=water_pool.id
            )
            new_water_area_ref.save(session)  # Сохраняем запись в сессии
            print(f"Добавлен новый участок: {area_name} с кодом {code_symbol}.")

        # else:
        #     print(f"Запись с кодом '{code_symbol}' уже существует, пропускаем.")


# --- 27фев2025 ---

def init_organisation_test(session):
    # Данные для инициализации организаций
    organisations_data = {
        "Северо-Кузбасская Энергетическая компания (СКЭК)": {
            "organisation_name": "Северо-Кузбасская Энергетическая компания (СКЭК)",
            "postal_address": "csc@skek.ru",
            "legal_form": "ОАО",
            "inn": "4205153492",
            "organisation_code": "420501001"
        },
        "Ленинск-Кузнецкие коммунальные системы (ЛКС)": {
            "organisation_name": "Ленинск-Кузнецкие коммунальные системы (ЛКС)",
            "postal_address": "",
            "legal_form": "ООО",
            "inn": "4212040940",
            "organisation_code": "421201001"
        }
    }

    for name, data in organisations_data.items():
        # Проверяем, существует ли уже запись с таким названием организации
        existing_organisation = session.query(Organisations).filter_by(organisation_name=data['organisation_name']).first()

        if existing_organisation is None:
            # Создаем новый объект Codes для ГУИВ-кода
            existing_code = session.query(Codes).filter_by(code_symbol=data['organisation_code'], code_type=CodeType.ORGANISATION_CODE_GUIV).first()

            if existing_code is None:
                new_code = Codes(
                    code_symbol=data['organisation_code'],
                    code_value=data['organisation_name'],
                    code_type=CodeType.ORGANISATION_CODE_GUIV
                )
                new_code.save(session)  # Сохраняем запись в сессии
                code_id = new_code.id
            else:
                code_id = existing_code.id

            # Создаем новую организацию
            new_organisation = Organisations(
                organisation_name=data['organisation_name'],
                postal_address=data['postal_address'],
                legal_form=data['legal_form'],
                inn=data['inn'],
                organization_code=code_id
            )
            new_organisation.save(session)  # Сохраняем запись в сессии
            print(f"Добавлена новая организация: {data['organisation_name']} с кодом {data['organisation_code']}.")
        else:
            print(f"Организация '{data['organisation_name']}' уже существует.")


def init_water_object_records(session):
    # Данные для инициализации водных объектов
    water_objects_data = {
        "Водный объект 1": {
            "code_type_symbol": "Тип1",  # Символ типа водного объекта
            "code_obj_symbol": "Объект1",  # Символ водного объекта
            "water_area_code_symbol": "13.01.01.001"  # Код водохозяйственного участка
        },
        "Водный объект 2": {
            "code_type_symbol": "Тип2",  # Символ типа водного объекта
            "code_obj_symbol": "Объект2",  # Символ водного объекта
            "water_area_code_symbol": "13.01.01.002"  # Код водохозяйственного участка
        }
    }

    for name, data in water_objects_data.items():
        # Создаем или получаем ID типа водного объекта
        code_type = session.query(Codes).filter_by(code_symbol=data['code_type_symbol'], code_type=CodeType.WATER_TYPE_CODE).first()

        if code_type is None:
            # Создаем новый тип водного объекта
            new_code_type = Codes(
                code_symbol=data['code_type_symbol'],
                code_value=data['code_type_symbol'],  # Значение по умолчанию
                code_type=CodeType.WATER_TYPE_CODE
            )
            new_code_type.save(session)  # Сохраняем запись в сессии
            code_type = new_code_type
            print(f"Добавлен новый тип водного объекта: {data['code_type_symbol']}.")

        # Создаем или получаем ID водного объекта
        code_obj = session.query(Codes).filter_by(code_symbol=data['code_obj_symbol'], code_type=CodeType.WATER_OBJ_CODE).first()

        if code_obj is None:
            # Создаем новый водный объект
            new_code_obj = Codes(
                code_symbol=data['code_obj_symbol'],
                code_value=data['code_obj_symbol'],  # Значение по умолчанию
                code_type=CodeType.WATER_OBJ_CODE
            )
            new_code_obj.save(session)  # Сохраняем запись в сессии
            code_obj = new_code_obj
            print(f"Добавлен новый водный объект: {data['code_obj_symbol']}.")

        # Создаем или получаем ID водохозяйственного участка
        water_area_code = session.query(Codes).filter_by(code_symbol=data['water_area_code_symbol'], code_type=CodeType.WATER_AREA_CODE).first()

        if water_area_code is None:
            # Создаем новый водохозяйственный участок
            new_water_area_code = Codes(
                code_symbol=data['water_area_code_symbol'],
                code_value=data['water_area_code_symbol'],  # Значение по умолчанию
                code_type=CodeType.WATER_AREA_CODE
            )
            new_water_area_code.save(session)  # Сохраняем запись в сессии
            water_area_code = new_water_area_code
            print(f"Добавлен новый водохозяйственный участок: {data['water_area_code_symbol']}.")

        water_area_ref = session.query(WaterAreaRef).filter_by(code_area_id=water_area_code.id).first()

        if water_area_ref is None:
            # Получаем ID водного бассейна (например, по умолчанию)
            water_pool = session.query(WaterPoolRef).first()

            if water_pool is None:
                print(f"Ошибка: Водный бассейн не найден.")
                continue

            # Создаем новую запись водохозяйственного участка
            new_water_area_ref = WaterAreaRef(
                code_area_id=water_area_code.id,
                water_pool_id=water_pool.id
            )
            new_water_area_ref.save(session)  # Сохраняем запись в сессии
            water_area_ref = new_water_area_ref
            print(f"Добавлена новая запись водохозяйственного участка: {data['water_area_code_symbol']}.")

        # Проверяем, существует ли уже запись с такими данными
        existing_water_object = session.query(WaterObjectRef).filter_by(code_type_id=code_type.id, code_obj_id=code_obj.id, water_area_id=water_area_ref.id).first()

        if existing_water_object is None:
            # Создаем новую запись для водного объекта
            new_water_object = WaterObjectRef(
                code_type_id=code_type.id,
                code_obj_id=code_obj.id,
                water_area_id=water_area_ref.id
            )
            new_water_object.save(session)  # Сохраняем запись в сессии
            print(f"Добавлен новый водный объект: {name}.")
        else:
            print(f"Водный объект '{name}' уже существует.")


def init_sampling_locations(session):
    # Данные для инициализации мест отбора проб
    sampling_locations_data = {
        "Место отбора 1": {
            "name": "Место отбора 1",
            "latitude_longitude": "52°21′45″ с. ш. 36°13′20″ в. д.",
            "water_obj_name": "Объект1"  # Название водного объекта
        },
        "Место отбора 2": {
            "name": "Место отбора 2",
            "latitude_longitude": "53°21′45″ с. ш. 37°13′20″ в. д.",
            "water_obj_name": "Объект2"  # Название водного объекта
        }
    }

    for name, data in sampling_locations_data.items():
        # Получаем ID водного объекта по его имени
        water_object = session.query(WaterObjectRef).join(Codes, WaterObjectRef.code_obj_id == Codes.id).filter(Codes.code_value == data['water_obj_name']).first()

        if water_object is None:
            print(f"Ошибка: Водный объект '{data['water_obj_name']}' не найден.")
            continue

        # Проверяем, существует ли уже запись с таким названием места отбора проб
        existing_sampling_location = session.query(SamplingLocation).filter_by(name=data['name'], water_obj_id=water_object.id).first()

        if existing_sampling_location is None:
            # Создаем новое место отбора проб
            new_sampling_location = SamplingLocation(
                name=data['name'],
                latitude_longitude=data['latitude_longitude'],
                water_obj_id=water_object.id
            )
            new_sampling_location.save(session)  # Сохраняем запись в сессии
            print(f"Добавлено новое место отбора проб: {name}.")
        else:
            print(f"Место отбора проб '{name}' уже существует.")



def init_meters_and_brand(session):
    # Данные для инициализации марок приборов
    brands_data = {
        "Марка 1": {},
        "Марка 2": {}
    }

    # Создаем марки приборов
    for brand_name in brands_data.keys():
        # Проверяем, существует ли уже запись с такой маркой
        existing_brand = session.query(MetersBrandRef).filter_by(brand_name=brand_name).first()

        if existing_brand is None:
            # Создаем новую марку прибора
            new_brand = MetersBrandRef(
                brand_name=brand_name
            )
            new_brand.save(session)  # Сохраняем запись в сессии
            print(f"Добавлена новая марка прибора: {brand_name}.")
        else:
            print(f"Марка прибора '{brand_name}' уже существует.")

    # Данные для инициализации приборов учета
    meters_data = {
        "Прибор 1": {
            "organisation_name": "Организация 1",  # Название организации
            "brand_name": "Марка 1",  # Название марки прибора
            "serial_number": "1234567890",
            "verification_date": date(2022, 1, 1),  # Дата поверки
            "verification_interval": 5  # Интервал поверки в годах
        },
        "Прибор 2": {
            "organisation_name": "Организация 2",  # Название организации
            "brand_name": "Марка 2",  # Название марки прибора
            "serial_number": "9876543210",
            "verification_date": date(2023, 6, 1),  # Дата поверки
            "verification_interval": 3  # Интервал поверки в годах
        }
    }

    for meter_name, data in meters_data.items():
        # Получаем ID организации
        organisation = session.query(Organisations).filter_by(organisation_name=data['organisation_name']).first()

        if organisation is None:
            print(f"Ошибка: Организация '{data['organisation_name']}' не найдена.")
            continue

        # Получаем ID марки прибора
        brand = session.query(MetersBrandRef).filter_by(brand_name=data['brand_name']).first()

        if brand is None:
            print(f"Ошибка: Марка прибора '{data['brand_name']}' не найдена.")
            continue

        # Рассчитываем дату следующей поверки
        next_verification_date = data['verification_date'] + timedelta(days=data['verification_interval'] * 365)

        # Проверяем, существует ли уже запись с таким серийным номером
        existing_meter = session.query(Meters).filter_by(serial_number=data['serial_number']).first()

        if existing_meter is None:
            # Создаем новый прибор учета
            new_meter = Meters(
                organisation_id=organisation.id,
                brand_id=brand.id,
                serial_number=data['serial_number'],
                verification_date=data['verification_date'],
                verification_interval=data['verification_interval'],
                next_verification_date=next_verification_date
            )
            new_meter.save(session)  # Сохраняем запись в сессии
            print(f"Добавлен новый прибор учета: {meter_name}.")
        else:
            print(f"Прибор учета '{meter_name}' уже существует.")


def init_permissions(session):
    # Данные для инициализации разрешений
    permissions_data = {
        "Северо-Кузбасская Энергетическая компания (СКЭК)": {
            "organisation_name": "Северо-Кузбасская Энергетическая компания (СКЭК)",
            "organisation_address": "Адрес организации 1",
            "organisation_legal_form": "ООО",
            "organisation_inn": "4205153492",  # ИНН организации
            "permission_number": "420501001",
            "registration_date": date(2022, 1, 1),  # Дата регистрации
            "expiration_date": date(2026, 1, 1),  # Дата истечения срока действия
            "permission_type": PermissionType.WATER_WITHDRAWAL,  # Тип разрешения
            "allowed_volume_org": 3000.0,  # Допустимый объем для организации
            "allowed_volume_pop": 1000.0,  # Допустимый объем для населения (если применимо)
            "point_type": PermissionType.WATER_WITHDRAWAL,  # Тип точки
            "point_name": "Точка забора 1",  # Название точки
            "point_coordinates": "52°21′45″ с. ш. 36°13′20″ в. д.",  # Координаты точки
            "water_body_name": "Объект1"  # Название водного объекта
        },
        "Разрешение 2": {
            "organisation_name": "Организация 2",  # Название организации
            "organisation_address": "Адрес организации 2",  # Адрес организации
            "organisation_legal_form": "ЗАО",  # Юридическая форма организации
            "organisation_inn": "987654321098",  # ИНН организации
            "permission_number": "9876543210",
            "registration_date": date(2023, 6, 1),  # Дата регистрации
            "expiration_date": date(2026, 6, 1),  # Дата истечения срока действия
            "permission_type": PermissionType.DISCHARGE,  # Тип разрешения
            "allowed_volume_org": 4500.0,  # Допустимый объем для организации
            "allowed_volume_pop": 1000.0,  # Допустимый объем для населения (если применимо)
            "point_type": PermissionType.DISCHARGE,  # Тип точки
            "point_name": "Точка сброса 1",  # Название точки
            "point_coordinates": "53°21′45″ с. ш. 37°13′20″ в. д.",  # Координаты точки
            "water_body_name": "Объект2"  # Название водного объекта
        }
    }

    for permission_name, data in permissions_data.items():
        # Создаем или получаем ID организации
        organisation = session.query(Organisations).filter_by(organisation_name=data['organisation_name']).first()

        if organisation is None:
            # Создаем новую организацию
            new_organisation = Organisations(
                organisation_name=data['organisation_name'],
                postal_address=data['organisation_address'],
                legal_form=data['organisation_legal_form'],
                inn=data['organisation_inn']
            )
            new_organisation.save(session)  # Сохраняем запись в сессии
            organisation = new_organisation
            print(f"Добавлена новая организация: {data['organisation_name']}.")

        # Проверяем, существует ли уже запись с таким номером разрешения
        existing_permission = session.query(Permissions).filter_by(permission_number=data['permission_number']).first()

        if existing_permission is None:
            # Создаем новое разрешение
            new_permission = Permissions(
                organisation_id=organisation.id,
                permission_number=data['permission_number'],
                registration_date=data['registration_date'],
                expiration_date=data['expiration_date'],
                permission_type=data['permission_type'],
                allowed_volume_org=data['allowed_volume_org'],
                allowed_volume_pop=data['allowed_volume_pop']
            )
            new_permission.save(session)  # Сохраняем запись в сессии
            print(f"Добавлено новое разрешение: {permission_name}.")

            # Получаем ID только что созданного разрешения
            permission_id = new_permission.id

            # Получаем или создаем водный объект
            water_body = session.query(WaterObjectRef).join(Codes, WaterObjectRef.code_obj_id == Codes.id).filter(Codes.code_value == data['water_body_name']).first()

            if water_body is None:
                print(f"Ошибка: Водный объект '{data['water_body_name']}' не найден. Создайте его сначала.")
                continue

            # Создаем или получаем точку забора/сброса
            water_point = session.query(WaterPoint).filter_by(organisation_id=organisation.id, point_type=data['point_type']).first()

            if water_point is None:
                # Получаем или создаем прибор учета
                meter = session.query(Meters).filter_by(organisation_id=organisation.id).first()

                if meter is None:
                    print(f"Ошибка: Прибор учета для организации '{organisation.organisation_name}' не найден. Создайте его сначала.")
                    continue

                # Создаем новую точку забора/сброса
                new_water_point = WaterPoint(
                    organisation_id=organisation.id,
                    meter_id=meter.id,
                    water_body_id=water_body.id,
                    latitude_longitude=data['point_coordinates'],
                    point_type=data['point_type']
                )
                new_water_point.save(session)  # Сохраняем запись в сессии
                water_point = new_water_point
                print(f"Добавлена новая точка забора/сброса: {data['point_name']}.")

            # Проверяем, существует ли уже связь между точкой и разрешением
            existing_link = session.query(PointPermissionLink).filter_by(point_id=water_point.id, permission_id=permission_id).first()

            if existing_link is None:
                # Создаем новую связь между точкой и разрешением
                new_link = PointPermissionLink(
                    point_id=water_point.id,
                    permission_id=permission_id,
                    actual_start_date=data['registration_date'],
                    actual_end_date=data['expiration_date'],
                    active=True
                )
                new_link.save(session)  # Сохраняем запись в сессии
                print(f"Связано разрешение '{permission_name}' с точкой '{data['point_name']}'.")
            else:
                print(f"Связь между разрешением '{permission_name}' и точкой '{data['point_name']}' уже существует.")
        else:
            print(f"Разрешение '{permission_name}' уже существует.")
