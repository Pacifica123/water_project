 // --- NotificationModal.jsx ---
 import React from "react";
 import "../css/NotificationModal.css";
 import { sendNotificationReaction } from "../api/notify_reaction";

 // Парсим нестандартный JSON: меняем кавычки, конвертируем datetime и Decimal
 function safeParse(rawText) {
     if (!rawText) return null;

     // 1. Заменяем одинарные кавычки на двойные (простая замена)
     let jsonStr = rawText.replace(/'/g, '"');

     // 2. Преобразуем datetime.datetime(2025, 6, 11) в ISO строку "2025-06-11T00:00:00.000Z"
     // 2. Преобразуем datetime.datetime(2025, 6, 11) → "2025-06-11"
     jsonStr = jsonStr.replace(/datetime\.datetime\(([\d,\s]+)\)/g, (_, dateParts) => {
         const parts = dateParts.split(",").map(x => Number(x.trim()));
         const [year, month, day] = parts;
         const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
         return `"${formattedDate}"`;
     });


     // 3. Decimal("100") превращаем просто в число "100"
     jsonStr = jsonStr.replace(/Decimal\("([\d\.]+)"\)/g, (_, num) => num);

     try {
         return JSON.parse(jsonStr);
     } catch (e) {
         console.error("Ошибка парсинга JSON:", e);
         return null;
     }
 }

 // Форматируем дату для отображения "дд.мм.гггг"
 const formatDate = (isoString) => {
     if (!isoString) return "-";
     const date = new Date(isoString);
     if (isNaN(date)) return isoString;
     return date.toLocaleDateString("ru-RU");
 };


 function NotificationModal({ notification, onClose, onReact }) {
     let parsedContent = null;

     if (typeof notification.text === "string") {
         parsedContent = safeParse(notification.raw?.text || notification.text);
         console.log("Уведомление: ", notification.raw?.text);
         console.log("Уведомление объект: ", notification);
     } else if (typeof notification.text === "object" && notification.text !== null) {
         parsedContent = notification.text;
     }

     function handleReactionClick(reaction) {
         if (typeof onReact !== "function") {
             console.error("❌ onReact не передан в NotificationModal");
             return;
         }
         onReact(notification, reaction)
         .then(() => onClose())
         .catch((err) => {
             alert("Ошибка при отправке реакции: " + (err.message || err));
         });
     }

     const monthNames = [
         "Январь", "Февраль", "Март",
         "Апрель", "Май", "Июнь",
         "Июль", "Август", "Сентябрь",
         "Октябрь", "Ноябрь", "Декабрь"
     ];

     const renderWaterReportTable = (reportData) => {
         if (!Array.isArray(reportData)) return <p>Нет данных для отчёта</p>;

         return (
             <table className="water-report-table">
             <thead>
             <tr>
             <th>Месяц</th>
             <th>Факт</th>
             <th>Население</th>
             <th>Прочее</th>
             </tr>
             </thead>
             <tbody>
             {parsedContent.quarter &&
                 reportData.map((monthData, idx) => {
                     const quarter = parsedContent.quarter;
                     const monthIndex = (quarter - 1) * 3 + idx;
                     const monthName = monthNames[monthIndex] || `Месяц ${monthIndex + 1}`;
                     return (
                         <tr key={idx}>
                         <td>{monthName}</td>
                         <td>{monthData.fact ?? "-"}</td>
                         <td>{monthData.population ?? "-"}</td>
                         <td>{monthData.other ?? "-"}</td>
                         </tr>
                     );
                 })}
                 </tbody>
                 </table>
         );
     };

     const formatDate = (rawDate) => {
         if (typeof rawDate === "string" && rawDate.includes("datetime.datetime")) {
             const match = rawDate.match(/datetime\.datetime\(([\d,\s]+)\)/);
             if (match) {
                 const parts = match[1].split(",").map(p => parseInt(p.trim()));
                 const date = new Date(parts[0], parts[1] - 1, parts[2]);
                 return date.toLocaleDateString("ru-RU");
             }
         }
         return rawDate;
     };

     const renderTable = (data) => {
         if (!Array.isArray(data)) return <p>Нет данных</p>;
         const hasPayment = data[0]?.totalPayment !== undefined;

         return (
             <table className="water-report-table">
             <thead>
             <tr>
             <th>Показатель</th>
             <th>Ед. изм.</th>
             <th>Установлено</th>
             <th>Факт</th>
             <th>В пределах</th>
             <th>Превышение</th>
             {hasPayment && <th>Сумма платы</th>}
             </tr>
             </thead>
             <tbody>
             {data.map((row, idx) => (
                 <tr key={idx}>
                 <td>{row.indicator}</td>
                 <td>{row.unit}</td>
                 <td>{row.establishedVolume}</td>
                 <td>{row.actualVolume}</td>
                 <td>{row.withinLimitsVolume}</td>
                 <td>{row.exceededVolume}</td>
                 {hasPayment && <td>{row.totalPayment}</td>}
                 </tr>
             ))}
             </tbody>
             </table>
         );
     };

     const renderWaterLogTable = (records) => {
         if (!Array.isArray(records)) return <p>Нет записей</p>;


         return (
             <table className="water-report-table">
             <thead>
             <tr>
             <th>Дата измерения</th>
             <th>Дней работы</th>
             <th>Расход воды (м³/сут)</th>
             <th>Показания счетчика</th>
             <th>Подпись</th>
             </tr>
             </thead>
             <tbody>
             {records.map((rec, idx) => (
                 <tr key={idx}>
                 <td>{formatDate(rec.measurement_date)}</td>
                 <td>{rec.operating_time_days}</td>
                 <td>{rec.water_consumption_m3_per_day}</td>
                 <td>{rec.meter_readings}</td>
                 <td>{rec.person_signature}</td>
                 </tr>
             ))}
             </tbody>
             </table>
         );
     };

     const renderDetails = () => {
         if (!parsedContent) {
             return (
                 <div>
                 <h3>Общее уведомление</h3>
                 <p>{notification.text}</p>
                 </div>
             );
         }

         switch (parsedContent.type) {
             case "registration":
                 return (
                     <div>
                     <h3>Регистрация организации</h3>
                     <p>{parsedContent.message || notification.text}</p>
                     </div>
                 );
             case "report":
                 return (
                     <div>
                     <h3>Отчетность</h3>
                     <p>{parsedContent.message || notification.text}</p>
                     </div>
                 );

             case "waterlog_complete":
                 return (
                     <div>
                     <h3>{parsedContent.header}</h3>
                     <p>
                     Организация: <strong>{parsedContent.organisation_name}</strong><br />
                     Водообъект: <strong>{parsedContent.water_object_code}</strong><br />
                     Период: <strong>{parsedContent.month}.{parsedContent.year}</strong>
                     </p>
                     {renderWaterLogTable(parsedContent.records)}
                     <div className="action-buttons">
                     <button className="add-button" onClick={() => handleReactionClick("approve")}>
                     Принять
                     </button>
                     <button className="edit-button" onClick={() => handleReactionClick("revise")}>
                     На доработку
                     </button>
                     </div>
                     </div>
                 );

             case "waterreportform":
                 return (
                     <div>
                     <h3>{parsedContent.header}</h3>
                     <p>{parsedContent.message}</p>
                     {renderWaterReportTable(parsedContent.reportData)}
                     <div className="action-buttons">
                     <button className="add-button" onClick={() => handleReactionClick("approve")}>
                     Принять
                     </button>
                     <button className="edit-button" onClick={() => handleReactionClick("revise")}>
                     На доработку
                     </button>
                     </div>
                     </div>
                 );

             case "paymentform":
                 return (
                     <div>
                     <h3>{parsedContent.header}</h3>
                     <p>{parsedContent.message}</p>
                     <h4>Платежи</h4>
                     {renderTable(parsedContent.payment)}
                     <h4>Параметры</h4>
                     {renderTable(parsedContent.parameters)}
                     <div className="action-buttons">
                     <button className="add-button" onClick={() => handleReactionClick("approve")}>
                     Принять
                     </button>
                     <button className="edit-button" onClick={() => handleReactionClick("revise")}>
                     На доработку
                     </button>
                     </div>
                     </div>
                 );

             case "registry":
                 return (
                     <div>
                     <h3>Реестры</h3>
                     <p>{parsedContent.message || notification.text}</p>
                     </div>
                 );

             default:
                 return (
                     <div>
                     <h3>Общее уведомление (JSON)</h3>
                     <pre>{JSON.stringify(parsedContent, null, 2)}</pre>
                     </div>
                 );
         }
     };


     return (
         <div className="modal-overlay" onClick={onClose}>
         <div className="modal-content" onClick={(e) => e.stopPropagation()}>
         <button className="modal-close" onClick={onClose}>×</button>
         {
             renderDetails()
        }
         <p><small>Дата: {notification.date}</small></p>
         </div>
         </div>
     );
 }

 export default NotificationModal;
