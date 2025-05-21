from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from db.config import DATABASE_URI
from db.models import (
    Base, ChemicalAnalysisProtocol, Codes, Concentrates, MetersBrandRef,
    Meters, Organisations, Permissions, PointPermissionLink,
    SamplingLocation, StandartsRef, SubstancesRef, WaterAreaRef, WaterObjectRef,
    WaterConsumptionLog, WaterPoint, WaterPoolRef, User)
from utils.pre_initial_for_app_records import init_records


# def setup_database():
#     engine = create_engine(DATABASE_URI)
#     Base.metadata.create_all(engine)
#     init_records(get_session(engine))
#     return engine
def setup_database(delete_db=False):
    db_name = DATABASE_URI.split('/')[-1]
    if delete_db:
        # Создаем новый URI для тестовой базы данных
        test_db_uri = DATABASE_URI.replace(db_name, "test_practic")
        engine = create_engine(test_db_uri)

        # Удаляем базу данных, если она существует
        metadata = MetaData()
        metadata.reflect(bind=engine)  # Загружаем метаданные текущей базы данных

        # Удаляем все таблицы
        metadata.drop_all(bind=engine)

        # Создаем новую базу данных
        Base.metadata.create_all(engine)
    else:
        # Если не нужно удалять, используем стандартный URI
        engine = create_engine(DATABASE_URI)
        Base.metadata.create_all(engine)

    init_records(get_session(engine))
    return engine


def get_session(engine):
    Session = sessionmaker(bind=engine)
    return Session()
