import React, { useState, useEffect } from "react";
import axios from "axios";
import {fetchWaterObjects, sendQuarterData }from "../api/records.js";

function WaterReportForm() {
  const [quarter, setQuarter] = useState(1);
  const [data, setData] = useState([
    { month: "январь", fact: 0, population: 0, other: 0 },
    { month: "февраль", fact: 0, population: 0, other: 0 },
    { month: "март", fact: 0, population: 0, other: 0 },
  ]);

  const [waterObjects, setWaterObjects] = useState([]);
  const [selectedWaterObject, setSelectedWaterObject] = useState(null);

  useEffect(() => {
    const loadWaterObjects = async () => {
      try {
        const objects = await fetchWaterObjects();
        setWaterObjects(objects);
      } catch (error) {
        console.error("Ошибка загрузки водных объектов", error);
      }
    };
    loadWaterObjects();
  }, []);

  const quarters = {
    1: ["январь", "февраль", "март"],
    2: ["апрель", "май", "июнь"],
    3: ["июль", "август", "сентябрь"],
    4: ["октябрь", "ноябрь", "декабрь"],
  };

  const handleQuarterChange = (event) => {
    const selectedQuarter = parseInt(event.target.value);
    setQuarter(selectedQuarter);
    setData(
      quarters[selectedQuarter].map((month) => ({
        month,
        fact: 0,
        population: 0,
        other: 0,
      }))
    );
  };

  const handleInputChange = (index, field, value) => {
    const updatedData = [...data];
    updatedData[index][field] = parseFloat(value) || 0;
    setData(updatedData);
  };

  const calculateTotals = () => {
    return data.reduce(
      (totals, row) => ({
        fact: totals.fact + row.fact,
        population: totals.population + row.population,
        other: totals.other + row.other,
      }),
      { fact: 0, population: 0, other: 0 }
    );
  };

  const handleSubmit = async () => {
    try {
      const response = await sendQuarterData(selectedWaterObject, quarter, data);
      console.log("Данные успешно отправлены", response);
    } catch (error) {
      console.error("Ошибка при отправке данных", error.message);
    }
  };


  const totals = calculateTotals();

  return (
    <div className="water-report-form">
      <div className="content-container">
      <h2>Ввод показаний "Забор поверхностной воды за квартал"</h2>
      <div className="selectors">
        <div className="selector-row">
          <label>
            Выберите точку забора:
            <select 
              className="custom-select"
              value={selectedWaterObject} 
              onChange={(e) => setSelectedWaterObject(e.target.value)}
            >
              <option value="">Выберите объект</option>
              {waterObjects.map((obj) => (
                <option key={obj.code_obj_id.code_value} value={obj.code_obj_id.code_value}>
                  {obj.code_obj_id.code_value} - {obj.code_obj_id.code_symbol}
                </option>
              ))}
            </select>
          </label>
          <label>
            Выберите квартал: 
            <select 
              className="custom-select"
              value={quarter} 
              onChange={handleQuarterChange}
            >
              <option value={1}>1 квартал</option>
              <option value={2}>2 квартал</option>
              <option value={3}>3 квартал</option>
              <option value={4}>4 квартал</option>
            </select>
          </label>
        </div>
      </div>
<table className="data-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Факт, тыс. м3</th>
            <th>Население, тыс. м3</th>
            <th>Прочее, тыс. м3</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>
                <input
                  type="number"
                  className="narrow-input"
                  value={row.fact}
                  onChange={(e) => handleInputChange(index, "fact", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="narrow-input"
                  value={row.population}
                  onChange={(e) => handleInputChange(index, "population", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="narrow-input"
                  value={row.other}
                  onChange={(e) => handleInputChange(index, "other", e.target.value)}
                />
              </td>
            </tr>
          ))}
          <tr>
            <td>Итого</td>
            <td>{totals.fact.toFixed(3)}</td>
            <td>{totals.population.toFixed(3)}</td>
            <td>{totals.other.toFixed(3)}</td>
          </tr>
        </tbody>
      </table>
       <div className="submit-button-container">
      <button className="submit-button" onClick={handleSubmit}>Отправить</button>
     </div>
     </div>
    </div>
  );
}

export default WaterReportForm;
