import React, { useEffect, useState } from "react";
import { getSocket } from "../socket";
import "../css/MainNotify.css";
import NotificationModal from "./NotificationModal"; // импорт модалки
import "../css/MainNotify.css";

function MainNotify() {
    const [notifications, setNotifications] = useState([
        // { text: "Регистрация организации прошла успешно", date: "2025-05-01", type: "РЕГИСТРАЦИЯ ОРГАНИЗАЦИИ" },
        // { text: "Создание пункта учета", date: "2025-05-02", type: "Общее" },
        // { text: "Обновление записи в реестре", date: "2025-05-02", type: "РЕЕСТРЫ" },
        // { text: "Квартальная справка и форма оплаты от организации СКЭК", date: "2025-05-03", type: "ОТЧЕТНОСТЬ" },
        // { text: "Закрытие журнала водопотребления", date: "2025-05-04", type: "ОТЧЕТНОСТЬ" },
    ]);
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [selectedTab, setSelectedTab] = useState("ВСЕ");
    const [selectedNotification, setSelectedNotification] = useState(null);


    useEffect(() => {
        const userStr = localStorage.getItem("user");
        let user = null;
        try {
            if (userStr) {
                user = JSON.parse(userStr);
                if (user && user._sa_instance_state) delete user._sa_instance_state;
            }
        } catch (e) {
            console.error("Ошибка парсинга user из localStorage", e);
        }

        if (!user || !user.username) {
            console.warn("Пользователь не найден в localStorage");
            return;
        }

        // Вызов для триггера отправки старых уведомлений через сокет
        fetch(`http://127.0.0.1:5000/api/fetchallnotify?username=${user.username}`)
        .catch(err => console.error("Ошибка при вызове fetchallnotify:", err));

        const socket = getSocket();
        if (!socket) return;

        const handleNotification = (msg) => {
            console.log("Получено уведомление через сокет:", msg);

            setNotifications(prev => [...prev, msg]);
        };

        socket.on("notification", handleNotification);

        return () => socket.off("notification", handleNotification);
    }, []);


    const addNotification = (text, type) => {
        const newNotification = {
            text,
            date: new Date().toISOString().split("T")[0],
            type,
        };
        setNotifications((prev) => [...prev, newNotification]);
    };

    const filteredNotifications = notifications.filter((msg) => {
        const inTab = selectedTab === "ВСЕ" || msg.type === selectedTab;
        const inDateRange =
        (!dateStart || msg.date >= dateStart) &&
        (!dateEnd || msg.date <= dateEnd);
        return inTab && inDateRange;
    });

    return (
        <div className="notify-page large-notify">
        {/* Header */}
        <div className="notify-header">
        <div className="notify-title">ЛЕНТА УВЕДОМЛЕНИЙ</div>
        <div className="notify-date-selectors">
        <label>
        c: <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
        </label>
        <label>
        по: <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
        </label>
        </div>
        </div>

        {/* Tabs */}
        <div className="notify-tabs">
        {["ВСЕ", "РЕГИСТРАЦИЯ ОРГАНИЗАЦИИ", "ОТЧЕТНОСТЬ", "РЕЕСТРЫ"].map(tab => (
            <div
            key={tab}
            className={`tab ${selectedTab === tab ? "active" : ""}`}
            onClick={() => setSelectedTab(tab)}
            >
            {tab} <span>({notifications.filter(n => tab === "ВСЕ" || n.type === tab).length})</span>
            </div>
        ))}
        </div>

        {/* Test buttons */}
        <div className="test-buttons">
        <button onClick={() => addNotification("Регистрация организации прошла успешно", "РЕГИСТРАЦИЯ ОРГАНИЗАЦИИ")}>
        Тест: Регистрация организации
        </button>
        <button onClick={() => addNotification("Журнал принят", "ОТЧЕТНОСТЬ")}>
        Тест: Журнал принят
        </button>
        <button onClick={() => addNotification("Журнал отклонен: ошибка в данных", "ОТЧЕТНОСТЬ")}>
        Тест: Журнал отклонен
        </button>
        </div>

        {/* Table */}
        <div className="notify-table-wrapper">
        <table className="notify-table">
        <thead>
        <tr>
        <th>#</th>
        <th>Уведомление</th>
        <th>Дата</th>
        <th>Тип</th>
        </tr>
        </thead>
        <tbody>
        {filteredNotifications.length === 0 ? (
            <tr><td colSpan="4" className="empty">Нет уведомлений</td></tr>
        ) : (
            filteredNotifications.map((msg, idx) => (
                <tr
                key={idx}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedNotification(msg)}  // Открываем модалку
                >
                <td>{idx + 1}</td>
                <td>{msg.text}</td>
                <td>{msg.date}</td>
                <td>{msg.type}</td>
                </tr>
            ))
        )}
        </tbody>
        </table>

        {/* Модальное окно */}
        {selectedNotification && (
            <NotificationModal
            notification={selectedNotification}
            onClose={() => setSelectedNotification(null)}
            />
        )}
        </div>

        {/* Footer */}
        <div className="notify-footer">
        <div className="pagination">
        <button>&laquo;</button>
        <button>&lt;</button>
        <span className="current">1</span>
        <button>&gt;</button>
        <button>&raquo;</button>
        </div>
        <div className="show-count">
        Показать по
        <select>
        <option>10</option>
        <option>25</option>
        <option>50</option>
        </select>
        </div>
        </div>
        </div>
    );
}

export default MainNotify;


