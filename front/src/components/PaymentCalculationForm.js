import React, { useState, useEffect, useMemo } from "react";
import { fetchSingleTableData, fetchStructDataWithFilters } from "../api/fetch_records";
import "../css/Water.css";

const PaymentCalculationForm = () => {
  const [openSection, setOpenSection] = useState(null);

  // ======== 1) ФЕТЧИМ СТАВКИ (Rates) ========
  const [ratesData, setRatesData] = useState({});

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const rates = await fetchSingleTableData("rates");
        const currentDate = new Date().toISOString().split("T")[0];
        // Оставляем для каждого rate_type последнюю действующую на сегодняшний день
        const filteredRates = rates.reduce((acc, rate) => {
          const rateDate = new Date(rate.start_date).toISOString().split("T")[0];
          if (rateDate <= currentDate) {
            if (
              !acc[rate.rate_type] ||
              new Date(acc[rate.rate_type].start_date) < new Date(rate.start_date)
            ) {
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
      const updatedRates = prevRows.rates.map((rate) => {
        if (rate.id === "2.1") {
          const val = filteredRates.POPULATION?.value || 0;
          return {
            ...rate,
            establishedVolume: val,
            actualVolume: val,
            withinLimitsVolume: val,
            exceededVolume: val,
          };
        }
        if (rate.id === "2.2") {
          const val = filteredRates.ORG?.value || 0;
          return {
            ...rate,
            establishedVolume: val,
            actualVolume: val,
            withinLimitsVolume: val,
            exceededVolume: val,
          };
        }
        // Для id === "2.3" (коэффициент) оставляем значение из initialRows (по умолчанию 1)
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

  // ======== 2) ФЕТЧИМ РАЗРЕШЕНИЯ (Permissions) ========
  const [permissionPointLink, setPPL] = useState({});
  const orgData = JSON.parse(localStorage.getItem("org"));
  const orgId = orgData?.id;

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const data = await fetchStructDataWithFilters("permisionpointlink", {
          organisation_id: orgId,
        });
        if (data) {
          setPPL(data);
        }
      } catch (err) {
        console.error("Ошибка при получении разрешений:", err);
      }
    };
    if (orgId) {
      fetchPermissions();
    }
  }, [orgId]);

  const permissionOptions = permissionPointLink?.data || [];

  // ======== 3) ГРУППИРУЕМ РАЗРЕШЕНИЯ В ПАРЫ ========
  const permissionPairs = useMemo(() => {
    const grouped = {};
    permissionOptions.forEach((item) => {
      const key = `${item.permission_id.permission_number}_${item.permission_id.registration_date}`;
      if (!grouped[key]) grouped[key] = {};
      grouped[key][item.permission_id.method_type] = item;
    });
    return Object.values(grouped).filter((pair) => pair.POPULATION && pair.ORG);
  }, [permissionOptions]);

  const [selectedPermissionIdx, setSelectedPermissionIdx] = useState(null);
  const selectedPermission =
  selectedPermissionIdx !== null
  ? permissionPairs[selectedPermissionIdx]
  : null;

  // ======== 4) ИНИЦИАЛИЗАЦИЯ ROWS ========
  const initialRows = {
    parameters: [
      {
        id: "1.1",
        indicator: "Забор (изъятие) водных ресурсов из поверхностного водного объекта",
        unit: "тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
      },
      {
        id: "1.1.1",
        indicator:
        "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qн.)",
        unit: "тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
      },
      {
        id: "1.1.2",
        indicator:
        "Забор (изъятие) водных ресурсов из поверхностного водного объекта (Qп.)",
        unit: "тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
      },
    ],
    rates: [
      {
        id: "2.1",
        indicator: "За забор (изъятие) водных ресурсов для населения",
        unit: "руб/тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
      },
      {
        id: "2.2",
        indicator: "За забор (изъятие) водных ресурсов для предприятий",
        unit: "руб/тыс.м3",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
      },
      {
        id: "2.3",
        indicator: "Повышающий коэффициент",
        unit: "",
        establishedVolume: 1, // по умолчанию 1
        actualVolume: 1,
        withinLimitsVolume: 1,
        exceededVolume: 1,
      },
    ],
    payment: [
      {
        id: "3.1",
        indicator:
        "За забор (изъятие) водных ресурсов (п.3.2 + п.3.3)",
        unit: "руб",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: 0,
      },
      {
        id: "3.2",
        indicator:
        "За забор (изъятие) водных ресурсов для населения",
        unit: "руб",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: 0,
      },
      {
        id: "3.3",
        indicator:
        "За забор (изъятие) водных ресурсов для предприятий",
        unit: "руб",
        establishedVolume: 0,
        actualVolume: 0,
        withinLimitsVolume: 0,
        exceededVolume: 0,
        totalPayment: 0,
      },
    ],
  };

  const [rows, setRows] = useState(initialRows);

  // ======== 5) ОБНОВЛЯЕМ “УСТАНОВЛЕННЫЕ” ОБЪЁМЫ (по 1.1.1 и 1.1.2) ========
  useEffect(() => {
    if (!selectedPermission) return;

    const parsedAllowed = {
      POPULATION: {
        value: parseFloat(selectedPermission.POPULATION.permission_id.allowed_volume || 0),
      },
      ORG: {
        value: parseFloat(selectedPermission.ORG.permission_id.allowed_volume || 0),
      },
    };

    setRows((prevRows) => {
      const updatedParams = prevRows.parameters.map((row) => {
        if (row.id === "1.1.1") {
          return {
            ...row,
            establishedVolume: parsedAllowed.POPULATION.value,
          };
        }
        if (row.id === "1.1.2") {
          return {
            ...row,
            establishedVolume: parsedAllowed.ORG.value,
          };
        }
        if (row.id === "1.1") {
          // Для “1.1” = сумма 1.1.1 + 1.1.2
          return {
            ...row,
            establishedVolume:
            parsedAllowed.POPULATION.value + parsedAllowed.ORG.value,
          };
        }
        return row;
      });
      return { ...prevRows, parameters: updatedParams };
    });
  }, [selectedPermission]);

  // ======== 6) ФЕТЧ И ОБНОВЛЕНИЕ “ФАКТИЧЕСКИХ” ОБЪЁМОВ ========
  useEffect(() => {
    if (!selectedPermission) return;

    const permId = selectedPermission.ORG.permission_id.id;
    const fetchActualVolumes = async () => {
      try {
        const data = await fetchStructDataWithFilters("water_report_form", {
          permission_id: permId,
        });

        // Ожидаем массив вида [{ type: "POPULATION", value: 123 }, { type: "ORG", value: 456 }, ...]
        let parsed = { POPULATION: { value: 0 }, ORG: { value: 0 } };
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((item) => {
            const key = item.type;
            const val = parseFloat(item.value || 0);
            if (key === "POPULATION" || key === "ORG") {
              parsed[key] = { value: val };
            }
          });
        }

        setRows((prevRows) => {
          const updatedParams = prevRows.parameters.map((row) => {
            if (row.id === "1.1.1") {
              return {
                ...row,
                actualVolume: parsed.POPULATION.value,
              };
            }
            if (row.id === "1.1.2") {
              return {
                ...row,
                actualVolume: parsed.ORG.value,
              };
            }
            if (row.id === "1.1") {
              const sumActual = parsed.POPULATION.value + parsed.ORG.value;
              return {
                ...row,
                actualVolume: sumActual,
              };
            }
            return row;
          });
          return { ...prevRows, parameters: updatedParams };
        });
      } catch (err) {
        console.error("Ошибка при получении фактических объёмов:", err);
        setRows((prevRows) => {
          const zeroed = prevRows.parameters.map((row) => {
            if (row.id === "1.1.1" || row.id === "1.1.2") {
              return { ...row, actualVolume: 0 };
            }
            if (row.id === "1.1") {
              return { ...row, actualVolume: 0 };
            }
            return row;
          });
          return { ...prevRows, parameters: zeroed };
        });
      }
    };

    fetchActualVolumes();
  }, [selectedPermission]);

  // ======== 7) ОБНОВЛЕНИЕ ПОЛЕЙ С НАДЗОРОМ (Rates) — без изменений ========

  // ======== 8) ХЭНДЛЕР ИЗМЕНЕНИЯ ПОЛЕЙ ========
  const handleChange = (section, id, field, value) => {
    setRows((prevRows) => {
      const updatedSection = prevRows[section].map((row) => {
        if (row.id === id) {
          const newValue = parseFloat(value) || 0;
          return { ...row, [field]: newValue };
        }
        return row;
      });
      return { ...prevRows, [section]: updatedSection };
    });
  };

  // ======== 9) ВЫЧИСЛЕНИЕ “PARAMETERS” ========
  const computeParameters = () => {
    return rows.parameters.map((row) => {
      if (row.id === "1.1") {
        const estSum = rows.parameters
        .filter((r) => r.id === "1.1.1" || r.id === "1.1.2")
        .reduce((sum, r) => sum + (r.establishedVolume || 0), 0);
        const actSum = rows.parameters
        .filter((r) => r.id === "1.1.1" || r.id === "1.1.2")
        .reduce((sum, r) => sum + (r.actualVolume || 0), 0);
        const within = Math.min(estSum, actSum);
        const exceeded = actSum > estSum ? actSum - estSum : 0;
        return {
          ...row,
          establishedVolume: estSum,
          actualVolume: actSum,
          withinLimitsVolume: within,
          exceededVolume: exceeded,
        };
      }
      if (row.id === "1.1.1" || row.id === "1.1.2") {
        const est = row.establishedVolume || 0;
        const act = row.actualVolume || 0;
        const within = Math.min(est, act);
        const exceeded = act > est ? act - est : 0;
        return { ...row, withinLimitsVolume: within, exceededVolume: exceeded };
      }
      return row;
    });
  };

  const computedParameters = computeParameters();

  // ======== 10) ВЫЧИСЛЕНИЕ “PAYMENT” (ПОЛЬЗУЕМСЯ computedParameters) ========
  const computePayment = () => {
    // Сначала получим коэффициент из строки 2.3
    const coefRow = rows.rates.find((r) => r.id === "2.3");
    const coef = coefRow ? coefRow.establishedVolume || 1 : 1;

    // Берём уже вычисленные дочерние параметры из computedParameters
    const param11 = computedParameters.find((r) => r.id === "1.1.1") || {};
    const param12 = computedParameters.find((r) => r.id === "1.1.2") || {};
    const rate21 = rows.rates.find((r) => r.id === "2.1") || {};
    const rate22 = rows.rates.find((r) => r.id === "2.2") || {};

    // Функция, считающая “рублёвые” колонки по одной строке (параметр + ставка)
    const calcRow = (paramRow, rateRow) => {
      const est_rub = (paramRow.establishedVolume || 0) * (rateRow.establishedVolume || 0);
      const act_rub = (paramRow.actualVolume || 0) * (rateRow.establishedVolume || 0);
      const within_rub = (paramRow.withinLimitsVolume || 0) * (rateRow.establishedVolume || 0);
      const exceeded_rub =
      (paramRow.exceededVolume || 0) * (rateRow.establishedVolume || 0) * coef;
      const total = within_rub + exceeded_rub;
      return {
        establishedVolume: +est_rub.toFixed(2),
        actualVolume: +act_rub.toFixed(2),
        withinLimitsVolume: +within_rub.toFixed(2),
        exceededVolume: +exceeded_rub.toFixed(2),
        totalPayment: +total.toFixed(2),
      };
    };

    // 3.2 (население)
    const row32_vals = calcRow(param11, rate21);
    // 3.3 (предприятия)
    const row33_vals = calcRow(param12, rate22);
    // Суммируем для 3.1
    const sumEst = (row32_vals.establishedVolume || 0) + (row33_vals.establishedVolume || 0);
    const sumAct = (row32_vals.actualVolume || 0) + (row33_vals.actualVolume || 0);
    const sumWithin =
    (row32_vals.withinLimitsVolume || 0) + (row33_vals.withinLimitsVolume || 0);
    const sumExceeded =
    (row32_vals.exceededVolume || 0) + (row33_vals.exceededVolume || 0);
    const sumTotal = (row32_vals.totalPayment || 0) + (row33_vals.totalPayment || 0);

    return rows.payment.map((row) => {
      if (row.id === "3.2") {
        return {
          ...row,
          ...row32_vals,
        };
      }
      if (row.id === "3.3") {
        return {
          ...row,
          ...row33_vals,
        };
      }
      if (row.id === "3.1") {
        return {
          ...row,
          establishedVolume: +sumEst.toFixed(2),
                            actualVolume: +sumAct.toFixed(2),
                            withinLimitsVolume: +sumWithin.toFixed(2),
                            exceededVolume: +sumExceeded.toFixed(2),
                            totalPayment: +sumTotal.toFixed(2),
        };
      }
      return row;
    });
  };

  const computedPayment = computePayment();

  // ======== 11) ПРОВЕРКА, КОГДА ЯЧЕЙКА РЕДАКТИРУЕМА ========
  const isEditable = (section, row, field) => {
    if (section === "parameters") {
      if (row.id === "1.1") return false;
      if (field === "establishedVolume") return false;
      if (
        (row.id === "1.1.1" || row.id === "1.1.2") &&
        (field === "withinLimitsVolume" || field === "exceededVolume")
      )
        return false;
        if (field === "actualVolume" && (row.id === "1.1.1" || row.id === "1.1.2"))
          return true;
      return false;
    }
    if (section === "rates") {
      return false;
    }
    if (section === "payment") {
      return false;
    }
    return false;
  };

  // ======== 12) РЕНДЕР “ПАРАМЕТРОВ” И “СТАВОК” ========
  const renderParametersOrRates = (title, sectionKey) => {
    const sectionRows =
    sectionKey === "parameters" ? computedParameters : rows[sectionKey];

    return (
      <>
      <h3 align="center">{title}</h3>
      <table className="payment-table">
      <thead>
      <tr>
      <th>№ п/п</th>
      <th>Показатель</th>
      <th>Ед. изм.</th>
      <th>Установленные объемы ВП в квартал</th>
      <th>Фактические объемы ВП в квартал</th>
      <th>В пределах установленных объемов</th>
      <th>Превышение</th>
      </tr>
      </thead>
      <tbody>
      {sectionRows.map((row) => (
        <tr key={row.id}>
        <td>{row.id}</td>
        <td>{["1.1"].includes(row.id) ? "" : row.indicator}</td>
        <td>{["1.1"].includes(row.id) ? "" : row.unit}</td>
        {[
          "establishedVolume",
          "actualVolume",
          "withinLimitsVolume",
          "exceededVolume",
        ].map((field) => (
          <td key={field}>
          {isEditable(sectionKey, row, field) ? (
            <input
            type="number"
            value={row[field]}
            onChange={(e) =>
              handleChange(sectionKey, row.id, field, e.target.value)
            }
            />
          ) : row[field] === 0 || row[field] === "0.00" ? (
            ""
          ) : (
            row[field]
          )}
          </td>
        ))}
        </tr>
      ))}
      </tbody>
      </table>
      </>
    );
  };

  // ======== 13) РЕНДЕР “ПЛАТЫ” С КОРРЕКЦИЕЙ для computedPayment ========
  const renderPayment = () => {
    return (
      <>
      <h3 align="center">3. Размер платы</h3>
      <table className="payment-table">
      <thead>
      <tr>
      <th>№ п/п</th>
      <th>Показатель</th>
      <th>Ед. изм.</th>
      <th>Установленные объемы (руб)</th>
      <th>Фактические объемы (руб)</th>
      <th>В пределах установленных (руб)</th>
      <th>Превышение (руб)</th>
      <th>Итого оплата за квартал, руб</th>
      </tr>
      </thead>
      <tbody>
      {computedPayment.map((row) => {
        // Явно приводим к числу, чтобы toFixed не падал
        const est = Number(row.establishedVolume) || 0;
        const act = Number(row.actualVolume) || 0;
        const within = Number(row.withinLimitsVolume) || 0;
        const exceeded = Number(row.exceededVolume) || 0;
        const total = Number(row.totalPayment) || 0;

        console.log("Показатели оплаты:", {
          est,
          act,
          within,
          exceeded,
          total,
        });

        return (
          <tr key={row.id}>
          <td>{row.id}</td>
          <td>{row.indicator}</td>
          <td>{row.unit}</td>
          <td>{est === 0 ? "" : est.toFixed(2)}</td>
          <td>{act === 0 ? "" : act.toFixed(2)}</td>
          <td>{within === 0 ? "" : within.toFixed(2)}</td>
          <td>{exceeded === 0 ? "" : exceeded.toFixed(2)}</td>
          <td>{total === 0 ? "" : total.toFixed(2)}</td>
          </tr>
        );
      })}
      </tbody>
      </table>
      </>
    );
  };

  // ======== 14) JSX РАЗМЕТКА КОМПОНЕНТА ========
  return (
    <div className="payment-container">
    <h2 align="center">Расчет суммы оплаты</h2>
    <div className="form-step">
    {/* Селектор разрешений */}
    <div style={{ marginBottom: "16px" }}>
    <label htmlFor="permission-select">
    Выберите разрешение:&nbsp;
    </label>
    {permissionOptions.length > 0 && (
      <select
      id="permission-select"
      onChange={(e) =>
        setSelectedPermissionIdx(
          e.target.value !== "" ? parseInt(e.target.value, 10) : null
        )
      }
      value={selectedPermissionIdx !== null ? selectedPermissionIdx : ""}
      >
      <option value="">Выберите разрешение</option>
      {permissionPairs.map((pair, idx) => (
        <option key={idx} value={idx}>
        {pair.ORG.permission_id.permission_number} —{" "}
        {pair.ORG.permission_id.permission_type} (c{" "}
        {pair.ORG.permission_id.registration_date})
        </option>
      ))}
      </select>
    )}
    </div>

    {/* Кнопки-сворачивалки */}
    <div className="toggle-buttons-container">
    <button
    className="toggle-button"
    onClick={() =>
      setOpenSection(
        openSection === "parameters" ? null : "parameters"
      )
    }
    >
    {openSection === "parameters" ? "Скрыть" : "Показать"} 1. Параметры
    </button>
    <button
    className="toggle-button"
    onClick={() =>
      setOpenSection(openSection === "rates" ? null : "rates")
    }
    >
    {openSection === "rates" ? "Скрыть" : "Показать"} 2. Ставки
    </button>
    <button
    className="toggle-button"
    onClick={() =>
      setOpenSection(openSection === "payment" ? null : "payment")
    }
    >
    {openSection === "payment" ? "Скрыть" : "Показать"} 3. Плата
    </button>
    </div>

    {/* Контент секций */}
    <div className="section-wrapper">
    {openSection === "parameters" &&
      renderParametersOrRates(
        "1. Параметры водопользования",
        "parameters"
      )}
      {openSection === "rates" &&
        renderParametersOrRates("2. Ставки платы", "rates")}
        {openSection === "payment" && renderPayment()}
        </div>
        </div>
        </div>
  );
};

export default PaymentCalculationForm;
