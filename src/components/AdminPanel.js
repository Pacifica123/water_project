import React, { useEffect, useState } from "react";
import { fetchStructureData, fetchSingleTableData } from "../api/fetch_records.js"; // Функции получения данных
import { sendSingleData, sendUpdateData, sendDeleteData } from "../api/add_records.js"; // Функция для отправки данных
import Modal from "./Modal"; // Компонент модального окна
import axios from "axios";

const AdminPanel = () => {
    // Основные состояния
    const [tableList, setTableList] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableRecords, setTableRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({});
    // Дополнительное состояние для хранения схемы выбранной модели
    const [modelSchema, setModelSchema] = useState(null);
    // Состояние для режима редактирования (false - добавление, true - редактирование)
    const [isEditMode, setIsEditMode] = useState(false);

    // Получение списка таблиц при монтировании компонента
    useEffect(() => {
        const getTableList = async () => {
            setIsLoading(true);
            try {
                const response = await fetchStructureData("allModels");
                console.log('Полученные данные:', response.data);
                // Преобразуем данные в нужный формат
                const tableListData = response.data.map(([displayName, modelName]) => ({ [displayName]: modelName }));
                console.log('Преобразованные данные:', tableListData);
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
            const schema = await fetchStructureData("schema_"+modelName);
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
        setFormData(record);
        setIsEditMode(true);
        setModalVisible(true);
    };

    // Обработчик сабмита формы. Здесь динамически собираем объект данных, исходя из схемы
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        // Инициализация объекта данных. Можно добавить валидацию и проверки типов
        let dataToSend = {};
        if (modelSchema && modelSchema.data) {
            modelSchema.data.filter((field) => field.field !== "id").forEach((field) => {
                // В зависимости от типа поля можно выполнить преобразования
                // Если значение отсутствует, можно задать значение по умолчанию
                let value = formData[field.field] || "";
                // Если поле связано с внешним ключом, значение должно быть выбрано из options
                // Здесь можно добавить дополнительную логику, например, проверку, что value входит в options
                if (field.type.includes("BOOLEAN")) {
                    value = formData[field.field] === "on"; // Преобразуем значение checkbox в boolean
                }

                dataToSend[field.field] = value;
            });
        } else {
            // Если схема не получена, используем formData как есть (но это крайний случай)
            dataToSend = { ...formData };

        }

        try {
            if (isEditMode) {
                // Отправляем данные для обновления
                await sendUpdateData(selectedTable, formData.id, dataToSend); // Передаем ID записи для обновления
            } else {
                // Отправляем данные для создания
                await sendSingleData(selectedTable, dataToSend);
            }

            handleSelectTable(selectedTable);
            setModalVisible(false);
        } catch (error) {
            console.error(
                `Ошибка при ${isEditMode ? "редактировании" : "добавлении"} записи:`,
                error
            );
        }
    };

    // Пример запроса схемы модели (подводные камни: отсутствие схемы на бэкенде, несоответствие типов)
    const fetchModelSchema = async (modelName) => {
        try {
            // Здесь предполагается, что API предоставляет эндпоинт для схемы модели
            const response = await axios.get(`http://127.0.0.1:5000/api/schema/${modelName}`);
            // Пример ожидаемого формата: [{ field: "organisation_name", type: "string", foreignKey: false }, ...]
            return response.data;
        } catch (error) {
            console.error("Ошибка получения схемы модели:", error);
            return null;
        }
    };

    // Рендер списка таблиц
    const renderTableList = () => (
        <div>
        <h2>Список таблиц</h2>
        {tableList.length === 0 && <div>Нет данных</div>}
        <ul>
        {tableList.map((table, idx) => {
            const [displayName, modelName] = Object.entries(table)[0];
            return (
                <li key={idx}>
                <button onClick={() => handleSelectTable(modelName)}>
                {displayName}
                </button>
                </li>
            );
        })}
        </ul>
        </div>
    );


    // Рендер списка записей выбранной таблицы с CRUD-кнопками
    const renderTableRecords = () => (
        <div>
        <button onClick={() => { setSelectedTable(null); setModelSchema(null); }}>Назад к таблицам</button>
        <h2>Записи таблицы: {selectedTable}</h2>
        <button onClick={handleAddButton}>Добавить запись</button>
        {isLoading ? (
            <div>Загрузка...</div>
        ) : tableRecords && tableRecords.length > 0 ? (
            <table>
            <thead>
            <tr>
            {Object.keys(tableRecords[0]).map((key, index) => (
                <th key={index}>{key}</th>
            ))}
            <th>Действия</th>
            </tr>
            </thead>
            <tbody>
            {tableRecords.map((record) => (
                <tr key={record.id}>
                {Object.values(record).map((value, idx) => (
                    <td key={idx}>{value?.toString()}</td>
                ))}
                <td>
                <button onClick={() => handleEditButton(record)}>Редактировать</button>
                <button onClick={() => handleDeleteRecord(record.id)}>Удалить</button>
                </td>
                </tr>
            ))}
            </tbody>
            </table>
        ) : (
            <div>Записей не найдено</div>
        )}
        </div>
    );

    // Функция для удаления записи
    const handleDeleteRecord = async (recordId) => {
        try {
            await sendDeleteData(selectedTable, recordId);
            handleSelectTable(selectedTable); // Обновить таблицу после удаления
        } catch (error) {
            console.error("Ошибка удаления записи:", error);
        }
    };

    // Рендер модального окна с динамической формой
    const renderModal = () => (
        <Modal onClose={() => setModalVisible(false)}>
        <h3>{isEditMode ? "Редактировать запись" : "Добавить запись"}</h3>
        <form onSubmit={handleFormSubmit}>
        {modelSchema && modelSchema.data ? (
            modelSchema.data.filter((field) => field.field !== "id").map((field, index) => (

                <div key={index} style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                {field.field}:
                </label>
                {/* Если поле связано с внешним ключом, отрисовываем селект */}
                {field.foreignKey ? (
                    <select value={formData[field.field] || ""} onChange={(e) =>
                        setFormData({ ...formData, [field.field]: e.target.value })
                    }>
                    <option value="">Выберите значение</option>
                    {field.options.map((opt, idx) => (
                        <option key={idx} value={opt.value}>
                        {opt.label}
                        </option>
                    ))}
                    </select>
                ) : (
                    <input
                    type={getInputType(field.type)}
                    value={formData[field.field] || ""}
                    onChange={(e) =>
                        setFormData({ ...formData, [field.field]: e.target.value })
                    }
                    />
                )}
                </div>
            ))
        ) : (
            <div>Схема модели не получена.</div>
        )}
        <button type="submit">
        {isEditMode ? "Сохранить изменения" : "Добавить"}
        </button>
        </form>
        </Modal>
    );

    // Функция для определения типа input в зависимости от типа поля
    const getInputType = (type) => {
        switch (type) {
            case "VARCHAR":
            case "TEXT":
                return "text";
            case "DATE":
                return "date";
            case "DATETIME":
                return "datetime-local";
            case "BOOLEAN":
                return "checkbox";
            case "INTEGER":
                return "number";
            default:
                return "text";
        }
    };


    // Пример компонента для внешнего ключа, который выполняет отдельный запрос для получения значений
    const ForeignKeySelect = ({ field, value, onChange }) => {
        const [options, setOptions] = useState([]);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            const fetchOptions = async () => {
                setLoading(true);
                try {
                    // Пример запроса: API должен вернуть список вариантов для данного внешнего ключа
                    const response = await axios.get(`http://127.0.0.1:5000/api/options/${field.field}`);
                    setOptions(response.data);
                } catch (error) {
                    console.error("Ошибка получения опций для", field.field, error);
                } finally {
                    setLoading(false);
                }
            };
            fetchOptions();
        }, [field.field]);

        return (
            <select value={value} onChange={(e) => onChange(e.target.value)}>
            {loading ? (
                <option>Загрузка...</option>
            ) : (
                <>
                <option value="">Выберите значение</option>
                {options.map((opt, idx) => (
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
        <h1>Админ-панель</h1>
        {isLoading && <div>Загрузка...</div>}
        {!selectedTable ? renderTableList() : renderTableRecords()}
        {modalVisible && renderModal()}
        </div>
    );
};

export default AdminPanel;
