import io
import json
import pytest
import requests
import pandas as pd

BASE_URL = "http://127.0.0.1:5000"  # Адрес вашего Flask сервера


def test_json_to_excel_success():
    payload = {
        "status": "success",
        "message": "Тестовые данные",
        "data": [
            {"id": 1, "name": "Alice", "age": 30},
            {"id": 2, "name": "Bob", "age": 25}
        ]
    }

    response = requests.post(f"{BASE_URL}/api/json_to_excel", json=payload)
    assert response.status_code == 200, f"Ожидается 200, получено {response.status_code}"
    assert response.headers['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    # Проверяем, что файл не пустой
    content = response.content
    assert len(content) > 100, "Полученный Excel файл слишком маленький"

    # Загружаем Excel из байтов для проверки содержимого
    excel_io = io.BytesIO(content)
    df = pd.read_excel(excel_io)

    # Проверяем, что в Excel есть нужные колонки
    expected_columns = {"id", "name", "age"}
    assert expected_columns.issubset(set(df.columns)), f"В Excel отсутствуют колонки {expected_columns}"

    # Проверяем, что данные совпадают
    assert df.loc[0, "name"] == "Alice"
    assert df.loc[1, "age"] == 25


def test_json_to_excel_error_status():
    payload = {
        "status": "db_error",
        "message": "Ошибка базы данных",
        "data": {"foo": "bar"}
    }
    response = requests.post(f"{BASE_URL}/api/json_to_excel", json=payload)
    assert response.status_code == 400
    resp_json = response.json()
    assert "error" in resp_json
    assert resp_json["error"] == "Ошибка базы данных"


def test_json_to_excel_no_data():
    payload = {
        "status": "success",
        "message": "Нет данных",
        "data": None
    }
    response = requests.post(f"{BASE_URL}/api/json_to_excel", json=payload)
    assert response.status_code == 400
    resp_json = response.json()
    assert resp_json["error"] == "Отсутствуют данные для конвертации"


def test_json_to_excel_invalid_json():
    # Отправляем невалидный JSON (например, строку вместо объекта)
    response = requests.post(f"{BASE_URL}/api/json_to_excel", data="not a json")
    assert response.status_code == 400 or response.status_code == 500


if __name__ == "__main__":
    pytest.main([__file__])
