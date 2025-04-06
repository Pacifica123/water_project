import React, { useState, useEffect } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchSingleTableData } from "../api/fetch_records";

function Rates() {
    const [rates, setRates] = useState(null);
    const [newRate, setNewRate] = useState({ start_date: "", value: "", rate_type: "population" });

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
            "POPULATION": "Население",
            "ORG": "Предприятие",
            "OTHER": "Другое"
        };
        return typeMap[rateType] || rateType;
    };

    const handleChange = (e) => {
        setNewRate({ ...newRate, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await sendSingleData("rates", newRate);
        setNewRate({ start_date: "", value: "", rate_type: "population" });
        const updatedData = await fetchSingleTableData("rates");
        setRates(updatedData || []);
    };

    return (
        <div className="water-report-form">
        <div className="content-container">
        <h2>Ставки за водопотребление</h2>
        <form onSubmit={handleSubmit}>
        <div className="selectors">
        <div className="selector-row">
        <label>
        Дата начала:
        <input type="date" name="start_date" className="custom-select" value={newRate.start_date} onChange={handleChange} required />
        </label>
        <label>
        Ставка:
        <input type="number" step="0.01" name="value" className="narrow-input" value={newRate.value} onChange={handleChange} required />
        </label>
        <label>
        Тип ставки:
        <select name="rate_type" className="custom-select" value={newRate.rate_type} onChange={handleChange}>
        <option value="population">Население</option>
        <option value="org">Предприятие</option>
        <option value="other">Другое</option>
        </select>
        </label>
        </div>
        </div>
        <button type="submit" className="submit-button">Добавить</button>
        </form>
        <h3>История ставок</h3>
        {rates === null ? (
            <p>Загрузка...</p>
        ) : (
            <table className="data-table">
            <thead>
            <tr>
            <th>Дата</th>
            <th>Ставка</th>
            <th>Тип</th>
            </tr>
            </thead>
            <tbody>
            {rates.map(rate => (
                <tr key={rate.id}>
                <td>{formatDate(rate.start_date)}</td>
                <td>{rate.value}</td>
                <td>{formatRateType(rate.rate_type)}</td>
                </tr>
            ))}
            </tbody>
            </table>
        )}
        </div>
        </div>
    );
}

export default Rates;
