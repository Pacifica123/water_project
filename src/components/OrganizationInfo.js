import React, { useState, useEffect } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchStructureData } from "../api/fetch_records";
import "../App.css";

function OrganizationInfo() {
    const userData = localStorage.getItem("user");
    const orgData = localStorage.getItem("org");

    let userInfo = {};
    let orgInfo = {};

    try {
        userInfo = userData ? JSON.parse(userData) : {};
        orgInfo = orgData ? JSON.parse(orgData) : {};
    } catch (error) {
        console.error("Ошибка парсинга данных:", error);
    }

    const [newOrgInfo, setNewOrgInfo] = useState({
        legal_form: "",
        organisation_name: "",
        inn: "",
        organization_code: "",
        postal_address: "",
    });

    const [pointCount, setPointCount] = useState(null);

    useEffect(() => {
        const loadPointCount = async () => {
            if (orgInfo.id) {
                try {
                    const response = await fetchStructureData("nof_statistics", { org_id: orgInfo.id });
                    setPointCount(response.data.point_count);
                } catch (error) {
                    console.error("Ошибка при загрузке статистики:", error);
                }
            }
        };

        loadPointCount();
    }, [orgInfo]);

    const legalForms = ["ООО", "АО", "ИП", "ЗАО", "ПАО"];

    const handleInputChange = (e) => {
        setNewOrgInfo({ ...newOrgInfo, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let data;
        try {
            const response = await sendSingleData("organisations", newOrgInfo);
            console.log("Ответ сервера:", response);
            data = response?.data;
            alert("Данные успешно отправлены! \nЛогин: " + data?.username + "\nВременный пароль: " + data?.password);


            setNewOrgInfo({
                organisation_name: "",
                inn: "",
                organization_code: "",
                legal_form: "",
                postal_address: "",
            });
        } catch (error) {
            console.error("Ошибка отправки данных:", error);
            alert("Ошибка при отправке данных. Проверьте соединение.");
        }
    };

    if (!userInfo || !userInfo.role) {
        return <p>Информация о пользователе не найдена</p>;
    }

    const role = userInfo.role.replace("UserRoles.", "");

    return (
        <div className="organization-info-container">
        <div className="organization-info">
        <h2 align="center">Информация об организации</h2>
        {role === "EMPLOYEE" ? (
            <table className="info-table">
            <tbody>
            <tr><td>Юридическая форма:</td><td>{orgInfo.legal_form}</td></tr>
            <tr><td>Наименование организации:</td><td>{orgInfo.organisation_name}</td></tr>
            <tr><td>ИНН:</td><td>{orgInfo.inn}</td></tr>
            <tr><td>Код организации(КПП):</td><td>{orgInfo.organization_code}</td></tr>
            <tr><td>Email:</td><td>{orgInfo.postal_address}</td></tr>
            </tbody>
            </table>
        ) : role === "ORG_ADMIN" ? (
            <div className="form-container">
            <h3>Добавление/Редактирование информации об организации</h3>
            <form onSubmit={handleSubmit}>
            <div className="input-group">
            <label>Юридическая форма:</label>
            <select name="legal_form" value={newOrgInfo.legal_form} onChange={handleInputChange} required>
            <option value="">Выберите юридическую форму</option>
            {legalForms.map((form) => (
                <option key={form} value={form}>{form}</option>
            ))}
            </select>
            </div>
            <div className="input-group">
            <label>Наименование организации:</label>
            <input type="text" name="organisation_name" value={newOrgInfo.organisation_name} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>ИНН:</label>
            <input type="text" name="inn" value={newOrgInfo.inn} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Код организации (КПП):</label>
            <input type="text" name="organization_code" value={newOrgInfo.organization_code} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
            <label>Email:</label>
            <input type="text" name="postal_address" value={newOrgInfo.postal_address} onChange={handleInputChange} required />
            </div>
            <div className="button-container">
            <button type="submit" className="submit-button">Сохранить</button>
            </div>
            </form>
            </div>
        ) : (
            <p>Доступ ограничен</p>
        )}

        {(role === "EMPLOYEE") && (
            <div className="statistics">
            <h3>Статистика</h3>
            <table className="info-table">
            <tbody>
            <tr>
            <td>Количество водных точек:</td>
            <td>{pointCount !== null ? pointCount : "Загрузка..."}</td>
            </tr>
            </tbody>
            </table>
            </div>
        )}
        </div>
        </div>
    );
}

export default OrganizationInfo;
