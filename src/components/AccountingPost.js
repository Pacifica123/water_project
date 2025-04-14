import React, { useState, useEffect } from "react";
import "../css/Water.css";
import {
  fetchSingleTableData,
  fetchSingleTableDataWithFilters,
  fetchStructDataWithFilters,
} from "../api/fetch_records";

const AccountingPost = () => {
  const [filteredLogs, setFilteredLogs] = useState([]); // Данные журнала
  const [waterObjectsByPoints, setwaterObjectsByPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Статус загрузки
  const [error, setError] = useState(null); // Ошибки при фетчинге данных
  const [allLogs, setAllLogs] = useState([]); // Все загруженные журналы
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth()); // Фильтр по месяцу
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear()); // Фильтр по году
  const [statusFilters, setStatusFilters] = useState({
    in_progress: true,
    is_done: true,
    sent: true,
    under_watch: true,
    under_correction: true,
    closed: true,
  }); // Фильтры по статусу
  const [expandedLogs, setExpandedLogs] = useState({}); // Раскрытые журналы
  const [logDetails, setLogDetails] = useState({}); // Детали журналов

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
          console.log("Все Журналы: ", response);
          // Преобразуем данные в нужный формат
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

        // Фильтр по месяцу и году
        const dateFilter = (monthFilter === new Date().getMonth() || logMonth === monthFilter) &&
        (yearFilter === new Date().getFullYear() || logYear === yearFilter);

        // Фильтр по статусу
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
    setStatusFilters((prevStatus) => ({ ...prevStatus, [name]: checked }));
  };

  const handleExpandLog = async (logId) => {
    if (expandedLogs[logId]) {
      setExpandedLogs((prevExpanded) => ({ ...prevExpanded, [logId]: false }));
      setLogDetails((prevDetails) => ({ ...prevDetails, [logId]: null }));
    } else {
      try {
        const response = await fetchStructDataWithFilters("log_details", {
          log_id: logId,
        });
        console.log(response);
        if (response && response.data) {
          console.log(response.data);
          setLogDetails((prevDetails) => ({ ...prevDetails, [logId]: response.data }));
        } else {
          setLogDetails((prevDetails) => ({ ...prevDetails, [logId]: null }));
        }
      } catch (error) {
        console.error("Ошибка загрузки деталей журнала", error);
        setLogDetails((prevDetails) => ({ ...prevDetails, [logId]: null }));
      }

      setExpandedLogs((prevExpanded) => ({ ...prevExpanded, [logId]: true }));
    }
  };

  return (
    <div className="accounting-container">
    <h2>Журнал учета водопотребления</h2>

    {isLoading ? (
      <p>Загрузка данных...</p>
    ) : error ? (
      <p>{error}</p>
    ) : (
      <div>
      <div className="filters">
      <select value={monthFilter} onChange={handleMonthChange}>
      <option value={new Date().getMonth()}>Текущий месяц</option>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => (
        <option key={month} value={month}>{new Date(2024, month, 1).toLocaleString('default', { month: 'long' })}</option>
      ))}
      </select>

      <select value={yearFilter} onChange={handleYearChange}>
      <option value={new Date().getFullYear()}>Текущий год</option>
      {[2020, 2021, 2022, 2023, 2024].map((year) => (
        <option key={year} value={year}>{year}</option>
      ))}
      </select>

      <div className="status-filters">
      <div className="dropdown">
      <button className="dropdown-toggle" type="button" id="statusDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      Статус
      </button>
      <div className="dropdown-menu" aria-labelledby="statusDropdown">
      <div className="form-check">
      <input
      type="checkbox"
      name="in_progress"
      checked={statusFilters.in_progress}
      onChange={handleStatusChange}
      className="form-check-input"
      />
      <label className="form-check-label">В процессе</label>
      </div>

      <div className="form-check">
      <input
      type="checkbox"
      name="is_done"
      checked={statusFilters.is_done}
      onChange={handleStatusChange}
      className="form-check-input"
      />
      <label className="form-check-label">Подписан</label>
      </div>

      <div className="form-check">
      <input
      type="checkbox"
      name="sent"
      checked={statusFilters.sent}
      onChange={handleStatusChange}
      className="form-check-input"
      />
      <label className="form-check-label">Отправлен</label>
      </div>

      <div className="form-check">
      <input
      type="checkbox"
      name="under_watch"
      checked={statusFilters.under_watch}
      onChange={handleStatusChange}
      className="form-check-input"
      />
      <label className="form-check-label">На рассмотрении</label>
      </div>

      <div className="form-check">
      <input
      type="checkbox"
      name="under_correction"
      checked={statusFilters.under_correction}
      onChange={handleStatusChange}
      className="form-check-input"
      />
      <label className="form-check-label">На доработке</label>
      </div>

      <div className="form-check">
      <input
      type="checkbox"
      name="closed"
      checked={statusFilters.closed}
      onChange={handleStatusChange}
      className="form-check-input"
      />
      <label className="form-check-label">Закрыт</label>
      </div>
      </div>
      </div>
      </div>
      </div>

      {filteredLogs.length === 0 ? (
        <p>Нет данных</p>
      ) : (
        <table className="accounting-table">
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
          <td>{log.point_type}</td>
          <td>{log.start_date}</td>
          <td>{log.status}</td>
          {userInfo.role === "UserRoles.EMPLOYEE" && (
            <td>
            <button onClick={() => handleExpandLog(log.id)}>Открыть журнал</button>
            {expandedLogs[log.id] && (
              <div className="log-details">
              {logDetails[log.id] ? (
                <div>
                <h3>Организация эксплуатации:</h3>
                <p>Название: {logDetails[log.id].exploitation_org.organisation_name}</p>
                <p>ID: {logDetails[log.id].exploitation_org.id}</p>

                <h3>Список измерений:</h3>
                <table>
                <thead>
                <tr>
                <th>Дата измерения</th>
                <th>Дней эксплуатации</th>
                <th>Расход воды (м³/день)</th>
                <th>Подпись лица</th>
                </tr>
                </thead>
                <tbody>
                {logDetails[log.id].wcl_list.map((measurement) => (
                  <tr key={measurement.measurement_date}>
                  <td>{measurement.measurement_date}</td>
                  <td>{measurement.operating_time_days}</td>
                  <td>{measurement.water_consumption_m3_per_day}</td>
                  <td>{measurement.person_signature}</td>
                  </tr>
                ))}
                </tbody>
                </table>
                </div>
              ) : (
                <p>Ошибка загрузки деталей журнала</p>
              )}
              </div>
            )}
            </td>
          )}
          </tr>
        ))}
        </tbody>
        </table>
      )}
      </div>
    )}
    </div>
  );
};

export default AccountingPost;
