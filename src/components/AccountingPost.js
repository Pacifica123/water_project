import React, { useState, useEffect } from "react";
import "../css/Water.css";
import {
  fetchSingleTableData,
  fetchSingleTableDataWithFilters,
  fetchStructDataWithFilters,
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

  return (
    <div className="accounting-container">
    <h2 align="center">Журнал учета водопотребления</h2>

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
            <button onClick={() => handleExpandLog(log.id)}>
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

          <FileUpload
          label="Загрузить PDF-скан"
          accept="application/pdf"
          icon="📄"
          entityType="water_consumption_log"
          entityId={logId}
          fileType="MONTH_CLOSURE_SCAN"
          preview={true}
          onUpload={uploadFileToBackend}
          />

          <FileUpload
          label="Загрузить sig-файл подписи"
          accept=".sig"
          icon="🔏"
          entityType="water_consumption_log"
          entityId={logId}
          fileType="SIGNATURE"
          preview={false}
          onUpload={uploadFileToBackend}
          />

          </div>
        ) : null
      )}
      </div>
    )}
    </div>
  );
};

export default AccountingPost;
