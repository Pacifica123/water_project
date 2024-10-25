from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.config import DATABASE_URI
from db.models import (Base, ChemicalAnalysisProtocol, Codes, Concentrates, DeviceBrand,
                           Devices, DevicesHistory, Organisation, PermissionHistory, Permissions, PointPermissionLink,
                           SamplingLocation, Standarts, Substances, SurfaceWaterWithdrawal, WaterArea, WaterBody,
                           WaterConsumptionLog, WaterPoint, WaterPool, WaterTreatment, Employees)
from utils.pre_initial_for_app_records import init_records


def setup_database():
    engine = create_engine(DATABASE_URI)
    Base.metadata.create_all(engine)
    init_records(get_session(engine))
    return engine


def get_session(engine):
    Session = sessionmaker(bind=engine)
    return Session()
