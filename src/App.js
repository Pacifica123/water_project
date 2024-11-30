import React, { useState, useEffect } from "react";
import "./App.css"; // Стили для дизайна, похожего на пример
import LoginPage from "./components/LoginPage";
import ProtectedContent from "./components/ProtectedContent"; // Основной компонент приложения

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Проверка токена при загрузке страницы
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    console.log("Выход из системы");
    localStorage.clear(); // Удаляет все данные из localStorage
    setIsAuthenticated(false);
  };

  return (
    <div className="app">
      {isAuthenticated ? (
        <ProtectedContent onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
