
import React, { useState, useEffect } from "react";
import { fetchStructureData } from "../api/fetch_records";
import "../css/Water.css";

const PaymentCalculationForm = () => {

  // ........... Фетчим ставки ..............

  const [ratesData, setRatesData] = useState({}); // Состояние для хранения ставок из БД

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const rates = await fetchStructureData("rates"); // Предполагается, что "rates" — это имя структуры для ставок
        setRatesData(rates);
      } catch (error) {
        console.error("Ошибка при получении ставок:", error);
      }
    };

    fetchRates();
  }, []);

  const updateRates = (ratesData) => {
    const updatedRows = { ...rows };
    updatedRows.rates = ratesData.map((rate) => ({
      id: rate.id,
      indicator: rate.indicator,
      unit: rate.unit,
      establishedVolume: rate.establishedVolume,
      actualVolume: rate.actualVolume,
      withinLimitsVolume: rate.withinLimitsVolume,
      exceededVolume: rate.exceededVolume,
      totalPayment: rate.totalPayment,
    }));

    setRows(updatedRows);
  };

  useEffect(() => {
    if (Object.keys(ratesData).length > 0) {
      updateRates(ratesData);
    }
  }, [ratesData]);


  // .......................................

  const initialRows = {
    parameters: [
      { id: "1", indicator: "Параметры водопользования", unit: "тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "1.1", indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта", unit: "тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "1.1.1", indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qн.)", unit: "тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "1.1.2", indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qп.)", unit: "тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 }
    ],
    rates: [
      { id: "2", indicator: "Ставка платы", unit: "руб/тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "2.1", indicator: "За забор (изъятие) водных ресурсов для населения", unit: "руб/тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "2.2", indicator: "За забор (изъятие) водных ресурсов для предприятий", unit: "руб/тыс.м3", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "2.3", indicator: "Повышающий коэффициент", unit: "", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 }
    ],
    payment: [
      { id: "3", indicator: "Размер платы", unit: "руб", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "3.1", indicator: "За забор (изъятие) водных ресурсов (п.3.2 + п.3.3)", unit: "руб", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "3.2", indicator: "За забор (изъятие) водных ресурсов для населения", unit: "руб", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 },
      { id: "3.3", indicator: "За забор (изъятие) водных ресурсов для предприятий", unit: "руб", establishedVolume: 0, actualVolume: 0, withinLimitsVolume: 0, exceededVolume: 0, totalPayment: 0 }
    ]
  };

  const [rows, setRows] = useState(initialRows);

  const handleChange = (section, id, field, value) => {
    setRows((prevRows) => {
      const updatedRows = prevRows[section].map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: parseFloat(value) || 0 };
          updatedRow.totalPayment = updatedRow.establishedVolume + updatedRow.actualVolume + updatedRow.withinLimitsVolume + updatedRow.exceededVolume;
          return updatedRow;
        }
        return row;
      });
      return { ...prevRows, [section]: updatedRows };
    });
  };


  const renderTableSection = (title, section) => (
    <>
    <h3>{title}</h3>
    <table className="payment-table">
    <thead>
    <tr>
    <th>№ п/п</th>
    <th>Показатель</th>
    <th>Ед. изм.</th>
    <th>Установленные объемы ВП в квартал</th>
    <th>Фактические объемы ВП в квартал</th>
    <th>Фактические объемы ВП в пределах установленных объемов</th>
    <th>Превышение установленных объемов ВП в квартале</th>
    <th>Итого оплата за квартал, руб</th>
    </tr>
    </thead>
    <tbody>
    {rows[section].map((row) => (
      <tr key={row.id}>
      <td>{row.id}</td>
      <td>{row.indicator}</td>
      <td>{row.unit}</td>
      {section === "rates" ? (
        <>
        <td>{row.establishedVolume}</td>
        <td>{row.actualVolume}</td>
        <td>{row.withinLimitsVolume}</td>
        <td>{row.exceededVolume}</td>
        <td>{row.totalPayment.toFixed(2)}</td>
        </>
      ) : (
        <>
        <td>
        <input
        type="number"
        value={row.establishedVolume}
        onChange={(e) =>
          handleChange(section, row.id, "establishedVolume", e.target.value)
        }
        />
        </td>
        <td>
        <input
        type="number"
        value={row.actualVolume}
        onChange={(e) =>
          handleChange(section, row.id, "actualVolume", e.target.value)
        }
        />
        </td>
        <td>
        <input
        type="number"
        value={row.withinLimitsVolume}
        onChange={(e) =>
          handleChange(section, row.id, "withinLimitsVolume", e.target.value)
        }
        />
        </td>
        <td>
        <input
        type="number"
        value={row.exceededVolume}
        onChange={(e) =>
          handleChange(section, row.id, "exceededVolume", e.target.value)
        }
        />
        </td>
        <td>{row.totalPayment.toFixed(2)}</td>
        </>
      )}
      </tr>
    ))}
    </tbody>
    </table>
    </>
  );


  return (
    <div className="payment-container">
    <h2>Расчет суммы оплаты</h2>
    {renderTableSection("1. Параметры водопользования", "parameters")}
    {renderTableSection("2. Ставки платы", "rates")}
    {renderTableSection("3. Размер платы", "payment")}
    </div>
  );
};

export default PaymentCalculationForm;
