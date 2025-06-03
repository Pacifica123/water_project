import React, { useState, useEffect, useRef } from "react";
import "../css/Water.css";
import "../css/AccountingPost.css";

import {
  fetchSingleTableData,
  fetchSingleTableDataWithFilters,
  fetchStructDataWithFilters,
  fetchStructureData,
} from "../api/fetch_records";
import {
  uploadFileToBackend
} from "../api/add_files"
import {translate} from "../utils/translations.js";
import FileUpload from "./FileUpload";
import { sendFormData } from "../api/add_records";
import { isoToRu } from "../utils/converters.js";
import { getStringFieldsLabel } from "../utils/extractors";
import InputMask from 'react-input-mask';
import jsPDF from "jspdf";

// Универсальный селект для перечислений и внешних ключей
const ForeignKeySelect = ({ field, value, onChange }) => {
  const [options, setOptions] = useState(field.options || []);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    // флаг для избежания setState на размонтированном компоненте
    isMounted.current = true;
    const fetchOptions = async () => {
      setLoading(true);
      try {
        if (field.isEnum) {
          const response = await fetchStructureData("enum_" + field.enumType);
          if (!isMounted.current) return;
          setOptions(response.data || []);
        }
        else if (field.foreignKey) {
          // если уже передали готовые опции
          if (field.options && field.options.length > 0) {
            setOptions(field.options);
          } else if (field.referenceTable) {
            // fallback: запросим все записи связанной таблицы
            const records = await fetchSingleTableDataWithFilters(
              field.referenceTable,
              {}  // можно сюда передать начальные фильтры
            );
            if (!isMounted.current) return;
            // API возвращает массив или { data: [...] }
            const items = Array.isArray(records)
            ? records
            : records?.data || [];
            setOptions(
              items.map(item => ({
                value: item.id,
                label: getStringFieldsLabel(item)
                // label: item.name || item.serial_number || String(item.id)
              }))
            );
          } else {
            setOptions([]);
          }
        }
        else {
          setOptions([]);
        }
      } catch (error) {
        console.error("Ошибка получения опций для", field.field, error);
        if (isMounted.current) {
          setOptions([]);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchOptions();

    return () => {
      // помечаем, что компонент размонтирован
      isMounted.current = false;
    };
  }, [
    field.field,
    field.enumType,
    field.foreignKey,
    JSON.stringify(field.options),
            field.referenceTable
  ]);

  return (
    <select
    name={field.field}
    value={value}
    onChange={e =>
      onChange({ target: { name: field.field, value: e.target.value } })
    }
    disabled={loading}
    >
    <option value="">Выберите...</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>
      {opt.label}
      </option>
    ))}
    </select>
  );
};



const AccountingPost = () => {
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [exportLogId, setExportLogId] = useState(null);

  const [statusFilters, setStatusFilters] = useState({
    in_progress: true,
    is_done: true,
    sent: true,
    under_watch: true,
    under_correction: true,
    closed: true,
  });
  const getStatusClass = (status) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("in_progress")) return "status-in-progress";
    if (normalized.includes("is_done")) return "status-done";
    if (normalized.includes("sent")) return "status-sent";
    if (normalized.includes("under_watch")) return "status-watch";
    if (normalized.includes("under_correction")) return "status-correction";
    if (normalized.includes("closed")) return "status-closed";
    return "status-unknown";
  };
  const [expandedLogs, setExpandedLogs] = useState({});
  const [logDetails, setLogDetails] = useState({});
  // Показать/скрыть модалку создания журнала
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  // Список enum-значений месяцев
  const [monthsEnum, setMonthsEnum] = useState([
    { value: "JANUARY",    label: "январь" },
    { value: "FEBRUARY",   label: "февраль" },
    { value: "MARCH",      label: "март" },
    { value: "APRIL",    label: "апрель" },
    { value: "MAY",       label: "май" },
    { value: "JUNE",      label: "июнь" },
    { value: "JULY",      label: "июль" },
    { value: "AUGUST",    label: "август" },
    { value: "SEPTEMBER",  label: "сентябрь" },
    { value: "OCTOBER",   label: "октябрь" },
    { value: "NOVEMBER",    label: "ноябрь" },
    { value: "DECEMBER",   label: "декабрь" },
  ]);

  // Данные формы для нового журнала
  const [headerData, setHeaderData] = useState({
    point_id: "",
    exploitation_org_id: null,
    month: "",
    log_status: "in_progress",
    start_date: new Date().toISOString().slice(0, 10),
  });


  // Для добавления нового пункта учета
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    organisation_id: "",
    water_body_id: "",
    latitude_longitude: "",
    point_type: "",
    existing_meter_id: ""
  });
  const [waterBodyOptions, setWaterBodyOptions] = useState([]);
  const [pointTypeOptions, setPointTypeOptions] = useState([]);
  const [meterOptions, setMeterOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [newMeterData, setNewMeterData] = useState({
    brand_id: "",
    serial_number: "",
    verification_date: "",
    verification_interval: "",
    next_verification_date: ""
  });
  const [permissionData, setPermissionData] = useState({
    permission_number: "",
    registration_date: "",
    expiration_date: "",
    permission_type: "",
    allowed_volume_org: "",
    allowed_volume_pop: "",
    method_type: "",
  });
  const permissionTypeOptions = [
    { value: "WATER_WITHDRAWAL", label: "Забор" },
    { value: "DISCHARGE", label: "Сброс" },
    // и т.д. — значения зависят от бэкенда
  ];
  // const handleExpandLog = async (logId) => {
  //   if (expandedLogs[logId]) {
  //     // Закрываем текущий журнал
  //     setExpandedLogs({});
  //     setLogDetails((prev) => ({ ...prev, [logId]: null }));
  //     setExportLogId(null);
  //   } else {
  //     // Закрываем все и открываем только выбранный
  //     try {
  //       const response = await fetchStructDataWithFilters("log_details", {
  //         log_id: logId,
  //       });
  //       if (response && response.data) {
  //         setLogDetails({ [logId]: response.data });
  //         setExportLogId(logId);
  //       } else {
  //         setLogDetails({ [logId]: null });
  //         setExportLogId(null);
  //       }
  //     } catch (error) {
  //       console.error("Ошибка загрузки деталей журнала", error);
  //       setLogDetails({ [logId]: null });
  //       setExportLogId(null);
  //     }
  //     setExpandedLogs({ [logId]: true });
  //   }
  // };


  const userInfo = JSON.parse(localStorage.getItem("user"));
  const orgData = localStorage.getItem("org");
  let orgInfo = {};

  if (orgData) {
    try {
      orgInfo = JSON.parse(orgData);
      console.log(orgInfo);
    } catch (error) {
      console.error("Ошибка парсинга org:", error);
      orgInfo = {};
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchStructDataWithFilters("logs_for_AP", {
          role: userInfo.role,
          org_id: orgInfo?.id,
        });

        if (response && response.data) {
          const enrichedLogs = response.data.map((log) => {
            const waterBody = log.point_id?.water_body_id;
            const org = log.point_id?.organisation_id;

            return {
              id: log.id,
              water_body_name:
              waterBody?.code_obj_id?.code_value || "Без названия",
              organisation_name: org?.organisation_name || "Неизвестно",
              coordinates: log.point_id?.latitude_longitude || "-",
              point_type: log.point_id?.point_type || "-",
              start_date: log.start_date || "-",
              status: log.log_status || "Неизвестно",
            };
          });
          setAllLogs(enrichedLogs);
          setFilteredLogs(enrichedLogs);
        } else {
          setAllLogs([]);
          setFilteredLogs([]);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        setError("Не удалось загрузить данные");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      if (allLogs.length === 0) return;

      const filtered = allLogs.filter((log) => {
        const startDate = new Date(log.start_date);
        const logMonth = startDate.getMonth();
        const logYear = startDate.getFullYear();

        const dateFilter =
        (monthFilter === new Date().getMonth() || logMonth === monthFilter) &&
        (yearFilter === new Date().getFullYear() || logYear === yearFilter);

        const status = log.status.toLowerCase();
        const statusFilter = Object.keys(statusFilters).some((key) => {
          return statusFilters[key] && status.includes(key);
        });

        return dateFilter && statusFilter;
      });

      setFilteredLogs(filtered);
    };

    applyFilters();
  }, [monthFilter, yearFilter, statusFilters, allLogs]);


  const handleExportLogsToExcel = async () => {
    // Если открыт журнал — выгружаем его
    if (exportLogId && logDetails[exportLogId]) {
      const log = logDetails[exportLogId];
      const rows = log.wcl_list.map(entry => ({
        "Дата измерения": new Date(entry.measurement_date).toLocaleDateString("ru-RU"),
                                              "Дней эксплуатации": entry.operating_time_days,
                                              "Расход воды (м³/день)": entry.water_consumption_m3_per_day,
                                              "Подпись лица": entry.person_signature,
      }));

      const payload = {
        status: "success",
        message: `Детали журнала №${exportLogId}`,
        data: rows,
      };

      try {
        const response = await fetch("http://127.0.0.1:5000/api/json_to_excel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            tokenJWTAuthorization: localStorage.getItem("token") || ""
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Ошибка при создании Excel");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Журнал_${exportLogId}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error("Ошибка экспорта:", err);
        alert("Не удалось выгрузить Excel");
      }
    } else if (filteredLogs.length > 0) {
      // Если не открыт конкретный журнал — выгружаем отфильтрованный список
      const payload = {
        status: "success",
        message: "Export water consumption logs",
        data: filteredLogs.map(log => ({
          id: log.id,
          organisation: log.organisation_name,
          water_body: log.water_body_name,
          coordinates: log.coordinates,
          point_type: log.point_type,
          start_date: log.start_date,
          status: log.status
        }))
      };

      try {
        const response = await fetch("http://127.0.0.1:5000/api/json_to_excel",{
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            tokenJWTAuthorization: localStorage.getItem("token") || ""
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Ошибка при создании Excel");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Журналы_${monthFilter + 1}_${yearFilter}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error("Ошибка экспорта:", err);
        alert("Не удалось выгрузить Excel");
      }
    } else {
      alert("Нет данных для выгрузки");
    }
  };


  const handleExportLogsToPDF = () => {
    if (filteredLogs.length === 0) {
      alert("Нет данных для выгрузки");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Журнал учёта водопотребления", 14, 20);
    doc.setFontSize(11);
    doc.text(
      `Месяц: ${new Date(2024, monthFilter).toLocaleString('ru-RU', { month: 'long' })}, Год: ${yearFilter}`,
             14,
             28
    );

    const tableData = filteredLogs.map(log => ([
      log.organisation_name,
      log.water_body_name,
      log.coordinates,
      log.point_type,
      log.start_date,
      log.status
    ]));

    doc.autoTable({
      startY: 35,
      head: [["Организация", "Водный объект", "Координаты", "Тип", "Дата", "Статус"]],
      body: tableData,
      styles: { fontSize: 9 }
    });

    doc.save(`Журнал_${monthFilter + 1}_${yearFilter}.pdf`);
  };

  const handleMonthChange = (event) => {
    setMonthFilter(parseInt(event.target.value));
  };

  const handleYearChange = (event) => {
    setYearFilter(parseInt(event.target.value));
  };

  // Загрузка параметров для формы при открытии модального окна
  useEffect(() => {
    if (!showAddModal) return;
    const loadStructure = async () => {
      try {
        const schema = await fetchStructureData("schema_water_point");
        const waterField = schema.data.find((f) => f.field === "water_body_id");
        const typeField = schema.data.find((f) => f.field === "point_type");
        // Преобразуем опции к формату {value, label}
        setWaterBodyOptions(
          (waterField?.options || []).map(opt => ({ value: opt.id, label: opt.code_value || opt.name }))
        );
        setPointTypeOptions(
          (typeField?.options || []).map(opt => ({ value: opt.value, label: opt.label }))
        );
        setFormData((p) => ({ ...p, organisation_id: orgInfo.id }));

        const meters = await fetchSingleTableDataWithFilters("meters", { organisation_id: orgInfo.id });
        console.log(meters);
        setMeterOptions(
          (meters.data || []).map(opt => ({ value: opt.id, label: opt.serial_number }))
        );

        const brandSchema = await fetchSingleTableData("meters_brand_ref");
        console.log("BRANDS : " + brandSchema);
        setBrandOptions(
          (brandSchema.data || []).map(opt => ({ value: opt.id, label: opt.brand_name }))
        );
      } catch (err) {
        console.error("Ошибка загрузки структуры формы", err);
      }
    };
    loadStructure();
  }, [showAddModal]);

  const handleStatusChange = (event) => {
    const { name, checked } = event.target;
    setStatusFilters((prev) => ({ ...prev, [name]: checked }));
  };

  const handleExpandLog = async (logId) => {
    if (expandedLogs[logId]) {
      // Закрываем текущий журнал
      setExpandedLogs({});
      setLogDetails((prev) => ({ ...prev, [logId]: null }));
      setExportLogId(null);
    } else {
      // Закрываем все и открываем только выбранный
      try {
        const response = await fetchStructDataWithFilters("log_details", {
          log_id: logId,
        });
        if (response && response.data) {
          setLogDetails({ [logId]: response.data });
          setExportLogId(logId);
        } else {
          setLogDetails({ [logId]: null });
          setExportLogId(null);
        }
      } catch (error) {
        console.error("Ошибка загрузки деталей журнала", error);
        setLogDetails({ [logId]: null });
        setExportLogId(null);
      }
      setExpandedLogs({ [logId]: true });
    }
  };


  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const toggleStatusDropdown = () => {
    setStatusDropdownOpen((prev) => !prev);
  };

  const getStatusName = (key) => {
    const labels = {
      in_progress: 'В процессе',
      is_done: 'Подписан',
      sent: 'Отправлен',
      under_watch: 'На рассмотрении',
      under_correction: 'На доработке',
      closed: 'Закрыт',
    };
    return labels[key] || key;
  };
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewMeterChange = (e) => {
    const { name, value } = e.target;
    setNewMeterData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'verification_date' || name === 'verification_interval') {
        const date = new Date(updated.verification_date);
        const interval = parseInt(updated.verification_interval, 10);
        if (!isNaN(date.getTime()) && !isNaN(interval)) {
          date.setFullYear(date.getFullYear() + interval);
          updated.next_verification_date = date.toISOString().split('T')[0];
        }
      }
      return updated;
    });
  };

  const handleSaveNewPoint = async () => {
    // 1. Собираем data_point
    const data_point = {
      organisation_id: formData.organisation_id,
      water_body_id: formData.water_body_id,
      latitude_longitude: formData.latitude_longitude,
      point_type: formData.point_type,
      // переназначаем существующий счётчик в то, что ждёт бэкенд
      meter_id: formData.existing_meter_id || null,
    };

    // 2. Собираем data_meter
    let data_meter;
    if (formData.existing_meter_id) {
      // только id, чтобы бэкенд понял, что счётчик уже есть
      data_meter = { id: formData.existing_meter_id };
    } else {
      // создаём новый прибор
      data_meter = {
        brand_id: newMeterData.brand_id,
        serial_number: newMeterData.serial_number,
        verification_date: isoToRu(newMeterData.verification_date),
        verification_interval: newMeterData.verification_interval,
        next_verification_date: isoToRu(newMeterData.next_verification_date),
      };
    }

    // 3. Собираем data_permission
    const data_permission = {
      permission_number: permissionData.permission_number,
      registration_date: isoToRu(permissionData.registration_date),
      expiration_date: isoToRu(permissionData.expiration_date),
      permission_type: permissionData.permission_type,
      allowed_volume_org: permissionData.allowed_volume_org,
      allowed_volume_pop: permissionData.allowed_volume_pop,
      method_type: permissionData.method_type,
    };

    // 4. Формируем общий payload
    const payload = { data_point, data_meter, data_permission };

    try {
      const result = await sendFormData("create_water_point", payload);
      // result: { status, msg, data? }
      console.log(result);
      if (result === "успешно") {
        alert("Пункт учета успешно создан");
        // тут можно сбросить форму, перезагрузить список и т.п.
      } else if (result === "VALIDATION_ERROR") {
        alert("Ошибка валидации: " + result.msg);
      } else if (result === "CHOICE_WARNING") {
        console.warn("Найдено несколько приборов:", result.data);
        // тут можно например вывести модалку с выбором из result.data
      } else {
        alert("Не удалось создать: " + result.msg);
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при отправке данных");
    } finally {
      setShowAddModal(false);
    }
  };


  const handlePermissionChange = (e) => {
    const { name, value } = e.target;
    setPermissionData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const methodTypeOptions = [
    { value: "org", label: "Организации" },
    { value: "population", label: "Населению" },
    { value: "other_org", label: "Другая организация" },
    { value: "other_population", label: "Другое население" },
  ];

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateLog = async () => {
    if (!headerData.point_id) {
      alert("Пожалуйста, выберите водопункт.");
      return;
    }
    if (!headerData.month) {
      alert("Пожалуйста, выберите месяц.");
      return;
    }
    try {
      const payload = {
        point_id: headerData.point_id,
        exploitation_org_id: orgInfo.id,
        month: headerData.month,
        log_status: headerData.log_status,
        start_date: headerData.start_date,
      };
      const result = await sendFormData(
        "create_water_consumption_header",
        payload
      );
      if (result.status === "SUCCESS") {
        alert("Журнал учета успешно создан.");
        setShowAddLogModal(false);
        // Перезагрузим список журналов:
        const response = await fetchStructDataWithFilters("logs_for_AP", {
          role: userInfo.role,
          org_id: orgInfo?.id,
        });
        if (response && response.data) {
          const enrichedLogs = response.data.map((log) => {
            const waterBody = log.point_id?.water_body_id;
            const org = log.point_id?.organisation_id;
            return {
              id: log.id,
              water_body_name:
              waterBody?.code_obj_id?.code_value || "Без названия",
              organisation_name: org?.organisation_name || "Неизвестно",
              coordinates: log.point_id?.latitude_longitude || "-",
              point_type: log.point_id?.point_type || "-",
              start_date: log.start_date || "-",
              status: log.log_status || "Неизвестно",
            };
          });
          setAllLogs(enrichedLogs);
          setFilteredLogs(enrichedLogs);
        }
      } else {
        alert("Ошибка при создании журнала: " + result.msg);
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая или системная ошибка при создании журнала.");
    }
  };


  return (
    <div className="accounting-container">
    <h2 align="center">Журналы учета водопотребления и пункты учета</h2>

    {/* Модальное окно для добавления */}
    {showAddModal && (
      <div className="modal-overlay">
      <div className="modal-content">
      <div className="modal-left">

      <center><label>Организация:</label>
      <select name="organisation_id" value={formData.organisation_id} disabled>
      <option value={orgInfo.id}>{orgInfo.organisation_name}</option>
      </select>
      </center>
      <hr />
      <div className="label-modal">
      <label>Водный объект:</label>
      <ForeignKeySelect
      field={{ field: 'water_body_id', foreignKey: true, options: [], referenceTable: 'water_object_ref' }}
      value={formData.water_body_id}
      onChange={handleFormChange}
      />
      </div>
      <div className="label-modal">
      <label>Координаты (широта, долгота):</label>
      <InputMask
      mask="99°99′99″ с.ш., 99°99′99″ в.д."
      value={formData.latitude_longitude || "00°00′00″ с.ш., 00°00′00″ в.д."}
      onChange={handleFormChange}
      >
      {(inputProps) => (
        <input
        {...inputProps}
        type="text"
        name="latitude_longitude"
        placeholder="55°45′30″ с.ш., 37°36′20″ в.д."
        className="coordinate-input"
        style={{
          background: "#181818",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "6px",
          padding: "8px 12px",
          fontFamily: "inherit",
          fontSize: "1rem"
        }}
        />
      )}
      </InputMask>

      </div>
      <div className="label-modal">
      <label> Тип пункта:</label>
      <ForeignKeySelect
      field={{ field: 'point_type', isEnum: true, enumType: 'PermissionType' }}
      value={formData.point_type}
      onChange={handleFormChange}
      />
      </div>
      </div>
      <div className="modal-right">
      <div className="modal-upper-right">
      <div className="label-modal">
      <label>Выбрать существующий прибор:</label>
      <ForeignKeySelect
      field={{ field: 'existing_meter_id', foreignKey: true, options: [], referenceTable:"meters" }}
      value={formData.existing_meter_id}
      onChange={handleFormChange}
      />
      </div>
      <hr />

      <label>Ввести новый прибор:</label>
      <div className="new-meter-form">
      <label>Марка прибора:</label>
      <ForeignKeySelect
      field={{ field: 'brand_id', foreignKey: true, options: [], referenceTable:"meters_brand_ref" }}
      value={newMeterData.brand_id}
      onChange={handleNewMeterChange}
      />

      <label>Серийный номер:</label>
      <input
      type="text"
      name="serial_number"
      value={newMeterData.serial_number}
      onChange={handleNewMeterChange}
      />

      <label>Дата поверки:</label>
      <input
      type="date"
      name="verification_date"
      value={newMeterData.verification_date}
      onChange={handleNewMeterChange}
      />

      <label>Интервал поверки (лет):</label>
      <input
      type="number"
      name="verification_interval"
      value={newMeterData.verification_interval}
      onChange={handleNewMeterChange}
      />

      <label>Следующая поверка:</label>
      <input
      type="date"
      name="next_verification_date"
      value={newMeterData.next_verification_date}
      readOnly
      />
      </div>
      </div>
      <div className="permission-section">
      <h4>Разрешение на водопользование</h4>
      <div className="label-modal">
      <label>Номер разрешения:</label>
      <input
      type="text"
      name="permission_number"
      value={permissionData.permission_number}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Дата регистрации:</label>
      <input
      type="date"
      name="registration_date"
      value={permissionData.registration_date}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Дата окончания:</label>
      <input
      type="date"
      name="expiration_date"
      value={permissionData.expiration_date}
      onChange={handlePermissionChange}
      />
      </div>
      <div className="label-modal">
      <label>Тип разрешения:</label>
      <ForeignKeySelect
      field={{ field: 'permission_type', isEnum: true, enumType: 'PermissionType' }}
      value={permissionData.permission_type}
      onChange={handlePermissionChange}
      />
      </div>

      <div className="label-modal">
      <label>Разрешённый объём (организации):</label>
      <input
      type="number"
      name="allowed_volume_org"
      value={permissionData.allowed_volume_org}
      onChange={handlePermissionChange}
      step="0.01"
      />
      </div>
      <div className="label-modal">
      <label>Разрешённый объём (население):</label>
      <input
      type="number"
      name="allowed_volume_pop"
      value={permissionData.allowed_volume_pop}
      onChange={handlePermissionChange}
      step="0.01"
      />
      </div>

      <div className="label-modal">
      <label>Выберете метод:</label>
      <ForeignKeySelect
      field={{ field: 'method_type', isEnum: true, enumType: 'RatesType' }}
      value={permissionData.method_type}
      onChange={handlePermissionChange}
      />
      </div>


      <div className="label-modal" style={{marginTop: 10, color: "#888", fontStyle: "italic"}}>
      <FileUpload
      label="Скан разрешения"
      accept="application/pdf"
      icon="📄"
      entityType="permission"
      entityId={permissionData.permission_number}
      fileType={"PERMISSION_SCAN"}
      preview={true}
      onUpload={uploadFileToBackend}
      />
      </div>
      </div>

      <div className="modal-actions">
      <button className="add-button" onClick={handleSaveNewPoint}>Сохранить</button>
      <button className="delete-button" onClick={() => setShowAddModal(false)}>Отмена</button>
      </div>
      </div>
      </div>

      </div>
    )}
    {/* ------------------------------------------------------------ */}
    {/* Новый блок: кнопка и модалка «Создать журнал учета» */}
    <div className="header-section">
    <button
    className="custom-button"
    onClick={() => setShowAddLogModal(true)}
    >
    Создать журнал учета
    </button>
    </div>

    {showAddLogModal && (
      <div className="modal-overlay">
      <div className="modal-content">
      <h3>Создать новый журнал учета</h3>

      <div className="label-modal">
      <label>Водопункт:</label>
      <ForeignKeySelect
      field={{
        field: "point_id",
        foreignKey: true,
          referenceTable: "water_point",
      }}
      value={headerData.point_id}
      onChange={handleHeaderChange}
      />
      </div>

      <div className="label-modal">
      <label>Месяц:</label>
      <select
      name="month"
      value={headerData.month}
      onChange={handleHeaderChange}
      >
      <option value="" disabled>
      — выберите месяц —
      </option>
      {monthsEnum.map((item) => (
        <option key={item.value} value={item.value}>
        {item.label.charAt(0).toUpperCase() +
          item.label.slice(1)}
          </option>
      ))}
      </select>
      </div>

      <div className="label-modal">
      <label>Дата открытия:</label>
      <input
      type="date"
      name="start_date"
      value={headerData.start_date}
      onChange={handleHeaderChange}
      />
      </div>

      <div className="label-modal">
      <label>Статус:</label>
      <input
      type="text"
      value="in_progress"
      disabled
      style={{ backgroundColor: "#f3f3f3" }}
      />
      </div>

      <div className="modal-actions">
      <button className="add-button" onClick={handleCreateLog}>
      Сохранить журнал
      </button>
      <button
      className="delete-button"
      onClick={() => setShowAddLogModal(false)}
      >
      Отмена
      </button>
      </div>
      </div>
      </div>
    )}
    {/* ------------------------------------------------------------ */}


    {isLoading ? (
      <p>Загрузка данных...</p>
    ) : error ? (
      <p>{error}</p>
    ) : (
      <div>
      <div className="filters-container">
      <div className="filter-block">
      <label>Месяц: </label>
      <select value={monthFilter} onChange={handleMonthChange}>
      {[...Array(12)].map((_, month) => (
        <option key={month} value={month}>
        {new Date(2024, month, 1).toLocaleString('default', { month: 'long' })}
        </option>
      ))}
      </select>
      </div>

      <div className="filter-block">
      <label>Год: </label>
      <select value={yearFilter} onChange={handleYearChange}>
      {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
        <option key={year} value={year}>{year}</option>
      ))}
      </select>
      </div>

      <div className="filter-block">
      <label>Статус: </label>
      <button className="status-toggle" onClick={toggleStatusDropdown}>
      {statusDropdownOpen ? "Скрыть" : "Выбрать статусы"}
      </button>
      {statusDropdownOpen && (
        <div className="status-dropdown">
        {Object.keys(statusFilters).map((key) => (
          <label className="status-item" key={key}>
          <span className="status-label">{getStatusName(key)}</span>
          <input
          type="checkbox"
          name={key}
          checked={statusFilters[key]}
          onChange={handleStatusChange}
          />
          </label>
        ))}
        </div>
      )}
      </div>

      <div className="filter-block">
      {userInfo.role === "UserRoles.EMPLOYEE" && (

        <button className="custom-button" onClick={() => setShowAddModal(true)}>Добавить пункт учета</button>

      )}
      {userInfo.role === "UserRoles.EMPLOYEE" && (
        <button className="custom-button" onClick={()=> setShowAddModal(true) }>Создать журнал учета</button>
      )}

      </div>


      <div className="filter-block">
      {userInfo.role === "UserRoles.EMPLOYEE" && (
        <button className="custom-button" onClick={handleExportLogsToExcel}>
        Выгрузить журнал в Excel
        </button>
      )}
      </div>
      </div>




      {/* Таблица */}
      {filteredLogs.length === 0 ? (
        <p>Нет данных</p>
      ) : (
        <table className="data-table-accountingPost">
        <thead>
        <tr>
        {userInfo.role !== "UserRoles.EMPLOYEE" && (
          <th>Организация</th>
        )}
        <th>Название водного объекта</th>
        <th>Координаты</th>
        <th>Тип</th>
        <th>Дата открытия</th>
        <th>Статус</th>
        {userInfo.role === "UserRoles.EMPLOYEE" && (
          <th>Действия</th>
        )}
        </tr>
        </thead>
        <tbody>
        {filteredLogs.map((log) => (
          <tr key={log.id}>
          {userInfo.role !== "UserRoles.EMPLOYEE" && (
            <td>{log.organisation_name}</td>
          )}
          <td>{log.water_body_name}</td>
          <td>{log.coordinates}</td>
          <td>{translate(log.point_type)}</td>
          <td>{log.start_date}</td>
          <td className={getStatusClass(log.status)}>{translate(log.status)}</td>
          {userInfo.role === "UserRoles.EMPLOYEE" && (
            <td>
            <button className="custom-button" onClick={() => handleExpandLog(log.id)}>
            {expandedLogs[log.id] ? "Скрыть журнал" : "Открыть журнал"}
            </button>
            </td>
          )}
          </tr>
        ))}
        </tbody>
        </table>
      )}

      {/* 📘 Третий блок — журнал */}
      {Object.entries(expandedLogs).map(([logId, isExpanded]) =>
        isExpanded && logDetails[logId] ? (
          <div key={logId} className="log-details-container">
          <h3 align="center">Детали журнала (Номер журнала: {logId})</h3>
          <p align="center">
          <strong >Эксплуатирующая организация:</strong>{" "}
          {logDetails[logId].exploitation_org.organisation_name}
          </p>
          <table className="data-table-accountingPost">
          <thead>
          <tr>
          <th>Дата измерения</th>
          <th>Дней эксплуатации</th>
          <th>Расход воды (м³/день)</th>
          <th className="data-table-accountingPost-th">Подпись лица</th>
          </tr>
          </thead>
          <tbody>
          {logDetails[logId].wcl_list.map((m) => {
            // Преобразуем строку даты в объект Date
            const date = new Date(m.measurement_date);
            // Форматируем дату в нужный вид, например "дд.мм.гггг"
            const formattedDate = date.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            return (
              <tr key={m.measurement_date}>
              <td>{formattedDate}</td>
              <td>{m.operating_time_days}</td>
              <td>{m.water_consumption_m3_per_day}</td>
              <td>{m.person_signature}</td>
              </tr>
            );
          })}
          </tbody>

          </table>

          {["in_progress", "under_correction"].some((s) =>
            allLogs.find(log => log.id === Number(logId))?.status?.toLowerCase().includes(s)
          ) ? (
            <div className="log-files-upload">
            <h4 style={{ textAlign: "center" }}>Загрузка файлов:</h4>
            <div className="upload-row">
            <FileUpload
            label="PDF-скан"
            accept="application/pdf"
            icon="📄"
            entityType="water_consumption_log"
            entityId={logId}
            fileType="MONTH_CLOSURE_SCAN"
            preview={true}
            onUpload={uploadFileToBackend}
            />
            </div>
            <div className="upload-row">
            <FileUpload
            label="Sig-файл подписи"
            accept=".sig"
            icon="🔏"
            entityType="water_consumption_log"
            entityId={logId}
            fileType="SIGNATURE"
            preview={false}
            onUpload={uploadFileToBackend}
            />
            </div>
            </div>
          ) : (
            <div className="log-files-upload">
            <h4 style={{ textAlign: "center", color: "gray" }}>Загрузка недоступна</h4>
            <p style={{ textAlign: "center", color: "#888", fontStyle: "italic" }}>
            Файлы можно загрузить или заменить только в статусах <b>"На доработке"</b> или <b>"В процессе"</b>
            </p>
            </div>
          )}

          </div>
        ) : null
      )}
      </div>
    )}
    </div>
  );
};

export default AccountingPost;
