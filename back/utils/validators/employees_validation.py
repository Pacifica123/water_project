from db.crudcore import get_all_from_table
from db.models import User
from utils.backend_utils import OperationStatus, OperationResult, is_valid_date, is_valid_email


def employee_validate(data):
    errors = []

    # Проверка обязательных полей
    if not data.get('last_name'):
        errors.append("Фамилия обязательна")
    if not data.get('first_name'):
        errors.append("Имя обязательно")
    if not data.get('username'):
        errors.append("Имя пользователя обязательно")
    if not data.get('email'):
        errors.append("Email обязателен")
    if not data.get('password'):
        errors.append("Пароль обязателен")

    if not is_valid_date(data.get('birth_date')):
        errors.append('Дата не соответствует верному формату')
    if not is_valid_email(data.get('email')):
        errors.append('Введенная почта не соответствует регулярному выражению')

    finded = get_all_from_table(User)
    if finded.status == OperationStatus.SUCCESS:
        employees = finded.data
    else:
        return OperationResult(status=OperationStatus.SUCCESS)
    usernames = [employee.username for employee in employees]
    emails = [employee.email for employee in employees]

    if data['username'] in usernames:
        errors.append("Имя пользователя уже занято")
    if data['email'] in emails:
        errors.append("Этот email уже используется")
    # Дополнительные проверки
    if len(data['password']) < 6:
        errors.append("Пароль должен содержать как минимум 6 символов")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)
    return OperationResult(status=OperationStatus.SUCCESS, data=data)
