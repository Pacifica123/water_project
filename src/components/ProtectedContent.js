// import React, { useState, useEffect } from "react";
import React, {useState} from "react"
import "../App.css"; // Стили для дизайна, похожего на пример
import WaterReportForm from "./WaterReportForm";
import PaymentCalculationForm from "./PaymentCalculationForm";
import Water from "./Water"
import OrganizationInfo from "./OrganizationInfo"

function ProtectedContent({ onLogout }) {

  const [activeSection, setActiveSection] = useState("notifications");
  // const [userInfo] = useState({
  //   organization: localStorage.getItem("org").organisation_name, // Заглушка для названия организации
  //   fullName: localStorage.getItem("user").last_name, // Заглушка для ФИО пользователя
  // });
  const userInfo = JSON.parse(localStorage.getItem("user"));
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

  const token = localStorage.getItem('jwtToken');
  console.log("токен - ", token);

  const renderContent = () => {
    switch (activeSection) {
      case "notifications":
        return <div>Лента уведомлений</div>;
      case "waterReport":
        return <WaterReportForm />;
      case "pynk":
          return <div>Форма:Пункт учета</div>;
      case "Water":
        return <Water />;
      case "paymentCalc":
        return <PaymentCalculationForm/>;
      case "resourceAccounting":
        return <div>Форма: Учет объема забора водных ресурсов</div>;
      case "wasteWater":
        return <div>Форма: Учет объема сброса сточных вод</div>;
      case "personalInfo":
        return <div>Личная информация о себе</div>;
      case "organizationInfo":
        return <OrganizationInfo />;
      default:
        return <div>Выберите раздел</div>;
    }
  };

  return (
    <div className="app">
      <Header userInfo={userInfo} onLogout = {onLogout} orgInfo = {orgInfo}/>
      <div className="main-layout">
        <Sidebar setActiveSection={setActiveSection} />
        <main className="main-content">{renderContent()}</main>
      </div>
      <Footer />
    </div>
  );
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

function Sidebar({ setActiveSection }) {
  return (
    <div className="sidebar">
      <button onClick={() => setActiveSection("notifications")}>Лента уведомлений</button>
      <button onClick={() => setActiveSection("waterReport")}>
        Справка "Забор поверхностной воды за квартал"
      </button>
      <button onClick={() => setActiveSection("pynk")}>
       Пункт учета
      </button>
      <button onClick={() => setActiveSection("Water")}>Журнал учета водопотребления</button>
      <button onClick={() => setActiveSection("paymentCalc")}>Расчет суммы оплаты</button>
      <button onClick={() => setActiveSection("resourceAccounting")}>
        Учет объема забора водных ресурсов
      </button>
      <button onClick={() => setActiveSection("wasteWater")}>Учет объема сброса сточных вод</button>
      <button onClick={() => setActiveSection("personalInfo")}>Личная информация</button>
      <button onClick={() => setActiveSection("organizationInfo")}>Информация об организации</button>
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
