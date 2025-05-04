
import React, { useState, useEffect } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchSingleTableData } from "../api/fetch_records";
import "../App.css";
import { translate } from "../utils/translations";

function UsersPage() {
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newUserInfo, setNewUserInfo] = useState({
        last_name: "",
        first_name: "",
        middle_name: "",
        birth_date: "",
        username: "",
        email: "",
        password: "",
        role: "",
    });

    const fetchUsers = async () => {
        try {
            const users = await fetchSingleTableData("users");
            setUsers(users || []);
        } catch (error) {
            console.error("Ошибка загрузки пользователей:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInputChange = (e) => {
        setNewUserInfo({ ...newUserInfo, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await sendSingleData("users", newUserInfo);
            alert("Данные успешно отправлены!");
            console.log("Ответ сервера:", response)
            fetchUsers(); // Обновление списка пользователей после добавления
            setNewUserInfo({
                last_name: "",
                first_name: "",
                middle_name: "",
                birth_date: "",
                username: "",
                email: "",
                password: "",
                role: "",
            });
            setShowForm(false);
        } catch (error) {
            console.error("Ошибка отправки данных:", error);
            alert("Ошибка при отправке данных.");
        }
    };

    return (
        <div className="form-container">
        <h2>Пользователи системы</h2>
        {/* <button onClick={() => setShowForm(!showForm)} className="add-button">
        {showForm ? "Скрыть форму" : "Добавить пользователя"}
        </button>
        {showForm && (
            <div className="form-container">
            <h3>Добавление пользователя</h3>
            <form onSubmit={handleSubmit}>
            <div className="input-group">
            <label>Фамилия:</label>
            <input type="text" name="last_name" value={newUserInfo.last_name} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Имя:</label>
            <input type="text" name="first_name" value={newUserInfo.first_name} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Отчество:</label>
            <input type="text" name="middle_name" value={newUserInfo.middle_name} onChange={handleInputChange} />
            </div>
            <div className="input-group">
            <label>Дата рождения:</label>
            <input type="date" name="birth_date" value={newUserInfo.birth_date} onChange={handleInputChange} />
            </div>
            <div className="input-group">
            <label>Логин:</label>
            <input type="text" name="username" value={newUserInfo.username} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Электронная почта:</label>
            <input type="email" name="email" value={newUserInfo.email} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Пароль:</label>
            <input type="password" name="password" value={newUserInfo.password} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Роль:</label>
            <select name="role" value={newUserInfo.role} onChange={handleInputChange} required>
            <option value="">Выберите роль</option>
            <option value="ADMIN">Администратор</option>
            <option value="REPORT_ADMIN">Руководитель отчётности</option>
            <option value="ORG_ADMIN">Администратор организации</option>
            <option value="EMPLOYEE">Сотрудник</option>
            </select>
            </div>
            <button type="submit" className="submit-button">Сохранить</button>

            </form>
            </div>
    )} */}
    <table className="info-table">
    <thead>
    <tr>
    <th>Фамилия</th>
    <th>Имя</th>
    <th>Отчество</th>
    <th>Дата рождения</th>
    <th>Логин</th>
    <th>Электронная почта</th>
    <th>Роль</th>
    </tr>
    </thead>
    <tbody>
    {users.map((user, index) => (
        <tr key={index}>
        <td>{user.last_name}</td>
        <td>{user.first_name}</td>
        <td>{user.middle_name}</td>
        <td>{user.birth_date}</td>
        <td>{user.username}</td>
        <td>{user.email}</td>
        <td>{translate(user.role)}</td>
        </tr>
    ))}
    </tbody>
    </table>
    </div>
    );
}

export default UsersPage;
