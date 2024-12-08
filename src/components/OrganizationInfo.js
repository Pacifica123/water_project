import React from "react";
// import "./App.css"; // Подключите файл стилей для кастомизации

function OrganizationInfo() {
    const orgData = localStorage.getItem("org");
    let orgInfo = {}; // Инициализируем orgInfo как пустой объект

    if (orgData) {
        try {
            orgInfo = JSON.parse(orgData); // Пытаемся разобрать данные
        } catch (error) {
            console.error("Ошибка парсинга org:", error);
            orgInfo = {}; // Устанавливаем пустой объект в случае ошибки
        }
    }
    if (!orgInfo) {
        return <p>Информация об организации не найдена</p>;
    }

    // const {
    //     inn,
    //     organization_code,
    //     postal_address,
    //     created_at,
    //     organisation_name,
    //     legal_form,
    //     created_by,
    // } = orgInfo;

    return (
        <div className="organization-info">
        <h2>Информация об организации</h2>
        <table className="info-table">
        <tbody>
        <tr>
        <td>Наименование организации:</td>
        <td>{orgInfo.organisation_name}</td>
        </tr>
        <tr>
        <td>ИНН:</td>
        <td>{orgInfo.inn}</td>
        </tr>
        <tr>
        <td>Код организации:</td>
        <td>{orgInfo.organization_code}</td>
        </tr>
        <tr>
        <td>Юридическая форма:</td>
        <td>{orgInfo.legal_form}</td>
        </tr>
        <tr>
        <td>Почтовый адрес:</td>
        <td>{orgInfo.postal_address}</td>
        </tr>
        </tbody>
        </table>
        </div>
    );
}

export default OrganizationInfo;
