import React, { useState, useEffect } from "react";
import "../css/Water.css";
import {
  fetchSingleTableData,
  fetchSingleTableDataWithFilters,
  fetchStructDataWithFilters,
  fetchStructureData,
} from "../api/fetch_records";
import {
  uploadFileToBackend
} from "../api/add_files"
import {translate} from "../utils/translations.js";
import FileUpload from "./FileUpload";

const AccountingPost = () => {
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());


  const [statusFilters, setStatusFilters] = useState({
    in_progress: true,
    is_done: true,
    sent: true,
    under_watch: true,
    under_correction: true,
    closed: true,
  });
  const [expandedLogs, setExpandedLogs] = useState({});
  const [logDetails, setLogDetails] = useState({});


  // Для добавления нового пункта учета
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    organisation_id: "",
    water_body_id: "",
    latitude_longitude: "",
    point_type: "",
    existing_meter_id: ""
  });
  const [waterBodyOptions, setWaterBodyOptions] = useState([]);
  const [pointTypeOptions, setPointTypeOptions] = useState([]);
  const [meterOptions, setMeterOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [newMeterData, setNewMeterData] = useState({
    brand_id: "",
    serial_number: "",
    verification_date: "",
    verification_interval: "",
    next_verification_date: ""
  });
  const [permissionData, setPermissionData] = useState({
    permission_number: "",
    registration_date: "",
    expiration_date: "",
    permission_type: "",
    allowed_volume_org: "",
    allowed_volume_pop: "",
    method_type: "",
  });

  const userInfo = JSON.parse(localStorage.getItem("user"));
  const orgData = localStorage.getItem("org");
  let orgInfo = {};

  if (orgData) {
    try {
      orgInfo = JSON.parse(orgData);
    } catch (error) {
      console.error("Ошибка парсинга org:", error);
      orgInfo = {};
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchStructDataWithFilters("logs_for_AP", {
          role: userInfo.role,
          org_id: orgInfo?.id,
        });

        if (response && response.data) {
          const enrichedLogs = response.data.map((log) => {
            const waterBody = log.point_id?.water_body_id;
            const org = log.point_id?.organisation_id;

            return {
              id: log.id,
              water_body_name:
              waterBody?.code_obj_id?.code_value || "Без названия",
              organisation_name: org?.organisation_name || "Неизвестно",
              coordinates: log.point_id?.latitude_longitude || "-",
              point_type: log.point_id?.point_type || "-",
              start_date: log.start_date || "-",
              status: log.log_status || "Неизвестно",
            };
          });
          setAllLogs(enrichedLogs);
          setFilteredLogs(enrichedLogs);
        } else {
          setAllLogs([]);
          setFilteredLogs([]);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        setError("Не удалось загрузить данные");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      if (allLogs.length === 0) return;

      const filtered = allLogs.filter((log) => {
        const startDate = new Date(log.start_date);
        const logMonth = startDate.getMonth();
        const logYear = startDate.getFullYear();

        const dateFilter =
        (monthFilter === new Date().getMonth() || logMonth === monthFilter) &&
        (yearFilter === new Date().getFullYear() || logYear === yearFilter);

        const status = log.status.toLowerCase();
        const statusFilter = Object.keys(statusFilters).some((key) => {
          return statusFilters[key] && status.includes(key);
        });

        return dateFilter && statusFilter;
      });

      setFilteredLogs(filtered);
    };

    applyFilters();
  }, [monthFilter, yearFilter, statusFilters, allLogs]);

  const handleMonthChange = (event) => {
    setMonthFilter(parseInt(event.target.value));
  };

  const handleYearChange = (event) => {
    setYearFilter(parseInt(event.target.value));
  };

  // Загрузка параметров для формы при открытии модального окна
  useEffect(() => {
    if (!showAddModal) return;
    const loadStructure = async () => {
      try {
        const schema = await fetchStructureData("schema_water_point");
        if (schema && schema.data) {
          const waterField = schema.data.find(f => f.field === "water_body_id");
          const typeField = schema.data.find(f => f.field === "point_type");
          setWaterBodyOptions(waterField?.options || []);
          setPointTypeOptions(typeField?.options || []);
          setFormData(prev => ({ ...prev, organisation_id: orgInfo.id }));
        }
        // загружаем существующие приборы
        const meters = await fetchSingleTableDataWithFilters("meters", {"organisation_id": orgInfo.id});
        console.log("METERS : "+meters);
        setMeterOptions(meters?.data?.options || []);
        // загружаем марки приборов
        const brandSchema = await fetchStructureData("schema_meters_brand_ref");
        setBrandOptions(brandSchema?.data?.options || []);
      } catch (err) {
        console.error("Ошибка загрузки структуры формы", err);
      }
    };
    loadStructure();
  }, [showAddModal]);

  const handleStatusChange = (event) => {
    const { name, checked } = event.target;
    setStatusFilters((prev) => ({ ...prev, [name]: checked }));
  };

  const handleExpandLog = async (logId) => {
    if (expandedLogs[logId]) {
      setExpandedLogs((prev) => ({ ...prev, [logId]: false }));
      setLogDetails((prev) => ({ ...prev, [logId]: null }));
    } else {
      try {
        const response = await fetchStructDataWithFilters("log_details", {
          log_id: logId,
        });
        if (response && response.data) {
          setLogDetails((prev) => ({ ...prev, [logId]: response.data }));
        } else {
          setLogDetails((prev) => ({ ...prev, [logId]: null }));
        }
      } catch (error) {
        console.error("Ошибка загрузки деталей журнала", error);
        setLogDetails((prev) => ({ ...prev, [logId]: null }));
      }
      setExpandedLogs((prev) => ({ ...prev, [logId]: true }));
    }
  };

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const toggleStatusDropdown = () => {
    setStatusDropdownOpen((prev) => !prev);
  };

  const getStatusName = (key) => {
    const labels = {
      in_progress: 'В процессе',
      is_done: 'Подписан',
      sent: 'Отправлен',
      under_watch: 'На рассмотрении',
      under_correction: 'На доработке',
      closed: 'Закрыт',
    };
    return labels[key] || key;
  };
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewMeterChange = (e) => {
    const { name, value } = e.target;
    setNewMeterData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'verification_date' || name === 'verification_interval') {
        const date = new Date(updated.verification_date);
        const interval = parseInt(updated.verification_interval, 10);
        if (!isNaN(date.getTime()) && !isNaN(interval)) {
          date.setFullYear(date.getFullYear() + interval);
          updated.next_verification_date = date.toISOString().split('T')[0];
        }
      }
      return updated;
    });
  };

  const handleSaveNewPoint = async () => {
    console.log("Сохраняем новый пункт учета:", formData, newMeterData);
    setShowAddModal(false);
  };

  const handlePermissionChange = (e) => {
    const { name, value } = e.target;
    setPermissionData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const methodTypeOptions = [
    { value: "org", label: "Организации" },
    { value: "population", label: "Населению" },
    { value: "other_org", label: "Другая организация" },
    { value: "other_population", label: "Другое население" },
  ];



  return (
    <div className="accounting-container">
    <h2 align="center">Журнал учета водопотребления</h2>
    {/* Кнопка добавления нового пункта */}
    {userInfo.role === "UserRoles.EMPLOYEE" && (
      <div style={{ textAlign: 'right', margin: '10px 0' }}>
      <button className="custom-button" onClick={() => setShowAddModal(true)}>Добавить пункт учета</button>
      </div>
    )}

    {/* Модальное окно для добавления */}
    {showAddModal && (
      <div className="modal-overlay">
      <div className="modal-content">
      <div className="modal-left">

      <center><label>Организация:</label>
      <select name="organisation_id" value={formData.organisation_id} disabled>
      <option value={orgInfo.id}>{orgInfo.organisation_name}</option>
      </select>
      </center>
      <hr />
      <div className="label-modal">
      <label>Водный объект:</label>
      <select name="water_body_id" value={formData.water_body_id} onChange={handleFormChange}>
      <option value="">Выберите...</option>
      {waterBodyOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      </select>
      </div>
      <div className="label-modal">
      <label >Координаты (широта, долгота):</label>
      <input
      type="text"
      name="latitude_longitude"
      value={formData.latitude_longitude}
      onChange={handleFormChange}
      />
      </div>
      <div className="label-modal">
      <label> Тип пункта:</label>
      <select name="point_type" value={formData.point_type} onChange={handleFormChange}>
      <option value="">Выберите...</option>
      {pointTypeOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{translate(opt.label)}</option>
      ))}
      </select>
      </div>
      </div>
      <div className="modal-right">
      <div className="modal-upper-right">
      <div className="label-modal">
      <label>Выбрать существующий прибор:</label>
      <select name="existing_meter_id" value={formData.existing_meter_id} onChange={handleFormChange}>
      <option value="">Выберите...</option>
      {meterOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      </select>
      </div>
      <hr />

      <label>Ввести новый прибор:</label>
      <div className="new-meter-form">
      <label>Марка прибора:</label>
      <select name="brand_id" value={newMeterData.brand_id} onChange={handleNewMeterChange}>
      <option value="">Выберите...</option>
      {brandOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      </select>

      <label>Серийный номер:</label>
      <input
      type="text"
      name="serial_number"
      value={newMeterData.serial_number}
      onChange={handleNewMeterChange}
      />

      <label>Дата поверки:</label>
      <input
      type="date"
      name="verification_date"
      value={newMeterData.verification_date}
      onChange={handleNewMeterChange}
      />

      <label>Интервал поверки (лет):</label>
      <input
      type="number"
      name="verification_interval"
      value={newMeterData.verification_interval}
      onChange={handleNewMeterChange}
      />

      <label>Следующая поверка:</label>
      <input
      type="date"
      name="next_verification_date"
      value={newMeterData.next_verification_date}
      readOnly
      />
      </div>
      </div>
      <div className="permission-section">
      <h4>Разрешение на водопользование</h4>
      <div className="label-modal">
      <label>Номер разрешения:</label>
      <input
      type="text"
      name="permission_number"
      value={permissionData.permission_number}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Дата регистрации:</label>
      <input
      type="date"
      name="registration_date"
      value={permissionData.registration_date}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Дата окончания:</label>
      <input
      type="date"
      name="expiration_date"
      value={permissionData.expiration_date}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Тип разрешения:</label>
      <input
      type="text"
      name="permission_type"
      value={permissionData.permission_type}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Разрешённый объём (организации):</label>
      <input
      type="number"
      name="allowed_volume_org"
      value={permissionData.allowed_volume_org}
      onChange={handlePermissionChange}
      step="0.01"
      />
      </div>
      <div className="label-modal">
      <label>Разрешённый объём (население):</label>
      <input
      type="number"
      name="allowed_volume_pop"
      value={permissionData.allowed_volume_pop}
      onChange={handlePermissionChange}
      step="0.01"
      />
      </div>
      <div className="label-modal">
      <label>Тип метода:</label>
      <select
      name="method_type"
      value={permissionData.method_type}
      onChange={handlePermissionChange}
      >
      <option value="">Выберите...</option>
      {methodTypeOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      </select>
      </div>
      <div className="label-modal" style={{marginTop: 10, color: "#888", fontStyle: "italic"}}>
      место для загрузки pdf-скана разрешения
      </div>
      </div>

      <div className="modal-actions">
      <button className="add-button" onClick={handleSaveNewPoint}>Сохранить</button>
      <button className="delete-button" onClick={() => setShowAddModal(false)}>Отмена</button>
      </div>
      </div>
      </div>

      </div>
    )}


    {isLoading ? (
      <p>Загрузка данных...</p>
    ) : error ? (
      <p>{error}</p>
    ) : (
      <div>
      <div className="filters-container">
      <div className="filter-block">
      <label>Месяц: </label>
      <select value={monthFilter} onChange={handleMonthChange}>
      {[...Array(12)].map((_, month) => (
        <option key={month} value={month}>
        {new Date(2024, month, 1).toLocaleString('default', { month: 'long' })}
        </option>
      ))}
      </select>
      </div>

      <div className="filter-block">
      <label>Год: </label>
      <select value={yearFilter} onChange={handleYearChange}>
      {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
        <option key={year} value={year}>{year}</option>
      ))}
      </select>
      </div>

      <div className="filter-block">
      <label>Статус: </label>
      <button className="status-toggle" onClick={toggleStatusDropdown}>
      {statusDropdownOpen ? "Скрыть" : "Выбрать статусы"}
      </button>
      {statusDropdownOpen && (
        <div className="status-dropdown">
        {Object.keys(statusFilters).map((key) => (
          <label className="status-item" key={key}>
          <span className="status-label">{getStatusName(key)}</span>
          <input
          type="checkbox"
          name={key}
          checked={statusFilters[key]}
          onChange={handleStatusChange}
          />
          </label>
        ))}
        </div>
      )}
      </div>
      </div>



      {/* Таблица */}
      {filteredLogs.length === 0 ? (
        <p>Нет данных</p>
      ) : (
        <table className="data-table-accountingPost">
        <thead>
        <tr>
        {userInfo.role !== "UserRoles.EMPLOYEE" && (
          <th>Организация</th>
        )}
        <th>Название водного объекта</th>
        <th>Координаты</th>
        <th>Тип</th>
        <th>Дата открытия</th>
        <th>Статус</th>
        {userInfo.role === "UserRoles.EMPLOYEE" && (
          <th>Действия</th>
        )}
        </tr>
        </thead>
        <tbody>
        {filteredLogs.map((log) => (
          <tr key={log.id}>
          {userInfo.role !== "UserRoles.EMPLOYEE" && (
            <td>{log.organisation_name}</td>
          )}
          <td>{log.water_body_name}</td>
          <td>{log.coordinates}</td>
          <td>{translate(log.point_type)}</td>
          <td>{log.start_date}</td>
          <td>{translate(log.status)}</td>
          {userInfo.role === "UserRoles.EMPLOYEE" && (
            <td>
            <button className="custom-button" onClick={() => handleExpandLog(log.id)}>
            {expandedLogs[log.id] ? "Скрыть журнал" : "Открыть журнал"}
            </button>
            </td>
          )}
          </tr>
        ))}
        </tbody>
        </table>
      )}

      {/* 📘 Третий блок — журнал */}
      {Object.entries(expandedLogs).map(([logId, isExpanded]) =>
        isExpanded && logDetails[logId] ? (
          <div key={logId} className="log-details-container">
          <h3 align="center">Детали журнала (Номер журнала: {logId})</h3>
          <p align="center">
          <strong >Эксплуатирующая организация:</strong>{" "}
          {logDetails[logId].exploitation_org.organisation_name}
          </p>
          <table className="data-table-accountingPost">
          <thead>
          <tr>
          <th>Дата измерения</th>
          <th>Дней эксплуатации</th>
          <th>Расход воды (м³/день)</th>
          <th className="data-table-accountingPost-th">Подпись лица</th>
          </tr>
          </thead>
          <tbody>
          {logDetails[logId].wcl_list.map((m) => {
            // Преобразуем строку даты в объект Date
            const date = new Date(m.measurement_date);
            // Форматируем дату в нужный вид, например "дд.мм.гггг"
            const formattedDate = date.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            return (
              <tr key={m.measurement_date}>
              <td>{formattedDate}</td>
              <td>{m.operating_time_days}</td>
              <td>{m.water_consumption_m3_per_day}</td>
              <td>{m.person_signature}</td>
              </tr>
            );
          })}
          </tbody>

          </table>



          <div className="log-files-upload">
          <h4 style={{textAlign:"center"}}>Загрузка файлов:</h4>
          <div className="upload-row">
          <FileUpload
          label="PDF-скан"
          accept="application/pdf"
          icon="📄"
          entityType="water_consumption_log"
          entityId={logId}
          fileType="MONTH_CLOSURE_SCAN"
          preview={true}
          onUpload={uploadFileToBackend}
          />
          </div>
          <div className="upload-row">
          <FileUpload
          label="Sig-файл подписи"
          accept=".sig"
          icon="🔏"
          entityType="water_consumption_log"
          entityId={logId}
          fileType="SIGNATURE"
          preview={false}
          onUpload={uploadFileToBackend}
          />
          </div>
          </div>
          </div>
        ) : null
      )}
      </div>
    )}
    </div>
  );
};

export default AccountingPost;
