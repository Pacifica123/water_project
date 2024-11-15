# Пример справочников
reference_data = {
    'Марки приборов': 'meters_brand_ref',
    'Протокол химического анализа': 'chemical_analysis_protocol',
    'Концентраты': 'concentrates',
    'Коды': 'codes',
    # 'История разрешений': 'permission_history',
    'Приборы': 'devices',
    # 'История приборов': 'devices_history',
    'Организации': 'organisations',
    'Разрешения': 'permissions',
    'Связь точек и разрешений': 'point_permission_link',
    'Местоположение забора': 'sampling_location',
    'Нормативы': 'standarts_ref',
    'Вещества': 'substances_ref',
    'Забор поверхностной воды': 'surface_water_withdrawal',
    'Водохозяйственный участок': 'water_area_ref',
    'Водный объект': 'water_object_ref',
    'Журнал водопотребление': 'water_consumption_log',
    'Точки забора/сброса': 'water_point',
    'Водный бассейн': 'water_pool_ref',
    'Степени очистки воды': 'water_treatment'
}

column_translations = {
    'name': 'Название',
    'date': 'Дата',
    'point_type': 'Тип точки',
    'pool_name': 'Название бассейна',
    'name_level': 'Степень очистки',
    'latitude_longitude': 'Широта долгота',
    'code_symbol': 'Кодовый симбол',
    'code_value': 'Значение кода',
    'consumption_value': 'Показания расхода',
    'actual': 'Активный',
    'population': 'Население',
    'maximum_permissible_concentration': 'Максимальная допустимая концентрация',
    'value': 'Значение',
    'actual_start_date': 'Фактическая начальная дата',
    'actual_end_date': 'Фактическая окончательная дата',
    'permission_number': 'Номер разрешения, уникальный для каждой записи',
    'registration_date': 'Дата регистрации разрешения',
    'expiration_date': 'Дата истечения срока действия',
    'permission_type': 'Тип разрешения',
    'allowed_volume': 'Допустимый объем',
    'comment_text': 'комментарий',
    'change_date': 'Дата измнения',
    'hydrographic_unit_code': 'Код географической единицы',
    'inn': 'ИНН',
    'legal_form': 'Организационно-правовая форма',
    'postal_address': 'Почтовый адрес',
    'organisation_name': 'Название организации',
    'organization_code': 'Код организации',
    'brand_name': 'Название марки',
    'serial_number': 'Серийный номер',
    'verification_date': 'Дата проверки',
    'verification_interval': 'Интервал проверки',
    'next_verification_date': 'Следующая дата проверки',
    'text': 'Текст',
    'protocol_number': 'Номер протокола',
    'protocol_date': 'Дата протокола',
    'other': 'Другое'

}

unwanted_columns = {'code_type','created', 'document_path','pdf_path','is_deleted'}


templates = {
    'report_template': ['fact_month1', 'population_month1', 'others_month1', 'fact_month2', 'population_month2', 'others_month2', 'fact_month3', 'population_month3', 'others_month3'],
    'accounting_for_water_consumption': [],
    'Payment_calculation': [],
    'excel_template_3.1': ['name_organisation', 'pool_district_organisation', 'name_hydrographic_unit_organisation',   'water_area_organisation', 'water_area_code_organisation', 'device_brand', 'postal_address',  'text_OPF', 'text_INN', 'text_name_subject', 'registration_date', 'end_data' ],
    'excel_template_3.2': ['postal_address', 'text_OPF', 'text_INN', 'text_name_subject', 'registration_date', 'end_data' ],
}

