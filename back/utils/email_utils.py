import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import current_app
from flask_mail import Message


def send_credentials_email2(to_email: str, username: str, password: str) -> bool:
    from app import mail
    # Собираем текст письма
    body = (
        "Здравствуйте!\n\n"
        "Ваша организация была зарегистрирована в системе.\n\n"
        f"Логин: {username}\n"
        f"Временный пароль: {password}\n\n"
        "Пожалуйста, войдите в систему и измените пароль.\n\n"
        "С уважением,\n"
        "Служба поддержки"
    )

    msg = Message(
        subject="Данные для входа в систему",
        recipients=[to_email],
        body=body
    )

    try:
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error("Ошибка отправки письма Flask-Mail: %s", e)
        return False
