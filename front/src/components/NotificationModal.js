import React from "react";
import "../css/NotificationModal.css"; // стили для модалки

function NotificationModal({ notification, onClose }) {
    let parsedContent = null;
    try {
        parsedContent = JSON.parse(notification.text);
    } catch (e) {
        // не JSON
    }

    const renderWaterReportTable = (reportData) => {
        if (!Array.isArray(reportData)) return <p>Нет данных для отчёта</p>;

        // Пример рендера таблицы по структуре reportData (массив объектов)
        // reportData — массив по месяцам, каждый элемент — объект с категориями и значениями
        return (
            <table className="water-report-table">
            <thead>
            <tr>
            <th>Месяц</th>
            <th>Факт</th>
            <th>Население</th>
            <th>Прочее</th>
            </tr>
            </thead>
            <tbody>
            {parsedContent.quarter && reportData.map((monthData, idx) => {
                // Можно вывести месяц по индексу квартала + месяц
                const monthNames = [
                    "Январь", "Февраль", "Март",
                    "Апрель", "Май", "Июнь",
                    "Июль", "Август", "Сентябрь",
                    "Октябрь", "Ноябрь", "Декабрь"
                ];

                // Получаем месяцы квартала
                const quarter = parsedContent.quarter;
                const monthIndex = (quarter - 1) * 3 + idx; // 0-based индекс месяца
                const monthName = monthNames[monthIndex] || `Месяц ${monthIndex + 1}`;

                return (
                    <tr key={idx}>
                    <td>{monthName}</td>
                    <td>{monthData.fact ?? "-"}</td>
                    <td>{monthData.population ?? "-"}</td>
                    <td>{monthData.other ?? "-"}</td>
                    </tr>
                );
            })}
            </tbody>
            </table>
        );
    };

    const renderDetails = () => {
        if (parsedContent) {
            switch (parsedContent.type) {
                case "registration":
                    return (
                        <div>
                        <h3>Регистрация организации</h3>
                        <p>{parsedContent.message || notification.text}</p>
                        </div>
                    );
                case "report":
                    return (
                        <div>
                        <h3>Отчетность</h3>
                        <p>{parsedContent.message || notification.text}</p>
                        </div>
                    );
                case "waterreportform":  // новый кейс
                    return (
                        <div>
                        <h3>{parsedContent.header}</h3>
                        <p>{parsedContent.message}</p>
                        {renderWaterReportTable(parsedContent.reportData)}
                        </div>
                    );
                case "registry":
                    return (
                        <div>
                        <h3>Реестры</h3>
                        <p>{parsedContent.message || notification.text}</p>
                        </div>
                    );
                default:
                    return (
                        <div>
                        <h3>Общее уведомление (JSON)</h3>
                        <pre>{JSON.stringify(parsedContent, null, 2)}</pre>
                        </div>
                    );
            }
        } else {
            return (
                <div>
                <h3>Общее уведомление</h3>
                <p>{notification.text}</p>
                </div>
            );
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {renderDetails()}
        <p><small>Дата: {notification.date}</small></p>
        </div>
        </div>
    );
}


export default NotificationModal;
