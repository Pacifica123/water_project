import React, { useState, useEffect } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchSingleTableData } from "../api/fetch_records";

function Rates() {
    const [rates, setRates] = useState(null);
    const [newRate, setNewRate] = useState({ start_date: "", value: "", rate_type: "population" });
    const [showModal, setShowModal] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);

    const showAlert = () => {
        setAlertVisible(true);
        setTimeout(() => {
            setAlertVisible(false);
        }, 20000);
    };

    useEffect(() => {
        async function fetchRates() {
            const data = await fetchSingleTableData("rates");
            setRates(data || []);
        }
        fetchRates();
    }, []);

    const formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("ru-RU", options);
    };

    const formatRateType = (rateType) => {
        const typeMap = {
            "POPULATION": "Население - прибор",
            "ORG": "Предприятие - прибор",
            "OTHER_POPULATION": "Население - другой метод",
            "OTHER_ORG": "Предприятие - другой метод"
        };
        return typeMap[rateType.toUpperCase()] || rateType;
    };

    const handleChange = (e) => {
        setNewRate({ ...newRate, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await sendSingleData("rates", newRate);
        setNewRate({ start_date: "", value: "", rate_type: "population" });
        setShowModal(false);
        const updatedData = await fetchSingleTableData("rates");
        setRates(updatedData || []);
        showAlert();
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

    return (
        <div className="water-Rates-form">
        <div className="content-container">
        <h2 align="center">Ставки за водопотребление</h2>

        <div className="current-rate" text-align="left" align="center">
        <h3>Текущие ставки по типам</h3>
        {Object.entries(getLatestRatesByType()).length > 0 ? (
            <div>
            {Object.entries(getLatestRatesByType()).map(([type, rate]) => (
                <div key={type}>
                <strong>{formatRateType(type)}:</strong> {rate.value} руб. (с {formatDate(rate.start_date)})
                </div>
            ))}
            </div>
        ) : (
            <p>Нет данных о текущих ставках</p>
        )}
        </div>

        <h3 align="center">История ставок</h3>
        {rates === null ? (
            <p align="center">Загрузка...</p>
        ) : (
            <table className="data-Rates-table">
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

        <button className="submit-button-WaterReportForm" onClick={() => setShowModal(true)}>Добавить</button>
        {alertVisible && (<div className="custom-alert">✅ Ставка успешно добавлена!</div>)}
        {showModal && (
            <div className="modal-overlay">
            <div className="modal">
            <h3>Добавить ставку</h3>
            <form onSubmit={handleSubmit}>
            <label>
            Дата начала:
            <input type="date" name="start_date" value={newRate.start_date} onChange={handleChange} required />
            </label>
            <label>
            Ставка:
            <input type="number" step="0.01" name="value" value={newRate.value} onChange={handleChange} required />
            </label>
            <label>
            Тип ставки:
            <select name="rate_type" value={newRate.rate_type} onChange={handleChange}>
            <option value="population">Население</option>
            <option value="org">Предприятие</option>
            <option value="other_population">Население - другой метод</option>
            <option value="other_org">Предприятие - другой метод</option>
            </select>
            </label>
            <div className="modal-buttons">
            <button className="modal-edit-button" type="submit">Сохранить</button>
            <button className="modal-back-button" type="button" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
            </form>
            </div>
            </div>
        )}
        </div>
        </div>
    );
}

export default Rates;



