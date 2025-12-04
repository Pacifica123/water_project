import React, { useState, useEffect, useCallback } from "react";
import "../App.css";
import WaterReportForm from "./WaterReportForm";
import PaymentCalculationForm from "./PaymentCalculationForm";
import Water from "./Water";
import OrganizationInfo from "./OrganizationInfo";
import HistoryTable from "./HistoryTable";
import AccountingPost from "./AccountingPost";
import AdminPanel from "./AdminPanel";
import UserPage from "./UserPage";
import Rates from "./Rates";
import MainNotify from "./MainNotify";
import DGisMap from "./Map";
import EditableWaterReport from "./WaterForm";
import Form32 from "./Form32Test";
import FileSectionsPage from "./FileSectionsPage";
import { getSocket } from "../socket";
import notificationSound from "../assets/hotify.mp3";

function ProtectedContent({ onLogout }) {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [activeSection, setActiveSection] = useState(() => {
    const userInfo = JSON.parse(localStorage.getItem("user"));
    return userInfo.role === "UserRoles.ADMIN" ? "AdminPanel" : "notifications";
  });

  const [newNotifyCount, setNewNotifyCount] = useState(0);
  const [recentNotifyList, setRecentNotifyList] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);

  const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);

  const userInfo = JSON.parse(localStorage.getItem("user"));
  const orgData = localStorage.getItem("org");
  let orgInfo = {};
  try {
    if (typeof orgData === "string" && orgData.trim().startsWith("{")) {
      orgInfo = JSON.parse(orgData);
    }
  } catch {
    orgInfo = {};
  }

  const allowedSections = getAllowedSections(userInfo.role);

  function cleanPythonDictString(str) {
  if (!str) return str;
  let res = str.replace(/'/g, '"');
  res = res.replace(/datetime\.datetime\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g,
    (_, y, m, d, h, min) =>
      `"${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}"`
  );
  res = res.replace(/Decimal\(["']?([\d.]+)["']?\)/g, '$1');
  return res;
}

useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const audio = new Audio(notificationSound);
  audio.volume = 0.7;

  const handleNotification = (msg) => {
    audio.play().catch(() => {});

   
let parsedText = {};

try {
  if (typeof msg.text === "string") {
    const fixed = cleanPythonDictString(msg.text);
    parsedText = JSON.parse(fixed);
  } else if (typeof msg.text === "object" && msg.text !== null) {
    parsedText = msg.text;
  } else {
    parsedText = { message: "Не удалось прочитать текст" };
  }
} catch (e) {
  console.warn("Ошибка при парсинге уведомления:", e);
  parsedText = { message: msg.text || "Ошибка парсинга" };
}


    const title = parsedText.header || parsedText.message || "Без заголовка";
    const parsedType = parsedText?.type || msg.type;
    const readableType = {
      waterreportform: "ЗАБОР ПОВЕРХНОСТНОЙ ВОДЫ",
      paymentform: "РАСЧЕТ ОПЛАТЫ",
      waterlog_complete: "ЖУРНАЛ ВОДОПОТРЕБЛЕНИЕ",
    }[parsedType] || parsedType?.toUpperCase() || "ДРУГОЕ";

const newNotif = {
  id: msg.id || Date.now() + Math.random(),
  text: parsedText,
  date: msg.date || new Date().toISOString().split("T")[0],
  type: parsedText?.type || msg.type || "ДРУГОЕ",
  raw: msg,
  read: false,
};


    setAllNotifications((prev) => [newNotif, ...prev]);
    setRecentNotifyList((prev) => [newNotif, ...prev.slice(0, 4)]);
    setNewNotifyCount((count) => count + 1);
  };

  socket.on("notification", handleNotification);
  return () => socket.off("notification", handleNotification);
}, []);


  const renderContent = () => {
    if (!allowedSections.includes(activeSection)) {
      return <div>Доступ запрещен</div>;
    }

    switch (activeSection) {
case "notifications":
  return (
    <MainNotify
      notifications={allNotifications}
      setNotifications={(list) => {
        setAllNotifications(list);
        setNewNotifyCount(list.filter(n => !n.read).length);
        setRecentNotifyList(list.slice(0, 5));
      }}
    />
  );

      case "waterReport":
        return <WaterReportForm />;
      case "AccountingPost":
        return <AccountingPost />;
      case "Water":
        return <Water />;
      case "paymentCalc":
        return <PaymentCalculationForm />;
      case "wasteWater":
        return <Form32 />;
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
      case "Map":
        return <DGisMap />;
      case "Form31":
        return <EditableWaterReport />;
      case "FileSections":
        return <FileSectionsPage />;
      default:
        return <div>Выберите раздел</div>;
    }
  };

  return (
    <div className="app">
      <Header
        userInfo={userInfo}
        onLogout={onLogout}
        orgInfo={orgInfo}
        toggleSidebar={toggleSidebar}
        setActiveSection={setActiveSection}
        newNotifyCount={newNotifyCount}
        recentNotifyList={recentNotifyList}
        resetNotifyCount={() => setNewNotifyCount(0)}
      />
      <div className="main-layout">
        {userInfo.role !== "UserRoles.ADMIN" && (
          <Sidebar
            setActiveSection={setActiveSection}
            allowedSections={allowedSections}
            activeSection={activeSection}
            isVisible={isSidebarVisible}
          />
        )}
        <main className="main-content">{renderContent()}</main>
      </div>
      <Footer setActiveSection={setActiveSection} />
    </div>
  );
}

function getAllowedSections(role) {
  switch (role) {
    case "UserRoles.ADMIN":
      return ["AdminPanel", "Map"];
    case "UserRoles.ORG_ADMIN":
      return [
        "notifications", "UserPage", "waterReport", "AccountingPost", "personalInfo",
        "organizationInfo", "history", "Rates", "Map"
      ];
    case "UserRoles.EMPLOYEE":
      return [
        "notifications", "organizationInfo", "waterReport", "paymentCalc",
        "Water", "AccountingPost", "Form31", "FileSections"
      ];
    default:
      return [];
  }
}


function Header({
  userInfo,
  onLogout,
  orgInfo,
  toggleSidebar,
  setActiveSection,
  newNotifyCount,
  recentNotifyList,
  resetNotifyCount
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleNotifyClick = () => {
    setShowDropdown((prev) => !prev);
    resetNotifyCount();
  };

  const handleNotifyPanelClick = () => {
    setShowDropdown(false);
    setActiveSection("notifications");
    resetNotifyCount();
  };

  return (
    <header className="header">
      <button
        className="sidebar-toggle"
        style={{ visibility: userInfo.role === "UserRoles.ADMIN" ? "hidden" : "visible" }}
        onClick={toggleSidebar}
      >
        ☰
      </button>
      <h1>Личный кабинет ({orgInfo.organisation_name || 'Без организации'})</h1>
      <div className="header-right" style={{ position: "relative" }}>
        <button className="notify-button" title="Уведомления" onClick={handleNotifyClick}>
          🔔
          {newNotifyCount > 0 && <span className="notify-badge">{newNotifyCount}</span>}
        </button>

        {showDropdown && (
          <div className="notify-dropdown">
            <div className="notify-dropdown-header">
              Новые уведомления
              <button onClick={handleNotifyPanelClick}>Открыть ленту</button>
            </div>
           <ul className="notify-dropdown-list">
  {recentNotifyList.length === 0 ? (
    <li className="empty">Нет новых</li>
  ) : (
    recentNotifyList.map((n) => (
      <li key={n.id}>
        {n.text?.header || n.text?.message || "Уведомление"}
      </li>
    ))
  )}
</ul>

          </div>
        )}

        <span className="visibel">
          {userInfo.last_name} {userInfo.first_name} {userInfo.middle_name}
        </span>
        <button className="logout-button" onClick={onLogout}>Выход</button>
      </div>
    </header>
  );
}

function Sidebar({ setActiveSection, allowedSections, activeSection, isVisible }) {
  const getButtonClass = (section) =>
    activeSection === section ? "active-button" : "";

  return (
    <div className={`sidebar ${isVisible ? 'show' : 'hide'}`}>
      {allowedSections.includes("notifications") && (
        <button className={getButtonClass("notifications")} onClick={() => setActiveSection("notifications")}>
          Лента уведомлений
        </button>
      )}
{allowedSections.includes("Water") && (
        <button className={getButtonClass("Water")} onClick={() => setActiveSection("Water")}>
          Журнал учета водопотребления
        </button>
      )}
      {allowedSections.includes("waterReport") && (
        <button className={getButtonClass("waterReport")} onClick={() => setActiveSection("waterReport")}>
          Справка "Забор поверхностной воды за квартал"
        </button>
      )}
      {allowedSections.includes("paymentCalc") && (
        <button className={getButtonClass("paymentCalc")} onClick={() => setActiveSection("paymentCalc")}>
          Расчет суммы оплаты
        </button>
      )}
      {allowedSections.includes("wasteWater") && (
        <button className={getButtonClass("wasteWater")} onClick={() => setActiveSection("wasteWater")}>
          Учет объема сброса сточных вод
        </button>
      )}
      {allowedSections.includes("AccountingPost") && (
        <button className={getButtonClass("AccountingPost")} onClick={() => setActiveSection("AccountingPost")}>
          Пункт учета
        </button>
      )}
      {allowedSections.includes("organizationInfo") && (
        <button className={getButtonClass("organizationInfo")} onClick={() => setActiveSection("organizationInfo")}>
          Информация об организации
        </button>
      )}
      {allowedSections.includes("history") && (
        <button className={getButtonClass("history")} onClick={() => setActiveSection("history")}>
          История изменений
        </button>
      )}
      {allowedSections.includes("AdminPanel") && (
        <button className={getButtonClass("AdminPanel")} onClick={() => setActiveSection("AdminPanel")}>
          Админ панель
        </button>
      )}
      {allowedSections.includes("UserPage") && (
        <button className={getButtonClass("UserPage")} onClick={() => setActiveSection("UserPage")}>
          О пользователях
        </button>
      )}
      {allowedSections.includes("Rates") && (
        <button className={getButtonClass("Rates")} onClick={() => setActiveSection("Rates")}>
          Ставки оплаты
        </button>
      )}
      {allowedSections.includes("Map") && (
        <button className={getButtonClass("Map")} onClick={() => setActiveSection("Map")}>
          Карта
        </button>
      )}
      {allowedSections.includes("Form31") && (
        <button className={getButtonClass("Form31")} onClick={() => setActiveSection("Form31")}>
          Форма 3.1
        </button>
      )}
    </div>
  );
}

function Footer({ setActiveSection }) {
  return (
    <footer className="footer">
      <button>Руководство пользователя</button>
      <button onClick={() => setActiveSection("FileSections")}>Загруженные документы</button>
    </footer>
  );
}

export default ProtectedContent;
