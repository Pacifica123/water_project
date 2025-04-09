import React, { useState } from "react";
import "../App.css"; // Стили
import WaterReportForm from "./WaterReportForm";
import PaymentCalculationForm from "./PaymentCalculationForm";
import Water from "./Water";
import OrganizationInfo from "./OrganizationInfo";
import HistoryTable from "./HistoryTable";
import AccountingPost from "./AccountingPost";
import AdminPanel from "./AdminPanel";
import UserPage from "./UserPage";
import Rates from "./Rates";

function ProtectedContent({ onLogout }) {
  const [activeSection, setActiveSection] = useState(() => {
    const userInfo = JSON.parse(localStorage.getItem("user"));
    return userInfo.role === "UserRoles.ADMIN" ? "AdminPanel" : "notifications";
  });
  const userInfo = JSON.parse(localStorage.getItem("user"));
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

  const token = localStorage.getItem('jwtToken');
  console.log("Токен: ", token);

  // Получаем доступные разделы в зависимости от роли
  const allowedSections = getAllowedSections(userInfo.role);

  const renderContent = () => {
    if (!allowedSections.includes(activeSection)) {
      return <div>Доступ запрещен</div>;
    }

    switch (activeSection) {
      case "notifications":
        return <div>Лента уведомлений</div>;
      case "waterReport":
        return <WaterReportForm />;
      case "AccountingPost":
        return <AccountingPost/>;
      case "Water":
        return <Water />;
      case "paymentCalc":
        return <PaymentCalculationForm />;
      case "resourceAccounting":
        return <div>Форма: Учет объема забора водных ресурсов</div>;
      case "wasteWater":
        return <div>Форма: Учет объема сброса сточных вод</div>;
      case "organizationInfo":
        return <OrganizationInfo />;
      case "history":
        return <HistoryTable />;
      case "UserPage":
        return <UserPage />;
      case "AdminPanel":
        return <AdminPanel />;
      case "Rates":
        return <Rates />;
      default:
        return <div>Выберите раздел</div>;
    }
  };

  return (
    <div className="app">
    <Header userInfo={userInfo} onLogout={onLogout} orgInfo={orgInfo} />
    <div className="main-layout">
    <Sidebar setActiveSection={setActiveSection} allowedSections={allowedSections} />
    <main className="main-content">{renderContent()}</main>
    </div>
    <Footer />
    </div>
  );
}

// Определение доступных разделов по ролям
function getAllowedSections(role) {
  switch (role) {
    case "UserRoles.ADMIN":
      return [
        "AdminPanel"
      ];
    case "UserRoles.ORG_ADMIN":
      return [
        "notifications", "UserPage", "AccountingPost", "personalInfo", "organizationInfo", "history", "Rates"
      ];
    case "UserRoles.REPORT_ADMIN":
      return [
        "notifications", "waterReport", "history", "AccountingPost"
      ];
    case "UserRoles.EMPLOYEE":
      return [
        "notifications", "waterReport", "Water", "paymentCalc",
        "resourceAccounting", "wasteWater", "organizationInfo", "AccountingPost"
      ];
    default:
      return [];
  }
}

function Header({ userInfo, onLogout, orgInfo }) {
  return (
    <header className="header">
    <h1>Личный кабинет ({orgInfo.organisation_name || 'Без организации'})</h1>
    <div className="header-right">
    <span>{userInfo.last_name} {userInfo.first_name} {userInfo.middle_name}</span>
    <button className="logout-button" onClick={onLogout}>Выход</button>
    </div>
    </header>
  );
}

function Sidebar({ setActiveSection, allowedSections }) {
  return (
    <div className="sidebar">
    {allowedSections.includes("notifications") && (
      <button onClick={() => setActiveSection("notifications")}>Лента уведомлений</button>
    )}
    {allowedSections.includes("waterReport") && (
      <button onClick={() => setActiveSection("waterReport")}>
      Справка "Забор поверхностной воды за квартал"
      </button>
    )}
    {allowedSections.includes("AccountingPost") && (
      <button onClick={() => setActiveSection("AccountingPost")}>Пункт учета</button>
    )}
    {allowedSections.includes("Water") && (
      <button onClick={() => setActiveSection("Water")}>Журнал учета водопотребления</button>
    )}
    {allowedSections.includes("paymentCalc") && (
      <button onClick={() => setActiveSection("paymentCalc")}>Расчет суммы оплаты</button>
    )}
    {allowedSections.includes("resourceAccounting") && (
      <button onClick={() => setActiveSection("resourceAccounting")}>Учет объема забора водных ресурсов</button>
    )}
    {allowedSections.includes("wasteWater") && (
      <button onClick={() => setActiveSection("wasteWater")}>Учет объема сброса сточных вод</button>
    )}
    {allowedSections.includes("organizationInfo") && (
      <button onClick={() => setActiveSection("organizationInfo")}>Информация об организации</button>
    )}
    {allowedSections.includes("history") && (
      <button onClick={() => setActiveSection("history")}>История изменений</button>
    )}
    {allowedSections.includes("AdminPanel") && (
      <button onClick={() => setActiveSection("AdminPanel")}>Админ панель</button>
    )}
    {allowedSections.includes("UserPage") && (
      <button onClick={() => setActiveSection("UserPage")}>О пользователях</button>
    )}
    {allowedSections.includes("Rates") && (
      <button onClick={() => setActiveSection("Rates")}>Ставки оплаты</button>
    )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
    <button>Руководство пользователя</button>
    <button>Загруженные документы</button>
    </footer>
  );
}

export default ProtectedContent;
