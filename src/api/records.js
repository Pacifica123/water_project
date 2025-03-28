import axios from 'axios';

import {fetchSingleTableData } from "./fetch_records.js";

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/*export const fetchRecords = async () => {
  const response = await axios.get(`${API_BASE_URL}/records`);
  return response.data.records;
};

export const createRecord = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/records`, data);
  return response.data;
};*/


const fetchWaterObjects = async (role) => {
  try {
    if (role === "REPORT_ADMIN") {
      // Для REPORT_ADMIN возвращаем все точки забора
      return await fetchSingleTableData('water_point');
    } else if (role === "EMPLOYEE") {
      // 1. Get organization ID
      const orgData = JSON.parse(localStorage.getItem("org"));
      const orgId = orgData?.id;
      if (!orgId) throw new Error("Organization ID not found in user data");

      // 2. Fetch all water points
      const allWaterPoints = await fetchSingleTableData('water_point');

      // 3. Filter water points by organization
      const orgWaterPoints = allWaterPoints.filter(
        point => point.organisation_id?.id?.toString() === orgId.toString()
      );

      return orgWaterPoints;
    } else {
      throw new Error("Unsupported role");
    }
  } catch (error) {
    console.error("Error fetching water points:", error);
    throw error;
  }
};


// export default fetchWaterObjects;

const sendQuarterData = async (waterObjectCode, quarter, data) => {
  const token = localStorage.getItem('jwtToken');


  try {
    let send_form = 'send_quarter';
    console.log(waterObjectCode);
    const response = await axios.post(`${API_BASE_URL}/send_form`, {
      waterObjectCode,
      quarter,
      data,
      send_form
    }, {
      headers: {
        'tokenJWTAuthorization': token // Передаем токен в заголовке
      },
      withCredentials: true
    });

    return response.data; // Возвращаем данные ответа
  } catch (error) {
    throw new Error("Ошибка при отправке данных: " + error.message);
  }
};

export {sendQuarterData, fetchWaterObjects};
