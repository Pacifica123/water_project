from flask import flash

from utils.backend_utils import OperationResult, OperationStatus, print_operation_result
from utils.validators.employees_validation import employee_validate
from utils.validators.models_validators import codes_validate, concentrates_validate, device_brand_validate, \
    organisation_validate, permissions_validate, standarts_validate, substances_validate, \
    surface_water_withdrawal_validate, sampling_location_validate, water_area_validate, water_body_validate, \
    water_consumption_log_validate, water_point_validate, water_pool_validate, water_treatment_validate, \
    chemical_analysis_protocol_validate, devices_validate


def validate_data(context: str, data):
    res = OperationResult(status=OperationStatus.SUCCESS, data=data)

    # Словарь, связывающий контексты с валидаторами
    validators = {
        'employee': employee_validate,
        'codes': codes_validate,
        'concentrates': concentrates_validate,
        'device_brand': device_brand_validate,
        'organisation': organisation_validate,
        'permissions': permissions_validate,
        'standarts': standarts_validate,
        'substances': substances_validate,
        'surface_water_withdrawal': surface_water_withdrawal_validate,
        'sampling_location': sampling_location_validate,
        'water_area': water_area_validate,
        'water_body': water_body_validate,
        'water_consumption_log': water_consumption_log_validate,
        'water_point': water_point_validate,
        'water_pool': water_pool_validate,
        'water_treatment': water_treatment_validate,
        'chemical_analysis_protocol': chemical_analysis_protocol_validate,
        'devices': devices_validate
    }

    # Флаг для отслеживания наличия валидаторов
    has_validators = False

    # Проходим по всем контекстам и вызываем соответствующие валидаторы
    for key, validator in validators.items():
        if key in context:
            res = validator(data)
            has_validators = True

    # Если ни один валидатор не сработал, выводим сообщение
    if not has_validators:
        print('Для данного контекста нет валидаторов')

    print_operation_result(res)

    if res.status != OperationStatus.SUCCESS:
        flash(f"{res.data}", "error")
        return None  # стопаем

    return res.data


