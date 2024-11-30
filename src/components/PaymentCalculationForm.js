import React, { useState } from "react";
 

function PaymentCalculationForm() {
  // Структура данных таблицы
  const initialRows = [
    {
      id: "1",
      indicator: "Параметры водопользования (объем забора (изъятия) воды, площадь акватории)",
      unit: "тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
      editable: false,
    },
    {
      id: "1.1",
      indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qн+Qп+Qн.o+Он.o.)",
      unit: "тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "1.1.1",
      indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qн.)",
      unit: "тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "1.1.2",
      indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qп.)",
      unit: "тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "2",
      indicator: "Ставка платы",
      unit: "руб/тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
      editable: false,
    },
    {
      id: "2.1",
      indicator: "За забор (изъятие) водных ресурсов из поверхностного водного объекта для водоснабжения населения (Сн.)",
      unit: "руб/тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "2.2",
      indicator: "За забор (изъятие) водных ресурсов из поверхностного водного объекта (Сп.)",
      unit: "руб/тыс.м3",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "2.3",
      indicator: "Повышающий коэффициент (применяется в случае отсутствия водоизмерительного прибора)",
      unit: "",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "3",
      indicator: "Размер платы",
      unit: "руб",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
      editable: false,
    },
    {
      id: "3.1",
      indicator: "За забор (изъятие) водных ресурсов из поверхностного водного объекта (п.3.2 + п.3.3)",
      unit: "руб",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "3.2",
      indicator: "За забор (изъятие) водных ресурсов из водного объекта для населения (Qн. Х Сн.)",
      unit: "руб",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
    {
      id: "3.3",
      indicator: "За забор (изъятие) водных ресурсов из водного объекта для предприятия (Qп. Х Сп.)",
      unit: "руб",
      establishedVolume: 0,
      actualVolume: 0,
      withinLimitsVolume: 0,
      exceededVolume: 0,
      totalPayment: 0,
    },
  ];

  const [rows, setRows] = useState(initialRows);

  // Обработчик изменения значений
  const handleChange = (id, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: parseFloat(value) || 0 } : row
      )
    );
  };

  return (
    <div>
      <h2>Расчет суммы оплаты</h2>
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
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.indicator}</td>
              <td>{row.unit}</td>
              <td>
                {row.editable !== false ? (
                  <input
                    type="number"
                    value={row.establishedVolume || ""}
                    onChange={(e) =>
                      handleChange(row.id, "establishedVolume", e.target.value)
                    }
                  />
                ) : (
                  row.establishedVolume
                )}
              </td>
              <td>
                <input
                  type="number"
                  value={row.actualVolume || ""}
                  onChange={(e) =>
                    handleChange(row.id, "actualVolume", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.withinLimitsVolume || ""}
                  onChange={(e) =>
                    handleChange(row.id, "withinLimitsVolume", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.exceededVolume || ""}
                  onChange={(e) =>
                    handleChange(row.id, "exceededVolume", e.target.value)
                  }
                />
              </td>
              <td>{row.totalPayment.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentCalculationForm;
