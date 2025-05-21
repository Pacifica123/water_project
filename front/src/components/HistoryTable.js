import React, { useState, useEffect } from "react";

const HistoryTable = () => {
    const [history, setHistory] = useState([]);

    useEffect(() => {

    }, []);

    return (
        <div className="history-container">
        <center> <h3>История изменений</h3></center>
        <table border="1">
        <thead>
        <tr>
        <th>Что изменилось</th>
        <th>Тип изменения</th>
        <th>Дата</th>
        <th>Причина</th>
        </tr>
        </thead>
        <tbody>
        {history.map((item, index) => (
            <tr key={index}>
            <td>{item.type}</td>
            <td>{item.date}</td>
            <td>{item.reason}</td>
            </tr>
        ))}
        </tbody>
        </table>
        </div>
    );
};

export default HistoryTable;
