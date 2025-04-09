
import React, { useState, useEffect } from "react";
import { fetchSingleTableData, fetchStructDataWithFilters } from "../api/fetch_records";
import "../css/Water.css";

const PaymentCalculationForm = () => {

  // ........... Фетчим ставки ..............

  const [ratesData, setRatesData] = useState({}); // Состояние для хранения ставок из БД

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const rates = await fetchSingleTableData("rates");
        const currentDate = new Date().toISOString().split("T")[0];
        console.log("Текущая дата - ", currentDate);
        // Фильтруем ставки, выбирая последние актуальные перед текущей датой
        const filteredRates = rates.reduce((acc, rate) => {
          const rateDate = new Date(rate.start_date).toISOString().split("T")[0];
          console.log("Дата ставки - ", rateDate);
          if (rateDate <= currentDate) {
            if (!acc[rate.rate_type] || new Date(acc[rate.rate_type].start_date) < new Date(rate.start_date)) {
              acc[rate.rate_type] = rate;
            }
          }
          return acc;
        }, {});

        setRatesData(filteredRates);
      } catch (error) {
        console.error("Ошибка при получении ставок:", error);
      }
    };

    fetchRates();
  }, []);

  const updateRates = (filteredRates) => {
    setRows((prevRows) => {
      console.log("[updateRates]:", filteredRates)
      const updatedRates = prevRows.rates.map((rate) => {
        if (rate.id === "2.1") return { ...rate, establishedVolume: filteredRates.POPULATION?.value || 0, actualVolume: filteredRates.POPULATION?.value || 0, withinLimitsVolume: filteredRates.POPULATION?.value || 0, exceededVolume: filteredRates.POPULATION?.value || 0 };
        if (rate.id === "2.2") return { ...rate, establishedVolume: filteredRates.ORG?.value || 0, actualVolume: filteredRates.ORG?.value || 0, withinLimitsVolume: filteredRates.ORG?.value || 0, exceededVolume: filteredRates.ORG?.value || 0 };
        return rate;
      });
      return { ...prevRows, rates: updatedRates };
    });
  };

  useEffect(() => {
    if (Object.keys(ratesData).length > 0) {
      updateRates(ratesData);
    }
  }, [ratesData]);

  // ........... Фетчим разрешения ..............
  const [permisionPointLink, setPPL] = useState({});
  const orgData = JSON.parse(localStorage.getItem("org"));
  const orgId = orgData?.id;
  useEffect(() => {
    const fetchPermissions = async () => {

      const data = await fetchStructDataWithFilters("permisionpointlink", {
        organisation_id: orgId
      });

      if (data) {
        console.log("[Результаты для setPPL]: ", data);
        setPPL(data); // сохраняем результат
      }
    };

    fetchPermissions();
  }, [orgId]);

  const permissionOptions = permisionPointLink?.data || [];
  console.log("permissionOptions = ", permissionOptions);
  const [selectedPermission, setSelectedPermissionId] = useState(null);

  const updateValuePermission = (filteredPermission) => {
    setRows((prevRows) => {
      console.log("[updateValuePermission]:", filteredPermission);
      const updateValuePermission = prevRows.parameters.map((rate) => {
        if (rate.id === "1.1.1") return {
          ...rate,
          establishedVolume: filteredPermission.POPULATION?.value || 0,
          // actualVolume: filteredPermission.POPULATION?.value || 0,
          // withinLimitsVolume: filteredPermission.POPULATION?.value || 0,
          // exceededVolume: filteredPermission.POPULATION?.value || 0
        };
        if (rate.id === "1.1.2") return {
          ...rate,
          establishedVolume: filteredPermission.ORG?.value || 0,
          // actualVolume: filteredPermission.ORG?.value || 0,
          // withinLimitsVolume: filteredPermission.ORG?.value || 0,
          // exceededVolume: filteredPermission.ORG?.value || 0
        };
        return rate;
      });
      return { ...prevRows, parameters: updateValuePermission };
    });
  };

  useEffect(() => {
    if (selectedPermission) {
      const permission = selectedPermission.permission_id;

      const newRates = {
        POPULATION: { value: parseFloat(permission.allowed_volume_pop || 0) },
            ORG: { value: parseFloat(permission.allowed_volume_org || 0) }
      };

      updateValuePermission(newRates); // подставляем объёмы в ставки
    }
  }, [selectedPermission]);


  // .......................................

  const initialRows = {
    parameters: [
      {
        id: "1",
        indicator: "Параметры водопользования",
        unit: "тыс.м3",
        establishedVolume: "", // заглушка – значение подгружается из БД
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      },
      {
        id: "1.1",
        indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта",
        unit: "тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      },
      {
        id: "1.1.1",
        indicator:
        "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qн.)",
        unit: "тыс.м3",
        establishedVolume: 0, // будет меткой (из БД) если потребуется
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      },
      {
        id: "1.1.2",
        indicator:
        "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qп.)",
        unit: "тыс.м3",
        establishedVolume: 0, // будет меткой (из БД) если потребуется
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      }
    ],
    rates: [
      {
        id: "2",
        indicator: "Ставка платы",
        unit: "руб/тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      },
      {
        id: "2.1",
        indicator: "За забор (изъятие) водных ресурсов для населения",
        unit: "руб/тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      },
      {
        id: "2.2",
        indicator: "За забор (изъятие) водных ресурсов для предприятий",
        unit: "руб/тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: ""
      },
      {
        id: "2.3",
        indicator: "Повышающий коэффициент",
        unit: "",
        establishedVolume: 1, // по умолчанию 1
        actualVolume: 1,
        withinLimitsVolume: 1,
        exceededVolume: 1,
        totalPayment: ""
      }
    ],
    payment: [
      {
        id: "3",
        indicator: "Размер платы",
        unit: "руб",
        establishedVolume: "",
        actualVolume: "",
        withinLimitsVolume: "",
        exceededVolume: "",
        totalPayment: ""
      },
      {
        id: "3.1",
        indicator:
        "За забор (изъятие) водных ресурсов (п.3.2 + п.3.3)",
        unit: "руб",
        establishedVolume: "",
        actualVolume: "",
        withinLimitsVolume: "",
        exceededVolume: "",
        totalPayment: ""
      },
      {
        id: "3.2",
        indicator:
        "За забор (изъятие) водных ресурсов для населения",
        unit: "руб",
        establishedVolume: "",
        actualVolume: "",
        withinLimitsVolume: "",
        exceededVolume: "",
        totalPayment: ""
      },
      {
        id: "3.3",
        indicator:
        "За забор (изъятие) водных ресурсов для предприятий",
        unit: "руб",
        establishedVolume: "",
        actualVolume: "",
        withinLimitsVolume: "",
        exceededVolume: "",
        totalPayment: ""
      }
    ]
  };

  const [rows, setRows] = useState(initialRows);

  // Обработчик изменения пользовательского ввода
  const handleChange = (section, id, field, value) => {
    setRows((prevRows) => {
      const updatedSection = prevRows[section].map((row) => {
        // Для редактируемых полей (исключаем строки-шапки и суммирующие строки)
        if (row.id === id) {
          // Если поле не является числом, оставляем 0
          const newValue = parseFloat(value) || 0;
          return { ...row, [field]: newValue };
        }
        return row;
      });
      return { ...prevRows, [section]: updatedSection };
    });
  };

  // Функция для вычисления значений в таблице "parameters"
  const computeParameters = () => {
    return rows.parameters.map((row) => {
      // Строки-шапки: id "1" – вывод заглушки/метки
      if (row.id === "1") {
        return { ...row, actualVolume: "", withinLimitsVolume: "", exceededVolume: "", totalPayment: "" };
      }
      // Строка-сумма: id "1.1" суммирует строки 1.1.1 и 1.1.2
      if (row.id === "1.1") {
        const child1 = rows.parameters.find((r) => r.id === "1.1.1") || {};
        const child2 = rows.parameters.find((r) => r.id === "1.1.2") || {};
        return {
          ...row,
          establishedVolume:
          (child1.establishedVolume || 0) + (child2.establishedVolume || 0),
          actualVolume:
          (child1.actualVolume || 0) + (child2.actualVolume || 0),
          withinLimitsVolume:
          (child1.withinLimitsVolume || 0) + (child2.withinLimitsVolume || 0),
          exceededVolume:
          (child1.exceededVolume || 0) + (child2.exceededVolume || 0),
          totalPayment: ""
        };
      }
      // Для строк 1.1.1 и 1.1.2 – считаем «в пределах установленных» и «превышение»
      if (row.id === "1.1.1" || row.id === "1.1.2") {
        const established = row.establishedVolume || 0;
        const actual = row.actualVolume || 0;
        const within = Math.min(established, actual);
        const exceeded = actual > established ? actual - established : 0;
        return { ...row, withinLimitsVolume: within, exceededVolume: exceeded, totalPayment: "" };
      }
      return row;
    });
  };

  // Функция для вычисления значений в таблице "payment"
  const computePayment = () => {
    const param11 = rows.parameters.find((r) => r.id === "1.1.1") || {};
    const param12 = rows.parameters.find((r) => r.id === "1.1.2") || {};
    const rate21 = rows.rates.find((r) => r.id === "2.1") || {};
    const rate22 = rows.rates.find((r) => r.id === "2.2") || {};

    // Используем фактические объёмы из параметров
    const val32 =
    (param11.actualVolume || 0) * (rate21.establishedVolume || 0);
    const val33 =
    (param12.actualVolume || 0) * (rate22.establishedVolume || 0);
    const val31 = val32 + val33;

    return rows.payment.map((row) => {
      // Строка-шапка: id "3" – вывод пустых ячеек
      if (row.id === "3") {
        return { ...row, totalPayment: "" };
      }
      if (row.id === "3.2") {
        return { ...row, totalPayment: val32.toFixed(2) };
      }
      if (row.id === "3.3") {
        return { ...row, totalPayment: val33.toFixed(2) };
      }
      if (row.id === "3.1") {
        return { ...row, totalPayment: val31.toFixed(2) };
      }
      return row;
    });
  };

  // Функция определяет, редактируется ли конкретное поле
  // Для таблицы "parameters": шапки (id "1") и суммирующей строки (id "1.1") – только метки,
  // а также столбец "establishedVolume" – всегда метка (подгружается из БД)
  const isEditable = (section, row, field) => {
    if (section === "parameters") {
      if (row.id === "1" || row.id === "1.1") return false;
      if (field === "establishedVolume") return false;
      if ((row.id === "1.1.1" || row.id === "1.1.2") && (field === "exceededVolume" || field === "withinLimitsVolume" || field === "totalPayment")) return false;
      return true;
    }
    else if (section === "payment") {
      // Для секции "payment" можно добавить дополнительные условия,
      // если они необходимы. Например, для определенных id строк.
      return false;
    }
    return false;
  };

  const computedParameters = computeParameters();
  const computedPayment = computePayment();

  // Универсальная функция рендеринга секции таблицы
  const renderTableSection = (title, section) => {
    // Выбираем набор строк в зависимости от секции
    const sectionRows =
    section === "parameters"
    ? computedParameters
    : section === "payment"
    ? computedPayment
    : rows[section]; // rates не менялись

    return (
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
      {sectionRows.map((row) => (
        <tr key={row.id}>
        <td>{row.id}</td>
        <td>
        {/* Для строк-шапок (id "1", "2", "3") выводим просто пустую ячейку */}
        {row.id === "1" || row.id === "2" || row.id === "3"
          ? ""
          : row.indicator}
          </td>
          <td>{row.id === "1" || row.id === "2" || row.id === "3" ? "" : row.unit}</td>
          {/* Для каждой колонки, если поле редактируемое – инпут, иначе метка */}
          {["establishedVolume", "actualVolume", "withinLimitsVolume", "exceededVolume"].map(
            (field) => (
              <td key={field}>
              {isEditable(section, row, field) ? (
                <input
                type="number"
                value={row[field]}
                onChange={(e) =>
                  handleChange(section, row.id, field, e.target.value)
                }
                />
              ) : (
                // Если значение равно 0 или 0.00, выводим пустую строку (для итоговых строк)
                row[field] === 0 || row[field] === "0.00" || row[field] === 0.0
                ? ""
                : row[field]
              )}
              </td>
            )
          )}
          {/* Последний столбец "Итого оплата за квартал" */}
          <td>
          {section === "payment" ||
            row.id === "1" ||
            row.id === "2"
            ? // Для таблицы 3 все поля вычисляются, для таблиц 1 и 2 итог показываем пустую ячейку
            row.totalPayment
            : isEditable(section, row, "totalPayment") ? (
              <input
              type="number"
              value={row.totalPayment}
              onChange={(e) =>
                handleChange(section, row.id, "totalPayment", e.target.value)
              }
              />
            ) : (
              row.totalPayment
            )}
            </td>
            </tr>
      ))}
      </tbody>
      </table>
      </>
    );
  };

  return (
    <div className="payment-container">
    <h2>Расчет суммы оплаты</h2>



    <div>
      <label htmlFor="permission-select">Выберите разрешение:</label>
      {permisionPointLink?.data?.length > 0 && (
        <select
        onChange={(e) => {
          const selectedId = parseInt(e.target.value);
          const permission = permisionPointLink.data.find(p => p.id === selectedId);
          setSelectedPermissionId(permission);
        }}
        >
        <option value="">Выберите разрешение</option>
        {permisionPointLink.data.map((p) => (
          <option key={p.id} value={p.id}>
          {p.permission_id?.permission_number} — {p.permission_id?.permission_type}
          </option>
        ))}
        </select>
      )}

    </div>

    {renderTableSection("1. Параметры водопользования", "parameters")}
    {renderTableSection("2. Ставки платы", "rates")}
    {renderTableSection("3. Размер платы", "payment")}
    </div>
  );
};

export default PaymentCalculationForm;
