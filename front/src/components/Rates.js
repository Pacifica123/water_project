import React, { useEffect, useState } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchSingleTableData } from "../api/fetch_records";
import "../css/Rates.css";
import "../css/alert.css";
import { validateAndCorrectDate } from "../components/Checks.js";

function CombinedRatesCoefs() {
    const [coefs, setCoefs] = useState([]);
    const [newCoef, setNewCoef] = useState({
        coeftype: "other_method",
        start_date: "",
        value: ""
    });
    const [showCoefModal, setShowCoefModal] = useState(false);
    const [coefAlertVisible, setCoefAlertVisible] = useState(false);

    const [rates, setRates] = useState(null);
    const [newRate, setNewRate] = useState({ start_date: "", value: "", rate_type: "population" });
    const [showRateModal, setShowRateModal] = useState(false);
    const [rateAlertVisible, setRateAlertVisible] = useState(false);

    useEffect(() => {
        async function fetchCoefs() {
            const data = await fetchSingleTableData("up_coef");
            setCoefs(data || []);
        }
        fetchCoefs();
    }, []);

    useEffect(() => {
        async function fetchRates() {
            const data = await fetchSingleTableData("rates");
            setRates(data || []);
        }
        fetchRates();
    }, []);

    const getLatestCoefs = () => {
        const latest = {};
        coefs.forEach(c => {
            const key = c.coeftype.toLowerCase();
            if (
                !latest[c.key] ||
                new Date(c.start_date) > new Date(latest[key].start_date)
            ) {
                latest[key] = c;
            }
        });
        return latest;
    };

    const getLatestRatesByType = () => {
        if (!rates || rates.length === 0) return {};

        const latestRates = {};
        rates.forEach(rate => {
            const type = rate.rate_type.toLowerCase();
            if (
                !latestRates[type] ||
                new Date(rate.start_date) > new Date(latestRates[type].start_date)
            ) {
                latestRates[type] = rate;
            }
        });
        return latestRates;
    };

    const formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("ru-RU", options);
    };

    const formatRateType = (rateType) => {
        const typeMap = {
            "population": "Население - прибор",
            "org": "Предприятие - прибор",
            "other_population": "Население - другой метод",
            "other_org": "Предприятие - другой метод"
        };
        return typeMap[rateType.toLowerCase()] || rateType;
    };

    const handleCoefChange = (e) => {
        const { name, value } = e.target;
        setNewCoef({ ...newCoef, [name]: value });
    };

    const showCoefAlert = () => {
        setCoefAlertVisible(true);
        setTimeout(() => {
            setCoefAlertVisible(false);
        }, 20000);
    };

    const handleCoefSubmit = async (e) => {
        e.preventDefault();
        await sendSingleData("up_coef", newCoef);
        setNewCoef({ coeftype: "other_method", start_date: "", value: "" });
        setShowCoefModal(false);

        const updated = await fetchSingleTableData("up_coef");
        setCoefs(updated || []);
        showCoefAlert();
    };

    const handleRateChange = (e) => {
        const { name, value } = e.target;
        if (name === "start_date") {
            setNewRate({ ...newRate, start_date: validateAndCorrectDate(value) });
        } else {
            setNewRate({ ...newRate, [name]: value });
        }
    };

    const showRateAlert = () => {
        setRateAlertVisible(true);
        setTimeout(() => {
            setRateAlertVisible(false);
        }, 20000);
    };

    const handleRateSubmit = async (e) => {
        e.preventDefault();
        await sendSingleData("rates", newRate);
        setNewRate({ start_date: "", value: "", rate_type: "population" });
        setShowRateModal(false);
        const updatedData = await fetchSingleTableData("rates");
        setRates(updatedData || []);
        showRateAlert();
    };

    const latestCoefs = getLatestCoefs();
    const latestRates = getLatestRatesByType();

    return (
        <div className="combined-container" style={{ display: "flex", gap: "10px", }}>
        {/* Левая колонка: Ставки */}
        <section className="water-Rates-form">
        <div className="rates-container">
        <h2 style={{ textAlign: "center" }}>Ставки за водопотребление</h2>

        <div style={{ textAlign: "center" }}>
        <h3>Текущие ставки по типам</h3>
        {Object.entries(latestRates).length > 0 ? (
            <div>
            {Object.entries(latestRates).map(([type, rate]) => (
                <div key={type}>
                <strong>{formatRateType(type)}:</strong> {rate.value} руб. (с {formatDate(rate.start_date)})
                </div>
            ))}
            </div>
        ) : (
            <p>Нет данных о текущих ставках</p>
        )}
        </div>

        <h3 style={{ textAlign: "center" }}>История ставок</h3>
        {rates === null ? (
            <p style={{ textAlign: "center" }}>Загрузка...</p>
        ) : (
            <table className="data-table-result">
            <thead>
            <tr>
            <th>Дата</th>
            <th>Ставка</th>
            <th>Тип</th>
            </tr>
            </thead>
            <tbody>
            {[...rates]
                .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                .map(rate => (
                    <tr key={rate.id}>
                    <td>{formatDate(rate.start_date)}</td>
                    <td>{rate.value}</td>
                    <td>{formatRateType(rate.rate_type)}</td>
                    </tr>
                ))}
                </tbody>
                </table>
        )}

        <button className="submit-button-WaterReportForm" onClick={() => setShowRateModal(true)}>Добавить</button>
        {rateAlertVisible && (<div className="custom-alert">✅ Ставка успешно добавлена!</div>)}

        {showRateModal && (
            <div className="modal-overlay">
            <div className="modal">
            <h3 >Добавить ставку</h3>
            <form onSubmit={handleRateSubmit}>
            <label>
            Дата начала:
            <input type="date" name="start_date" value={newRate.start_date} onChange={handleRateChange} required />
            </label>
            <label>
            Ставка:
            <input type="number" pattern="[0-9]*" min="0" step="0.01" name="value" value={newRate.value} onChange={handleRateChange} required />
            </label>
            <label>
            Тип ставки:
            <select name="rate_type" value={newRate.rate_type} onChange={handleRateChange}>
            <option value="population">Население</option>
            <option value="org">Предприятие</option>
            <option value="other_population">Население - другой метод</option>
            <option value="other_org">Предприятие - другой метод</option>
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

        {/* Правая колонка: Коэффициенты */}
        <section className="water-Rates-form">
        <div className="upcoef-container">
        <h2 style={{ textAlign: "center" }}>Повышающие коэффициенты</h2>
        <div style={{ textAlign: "center" }}>
        <strong> <h3>Текущие: </h3></strong>
        <div>
        <div>
        <strong>Другой метод:</strong> {latestCoefs["other_method"]?.value ?? "-"} (с {latestCoefs["other_method"]?.start_date ?? "-"})
        </div>
        <div>
        <strong>Превышение:</strong> {latestCoefs["out_permission"]?.value ?? "-"} (с {latestCoefs["out_permission"]?.start_date ?? "-"})
        </div>
        </div>
        </div>

        <h3 style={{ textAlign: "center" }}>История коэффициентов</h3>
        <table className="data-table-result">
        <thead>
        <tr>
        <th>Дата</th>
        <th>Тип</th>
        <th>Значение</th>
        </tr>
        </thead>
        <tbody>
        {[...coefs]
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
            .map((coef, idx) => (
                <tr key={idx}>
                <td>{new Date(coef.start_date).toLocaleDateString("ru-RU")}</td>
                <td>{coef.coeftype.toLowerCase() === "other_method" ? "Другой метод" : "Превышение"}</td>
                <td>{coef.value}</td>
                </tr>
            ))}
            </tbody>
            </table>

            <button className="submit-button-WaterReportForm" onClick={() => setShowCoefModal(true)}>Добавить</button>
            {coefAlertVisible && (<div className="custom-alert">✅ Коэффициент успешно добавлен!</div>)}

            {showCoefModal && (
                <div className="modal-overlay">
                <div className="modal">
                <h3>Добавить коэффициент</h3>
                <form onSubmit={handleCoefSubmit}>
                <label>
                Тип:
                <select name="coeftype" value={newCoef.coeftype} onChange={handleCoefChange}>
                <option value="other_method">Другой метод</option>
                <option value="out_permission">Превышение</option>
                </select>
                </label>
                <label>
                Дата начала:
                <input type="date" name="start_date" value={newCoef.start_date} onChange={handleCoefChange} required />
                </label>
                <label>
                Значение:
                <input type="number" step="0.01" name="value" value={newCoef.value} onChange={handleCoefChange} required />
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
