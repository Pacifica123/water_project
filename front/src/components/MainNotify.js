import React, { useEffect, useState } from "react";
import { getSocket } from "../socket";
import "../css/MainNotify.css";
import NotificationModal from "./NotificationModal";
import { sendNotificationReaction } from "../api/notify_reaction";

function MainNotify() {
    const [notifications, setNotifications] = useState([]);
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [selectedTab, setSelectedTab] = useState("ВСЕ");
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // -------------------------------------------------------------------
    //
    //
    // -------------------------------------------------------------------
    const triggerFetchAllNotify = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) {
                console.warn("Пользователь не найден в localStorage");
                return;
            }
            const user = JSON.parse(userStr);
            if (!user || !user.username) {
                console.warn("Неверный формат user из localStorage");
                return;
            }

            // сервер вернёт уведомления через сокет.
            await fetch(
                `http://127.0.0.1:5000/api/fetchallnotify?username=${user.username}`
            );
            // Здесь data = { or_msg: "...", status: "sent" }, его игнорируем.
            // После этого сервер через сокет заэмитит все накопившиеся уведомления.
        } catch (e) {
            console.error("Ошибка при fetchallnotify:", e);
        }
    };

    // -------------------------------------------------------------------
    //  При монтировании: сначала подписываемся на socket.on("notification"),
    //  а потом вызываем fetchallnotify, чтобы «вытянуть» историю.

    // TODO : поправить (см скрин в ТГ)
    // -------------------------------------------------------------------
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        // Обработчик каждого уведомления из сокета.
        const handleNotification = (msg) => {
            setNotifications(prev => {
                if (prev.find(x => x.id === msg.id)) return prev;

                let title = "Без заголовка";

                if (typeof msg.text === "string") {
                    try {
                        const parsed = JSON.parse(msg.text);
                        title = parsed.header || parsed.message || "Без заголовка";
                    } catch {
                        title = msg.text;
                    }
                } else if (msg.header) {
                    title = msg.header;
                } else if (msg.message) {
                    title = msg.message;
                }
                const notification = {
                    id: msg.id || Date.now() + Math.random(),
                             text: title,
                             date: msg.date || new Date().toISOString().split("T")[0],
                             type:
                             msg.type === "waterreportform"
                             ? "ЗАБОР ПОВЕРХНОСТНОЙ ВОДЫ"
                             : msg.type || "ОТЧЕТНОСТЬ",
                             raw: msg,
                };


                return [...prev, notification];
            });
        };


        // 1) Сначала подписываемся
        console.log("⚙️ Подписываемся на сокет, объект:", socket);
        socket.on("notification", handleNotification);

        // 2) Только после подписки делаем fetch, чтобы сервер
        //    прислал все накопившиеся уведомления
        triggerFetchAllNotify();

        // 3) При размонтировании – отписываемся
        return () => {
            console.log("🗑️ Отписываемся от сокета", socket);
            socket.off("notification", handleNotification);
        };
    }, []);
    // -------------------------------------------------------------------

    // Фильтрация, пагинация и остальные функции оставляем без изменений:
    const getNotificationTitle = (text) => {
        try {
            const parsed = JSON.parse(text);
            return parsed.header || parsed.message || "Без заголовка";
        } catch (e) {
            return text || "Без заголовка";
        }
    };



    const addNotification = (text, type) => {
        const newNotification = {
            id: Date.now(), // временный id
            text,
            date: new Date().toISOString().split("T")[0],
            type,
        };
        setNotifications((prev) => [...prev, newNotification]);
    };

    const filteredNotifications = notifications.filter((msg) => {
        const inTab = selectedTab === "ВСЕ" || msg.type === selectedTab;
        const inDateRange =
        (!dateStart || msg.date >= dateStart) && (!dateEnd || msg.date <= dateEnd);
        return inTab && inDateRange;
    });

    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
    const paginatedNotifications = filteredNotifications.slice(
        (currentPage - 1) * itemsPerPage,
                                                               currentPage * itemsPerPage
    );

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

        useEffect(() => {
            setCurrentPage(1); // сбрасываем страницу при смене фильтра
        }, [itemsPerPage, selectedTab, dateStart, dateEnd]);

        // Callback для NotificationModal (approve/revise → просто перезапустить WS-поток)
        const handleReactAndReload = async (notification, reaction) => {
            try {
                await sendNotificationReaction(notification, reaction);
                console.log("Reaction sent:", reaction);

                // Очищаем текущий стейт, чтобы при новом fetchallnotify
                // не мешались старые уведомления в массиве
                setNotifications([]);

                // Снова «подталкиваем» сервер переключиться в режим
                // выдачи истории через WebSocket
                await triggerFetchAllNotify();
            } catch (err) {
                console.error("Ошибка при отправке реакции:", err);
                throw err;
            }
        };

        return (
            <div className="notify-page large-notify">
            <div className="notify-header">
            <div className="notify-title">ЛЕНТА УВЕДОМЛЕНИЙ</div>
            <div className="notify-date-selectors">
            <label>
            c:{" "}
            <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            />
            </label>
            <label>
            по:{" "}
            <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            />
            </label>
            </div>
            </div>

            <div className="notify-tabs">
            {["ВСЕ", "ЗАБОР ПОВЕРХНОСТНОЙ ВОДЫ", "РАСЧЕТ ОПЛАТЫ"].map((tab) => (
                <div
                key={tab}
                className={`tab ${selectedTab === tab ? "active" : ""}`}
                onClick={() => setSelectedTab(tab)}
                >
                {tab}{" "}
                <span>
                (
                    {notifications.filter((n) => tab === "ВСЕ" || n.type === tab).length})
                </span>
                </div>
            ))}
            </div>

            <div className="test-buttons">
            <button
            onClick={() =>
                addNotification("Регистрация организации прошла успешно", "РЕГИСТРАЦИЯ ОРГАНИЗАЦИИ")
            }
            >
            Тест: Регистрация организации
            </button>
            <button onClick={() => addNotification("Журнал принят", "ОТЧЕТНОСТЬ")}>
            Тест: Журнал принят
            </button>
            <button
            onClick={() =>
                addNotification("Журнал отклонен: ошибка в данных", "ОТЧЕТНОСТЬ")
            }
            >
            Тест: Журнал отклонен
            </button>
            </div>

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
            {paginatedNotifications.length === 0 ? (
                <tr>
                <td colSpan="4" className="empty">
                Нет уведомлений
                </td>
                </tr>
            ) : (
                paginatedNotifications.map((msg, idx) => (
                    <tr
                    key={msg.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedNotification(msg)}
                    >
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td>{getNotificationTitle(msg.text)}</td>

                    <td>{msg.date}</td>
                    <td>{msg.type}</td>
                    </tr>
                ))
            )}
            </tbody>
            </table>

            {selectedNotification && (
                <NotificationModal
                notification={selectedNotification}
                onClose={() => setSelectedNotification(null)}
                onReact={handleReactAndReload}
                />
            )}
            </div>

            <div className="notify-footer">
            <div className="pagination">
            <button onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
            &laquo;
            </button>
            <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            >
            &lt;
            </button>
            <span className="current">{currentPage}</span>
            <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            >
            &gt;
            </button>
            <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            >
            &raquo;
            </button>
            </div>
            <div className="show-count">
            Показать по{" "}
            <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            </select>
            </div>
            </div>
            </div>
        );
}

export default MainNotify;
