import React, { useEffect, useState } from "react";
import { getSocket } from "../socket";

function MainNotify() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const socket = getSocket();


        if (!socket) {
            console.log("Socket не инициализирован");
            return

        };

        const handleNotification = (msg) => {
            console.log("Получено уведомление:", msg);
            setNotifications((prev) => [...prev, msg]);
        };

        socket.on("notification", handleNotification);

        return () => {
            socket.off("notification", handleNotification);
        };
    }, []);

    const notifyOrgAdmin = async () => {
        // Отправляем HTTP-запрос на сервер, чтобы он отправил уведомление orgadmin
        await fetch("http://localhost:5000/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "orgadmin", message: "Тестовое уведомление" }),
        });
    };

    return (
        <div>
        <button onClick={notifyOrgAdmin}>Уведомить оргадмина</button>
        <h3>Уведомления:</h3>
        <ul>
        {notifications.map((msg, idx) => (
            <li key={idx}>{msg}</li>
        ))}
        </ul>
        </div>
    );
}

export default MainNotify;
