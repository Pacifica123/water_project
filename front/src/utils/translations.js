const translations = {
    "water_body_name": "Название водного объекта",
    "coordinates": "Координаты",
    "point_type": "Тип точки",
    "start_date": "Дата начала",
    "status": "Статус",
    "IN_PROGRESS": "В процессе", "WATER_WITHDRAWAL": "Забор",
    "DISCHARGE": "Сброс",    "OTHER": "Другое",
    "TOTAL": "Всего",    "WITHOUT_CLEANING": "Без очистки",
    "NOT_SUFFICIENTLY_CLEANED": "Недостаточно очищено",
    "STANDARD_WITHOUT_CLEANING": "Нормативно чистые (без очистки)",
    "STANDARD_BIOLOGICAL": "Нормативно очищенных биологически",
    "STANDARD_PHYSICO_CHEMICAL": "Нормативно очищенных физико-химически",
    "STANDARD_MECHANICAL": "Нормативно очищенных механически",
    "ADMIN": "Админ",    "ORG_ADMIN": "Менеджер по заявкам",
    "REPORT_ADMIN": "Менеджер по отчетам",    "EMPLOYEE": "Организация",
    "ACTUAL": "Фактическое",    "POPULATION": "Население",
    "IS_DONE": "Подписан",    "SENT": "Отправлен",
    "UNDER_WATCH": "На рассмотрении",
    "UNDER_CORRECTION": "На доработке",    "CLOSED": "Закрыт",
    "chemical_analysis_protocol": "Протокол химического анализа",
    "sampling_location": "Место отбора проб",    "codes": "Коды",
    "substances_ref": "Вещества",    "standarts_ref": "Нормативы",
    "concentrates": "Концентрации",
    "meters_brand_ref": "Марка прибора учета водопотребления",
    "meters": "Приборы учета водопотребления",
    "organisations": "Организации",    "permissions": "Разрешения",
    "water_pool_ref": "Водный бассейн",
    "water_area_ref": "Водохозяйственный участок",
    "water_point": "Точка забора/сброса",    "users": "Пользователи",
    "water_consumption_log": "Журнал учета водопотребления",
    "wcl_category": "Справка о заборе воды по категориям",
    "rates": "Ставки",    "history": "История",
    "JANUARY": "Январь",    "FEBRUARY": "Февраль",
    "MARCH": "Март",    "APRIL": "Апрель",
    "MAY": "Май",    "JUNE": "Июнь",
    "AUGUST": "Август",    "SEPTEMBER": "Сентябрь",
    "OCTOBER": "Октябрь",    "NOVEMBER": "Ноябрь",
    "DECEMBER": "Декабрь",    "JULY": "Июль",
    "created_at": "Запись создана",
    "created_by": "Создана кем",
    "updated_at": "Запись обновлена",
    "updated_by": "Обновлена кем",
    "is_deleted": "Запись удалена",
    "deleted_at": "Удалена когда",
    "deleted_by": "Удалена кем",
    "protocol_number": "Номер протокола химического анализа",
    "protocol_date": "Дата проведения анализа",
    "file_path": "Путь к файлу с результатами анализа",
    "location_id": "Идентификатор места отбора проб",
    "name": "Название",
    "water_obj_id": "Идентификатор водного объекта",
    "code_symbol": "Символ кода",
    "code_value": "Значение кода",
    "code_type": "Тип кода",
    "substance_id": "Идентификатор вещества",
    "maximum_permissible_concentration": "Максимально допустимая концентрация вещества",
    "organisation_id": "Идентификатор организации",
    "value": "Значение норматива",
    "document_path": "Путь к документу",
    "protocol_id": "Идентификатор протокола химического анализа",
    "substance_id": "Идентификатор вещества (ссылка на таблицу веществ)",
    "text": "Дополнительная информация о концентрации вещества",
    "brand_name": "Название марки прибора учета водопотребления",
    "serial_number": "Серийный номер прибора учета водопотребления",
    "verification_date": "Дата поверки прибора учета водопотребления",
    "verification_interval": "Интервал поверки прибора учета (в годах)",
    "next_verification_date": "Дата следующей поверки прибора учета водопотребления",
    "organisation_code": "Код организации (ссылка на таблицу кодов)",
    "organisation_name": "Название организации",
    "postal_address": "Почтовый адрес организации",
    "legal_form": "Организационно-правовая форма организации",
    "inn": "Идентификационный номер налогоплательщика (ИНН)",
    "hydrographic_unit_code": "Код гидрографической единицы",
    "permission_number": "Номер разрешения",
    "registration_date": "Дата регистрации разрешения",
    "expiration_date": "Дата истечения срока действия разрешения",
    "permission_type": "Тип разрешения (например, забор или сброс воды)",
    "allowed_volume_org": "Допустимый объем для организации",
    "allowed_volume_pop": "Допустимый объем для населения",
    "actual_start_date": "Фактическая дата начала действия разрешения",
    "actual_end_date": "Фактическая дата окончания действия разрешения",
    "active": "Активность записи",
    "pool_name": "Название водного бассейна",
    "code_area_id": "Код участка (ссылка на таблицу кодов)",
    "water_pool_id": "Водный бассейн (ссылка на таблицу бассейнов)",
    "code_type_id": "Тип водного объекта (ссылка на таблицу кодов)",
    "code_obj_id": "Код водного объекта (ссылка на таблицу кодов)",
    "water_area_id": "Водохозяйственный участок (ссылка на таблицу участков)",
    "organisation_id": "Организация, связанная с точкой забора/сброса воды",
    "meter_id": "Прибор учета воды",
    "water_body_id": "Водный объект, связанный с точкой забора/сброса воды",
    "latitude_longitude": "Географические координаты точки ('широта, долгота')",
    "last_name": "Фамилия",
    "first_name": "Имя",
    "middle_name": "Отчество",
    "birth_date": "Дата рождения",
    "username": "Логин",
    "email": "Электронная почта",
    "password": "Пароль",
    "role": "Роль",
    "log_status": "Статус журнала",
    "month": "Месяц",
    "point_id": "id точки забора",
    "brand_id": "id марки прибора",
    "treatment_level": "Степень очистки",
    "category": "Категория",
    "water_point_id": "id точки",
    "log_id": "id Журнала",
    "measurement_date": "Дата измерения",
    "meter_readings": "Показания приборов",
    "operating_time_days": "Время работы прибора",
    "exploitation_org_id": "Эксплуатирующая организация",
    "HYDROGRAPHIC_UNIT_CODE": "Код гидрографической единицы",
    "WATER_TYPE_CODE": "Вид водного объекта",
    "WATER_OBJ_CODE": "Код водного объекта",
    "WATER_AREA_CODE": "Код Водохозяйственного участка",
    "WATER_POOL_CODE": "Код водного бассейна",
    "ORGANISATION_CODE_GUIV": "Государственный учет использования ресурсов",
    "organization_code": "Код организации",
    "water_consumption_m3_per_day": "Расход воды м3/сут (тыс.м3)",
    "person_signature": "Подпись лица осуществляющего учет",
    // "шаблон": "шаблон",
};

function translate(key) {
    if (typeof key !== 'string') return key;

    // Убираем префикс, если есть
    key = key.replace(/^PermissionType\./, '');

    // Если ключ целиком есть в словаре — возвращаем перевод сразу
    if (translations.hasOwnProperty(key)) {
        return translations[key];
    }

    // Иначе — ищем и заменяем все слова из словаря внутри строки
    for (const originalWord in translations) {
        if (translations.hasOwnProperty(originalWord)) {
            // Создаем регулярное выражение с границами слова
            const regex = new RegExp(`\\b${originalWord}\\b`, 'g');
            if (regex.test(key)) {
                key = key.replace(regex, translations[originalWord]);
            }
        }
    }

    return key;
}


export { translate };
