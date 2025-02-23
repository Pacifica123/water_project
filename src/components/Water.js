import React, { useState } from "react";
import "../css/Water.css"; // Подключаем стили

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
    waterUsage: "",
    signature: ""
  });

  const [completedSteps, setCompletedSteps] = useState({
    section1: false,
    section2: false,
    section3: false,
    section4: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Проверяем заполнение текущего блока и скрываем его
    switch (name) {
      case "waterOrg":
        if (value.trim() !== "") setCompletedSteps((prev) => ({ ...prev, section1: true }));
        break;
      case "controlPoint":
      case "coordinates":
        if (formData.controlPoint.trim() !== "" && formData.coordinates.trim() !== "")
          setCompletedSteps((prev) => ({ ...prev, section2: true }));
        break;
      case "device":
      case "waterSource":
        if (formData.device.trim() !== "" && formData.waterSource.trim() !== "")
          setCompletedSteps((prev) => ({ ...prev, section3: true }));
        break;
      case "measurementDate":
      case "deviceNumber":
      case "workingTime":
      case "waterUsage":
      case "signature":
        if (
          formData.measurementDate.trim() !== "" &&
          formData.deviceNumber.trim() !== "" &&
          formData.workingTime.trim() !== "" &&
          formData.waterUsage.trim() !== "" &&
          formData.signature.trim() !== ""
        )
          setCompletedSteps((prev) => ({ ...prev, section4: true }));
        break;
      default:
        break;
    }
  };

  const handleSubmit = () => {
    alert("Форма отправлена!");
  };

  return (
    <div className="water-container">
      <div className="steps">
        <div className={`step ${completedSteps.section1 ? "completed" : ""}`}>1</div>
        <div className={`step ${completedSteps.section2 ? "completed" : ""}`}>2</div>
        <div className={`step ${completedSteps.section3 ? "completed" : ""}`}>3</div>
        <div className={`step ${completedSteps.section4 ? "completed" : ""}`}>4</div>
      </div>

      <div className="form-container">
        {/* Раздел 1 */}
        {!completedSteps.section1 && (
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
                  <option value="Org1">Организация 1</option>
                  <option value="Org2">Организация 2</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Раздел 2 */}
        {completedSteps.section1 && !completedSteps.section2 && (
          <div className="form-step">
            <h2>Пункт учета забора воды</h2>
            <div className="input-group">
              <label>
                Наименование пункта учета:
                <input type="text" name="controlPoint" value={formData.controlPoint} onChange={handleChange} />
              </label>
            </div>
            <div className="input-group">
              <label>
                Координаты пункта:
                <input type="text" name="coordinates" value={formData.coordinates} onChange={handleChange} />
              </label>
            </div>
          </div>
        )}

        {/* Раздел 3 */}
        {completedSteps.section2 && !completedSteps.section3 && (
          <div className="form-step">
            <h2>Приборы учета</h2>
            <div className="input-group">
              <label>
                Наименование прибора:
                <select name="device" value={formData.device} onChange={handleChange}>
                  <option value="">Выбрать прибор</option>
                  <option value="Meter1">Счетчик 1</option>
                  <option value="Meter2">Счетчик 2</option>
                </select>
              </label>
            </div>
            <div className="input-group">
              <label>
                Наименование водоисточника:
                <select name="waterSource" value={formData.waterSource} onChange={handleChange}>
                  <option value="">Выбрать водоисточник</option>
                  <option value="Source1">Источник 1</option>
                  <option value="Source2">Источник 2</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Раздел 4 */}
        {completedSteps.section3 && !completedSteps.section4 && (
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
                Измерительный прибор №1:
                <input type="text" name="deviceNumber" value={formData.deviceNumber} onChange={handleChange} />
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
            <div className="input-group">
              <label>
                Подпись:
                <input type="text" name="signature" value={formData.signature} onChange={handleChange} />
              </label>
            </div>
          </div>
        )}

        {/* Кнопка отправки */}
        {completedSteps.section4 && (
          <div className="submit-button">
            <button onClick={handleSubmit}>Отправить</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Water;