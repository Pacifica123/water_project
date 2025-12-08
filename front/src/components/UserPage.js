import React, { useState, useEffect } from "react";
import { fetchSingleTableData } from "../api/fetch_records";
import "../App.css";
import { translate } from "../utils/translations";

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [orgFilter, setOrgFilter] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await fetchSingleTableData("users");
        setUsers(userData || []);
      } catch (error) {
        console.error("Ошибка при загрузке пользователей:", error);
      }
    };

    fetchData();
  }, []);
  useEffect(() => {
    if (roleFilter !== "EMPLOYEE" && roleFilter !== "ALL") {
      setOrgFilter("ALL");
    }
  }, [roleFilter]);
  const extractOrgList = () => {
    const uniqueOrgs = new Map();
    users.forEach((user) => {
      const org = user.organisation_id;
      if (org && !uniqueOrgs.has(org.id)) {
        uniqueOrgs.set(org.id, org.organisation_name);
      }
    });
    return Array.from(uniqueOrgs.entries());
  };

  // Фильтрация пользователей по роли и организации
  const filteredUsers = users.filter((user) => {
    const roleMatch = roleFilter === "ALL" || user.role === roleFilter;
    const orgMatch =
    orgFilter === "ALL" ||
    (user.organisation_id && String(user.organisation_id.id) === orgFilter);
    return roleMatch && orgMatch;
  });

  // Разделяем пользователей на администраторов и сотрудников
  const filteredAdmins = filteredUsers.filter(
    (user) => user.role === "ADMIN" || user.role === "ORG_ADMIN" || user.role === "REPORT_ADMIN"
  );

  const filteredEmployees = filteredUsers.filter(
    (user) => user.role === "EMPLOYEE"
  );

  return (
    <div className="form-UsePage">
    <h2>Пользователи системы</h2>
    <div className="filters-container">
    <div className="filter-block" >
    <label>
    Роль:
    </label>
    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
    <option value="ALL">Все</option>
    <option value="EMPLOYEE">Сотрудники</option>
    <option value="ORG_ADMIN">Орг. админы</option>
    <option value="REPORT_ADMIN">Отчетные админы</option>
    <option value="ADMIN">Администраторы</option>
    </select>
    </div>
    <div className="filter-block ">
    {(roleFilter === "EMPLOYEE" || roleFilter === "ALL") && (
      <label>
      Организация:
      </label>
    )}
    {/* Показываем выпадающий список "Организация" только если выбрана роль "Сотрудник" или "Все" */}
    {(roleFilter === "EMPLOYEE" || roleFilter === "ALL") && (
      <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
      <option value="ALL">Все</option>
      {extractOrgList().map(([id, name]) => (
        <option key={id} value={id}>
        {name}
        </option>
      ))}
      </select>
    )}
    </div>
    </div>


    {/* Показываем только таблицу, соответствующую выбранной роли */}
    {roleFilter === "ADMIN" || roleFilter === "ORG_ADMIN" || roleFilter === "REPORT_ADMIN" ||  roleFilter === "ALL" ? (
      <div className="admin-section">
      <h3>Администраторы</h3>
      <table className="data-table-result">
      <thead>
      <tr>
      <th>Фамилия</th>
      <th>Имя</th>
      <th>Отчество</th>
      <th>Логин</th>
      <th>Email</th>
      <th>Роль</th>
      </tr>
      </thead>
      <tbody>
      {filteredAdmins.map((user, index) => (
        <tr key={index}>
        <td>{user.last_name || "—"}</td>
        <td>{user.first_name || "—"}</td>
        <td>{user.middle_name || "—"}</td>
        <td>{user.username}</td>
        <td>{user.email}</td>
        <td>{translate(user.role)}</td>
        </tr>
      ))}
      </tbody>
      </table>
      </div>
    ) : null}

    {roleFilter === "EMPLOYEE" || roleFilter === "ALL" ? (
      <div className="employee-section">
      <h3>Сотрудники</h3>
      <table className="data-table-result">
      <thead>
      <tr>
      <th>Организация</th>
      <th>Логин</th>
      <th>Email</th>
      <th>Роль</th>
      </tr>
      </thead>
      <tbody>
      {filteredEmployees.map((user, index) => (
        <tr key={index}>
        <td>{user.organisation_id?.organisation_name || "—"}</td>
        <td>{user.username}</td>
        <td>{user.email}</td>
        <td>{translate(user.role)}</td>
        </tr>
      ))}
      </tbody>
      </table>
      </div>
    ) : null}
    </div>
  );
}

export default UsersPage;
