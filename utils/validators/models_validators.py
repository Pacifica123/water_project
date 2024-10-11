# todo : матчкейз валидаторов
from datetime import datetime

from db.crudcore import get_all_from_table
from db.models import Codes, DeviceBrand, Organisation, Permissions, Standarts, Substances, SamplingLocation, WaterPool, \
    ChemicalAnalysisProtocol, Devices
from utils.backend_utils import OperationResult, OperationStatus, is_valid_date
from utils.db_utils import is_valid_foreign_key


def codes_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('code_symbol'):
        errors.append("Символ кода обязателен")
    if not data.get('code_value'):
        errors.append("Значение кода обязательно")
    if not data.get('code_type'):
        errors.append("Тип кода обязателен")

    # Проверка на допустимые значения для code_type
    valid_code_types = {
        'type_of_water_body_water_intake',
        'a_water_body_a_water_intake',
        'water_quality_categories',
        'organisation_code_GUIV',
        'hydrographic_unit_code',
        'water_area_code'
    }

    if data['code_type'] not in valid_code_types:
        errors.append("Недопустимый тип кода")

    # Проверка уникальности code_symbol
    finded = get_all_from_table(Codes)
    if finded.status == OperationStatus.SUCCESS:
        codes = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    code_symbols = [code.code_symbol for code in codes]

    if data['code_symbol'] in code_symbols:
        errors.append("Символ кода уже занят")

    # Дополнительные проверки
    if len(data['code_symbol']) > 255:
        errors.append("Символ кода не должен превышать 255 символов")
    if len(data['code_value']) > 255:
        errors.append("Значение кода не должно превышать 255 символов")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def concentrates_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('protocol_id'):
        errors.append("ID протокола обязателен")
    if not data.get('substance_id'):
        errors.append("ID вещества обязателен")
    if data.get('value') is None:
        errors.append("Значение концентрации обязательно")
    if not data.get('text'):
        errors.append("Текст обязателен")

    # Проверка, что value является числом и в допустимом диапазоне
    if isinstance(data['value'], (int, float)) is False:
        errors.append("Значение концентрации должно быть числом")
    elif data['value'] < 0:
        errors.append("Значение концентрации не может быть отрицательным")

    # Проверка на существование протокола и вещества
    if not is_valid_foreign_key('chemical_analysis_protocol', data['protocol_id']):
        errors.append("Протокол с данным ID не существует")
    if not is_valid_foreign_key('substances', data['substance_id']):
        errors.append("Вещество с данным ID не существует")

    # Проверка длины текста
    if len(data['text']) > 255:
        errors.append("Текст не должен превышать 255 символов")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def device_brand_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('brand_name'):
        errors.append("Название бренда обязательно")

    # Проверка длины brand_name
    if len(data['brand_name']) > 255:
        errors.append("Название бренда не должно превышать 255 символов")

    # Проверка уникальности brand_name
    finded = get_all_from_table(DeviceBrand)
    if finded.status == OperationStatus.SUCCESS:
        brands = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    brand_names = [brand.brand_name for brand in brands]

    if data['brand_name'] in brand_names:
        errors.append("Это название бренда уже используется")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def organisation_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('organization_code'):
        errors.append("Код организации обязателен")
    if not data.get('organisation_name'):
        errors.append("Название организации обязательно")
    if not data.get('postal_address'):
        errors.append("Почтовый адрес обязателен")
    if not data.get('legal_form'):
        errors.append("Организационно-правовая форма обязательна")
    if not data.get('inn'):
        errors.append("ИНН обязателен")

    # Проверка длины полей
    if len(data['organization_code']) > 255:
        errors.append("Код организации не должен превышать 255 символов")
    if len(data['organisation_name']) > 255:
        errors.append("Название организации не должно превышать 255 символов")
    if len(data['postal_address']) > 255:
        errors.append("Почтовый адрес не должен превышать 255 символов")
    if len(data['legal_form']) > 100:
        errors.append("Организационно-правовая форма не должна превышать 100 символов")
    if len(data['inn']) != 12 or not data['inn'].isdigit():
        errors.append("ИНН должен содержать 12 цифр")

    # Проверка уникальности organization_code и inn
    finded = get_all_from_table(Organisation)
    if finded.status == OperationStatus.SUCCESS:
        organisations = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    organization_codes = [org.organization_code for org in organisations]
    inns = [org.inn for org in organisations]

    if data['organization_code'] in organization_codes:
        errors.append("Этот код организации уже используется")
    if data['inn'] in inns:
        errors.append("Этот ИНН уже используется")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def permissions_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('organisation_id'):
        errors.append("ID организации обязателен")
    if not data.get('permission_number'):
        errors.append("Номер разрешения обязателен")
    if not data.get('registration_date'):
        errors.append("Дата регистрации обязательна")
    if not data.get('expiration_date'):
        errors.append("Дата истечения срока действия обязательна")
    if not data.get('permission_type'):
        errors.append("Тип разрешения обязателен")
    if data.get('allowed_volume') is None:
        errors.append("Допустимый объем обязателен")

    # Проверка длины permission_number
    if len(data['permission_number']) > 50:
        errors.append("Номер разрешения не должен превышать 50 символов")

    # Проверка корректности дат
    if data['registration_date'] >= data['expiration_date']:
        errors.append("Дата регистрации должна быть раньше даты истечения срока действия")

    # Проверка, что allowed_volume является числом и в допустимом диапазоне
    if isinstance(data['allowed_volume'], (int, float)) is False:
        errors.append("Допустимый объем должен быть числом")
    elif data['allowed_volume'] < 0:
        errors.append("Допустимый объем не может быть отрицательным")

    # Проверка уникальности permission_number
    finded = get_all_from_table(Permissions)
    if finded.status == OperationStatus.SUCCESS:
        permissions = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    permission_numbers = [perm.permission_number for perm in permissions]

    if data['permission_number'] in permission_numbers:
        errors.append("Этот номер разрешения уже используется")

    # Проверка, что организация существует
    if not is_valid_foreign_key('organisation', data['organisation_id']):
        errors.append("Организация с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def standarts_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('substance_id'):
        errors.append("ID вещества обязателен")
    if not data.get('organisation_id'):
        errors.append("ID организации обязателен")
    if data.get('value') is None:
        errors.append("Значение стандарта обязательно")
    if not data.get('document_path'):
        errors.append("Путь к документу обязателен")

    # Проверка, что value является числом и в допустимом диапазоне
    if isinstance(data['value'], (int, float)) is False:
        errors.append("Значение стандарта должно быть числом")
    elif data['value'] < 0:
        errors.append("Значение стандарта не может быть отрицательным")

    # Проверка длины document_path
    if len(data['document_path']) > 255:
        errors.append("Путь к документу не должен превышать 255 символов")

    # Проверка уникальности document_path
    finded = get_all_from_table(Standarts)
    if finded.status == OperationStatus.SUCCESS:
        standards = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    document_paths = [std.document_path for std in standards]

    if data['document_path'] in document_paths:
        errors.append("Этот путь к документу уже используется")

    # Проверка существования вещества и организации
    if not is_valid_foreign_key('substances', data['substance_id']):
        errors.append("Вещество с данным ID не существует")
    if not is_valid_foreign_key('organisation', data['organisation_id']):
        errors.append("Организация с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def substances_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('name'):
        errors.append("Название вещества обязательно")
    if data.get('maximum_permissible_concentration') is None:
        errors.append("Максимально допустимая концентрация обязательна")

    # Проверка длины name
    if len(data['name']) > 255:
        errors.append("Название вещества не должно превышать 255 символов")

    # Проверка, что maximum_permissible_concentration является числом и в допустимом диапазоне
    if isinstance(data['maximum_permissible_concentration'], (int, float)) is False:
        errors.append("Максимально допустимая концентрация должна быть числом")
    elif data['maximum_permissible_concentration'] < 0:
        errors.append("Максимально допустимая концентрация не может быть отрицательной")

    # Проверка уникальности name
    finded = get_all_from_table(Substances)
    if finded.status == OperationStatus.SUCCESS:
        substances = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    substance_names = [substance.name for substance in substances]

    if data['name'] in substance_names:
        errors.append("Это название вещества уже используется")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def surface_water_withdrawal_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('date'):
        errors.append("Дата обязательна")

    # Проверка, что date является корректной датой
    if not is_valid_date(data['date']):
        errors.append("Дата некорректна или из будущего")

    # Проверка значений
    if data.get('actual') is not None:
        if not isinstance(data['actual'], (int, float)):
            errors.append("Фактическое значение должно быть числом")
        elif data['actual'] < 0:
            errors.append("Фактическое значение не может быть отрицательным")

    if data.get('population') is not None:
        if not isinstance(data['population'], (int, float)):
            errors.append("Значение населения должно быть числом")
        elif data['population'] < 0:
            errors.append("Значение населения не может быть отрицательным")

    # Проверка длины поля other
    if data.get('other') and len(data['other']) > 500:
        errors.append("Поле 'другое' не должно превышать 500 символов")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def sampling_location_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('name'):
        errors.append("Название точки отбора проб обязательно")
    if not data.get('latitude_longitude'):
        errors.append("Широта и долгота обязательны")
    if not data.get('water_body_id'):
        errors.append("ID водного объекта обязателен")

    # Проверка длины name и latitude_longitude
    if len(data['name']) > 255:
        errors.append("Название точки отбора проб не должно превышать 255 символов")
    if len(data['latitude_longitude']) > 100:
        errors.append("Длина строки широты и долготы не должна превышать 100 символов")

    # Проверка формата координат
    try:
        latitude, longitude = map(float, data['latitude_longitude'].split(','))
        if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
            errors.append("Некорректные значения широты или долготы")
    except (ValueError, TypeError):
        errors.append("Неверный формат координат (должно быть: широта,долгота)")

    # Проверка уникальности name
    finded = get_all_from_table(SamplingLocation)
    if finded.status == OperationStatus.SUCCESS:
        locations = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    location_names = [loc.name for loc in locations]

    if data['name'] in location_names:
        errors.append("Это название точки отбора проб уже используется")

    # Проверка существования водного объекта
    if not is_valid_foreign_key('water_body', data['water_body_id']):
        errors.append("Водный объект с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def water_area_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('code_area_id'):
        errors.append("ID кода водохозяйственного участка обязателен")
    if not data.get('water_pool_id'):
        errors.append("ID бассейнового округа обязателен")

    # Проверка существования кода водохозяйственного участка
    if not is_valid_foreign_key('codes', data['code_area_id']):
        errors.append("Код водохозяйственного участка с данным ID не существует")

    # Проверка существования бассейнового округа
    if not is_valid_foreign_key('water_pool', data['water_pool_id']):
        errors.append("Бассейновый округ с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def water_body_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('code_type_id'):
        errors.append("ID типа водного объекта обязателен")
    if not data.get('code_body_id'):
        errors.append("ID водного тела обязателен")
    if not data.get('water_area_id'):
        errors.append("ID водохозяйственного участка обязателен")

    # Проверка существования типа водного объекта
    if not is_valid_foreign_key('codes', data['code_type_id']):
        errors.append("Тип водного объекта с данным ID не существует")

    # Проверка существования водного тела
    if not is_valid_foreign_key('codes', data['code_body_id']):
        errors.append("Водное тело с данным ID не существует")

    # Проверка существования водохозяйственного участка
    if not is_valid_foreign_key('water_area', data['water_area_id']):
        errors.append("Водохозяйственный участок с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def water_consumption_log_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('point_id'):
        errors.append("ID точки водозабора обязателен")
    if data.get('consumption_value') is None:
        errors.append("Показания расхода обязательны")

    # Проверка, что consumption_value является числом и в допустимом диапазоне
    if isinstance(data['consumption_value'], (int, float)) is False:
        errors.append("Показания расхода должны быть числом")
    elif data['consumption_value'] < 0:
        errors.append("Показания расхода не могут быть отрицательными")

    # Проверка существования точки водозабора
    if not is_valid_foreign_key('water_point', data['point_id']):
        errors.append("Точка водозабора с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def water_point_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('organisation_id'):
        errors.append("ID организации обязателен")
    if not data.get('water_body_id'):
        errors.append("ID водного объекта обязателен")
    if not data.get('latitude_longitude'):
        errors.append("Широта и долгота обязательны")
    if not data.get('point_type'):
        errors.append("Тип точки обязателен")

    # Проверка формата координат
    try:
        latitude, longitude = map(float, data['latitude_longitude'].split(','))
        if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
            errors.append("Некорректные значения широты или долготы")
    except (ValueError, TypeError):
        errors.append("Неверный формат координат (должно быть: широта,долгота)")

    # Проверка допустимых значений для point_type
    valid_point_types = {'intake', 'discharge'}
    if data['point_type'] not in valid_point_types:
        errors.append("Недопустимый тип точки")

    # Проверка существования организации
    if not is_valid_foreign_key('organisation', data['organisation_id']):
        errors.append("Организация с данным ID не существует")

    # Проверка существования водного объекта
    if not is_valid_foreign_key('water_body', data['water_body_id']):
        errors.append("Водный объект с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def water_pool_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('pool_name'):
        errors.append("Название бассейна обязательно")

    # Проверка длины pool_name
    if len(data['pool_name']) > 255:
        errors.append("Название бассейна не должно превышать 255 символов")

    # Проверка уникальности pool_name
    finded = get_all_from_table(WaterPool)
    if finded.status == OperationStatus.SUCCESS:
        pools = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    pool_names = [pool.pool_name for pool in pools]

    if data['pool_name'] in pool_names:
        errors.append("Это название бассейна уже используется")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def water_treatment_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('name_level'):
        errors.append("Название степени очистки обязательно")

    # Проверка допустимых значений для name_level
    valid_levels = {
        "total",
        "without_cleaning",
        "not_suff_cleaned",
        "standard_without_cleaning",
        "standard_biological",
        "standard_physico_chemical",
        "standard_mechanical"
    }

    if data['name_level'] not in valid_levels:
        errors.append("Недопустимое значение для степени очистки")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def chemical_analysis_protocol_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('protocol_number'):
        errors.append("Номер протокола обязателен")
    if not data.get('protocol_date'):
        errors.append("Дата протокола обязательна")
    if not data.get('pdf_path'):
        errors.append("Путь к PDF файлу обязателен")
    if not data.get('location_id'):
        errors.append("ID точки отбора проб обязателен")

    # Проверка длины protocol_number и pdf_path
    if len(data['protocol_number']) > 50:
        errors.append("Номер протокола не должен превышать 50 символов")
    if len(data['pdf_path']) > 255:
        errors.append("Путь к PDF файлу не должен превышать 255 символов")

    # Проверка корректности даты
    if not is_valid_date(data['protocol_date']):
        errors.append("Дата протокола некорректна или из будущего")

    # Проверка уникальности protocol_number
    finded = get_all_from_table(ChemicalAnalysisProtocol)
    if finded.status == OperationStatus.SUCCESS:
        protocols = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    protocol_numbers = [protocol.protocol_number for protocol in protocols]

    if data['protocol_number'] in protocol_numbers:
        errors.append("Этот номер протокола уже используется")

    # Проверка существования точки отбора проб
    if not is_valid_foreign_key('sampling_location', data['location_id']):
        errors.append("Точка отбора проб с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)


def devices_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('organisation_id'):
        errors.append("ID организации обязателен")
    if not data.get('brand_id'):
        errors.append("ID бренда обязателен")
    if not data.get('serial_number'):
        errors.append("Серийный номер обязателен")
    if not data.get('verification_date'):
        errors.append("Дата проверки обязательна")
    if data.get('verification_interval') is None:
        errors.append("Интервал проверки обязателен")
    if not data.get('next_verification_date'):
        errors.append("Дата следующей проверки обязательна")

    # Проверка длины serial_number
    if len(data['serial_number']) > 50:
        errors.append("Серийный номер не должен превышать 50 символов")

    # Проверка корректности дат
    if not is_valid_date(data['verification_date']):
        errors.append("Дата проверки некорректна или из будущего")

    if not is_valid_date(data['next_verification_date']):
        errors.append("Дата следующей проверки некорректна или из будущего")

    # Проверка уникальности serial_number
    finded = get_all_from_table(Devices)
    if finded.status == OperationStatus.SUCCESS:
        devices = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)

    serial_numbers = [device.serial_number for device in devices]

    if data['serial_number'] in serial_numbers:
        errors.append("Этот серийный номер уже используется")

    # Проверка существования организации
    if not is_valid_foreign_key('organisation', data['organisation_id']):
        errors.append("Организация с данным ID не существует")

    # Проверка существования бренда
    if not is_valid_foreign_key('device_brand', data['brand_id']):
        errors.append("Бренд с данным ID не существует")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS, data=data)