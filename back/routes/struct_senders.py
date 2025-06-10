from utils.backend_utils import *
from utils.db_utils import *
from sqlalchemy import inspect, types
from datetime import date, datetime
from db.crudcore import *
from db.models import *
import sys
from typing import Any, List, Optional, Dict, Tuple


def send_payment_calculation(form_data: dict) -> OperationResult:
    org_id = int(form_data.get('org_id'))
    payment = form_data.get('payment')
    parameters = form_data.get('parameters')
    print_data_in_func(parameters, "spc : parameters")
    print_data_in_func(payment, "spc : payment")
    try:
        notification_payload = {
            "type": "paymentform",
            "header": f"Отправлен расчет платы за {form_data['quarter']} квартал",
            "message": "Новый расчет платы получен",
            "quarter": form_data['quarter'],
            # TODO : разрешение, пункт учета, прибор
            "payment": payment,
            "parameters": parameters
        }
        print("        <payload сформирован>")
        # message = json.dumps(notification_payload, ensure_ascii=False)
        message = serialize_to_json(notification_payload)
        print("        <message сформирован>")
        from utils.notify_utils import create_and_send_notification
        return create_and_send_notification("orgadmin", message)
    except Exception as e:
        print("Ошибка при отправке уведомления orgadmin-у:", e)
        return OperationResult(status=OperationStatus.VALIDATION_ERROR, msg="Не удалось отправить уведомление")
    # return OperationResult(status=OperationStatus.SUCCESS, msg="Данные успешно сохранены")
    ...


def parse_f31(
    excel_data: List[List[Any]],
    replace_duplicates: bool = False
) -> OperationResult:
    print("[parse_f31] Начало обработки формы 3.1")
    # 1. Проверка формы
    if not excel_data or not isinstance(excel_data[0], list) or not str(excel_data[0][0]).startswith(
            "Сведения, полученные в результате учета объема забора"):
        print("[parse_f31] Форма 3.1 не найдена")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Не найдена форма 3.1 в переданном файле")
    print("[parse_f31] Форма найдена")

    # 2. Квартал/год → Month
    try:
        quarter = int(excel_data[1][5])
        year = int(excel_data[1][8])
        print(f"[parse_f31] quarter={quarter}, year={year}")
        month_map = {1: Month.MARCH, 2: Month.JUNE, 3: Month.SEPTEMBER, 4: Month.DECEMBER}
        form_month = month_map[quarter]
    except Exception as e:
        print(f"[parse_f31] Ошибка квартал/год: {e}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Неверный формат квартала или года")

    # 3. Поиск по лейблу
    def find_row(substr: str) -> Optional[int]:
        for i, row in enumerate(excel_data):
            if isinstance(row, list):
                for cell in row:
                    if isinstance(cell, str) and substr.lower() in cell.lower():
                        print(f"[parse_f31] Метка '{substr}' найдена в строке {i}")
                        return i
        print(f"[parse_f31] Метка '{substr}' не найдена")
        return None

    # 4. Разбор шапки
    headers = {
        'org_name': 'Наименование - для юридического лица',
        'inn': 'ИНН',
        'pool': 'Бассейновый округ',
        'region': 'Наименование субъекта Российской Федерации',
        'meter_brand': 'Марка прибора водоучета',
        'verif': 'Дата последней поверки'
    }
    parsed: Dict[str, Any] = {}
    for key, lbl in headers.items():
        idx = find_row(lbl)
        if idx is None:
            return OperationResult(OperationStatus.VALIDATION_ERROR,
                                   msg=f"Не найдена метка '{lbl}'")
        row = excel_data[idx]
        try:
            val = next(c for c in row[4:] if c not in (None, ""))
            print(f"[parse_f31] {lbl} = {val}")
        except StopIteration:
            print(f"[parse_f31] Пустое значение для '{lbl}'")
            return OperationResult(OperationStatus.VALIDATION_ERROR,
                                   msg=f"Пустое значение для '{lbl}'")
        parsed[key] = val

    # 5. Разбор блока разрешений
    perm_row = find_row('Реквизиты документа')
    if perm_row is None or perm_row + 1 >= len(excel_data):
        print("[parse_f31] Блок разрешений не найден")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Не найден блок Реквизиты документа")
    vals = excel_data[perm_row + 1]
    try:
        perm_number = next(c for c in vals[4:] if isinstance(c, str) and c.strip())
        def parse_date_cell(x):
            if isinstance(x, (int, float)):
                return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(x))
            return datetime.datetime.strptime(str(x), "%m/%d/%Y").date()
        perm_reg_date = parse_date_cell(vals[12])
        perm_end_date = parse_date_cell(vals[14])
        print(f"[parse_f31] perm_number={perm_number}, reg={perm_reg_date}, end={perm_end_date}")
    except Exception as e:
        print(f"[parse_f31] Ошибка разрешений: {e}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Неверный формат блока разрешений")

    # 6. Типы шапки
    try:
        org_inn = int(parsed['inn'])
        meter_brand = str(parsed['meter_brand'])
        verif_raw = parsed['verif']
        if isinstance(verif_raw, (int, float)):
            verif_date = datetime.date(1899, 12, 30) + datetime.timedelta(days=int(verif_raw))
            verif_interval = None
        else:
            p = str(verif_raw).split('-')
            verif_date = datetime.datetime.strptime(p[0].strip(), "%m/%d/%Y").date()
            verif_interval = int(p[1].split()[0])
        print(f"[parse_f31] org_inn={org_inn}, meter={meter_brand}, verif={verif_date}/{verif_interval}")
    except Exception as e:
        print(f"[parse_f31] Ошибка типов шапки: {e}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                                   msg="Неверный формат данных шапки")

    # 7. Поиск организации
    of = get_all_by_conditions(Organisations, [{'inn': str(org_inn)}])
    if of.status != OperationStatus.SUCCESS or len(of.data) != 1:
        print(f"[parse_f31] Организация не найдена или неоднозначна: {of}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Организация не найдена или неоднозначна")
    organisation_id = of.data[0].id
    print(f"[parse_f31] organisation_id={organisation_id}")

    # 8. Определение water_object_ref через Codes из табличной части
    # заголовки таблицы
    k0 = find_row('Наименование водного объекта')
    k1 = find_row('вида водного объекта')
    k2 = find_row('град.')
    if k0 is None or k1 is None or k2 is None:
        print("[parse_f31] Заголовки таблицы не найдены")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Шапка таблицы не распознана")
    data_start = max(k0, k1, k2) + 2
    first_data = next(r for r in excel_data[data_start:] if any(c not in (None, "") for c in r))
    # код водного объекта в колонке "Коды"
    code_col = next(i for i, c in enumerate(excel_data[k0]) if isinstance(c, str) and 'коды' in c.lower())
    water_code = first_data[code_col+1]
    print(f"[parse_f31] water_object_code={water_code}")
    code_rec = get_all_by_conditions(Codes,
                                     [{'code_type': CodeType.WATER_OBJ_CODE},
                                      {'code_symbol': str(water_code)}])
    if code_rec.status != OperationStatus.SUCCESS or len(code_rec.data) != 1:
        print(f"[parse_f31] Код объекта не найден в Codes: {code_rec}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="Код водного объекта не найден")
    code_id = code_rec.data[0].id
    wor = get_all_by_conditions(WaterObjectRef,
                                 [{'code_obj_id': code_id}])
    if wor.status != OperationStatus.SUCCESS or len(wor.data) != 1:
        print(f"[parse_f31] WaterObjectRef не найден: {wor}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="WaterObjectRef не найден")
    water_object_ref_id = wor.data[0].id
    print(f"[parse_f31] water_object_ref_id={water_object_ref_id}")

    # 9. Определение latitude_longitude из первой строки данных
    # в first_data: [ ..., lat_deg, lat_min, lat_sec, lon_deg, lon_min, lon_sec, ... ]
    # lat_deg, lat_min, lat_sec = first_data[5], first_data[6], first_data[7]
    # lon_deg, lon_min, lon_sec = first_data[8], first_data[9], first_data[10]
    # lat_str = f"{int(lat_deg)}°{int(lat_min)}′{int(lat_sec)}″ с.ш."
    # lon_str = f"{int(lon_deg)}°{int(lon_min)}′{int(lon_sec)}″ в.д."
    # latlon = f"{lat_str}, {lon_str}"
    # print(f"[parse_f31] latitude_longitude={latlon}")

    def to_int(x):
        return int(float(str(x).replace(',', '.')))
    def to_float(x):
        return float(str(x).replace(',', '.'))

    lat_deg = to_int(first_data[5])
    lat_min = to_int(first_data[6])
    lat_sec = to_float(first_data[7])
    lon_deg = to_int(first_data[8])
    lon_min = to_int(first_data[9])
    lon_sec = to_float(first_data[10])

    # Округляем секунды по математическим правилам
    lat_sec_rounded = round(lat_sec)
    lon_sec_rounded = round(lon_sec)

    # Форматируем минуты и секунды с ведущим нулём
    lat_str = f"{lat_deg}°{lat_min:02d}′{lat_sec_rounded:02d}″ с.ш."
    lon_str = f"{lon_deg}°{lon_min:02d}′{lon_sec_rounded:02d}″ в.д."
    latlon = f"{lat_str}, {lon_str}"
    print(f"[parse_f32] latitude_longitude={latlon}")

    # 10. Поиск water_point по organisation_id, water_object_ref_id, latitude_longitude
    wp = get_all_by_conditions(WaterPoint, [
        {'organisation_id': organisation_id},
        {'water_body_id': water_object_ref_id},
        {'latitude_longitude': latlon}
    ])
    if wp.status != OperationStatus.SUCCESS or len(wp.data) != 1:
        print(f"[parse_f31] WaterPoint не найден или неоднозначен: {wp}")
        return OperationResult(OperationStatus.VALIDATION_ERROR,
                               msg="WaterPoint не найден или неоднозначен")
    point_id = wp.data[0].id
    print(f"[parse_f31] point_id={point_id}")

    # 11. Разбор табличной части: категории и значения по месяцам
    h1, h2 = excel_data[k1], excel_data[k2]
    cat_col = next(i for i, c in enumerate(h1) if isinstance(c, str) and 'катег' in c.lower())
    m1 = next(i for i, c in enumerate(h2) if isinstance(c, str) and '1 месяц' in c.lower())
    m2 = next(i for i, c in enumerate(h2) if isinstance(c, str) and '2 месяц' in c.lower())
    m3 = next(i for i, c in enumerate(h2) if isinstance(c, str) and '3 месяц' in c.lower())
    print(f"[parse_f31] cat_col={cat_col}, month_cols={[m1,m2,m3]}")

    code_map = {'ПО': 'NO', 'ТН': 'TN', 'КД': 'CD', 'КР': 'CR', 'ШР': 'MO', 'МН': 'MN', 'ТМ': 'TM'}
    records: List[Any] = []
    for idx, row in enumerate(excel_data[data_start:], start=data_start):
        if not any(c not in (None, "") for c in row):
            continue
        raw_code = row[cat_col]
        if raw_code in (None, ""):
            print(f"[parse_f31] Пустой код качества воды на строке {idx}, пропускаем")
            continue
        print(f"[DEBUG] Строка {idx}, raw_code={raw_code!r}")  # Выведет None или значение
        if raw_code not in code_map:
            print(f"[parse_f31] Неизвестный код качества воды {raw_code} на строке {idx}")
            return OperationResult(OperationStatus.VALIDATION_ERROR,
                                msg=f"Неизвестный код качества воды {raw_code}")
        cq = CategoryQualityWithdrawal[code_map[raw_code]]
        print(f"[parse_f31] Строка {idx}, код качества={raw_code}")

        month_map = {
            1: Month.JANUARY,
            2: Month.FEBRUARY,
            3: Month.MARCH,
            4: Month.APRIL,
            5: Month.MAY,
            6: Month.JUNE,
            7: Month.JULY,
            8: Month.AUGUST,
            9: Month.SEPTEMBER,
            10: Month.OCTOBER,
            11: Month.NOVEMBER,
            12: Month.DECEMBER,
        }
        for col, mi in ((m1,1),(m2,2),(m3,3)):
            rv = row[col]
            if rv in (None, ""):
                continue
            try:
                val = float(rv)
            except Exception:
                print(f"[parse_f31] Нечисловое значение: {rv} на {idx},{col}")
                return OperationResult(OperationStatus.VALIDATION_ERROR,
                                       msg=f"Нечисловое значение: {rv}")
            rec = WCLfor31(
                point_id=point_id,
                month=month_map[mi],
                category_quality=cq,
                value=val,
                signed_by=None
            )
            records.append(rec)
    print(f"[parse_f31] Подготовлено записей: {len(records)}")

    # 12. Поиск и запись подписи
    signed = None
    for row in excel_data[data_start+1:]:
        if not any(c not in (None, "") for c in row): continue
        for c in row:
            if isinstance(c, str) and len(c) > 10:
                signed = c.strip()
                print(f"[parse_f31] signed_by={signed}")
                break
        if signed: break
    for r in records:
        r.signed_by = signed

    # 13. Сохранение и дубликаты
    saved_ids: List[int] = []
    for rec in records:
        ex = get_all_by_conditions(WCLfor31,[
            {'point_id': rec.point_id},
            {'month': rec.month},
            {'category_quality': rec.category_quality}
        ])
        if ex.status == OperationStatus.SUCCESS and ex.data:
            if not replace_duplicates:
                print(f"[parse_f31] Дубликат для month={rec.month}")
                return OperationResult(OperationStatus.DATA_DUPLICATE_ERROR, msg="Дубликат найден")
            old = ex.data[0]
            print(f"[parse_f31] Перезапись ID={old.id}")
            old.value, old.signed_by = rec.value, rec.signed_by
            if not create_record_entity(old.__class__, old.__dict__):
                print("[parse_f31] Ошибка обновления")
                return OperationResult(OperationStatus.DATABASE_ERROR, msg="Ошибка обновления")
            create_record_entity(History, {'table_name':'wcl_31','record_id':old.id,'comment':'parse_f31 overwrite'})
            saved_ids.append(old.id)
        else:
            rec_dict = {k: v for k, v in rec.__dict__.items() if k != '_sa_instance_state'}
            if not create_record_entity(WCLfor31, rec_dict):
                print("[parse_f31] Ошибка создания")
                return OperationResult(OperationStatus.DATABASE_ERROR, msg="Ошибка сохранения")
            nid = get_last_record_id(WCLfor31)
            print(f"[parse_f31] Создана запись ID={nid}")
            saved_ids.append(nid)

    print(f"[parse_f31] Завершено, сохранено={len(saved_ids)}")
    return OperationResult(OperationStatus.SUCCESS,
                           msg=f"Обработано {len(saved_ids)} записей",
                           data=saved_ids)


def parse_f32(
    excel_data: List[List[Any]],
    replace_duplicates: bool = False
) -> OperationResult:
    print("[parse_f32] Начало обработки формы 3.2")

    # 1. Проверка формы
    if not excel_data or not isinstance(excel_data[0], list) \
       or not str(excel_data[0][0]).startswith(
        "Сведения, полученные в результате учета объема сброса"
    ):
        print("[parse_f32] Форма 3.2 не найдена")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Не найдена форма 3.2 в переданном файле"
        )
    print("[parse_f32] Форма найдена")

    # 2. Квартал/год → Month
    try:
        quarter = int(excel_data[1][6])
        year = int(excel_data[1][9])
        print(f"[parse_f32] quarter={quarter}, year={year}")
        month_map = {1: Month.MARCH, 2: Month.JUNE, 3: Month.SEPTEMBER, 4: Month.DECEMBER}
        form_month = month_map[quarter]
    except Exception as e:
        print(f"[parse_f32] Ошибка квартал/год: {e}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Неверный формат квартала или года"
        )

    # 3. Поиск по лейблу
    def find_row(substr: str) -> Optional[int]:
        for i, row in enumerate(excel_data):
            if isinstance(row, list):
                for cell in row:
                    if isinstance(cell, str) and substr.lower() in cell.lower():
                        print(f"[parse_f32] Метка '{substr}' найдена в строке {i}")
                        return i
        print(f"[parse_f32] Метка '{substr}' не найдена")
        return None

    # 4. Разбор шапки
    headers = {
        'org_name':    'Наименование - для юридического лица',
        'inn':         'ИНН',
        'pool':        'Бассейновый округ',
        'region':      'Наименование субъекта Российской Федерации',
        'meter_brand': 'Марка прибора водоучета',
        'verif':       'Дата последней поверки'
    }
    parsed: Dict[str, Any] = {}
    for key, lbl in headers.items():
        idx = find_row(lbl)
        if idx is None:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"Не найдена метка '{lbl}'"
            )
        row = excel_data[idx]
        try:
            val = next(c for c in row[4:] if c not in (None, ""))
            print(f"[parse_f32] {lbl} = {val}")
        except StopIteration:
            print(f"[parse_f32] Пустое значение для '{lbl}'")
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"Пустое значение для '{lbl}'"
            )
        parsed[key] = val

    # Преобразование типов шапки
    try:
        # org_inn = int(parsed['inn'])
        org_inn = parsed['inn']
        meter_brand = str(parsed['meter_brand'])
        verif_raw = parsed['verif']
        if isinstance(verif_raw, (int, float)):
            verif_date = datetime.date(1899, 12, 30) + datetime.timedelta(days=int(verif_raw))
            verif_interval = None
        else:
            p = str(verif_raw).split('-')
            verif_date = datetime.datetime.strptime(p[0].strip(), "%m/%d/%Y").date()
            verif_interval = int(p[1].split()[0])
        print(f"[parse_f32] org_inn={org_inn}, meter={meter_brand}, verif={verif_date}/{verif_interval}")
    except Exception as e:
        print(f"[parse_f32] Ошибка типов шапки: {e}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Неверный формат данных шапки"
        )

    # 5. Поиск организации
    of = get_all_by_conditions(Organisations, [{'inn': str(org_inn)}])
    if of.status != OperationStatus.SUCCESS or len(of.data) != 1:
        print(f"[parse_f32] Организация не найдена или неоднозначна: {of}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Организация не найдена или неоднозначна"
        )
    organisation_id = of.data[0].id
    print(f"[parse_f32] organisation_id={organisation_id}")

    # 6. Разбор блока разрешений
    perm_row = find_row('Реквизиты документа')
    if perm_row is None or perm_row + 1 >= len(excel_data):
        print("[parse_f32] Блок разрешений не найден")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Не найден блок Реквизиты документа"
        )
    vals = excel_data[perm_row + 1]
    try:
        perm_number = next(c for c in vals[4:] if isinstance(c, str) and c.strip())
        def parse_date_cell(x):
            if isinstance(x, (int, float)):
                return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(x))
            return datetime.datetime.strptime(str(x), "%m/%d/%Y").date()
        perm_reg_date = parse_date_cell(vals[15])
        perm_end_date = parse_date_cell(vals[17])
        print(f"[parse_f32] perm_number={perm_number}, reg={perm_reg_date}, end={perm_end_date}")
    except Exception as e:
        print(f"[parse_f32] Ошибка разрешений: {e}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Неверный формат блока разрешений"
        )

    # 7. Поиск water_object_ref по Code из табличной части
    k0 = find_row('Наименование водного объекта')
    k1 = find_row('вида водного объекта')
    k2 = find_row('град.')
    if k0 is None or k1 is None or k2 is None:
        print("[parse_f32] Заголовки таблицы не найдены")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Шапка таблицы не распознана"
        )
    data_start = max(k0, k1, k2) + 2
    first_data = next(r for r in excel_data[data_start:] if any(c not in (None, "") for c in r))
    code_col = next(i for i, c in enumerate(excel_data[k0]) if isinstance(c, str) and 'коды' in c.lower())
    water_code = first_data[code_col + 1]
    print(f"[parse_f32] water_object_code={water_code}")
    code_rec = get_all_by_conditions(Codes, [
        {'code_type': CodeType.WATER_OBJ_CODE},
        {'code_symbol': str(water_code)}
    ])
    if code_rec.status != OperationStatus.SUCCESS or len(code_rec.data) != 1:
        print(f"[parse_f32] Код объекта не найден в Codes: {code_rec}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="Код водного объекта не найден"
        )
    code_id = code_rec.data[0].id
    wor = get_all_by_conditions(WaterObjectRef, [{'code_obj_id': code_id}])
    if wor.status != OperationStatus.SUCCESS or len(wor.data) != 1:
        print(f"[parse_f32] WaterObjectRef не найден: {wor}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="WaterObjectRef не найден"
        )
    water_object_ref_id = wor.data[0].id
    print(f"[parse_f32] water_object_ref_id={water_object_ref_id}")

    # 8. Парсинг координат
    def to_int(x):
        return int(float(str(x).replace(',', '.')))
    def to_float(x):
        return float(str(x).replace(',', '.'))

    lat_deg = to_int(first_data[5])
    lat_min = to_int(first_data[6])
    lat_sec = to_float(first_data[7])
    lon_deg = to_int(first_data[8])
    lon_min = to_int(first_data[9])
    lon_sec = to_float(first_data[10])

    # Округляем секунды по математическим правилам
    lat_sec_rounded = round(lat_sec)
    lon_sec_rounded = round(lon_sec)

    # Форматируем минуты и секунды с ведущим нулём
    lat_str = f"{lat_deg}°{lat_min:02d}′{lat_sec_rounded:02d}″ с.ш."
    lon_str = f"{lon_deg}°{lon_min:02d}′{lon_sec_rounded:02d}″ в.д."
    latlon = f"{lat_str}, {lon_str}"
    print(f"[parse_f32] latitude_longitude={latlon}")



    wp = get_all_by_conditions(WaterPoint, [
        {'organisation_id': organisation_id},
        {'water_body_id': water_object_ref_id},
        {'latitude_longitude': latlon}
    ])
    if wp.status != OperationStatus.SUCCESS or len(wp.data) != 1:
        print(f"[parse_f32] WaterPoint не найден или неоднозначен: {wp}")
        return OperationResult(
            OperationStatus.VALIDATION_ERROR,
            msg="WaterPoint не найден или неоднозначен"
        )
    point_id = wp.data[0].id
    print(f"[parse_f32] point_id={point_id}")

    # 9. Определение индексов колонок табличной части
    # cat_col: код категории
    try:
        cat_col = next(i for i, c in enumerate(excel_data[k1]) if isinstance(c, str) and 'категории качества' in c.lower())

        # total
        total_col = next(i for i, c in enumerate(excel_data[k1]) if isinstance(c, str) and 'всего' in c.lower())
        # without_cleaning
        without_cleaning_col = next(i for i, c in enumerate(excel_data[k2]) if isinstance(c, str) and 'без очистки' in c.lower())
        # not_suff_cleaned
        not_suff_cleaned_col = next(i for i, c in enumerate(excel_data[k2]) if isinstance(c, str) and 'недоста' in c.lower())
        # standard_without_cleaning
        standard_without_cleaning_col = next(i for i, c in enumerate(excel_data[k1]) if isinstance(c, str) and 'норма' in c.lower())
        # standard_biological
        standard_biological_col = next(i for i, c in enumerate(excel_data[k2]) if isinstance(c, str) and 'биологи' in c.lower())
        # standard_physico_chemical
        standard_physico_chemical_col = next(i for i, c in enumerate(excel_data[k2]) if isinstance(c, str) and 'физико-хими' in c.lower())
        # standard_mechanical
        standard_mechanical_col = next(i for i, c in enumerate(excel_data[k2]) if isinstance(c, str) and 'механи' in c.lower())
        # other (если есть)
        other_col = None
        for i, c in enumerate(excel_data[k2]):
            if isinstance(c, str) and 'проч' in c.lower():
                other_col = i
                break
    except Exception as e:
        print(f"{e}")
    print(f"[parse_f32] cat_col={cat_col}, total_col={total_col}, without_cleaning_col={without_cleaning_col}, not_suff_cleaned_col={not_suff_cleaned_col}")
    print(f"[parse_f32] standard_without_cleaning_col={standard_without_cleaning_col}, standard_biological_col={standard_biological_col}, standard_physico_chemical_col={standard_physico_chemical_col}, standard_mechanical_col={standard_mechanical_col}, other_col={other_col}")

    # 10. Мэппинг кодов → CategoryQualityDischarge
    code_map32 = {
        'СК': 'SK', 'СД': 'SD', 'ШР': 'SHR', 'КР': 'KR', 'КД': 'KD',
        'ЛВ': 'LV', 'ТН': 'TN', 'ТР': 'TR', 'ТП': 'TP',
        'РВ': 'RV', 'БЛ': 'BL', 'РС': 'RS'
    }

    records: List[Any] = []
    def to_float_or_none(x):
        if x in (None, ""):
            return None
        try:
            return float(str(x).replace(',', '.'))
        except Exception:
            raise ValueError(f"Нечисловое значение: {x}")

    def safe_to_float(row: List[Any], idx: Optional[int]) -> Optional[float]:
        if idx is None or idx >= len(row):
            return None
        return to_float_or_none(row[idx])


    for idx, row in enumerate(excel_data[data_start:], start=data_start):
        if not any(c not in (None, "") for c in row):
            continue

        raw_code = row[cat_col]
        if raw_code in (None, ""):
            print(f"[parse_f32] Пустой код категории на строке {idx}, пропускаем")
            continue
        if raw_code not in code_map32:
            print(f"[parse_f32] Неизвестный код качества сброса {raw_code} на строке {idx}")
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"Неизвестный код качества сброса {raw_code}"
            )
        cq = CategoryQualityDischarge[code_map32[raw_code]]
        print(f"[parse_f32] Строка {idx}, код качества сброса={raw_code}")

        try:
            total_val                    = safe_to_float(row, total_col)
            without_cleaning_val         = safe_to_float(row, without_cleaning_col)
            not_suff_cleaned_val         = safe_to_float(row, not_suff_cleaned_col)
            standard_without_cleaning_val= safe_to_float(row, standard_without_cleaning_col)
            standard_biological_val      = safe_to_float(row, standard_biological_col)
            standard_physico_chemical_val= safe_to_float(row, standard_physico_chemical_col)
            standard_mechanical_val      = safe_to_float(row, standard_mechanical_col)
            other_val                    = safe_to_float(row, other_col)
        except ValueError as e:
            print(f"[parse_f32] {e} на строке {idx}")
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=str(e)
            )

        rec = WCLfor32(
            point_id                    = int(point_id),
            month                       = form_month,
            category_quality            = cq,
            total                       = total_val,
            without_cleaning            = without_cleaning_val,
            not_suff_cleaned            = not_suff_cleaned_val,
            standard_without_cleaning   = standard_without_cleaning_val,
            standard_biological         = standard_biological_val,
            standard_physico_chemical   = standard_physico_chemical_val,
            standard_mechanical         = standard_mechanical_val,
            other                       = other_val,
            signed_by                   = None
        )
        records.append(rec)
    print(f"[parse_f32] Подготовлено записей: {len(records)}")

    # 11. Поиск и запись подписи
    signed = None
    for row in excel_data[data_start + 1:]:
        if not any(c not in (None, "") for c in row):
            continue
        for c in row:
            if isinstance(c, str) and len(c.strip()) > 10:
                signed = c.strip()
                print(f"[parse_f32] signed_by={signed}")
                break
        if signed:
            break

    for r in records:
        r.signed_by = signed

    # 12. Сохранение и дубликаты
    saved_ids: List[int] = []
    for rec in records:
        ex = get_all_by_conditions(WCLfor32, [
            {'point_id':        rec.point_id},
            {'month':           rec.month},
            {'category_quality': rec.category_quality}
        ])
        if ex.status == OperationStatus.SUCCESS and ex.data:
            if not replace_duplicates:
                print(f"[parse_f32] Дубликат для month={rec.month}, category={rec.category_quality}")
                return OperationResult(OperationStatus.DATA_DUPLICATE_ERROR, msg="Дубликат найден")
            old = ex.data[0]
            print(f"[parse_f32] Перезапись ID={old.id}")
            old.total                     = rec.total
            old.without_cleaning          = rec.without_cleaning
            old.not_suff_cleaned          = rec.not_suff_cleaned
            old.standard_without_cleaning = rec.standard_without_cleaning
            old.standard_biological       = rec.standard_biological
            old.standard_physico_chemical = rec.standard_physico_chemical
            old.standard_mechanical       = rec.standard_mechanical
            old.other                     = rec.other
            old.signed_by                 = rec.signed_by
            if not create_record_entity(old.__class__, old.__dict__):
                print("[parse_f32] Ошибка обновления")
                return OperationResult(OperationStatus.DATABASE_ERROR, msg="Ошибка обновления")
            create_record_entity(History, {
                'table_name': 'wcl_32',
                'record_id':  old.id,
                'comment':    'parse_f32 overwrite'
            })
            saved_ids.append(old.id)
        else:
            rec_dict = {k: v for k, v in rec.__dict__.items() if k != '_sa_instance_state'}
            if not create_record_entity(WCLfor32, rec_dict):
                print("[parse_f32] Ошибка создания")
                return OperationResult(OperationStatus.DATABASE_ERROR, msg="Ошибка сохранения")
            nid = get_last_record_id(WCLfor32)
            print(f"[parse_f32] Создана запись ID={nid}")
            saved_ids.append(nid)

    print(f"[parse_f32] Завершено, сохранено={len(saved_ids)}")
    return OperationResult(
        OperationStatus.SUCCESS,
        msg=f"Обработано {len(saved_ids)} записей",
        data=saved_ids
    )


def create_full_waterpoint(
    data_point: dict,
    data_meter: dict,
    data_permission: dict,
) -> OperationResult:
    print(f" === Зашло в функцию {sys._getframe().f_code.co_name} === ")
    pprint.pprint(data_point)
    pprint.pprint(data_meter)
    pprint.pprint(data_permission)
    # Вспомогательный парсер дат
    parse_date = lambda src, key: datetime.datetime.strptime(src[key], "%d.%m.%Y").date()

    # 1. Проверка наличия идёт/создаётся ли счётчик
    has_existing_meter = bool(data_point.get("meter_id") and data_meter.get("id"))
    if not has_existing_meter:
        # 1.1. Если нет ни существующего, ни нужных полей для поиска/создания
        if not all(data_meter.get(k) for k in ("serial_number", "brand_id")):
            return OperationResult(
                status=OperationStatus.VALIDATION_ERROR,
                msg="Нет обязательного поля"
            )
        # 1.2. Пытаемся найти по serial_number + brand_id
        find = get_all_by_conditions(
            Meters,
            [
                {"serial_number": data_meter["serial_number"]},
                {"brand_id": data_meter["brand_id"]},
            ],
        )
        print_operation_result(find)
        if find.status == OperationStatus.SUCCESS and find.data and len(find.data)>0:
            print("[Результат операции find]: ")
            meters = find.data
            if meters and len(meters) > 1:
                print_data_in_func(
                    meters, "create_full_waterpoint: найдено несколько приборов"
                )
                return OperationResult(
                    status=OperationStatus.CHOICE_WARNING,
                    data=meters,
                    msg="Было найдено несколько схожих приборов"
                )
            data_point["meter_id"] = meters[0].id

        elif "записей не обнаружилось" in find.message or "Не найдено" in find.message or (find.data and len(find.data) == 0):
            print("Попало в ветку Не найдено")
            # 1.3. Создаём новый прибор
            try:
                meter_payload = {
                    "organisation_id": int(data_point["organisation_id"]),
                    "brand_id": data_meter["brand_id"],
                    "serial_number": data_meter["serial_number"],
                    "verification_date": parse_date(data_meter, "verification_date"),
                    "verification_interval": int(data_meter["verification_interval"]),
                    "next_verification_date": parse_date(data_meter, "next_verification_date"),
                }
                if not create_record_entity(Meters, meter_payload):
                    raise RuntimeError("Ошибка при создании нового прибора")
                data_point["meter_id"] = get_last_record_id(Meters)
            except Exception as e:
                print(e)
                print_data_in_func(
                    {**data_point, **data_meter, **data_permission},
                    "create_full_waterpoint: ошибка создания прибора"
                )
                return OperationResult(
                    status=OperationStatus.DATABASE_ERROR,
                    msg="Ошибка при создании нового прибора"
                )
        else:
            print("Неизвестная ошибка поиска")
            print_operation_result(find)
            find.status = OperationStatus.UNDEFINE_ERROR
            return find
    else:
        exist_meter = get_record_by_id(Meters, int(data_meter.get("id")))
        if exist_meter.status != OperationStatus.SUCCESS:
            return OperationResult(
                OperationStatus.DATABASE_ERROR,
                msg="Прибора с таким id не существует")
        for key in ("serial_number", "brand_id", "verification_date", "verification_interval", "next_verification_date"):
            if key not in data_meter or not data_meter.get(key):
                data_meter[key] = getattr(exist_meter.data, key, None)

    # debug
    date_str = data_meter.get("expiration_date")
    print(f"date raw value: {date_str!r}")
    # 2. Подготовка всех полезадок
    waterpoint_payload = {
        "organisation_id": int(data_point["organisation_id"]),
        "meter_id": int(data_point["meter_id"]),
        "water_body_id": int(data_point["water_body_id"]),
        "latitude_longitude": data_point["latitude_longitude"],
        "point_type": data_point["point_type"],
    }
    permissions_to_create = []

    # Разрешение для allowed_volume_org
    if "allowed_volume_org" in data_permission and data_permission["allowed_volume_org"]:
        permissions_to_create.append({
            "organisation_id": int(data_point["organisation_id"]),
            "permission_number": data_permission["permission_number"],
            "registration_date": parse_date(data_permission, "registration_date"),
            "expiration_date": parse_date(data_permission, "expiration_date"),
            "permission_type": data_permission["permission_type"],
            "allowed_volume": float(data_permission["allowed_volume_org"]),
            "method_type": RatesType.ORG,
        })

    # Разрешение для allowed_volume_pop
    if "allowed_volume_pop" in data_permission and data_permission["allowed_volume_pop"]:
        permissions_to_create.append({
            "organisation_id": int(data_point["organisation_id"]),
            "permission_number": data_permission["permission_number"],
            "registration_date": parse_date(data_permission, "registration_date"),
            "expiration_date": parse_date(data_permission, "expiration_date"),
            "permission_type": data_permission["permission_type"],
            "allowed_volume": float(data_permission["allowed_volume_pop"]),
            "method_type": RatesType.POPULATION,
        })
    link_meter_payload = {
        "point_id": None,  # заполнится после создания WP
        "meter_id": data_point["meter_id"],
        "is_active": True,
    }
    link_permission_payload = {
        "point_id": None,
        "permission_id": None,
        "actual_start_date": parse_date(data_permission, "registration_date"),
        "actual_end_date": parse_date(data_permission, "expiration_date"),
        "active": False,
    }

    # 3. Создание записей и связей в БД
    try:
        # 1. Создаём пункт учета
        if not create_record_entity(WaterPoint, waterpoint_payload):
            raise RuntimeError("Ошибка при создании нового пункта учета")
        waterpoint_id = get_last_record_id(WaterPoint)
        print(f"[waterpoint_id]:{waterpoint_id}")

        # 2. Создаём разрешения (Permissions)
        permission_ids = []
        # Разрешение для allowed_volume_org
        if "allowed_volume_org" in data_permission and data_permission["allowed_volume_org"]:
            permission_payload_org = {
                "organisation_id": int(data_point["organisation_id"]),
                "permission_number": data_permission["permission_number"],
                "registration_date": parse_date(data_permission, "registration_date"),
                "expiration_date": parse_date(data_permission, "expiration_date"),
                "permission_type": data_permission["permission_type"],
                "allowed_volume": float(data_permission["allowed_volume_org"]),
                "method_type": RatesType.ORG,
            }
            if not create_record_entity(Permissions, permission_payload_org):
                raise RuntimeError("Ошибка при создании разрешения (ORG)")
            permission_ids.append(get_last_record_id(Permissions))

        # Разрешение для allowed_volume_pop
        if "allowed_volume_pop" in data_permission and data_permission["allowed_volume_pop"]:
            permission_payload_pop = {
                "organisation_id": int(data_point["organisation_id"]),
                "permission_number": data_permission["permission_number"],
                "registration_date": parse_date(data_permission, "registration_date"),
                "expiration_date": parse_date(data_permission, "expiration_date"),
                "permission_type": data_permission["permission_type"],
                "allowed_volume": float(data_permission["allowed_volume_pop"]),
                "method_type": RatesType.POPULATION,
            }
            if not create_record_entity(Permissions, permission_payload_pop):
                raise RuntimeError("Ошибка при создании разрешения (POPULATION)")
            permission_ids.append(get_last_record_id(Permissions))

        # 3. Создаём связь с прибором
        link_meter_payload["point_id"] = waterpoint_id
        if not create_record_entity(PointMeterLink, link_meter_payload):
            raise RuntimeError("Ошибка при создании связи PointMeterLink")

        # 4. Создаём связи разрешений с пунктом учета
        for pid in permission_ids:
            link_permission_payload = {
                "point_id": waterpoint_id,
                "permission_id": pid,
                "actual_start_date": parse_date(data_permission, "registration_date"),
                "actual_end_date": parse_date(data_permission, "expiration_date"),
                "active": False,
            }
            create_record_entity(PointPermissionLink, link_permission_payload)

        print("debug :  метка конца")
        return OperationResult(
            status=OperationStatus.SUCCESS,
            msg="Все записи таблиц успешно созданы"
        )
    except Exception as e:
        print(e)
        print_data_in_func(
            {**data_point, **data_meter, **data_permission},
            "create_full_waterpoint: ошибка при создании записей WP/P"
        )
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=str(e)
        )


def process_water_consumption_single(form_data: dict) -> OperationResult:
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    try:
        print_data_in_func(form_data, "process_water_consumption_single")
        # Получение данных из формы
        measurement_date = form_data.get("measurement_date")
        water_point_id = form_data.get("water_point_id")  # Предполагаем, что water_point_id есть в форме
        if not measurement_date or not water_point_id:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg="Недостаточно данных для определения журнала учета водопотребления"
            )
        month = datetime.datetime.strptime(measurement_date, "%Y-%m-%d").month
        # Поиск журнала по water_point_id и месяцу
        log_result = find_water_consumption_log(water_point_id, month)
        if log_result.status != OperationStatus.SUCCESS:
            return log_result
        log = log_result.data

        # Проверка, что запись с таким measurement_date в этом журнале ещё не существует
        conditions = [
            {"log_id": log.id},
            {"measurement_date": measurement_date}
        ]
        existing_records_result = get_all_by_conditions(RecordWCL, conditions)
        if existing_records_result.status != OperationStatus.SUCCESS:
            # Если произошла ошибка при запросе, возвращаем её
            return existing_records_result
        if existing_records_result.data:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"Запись с датой {measurement_date} уже существует в журнале."
            )

        # Поля, которые нужно взять из формы для записи
        valid_fields = {
            "measurement_date",
            "operating_time_days",
            "water_consumption_m3_per_day",
            "meter_readings",
            "person_signature"
        }
        # Формируем данные для записи, берём только нужные поля
        record_data = {field: form_data[field] for field in valid_fields if field in form_data}
        record_data["log_id"] = log.id

        if create_record_entity(RecordWCL, record_data):
            return OperationResult(
                status=OperationStatus.SUCCESS,
                msg=f"Запись успешно добавилась в БД {RecordWCL.__tablename__}"
            )
        return OperationResult(
            status=OperationStatus.DATABASE_ERROR,
            msg=f"Ошибка при создании записи в {RecordWCL.__tablename__} или запись уже существует или такой сущности нет в БД"
        )
    except Exception as e:
        print(f"Error in process_water_consumption_single: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))


def send_quarter(form_data: any):
    print(f" ===== Зашло в функцию {sys._getframe().f_code.co_name} ===== ")
    water_point_id = form_data["waterPointId"]
    pprint.pprint(form_data)
    quarter = form_data["quarter"]
    report_data = form_data["data"]

    month_mapping = {
        1: [Month.JANUARY, Month.FEBRUARY, Month.MARCH],
        2: [Month.APRIL, Month.MAY, Month.JUNE],
        3: [Month.JULY, Month.AUGUST, Month.SEPTEMBER],
        4: [Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER],
    }
    months = month_mapping.get(quarter)
    if not months:
        raise ValueError(f"Invalid quarter: {quarter}")

    category_mapping = {
        "fact": ConsumersCategories.ACTUAL,
        "population": ConsumersCategories.POPULATION,
        "other": ConsumersCategories.OTHER,
    }

    for month, data in zip(months, report_data):
        for category_key, value in data.items():
            if category_key not in category_mapping:
                continue
            entry = {
                "category": category_mapping[category_key],
                "month": month,
                "value": value,
                "water_point_id": water_point_id
            }
            if not create_record_entity(WaterConsumptionLogByCategories, entry):
                return OperationResult(
                    status=OperationStatus.DATABASE_ERROR,
                    msg=f"Ошибка в create_record_entity для {WaterConsumptionLogByCategories.__tablename__}"
                )

    try:
        notification_payload = {
            "type": "waterreportform",
            "header": f"Отправлен квартальный отчет за {form_data['quarter']} квартал",
            "message": "Новый квартальный отчет получен",
            "quarter": form_data['quarter'],
            "waterPointId": form_data['waterPointId'],
            "reportData": form_data['data'],
        }

        message = json.dumps(notification_payload, ensure_ascii=False)
        # Здесь "orgadmin" — имя пользователя-админа, можно сделать динамически
        from utils.notify_utils import create_and_send_notification
        create_and_send_notification("orgadmin", message)
    except Exception as e:
        print("Ошибка при отправке уведомления orgadmin-у:", e)
    return OperationResult(status=OperationStatus.SUCCESS, msg="Данные успешно сохранены")


def process_create_water_consumption_header(form_data: dict) -> OperationResult:
    print(f"==== process_create_water_consumption_header ====")
    try:
        # Проверяем наличие полей
        required = ["point_id", "exploitation_org_id", "month", "log_status", "start_date"]
        if not all(k in form_data for k in required):
            return OperationResult(OperationStatus.VALIDATION_ERROR,
                msg="Не переданы все поля для создания журнала учета")

        point_id = form_data["point_id"]
        exploitation_org_id = form_data["exploitation_org_id"]
        month = form_data["month"]           # ожидать int или строку enum?
        log_status = form_data["log_status"] # строка, совпадающая с log_status enum
        start_date = form_data["start_date"] # строка "YYYY-MM-DD"

        # Здесь может потребоваться перевести month в тип Month:
        #   month_enum = Month[int(month)]  или Month[month_str]
        # и аналогично для log_status

        # Проверить дубли по point_id и month:
        conditions = [
            {"point_id": point_id},
            {"month": month}
        ]
        existing = get_all_by_conditions(WaterConsumptionLog, conditions)
        if existing.status != OperationStatus.SUCCESS:
            return existing
        if existing.data:
            return OperationResult(
                OperationStatus.VALIDATION_ERROR,
                msg=f"Журнал за месяц {month} для точки {point_id} уже существует."
            )

        # Собираем данные для создания
        data = {
            "point_id": point_id,
            "exploitation_org_id": exploitation_org_id,
            "month": month,
            "log_status": log_status,
            "start_date": start_date
        }

        if create_record_entity(WaterConsumptionLog, data):
            return OperationResult(
                status=OperationStatus.SUCCESS,
                msg="Журнал учета успешно создан"
            )
        else:
            return OperationResult(
                status=OperationStatus.DATABASE_ERROR,
                msg="Не удалось создать журнал учета — ошибка БД"
            )
    except Exception as e:
        print(f"Error in process_create_water_consumption_header: {e}")
        return OperationResult(OperationStatus.UNDEFINE_ERROR, msg=str(e))
