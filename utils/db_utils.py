from db.crudcore import get_record_by_id
from utils.backend_utils import OperationStatus, get_model_class_by_tablename


def is_valid_foreign_key(table_name, id) -> bool:
    result = get_record_by_id(get_model_class_by_tablename(table_name), id)
    return result.status == OperationStatus.SUCCESS
