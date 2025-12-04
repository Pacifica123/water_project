import React, { useEffect, useState } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchSingleTableData } from "../api/fetch_records";
import "../css/Rates.css";
import "../css/alert.css";
import { validateAndCorrectDate } from "../components/Checks.js";

function CombinedRatesCoefs() {
  const [coefs, setCoefs] = useState([]);
  const [rates, setRates] = useState([]);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // === Date Mode ===
  const [dateMode, setDateMode] = useState("current");

  // === New entries ===
  const [newRate, setNewRate] = useState({
    start_date: todayStr,
    value: "",
    rate_type: "population",
  });
  const [newCoef, setNewCoef] = useState({
    coeftype: "other_method",
    start_date: todayStr,
    value: "",
  });

  // === Modals and Alerts ===
  const [showRateModal, setShowRateModal] = useState(false);
  const [showCoefModal, setShowCoefModal] = useState(false);
  const [rateAlertVisible, setRateAlertVisible] = useState(false);
  const [coefAlertVisible, setCoefAlertVisible] = useState(false);

  // === Pagination ===
  const [pageRates, setPageRates] = useState(1);
  const [pageCoefs, setPageCoefs] = useState(1);
  const perPage = 4;

  // === Fetch data ===
  useEffect(() => {
    fetchSingleTableData("rates").then((data) => setRates(data || []));
    fetchSingleTableData("up_coef").then((data) => setCoefs(data || []));
  }, []);

  // === Date limits ===
  const getDateLimits = () => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const prevLast = new Date(today.getFullYear(), today.getMonth(), 0)
      .toISOString()
      .split("T")[0];
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      .toISOString()
      .split("T")[0];

    switch (dateMode) {
      case "past":
        return { min: "2000-01-01", max: prevLast };
      case "current":
        return { min: firstDay, max: todayStr };
      case "future":
        return { min: tomorrow, max: "9999-12-31" };
      default:
        return { min: todayStr, max: todayStr };
    }
  };

  // === Latest values ===
  const getLatestRates = () => {
    const map = {};
    rates.forEach((r) => {
      if (new Date(r.start_date) <= today) {
        const key = r.rate_type.toLowerCase();
        if (!map[key] || new Date(r.start_date) > new Date(map[key].start_date)) map[key] = r;
      }
    });
    return map;
  };

  const getLatestCoefs = () => {
    const map = {};
    coefs.forEach((c) => {
      if (new Date(c.start_date) <= today) {
        const key = c.coeftype.toLowerCase();
        if (!map[key] || new Date(c.start_date) > new Date(map[key].start_date)) map[key] = c;
      }
    });
    return map;
  };

  const latestRates = getLatestRates();
  const latestCoefs = getLatestCoefs();

  // === Future checks for warnings ===
  const hasFutureRate = rates.some((r) => new Date(r.start_date) > today);
  const hasFutureCoef = coefs.some((c) => new Date(c.start_date) > today);

  // === Handlers ===
  const handleRateChange = (e) => {
    const { name, value } = e.target;
    if (name === "start_date") {
      setNewRate({ ...newRate, start_date: validateAndCorrectDate(value) });
    } else setNewRate({ ...newRate, [name]: value });
  };

  const handleCoefChange = (e) => {
    const { name, value } = e.target;
    setNewCoef({ ...newCoef, [name]: value });
  };

  const submitRate = async (e) => {
    e.preventDefault();
    await sendSingleData("rates", newRate);
    const updated = await fetchSingleTableData("rates");
    setRates(updated || []);
    setShowRateModal(false);
    setRateAlertVisible(true);
    setTimeout(() => setRateAlertVisible(false), 3000);
    setNewRate({ start_date: todayStr, value: "", rate_type: "population" });
  };

  const submitCoef = async (e) => {
    e.preventDefault();
    await sendSingleData("up_coef", newCoef);
    const updated = await fetchSingleTableData("up_coef");
    setCoefs(updated || []);
    setShowCoefModal(false);
    setCoefAlertVisible(true);
    setTimeout(() => setCoefAlertVisible(false), 3000);
    setNewCoef({ coeftype: "other_method", start_date: todayStr, value: "" });
  };

  // === Formatting ===
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatRateType = (t) =>
    ({
      population: "Население - прибор",
      org: "Предприятие - прибор",
      other_population: "Население - другой метод",
      OUT_PERMISSION: "Предприятие - другой метод",
    }[t.toLowerCase()] || t);

  const formatCoefType = (t) =>
    ({
      other_method: "Другой метод",
      out_permission: "Превышение",
    }[t.toLowerCase()] || t);

  // === Pagination Buttons JSX ===
  const renderPagination = (currentPage, setPage, totalItems) => (
    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px" , marginBottom:"10px"}}>
      <button
        disabled={currentPage * perPage >= totalItems}
        onClick={() => setPage(currentPage + 1)}
        className="pagination-button"
      >
        Вперед
      </button>
      <button
        disabled={currentPage === 1}
        onClick={() => setPage(currentPage - 1)}
        className="pagination-button"
      >
        Назад
      </button>
    </div>
  );

  return (
    <div className="combined-container" style={{ display: "flex", gap: "10px" }}>
      {/* === Rates === */}
      <section className="water-Rates-form">
        <div className="rates-container">
          <h2 style={{ textAlign: "center" }}>Ставки за водопотребление</h2>

          <h3 style={{ textAlign: "center" }}>Текущие</h3>
          {Object.entries(latestRates).length === 0 ? (
            <p>Нет данных</p>
          ) : (
            Object.entries(latestRates).map(([k, r]) => (
              <div key={k}>
                <b>{formatRateType(k)}</b>: {r.value} руб. (с {formatDate(r.start_date)})
              </div>
            ))
          )}

          {hasFutureRate && <p style={{ color: "red" }}>Есть будущая ставка</p>}

          <h3 style={{ textAlign: "center" }}>История</h3>
          <table className="data-table-result">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Ставка</th>
                <th>Тип</th>
              </tr>
            </thead>
            <tbody>
              {rates
                .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                .slice((pageRates - 1) * perPage, pageRates * perPage)
                .map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.start_date)}</td>
                    <td>{r.value}</td>
                    <td>{formatRateType(r.rate_type)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {renderPagination(pageRates, setPageRates, rates.length)}

          <button className="submit-button-WaterReportForm" onClick={() => setShowRateModal(true)}>Добавить</button>
          {rateAlertVisible && <div className="custom-alert">✅ Ставка успешно добавлена!</div>}

          {showRateModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Добавить ставку</h3>
                <form onSubmit={submitRate}>
                  <label>
                    Добавление:
                    <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                      <option value="past">Прошлая</option>
                      <option value="current">Текущая</option>
                      <option value="future">Будущая</option>
                    </select>
                  </label>
                  <label>
                    Дата:
                    <input type="date" name="start_date" value={newRate.start_date} min={getDateLimits().min} max={getDateLimits().max} onChange={handleRateChange} required />
                  </label>
                  <label>
                    Ставка:
                    <input type="number" step="0.01" name="value" value={newRate.value} onChange={handleRateChange} required />
                  </label>
                  <label>
                    Тип:
                    <select name="rate_type" value={newRate.rate_type} onChange={handleRateChange}>
                      <option value="population">Население</option>
                      <option value="org">Предприятие</option>
                    </select>
                  </label>
                  <div className="modal-buttons">
                    <button className="modal-edit-button" type="submit">Сохранить</button>
                    <button className="modal-back-button" type="button" onClick={() => setShowRateModal(false)}>Отмена</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* === Coefs === */}
      <section className="water-Rates-form">
        <div className="upcoef-container">
          <h2 style={{ textAlign: "center" }}>Повышающие коэффициенты</h2>

          <h3 style={{ textAlign: "center" }}>Текущие</h3>
          <div>
            <div><b>{formatCoefType("other_method")}:</b> {latestCoefs["other_method"]?.value ?? "-"} (с {latestCoefs["other_method"]?.start_date ? formatDate(latestCoefs["other_method"].start_date) : "-"})</div>
            <div><b>{formatCoefType("out_permission")}:</b> {latestCoefs["out_permission"]?.value ?? "-"} (с {latestCoefs["out_permission"]?.start_date ? formatDate(latestCoefs["out_permission"].start_date) : "-"})</div>
          </div>

          {hasFutureCoef && <p style={{ color: "red" }}>Есть будущий коэффициент</p>}

          <h3 style={{ textAlign: "center" }}>История</h3>
          <table className="data-table-result">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Значение</th>
              </tr>
            </thead>
            <tbody>
              {coefs
                .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                .slice((pageCoefs - 1) * perPage, pageCoefs * perPage)
                .map((c, i) => (
                  <tr key={i}>
                    <td>{formatDate(c.start_date)}</td>
                    <td>{formatCoefType(c.coeftype)}</td>
                    <td>{c.value}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {renderPagination(pageCoefs, setPageCoefs, coefs.length)}

          <button className="submit-button-WaterReportForm" onClick={() => setShowCoefModal(true)}>Добавить</button>
          {coefAlertVisible && <div className="custom-alert">✅ Коэффициент успешно добавлен!</div>}

          {showCoefModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Добавить коэффициент</h3>
                <form onSubmit={submitCoef}>
                  <label>
                    Добавление:
                    <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                      <option value="past">Прошлое</option>
                      <option value="current">Текущая</option>
                      <option value="future">Будущее</option>
                    </select>
                  </label>
                  <label>
                    Дата:
                    <input type="date" name="start_date" value={newCoef.start_date} min={getDateLimits().min} max={getDateLimits().max} onChange={handleCoefChange} required />
                  </label>
                  <label>
                    Значение:
                    <input type="number" step="0.01" name="value" value={newCoef.value} onChange={handleCoefChange} required />
                  </label>
                  <label>
                    Тип:
                    <select name="coeftype" value={newCoef.coeftype} onChange={handleCoefChange}>
                      <option value="other_method">Другой метод</option>
                      <option value="out_permission">Превышение</option>
                    </select>
                  </label>
                  <div className="modal-buttons">
                    <button className="modal-edit-button" type="submit">Сохранить</button>
                    <button className="modal-back-button" type="button" onClick={() => setShowCoefModal(false)}>Отмена</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default CombinedRatesCoefs;
