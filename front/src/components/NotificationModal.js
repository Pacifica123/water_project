import React from "react";
import "../css/NotificationModal.css"; // стили для модалки

function NotificationModal({ notification, onClose }) {
    // В зависимости от типа уведомления рендерим разные детали
    const renderDetails = () => {
        switch (notification.type) {
            case "РЕГИСТРАЦИЯ ОРГАНИЗАЦИИ":
                return (
                    <div>
                    <h3>Регистрация организации</h3>
                    <p>{notification.text}</p>
                    {/* Можно распарсить дополнительные поля из notification.details */}
                    </div>
                );
            case "ОТЧЕТНОСТЬ":
                return (
                    <div>
                    <h3>Отчетность</h3>
                    <p>{notification.text}</p>
                    {/* Другие детали */}
                    </div>
                );
            case "РЕЕСТРЫ":
                return (
                    <div>
                    <h3>Реестры</h3>
                    <p>{notification.text}</p>
                    </div>
                );
            default:
                return (
                    <div>
                    <h3>Общее уведомление</h3>
                    <p>{notification.data}</p>
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
