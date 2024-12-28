import React, { useState, useEffect } from "react";

const HistoryTable = () => {
    const [history, setHistory] = useState([]);

    useEffect(() => {

    }, []);

    return (
        <div>
            <h3>История изменений</h3>
            <table border="1">
                <thead>
                    <tr>
                    <th>Что изменилось</th>
                        <th>Тип изменения</th>
                        <th>Дата</th>
                        <th>Причина</th>
                        <th>Пользователь</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((item, index) => (
                        <tr key={index}>
                            <td>{item.type}</td>
                            <td>{item.date}</td>
                            <td>{item.reason}</td>
                            <td>{item.user}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default HistoryTable;