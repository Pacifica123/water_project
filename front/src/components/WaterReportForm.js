// import React, { useState, useEffect } from "react";
// import axios from "axios";
import {fetchWaterObjects }from "../api/records.js";
import {sendFormData} from "../api/add_records.js";
import { fetchSingleTableData, fetchStructDataWithFilters } from "../api/fetch_records.js";
import { useNotification } from "./NotificationContext.js";


import React, { useState, useEffect } from "react";
import { translate } from "../utils/translations.js";

function WaterReportForm() {
  const [quarter, setQuarter] = useState(1);
  const [data, setData] = useState([
    { month: "январь", fact: 0, population: 0, other: 0 },
    { month: "февраль", fact: 0, population: 0, other: 0 },
    { month: "март", fact: 0, population: 0, other: 0 },
  ]);


  const [waterObjects, setWaterObjects] = useState([]);
  const [selectedWaterObject, setSelectedWaterObject] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [role, setRole] = useState(null);

  // useEffect для  фактического из Журнала
  useEffect(() =>{
    const loadActualData = async () => {
      const quarterMonthsEnum = {
        1: ["JANUARY", "FEBRUARY", "MARCH"],
        2: ["APRIL", "MAY", "JUNE"],
        3: ["JULY", "AUGUST", "SEPTEMBER"],
        4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
      };
      if (role !== "EMPLOYEE" || !selectedWaterObject || !year || !quarter) return;

      try {
        const filters = {
          year,
          water_point_id: parseInt(selectedWaterObject),
            months: quarterMonthsEnum[quarter],
        };

        const result = await fetchStructDataWithFilters("get_actual_from_log", filters);
        console.log(result);

        const newData = quarters[quarter].map((monthRu, idx) => {
          const monthEn = quarterMonthsEnum[quarter][idx];
          return {
            month: monthRu,
            fact: result.data[monthEn] || 0,
            population: 0,
            other: 0,
          };
        });
        console.log(newData);
        setData(newData);
      } catch (error) {
        console.error("Ошибка загрузки фактических данных:", error);
      }
    };

    loadActualData();
  }, [selectedWaterObject, year, quarter, role]);


  // Новый useEffect для загрузки данных REPORT_ADMIN
  useEffect(() => {
    const loadReportData = async () => {
      try {
        const allRecords = await fetchSingleTableData("wcl_category");

        if (selectedWaterObject && year && quarter) {
          // Определяем квартал как массив месяцев
          const quarterMonths = {
            1: ["JANUARY", "FEBRUARY", "MARCH"],
            2: ["APRIL", "MAY", "JUNE"],
            3: ["JULY", "AUGUST", "SEPTEMBER"],
            4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
          };

          // Фильтруем по точке забора, году и месяцу, входящему в выбранный квартал
          const filteredRecords = allRecords.filter(
            (record) =>
            record.water_point_id.id === parseInt(selectedWaterObject) &&
            record.created_at.includes(year) && // проверка года в формате строки "2025"
            quarterMonths[quarter].includes(record.month)
          );

          console.log("Отсортированные справки:", filteredRecords);

          // Группируем по месяцам и суммируем значения категорий
          const groupedData = filteredRecords.reduce((acc, record) => {
            const month = record.month; // Прямое использование ENUM-значения
            if (!acc[month]) {
              acc[month] = { month, fact: 0, population: 0, other: 0 };
            }

            // Суммируем значения по категориям
            if (record.category === "ACTUAL") acc[month].fact += record.value;
            if (record.category === "POPULATION") acc[month].population += record.value;
            if (record.category === "OTHER") acc[month].other += record.value;

            return acc;
          }, {});

          // Преобразуем сгруппированные данные в массив и обновляем состояние
          const updatedData = Object.values(groupedData);
          setData(updatedData);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных отчета:", error);
      }
    };

    if (role === "REPORT_ADMIN") {
      loadReportData();
    }
  }, [selectedWaterObject, year, quarter, role]); // Вызываем, когда изменяется выбранная точка

  useEffect(() => {


    const checkRole = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        const userRole = userData?.role.replace("UserRoles.", "");
        setRole(userRole);
      } catch (error) {
        console.error("Ошибка при проверке роли пользователя", error);
      }
    };
    checkRole();
    const loadWaterObjects = async () => {
      try {
        const objects = await fetchWaterObjects(role);
        setWaterObjects(objects);
      } catch (error) {
        console.error("Ошибка загрузки водных объектов", error);
      }
    };
    if (role === "EMPLOYEE" || role === "REPORT_ADMIN") {
      console.log("Роль перед loadWaterObjects: ", role);
      loadWaterObjects();
    }
  }, [role]);

  const [alertVisible, setAlertVisible] = useState(false);

  const showAlert = () => {
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 20000);
  };


  const quarters = {
    1: ["январь", "февраль", "март"],
    2: ["апрель", "май", "июнь"],
    3: ["июль", "август", "сентябрь"],
    4: ["октябрь", "ноябрь", "декабрь"],
  };

  const handleQuarterChange = (event) => {
    const selectedQuarter = parseInt(event.target.value);
    setQuarter(selectedQuarter);
    setData(
      quarters[selectedQuarter].map((month) => ({
        month,
        fact: 0,
        population: 0,
        other: 0,
      }))
    );
  };

  const handleInputChange = (index, field, value) => {
    let sanitized = value.replace(/[^0-9.]/g, "");
    sanitized = sanitized.replace(/^0+(?=\d)/, "");
    const newValue = sanitized === "" ? "0" : sanitized;

    const updatedData = [...data];
    const currentRow = updatedData[index];

    const fact = field === "fact" ? parseFloat(newValue) : parseFloat(currentRow.fact);
    const population = field === "population" ? parseFloat(newValue) : parseFloat(currentRow.population);
    const other = field === "other" ? parseFloat(newValue) : parseFloat(currentRow.other);

    // Проверка: сумма population + other не должна превышать fact
    if ((field === "population" || field === "other") && (population + other > fact)) {
      showError("❗️ Сумма 'Население' и 'Прочее' не может превышать значение 'Факт'.");
      return;
    }

    if (field === "fact" && (population + other > parseFloat(newValue))) {
      showError("❗️ 'Факт' не может быть меньше суммы 'Население' и 'Прочее'.");
      return;
    }

    updatedData[index][field] = newValue;
    setData(updatedData);
  };


  const sanitizeNumberInput = (value) => {
    const cleaned = value.replace(/^0+(?=\d)/, ""); // убираем начальные нули
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100; // округление до 2 знаков
  };



  const {showSuccess, showError} = useNotification();

  const calculateTotals = () => {
    return data.reduce(
      (totals, row) => ({
        fact: totals.fact + parseFloat(row.fact || 0),
                        population: totals.population + parseFloat(row.population || 0),
                        other: totals.other + parseFloat(row.other || 0),
      }),
      { fact: 0, population: 0, other: 0 }
    );
  };


  const handleSubmit = async () => {
    try {
      const response = await sendFormData("send_quarter", {'waterPointId': selectedWaterObject, 'quarter': quarter, 'data': data});
      console.log("Данные успешно отправлены", response);
      showSuccess();
    } catch (error) {
      showError();
      console.error("Ошибка при отправке данных", error.message);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="water-report-form">
    <div className="content-container-waterReropt">
    <h2  align="center" >
    {role === "EMPLOYEE"
      ? 'Ввод показаний "Забор поверхностной воды за квартал"'
      : 'Просмотр данных "Забор поверхностной воды за квартал"'}
      </h2>
      {role === "EMPLOYEE" ? (
        // Интерфейс для EMPLOYEE
        <>
        <div className="selectors">
        <div className="selector-row">
        <label>
        Выберите точку забора:
        <select
        className="custom-select"
        value={selectedWaterObject}
        onChange={(e) => setSelectedWaterObject(e.target.value)}
        disabled={role !== "EMPLOYEE"} // Disable для админа
        >
        <option value="">Выберите точку забора/сброса</option>
        {waterObjects.map((obj) => (
          <option
          key={obj.id}
          value={obj.water_body_id.id}
          >
          {obj.water_body_id.code_obj.code_value} - {obj.water_body_id.code_obj.code_symbol}
          </option>
        ))}
        </select>
        </label>
        <label>
        Выберите квартал:
        <select
        className="custom-select"
        value={quarter}
        onChange={handleQuarterChange}
        disabled={role !== "EMPLOYEE"} // Disable для админа
        >
        <option value={1}>1 квартал</option>
        <option value={2}>2 квартал</option>
        <option value={3}>3 квартал</option>
        <option value={4}>4 квартал</option>
        </select>
        </label>
        </div>
        </div>
        <table className="data-table">
        <thead>
        <tr>
        <th>Дата</th>
        <th>Факт, тыс. м3</th>
        <th>Население, тыс. м3</th>
        <th>Прочее, тыс. м3</th>
        </tr>
        </thead>
        <tbody>
        {data.map((row, index) => (
          <tr key={index}>
          <td>{translate(row.month)}</td>
          <td>
          <input
          type="number"
          pattern="[0-9]*"
          className="narrow-input"
          value={row.fact}
          onChange={(e) =>
            handleInputChange(index, "fact", e.target.value)
          }
          />
          </td>
          <td>
          <input
          type="number"
          pattern="[0-9]*"
          className="narrow-input"
          value={row.population}
          onChange={(e) =>
            handleInputChange(index, "population", e.target.value)
          }
          />
          </td>
          <td>
          <input
          type="number"
          pattern="[0-9]*"
          className="narrow-input"
          value={row.other}
          onChange={(e) =>
            handleInputChange(index, "other", e.target.value)
          }
          />
          </td>
          </tr>
        ))}
        </tbody>
        </table>
        <div>
        <table className="data-table-result">
        <thead>
        <tr>
        <th colSpan="3" >Итого</th>
        </tr>
        <tr>
        <th>Факт, тыс. м3</th>
        <th>Население, тыс. м3</th>
        <th>Прочее, тыс. м3</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td>{totals.fact}</td>
        <td>{totals.population}</td>
        <td>{totals.other}</td>
        </tr>
        </tbody>
        </table>
        </div>
        {alertVisible && (
          <div className="custom-alert">
          ✅ Данные успешно отправлены!
          </div>
        )}
        <button className="submit-button-WaterReportForm" onClick={handleSubmit}>
        Отправить
        </button>
        </>
      ) : (
        // Интерфейс для REPORT_ADMIN
        <>
        <div className="selectors">
        <div className="selector-row">
        <label>
        Выберите квартал:
        <select
        className="custom-select"
        value={quarter}
        onChange={handleQuarterChange}
        >
        <option value={1}>1 квартал</option>
        <option value={2}>2 квартал</option>
        <option value={3}>3 квартал</option>
        <option value={4}>4 квартал</option>
        </select>
        </label>
        <label>
        Выберите год:
        <select
        className="custom-select"
        value={year}
        onChange={(e) => setYear(parseInt(e.target.value))}
        >
        {Array.from({ length: 10 }, (_, i) => {
          const yearValue = new Date().getFullYear() - i;
          return (
            <option key={yearValue} value={yearValue}>
            {yearValue}
            </option>
          );
        })}
        </select>
        </label>
        <label>
        Выберите точку забора:
        <select
        className="custom-select"
        value={selectedWaterObject}
        onChange={(e) => setSelectedWaterObject(e.target.value)}
        >
        <option value="">Выберите точку забора/сброса</option>
        {waterObjects.map((obj) => (
          <option
          key={obj.id}
          value={obj.id}
          >
          {obj.water_body_id.code_obj.code_value} - {obj.water_body_id.code_obj.code_symbol}
          </option>
        ))}
        </select>
        </label>
        </div>
        </div>
        {/* Отображение данных для REPORT_ADMIN */}
        <table className="data-table">
        <thead>
        <tr>
        <th>Дата</th>
        <th>Факт, тыс. м3</th>
        <th>Население, тыс. м3</th>
        <th>Прочее, тыс. м3</th>
        </tr>
        </thead>
        <tbody>
        {data.map((row, index) => (
          <tr key={index}>
          <td>{translate(row.month)}</td>
          <td>{row.fact}</td>
          <td>{row.population}</td>
          <td>{row.other}</td>
          </tr>
        ))}
        </tbody>
        </table>
        <div>
        <table className="data-table-result">
        <thead>
        <tr>
        <th colSpan="3" >Итого</th>
        </tr>
        <tr>
        <th>Факт, тыс. м3</th>
        <th>Население, тыс. м3</th>
        <th>Прочее, тыс. м3</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td>{totals.fact}</td>
        <td>{totals.population}</td>
        <td>{totals.other}</td>
        </tr>
        </tbody>
        </table>
        </div>
        </>

      )}
      </div>
      </div>
  );
}



export default WaterReportForm;
