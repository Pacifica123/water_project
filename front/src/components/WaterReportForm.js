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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  // --- SAFE QUARTER CHECK ---
  const safeQuarterMonths = quarters[currentQuarter] || [];

  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(currentQuarter);
  const [data, setData] = useState(
    safeQuarterMonths.map((month) => ({
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
    setTimeout(() => setAlertVisible(false), 20000);
  };

  const yearsList = Array.from(
    { length: currentYear - 1990 },
    (_, i) => currentYear - i
  );

  // ---------------- ROLE + OBJECTS ----------------
  useEffect(() => {
    const checkRole = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        const userRole = userData?.role?.replace("UserRoles.", "") || null;
        setRole(userRole);
      } catch (error) {
        console.error("Ошибка при проверке роли", error);
      }
    };

    checkRole();

    const loadWaterObjects = async () => {
      try {
        if (!role) return;
        if (role !== "EMPLOYEE" && role !== "ORG_ADMIN") return;

        const objects = await fetchWaterObjects(role);
        setWaterObjects(Array.isArray(objects) ? objects : []);
      } catch (error) {
        console.error("Ошибка загрузки водных объектов", error);
      }
    };

    loadWaterObjects();
  }, [role]);

  // ---------------- LOAD QUARTER DATA ----------------
  useEffect(() => {
    const loadReportData = async () => {
      try {
        if (!selectedWaterObject || !quarter || !year) return;

        const allRecords = await fetchSingleTableData("wcl_category");

        if (!Array.isArray(allRecords)) {
          console.error("Некорректные данные из API");
          return;
        }

        const quarterMonths = {
          1: ["JANUARY", "FEBRUARY", "MARCH"],
          2: ["APRIL", "MAY", "JUNE"],
          3: ["JULY", "AUGUST", "SEPTEMBER"],
          4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
        };

        const qMonths = quarterMonths[quarter] || [];

        const filteredRecords = allRecords.filter(
          (record) =>
            record?.water_point_id?.id === parseInt(selectedWaterObject) &&
            record.year === year &&
            qMonths.includes(record.month)
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

        // Если данных нет, показываем пустые строки
        const updatedData =
          Object.values(groupedData).length > 0
            ? Object.values(groupedData)
            : (quarters[quarter] || []).map((m) => ({
                month: m,
                fact: 0,
                population: 0,
                other: 0,
              }));

        setData(updatedData);
      } catch (error) {
        console.error("Ошибка загрузки данных отчёта:", error);
      }
    };

    if (role === "ORG_ADMIN") {
      loadReportData();
    }
  }, [selectedWaterObject, year, quarter, role]);

  // ---------------- CHANGE QUARTER ----------------
  const handleQuarterChange = (event) => {
    const selectedQuarter = parseInt(event.target.value);

    if (!quarters[selectedQuarter]) {
      showError("Ошибка: выбран некорректный квартал");
      return;
    }

    if (year === currentYear && selectedQuarter > currentQuarter) {
      showError(`❌ Нельзя выбрать будущий квартал (${currentQuarter})`);
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

  // ---------------- CHANGE YEAR ----------------
  const handleYearChange = (event) => {
    const selectedYear = parseInt(event.target.value);
    setYear(selectedYear);

    // если выбран текущий год — корректируем квартал
    if (selectedYear === currentYear && quarter > currentQuarter) {
      setQuarter(currentQuarter);

      const safeMonths = quarters[currentQuarter] || [];

      setData(
        safeMonths.map((month) => ({
          month,
          fact: 0,
          population: 0,
          other: 0,
        }))
      );

      showError(`❗ Квартал изменён на текущий (${currentQuarter})`);
    }
  };

  // ---------------- VALIDATION ----------------
  const handleInputChange = (index, field, value) => {
    let sanitized = value.replace(/[^0-9.]/g, "");
    sanitized = sanitized.replace(/^0+(?=\d)/, "");
    const newValue = sanitized === "" ? "0" : sanitized;

    const updatedData = [...data];
    const currentRow = updatedData[index];

    const fact = field === "fact" ? parseFloat(newValue) : parseFloat(currentRow.fact);
    const population =
      field === "population" ? parseFloat(newValue) : parseFloat(currentRow.population);
    const other = field === "other" ? parseFloat(newValue) : parseFloat(currentRow.other);

    if ((field === "population" || field === "other") && population + other > fact) {
      showError("❗ 'Население' + 'Прочее' не могут превышать 'Факт'");
      return;
    }

    if (field === "fact" && population + other > parseFloat(newValue)) {
      showError("❗ 'Факт' не может быть меньше суммы 'Население' + 'Прочее'");
      return;
    }

    updatedData[index][field] = newValue;
    setData(updatedData);
  };

  // ---------------- SEND ----------------
  const userData = JSON.parse(localStorage.getItem("user")) || {};

  const calculateTotals = () =>
    data.reduce(
      (totals, row) => ({
        fact: totals.fact + parseFloat(row.fact || 0),
        population: totals.population + parseFloat(row.population || 0),
        other: totals.other + parseFloat(row.other || 0),
      }),
      { fact: 0, population: 0, other: 0 }
    );

  const handleSubmit = async () => {
    if (!selectedWaterObject) {
      showError("❗ Выберите точку забора");
      return;
    }
    if (year > currentYear) {
      showError("❌ Нельзя выбрать будущий год");
      return;
    }
    if (year === currentYear && quarter > currentQuarter) {
      showError("❌ Нельзя выбрать будущий квартал");
      return;
    }

    try {
      await sendFormData("send_quarter", {
        waterPointId: selectedWaterObject,
        quarter,
        year,
        data,
        org_id: userData?.organisation_id,
      });
      showSuccess();
      showAlert();
    } catch (error) {
      showError("Ошибка отправки");
    }
  };

  const totals = calculateTotals();

  // ---------- RENDER ----------
  return (
    <div className="water-report-form">
      <div className="content-container_waterReropt">
        <h2 align="center">
          {role === "EMPLOYEE"
            ? 'Ввод показаний "Забор поверхностной воды за квартал"'
            : 'Просмотр данных "Забор поверхностной воды за квартал"'}
        </h2>

        {/* --- SELECTORS --- */}
        <div className="selectors">
          <div className="selector-row">
            <label>Выберите точку забора:</label>
            <select
              className="custom-select"
              value={selectedWaterObject || ""}
              onChange={(e) => setSelectedWaterObject(e.target.value)}
            >
              <option value="">Выберите точку</option>
              {waterObjects.map((obj) => (
                <option key={obj.id} value={obj.water_body_id.id}>
                  {obj.water_body_id.code_obj.code_value} -{" "}
                  {obj.water_body_id.code_obj.code_symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="selector-row">
            <label>Выберите квартал:</label>
            <select className="custom-select" value={quarter} onChange={handleQuarterChange}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  {q} квартал
                </option>
              ))}
            </select>
          </div>

          <div className="selector-row">
            <label>Выберите год:</label>
            <select className="custom-select" value={year} onChange={handleYearChange}>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* --- TABLES --- */}
        <table className="data-table-result">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Факт</th>
              <th>Население</th>
              <th>Прочее</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{translate(row.month)}</td>
                <td>
                  {role === "EMPLOYEE" ? (
                    <input
                      type="number"
                      className="narrow-input"
                      value={row.fact}
                      onChange={(e) => handleInputChange(index, "fact", e.target.value)}
                    />
                  ) : (
                    row.fact
                  )}
                </td>
                <td>
                  {role === "EMPLOYEE" ? (
                    <input
                      type="number"
                      className="narrow-input"
                      value={row.population}
                      onChange={(e) => handleInputChange(index, "population", e.target.value)}
                    />
                  ) : (
                    row.population
                  )}
                </td>
                <td>
                  {role === "EMPLOYEE" ? (
                    <input
                      type="number"
                      className="narrow-input"
                      value={row.other}
                      onChange={(e) => handleInputChange(index, "other", e.target.value)}
                    />
                  ) : (
                    row.other
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* --- TOTALS --- */}
        <table className="data-table-result">
          <thead>
            <tr>
              <th colSpan="3">Итого</th>
            </tr>
            <tr>
              <th>Факт</th>
              <th>Население</th>
              <th>Прочее</th>
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

        {alertVisible && <div className="custom-alert">✅ Данные успешно отправлены!</div>}

        {role === "EMPLOYEE" && (
          <button className="btn btn-success" onClick={handleSubmit}>
            Отправить
          </button>
        )}
      </div>
    </div>
  );
}

export default WaterReportForm;
