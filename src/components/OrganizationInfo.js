import React from "react";

function OrganizationInfo() {
    const userData = localStorage.getItem("user");
    let userInfo = {};

    if (userData) {
        try {
            userInfo = JSON.parse(userData);
        } catch (error) {
            console.error("Ошибка парсинга user:", error);
            userInfo = {};
        }
    }

    if (!userInfo) {
        return <p>Информация о пользователе не найдена</p>;
    }

    const orgData = localStorage.getItem("org");
    let orgInfo = {};

    if (orgData) {
        try {
            orgInfo = JSON.parse(orgData);
        } catch (error) {
            console.error("Ошибка парсинга org:", error);
            orgInfo = {};
        }
    }

    // if (!orgInfo) {
    //     return <p>Информация об организации не найдена</p>;
    // }

    // Извлекаем роль пользователя
    const userRole = userInfo.role;

    // Удаление префикса "UserRoles." из роли
    const role = userRole.replace("UserRoles.", "");
    console.log("Роль пользователя:", role);


    return (
        <div className="organization-info">
        <h2>Информация об организации</h2>

        {role === "EMPLOYEE" ? (
            // Контент для администратора организации
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
        ) : role === "REPORT_ADMIN" ? (
            // Контент для администратора отчетов
            <div>
            <p>TODO  графики, список организаций</p>
            {/* Здесь всякиие графики.. */}
            </div>
        ) : role === "ORG_ADMIN" ? (
            // Контент для администратора Министерства
            <div>
            <p>TODO  список организаций, кнопка добавления, редактирования, удаления</p>
            {/* Добавьте контент  */}
            </div>
        ) : role === "ADMIN" ? (
            // Контент для главного админа
            <div>
            <p>Административный доступ список организаций, все кнопки, возможно что-то еще</p>
            {/* эээ...? */}
            </div>
        ) : (
            // все остальное
            <div>
            <p>Доступ ограничен</p>
            {/* Добавьте контент для сотрудников или других ролей */}
            </div>
        )}
        </div>
    );
}

export default OrganizationInfo;
