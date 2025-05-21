import React, { useState, useEffect } from "react";
import { fetchStructDataWithFilters } from "../api/fetch_records";

// Парсер DMS для «12°12′12″»
const parseDMS = (dms) => {
  const re = /(\d+)°(\d+)′(\d+)″/;
  const m = dms.match(re);
  return m ? { deg: m[1], min: m[2], sec: m[3] } : { deg: "", min: "", sec: "" };
};

const EditableWaterReport = () => {
  // организация
  const [org, setOrg] = useState({});
  // массив точек
  const [records, setRecords] = useState([]);
  // поля «месяцев» для каждой точки
  const [months, setMonths] = useState({});

  useEffect(() => {
    (async () => {
      // 1) org из localStorage
      const stored = JSON.parse(localStorage.getItem("org") || "{}");
      setOrg(stored);

      if (!stored.id) return console.error("org.id не найден");

      // 2) вызов API
      const resp = await fetchStructDataWithFilters("get_struct31", { org_id: stored.id });
      if (!resp || resp.status !== "success") {
        console.error("Ошибка API:", resp?.message);
        return;
      }

      // 3) инициализируем records + пустые месяцы
      const arr = resp.data.map(rec => {
        const key = rec.id;
        return rec;
      });
      setRecords(arr);
      // инициализируем months для каждого rec.id
      const m = {};
      arr.forEach(r => m[r.id] = { month1: "", month2: "", month3: "" });
      setMonths(m);
    })();
  }, []);

  const handleMonthChange = (pointId, field, value) => {
    setMonths(ms => ({
      ...ms,
      [pointId]: { ...ms[pointId], [field]: value }
    }));
  };

  // Помощник: первая запись
  const first = records[0] || {};

  // распарсим wobj, perm, meter, DMS из первой
  const wobj = first.water_object || {};
  const warea = first.water_area || {};
  const perm = Array.isArray(first.permissions) && first.permissions[0] || {};
  const meter = first.last_meter || {};
  const [latPart, lonPart] = (first.latitude_longitude || "").split(",");
  const latD = parseDMS(latPart || "");
  const lonD = parseDMS(lonPart || "");

  return (
    <div className="water-report">

      <h2>
        Сведения, полученные в результате учета объема забора (изъятия)
        водных ресурсов из водных объектов
      </h2>
      <div className="subtitle">
        за
        <select>
          <option value="">Выбрать</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
        квартал
        <select>
          <option value="">Выбрать</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
        г. | Форма 3.1
      </div>

      {/* === инфо-таблица === */}
      <table className="info-table">
        <tbody>
          <tr>
            <td>Наименование организации</td>
            <td colSpan="3">
              <input value={org.organisation_name || ""} readOnly />
            </td>
          </tr>
          <tr>
            <td>Почтовый адрес</td>
            <td colSpan="3">
              <input value={org.postal_address || ""} readOnly />
            </td>
          </tr>
          <tr>
            <td>ИНН</td>
            <td><input value={org.inn || ""} readOnly /></td>
            <td>ОПФ</td>
            <td><input value={org.legal_form || ""} readOnly /></td>
          </tr>
          <tr>
            <td>Бассейновый округ</td>
            <td><input value={warea.pool_name || ""} readOnly /></td>
            <td>Регион</td>
            <td><input value={org.region || "Кемеровская область - Кузбасс"} readOnly /></td>
          </tr>

          <tr>
            <td>Наименование и код гидрографической единицы</td>
            <td>
              <input
                value={wobj.code_type?.code_value || ""}
                readOnly
              />
            </td>
            <td colSpan="2">
              <input
                value={wobj.code_type?.code_symbol || ""}
                readOnly
              />
            </td>
          </tr>
          <tr>
            <td>Водохозяйственный участок</td>
            <td>
              <input
                value={wobj.code_object?.code_value || ""}
                readOnly
              />
            </td>
            <td colSpan="2">
              <input
                value={wobj.code_object?.code_symbol || ""}
                readOnly
              />
            </td>
          </tr>

          <tr>
            <td>Реквизиты договора</td>
            <td colSpan="2">
              <input
                value={perm.permission_number || ""}
                readOnly
              />
            </td>
            <tr>
              <td>
                Дата начало
                <input
                  type="date"
                  value={perm.actual_start_date || ""}
                  readOnly
                />
              </td>
              <td colSpan="1">
                Дата окончания
                <input
                  type="date"
                  value={perm.actual_end_date || ""}
                  readOnly
                />
              </td>
            </tr>
          </tr>

          <tr>
            <td>Марка прибора учета</td>
            <td colSpan="3">
              <input value={meter.serial_number || ""} readOnly />
            </td>
          </tr>
          <tr>
            <td>Дата последней поверки, периодичность проверки</td>
            <td>
              <input
                type="date"
                value={meter.verification_date || ""}
                readOnly
              />
            </td>
            <td colSpan="2">
              <input
                value={meter.verification_interval || ""}
                readOnly
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* === таблица точек === */}
      <table className="data-table">
        <thead>
          <tr>
            <th rowSpan="3">Наименование водного объекта - водоисточника</th>
            <th colSpan="3">Коды</th>
            <th rowSpan="3">№ точки водозабора</th>
            <th colSpan="6">Координаты водозабора</th>
            <th rowSpan="4">Объем допустимого водо-забора, тыс. м³</th>
            <th colSpan="5">Фактический объем забора, тыс. м³</th>
          </tr>
          <tr>
            <th rowSpan="2">вида водного объекта-водоисточника</th>
            <th rowSpan="2">водного объекта-водоисточника</th>
            <th rowSpan="2">категория качества воды</th>
            <th colSpan="3">северной широты</th>
            <th colSpan="3">восточной долготы</th>
            <th colSpan="4">в том числе по месяцам квартала</th>
          </tr>
          <tr>
            <th>град.</th><th>мин.</th><th>сек.</th>
            <th>град.</th><th>мин.</th><th>сек.</th>
            <th>всего</th><th>1 мес.</th><th>2 мес.</th><th>3 мес.</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr><td colSpan="16" style={{ textAlign: "center" }}>Данных нет</td></tr>
          )}
          {records.map(rec => {
            const [latS, lonS] = (rec.latitude_longitude || "").split(",");
            const lat = parseDMS(latS), lon = parseDMS(lonS);
            const p = Array.isArray(rec.permissions) && rec.permissions[0] || {};

            return (
              <tr key={rec.id}>
                <td>
                  <input readOnly value={rec.water_object?.code_object?.code_value || ""} />
                </td>
                <td>
                  <input readOnly value={rec.water_object?.code_type?.code_value || ""} />
                </td>
                <td>
                  <input readOnly value={rec.water_object?.code_object?.code_value || ""} />
                </td>
                <td>
                  <input readOnly value={rec.water_object?.category || ""} />
                </td>
                <td><input readOnly value={rec.id} /></td>

                <td><input readOnly value={lat.deg} /></td>
                <td><input readOnly value={lat.min} /></td>
                <td><input readOnly value={lat.sec} /></td>
                <td><input readOnly value={lon.deg} /></td>
                <td><input readOnly value={lon.min} /></td>
                <td><input readOnly value={lon.sec} /></td>

                <td><input readOnly value={p.allowed_volume ?? ""} /></td>
                <td><input readOnly value={p.actual_volume ?? ""} /></td>

                <td>
                  <input
                    value={months[rec.id]?.month1 || ""}
                    onChange={e => handleMonthChange(rec.id, "month1", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={months[rec.id]?.month2 || ""}
                    onChange={e => handleMonthChange(rec.id, "month2", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={months[rec.id]?.month3 || ""}
                    onChange={e => handleMonthChange(rec.id, "month3", e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EditableWaterReport;
