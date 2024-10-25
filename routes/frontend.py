from flask import Blueprint, request, jsonify, g, redirect, render_template, url_for, session, flash
from sqlalchemy.sql.functions import user
from sqlalchemy.testing import db

from data.examples import reference_data, templates, column_translations, unwanted_columns
from db.crudcore import update_record
from routes.backend import add_data_form_surfacewaterwithdrawal, get_all_record_from, convert_to_dict, get_fdata_by_selected, backend_login, \
    edit_or_add_employee, update_record_in, add_new_record, delete_record_from, delete_users, add_to
from utils.backend_chain_validation import validate_data
from utils.backend_utils import print_data_in_func, OperationStatus, extract_value_from_json, \
    get_model_class_by_tablename, get_required_fields
from db.models import  Employees
# from app import reference_data, templates, users


frontend = Blueprint('frontend', __name__)


@frontend.route('/')
def index():
    return redirect(url_for('frontend.login'))


@frontend.route('/login', methods=['GET', 'POST'])
def login():
    print(session)
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        res = backend_login(username, password)
        if res.status == "success":
            # todo : проверку на админа
            # print(res.data)
            session['user'] = res.data
            user_data = session.get('user')
            print(extract_value_from_json(user_data, 'username').data)
            flash('Успешная авторизация', 'success')
            return redirect(url_for('frontend.dashboard'))
        else:
            print(res.message)
            flash(res.message, 'error')
            return redirect(url_for('frontend.login'))
    return render_template('login.html')

@frontend.route('/dashboard')
def dashboard():
    if 'user' in session:
        # todo : провести сюды день заполнения - срок, с бэкенда
        return render_template('dashboard.html')
    return redirect(url_for('frontend.login'))


@frontend.route('/upload', methods=['GET', 'POST'])
def upload():
    if 'user' in session:
        if request.method == 'POST':
            uploaded_file = request.files.get('file')
            if uploaded_file:
                # Обработка файла на сервере (как в предыдущем примере)
                file_info = {
                    'filename': uploaded_file.filename,
                    'size': len(uploaded_file.read()) // 2048,  # размер в KB
                    'mimetype': uploaded_file.mimetype
                }
                uploaded_file.seek(0)  # Возвращаем указатель в начало файла

                # todo: Логика обработки файла (OCR, парсинг и т.д.)
                return render_template('upload.html', file_info=file_info)
        return render_template('upload.html')
    return redirect(url_for('frontend.login'))


@frontend.route('/results')
def results():
    if 'user' in session:
        # Логика получения результатов
        results = {"data": "example result"}
        return render_template('results.html', results=results)
    return redirect(url_for('frontend.login'))


@frontend.route('/edit_results', methods=['GET', 'POST'])
def edit_results():
    if 'user' in session:
        if request.method == 'POST':
            # Логика сохранения изменений
            pass
        # Логика получения данных для редактирования
        data_to_edit = {"data": "example data to edit"}
        return render_template('edit_results.html', data=data_to_edit)
    return redirect(url_for('frontend.login'))


@frontend.route('/edit_reference', methods=['GET', 'POST'])
def edit_reference():
    if 'user' in session:
        selected_reference = None
        new_content = []
        required_fields = []

        if request.method == 'POST':
            selected_reference = request.form.get('reference_select')
            if selected_reference:
                entity_class = get_model_class_by_tablename(selected_reference)

                # Получаем записи из базы данных
                records = get_all_record_from(selected_reference).data

                new_content = []
                for record in records:
                    record_dict = convert_to_dict(record)
                    for column in unwanted_columns:
                        record_dict.pop(column, None)
                    new_content.append(record_dict)

                required_fields = get_required_fields(entity_class)

                if 'record_id' in request.form:
                    # Обработка редактирования записи
                    record_id = request.form.get('record_id')
                    record_data = request.form.get('record_data')
                    try:
                        record_data = validate_data(selected_reference, record_data)
                    except Exception as e:
                        return render_template(
                            'edit_reference.html',
                            references=reference_data,
                            selected_reference=selected_reference,
                            new_content=new_content,
                            column_translations=column_translations,
                            unwanted_columns=unwanted_columns
                        )
                    update_record_in(selected_reference, record_id, record_data)
                    flash('Запись успешно обновлена!', 'success')

                elif 'delete_id' in request.form:
                    # Обработка удаления записи
                    delete_id = request.form.get('delete_id')
                    delete_record_from(selected_reference, delete_id)
                    flash('Запись успешно удалена!', 'success')

        return render_template(
            'edit_reference.html',

            references=reference_data,
            selected_reference=selected_reference,
            new_content=new_content,
            required_fields=required_fields,
            column_translations=column_translations,
            unwanted_columns=unwanted_columns
        )

    return redirect(url_for('frontend.login'))


@frontend.route('/update_record', methods=['POST'])
def update_record():
    try:
        tablename = request.form.get('reference_select')
        record_id = request.form.get('record_id')

        # Получаем все данные формы (все поля)
        record_data = {key: value for key, value in request.form.items() if
                       key not in ['reference_select', 'record_id']}

        if 'is_deleted' not in record_id:
            record_data['is_deleted'] = False

        if tablename == "codes":
            record_data['code_type'] = record_data.get('code_type', 'hydrographic_unit_code')

        result = update_record_in(tablename, record_id, record_data)

        if result.status == OperationStatus.SUCCESS:
            flash('Запись успешно обновлена!', 'success')
        else:
            flash(f'{result.status} : {result.message}', 'error')
    except Exception as e:
        flash(f'Произошла ошибка: {str(e)}', 'error')

    return redirect(url_for('frontend.edit_reference'))

@frontend.route('/add_record', methods=['POST'])
def add_record():
    try:
        tablename = request.form.get('reference_select')
        # Получаем данные из формы
        record_data = {key: value for key, value in request.form.items() if key != 'reference_select'}

        if 'is_deleted' not in tablename:
            record_data['is_deleted'] = False

        if tablename == "codes":
            record_data['code_type'] = record_data.get('code_type', 'hydrographic_unit_code')

        # Добавляем новую запись в таблицу
        result = add_to(tablename, record_data)

        if result.status == OperationStatus.SUCCESS:
            flash('Запись успешно добавлена!', 'success')
        else:
            flash(f'{result.status} : {result.message}', 'error')
    except Exception as e:
        flash(f'Произошла ошибка: {str(e)}', 'error')

    return redirect(url_for('frontend.edit_reference'))

@frontend.route('/delete_record', methods=['POST'])
def delete_record():
    try:
        tablename = request.form.get('reference_select')
        record_id = request.form.get('delete_id')

        result = delete_record_from(tablename, record_id)
        if result.status == OperationStatus.SUCCESS:
            flash('Запись успешно удалена.', 'success')
        else:
            flash(f'{result.status} : {result.message}', 'error')
    except Exception as e:
        flash(f'Произошла ошибка: {str(e)}', 'error')

    return redirect(url_for('frontend.edit_reference'))



@frontend.route('/report')
def report():
    return render_template('report.html')


@frontend.route('/logout')
def logout():
    session.pop('user', None)  # Удалить пользователя из сессии
    return redirect(url_for('frontend.login'))  # Перенаправить на страницу входа


@frontend.route('/add_data', methods=['GET', 'POST'])
def add_data():
    selected_template = request.args.get('template', '')
    other_data = get_fdata_by_selected(selected_template).data
    if request.method == 'POST':
        data = {field: request.form[field] for field in templates[selected_template]}
        print_data_in_func(data, '@frontend.route:/add_data')
        res = add_to(selected_template, data)
        if res.status == OperationStatus.SUCCESS:
            flash('Данные успешно отправлены!', 'success')
        else:
            flash(f'Ошибка: {res.data}', 'error')
        return redirect(url_for('frontend.add_data', template=selected_template))
    return render_template('add_data.html', templates=templates, selected_template=selected_template, other_data=other_data)


@frontend.route('/users', methods=['GET'])
def list_users():
    # Получаем список сотрудников из таблицы 'employees'
    result = get_all_record_from("employees")
    if result.status == OperationStatus.SUCCESS:
        employees = result.data
    else:
        employees = []

    # Передаем данные в шаблон
    return render_template('user_list.html', employees=employees)


@frontend.route('/delete_user/<int:user_id>', methods=['GET'])
def delete_user(user_id):
    try:
        # Убедитесь, что user_id валиден и существует
        result = delete_record_from('employees', user_id)
        print(user_id)
        if result.status == OperationStatus.SUCCESS:
            flash('Пользователь успешно удален.', 'success')
        else:
            flash(f'{result.status} : {result.message} \n {result.data}', 'error')
    except Exception as e:
        flash(f'Произошла ошибка: {str(e)}', 'error')
    return redirect(url_for('frontend.list_users'))


@frontend.route('/users/add', methods=['GET', 'POST'])
@frontend.route('/users/edit/<int:user_id>', methods=['GET', 'POST'])
def save_user(user_id=None):
    user = None

    # Если редактирование, получаем данные пользователя из БД
    if user_id:
        result = get_all_record_from("employees")
        if result.status == OperationStatus.SUCCESS:
            employees = result.data
            user = next((u for u in employees if u.id == user_id), None)

    if request.method == 'POST':
        user_data = {
            'id': user_id if user_id else None,  # Если редактирование, используем существующий ID
            'last_name': request.form['last_name'],
            'first_name': request.form['first_name'],
            'middle_name': request.form['middle_name'],
            'birth_date': request.form['birth_date'],
            'username': request.form.get('username'),
            'password': request.form['password'],
            'email': request.form['email'],
            'is_admin': 'is_admin' in request.form,
            'is_deleted':False
        }

        # Используем функцию edit_or_add_employee для добавления или редактирования пользователя
        result = edit_or_add_employee(user_data)

        if result.status == OperationStatus.SUCCESS:
            return redirect(url_for('frontend.list_users'))
        else:
            flash(result.message, 'error')

    return render_template('user_form.html', user=user)
