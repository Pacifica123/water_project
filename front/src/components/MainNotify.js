
import React, { useEffect, useState } from "react";
import { getSocket } from "../socket";
import "../css/MainNotify.css";
import NotificationModal from "./NotificationModal";
import { sendNotificationReaction } from "../api/notify_reaction";
import { translate } from "../utils/translations";

function MainNotify() {
    const [notifications, setNotifications] = useState([]);
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [selectedTab, setSelectedTab] = useState("ВСЕ");
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const triggerFetchAllNotify = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);
            if (!user || !user.username) return;
            await fetch(`http://127.0.0.1:5000/api/fetchallnotify?username=${user.username}`);
        } catch (e) {
            console.error("Ошибка при fetchallnotify:", e);
        }
    };

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleNotification = (msg) => {
            console.log("Получено уведомление:", msg);
            setNotifications((prev) => {
                if (prev.find((x) => x.id === msg.id)) return prev;

                let title = "Без заголовка";
                let parsed = null;

                if (typeof msg.text === "string") {
                    try {
                        const fixedText = cleanPythonDictString(msg.text);
                        parsed = JSON.parse(fixedText);
                        title = parsed.header || parsed.message || "Без заголовка";
                    } catch {
                        title = msg.text;
                    }
                } else if (typeof msg.text === "object" && msg.text !== null) {
                    parsed = msg.text;
                    title = parsed.header || parsed.message || "Без заголовка";
                }

                // Определяем тип по parsed.type, если есть
                // let notificationType = "ОТЧЕТНОСТЬ";

                const parsedType = parsed?.type || msg.type;
                let notificationType = parsedType;
/*
                if (parsedType === "waterreportform") {
                    notificationType = "ЗАБОР ПОВЕРХНОСТНОЙ ВОДЫ";
                } else if (parsedType === "paymentform") {
                    notificationType = "РАСЧЕТ ОПЛАТЫ";
                } else if (parsedType === "waterlog_complete") {
                    notificationType = "ЖУРНАЛ ВОДОПОТРЕБЛЕНИЕ";
                } else if (parsedType) {
                    notificationType = parsedType.toUpperCase();
                }*/

                const notification = {
                    id: msg.id || Date.now() + Math.random(),
                             text: title,
                             date: msg.date || new Date().toISOString().split("T")[0],
                             type: parsedType,
                             raw: { ...msg, parsed },
                };



                return [...prev, notification];
            });
        };


        socket.on("notification", handleNotification);
        triggerFetchAllNotify();

        return () => {
            socket.off("notification", handleNotification);
        };
    }, []);

    const getNotificationTitle = (text) => {
        if (!text) return "Без заголовка";

        // Если это объект
        if (typeof text === "object") {
            return text.header || text.message || "Без заголовка";
        }

        // Если это строка с одинарными кавычками — пытаемся превратить в валидный JSON
        if (typeof text === "string") {
            try {
                const fixedText = cleanPythonDictString(text);
                const parsed = JSON.parse(fixedText);
                return parsed.header || parsed.message || "Без заголовка";
            } catch {
                return text;
            }
        }

        return "Без заголовка";
    };

    function cleanPythonDictString(str) {
        if (!str) return str;

        // 1. Заменяем одинарные кавычки на двойные (будет много ложных замен, осторожно)
        let res = str.replace(/'/g, '"');

        // 2. Заменяем datetime.datetime(2025, 6, 2, 0, 0) на "2025-06-02T00:00:00"
        res = res.replace(/datetime\.datetime\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g,
                          (match, year, month, day, hour, minute) => {
                              const pad = (num) => num.toString().padStart(2, '0');
                              return `"${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00"`;
                          });

        // 3. Заменяем Decimal("19.00") или Decimal('19.00') на число 19.00
        res = res.replace(/Decimal\("(\d+\.?\d*)"\)/g, '$1');
        res = res.replace(/Decimal\('(\d+\.?\d*)'\)/g, '$1');

        return res;
    }


    const addNotification = (text, type) => {
        const newNotification = {
            id: Date.now(),
            text,
            date: new Date().toISOString().split("T")[0],
            type,
        };
        setNotifications((prev) => [...prev, newNotification]);
    };

    const handleSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return "";
        return sortConfig.direction === "asc" ? " ▲" : " ▼";
    };

    const filteredNotifications = notifications.filter((msg) => {
        const inTab = selectedTab === "ВСЕ" || msg.type === selectedTab;
        const inDateRange =
        (!dateStart || msg.date >= dateStart) &&
        (!dateEnd || msg.date <= dateEnd);
        return inTab && inDateRange;
    });

    const sortedNotifications = [...filteredNotifications];
    if (sortConfig.key) {
        sortedNotifications.sort((a, b) => {
            const aVal = a[sortConfig.key] || "";
            const bVal = b[sortConfig.key] || "";
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    const totalPages = Math.ceil(sortedNotifications.length / itemsPerPage);
    const paginatedNotifications = sortedNotifications.slice(
        (currentPage - 1) * itemsPerPage,
                                                             currentPage * itemsPerPage
    );



    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

        useEffect(() => {
            setCurrentPage(1);
        }, [itemsPerPage, selectedTab, dateStart, dateEnd]);

        const handleReactAndReload = async (notification, reaction) => {
            try {
                await sendNotificationReaction(notification, reaction);
                setNotifications([]);
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
            {["ВСЕ", "ЗАБОР ПОВЕРХНОСТНОЙ ВОДЫ", "РАСЧЕТ ОПЛАТЫ", "ЖУРНАЛ ВОДОПОТРЕБЛЕНИЕ"].map((tab) => (
                <div
                key={tab}
                className={`tab ${selectedTab === tab ? "active" : ""}`}
                onClick={() => setSelectedTab(tab)}
                >
                {tab}{" "}
                <span>
                (
                    {notifications.filter(
                        (n) => tab === "ВСЕ" || n.type === tab
                    ).length}
                )
                </span>
                </div>
            ))}
            </div>

            <div className="notify-table-wrapper">
            <table className="notify-table">
            <thead>
            <tr>
            <th onClick={() => handleSort("id")}># {getSortIndicator("id")}</th>
            <th onClick={() => handleSort("text")}>
            Уведомление {getSortIndicator("text")}
            </th>
            <th onClick={() => handleSort("date")}>
            Дата {getSortIndicator("date")}
            </th>
            <th onClick={() => handleSort("type")}>
            Тип {getSortIndicator("type")}
            </th>
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
                    <td>{getNotificationTitle(msg.raw?.text)}</td>
                    <td>{msg.date}</td>
                    <td>{translate(msg.type)}</td>
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
            &lsaquo;
            </button>
            <span className="current">{currentPage}</span>
            <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            >
            &rsaquo;
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
