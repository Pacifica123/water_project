import React, { useState } from "react";
import { connectSocket } from '../socket';
import "../css/login.css";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Ошибка авторизации");
        return;
      }

      const data = await response.json();
      localStorage.setItem("jwtToken", data.token); // Сохраняем токен
      localStorage.setItem("user", data.user);
      localStorage.setItem("org", data.org);
      const user = JSON.parse(localStorage.getItem("user"));
      console.log(user.username);
      connectSocket(user.username);
      onLogin(); // Переход на защищенную страницу
    } catch (err) {
      setError("Ошибка подключения к серверу");
    }
  };

  return (
    <div className="login-page">
      <h2>Авторизация</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Имя пользователя:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default LoginPage;
