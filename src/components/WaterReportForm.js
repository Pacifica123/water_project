import React, { useState } from "react";

function WaterReportForm() {
  const [quarter, setQuarter] = useState(1);
  const [data, setData] = useState([
    { month: "январь", fact: 0, population: 0, other: 0 },
    { month: "февраль", fact: 0, population: 0, other: 0 },
    { month: "март", fact: 0, population: 0, other: 0 },
  ]);

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

  const totals = calculateTotals();

  return (
    <div className="water-report-form">
      <h2>Справка "Забор поверхностной воды за квартал"</h2>
      <div className="quarter-selector">
        <label>
          Выберите квартал:{" "}
          <select value={quarter} onChange={handleQuarterChange}>
            <option value={1}>1 квартал</option>
            <option value={2}>2 квартал</option>
            <option value={3}>3 квартал</option>
            <option value={4}>4 квартал</option>
          </select>
        </label>
      </div>
      <table>
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
                  value={row.fact}
                  onChange={(e) =>
                    handleInputChange(index, "fact", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.population}
                  onChange={(e) =>
                    handleInputChange(index, "population", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.other}
                  onChange={(e) =>
                    handleInputChange(index, "other", e.target.value)
                  }
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
    </div>
  );
}

export default WaterReportForm;