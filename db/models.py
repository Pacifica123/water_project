from sqlalchemy import String, DateTime, Enum as SQLAEnum, func, ForeignKey, Text, BigInteger, Numeric, Integer, Boolean, Date, \
    Float, CheckConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from typing import Optional
from enum import Enum as PyEnum
from sqlalchemy import JSON
from flask import g


class PermissionType(PyEnum):
    WATER_WITHDRAWAL = "water_withdrawal"
    DISCHARGE = "discharge"
    OTHER = "other"


class CodeType(PyEnum):
    WATEROBJ_A_SAMPLINGLOCATION = "water_obj_water_intake"
    ORGANISATION_CODE_GUIV = "organisation_code_GUIV"
    HYDROGRAPHIC_UNIT_CODE = "hydrographic_unit_code"
    WATER_OBJ_CODE = "water_object_code"
    WATER_AREA_CODE = "water_area_code"
    WATER_POOL_CODE = "water_pool_code"
    WATER_TYPE_CODE = "type_of_water_obj"


class WaterTreatmentLevel(PyEnum):
    TOTAL = "total"  # Всего
    WITHOUT_CLEANING = "without_cleaning"  # Без очистки
    NOT_SUFFICIENTLY_CLEANED = "not_suff_cleaned"  # Недостаточно очищено
    STANDARD_WITHOUT_CLEANING = "standard_without_cleaning"  # Нормативно чистые (без очистки)
    STANDARD_BIOLOGICAL = "standard_biological"  # Нормативно очищенных биологически
    STANDARD_PHYSICO_CHEMICAL = "standard_physico_chemical"  # Нормативно очищенных физико-химически
    STANDARD_MECHANICAL = "standard_mechanical"  # Нормативно очищенных механически
    OTHER = "other" # для особых случаев


class UserRoles(PyEnum):
    ADMIN = "admin" # главный админ
    ORG_ADMIN = "org_admin"  # Администратор Министерства, отвечающий за внесение организаций
    REPORT_ADMIN = "report_admin"  # Администратор отчетов со стороны Министерства
    EMPLOYEE = "employee" # Сотрудник органиазции


class ConsumersCategories(PyEnum):
    ACTUAL = "actual"
    POPULATION = "population"
    OTHER = "other"


class Month(PyEnum):
    JANUARY = "январь"
    FEBRUARY = "февраль"
    MARCH = "март"
    APRIL = "апрель"
    MAY = "май"
    JUNE = "июнь"
    JULY = "июль"
    AUGUST = "август"
    SEPTEMBER = "сентябрь"
    OCTOBER = "октябрь"
    NOVEMBER = "ноябрь"
    DECEMBER = "декабрь"


class Base(DeclarativeBase):
    """
    МЕТАИНФОРМАЦИЯ
    """
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, default=func.now(), nullable=False)
    created_by: Mapped[str] = mapped_column(String, default="auto", nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)
    updated_by: Mapped[int] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)
    deleted_by: Mapped[int] = mapped_column(Integer, nullable=True)
    def save(self, session):
        session.add(self)
        session.commit()


class ChemicalAnalysisProtocol(Base):
    """
    Протокол химического анализа\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - protocol_number (str): Номер протокола химического анализа.\n
      \n  - protocol_date (Date): Дата проведения анализа.\n
      \n  - file_path (str): Путь к файлу с результатами анализа.\n
      \n  - location_id (int): Идентификатор места отбора проб, ссылающийся на таблицу 'sampling_location'.
    """
    __tablename__ = 'chemical_analysis_protocol'

    protocol_number: Mapped[str] = mapped_column(String(50), nullable=False)
    protocol_date: Mapped[Date] = mapped_column(Date, nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey('sampling_location.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'protocol_number': self.protocol_number,
            'protocol_date': self.protocol_date,
            'file_path': self.file_path,
        }


class SamplingLocation(Base):
    """
    Место отбора проб\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - name (str): Название места отбора проб.\n
      \n  - latitude_longitude (str): Географические координаты места в формате 'широта, долгота'.\n
      \n  - water_obj_id (int): Идентификатор водного объекта, ссылающийся на таблицу 'water_object_ref'.\n
    """
    __tablename__ = 'sampling_location'

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude_longitude: Mapped[str] = mapped_column(String(100), nullable=False)
    water_obj_id: Mapped[int] = mapped_column(ForeignKey('water_object_ref.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude_longitude': self.latitude_longitude
        }


class Codes(Base):
    """
    КОДЫ\n
    -------------------------------------
    Атрибуты:
    \n
    \n  code_symbol (str): Символ кода, который используется для идентификации.\n
    \n  code_value (str): Значение кода, описывающее его содержание.\n
    \n  code_type (str): Тип кода, определяющий его категорию. Возможные значения:
    \n  - 'type_of_water_body_water_intake': Вид водного объекта (символ = str(int); значение = вид водного объекта).
    \n  - 'water_body_a_water_intake': Водный объект - водоприемник (символ = str(XXX/XXX/INT); значение).
    \n  - 'water_quality_categories': Категория и качество воды (символ = str(XX); значение).
    \n  - 'organisation_code_GUIV': Государственный учет использования ресурсов (символ = str(int); значение = название организации).
    \n  - 'hydrographic_unit_code': Код географической единицы (символ = str(xx.xx.<...>); значение = название объекта).
    \n  - 'water_area_code': Код водохоз. участка (символ = start(xx.xx.xx.xxx) значение = название участка)
    """
    __tablename__ = 'codes'

    code_symbol: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    code_value: Mapped[str] = mapped_column(String(255), nullable=False)
    code_type: Mapped[CodeType] = mapped_column(SQLAEnum(CodeType), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'code_symbol': self.code_symbol,
            'code_value': self.code_value,
        }


class SubstancesRef(Base):
    """
    Вещества \n
    -------------------------------------
    \n Атрибуты:
      \n  - name (str): Название вещества.
      \n  - maximum_permissible_concentration (float): Максимально допустимая концентрация вещества в среде, выраженная в соответствующих единицах.
    """
    __tablename__ = 'substances_ref'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    maximum_permissible_concentration: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'maximum_permissible_concentration': self.maximum_permissible_concentration,
        }


class StandartsRef(Base):
    """
    Нормативы\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - substance_id (int): вещество (ссылка на 'substances_ref') \n
      \n  - organisation_id (int): организация (ссылка на 'organisations') \n
      \n  - value (float): Значение норматива, представленное в виде числа с плавающей точкой.\n
      \n  - document_path (str): Путь к документу, содержащему нормативные данные.\n
    """
    __tablename__ = 'standarts_ref'

    substance_id: Mapped[int] = mapped_column(ForeignKey('substances_ref.id'), nullable=False)
    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisations.id'), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    document_path: Mapped[str] = mapped_column(String, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'value': self.value,
            'document_path': self.document_path,
        }


class Concentrates(Base):
    """
    Концентрации\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - protocol_id (int): протокол хим анализа (ссылка на 'chemical_analysis_protocol') \n
      \n  - substance_id (int): вещество (ссылка на таблицу 'substances_ref') \n
      \n  - value (float): Концентрация вещества, измеренная в соответствующих единицах (например, мг/л).\n
      \n  - text (str): Дополнительная информация о концентрации вещества, например, комментарии или примечания.
    """
    __tablename__ = 'concentrates'

    protocol_id: Mapped[int] = mapped_column(ForeignKey('chemical_analysis_protocol.id'), nullable=False)
    substance_id: Mapped[int] = mapped_column(ForeignKey('substances_ref.id'), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    text: Mapped[str] = mapped_column(String(255), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'value': self.value,
            'text': self.text,
        }

class MetersBrandRef(Base):
    """
    Марка прибора учета водопотребления\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - brand_name (str): Название марки    .\n
    """
    __tablename__ = 'meters_brand_ref'

    brand_name: Mapped[str] = mapped_column(String(255), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'brand_name': self.brand_name,
        }


class Meters(Base):
    """
    Приборы учета водопотребления
    """
    __tablename__ = 'meters'

    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisations.id'), nullable=False)
    brand_id: Mapped[int] = mapped_column(ForeignKey('meters_brand_ref.id'), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(50), nullable=False)
    verification_date: Mapped[Date] = mapped_column(Date, nullable=False)
    verification_interval: Mapped[int] = mapped_column(Integer, nullable=False)     # в годах
    next_verification_date: Mapped[Date] = mapped_column(Date, nullable=False)

    def to_dict(self):
        brand = g.session.query(MetersBrandRef).filter_by(id=self.brand_id, is_deleted=False).one()
        print(f" --> МЫ ТУТ{brand}")
        return {
            'id': self.id,
            'serial_number': self.serial_number,
            'verification_date': self.verification_date,
            'verification_interval': self.verification_interval,
            'next_verification_date': self.next_verification_date,
            'brand': brand.to_dict()
        }



class Organisations(Base):
    """
    запись Организации заполненная админом\n
    -------------------------------------
    Атрибуты:
      \n  - organization_code (str): Код организации, ссылающийся на таблицу 'codes'.
      \n  - organisation_name (str): Название организации.
      \n  - postal_address (str): Почтовый адрес организации.
      \n  - legal_form (str): Организационно-правовая форма организации.
      \n  - inn (str): Идентификационный номер налогоплательщика (ИНН) организации.
      \n  - hydrographic_unit_code (str): Код географической единицы, ссылающийся на таблицу 'codes'.
    """
    __tablename__ = 'organisations'

    organization_code: Mapped[Optional[int]] = mapped_column(ForeignKey('codes.id'), nullable=True)
    organisation_name: Mapped[str] = mapped_column(String(255), nullable=False)
    postal_address: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_form: Mapped[str] = mapped_column(String(100), nullable=False)
    inn: Mapped[str] = mapped_column(String(12), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'organisation_name': self.organisation_name,
            'postal_address': self.postal_address,
            'legal_form': self.legal_form,
            'inn': self.inn,
        }


class OrgHUCLink(Base):
    """
    Связка Организации с Кодом гидрографической Единицы (HUC)
    """
    __tablename__ = 'org_huc_link'


    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisations.id'), nullable=False)
    hydrographic_unit_code: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
        }


class Permissions(Base):
    """
    Разрешения

    Атрибуты:
        organisation_id (int): Идентификатор организации, к которой относится разрешение (внешний ключ).
        permission_number (str): Номер разрешения, уникальный для каждой записи.
        registration_date (Date): Дата регистрации разрешения.
        expiration_date (Date): Дата истечения срока действия.
        permission_type (str): Тип разрешения, например, забор, сброс и т.п.
        allowed_volume (float): Допустимый объем, связанный с разрешением (например, объем воды).
    """
    __tablename__ = 'permissions'

    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisations.id'), nullable=False)
    permission_number: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_date: Mapped[Date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[Date] = mapped_column(Date, nullable=False)
    permission_type: Mapped[PermissionType] = mapped_column(SQLAEnum(PermissionType), nullable=False)
    allowed_volume: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'permission_number': self.permission_number,
            'registration_date': self.registration_date,
            'permission_type': self.permission_type,
            'allowed_volume': self.allowed_volume,
        }

class PointPermissionLink(Base):
    """
    Связка Точки забора/сброса с разрешением
    """
    __tablename__ = 'point_permission_link'

    point_id: Mapped[int] = mapped_column(ForeignKey('water_point.id'), nullable=False)
    permission_id: Mapped[int] = mapped_column(ForeignKey('permissions.id'), nullable=False)
    actual_start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    actual_end_date: Mapped[Date] = mapped_column(Date, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'actual_start_date': self.actual_start_date,
            'actual_end_date': self.actual_end_date,
            'active': self.active,
        }

class WaterPoolRef(Base):
    """
    Водный бассейн\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - code_pool_id (int): код бассейна (ссылка на 'codes') \n
      \n  - pool_name (str): название бассейна (поле отсутствует, можно получить через внешний ключ).
    """
    __tablename__ = 'water_pool_ref'
    pool_name: Mapped[str] = mapped_column(String(50), nullable=False)
    # code_pool_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'pool_name': self.pool_name,
        }

class WaterAreaRef(Base):
    """
    Водохозяйственный участок\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - code_area_id (int): код участка (ссылка на 'codes') \n
      \n  - water_pool_id (int): водного бассейна (ссылка на 'water_pool').
      \n  - area_name (str): название участка (поле отсутствует, можно получить по коду).
    """
    __tablename__ = 'water_area_ref'

    code_area_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)
    water_pool_id: Mapped[int] = mapped_column(ForeignKey('water_pool_ref.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,

        }

class WaterObjectRef(Base):
    """
    Водный объект\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - code_type_id (int): тип объекта (ссылка на 'codes') \n
      \n  - code_obj_id (int):  код объекта (ссылка на 'codes') \n
      \n  - water_area_id (int): водохозяйственный участок (ссылка на 'water_area').
    """
    __tablename__ = 'water_object_ref'

    code_type_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)
    code_obj_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)
    water_area_id: Mapped[int] = mapped_column(ForeignKey('water_area_ref.id'), nullable=False)
    def to_dict(self):
        code = g.session.query(Codes).filter_by(id=self.code_obj_id, is_deleted=False).one()
        return {
            'id': self.id,
            'code_obj': code.to_dict()
        }


class WaterPoint(Base):
    """
    Точка забора и сброса\n
    -------------------------------------\n
    Атрибуты:\n
      \n  - organisation_id (int): организация, связанной с точкой забора (ссылка на 'organisation').\n
      \n  - water_body_id (int): водный объект, к которому относится точка (ссылка на 'water_object_ref').\n
      \n  - meter_id: прибор учета
      \n  - latitude_longitude (str): Географические координаты точки в формате "широта_долгота".\n
      \n  - point_type (str): Тип точки (например, "забор" или "сброс"), ограниченный 10 символами.
    """
    __tablename__ = 'water_point'

    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisations.id'), nullable=False)
    meter_id: Mapped[int] = mapped_column(ForeignKey('meters.id'), nullable=False)
    water_body_id: Mapped[int] = mapped_column(ForeignKey('water_object_ref.id'), nullable=False)
    latitude_longitude: Mapped[str] = mapped_column(String(100), nullable=False)
    point_type: Mapped[PermissionType] = mapped_column(String(20), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'latitude_longitude': self.latitude_longitude,
            'point_type': self.point_type,
        }

# Сотрудники
class User(Base):
    __tablename__ = 'users'

    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    middle_name: Mapped[str] = mapped_column(String(50), nullable=True)
    birth_date: Mapped[Date] = mapped_column(Date, nullable=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    organisation_id: Mapped[Optional[int]] = mapped_column(ForeignKey('organisations.id'), nullable=True)
    role: Mapped[UserRoles] = mapped_column(SQLAEnum(UserRoles), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'last_name': self.last_name,
            'first_name': self.first_name,
            'middle_name': self.middle_name,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'username': self.username,
            'email': self.email,
            # Не включаем пароль в словарь для безопасности
            # 'password': self.password,
            # 'organisation_id': self.organisation_id,
            'role': self.role  # Преобразуем перечисление в строку
        }


class WaterConsumptionLog(Base):
    """
    Журнал учета водопотребления (ОСНОВНАЯ ЗАПИСЬ)\n
    -------------------------------------\n
    Атрибуты:\n TODO
    """
    __tablename__ = 'water_consumption_log'

    point_id: Mapped[int] = mapped_column(ForeignKey('water_point.id'), nullable=False)
    consumption_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True) # на удаление...
    treatment_level: Mapped[WaterTreatmentLevel] = mapped_column(SQLAEnum(WaterTreatmentLevel), nullable=True)
    exploitation_org_id: Mapped[int] = mapped_column(ForeignKey('organisations.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'consumption_value': self.consumption_value,
            'treatment_level': self.treatment_level
        }


class History(Base):
    """
    Универсальная история записей\n
    -------------------------------------\n
    Атрибуты:\n TODO
    """
    __tablename__ = 'history'

    table_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Имя таблицы, в которой произошло изменение
    record_id: Mapped[int] = mapped_column(Integer, nullable=False)  # ID измененной записи
    change_date: Mapped[DateTime] = mapped_column(DateTime, default=func.now(), nullable=False)  # Дата изменения
    comment: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'table_name':self.table_name,
            'change_date':self.change_date
        }


class PointMeterLink(Base):
    """
    Связка точки потребления и прибора, у точки м.б. нескоолько приборов\n
    -------------------------------------\n
    Атрибуты:\n TODO
    """
    __tablename__ = 'point_meter_link'

    point_id: Mapped[int] = mapped_column(ForeignKey('water_point.id'), nullable=False)
    meter_id: Mapped[int] = mapped_column(ForeignKey('meters.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
        }

# class RecordPML(PointMeterLink):
#     """
#     Запись измерения для PointMeterLink.
#
#     Атрибуты:
#     - measurement_date: Дата измерения
#     - value: Значение измерения
#     """
#     __tablename__ = 'measurement'
#
#     measurement_date: Mapped[DateTime] = mapped_column(nullable=False)  # дата измерения
#     value: Mapped[float] = mapped_column(Float, nullable=False)  # значение измерения


class RecordWCL(Base):
    """
    Конкретный экземпляр записи закрепленный законкретным журналом WaterConsumptionLog
    """
    __tablename__ = 'record_wcl'

    log_id: Mapped[int] = mapped_column(ForeignKey('water_consumption_log.id'))
    measurement_date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    operating_time_days: Mapped[int] = mapped_column(Integer, nullable=False)
    water_consumption_m3_per_day: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    meter_readings: Mapped[dict] = mapped_column(JSON)

    def to_dict(self):
        return {
            'id': self.id,
            'measurement_date': self.measurement_date,
            'operating_time_days': self.operating_time_days,
            'water_consumption_m3_per_day': self.water_consumption_m3_per_day,
            'meter_readings': self.meter_readings
        }


class WaterConsumptionLogByCategories(Base):
    __tablename__ = 'wcl_category'

    category: Mapped[ConsumersCategories] = mapped_column(SQLAEnum(ConsumersCategories), nullable=False)
    month: Mapped[Month] = mapped_column(SQLAEnum(Month), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    # water_object_code = ... TODO

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'month': self.month,
            'value': self.value
        }


class WCLfor3132(Base):
    __tablename__ = 'wcl_3132'

    point_id: Mapped[int] = mapped_column(ForeignKey('water_point.id'), nullable=False)
    # (есть в point) logtype:Mapped[WaterLogType] = mapped_column(SQLAEnum(PermissionType), nullable=False)
    water_obj_id: Mapped[int] = mapped_column(ForeignKey('water_object_ref.id'), nullable=False)
    coordinates: Mapped[str] = mapped_column(String(255), nullable=True)
    code_type_water_obj_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)
    code_water_obj_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False)
    code_category_quality: Mapped[WaterTreatmentLevel] = mapped_column(SQLAEnum(WaterTreatmentLevel), nullable=False)
    # permission_id
    month: Mapped[Month] = mapped_column(SQLAEnum(Month), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'coordinates': self.coordinates,
            'code_category_quality': self.code_category_quality,
            'month': self.month,
            'value': self.value
        }

# class WCLxPMLrecordLink(Base):
#     """
#     Связка записи журнала с Конкретным прибором, существующая по той причине что:
#     - на одной точке водозабора может быть произвольное количество приборов
#     - на одной и той же точке с течением времени гипотетически количество приборов может меняться
#     """
#     __tablename__ = 'wxprl'
#
#     point_meter_link_id: Mapped[int] = mapped_column(ForeignKey('point_meter_link.id'), nullable=False)
#     record_wcl_id: Mapped[int] = mapped_column(ForeignKey('record_wcl.id'), nullable=False)

# class RecordWCL(WaterConsumptionLog):
#     """
#     Запись журнала учета водопотребления (наследник WaterConsumptionLog)\n
#     -------------------------------------\n
#     Атрибуты:\n
#     - measurement_date: Дата измерения\n
#     - point_meter_link_id: Ссылка на запись измерения для PointMeterLink\n
#     - operating_time_days: Время работы измерительного прибора в сутках\n
#     - water_consumption_m3_per_day: Расход воды (тыс.м3)\n
#     """
#     __tablename__ = 'record_wcl'
#
#     measurement_date: Mapped[DateTime] = mapped_column(nullable=False)  # дата измерения
#     point_meter_link_id: Mapped[int] = mapped_column(ForeignKey('measurement.id'), nullable=False)  # ссылка на RecordPML НО НАДО НЕСКОЛЬКО СЮДА...
#     operating_time_days: Mapped[float] = mapped_column(Float, nullable=False)  # время работы в сутках
#     water_consumption_m3_per_day: Mapped[float] = mapped_column(Float, nullable=False)  # расход воды в м3/сут
