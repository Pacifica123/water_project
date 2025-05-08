import jwt
import datetime
from db.config import LONG_KEY
from utils.backend_utils import OperationStatus, OperationResult


def auth_validate(token) -> OperationResult:
    errors = []

    if not token:
        errors.append("Токен не предоставлен")
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    try:
        # Декодируем токен
        payload = jwt.decode(token, LONG_KEY, algorithms=['HS256'])
        return OperationResult(status=OperationStatus.SUCCESS, data=payload['username'])
    except jwt.ExpiredSignatureError:
        errors.append("Токен истек")
    except jwt.InvalidTokenError:
        errors.append("Неверный токен")

    if errors:
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, data=errors)

    return OperationResult(status=OperationStatus.SUCCESS)


def generateJWT(username):
    # Устанавливаем время жизни токена (например, 1 час)
    expiration_time = datetime.datetime.utcnow() + datetime.timedelta(hours=8)

    # Создаем payload
    payload = {
        'username': username,
        'exp': expiration_time
    }

    # Генерируем токен
    token = jwt.encode(payload, LONG_KEY, algorithm='HS256')
    return token
