import React, { useState, useEffect } from "react";
import "../css/Water.css";
import { fetchSingleTableData, fetchSingleTableDataWithFilters } from "../api/fetch_records";

const AccountingPost = () => {
  const userData = localStorage.getItem("user");
  let userInfo = {};

  if (userData) {
    try {
      userInfo = JSON.parse(userData);
    } catch (error) {
      console.error("Ошибка парсинга user:", error);
      userInfo = {};
    }
  }

  const isAdmin = userInfo.role === "UserRoles.ADMIN";
  const isEmployee = userInfo.role === "UserRoles.EMPLOYEE";

  const [filteredPoints, setFilteredPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [orgData, setOrgData] = useState({}); // Добавляем состояние для orgData

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isEmployee) {
          const orgStorage = JSON.parse(localStorage.getItem("org"));
          setOrgData(orgStorage); // Сохраняем данные об организации в состояние

          const orgId = orgStorage?.id;

          if (!orgId) {
            console.error("Нет данных об организации для сотрудника");
            return;
          }

          const filters = { organisation_id: orgId };
          const pointData = await fetchSingleTableDataWithFilters("water_point", filters);

          if (pointData) {
            setFilteredPoints(pointData);
          } else {
            setFilteredPoints([]);
          }
        } else {
          const orgDataList = await fetchSingleTableData("organisations");
          const pointData = await fetchSingleTableData("water_point");

          if (!isAdmin) {
            // Для других ролей, кроме админа и сотрудника, пока нет логики фильтрации
            // Если нужно, можно добавить фильтрацию по другим критериям
            const enrichedPoints = pointData.map((point) => {
              const org = orgDataList.find((o) => o.id === point.organisation_id.id);
              return { ...point, organisation_name: org ? org.organisation_name : "Неизвестно" };
            });
            setFilteredPoints(enrichedPoints);
          } else {
            const enrichedPoints = pointData.map((point) => {
              const org = orgDataList.find((o) => o.id === point.organisation_id.id);
              return { ...point, organisation_name: org ? org.organisation_name : "Неизвестно" };
            });
            setFilteredPoints(enrichedPoints);
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        setFilteredPoints([]);
      }
    };
    loadData();
  }, [isAdmin, isEmployee]);

  return (
    <div className="accounting-container">
    <h2>Пункты учета</h2>
    {isEmployee ? (
      <table className="accounting-table">
      <thead>
      <tr>
      <th>Название</th>
      <th>Координаты</th>
      <th>Тип</th>
      <th>Действие</th>
      </tr>
      </thead>
      <tbody>
      {filteredPoints.length > 0 ? (
        filteredPoints.map((point) => (
          <tr key={point.id}>
          <td>{point.water_body_id.code_obj.code_value || "Без названия"}</td>
          <td>{point.latitude_longitude || "-"}</td>
          <td>{point.point_type || "-"}</td>
          <td>
          <button onClick={() => setSelectedPoint(point)}>Открыть журнал</button>
          </td>
          </tr>
        ))
      ) : (
        <tr>
        <td colSpan="4">Нет данных</td>
        </tr>
      )}
      </tbody>
      </table>
    ) : (
      <table className="accounting-table">
      <thead>
      <tr>
      <th>Название</th>
      <th>Организация</th>
      <th>Координаты</th>
      <th>Тип</th>
      <th>Действие</th>
      </tr>
      </thead>
      <tbody>
      {filteredPoints.length > 0 ? (
        filteredPoints.map((point) => (
          <tr key={point.id}>
          <td>{point.water_body_id.code_obj.code_value || "Без названия"}</td>
          <td>{point.organisation_name}</td>
          <td>{point.latitude_longitude || "-"}</td>
          <td>{point.point_type || "-"}</td>
          <td>
          <button onClick={() => setSelectedPoint(point)}>Открыть журнал</button>
          </td>
          </tr>
        ))
      ) : (
        <tr>
        <td colSpan="5">Нет данных</td>
        </tr>
      )}
      </tbody>
      </table>
    )}
    {selectedPoint && (
      <div className="water-log">
      <h2>Журнал учета водопотребления для {selectedPoint.water_body_id.code_obj.code_value || "Без названия"}</h2>
      {isEmployee ? (
        <p>Организация: {orgData?.organisation_name}</p>
      ) : (
        <p>Организация: {selectedPoint.organisation_name}</p>
      )}
      <select id="months">
      <option value="январь">январь</option>
      <option value="февраль">февраль</option>
      <option value="март">март</option>
      <option value="апрель">апрель</option>
      <option value="май">май</option>
      <option value="июнь">июнь</option>
      <option value="июль">июль</option>
      <option value="август">август</option>
      <option value="сентябрь">сентябрь</option>
      <option value="октябрь">октябрь</option>
      <option value="ноябрь">ноябрь</option>
      <option value="декабрь">декабрь</option>
      </select>
      {/* Здесь можно подключить компонент журнала и передать selectedPoint.id */}
      <p>Функционал журнала в разработке...</p>
      <button onClick={() => setSelectedPoint(null)}>Закрыть</button>
      </div>
    )}
    </div>
  );
};

export default AccountingPost;
