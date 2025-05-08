import React, { useEffect, useState } from "react";
import {
  fetchStructureData,
  fetchSingleTableData,
} from "../api/fetch_records.js"; // Функции получения данных
import {
  sendSingleData,
  sendUpdateData,
  sendDeleteData,
} from "../api/add_records.js"; // Функция для отправки данных
import Modal from "./Modal"; // Компонент модального окна
import axios from "axios";
import {translate} from "../utils/translations.js"
import { useNotification } from "./NotificationContext.js";

const AdminPanel = () => {
  // Основные состояния
  const [tableList, setTableList] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableRecords, setTableRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({});
  const { showSuccess, showEdit, showError, askConfirmation } = useNotification(); // глобальные уведомления
  // Дополнительное состояние для хранения схемы выбранной модели
  const [modelSchema, setModelSchema] = useState(null);
  // Состояние для режима редактирования (false - добавление, true - редактирование)
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState(null);
  const [showTechnicalFields, setShowTechnicalFields] = useState(false);
  // Получение списка таблиц при монтировании компонента
  useEffect(() => {
    const getTableList = async () => {
      setIsLoading(true);
      try {
        const response = await fetchStructureData("allModels");
        console.log("Полученные данные:", response.data);
        // Преобразуем данные в нужный формат
        const tableListData = response.data.map(([displayName, modelName]) => ({
          [displayName]: modelName,
        }));
        console.log("Преобразованные данные:", tableListData);
        setTableList(tableListData);
      } catch (error) {
        console.error("Ошибка загрузки списка таблиц:", error);
      } finally {
        setIsLoading(false);
      }
    };
    getTableList();
  }, []);

  // При выборе таблицы получаем её записи и схему модели (если есть)
  const handleSelectTable = async (modelName) => {
    setSelectedTable(modelName);
    setIsLoading(true);
    try {
      const records = await fetchSingleTableData(modelName);
      setTableRecords(records);
      // Здесь можно сделать дополнительный запрос для получения схемы модели, если API предоставляет её
      // Пример: const schema = await fetchModelSchema(modelName);
      // Для демонстрации предполагаем, что схема содержит массив объектов { field: "имя_поля", type: "тип", foreignKey: true/false, options: [...] }
      // const schema = await fetchModelSchema(modelName); TODO
      const schema = await fetchStructureData("schema_" + modelName);
      setModelSchema(schema);
    } catch (error) {
      console.error("Ошибка загрузки данных для таблицы", modelName, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для вызова модального окна в режиме добавления
  const handleAddButton = () => {
    setFormData({});
    setIsEditMode(false);
    setModalVisible(true);
  };

  // Функция для вызова модального окна в режиме редактирования
  const handleEditButton = (record) => {
    const cleanedRecord = { ...record };

    if (modelSchema?.data) {
      modelSchema.data.forEach((field) => {
        const fieldName = field.field;
        const rawValue = cleanedRecord[fieldName];

        if (rawValue === null || rawValue === undefined) {
          cleanedRecord[fieldName] = "";
          return;
        }

        // ENUM: всегда берем .value (строку)
        if (field.isEnum && typeof rawValue === "object") {
          cleanedRecord[fieldName] = rawValue.value ?? rawValue.label ?? "";
          return;
        }

        // foreignKey: если объект — берем id (если есть) или value (если строка)
        if (field.foreignKey && typeof rawValue === "object") {
          if (typeof rawValue.id === "number"  || typeof rawValue.id === "string") {
            cleanedRecord[fieldName] = rawValue.id;
          } else if (typeof rawValue.value === "string") {
            cleanedRecord[fieldName] = rawValue.value;
          } else {
            cleanedRecord[fieldName] = "";
          }
          return;
        }

        // BOOLEAN
        if (field.type === "BOOLEAN") {
          cleanedRecord[fieldName] = Boolean(rawValue);
          return;
        }

        // всё остальное оставляем как есть
        cleanedRecord[fieldName] = rawValue;
      });
    }

    setFormData(cleanedRecord);
    setIsEditMode(true);
    setModalVisible(true);
  };

  const [alertVisible, setAlertVisible] = useState(false);

  const showAlert = () => {
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 10000);
  };


  // Обработчик сабмита формы. Здесь динамически собираем объект данных, исходя из схемы
  const handleFormSubmit = async (e) => {

    e.preventDefault();
    const confirmed = await askConfirmation(
      isEditMode ? "Вы уверены, что хотите отредактировать запись?" : "Вы уверены, что хотите добавить новую запись?"
    );
    if (!confirmed) return;
    // Инициализация объекта данных.
    const dataToSend = {
      ...formData,
      created_by: "admin", // Автоподстановка
      created_at: isEditMode ? undefined : new Date().toISOString(), // Для новых записей
    };
    // Удаляем технические поля для редактирования
    if (isEditMode) {
      delete dataToSend.created_by;
      delete dataToSend.created_at;
      dataToSend.updated_by = "admin";
      dataToSend.updated_at = new Date().toISOString();
    }

    if (modelSchema && modelSchema.data) {
      modelSchema.data
      .filter((field) => field.field !== "id")
      .forEach((field) => {
        // В зависимости от типа поля можно выполнить преобразования
        // Если значение отсутствует, можно задать значение по умолчанию
        let value = formData[field.field] || "";
        // Если поле связано с внешним ключом, значение должно быть выбрано из options
        // Здесь можно добавить дополнительную логику, например, проверку, что value входит в options
        if (field.type.includes("BOOLEAN")) {
          value = formData[field.field] === "on"; // Преобразуем значение checkbox в boolean
        }

        // Проверка, если поле является ENUM
        if (field.isEnum) {
          // Находим ключ ENUM по значению
          const enumOptions = field.options || [];
          const enumKey = enumOptions.find((opt) => opt.value === value);
          console.log("Был выбран вариант: ", enumKey);
          if (enumKey) {
            value = enumKey.label; // Используем ключ вместо значения
          }
        }
        console.log(value);
        dataToSend[field.field] = value;
      });
    } else {
      // Если схема не получена, используем formData как есть (но это крайний случай)
      dataToSend = { ...formData };
    }

    try {
      if (isEditMode) {
        await sendUpdateData(selectedTable, formData.id, dataToSend);
        showEdit("✏️ Запись успешно отредактирована!");
      } else {
        await sendSingleData(selectedTable, dataToSend);
        showSuccess("✅ Запись успешно добавлена!");
      }

      handleSelectTable(selectedTable);
      setModalVisible(false);
    } catch (error) {
      console.error(
        'Ошибка при ${isEditMode ? "редактировании" : "добавлении"} записи:',
        error
      );
      setError(error.message);
      showError("❌ Ошибка при сохранении данных.");
    }
  };

  // Пример запроса схемы модели (подводные камни: отсутствие схемы на бэкенде, несоответствие типов)
  const fetchModelSchema = async (modelName) => {
    try {
      // Здесь предполагается, что API предоставляет эндпоинт для схемы модели
      const response = await axios.get(
        `http://127.0.0.1:5000/api/schema/${modelName}`,
      );
      // Пример ожидаемого формата: [{ field: "organisation_name", type: "string", foreignKey: false }, ...]
      return response.data;
    } catch (error) {
      console.error("Ошибка получения схемы модели:", error);
      return null;
    }
  };

  // Рендер списка таблиц
  const renderTableList = () => (
    <div className="content-container_for_renderTableList">
    <div className="table-section">
    <h2 className="table-title">Список таблиц</h2>
    {tableList.length === 0 && <div>Нет данных</div>}
    <ul className="table-grid">
    {tableList.map((table, idx) => {
      const [displayName, modelName] = Object.entries(table)[0];
      if (modelName === "history") return null;
      return (
        <li key={idx} className="table-item">
        <button
        className="table-card-button"
        onClick={() => handleSelectTable(modelName)}
        >
        {displayName}
        </button>
        </li>
      );
    })}
    </ul>
    </div>
    </div>
  );

  const renderCellValue = (value, fieldSchema) => {
    if (
      typeof value === "object" &&
      value !== null &&
      fieldSchema?.foreignKey
    ) {
      const id = value.id || "?";
      const displayKey = findDisplayKey(value);
      return displayKey ? `${id}. ${value[displayKey]}` : id;
    }
    return value !== null && value !== undefined ? value.toString() : "";
  };

  const findDisplayKey = (obj) => {
    const priorityKeys = ["name", "title", "organisation_name", "code_value"];
    return priorityKeys.find((key) => obj.hasOwnProperty(key));
  };

  // Рендер списка записей выбранной таблицы с CRUD-кнопками
  const renderTableRecords = () => (
    <div>
    <div className="content-container-admin">
    <button
    className="back-button"
    onClick={() => {
      setSelectedTable(null);
      setModelSchema(null);
    }}
    >
    Назад к таблицам
    </button>
    <h2>Записи таблицы: {translate(selectedTable)}</h2>
    <button className="submit-button" onClick={handleAddButton}>
    Добавить запись
    </button>
    <button
    className="submit-button"
    style={{ backgroundColor: showTechnicalFields ? "#6c757d" : "#17a2b8" }}
    onClick={() => setShowTechnicalFields(!showTechnicalFields)}
    >
    {showTechnicalFields ? "Скрыть тех. поля" : "Показать тех. поля"}
    </button>
    </div>
    {isLoading ? (
      <div>Загрузка...</div>
    ) : tableRecords && tableRecords.length > 0 ? (
      <div className="table-scroll-wrapper">
      <table className="data-table-admin">
      <thead>
      <tr>
      {Object.keys(tableRecords[0]).map((key, index) => (
        (!["created_by", "updated_by", "deleted_by", "created_at", "updated_at", "deleted_at"].includes(key) || showTechnicalFields) && (
          <th key={index}>{translate(key)}</th>
        )
      ))}
      <th>Действия</th>
      </tr>
      </thead>
      <tbody>
      {tableRecords.map((record) => {
        return (
          <tr key={record.id}>
          {Object.keys(record).map((key, idx) => {
            if (!["created_by", "updated_by", "deleted_by", "created_at", "updated_at", "deleted_at"].includes(key) || showTechnicalFields) {
              const fieldSchema = modelSchema?.data?.find((f) => f.field === key);
              return (
                <td key={idx}>
                {translate(renderCellValue(record[key], fieldSchema))}
                </td>
              );
            } else {
              return null;
            }
          })}
          <td>
          <button
          className="edit-button"
          onClick={() => handleEditButton(record)}
          >
          Редактировать
          </button>
          <button
          className="delete-button"
          onClick={() => handleDeleteRecord(record.id)}
          >
          Удалить
          </button>
          </td>
          </tr>
        );
      })}
      </tbody>
      </table>
      </div>
    ) : (
      <div>Записей не найдено</div>
    )}
    </div>
  );

  // Функция для удаления записи
  const handleDeleteRecord = async (recordId) => {
    const confirmed = await askConfirmation(
      "Вы уверены, что хотите удалить запись?"
    );
    if (!confirmed) return;
    try {
      await sendDeleteData(selectedTable, recordId);
      handleSelectTable(selectedTable); // Обновить таблицу после удаления
    } catch (error) {
      console.error("Ошибка удаления записи:", error);
    }
  };

  // Рендер модального окна с динамической формой
  const renderModal = () => (
    <Modal
    onClose={() => {
      setModalVisible(false);
      setError(null); // Сбрасываем ошибку при закрытии модального окна
    }}
    >
    <h3>{isEditMode ? "Редактировать запись" : "Добавить запись"}</h3>
    {error && <div className="error-message">{error}</div>}
    <form onSubmit={handleFormSubmit}>
    {modelSchema && modelSchema.data ? (
      modelSchema.data
      .filter(
        (field) =>
        field.field !== "id" &&
        ![
          "created_at",
          "created_by",
          "updated_at",
          // "updated_by",
          "is_deleted",
          "deleted_at",
          "deleted_by",
        ].includes(field.field)
      )
      .map((field, index) => (
        <div key={index} style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
        {translate(field.field)}:
        </label>
        {/* Если поле связано с внешним ключом или имеет опции, отрисовываем ForeignKeySelect */}
        {field.foreignKey ||
          field.options?.length > 0 ||
          field.isEnum ? (
            <ForeignKeySelect
            field={field}
            value={formData[field.field] || ""}
            onChange={(newValue) => {
              setFormData({ ...formData, [field.field]: newValue });
              if (formData[field.field]) {
                // Автоматическое сворачивание поля после заполнения
                document
                .getElementById(field.field)
                ?.classList.add("filled");
              }
            }}
            />
          ) : (
            <input
            type={getInputType(field.type)}
            value={formData[field.field] || ""}
            onChange={(e) => {
              setFormData({
                ...formData,
                [field.field]: e.target.value,
              });
              if (e.target.value) {
                // Автоматическое сворачивание поля после заполнения
                document
                .getElementById(field.field)
                ?.classList.add("filled");
              }
            }}
            id={field.field} // Добавление ID для управления классами
            />
          )}
          </div>
      ))
    ) : (
      <div>Схема модели не получена.</div>
    )}

    <center><button className="submit-button" type="submit">
    {isEditMode ? "Сохранить изменения" : "Добавить"}
    </button>
    </center>
    </form>
    </Modal>
  );

  // Пример стиля для скрытия/сворачивания поля после его заполнения
  const styles = {
    ".filled": {
      display: "none", // Скрывает поле, если оно заполнено
    },
  };

  // Функция для определения типа input в зависимости от типа поля
  const getInputType = (type) => {
    switch (type) {
      case "VARCHAR":
      case "TEXT":
      case "STRING":
        return "text";
      case "DATE":
        return "date";
      case "DATETIME":
      case "TIMESTAMP":
        return "datetime-local";
      case "BOOLEAN":
        return "checkbox";
      case "INTEGER":
      case "BIGINT":
      case "NUMERIC":
      case "DECIMAL":
        return "number";
      default:
        return "text";
    }
  };

  // Пример компонента для внешнего ключа, который выполняет отдельный запрос для получения значений
  const ForeignKeySelect = ({ field, value, onChange }) => {
    const [options, setOptions] = useState(field.options || []);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const fetchOptions = async () => {
        setLoading(true);
        try {
          if (field.isEnum) {
            console.log("В ForeignKeySelect попало!");
            // Если это перечисление, получаем варианты через API
            const response = await fetchStructureData("enum_" + field.enumType);
            console.log("Вот что попадет в setOptions: ", response.data);
            setOptions(response.data);
          } else if (field.foreignKey) {
            // Если это внешний ключ, используем существующие опции
            setOptions(field.options);
          } else {
            // Если это не перечисление и не внешний ключ, не делаем запрос
            setOptions([]);
          }
        } catch (error) {
          console.error("Ошибка получения опций для", field.field, error);
        } finally {
          setLoading(false);
        }
      };
      fetchOptions();
    }, [field.field, field.enumType]);

    return (
      <select
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      >
      {loading ? (
        <option>Загрузка...</option>
      ) : (
        <>
        <option value="">Выберите значение</option>
        {options?.map((opt, idx) => (
          <option key={idx} value={opt.value}>
          {opt.label}
          </option>
        ))}
        </>
      )}
      </select>
    );
  };

  return (
    <div className="admin-panel">
    {alertVisible && (
      <div className="custom-alert">
      ✅ Данные успешно добавлены!
      </div>
    )}
    <center><h1>Админ-панель</h1></center>
    {isLoading && <div>Загрузка...</div>}
    {!selectedTable ? (
      renderTableList()
    ) : (
      <div>{renderTableRecords()}</div>
    )}
    {modalVisible && renderModal()}
    </div>
  );
};

export default AdminPanel;
