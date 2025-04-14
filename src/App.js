import React, { useState, useEffect } from "react";
import "./App.css";
import LoginPage from "./components/LoginPage";
import ProtectedContent from "./components/ProtectedContent";
import axios from "axios";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Создаем экземпляр axios
  const axiosInstance = axios.create({
    baseURL: "http://127.0.0.1:5000/api",
  });

  // Интерцепторы запросов (добавление токена)
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("jwtToken");
      if (token) {
        config.headers.Authorization = 'Bearer ${token}';
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Интерцепторы ответов (обработка 401)
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
                                                                (error) => {
                                                                  if (error.response && error.response.status === 401) {
                                                                    handleLogout();
                                                                  }
                                                                  return Promise.reject(error);
                                                                }
    );

    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, []);

  // Проверка токена при загрузке
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
    localStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <div className="app">
    {isAuthenticated ? (
      <ProtectedContent onLogout={handleLogout} axios={axiosInstance} />
    ) : (
      <LoginPage onLogin={handleLogin} axios={axiosInstance} />
    )}
    </div>
  );
}

export default App;
