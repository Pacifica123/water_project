import React, { useState, useEffect } from "react";
import "../css/Water.css";
import { fetchSingleTableData } from "../api/fetch_records";

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

  const isAdmin = userInfo.role === "admin";

  const [filteredPoints, setFilteredPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const orgData = await fetchSingleTableData("organisations");
        const pointData = await fetchSingleTableData("water_point");

        if (!isAdmin) {
          const userOrgPoints = pointData.map((point) => {
            const org = orgData.find((o) => o.id === point.organization_id);
            return { ...point, organisation_name: org ? org.organisation_name : "Неизвестно" };
          }).filter((point) => point.organization_id === userInfo.organization_id);
          setFilteredPoints(userOrgPoints);
        } else {
          const enrichedPoints = pointData.map((point) => {
            const org = orgData.find((o) => o.id === point.organization_id);
            return { ...point, organisation_name: org ? org.organisation_name : "Неизвестно" };
          });
          setFilteredPoints(enrichedPoints);

        }
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        setFilteredPoints([]);
      }
    };
    loadData();
  }, [isAdmin, userInfo.organization_id]);





  return (
    <div className="accounting-container">
      <h2>Пункты учета</h2>
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
                <td>{point.organisation_id.organisation_name}</td>
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

      {selectedPoint && (
        <div className="water-log">
          <h2>Журнал учета водопотребления для {selectedPoint.name || "Без названия"}</h2>
          <p>Организация: {selectedPoint.organisation_name}</p>
          {/* Здесь можно подключить компонент журнала и передать selectedPoint.id */}
          <p>Функционал журнала в разработке...</p>
          <button onClick={() => setSelectedPoint(null)}>Закрыть</button>
        </div>
      )}
    </div>
  );
};

export default AccountingPost;