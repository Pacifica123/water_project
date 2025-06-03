// --- NotificationModal.jsx ---
import React from "react";
import "../css/NotificationModal.css";
import { sendNotificationReaction } from "../api/notify_reaction";

function NotificationModal({ notification, onClose, onReact }) {
    let parsedContent = null;
    if (typeof notification.text === "string") {
        try {
            parsedContent = JSON.parse(notification.raw.text);
        } catch (e) {
            parsedContent = null;
        }
    }
    else if (typeof notification.text === "object" && notification.text !== null) {
        parsedContent = notification.text;
    }


    function handleReactionClick(reaction) {
        if (typeof onReact !== "function") {
            console.error("❌ onReact не передан в NotificationModal");
            return;
        }
        // 1) отправка реакции и 2) перезагрузка списка
        onReact(notification, reaction)
        .then(() => {
            // После успешного onReact обновляем содержимое родителя и закрываем модалку
            onClose();
        })
        .catch((err) => {
            alert("Ошибка при отправке реакции: " + err.message || err);
        });
    }

    const renderWaterReportTable = (reportData) => {
        if (!Array.isArray(reportData)) return <p>Нет данных для отчёта</p>;

        const monthNames = [
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь",
        ];

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
            {parsedContent.quarter &&
                reportData.map((monthData, idx) => {
                    const quarter = parsedContent.quarter;
                    const monthIndex = (quarter - 1) * 3 + idx;
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
                case "waterreportform":
                    return (
                        <div>
                        <h3>{parsedContent.header}</h3>
                        <p>{parsedContent.message}</p>
                        {renderWaterReportTable(parsedContent.reportData)}
                        <div className="action-buttons">
                        <button onClick={() => handleReactionClick("approve")}>
                        Принять
                        </button>
                        <button onClick={() => handleReactionClick("revise")}>
                        На доработку
                        </button>
                        </div>
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
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
        ×
        </button>
        {renderDetails()}
        <p>
        <small>Дата: {notification.date}</small>
        </p>
        </div>
        </div>
    );
}

export default NotificationModal;
