import React, { useState, useEffect } from "react";
import { fetchWaterObjects } from "../api/records.js";
import { sendFormData } from "../api/add_records.js";
import { fetchSingleTableData } from "../api/fetch_records.js";
import { useNotification } from "./NotificationContext.js";
import "../css/WaterReport.css";
import "../css/Rates.css";
import { translate } from "../utils/translations.js";

function WaterReportForm() {
  const quarters = {
    1: ["январь", "февраль", "март"],
    2: ["апрель", "май", "июнь"],
    3: ["июль", "август", "сентябрь"],
    4: ["октябрь", "ноябрь", "декабрь"],
  };
  // Текущий год и квартал по дате
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const [year, setYear] = useState(currentYear);

  const [quarter, setQuarter] = useState(currentQuarter);
  const [data, setData] = useState(
    quarters[currentQuarter].map((month) => ({
      month,
      fact: 0,
      population: 0,
      other: 0,
    }))
  );
  const [waterObjects, setWaterObjects] = useState([]);
  const [selectedWaterObject, setSelectedWaterObject] = useState(null);
  const [role, setRole] = useState(null);
  const { showSuccess, showError } = useNotification();
  const [alertVisible, setAlertVisible] = useState(false);

  const showAlert = () => {
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 20000);
  };


  // Генерация списка годов от текущего до 1991
  const yearsList = Array.from(
    { length: currentYear - 1990 },
    (_, i) => currentYear - i
  );


  const orgData = localStorage.getItem("org");
  let orgInfo = {};

  if (orgData) {
    try {
      orgInfo = JSON.parse(orgData);
    } catch (error) {
      console.error("Ошибка парсинга org:", error);
    }
  }

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

    if (role === "EMPLOYEE" || role === "ORG_ADMIN") {
      loadWaterObjects();
    }
  }, [role]);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const allRecords = await fetchSingleTableData("wcl_category");

        if (selectedWaterObject && year && quarter) {
          const quarterMonths = {
            1: ["JANUARY", "FEBRUARY", "MARCH"],
            2: ["APRIL", "MAY", "JUNE"],
            3: ["JULY", "AUGUST", "SEPTEMBER"],
            4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
          };

          const filteredRecords = allRecords.filter(
            (record) =>
            record.water_point_id.id === parseInt(selectedWaterObject) &&
            record.created_at.includes(year) &&
            quarterMonths[quarter].includes(record.month)
          );

          const groupedData = filteredRecords.reduce((acc, record) => {
            const month = record.month;
            if (!acc[month]) {
              acc[month] = { month, fact: 0, population: 0, other: 0 };
            }

            if (record.category === "ACTUAL") acc[month].fact += record.value;
            if (record.category === "POPULATION") acc[month].population += record.value;
            if (record.category === "OTHER") acc[month].other += record.value;

            return acc;
          }, {});

          const updatedData = Object.values(groupedData);
          setData(updatedData);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных отчета:", error);
      }
    };

    if (role === "ORG_ADMIN") {
      loadReportData();
    }
  }, [selectedWaterObject, year, quarter, role]);

  const handleQuarterChange = (event) => {
    const selectedQuarter = parseInt(event.target.value);

    // Если выбран текущий год, запретить выбирать будущий квартал
    if (year === currentYear && selectedQuarter > currentQuarter) {
      showError(`❌ Нельзя выбрать квартал больше текущего (${currentQuarter}) в текущем году`);
      return;
    }

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

  const handleYearChange = (event) => {
    const selectedYear = parseInt(event.target.value);
    setYear(selectedYear);

    // При смене года если выбран текущий, проверяем квартал
    if (selectedYear === currentYear && quarter > currentQuarter) {
      setQuarter(currentQuarter);
      setData(
        quarters[currentQuarter].map((month) => ({
          month,
          fact: 0,
          population: 0,
          other: 0,
        }))
      );
      showError(`❗ Квартал изменён на текущий (${currentQuarter}) для выбранного текущего года.`);
    }
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
    if (!selectedWaterObject) {
      showError("❗️ Пожалуйста, выберите точку забора.");
      return;
    }
    if (year > currentYear) {
      showError("❌ Нельзя выбрать будущий год.");
      return;
    }
    if (year === currentYear && quarter > currentQuarter) {
      showError("❌ Нельзя выбрать будущий квартал в текущем году.");
      return;
    }

    try {
      const response = await sendFormData("send_quarter", {
        waterPointId: selectedWaterObject,
        quarter,
        year,
        data,
        org_id: orgInfo.id
      });
      showSuccess();
    } catch (error) {
      showError();
      console.error("Ошибка при отправке данных", error.message);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="water-report-form">
    <div className="content-container_waterReropt">
    <h2 align="center">
    {role === "EMPLOYEE"
      ? 'Ввод показаний "Забор поверхностной воды за квартал"'
      : 'Просмотр данных "Забор поверхностной воды за квартал"'}
      </h2>

      {role === "EMPLOYEE" ? (
        <>
        <div className="selectors">
        <div className="selector-row">
        <label>Выберите точку забора:</label>
        <select
        className="custom-select"
        value={selectedWaterObject || ""}
        onChange={(e) => setSelectedWaterObject(e.target.value)}
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
        </div>

        <div className="selector-row">
        <label>Выберите квартал:</label>
        <select
        className="custom-select"
        value={quarter}
        onChange={handleQuarterChange}
        >
        {[1, 2, 3, 4].map((q) => (
          <option
          key={q}
          value={q}
          disabled={year === currentYear && q > currentQuarter}
          >
          {q} квартал
          </option>
        ))}
        </select>
        </div>

        <div className="selector-row">
        <label>Выберите год:</label>
        <select
        className="custom-select"
        value={year}
        onChange={handleYearChange}
        >
        {yearsList.map((y) => (
          <option key={y} value={y}>
          {y}
          </option>
        ))}
        </select>
        </div>

        </div>

        <table className="data-table-result">
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
          className="narrow-input"
          value={row.fact}
          onChange={(e) => handleInputChange(index, "fact", e.target.value)}
          />
          </td>
          <td>
          <input
          type="number"
          className="narrow-input"
          value={row.population}
          onChange={(e) => handleInputChange(index, "population", e.target.value)}
          />
          </td>
          <td>
          <input
          type="number"
          className="narrow-input"
          value={row.other}
          onChange={(e) => handleInputChange(index, "other", e.target.value)}
          />
          </td>
          </tr>
        ))}
        </tbody>
        </table>

        <table className="data-table-result">
        <thead>
        <tr>
        <th colSpan="3">Итого</th>
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

        {alertVisible && (
          <div className="custom-alert">✅ Данные успешно отправлены!</div>
        )}

        <button className="btn btn-success" onClick={handleSubmit}>
        Отправить
        </button>
        </>
      ) : (
        <>
        <div className="selectors">
        <div className="selector-row">
        <label>Выберите точку забора:</label>
        <select
        className="custom-select"
        value={selectedWaterObject || ""}
        onChange={(e) => setSelectedWaterObject(e.target.value)}
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
        </div>

        <div className="selector-row">
        <label>Выберите квартал:</label>
        <select
        className="custom-select"
        value={quarter}
        onChange={handleQuarterChange}
        >
        {[1, 2, 3, 4].map((q) => (
          <option
          key={q}
          value={q}
          disabled={year === currentYear && q > currentQuarter}
          >
          {q} квартал
          </option>
        ))}
        </select>
        </div>

        <div className="selector-row">
        <label>Выберите год:</label>
        <select
        className="custom-select"
        value={year}
        onChange={handleYearChange}
        >
        {yearsList.map((y) => (
          <option key={y} value={y}>
          {y}
          </option>
        ))}
        </select>
        </div>
        </div>

        <table className="data-table-result">
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

        <table className="data-table-result">
        <thead>
        <tr>
        <th colSpan="3">Итого</th>
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
        </>
      )}

      </div>
      </div>
  );
}

export default WaterReportForm;
