import React, { useState, useEffect } from "react";
import "../css/Water.css";
import { useNotification } from "./NotificationContext";

import {fetchStructDataWithFilters} from "../api/fetch_records"
import {sendFormData} from "../api/add_records"
import {translate} from "../utils/translations"

const Water = () => {

  const {showSuccess, showError,askConfirmation} = useNotification();
  const [availableLogs, setAvailableLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

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
  // const [Meters, setMeters] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resp = await fetchStructDataWithFilters("organisations_familiar", {"org_id": orgInfo.id});
        console.log(resp);
        const [orgs, points] = await Promise.all([
          resp?.data.orgs, resp?.data.points
          // fetchSingleTableData("meters")
        ]);
        setObjects(orgs || []);
        setObjectsPoints(points || []);
        // setMeters(meters || [])
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        setObjects([]);
        setObjectsPoints([]);
        // setMeters([])
      }
    };
    loadData();
  }, []);


  const [formData, setFormData] = useState({
    organisationName: orgInfo.organisation_name || "",
    waterOrg: "",
    controlPoint: "",
    coordinates: "",
    device: "", //Удаляем device
    waterSource: "",
    measurementDate: "",
    deviceNumber: "",
    workingTime: "",
    waterUsage: "",
    personSignature: ""
  });

  const [completedSteps, setCompletedSteps] = useState({
    section1_2: false,
    section4: false
  });

  const [activeSection, setActiveSection] = useState(1);
  const [manualNavigation, setManualNavigation] = useState(false);

  const [selectedPoint, setSelectedPoint] = useState(null);
  const handleChange = async (e) => {
    const { name, value } = e.target;
    let val = value;

    // Обработка отрицательных значений и ограничение для workingTime
    if ((name === "waterUsage" || name === "workingTime")) {
      let parsed = parseFloat(val);
      if (isNaN(parsed) || parsed < 0) {
        val = "0";
      } else if (name === "workingTime" && parsed > 24) {
        val = "24";
      } else {
        val = parsed.toString();
      }
    }

    let updatedFormData = { ...formData, [name]: val };

    if (name === "controlPoint") {
      const selected = Points.find((point) => point.latitude_longitude === val);

      let logsForPoint = [];

      try {
        const resp = await fetchStructDataWithFilters("logs_for_AP", {
          org_id: orgInfo.id,
          role: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).role : ""
        });
        if (resp?.data) {
          const allowedStatuses = ["IN_PROGRESS","UNDER_CORRECTION"];
          logsForPoint = resp.data.filter(log =>
          log.point_id?.latitude_longitude === val && allowedStatuses.includes(log.log_status)
          );
          setAvailableLogs(logsForPoint);
        }
      } catch (error) {
        console.error("Ошибка загрузки журналов:", error);
        showError("Ошибка при проверке журналов.");
        return;
      }

      if (logsForPoint.length === 0) {
        showError("❌ Для выбранного пункта учета не найден журнал.");
        return;
      }

      // Если журнал только один — сразу устанавливаем
      if (logsForPoint.length === 1) {
        const journal = logsForPoint[0];
        setSelectedLog(journal);

        const dateObj = new Date(journal.start_date);
        const today = new Date();
        const maxDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
        const safeDay = Math.min(today.getDate(), maxDay);
        const autoDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), safeDay);
        const formattedDate = autoDate.toISOString().split("T")[0];
        updatedFormData.measurementDate = formattedDate;
      }

      setSelectedPoint(selected);
      updatedFormData.latitude_longitude = val;
      updatedFormData.coordinates = waterPoints[val] ||  "";
      updatedFormData.deviceNumber = selected?.meter_id?.brand?.brand_name && selected?.meter_id?.serial_number
      ? `${selected.meter_id.brand.brand_name} - ${selected.meter_id.serial_number}`
      : "";
      updatedFormData.waterSource = selected?.water_body_id?.code_obj?.code_symbol || "";
    }

    if (name === "deviceNumber") {
      updatedFormData.deviceNumber = val;
    }

    setFormData(updatedFormData);
    checkCompletion(updatedFormData);
  };

  const checkCompletion = (data) => {
    let newCompletedSteps = { ...completedSteps };

    newCompletedSteps.section1_2 = data.waterOrg.trim() !== "" && data.controlPoint.trim() !== "";
    newCompletedSteps.section4 = data.measurementDate.trim() !== "" && data.workingTime.trim() !== "" && data.waterUsage.trim() !== "" && data.personSignature.trim() !== "";

    setCompletedSteps(newCompletedSteps);

    if (!manualNavigation) {
      if (newCompletedSteps.section1_2 && activeSection === 1) setActiveSection(2);
    }
  };

  const handleStepClick = (step) => {
    setActiveSection(step);
    setManualNavigation(true);
  };

  const handleSubmit = async () => {
    if (!formData.deviceNumber) {
      alert("Выберите прибор учета!");
      return;
    }
    const confirmed = await askConfirmation("Вы уверены, что хотитеть отправить данные?");
    if(!confirmed) return;
    const data = {
      measurement_date: formData.measurementDate,
      operating_time_days: formData.workingTime,
      water_consumption_m3_per_day: formData.waterUsage,
      meter_readings: formData.deviceNumber, // Передаем deviceNumber
      water_point_id: formData.controlPoint, // ID пункта учета воды
      person_signature: formData.personSignature
    };

    console.log("Отправка данных:", data);

    try {
      const response = await sendFormData("water_consumption_single", data);
      showSuccess();
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
        waterUsage: "",
        personSignature: ""
      });
    } catch (error) {
      console.error("Ошибка отправки данных:", error);
      showError();
    }
  };

  return (
    <div className="water-container">

    <div className="form-container">
    <center>
    <h2>Журнал учета водопотребления</h2>
    </center>
    <div className="steps">
    {[1, 2].map((step) => (
      <div
      key={step}
      className={`step ${completedSteps[step === 1 ? "section1_2" : "section4"] ? "completed" : ""} ${activeSection === step ? "active" : ""}`}
      onClick={() => handleStepClick(step)}
      >
      {step}
      </div>
    ))}
    </div>
    {activeSection === 1 && (
      <div className="form-step">
      {/* Объединяем поля из секций 1 и 2 */}
      <div className="input-group">
      <label>Наименование организации: {formData.organisationName || "Без организации"}</label>
      </div>
      <div className="input-group">
      <label>
      Наименование организации (забор воды):
      <select name="waterOrg" value={formData.waterOrg} onChange={handleChange}>
      <option value="">Выбрать организацию</option>
      {Orgs.map((obj) => (
        <option key={obj.organization_code.code_symbol} value={obj.organisation_name}>
        {obj.organization_code.code_value} - {obj.organisation_name}
        </option>
      ))}
      </select>
      </label>
      </div>

      <div className="input-group">
      <label>
      Наименование пункта учета:
      <select name="controlPoint" value={formData.controlPoint} onChange={handleChange}>
      <option value="">Выбрать пункт учета</option>
      {Points.map((obj) => (
        <option key={obj.id} value={obj.latitude_longitude}>
        {obj.water_body_id.code_obj.code_symbol} - {obj.latitude_longitude} ({translate(obj.point_type)})
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

    {activeSection === 2 && (
      <div className="form-step">
      {availableLogs.length > 1 && (
        <div className="input-group">
        <label>
        Выберите журнал:
        <select
        value={selectedLog?.id || ""}
        onChange={(e) => {
          const journal = availableLogs.find(log => log.id.toString() === e.target.value);
          setSelectedLog(journal);
          if (journal?.start_date) {
            const dateObj = new Date(journal.start_date);
            const today = new Date();
            const maxDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
            const safeDay = Math.min(today.getDate(), maxDay);
            const autoDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), safeDay);
            const formattedDate = autoDate.toISOString().split("T")[0];

            setFormData(prev => ({
              ...prev,
              measurementDate: formattedDate
            }));
          }
        }}
        >
        <option value="">Выберите журнал</option>
        {availableLogs.map((log) => {
          const date = new Date(log.start_date);
          const formatted = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
          return (
            <option key={log.id} value={log.id}>
            {formatted} — статус: {translate(log.log_status)}
            </option>
          );
        })}
        </select>
        </label>
        </div>
      )}
      <h2>Данные измерений</h2>
      {/* Поменяли местами поля "Измерительный прибор" и "Дата измерения" */}
      <div className="input-group">
      <label>
      Измерительный прибор №:
      <input
      type="text"
      name="deviceNumber"
      value={formData.deviceNumber}
      onChange={handleChange}
      />
      </label>
      </div>
      <div className="input-group">
      <label>
      Дата измерения:
      <input type="date" name="measurementDate" value={formData.measurementDate} onChange={handleChange} />
      </label>
      </div>
      <div className="input-group">
      <label>
      Время работы (сут.):
      <input type="number" pattern="[0-9]*"  min="0" max="24" name="workingTime" value={formData.workingTime || 0} onChange={handleChange} />
      </label>
      </div>
      <div className="input-group">
      <label>
      Расход воды (м³/сут.):
      <input type="number" pattern="[0-9]*" min="0" name="waterUsage" value={formData.waterUsage || 0} onChange={handleChange} />
      </label>
      </div>
      {/* Добавлено поле ФИО */}
      <div className="input-group">
      <label>
      ФИО осуществляющего учет:
      <input type="text" name="personSignature" value={formData.personSignature} onChange={handleChange} />
      </label>
      </div>
      <div  style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
      <button className="submit-button-water"
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
