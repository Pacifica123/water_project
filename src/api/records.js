import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const fetchRecords = async () => {
  const response = await axios.get(`${API_BASE_URL}/records`);
  return response.data.records;
};

export const createRecord = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/records`, data);
  return response.data;
};
