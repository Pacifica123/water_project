import React, { useState, useEffect } from "react";
import { fetchStructDataWithFilters } from "../api/fetch_records";
import { sendFormData } from "../api/add_records";
import "../css/Water.css";
import * as XLSX from "xlsx";
import FileUpload from "./FileUpload";

const parseDMS = (dms) => {
  const re = /(\d+)°(\d+)′(\d+)″/;
  const m = dms.match(re);
  return m ? { deg: m[1], min: m[2], sec: m[3] } : { deg: "", min: "", sec: "" };
};

const GeneralInfoSection = ({ org, warea }) => (
  <div className="form-step">
    <h3>Общая информация</h3>
    <div className="input-group"><label>Наименование организации</label><input disabled value={org.organisation_name || ""} readOnly /></div>
    <div className="input-group"><label>Почтовый адрес</label><input disabled value={org.postal_address || ""} readOnly /></div>
    <div className="input-group"><label>ИНН</label><input disabled value={org.inn || ""} readOnly /></div>
    <div className="input-group"><label>ОПФ</label><input disabled value={org.legal_form || ""} readOnly /></div>
    <div className="input-group"><label>Бассейновый округ</label><select disabled value={warea.pool_name || ""}><option>{warea.pool_name || "Не указано"}</option></select></div>
    <div className="input-group"><label>Регион</label><input disabled value={org.region || "Кемеровская область - Кузбасс"} readOnly /></div>
  </div>
);

const HydroInfoSection = ({ wobj }) => (
  <div className="form-step">
    <h3>Гидрографическая информация</h3>
    <div className="input-group"><label>Наименование и код гидрографической единицы</label><select value={wobj.code_object.code_symbol || ""} /><select value={wobj.code_type?.code_symbol || ""} /></div>
    <div className="input-group"><label>Водохозяйственный участок</label><select value={wobj.code_object?.code_value || ""} readOnly /><select value={wobj.code_object?.code_symbol || ""} readOnly /></div>
  </div>
);

const ContractSection = ({ perm }) => (
  <div className="form-step">
    <h3>Реквизиты договора</h3>
    <div className="input-group"><label>Номер разрешения</label><input value={perm.permission_number || ""} readOnly /></div>
    <div className="input-group"><label>Дата начала</label><input type="date" value={perm.actual_start_date || ""} readOnly /></div>
    <div className="input-group"><label>Дата окончания</label><input type="date" value={perm.actual_end_date || ""} readOnly /></div>
  </div>
);

const MeterSection = ({ meter }) => (
  <div className="form-step">
    <h3>Учетный прибор</h3>
    <div className="input-group"><label>Марка прибора учета</label><input value={meter.serial_number || ""} readOnly /></div>
    <div className="input-group"><label>Дата последней поверки</label><input type="date" value={meter.verification_date || ""} readOnly /></div>
    <div className="input-group"><label>Периодичность поверки</label><input value={meter.verification_interval || ""} readOnly /></div>
  </div>
);

const WaterPointsSection = ({ records, months, handleMonthChange }) => (
  <div className="form-step">
    <h3>Точки водозабора</h3>
    <table className="data-table">
      <thead>
        <tr>
          <th>№</th><th>Водоисточник</th><th>Координаты</th><th>Категория</th><th>Объем, тыс. м³</th><th>Месяц 1</th><th>Месяц 2</th><th>Месяц 3</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec, index) => {
          const [latS, lonS] = (rec.latitude_longitude || "").split(",");
          const lat = parseDMS(latS), lon = parseDMS(lonS);
          const p = Array.isArray(rec.permissions) && rec.permissions[0] || {};
          return (
            <tr key={rec.id}>
              <td>{index + 1}</td>
              <td>{rec.water_object?.code_object?.code_value}</td>
              <td>{rec.latitude_longitude}</td>
              <td>{rec.water_object?.category}</td>
              <td>{p.allowed_volume ?? ""}</td>
              <td><input value={months[rec.id]?.month1 || ""} onChange={e => handleMonthChange(rec.id, "month1", e.target.value)} /></td>
              <td><input value={months[rec.id]?.month2 || ""} onChange={e => handleMonthChange(rec.id, "month2", e.target.value)} /></td>
              <td><input value={months[rec.id]?.month3 || ""} onChange={e => handleMonthChange(rec.id, "month3", e.target.value)} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const EditableWaterReport = () => {
  const [org, setOrg] = useState({});
  const [records, setRecords] = useState([]);
  const [months, setMonths] = useState({});
  const [excelData, setExcelData] = useState([]);
  const [fileReady, setFileReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    (async () => {
      const stored = JSON.parse(localStorage.getItem("org") || "{}");
      setOrg(stored);
      if (!stored.id) return console.error("org.id не найден");
      const resp = await fetchStructDataWithFilters("get_struct31", { org_id: stored.id });
      if (!resp || resp.status !== "success") {
        console.error("Ошибка API:", resp?.message);
        return;
      }
      const arr = resp.data.map(rec => rec);
      setRecords(arr);
      const m = {};
      arr.forEach(r => m[r.id] = { month1: "", month2: "", month3: "" });
      setMonths(m);
    })();
  }, []);

  const handleMonthChange = (pointId, field, value) => {
    setMonths(ms => ({ ...ms, [pointId]: { ...ms[pointId], [field]: value } }));
  };

  const handleExcelUpload = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[2]];
    const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(parsedData);
    setExcelData(parsedData);
    setFileReady(true);
  };

  const handleSubmit = async () => {
    if (!fileReady) return;
    setSubmitting(true);
    setResultMsg("");
    try {
      // TODO : передовать f31 либо f32 в зависимости от того какая страница выбрана в SheetNames[i]
      // где i = 1 это форма 3.1 и i = 2 соответственно форма 3.2
      const resp = await sendFormData("f32", excelData);
      if (resp.status === "success") {
        setResultMsg(`Успех: ${resp.message || "Форма отправлена"}`);
      } else {
        setResultMsg(`Ошибка: ${resp.message || "Не удалось обработать форму"}`);
      }
    } catch (err) {
      console.error(err);
      setResultMsg("Ошибка при отправке запроса");
    } finally {
      setSubmitting(false);
    }
  };

  const first = records[0] || {};
  const warea = first.water_area || {};

  return (
    <div className="water-container">
    <div className="form-container">
    <h2>Сведения по водопользованию (Форма 3.1)</h2>

    <GeneralInfoSection org={org} warea={warea} />

    <FileUpload
    label="Excel файл"
    accept=".xlsx,.xls"
    fileType="excel"
    entityType="water_report"
    entityId={org.id}
    onUpload={(file) => handleExcelUpload(file)}
    />

    {fileReady && (
      <>
      <div style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
      <table className="data-table">
      <thead>
      <tr>
      {excelData[0].map((cell, idx) => <th key={idx}>{cell}</th>)}
      </tr>
      </thead>
      <tbody>
      {excelData.slice(1).map((row, rIdx) => (
        <tr key={rIdx}>
        {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
        </tr>
      ))}
      </tbody>
      </table>

      <div style={{ flex: 1 }}>
      <WaterPointsSection
      records={records}
      months={months}
      handleMonthChange={handleMonthChange}
      />
      </div>
      </div>

      <div style={{ marginTop: 20 }}>
      <button
      onClick={handleSubmit}
      disabled={submitting}
      className="submit-button"
      >
      {submitting ? "Отправка..." : "Отправить форму 3.1"}
      </button>
      {resultMsg && <p style={{ marginTop: 8 }}>{resultMsg}</p>}
      </div>
      </>
    )}
    </div>
    </div>
  );
};




export default EditableWaterReport;

