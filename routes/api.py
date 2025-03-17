from flask import Blueprint, request, jsonify, session, g, redirect, render_template, url_for, session, flash
from sqlalchemy.sql.functions import user
from sqlalchemy.testing import db

from data.examples import reference_data, templates, column_translations, unwanted_columns
from db.crudcore import update_record, get_all_by_foreign_key, get_record_by_id
from routes.backend import (
    get_all_record_from, get_fdata_by_selected, backend_login,
    edit_or_add_employee, update_record_in, delete_record_from,
    delete_users, add_to, form_processing_to_entity, get_structs,
    check_login
    )
from utils.backend_chain_validation import validate_data
from utils.backend_utils import print_data_in_func, OperationStatus, extract_value_from_json, \
    get_model_class_by_tablename, convert_to_dict, get_required_fields, serialize_to_json_old, clear_fields, print_entity_data
from db.models import  User, Organisations
import jwt
import datetime
from db.config import LONG_KEY
from utils.validators.auth_validation import generateJWT, auth_validate
import pprint

api = Blueprint('api', __name__)


@api.route('/api/login', methods=['POST'])
def rest_login():
    data = request.json  # Принимаем JSON
    username = data.get('username')
    password = data.get('password')
    res = backend_login(username, password)

    if res.status == "success":
        session['user'] = serialize_to_json_old(res.data)
        session.modified = True
        token = generateJWT(username)

        org = get_record_by_id(Organisations, res.data.organisation_id)
        if org.status == "success":
            # token = "blablabla"+username+"test"

            return jsonify({
                    "token": token,
                    "user": clear_fields(serialize_to_json_old(res.data), ["password"]),
                    "org": serialize_to_json_old(org.data)
                    }), 200
        else:
            return jsonify({
                    "token": token,
                    "user": clear_fields(serialize_to_json_old(res.data), ["password"]),
                    }), 200
        # session['user'] = res.data
        # return jsonify({'status': 'success', 'message': 'Успешная авторизация', 'user': res.data}), 200
    else:
        return jsonify({'status': 'error', 'message': res.message}), 401



@api.route('/api/records/<tablename>', methods=['POST'])
def rest_add_record(tablename):
    record_data = request.json  # Получаем данные как JSON
    result = add_to(tablename, record_data)
    if result.status == OperationStatus.SUCCESS:
        return jsonify({'status': 'success', 'message': 'Запись успешно добавлена.'}), 201
    else:
        return jsonify({'status': 'error', 'message': result.message}), 400

@api.route('/api/get_struct', methods = ['GET'])
def rest_get():
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    print(auth_res.status)
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data }), 401
    struct_name = request.args.get('struct_name')
    filter_k = request.args.get('filter_k')
    filter_v = request.args.get('filter_v')
    if not filter_k or not filter_v:
        return jsonify({"success": False, "error": "Необходимо передать filter_k и filter_v"}), 400
    print(" --> struct is : {struct_name}")
    res = get_structs(struct_name, filter_k, filter_v)
    if res.status != OperationStatus.SUCCESS:
        return jsonify({"error": res.message, "message": res.data})
    return jsonify({"status": res.status, 'message': res.message, 'data': res.data}), 200


@api.route('/api/edit_reference', methods=['GET', 'POST'], strict_slashes=False)
def rest_edit_reference():
    print("Текущий токен:", request.headers.get('tokenJWTAuthorization'))  #
    # if 'user' not in session:
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    print(auth_res.status)
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data }), 401

    if request.method == 'GET':
        selected_reference = request.args.get('reference_select')

        print("Выбранный объект: ", selected_reference)
        if not selected_reference:
            return jsonify({"error": "Не выбран справочник"}), 400

        # Получение информации о модели и данных
        try:
            entity_class = get_model_class_by_tablename(selected_reference)
            records = get_all_record_from(selected_reference).data
            # new_content = [convert_to_dict(record) for record in records]
            # required_fields = get_required_fields(entity_class)
            pprint.pprint(records)
            print("-->сюда дошло")
        except Exception as e:
            print("сработал экспешн в edit_reference")
            return jsonify({"error": str(e)}), 500

        return jsonify({
            "selected_reference": selected_reference,
            "new_content": records,
            # "required_fields": required_fields
        }), 200

    elif request.method == 'POST':
        try:
            data = request.json
            selected_reference = data.get('reference_select')
            if not selected_reference:
                return jsonify({"error": "Не выбран справочник"}), 400

            # Обработка редактирования или удаления
            if 'record_id' in data:
                record_id = data['record_id']
                record_data = data['record_data']
                record_data = validate_data(selected_reference, record_data)
                update_record_in(selected_reference, record_id, record_data)
                return jsonify({"message": "Запись успешно изменена"}), 200

            elif 'delete_id' in data:
                delete_id = data['delete_id']
                delete_record_from(selected_reference, delete_id)
                return jsonify({"message": "Запись помечена удаленной"}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid method"}), 405


# @api.route('/api/update_record', methods=['POST'])
# def rest_update_record():
#     token = request.headers.get('tokenJWTAuthorization')
#     auth_res = auth_validate(token)
#     if auth_res.status != "success" :
#         return jsonify({"error": "Пользователь неавторизован"}), 401
#
#     try:
#         data = request.json
#         tablename = data.get('reference_select')
#         record_id = data.get('record_id')
#
#         if not tablename or not record_id:
#             return jsonify({"error": "Missing required parameters"}), 400
#
#         # Сбор всех данных для обновления
#         record_data = {key: value for key, value in data.items() if key not in ['reference_select', 'record_id']}
#
#         if 'is_deleted' not in record_data:
#             record_data['is_deleted'] = False
#
#         if tablename == "codes":
#             record_data['code_type'] = record_data.get('code_type', 'hydrographic_unit_code')
#
#         result = update_record_in(tablename, record_id, record_data)
#         if result.status == OperationStatus.SUCCESS:
#             return jsonify({"message": "Record updated successfully"}), 200
#         else:
#             return jsonify({"error": f"{result.status}: {result.message}"}), 400
#
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


@api.route('/api/send_form', methods=['POST'])
def send_to():
    # Получаем токен из заголовков
    token = request.headers.get('tokenJWTAuthorization')

    # Проверяем авторизацию
    auth_res = auth_validate(token)
    if auth_res.status != "success":
        return jsonify({"error": "Пользователь неавторизован"}), 401
    # if !check_login()  ....а как? у нас же просто токен

    try:
        # Получаем данные из запроса
        data = request.json
        pprint.pprint(data)

        selected_form = data.get('send_form')
        print(selected_form)
        res = form_processing_to_entity(selected_form, data)
        if res.status != OperationStatus.SUCCESS:
            return jsonify({"error": str(res.message)}), 500
        return jsonify("успешно"), 200;


    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
