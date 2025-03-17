import React, { useState, useEffect } from "react";
import "../css/Water.css";

import {fetchSingleTableData} from "../api/fetch_records"
import {sendFormData} from "../api/add_records"


const Water = () => {
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

  const waterPoints = {
    "Пункт 1": "54°20′0″N 37°30′0″E",
    "Пункт 2": "55°45′0″N 38°10′0″E"
  };

  const [Orgs, setObjects] = useState([]);
  const [Points, setObjectsPoints] = useState([]);
  const [Meters, setMeters] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orgs, points, meters] = await Promise.all([
          fetchSingleTableData("organisations"),
                                                         fetchSingleTableData("water_point"),
                                                         fetchSingleTableData("meters")
        ]);
        setObjects(orgs || []);
        setObjectsPoints(points || []);
        setMeters(meters || [])
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        setObjects([]);
        setObjectsPoints([]);
        setMeters([])
      }
    };
    loadData();
  }, []);


  const [formData, setFormData] = useState({
    organisationName: orgInfo.organisation_name || "",
    waterOrg: "",
    controlPoint: "",
    coordinates: "",
    device: "",
    waterSource: "",
    measurementDate: "",
    deviceNumber: "",
    workingTime: "",
    waterUsage: ""
  });

  const [completedSteps, setCompletedSteps] = useState({
    section1: false,
    section2: false,
    section3: false,
    section4: false
  });

  const [activeSection, setActiveSection] = useState(1);
  const [manualNavigation, setManualNavigation] = useState(false);

  const [selectedPoint, setSelectedPoint] = useState(null);
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };

    if (name === "controlPoint") {
      const selected = Points.find((point) => point.latitude_longitude === value);
      setSelectedPoint(selected);
      updatedFormData.latitude_longitude = value;
      updatedFormData.coordinates = waterPoints[value] || "";

      if (selectedPoint?.latitude_longitude !== value) {
        updatedFormData.device = '';
      }
    }

    if (name === "device") {
      updatedFormData.device = value;
      if (selectedPoint) {
        updatedFormData.waterSource = selectedPoint.water_body_id.code_obj.code_symbol;
      }
    }

    setFormData(updatedFormData);
    checkCompletion(updatedFormData);
  };

  const checkCompletion = (data) => {
    let newCompletedSteps = { ...completedSteps };

    newCompletedSteps.section1 = data.waterOrg.trim() !== "";
    newCompletedSteps.section2 = data.controlPoint.trim() !== "";
    newCompletedSteps.section3 = data.device.trim() !== "" ;
    newCompletedSteps.section4 = data.measurementDate.trim() !== "" && data.workingTime.trim() !== "" && data.waterUsage.trim() !== "";
    console.log("Статус шагов", newCompletedSteps);
    setCompletedSteps(newCompletedSteps);

    if (!manualNavigation) {
      if (newCompletedSteps.section1 && activeSection === 1) setActiveSection(2);
      if (newCompletedSteps.section2 && activeSection === 2) setActiveSection(3);
      if (newCompletedSteps.section3 && activeSection === 3) setActiveSection(4);
    }
  };

  const handleStepClick = (step) => {
    setActiveSection(step);
    setManualNavigation(true);
  };

  const handleSubmit = async () => {
    if (!formData.device) {
      alert("Выберите прибор учета!");
      return;
    }

    const data = {
      measurement_date: formData.measurementDate,
      operating_time_days: formData.workingTime,
      water_consumption_m3_per_day: formData.waterUsage,
      meter_readings: formData.device, // Передача выбранного прибора
      water_point_id: formData.controlPoint // ID пункта учета воды
    };

    console.log("Отправка данных:", data);

    try {
      const response = await sendFormData("water_consumption_single", data);
      alert("Данные успешно отправлены!");
      console.log("ttt", response)
      setFormData({
        organisationName: orgInfo.organisation_name || "",
        waterOrg: "",
        controlPoint: "",
        coordinates: "",
        device: "",
        waterSource: "",
        measurementDate: "",
        deviceNumber: "",
        workingTime: "",
        waterUsage: ""
      });
    } catch (error) {
      console.error("Ошибка отправки данных:", error);
      alert("Ошибка при отправке данных. Проверьте соединение.");
    }
  };

  return (
    <div className="water-container">
    <div className="steps">
    {[1, 2, 3, 4].map((step) => (
      <div
      key={step}
      className={`step ${completedSteps[`section${step}`] ? "completed" : ""} ${activeSection === step ? "active" : ""}`}
      onClick={() => handleStepClick(step)}
      >
      {step}
      </div>
    ))}
    </div>

    <div className="form-container">
    {activeSection === 1 && (
      <div className="form-step">
      <h2>Журнал учета водопотребления</h2>
      <div className="input-group">
      <label>Наименование организации: {formData.organisationName || "Без организации"}</label>
      </div>
      <div className="input-group">
      <label>
      Наименование организации (забор воды):
      <select name="waterOrg" value={formData.waterOrg} onChange={handleChange}>
      <option value="">Выбрать организацию</option>
      {Orgs.map((obj) => (
        <option
        key={obj.organization_code.code_symbol}
        value={obj.organisation_name}
        >
        {obj.organization_code.code_value} - {obj.organisation_name}
        </option>
      ))}
      </select>
      </label>
      </div>
      </div>
    )}

    {activeSection === 2 && (
      <div className="form-step">
      <h2>Пункт учета забора воды</h2>
      <div className="input-group">
      <label>
      Наименование пункта учета:
      <select name="controlPoint" value={formData.controlPoint} onChange={handleChange}>
      <option value="">Выбрать пункт учета</option>
      {Points.map((obj) => (
        <option
        key={obj.id}
        value={obj.latitude_longitude}
        >
        {obj.water_body_id.code_obj.code_symbol} - {obj.latitude_longitude} ({obj.point_type})
        </option>
      ))}
      </select>
      </label>
      </div>
      <div className="input-group">
      <label>Координаты пункта: {formData.latitude_longitude}</label>
      </div>
      </div>
    )}

    {activeSection === 3 && (
      <div className="form-step">
      <h2>Приборы учета</h2>
      <div className="input-group">
      <label>
      Наименование прибора:
      <select name="device" value={formData.device} onChange={handleChange}>
      <option value="">Выбрать прибор</option>
      {Meters.map((obj) => (
        <option
        key={obj.id}
        value={obj.serial_number}
        >
        {obj.brand_id.brand_name} - {obj.serial_number}
        </option>

      ))}
      </select>

      </label>
      </div>
      <div className="input-group">
      {selectedPoint && (
        <label>
        Наименование водоисточника: {selectedPoint.water_body_id.code_obj.code_symbol}
        </label>
      )}
      </div>
      </div>
    )}

    {activeSection === 4 && (
      <div className="form-step">
      <h2>Данные измерений</h2>
      <div className="input-group">
      <label>
      Дата измерения:
      <input type="date" name="measurementDate" value={formData.measurementDate} onChange={handleChange} />
      </label>
      </div>
      <div className="input-group">
      <label>
      Измерительный прибор №:
      <input
      type="text"
      name="deviceNumber"
      value={formData.deviceNumber || formData.device}
      onChange={handleChange}
      />
      </label>
      </div>
      <div className="input-group">
      <label>
      Время работы (сут.):
      <input type="number" name="workingTime" value={formData.workingTime} onChange={handleChange} />
      </label>
      </div>
      <div className="input-group">
      <label>
      Расход воды (м³/сут.):
      <input type="number" name="waterUsage" value={formData.waterUsage} onChange={handleChange} />
      </label>
      </div>
      <div  style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
      <button
      style={{
        backgroundColor: "#007BFF",
        color: "white",
        padding: "20px 300px",
        fontSize: "18px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "background 0.3s"
      }}

      onClick={handleSubmit}
      >
      Отправить
      </button>
      </div>
      </div>
    )}
    </div>
    </div>
  );
};

export default Water;
