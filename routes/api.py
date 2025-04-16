from flask import Blueprint, request, jsonify, session, send_file
from io import BytesIO
# from sqlalchemy.sql.functions import user
# from sqlalchemy.testing import db

# from data.examples import reference_data, templates, column_translations,
from db.crudcore import update_record, get_all_by_foreign_key, get_record_by_id
from routes.backend import *;
from utils.backend_chain_validation import validate_data
from utils.backend_utils import print_data_in_func, OperationStatus, extract_value_from_json, \
    get_model_class_by_tablename, convert_to_dict, get_required_fields, serialize_to_json_old, clear_fields, print_entity_data
from db.models import Organisations
# import jwt
# import datetime
# from db.config import LONG_KEY
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
            print_operation_result(org, 'get_record_by_id')
            # token = "blablabla"+username+"test"

            return jsonify({
                    "token": token,
                    "user": clear_fields(serialize_to_json_old(res.data), ["password"]),
                    "org": serialize_to_json_old(org.data)
                    }), 200
        else:
            print_operation_result(org, 'get_record_by_id')
            return jsonify({
                    "token": token,
                    "user": clear_fields(serialize_to_json_old(res.data), ["password"]),
                    }), 200
    else:
        print_operation_result(res, 'backend_login')
        return jsonify({'status': 'error', 'message': res.message}), 401


@api.route('/api/records/<tablename>', methods=['POST'])
def rest_add_record(tablename):
    record_data = request.json  # Получаем данные как JSON
    result = add_to(tablename, record_data)
    print_operation_result(result, 'add_to')
    resdata = []
    if result.data:
        resdata = result.data
    if result.status == OperationStatus.SUCCESS:
        return jsonify({'status': 'success', 'message': 'Запись успешно добавлена.', 'data': resdata}), 201
    else:
        return jsonify({'status': 'error', 'message': result.message}), 400


@api.route('/api/records/<tablename>/<record_id>', methods=['PUT'])
def rest_update_record(tablename, record_id):
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    if auth_res.status != "success":
        return jsonify({"error": "Пользователь неавторизован"}), 401

    try:
        record_id = int(record_id)
        record_data = request.json
        if 'is_deleted' not in record_data:
            record_data['is_deleted'] = False

        result = update_record_in(tablename, record_id, record_data)
        print_operation_result(result, 'update_record_in')
        if result.status == OperationStatus.SUCCESS:
            return jsonify({'status': 'success', 'message': 'Запись успешно обновлена.'}), 200
        else:
            return jsonify({'status': 'error', 'message': result.message}), 400
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Неверный формат ID записи.'}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/api/records/<tablename>/<record_id>', methods=['DELETE'])
def rest_del_record(tablename, record_id):
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    if auth_res.status != "success":
        return jsonify({"error": "Пользователь неавторизован"}), 401

    try:
        record_id = int(record_id)
        result = delete_record_from(tablename, record_id)
        print_operation_result(result, 'delete_record_from')
        if result.status == OperationStatus.SUCCESS:
            return jsonify({'status': 'success', 'message': 'Запись успешно удалена.'}), 200
        else:
            return jsonify({'status': 'error', 'message': result.message}), 400
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Неверный формат ID записи.'}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@api.route('/api/get_struct', methods=['GET'])
def rest_get():
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    print_operation_result(auth_res, 'auth_validate')
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data }), 401
    struct_name = request.args.get('struct_name')
    filter_k = request.args.get('filter_k')
    filter_v = request.args.get('filter_v')
    if struct_name == "allModels" or "nof" in struct_name or "schema" in struct_name or "enum" in struct_name:
        # Фильтр не обязателен
        pass
    else:
        if not filter_k or not filter_v:
            return jsonify({"success": False, "error": "Необходимо передать filter_k и filter_v"}), 400
    print(" --> struct is : {struct_name}")
    res = get_structs(struct_name, filter_k, filter_v)
    print_operation_result(res, 'get_structs')
    if res.status != OperationStatus.SUCCESS:
        return jsonify({"error": res.message, "message": res.data})
    return jsonify({"status": res.status, 'message': res.message, 'data': res.data}), 200


@api.route('/api/get_struct_mf', methods=['GET'])
def rest_get_mf():
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    # print_operation_result(auth_res, 'auth_validate')
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data }), 401

    struct_name = request.args.get('struct_name')
    filters = {}

    # Получаем все фильтры из запроса
    for key, value in request.args.items():
        if key not in ['struct_name', 'tokenJWTAuthorization']:
            filters[key] = value

    # Проверяем, что переданы необходимые фильтры
    if struct_name is None:
        return jsonify({"success": False, "error": "Необходимо передать struct_name"}), 400

    print(f" --> struct is : {struct_name}")

    # Вызываем функцию с фильтрами
    res = get_structs_mf(struct_name, filters)
    print_operation_result(res, 'get_structs_mf на выходе в /api/get_struct_')

    if res.status != OperationStatus.SUCCESS:
        return jsonify({"error": res.message, "message": res.data})

    if struct_name in ["log_details", "organisations_familiar"]:
        return jsonify({"status": res.status, 'message': res.message, 'data': res.data}), 200

    return jsonify({"status": res.status, 'message': res.message, 'data': process_enums(res.data, True)}), 200


@api.route('/api/edit_reference', methods=['GET', 'POST'], strict_slashes=False)
def rest_edit_reference():
    print("Текущий токен:", request.headers.get('tokenJWTAuthorization'))
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    print_operation_result(auth_res, 'auth_validate')
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data }), 401

    if request.method == 'GET':
        selected_reference = request.args.get('reference_select')

        print("Выбранный объект: ", selected_reference)
        if not selected_reference:
            return jsonify({"error": "Не выбран справочник"}), 400

        is_need_json_f = True
        # if selected_reference == "wcl_category" or selected_reference == "water_consumption_log":
        #     is_need_json_f = True

        try:
            records = get_all_record_from(selected_reference).data
            print_operation_result(get_all_record_from(selected_reference), 'get_all_record_from')
            new_content = [convert_to_dict(record) for record in records]
            pprint.pprint(records)

        except Exception as e:
            print(f"сработал экспешн в edit_reference {e}")
            return jsonify({"error": str(e)}), 500

        return jsonify({
            "selected_reference": selected_reference,
            "new_content": process_enums(new_content, is_need_json_f),
        }), 200

    elif request.method == 'POST':
        try:
            data = request.json
            selected_reference = data.get('reference_select')
            if not selected_reference:
                return jsonify({"error": "Не выбран справочник"}), 400

            if 'record_id' in data:
                record_id = data['record_id']
                record_data = data['record_data']
                record_data = validate_data(selected_reference, record_data)
                result = update_record_in(selected_reference, record_id, record_data)
                print_operation_result(result, 'update_record_in')
                return jsonify({"message": "Запись успешно изменена"}), 200

            elif 'delete_id' in data:
                delete_id = data['delete_id']
                result = delete_record_from(selected_reference, delete_id)
                print_operation_result(result, 'delete_record_from')
                return jsonify({"message": "Запись помечена удаленной"}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid method"}), 405


@api.route('/api/get_single_with_mf', methods=['GET'], strict_slashes=False)
def rest_get_single_with_mf():
    print("Текущий токен:", request.headers.get('tokenJWTAuthorization'))
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    print_operation_result(auth_res, 'auth_validate')
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data }), 401

    selected_reference = request.args.get('reference_select')
    if not selected_reference:
        return jsonify({"error": "Не выбран справочник"}), 400

    filters = {}
    for key, value in request.args.items():
        if key != 'reference_select':
            filters[key] = value

    print("Выбранные фильтры:", filters)

    try:
        result = get_single_with_mf(selected_reference, filters)
        print_operation_result(result, 'get_single_with_mf')

        if result.status != OperationStatus.SUCCESS:
            return jsonify({"error": result.message}), 500

        is_need_json_f = True
        new_content = process_enums(result.data, is_need_json_f)

        return jsonify({
            "selected_reference": selected_reference,
            "new_content": new_content,
        }), 200

    except Exception as e:
        print(f"сработал экспешн в get_single_with_mf {e}")
        return jsonify({"error": str(e)}), 500


@api.route('/api/send_form', methods=['POST'])
def send_to():
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    print_operation_result(auth_res, 'auth_validate')
    if auth_res.status != "success":
        return jsonify({"error": "Пользователь неавторизован"}), 401

    try:
        data = request.json
        pprint.pprint(data)

        selected_form = data.get('send_form')
        print(selected_form)
        res = form_processing_to_entity(selected_form, data)
        print_operation_result(res, "form_processing_to_entity")
        if res.status != OperationStatus.SUCCESS:
            return jsonify({"error": str(res.message)}), 500
        return jsonify("успешно"), 200

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


#  ---------- File Routers ----------


@api.route('/api/upload_file', methods=['POST'])
def upload_file():
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data}), 401

    if 'file' not in request.files:
        return jsonify({"error": "Файл не передан"}), 400

    file = request.files['file']
    filename = file.filename
    file_bytes = file.read()
    mimetype = file.mimetype

    # Получаем дополнительные параметры из формы или query params
    entity_type = request.form.get('entity_type') or request.args.get('entity_type')
    entity_id = request.form.get('entity_id') or request.args.get('entity_id')
    file_type_str = request.form.get('file_type') or request.args.get('file_type')
    description = request.form.get('description') or request.args.get('description')

    if not entity_type or not entity_id or not file_type_str:
        return jsonify({"error": "Не переданы обязательные параметры: entity_type, entity_id, file_type"}), 400

    try:
        entity_id = int(entity_id)
    except ValueError:
        return jsonify({"error": "entity_id должен быть числом"}), 400

    # Преобразуем file_type из строки в enum
    try:
        file_type = FileType(file_type_str)
    except ValueError:
        return jsonify({"error": f"Неверный file_type: {file_type_str}"}), 400

    # TODO: получить user из токена или контекста
    created_by = auth_res.data.get('user_id', 'auto') if isinstance(auth_res.data, dict) else 'auto'

    res = save_file_to_db_or_fs(
        filename=filename,
        file_bytes=file_bytes,
        file_type=file_type,
        mimetype=mimetype,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        created_by=created_by
    )

    if res.status != OperationStatus.SUCCESS:
        return jsonify({"error": res.message}), 500

    return jsonify({"status": res.status, "message": res.message}), 200


@api.route('/api/download_file', methods=['GET'])
def download_file():
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data}), 401

    file_id = request.args.get('file_id')
    if not file_id:
        return jsonify({"error": "Не передан file_id"}), 400

    try:
        file_id = int(file_id)
    except ValueError:
        return jsonify({"error": "file_id должен быть числом"}), 400

    res = get_file_by_id(file_id)
    if res.status != OperationStatus.SUCCESS:
        return jsonify({"error": res.message}), 404

    file_data = res.data
    return send_file(
        BytesIO(file_data['content']),
        attachment_filename=file_data['filename'],
        mimetype=file_data['mimetype'],
        as_attachment=True
    )


@api.route('/api/file_info', methods=['GET'])
def get_file_info():
    print("===== get_file_info CALLED =====")
    token = request.headers.get('tokenJWTAuthorization')
    auth_res = auth_validate(token)
    if auth_res.status != OperationStatus.SUCCESS:
        return jsonify({"error": "Пользователь неавторизован", "message": auth_res.data}), 401

    entity_type = request.args.get('entity_type')
    entity_id = request.args.get('entity_id')
    file_type = request.args.get('file_type')

    if not entity_type or not entity_id or not file_type:
        return jsonify({"error": "Не переданы обязательные параметры: entity_type, entity_id, file_type"}), 400
    print("Params:", {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "file_type": file_type
    })
    try:
        entity_id = int(entity_id)
    except ValueError:
        return jsonify({"error": "entity_id должен быть числом"}), 400

    files_res = get_files(
        entity_type=entity_type,
        entity_id=entity_id,
        file_type=file_type
    )

    if files_res.status != OperationStatus.SUCCESS:
        print_operation_result(files_res, "@api.route(/api/file_info")
        return jsonify({"error": "Ошибка при получении файлов", "message": files_res.data}), 500

    files = files_res.data

    if not files:
        return jsonify({"error": "Файлы не найдены"}), 404

    warning = None
    if len(files) == 1:
        file_info = files[0]
    else:
        # Несколько файлов — берем самый новый по created_at
        files_sorted = sorted(files, key=lambda f: f['created_at'], reverse=True)
        file_info = files_sorted[0]
        warning = "Найдено несколько файлов, возвращён самый новый. Возможна ошибка."

    response = {
        "file_id": file_info["id"],
        "file_url": f"http://127.0.0.1:5000/api/download_file?file_id={file_info['id']}"
    }

    if warning:
        response["warning"] = warning

    return jsonify(response), 200
