import React, { useState, useEffect } from "react";
import { sendSingleData, sendUpdateData } from "../api/add_records";
import { fetchStructureData } from "../api/fetch_records";
import "../App.css";
import { useNotification } from "./NotificationContext";
import "../css/Organization.css";

function OrganizationInfo() {
  const userData = localStorage.getItem("user");
  const orgData = localStorage.getItem("org");

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [createdUserData, setCreatedUserData] = useState(null);
  const [createdOrgName, setCreatedOrgName] = useState("");
  const [newOrgInfo, setNewOrgInfo] = useState({
    legal_form: "",
    organisation_name: "",
    inn: "",
    organization_code: "",
    postal_address: "",
  });
  const [pointCount, setPointCount] = useState(null);

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { showError, showSuccess } = useNotification();

  let userInfo = {};
  let orgInfo = {};

  try {
    userInfo = userData ? JSON.parse(userData) : {};
    orgInfo = orgData ? JSON.parse(orgData) : {};
  } catch (error) {
    console.error("Ошибка парсинга данных:", error);
  }

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

  // ------------------ Работа с формой организации ------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "inn" && (!/^\d*$/.test(value) || value.length > 12)) return;
    if (name === "organization_code" && (!/^\d*$/.test(value) || value.length > 9)) return;

    setNewOrgInfo({ ...newOrgInfo, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await sendSingleData("organisations", newOrgInfo);
      setCreatedOrgName(newOrgInfo.organisation_name);

      const data = response?.data;
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
    } catch (error) {
      console.error("Ошибка отправки данных:", error);
      showError(
        "Пользователь уже создан или ошибка при отправке данных. Проверьте соединение."
      );
    }
  };

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

  // ------------------ Смена пароля ------------------
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("Пароли не совпадают");
      return;
    }

    try {
      await sendUpdateData("users", userInfo.id, {
        username: userInfo.username,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        email: userInfo.email,
        role: userInfo.role.replace("UserRoles.", ""),
        password: passwordData.newPassword,
        created_at: userInfo.created_at || new Date().toISOString(),
        created_by: userInfo.created_by || userInfo.id,
      });

      setPasswordChangeSuccess(true);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      showSuccess("Пароль успешно изменён!");
      setShowPasswordForm(false); // скрываем форму после успешной смены
    } catch (error) {
      showError("Ошибка при смене пароля: " + error.message);
    }
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
                <p><strong>Логин:</strong> {createdUserData.username}</p>
                <p><strong>Временный пароль:</strong> {createdUserData.password}</p>

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
            <>
              <table className="info-table">
                <tbody>
                  <tr><td>Юридическая форма:</td><td>{orgInfo.legal_form}</td></tr>
                  <tr><td>Наименование организации:</td><td>{orgInfo.organisation_name}</td></tr>
                  <tr><td>ИНН:</td><td>{orgInfo.inn}</td></tr>
                  <tr><td>Код организации(КПП):</td><td>{orgInfo.organization_code}</td></tr>
                  <tr><td>Email:</td><td>{orgInfo.postal_address}</td></tr>
                </tbody>
              </table>

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

                {/* Кнопка для показа/скрытия формы смены пароля */}
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  style={{
                    
                          display: "block",
                          margin: "20px auto 0 auto",
                          padding: "1.5vh 5vh",
                          fontSize: "1.8vh",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "3vh",
                          cursor: "pointer",
                  }}
                  
                >
                  {showPasswordForm ? "Отмена" : "Сменить пароль"}
                </button>

                {/* Скрываемая форма смены пароля */}
                {showPasswordForm && (
                  <div className="password-change" style={{ marginTop: "20px" }}>
                    <form onSubmit={changePassword}>
                      <div className="input-group">
                        <label>Новый пароль:</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Подтверждение пароля:</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        style={{
                          display: "block",
                          margin: "20px auto 0 auto",
                          padding: "1.5vh 5vh",
                          fontSize: "1.8vh",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "3vh",
                          cursor: "pointer",
                        }}
                      >
                        Сменить пароль
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
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
                      <option key={form} value={form}>{form}</option>
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
                  <button type="submit" className="submit-button-org">Сохранить</button>
                </div>
              </form>
            </div>
          ) : (
            <p>Доступ ограничен</p>
          )}
        </div>
      </div>
    </>
  );
}

export default OrganizationInfo;