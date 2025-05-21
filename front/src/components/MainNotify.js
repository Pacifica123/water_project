import React, { useEffect, useState } from "react";
import { getSocket } from "../socket";

function MainNotify() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const socket = getSocket();

        if (!socket) {
            console.log("Socket не инициализирован");
            return;
        }

        // Обработчик входящих уведомлений по сокету
        const handleNotification = (msg) => {
            console.log("Получено уведомление через сокет:", msg);
            setNotifications((prev) => [...prev, msg]);
        };

        socket.on("notification", handleNotification);

        // Функция для запроса всех уведомлений через HTTP
        const fetchAllNotify = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem("user"));
                if (!userInfo || !userInfo.username) {
                    console.error("Пользователь не найден в localStorage");
                    return;
                }

                // GET запрос с username в query параметре
                const response = await fetch(`http://localhost:5000/fetchallnotify?username=${encodeURIComponent(userInfo.username)}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Ошибка при загрузке уведомлений:", errorData);
                    return;
                }

                // Сервер не возвращает уведомления в теле, а отправляет их через сокет
                // Поэтому здесь можно ничего не делать с ответом

            } catch (error) {
                console.error("Ошибка при fetchAllNotify:", error);
            }
        };

        // Вызываем fetchAllNotify один раз при монтировании, чтобы сервер отправил все уведомления через сокет
        fetchAllNotify();

        // Очистка подписки при размонтировании
        return () => {
            socket.off("notification", handleNotification);
        };
    }, []);

    const notifyOrgAdmin = async () => {
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
