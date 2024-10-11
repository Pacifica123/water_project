from sqlalchemy import String, DateTime, Enum, func, ForeignKey, Text, BigInteger, Numeric, Integer, Boolean, Date, \
    Float, CheckConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    created: Mapped[DateTime] = mapped_column(DateTime, default=func.now(), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    def save(self, session):
        session.add(self)
        session.commit()


# Протокол химического анализа
class ChemicalAnalysisProtocol(Base):
    __tablename__ = 'chemical_analysis_protocol'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    protocol_number: Mapped[str] = mapped_column(String(50), nullable=False)
    protocol_date: Mapped[Date] = mapped_column(Date, nullable=False)
    pdf_path: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey('sampling_location.id'), nullable=False)


# Коды
class Codes(Base):
    """
    Модель для представления кодов в системе.

    Атрибуты:
        code_symbol (str): Символ кода, который используется для идентификации.
        code_value (str): Значение кода, описывающее его содержание.
        code_type (str): Тип кода, определяющий его категорию. Возможные значения:
            - 'type_of_water_body_water_intake': Вид водного объекта (символ = str(int); значение = вид водного объекта).
            - 'water_body_a_water_intake': Водный объект - водоприемник (символ = str(XXX/XXX/INT); значение).
            - 'water_quality_categories': Категория и качество воды (символ = str(XX); значение).
            - 'organisation_code_GUIV': Государственный учет использования ресурсов (символ = str(int); значение = название организации).
            - 'hydrographic_unit_code': Код географической единицы (символ = str(xx.xx.<...>); значение = название объекта).
            - 'water_area_code': Код водохоз. участка (символ = start(xx.xx.xx.xxx) значение = название участка)
    """
    __tablename__ = 'codes'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code_symbol: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    code_value: Mapped[str] = mapped_column(String(255), nullable=False)
    code_type: Mapped[str] = mapped_column(Enum(
        'type_of_water_body_water_intake',
        'a_water_body_a_water_intake',
        'water_quality_categories',
        'organisation_code_GUIV',
        'hydrographic_unit_code',
        'water_area_code',
        name='code_types'), nullable=False)


# Концентраты
class Concentrates(Base):
    __tablename__ = 'concentrates'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    protocol_id: Mapped[int] = mapped_column(ForeignKey('chemical_analysis_protocol.id'), nullable=False)
    substance_id: Mapped[int] = mapped_column(ForeignKey('substances.id'), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    text: Mapped[str] = mapped_column(String(255), nullable=False)


# Марка устройства
class DeviceBrand(Base):
    __tablename__ = 'device_brand'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand_name: Mapped[str] = mapped_column(String(255), nullable=False)


# Приборы
class Devices(Base):
    __tablename__ = 'devices'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisation.id'), nullable=False)
    brand_id: Mapped[int] = mapped_column(ForeignKey('device_brand.id'), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(50), nullable=False)
    verification_date: Mapped[Date] = mapped_column(Date, nullable=False)
    verification_interval: Mapped[int] = mapped_column(Integer, nullable=False)
    next_verification_date: Mapped[Date] = mapped_column(Date, nullable=False)


# История приборов
class DevicesHistory(Base):
    __tablename__ = 'devices_history'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey('devices.id'), nullable=False)
    change_date: Mapped[Date] = mapped_column(Date, nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)


# Организация
class Organisation(Base):
    """
    Модель для представления организаций в системе.

    Атрибуты:
        organization_code (str): Код организации, ссылающийся на таблицу 'codes'.
        organisation_name (str): Название организации.
        postal_address (str): Почтовый адрес организации.
        legal_form (str): Организационно-правовая форма организации.
        inn (str): Идентификационный номер налогоплательщика (ИНН) организации.
        hydrographic_unit_code (str): Код географической единицы, ссылающийся на таблицу 'codes'.
    """
    __tablename__ = 'organisation'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_code: Mapped[str] = mapped_column(String(255), nullable=False)
    organisation_name: Mapped[str] = mapped_column(String(255), nullable=False)
    postal_address: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_form: Mapped[str] = mapped_column(String(100), nullable=False)
    inn: Mapped[str] = mapped_column(String(12), nullable=False)
    # скорее всего это печатка была в схеме БД:
    # pool_district_id: Mapped[int] = mapped_column(ForeignKey('pool_district.id'), nullable=False)
    # hydrographic_unit_code_id: Mapped[str] = mapped_column(ForeignKey('codes.id'), nullable=False)


class OrganisationHydrographicUnitCode(Base):
    __tablename__ = 'organisation_hydrounit_codes'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisation.id'), nullable=False)
    hydrographic_unit_code: Mapped[str] = mapped_column(String(255), nullable=False)


# История разрешений
class PermissionHistory(Base):
    __tablename__ = 'permission_history'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey('permissions.id'), nullable=False)
    change_date: Mapped[Date] = mapped_column(Date, nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)


# Разрешения
class Permissions(Base):
    """
    Модель для представления разрешений, связанных с организациями.

    Атрибуты:
        organisation_id (int): Идентификатор организации, к которой относится разрешение (внешний ключ).
        permission_number (str): Номер разрешения, уникальный для каждой записи.
        registration_date (Date): Дата регистрации разрешения.
        expiration_date (Date): Дата истечения срока действия.
        permission_type (str): Тип разрешения, например, забор, сброс и т.п.
        allowed_volume (float): Допустимый объем, связанный с разрешением (например, объем воды).
    """
    __tablename__ = 'permissions'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisation.id'), nullable=False)
    permission_number: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_date: Mapped[Date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[Date] = mapped_column(Date, nullable=False)
    permission_type: Mapped[str] = mapped_column(String(10), nullable=False)
    allowed_volume: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)


# Точка-разрешение
class PointPermissionLink(Base):
    __tablename__ = 'point_permission_link'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    point_id: Mapped[int] = mapped_column(ForeignKey('water_point.id'), nullable=False)
    permission_id: Mapped[int] = mapped_column(ForeignKey('permissions.id'), nullable=False)
    actual_start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    actual_end_date: Mapped[Date] = mapped_column(Date, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False)


# Место отбора проб
class SamplingLocation(Base):
    __tablename__ = 'sampling_location'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude_longitude: Mapped[str] = mapped_column(String(100), nullable=False)
    water_body_id: Mapped[int] = mapped_column(ForeignKey('water_body.id'), nullable=False)


# Нормативы
class Standarts(Base):
    __tablename__ = 'standarts'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    substance_id: Mapped[int] = mapped_column(ForeignKey('substances.id'), nullable=False)
    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisation.id'), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    document_path: Mapped[int] = mapped_column(String, nullable=False)


# Вещества
class Substances(Base):
    __tablename__ = 'substances'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    maximum_permissible_concentration: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)


# Забор поверхностной воды
class SurfaceWaterWithdrawal(Base):
    __tablename__ = 'surface_water_withdrawal'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    actual: Mapped[float] = mapped_column(Float, nullable=True)  # 3.1
    population: Mapped[float] = mapped_column(Float, nullable=True)
    other: Mapped[str] = mapped_column(Text, nullable=True)


# Водохозяйственный участок
class WaterArea(Base):
    __tablename__ = 'water_area'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # area_name: Mapped[str] = mapped_column(String(255), nullable=False)  # можно получить по коду
    code_area_id: Mapped[str] = mapped_column(ForeignKey('codes.id'), nullable=False)
    water_pool_id: Mapped[int] = mapped_column(ForeignKey('water_pool.id'), nullable=False)  # Бассейновый округ


# Водный обьект
class WaterBody(Base):
    __tablename__ = 'water_body'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # name: Mapped[str] = mapped_column(String(255), nullable=False
    code_type_id: Mapped[str] = mapped_column(ForeignKey('codes.id'), nullable=False)
    code_body_id: Mapped[str] = mapped_column(ForeignKey('codes.id'), nullable=False)
    water_area_id: Mapped[int] = mapped_column(ForeignKey('water_area.id'), nullable=False)  # водохоз. участок


# Журнал учета водопотребления
class WaterConsumptionLog(Base):
    __tablename__ = 'water_consumption_log'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    point_id: Mapped[int] = mapped_column(ForeignKey('water_point.id'), nullable=False)
    consumption_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)  # показания расхода
    # water_treatment_code_id: Mapped[int] = mapped_column(ForeignKey('codes.id'), nullable=False) ???????????????


# Точка забора и сброса
class WaterPoint(Base):
    __tablename__ = 'water_point'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey('organisation.id'), nullable=False)
    water_body_id: Mapped[int] = mapped_column(ForeignKey('water_body.id'), nullable=False)
    latitude_longitude: Mapped[str] = mapped_column(String(100), nullable=False)
    point_type: Mapped[str] = mapped_column(String(10), nullable=False)


# Водный бассейн
class WaterPool(Base):
    __tablename__ = 'water_pool'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pool_name: Mapped[str] = mapped_column(String(255), nullable=False)


# Степень очистки
class WaterTreatment(Base):
    """
    Модель для представления степеней очистки воды.

    Атрибуты:
        name_level (str): Название степени очистки. Возможные значения:
            - "всего"
            - "без очистки"
            - "недостаточно очищено"
            - "нормативно чистые (без очистки)"
            - "нормативно очищенных биологически"
            - "нормативно очищенных физико-химически"
            - "нормативно очищенных механически"
    """
    __tablename__ = 'water_treatment'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # name_level: Mapped[str] = mapped_column(String(255), nullable=False)
    name_level: Mapped[str] = mapped_column(Enum(
        "total",
        "without_cleaning",
        "not_suff_cleaned",
        "standard_without_cleaning",
        "standard_biological",
        "standard_physico_chemical",
        "standard_mechanical",
        name="water_treatment_levels"
    ), nullable=False)


# Сотрудники
class Employees(Base):
    __tablename__ = 'employees'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    middle_name: Mapped[str] = mapped_column(String(50), nullable=True)
    birth_date: Mapped[Date] = mapped_column(Date, nullable=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False)

# class TypeTable(enum.Enum):
#     Employee = (0, Employees)
#
#     def __init__(self, value, cls):
#         self._value_ = value
#         self.cls = cls
#
#     @classmethod
#     def get_class(cls, type_enum):
#         return type_enum.cls
