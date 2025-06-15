import React, { useState, useEffect } from "react";
import { sendSingleData } from "../api/add_records";
import { fetchStructureData } from "../api/fetch_records";
import "../App.css";
import { useNotification } from "./NotificationContext";
import "../css/Organization.css";

function OrganizationInfo() {
    const userData = localStorage.getItem("user");
    const orgData = localStorage.getItem("org");
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [createdUserData, setCreatedUserData] = useState(null);
    const { showError } = useNotification();
    const [createdOrgName, setCreatedOrgName] = useState("");

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
                    const response = await fetchStructureData("nof_statistics", {
                        org_id: orgInfo.id,
                    });
                    setPointCount(response.data.point_count);
                } catch (error) {
                    console.error("Ошибка при загрузке статистики:", error);
                }
            }
        };

        loadPointCount();
    }, [orgInfo]);

    const legalForms = ["ООО", "АО", "ИП", "ПАО"];

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === "inn") {
            if (!/^\d*$/.test(value) || value.length > 12) return;
        }

        if (name === "organization_code") {
            if (!/^\d*$/.test(value) || value.length > 9) return;
        }

        setNewOrgInfo({ ...newOrgInfo, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let data;
        try {
            const response = await sendSingleData("organisations", newOrgInfo);
            setCreatedOrgName(newOrgInfo.organisation_name);
            console.log("Ответ сервера:", response);
            data = response?.data;

            setCreatedUserData({
                username: data?.username,
                password: data?.password,
            });
            setShowSuccessMessage(true);

            setNewOrgInfo({
                organisation_name: "",
                inn: "",
                organization_code: "",
                legal_form: "",
                postal_address: "",
            });
            // Убираем автоматическое скрытие модального окна, теперь оно закрывается только по кнопке

        } catch (error) {
            console.error("Ошибка отправки данных:", error);
            showError(
                "Пользователь уже создан или ошибка при отправке данных. Проверьте соединение."
            );
        }
    };

    // Функция скачивания файла с логином, паролем и названием организации
    const downloadCredentials = () => {
        if (!createdUserData) return;

        const content =
        `${createdOrgName || "Название организации не указано"}
        ────────────────────────────────────────────

        Учетная запись успешно создана для авторизации в системе.

        Логин: ${createdUserData.username}
        Временный пароль: ${createdUserData.password}

        Пожалуйста, не забудьте смените временный пароль при первом входе в систему.
        `;

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Данные_доступа_для_${createdOrgName}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const closeModal = () => {
        setShowSuccessMessage(false);
        setCreatedUserData(null);
    };

    if (!userInfo || !userInfo.role) {
        return <p>Информация о пользователе не найдена</p>;
    }

    const role = userInfo.role.replace("UserRoles.", "");

    return (
        <>
        {showSuccessMessage && (
            <div className="toast-overlay">
            <div className="toast-box success" style={{ maxWidth: "400px" }}>
            <p className="toast-title">✅ Данные успешно добавлены!</p>

            {createdUserData && (
                <div className="toast-details">
                <p className="toast-subtitle">Данные нового пользователя для организации:</p>
                <p>
                <strong>Логин:</strong> {createdUserData.username}
                </p>
                <p>
                <strong>Временный пароль:</strong> {createdUserData.password}
                </p>

                <button
                onClick={downloadCredentials}
                className="download-button"
                style={{
                    marginTop: "10px",
                    padding: "8px 15px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                }}
                >
                Скачать данные пользователя
                </button>

                <button
                onClick={closeModal}
                style={{
                    marginTop: "10px",
                    padding: "8px 15px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginLeft: "10px",
                }}
                >
                Закрыть
                </button>
                </div>
            )}
            </div>
            </div>
        )}

        <div className={role === "ORG_ADMIN" ? "no-container-style" : "organization-info-container"}>
        <div className="organization-info">
        <h2 align="center">Информация об организации</h2>
        {role === "EMPLOYEE" ? (
            <table className="info-table">
            <tbody>
            <tr>
            <td>Юридическая форма:</td>
            <td>{orgInfo.legal_form}</td>
            </tr>
            <tr>
            <td>Наименование организации:</td>
            <td>{orgInfo.organisation_name}</td>
            </tr>
            <tr>
            <td>ИНН:</td>
            <td>{orgInfo.inn}</td>
            </tr>
            <tr>
            <td>Код организации(КПП):</td>
            <td>{orgInfo.organization_code}</td>
            </tr>
            <tr>
            <td>Email:</td>
            <td>{orgInfo.postal_address}</td>
            </tr>
            </tbody>

            </table>
        ) : role === "ORG_ADMIN" ? (
            <div className="form-container">
            <h3>Добавление/Редактирование информации об организации</h3>
            <form onSubmit={handleSubmit}>
            <div className="input-group">
            <label>Юридическая форма:</label>
            <select
            name="legal_form"
            value={newOrgInfo.legal_form}
            onChange={handleInputChange}
            required
            >
            <option value="">Выберите юридическую форму</option>
            {legalForms.map((form) => (
                <option key={form} value={form}>
                {form}
                </option>
            ))}
            </select>
            </div>
            <div className="input-group">
            <label>Наименование организации:</label>
            <input
            type="text"
            name="organisation_name"
            value={newOrgInfo.organisation_name}
            onChange={handleInputChange}
            required
            />
            </div>
            <div className="input-group">
            <label>ИНН:</label>
            <input
            type="text"
            name="inn"
            value={newOrgInfo.inn}
            onChange={handleInputChange}
            required
            />
            </div>
            <div className="input-group">
            <label>Код организации (КПП):</label>
            <input
            type="text"
            name="organization_code"
            value={newOrgInfo.organization_code}
            onChange={handleInputChange}
            required
            />
            </div>
            <div className="input-group">
            <label>Email:</label>
            <input
            type="text"
            name="postal_address"
            value={newOrgInfo.postal_address}
            onChange={handleInputChange}
            required
            />
            </div>
            <div className="button-container">
            <button type="submit" className="submit-button-org">
            Сохранить
            </button>
            </div>
            </form>
            </div>
        ) : (
            <p>Доступ ограничен</p>
        )}

        {role === "EMPLOYEE" && (
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
        </>
    );
}

export default OrganizationInfo;
