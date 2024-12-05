import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/*export const fetchRecords = async () => {
  const response = await axios.get(`${API_BASE_URL}/records`);
  return response.data.records;
};

export const createRecord = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/records`, data);
  return response.data;
};*/


const fetchWaterObjects = async () => {
  try {
    const token = localStorage.getItem('jwtToken');
    console.log("токен - ", token);
    const response = await axios.get(`${API_BASE_URL}/edit_reference?reference_select=water_object_ref`, {
      headers: {
        'tokenJWTAuthorization': token // Передаем токен в заголовке
      },
      withCredentials: true

    });
    return response.data.new_content || [];
  } catch (error) {
    console.error("Ошибка при загрузке водных объектов:", error);
    throw error; // Пробрасываем ошибку дальше
  }
};

export default fetchWaterObjects;
