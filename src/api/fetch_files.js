// api/fetch_files.js
import axios from "axios";
const API_URL = "http://127.0.0.1:5000/api";

const getFiles = async (entity_type, entity_id, file_type) => {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await axios.get(API_URL+"/file_info", {
            headers: {
                tokenJWTAuthorization: token,
            },
            params: {
                entity_type: entity_type,
                entity_id: entity_id,
                file_type: file_type,
            },
        });
        return { ...response.data, token };
    } catch (error) {
        console.error("Ошибка при получении информации о файле:", error);
        return { status: error.response?.status || 500, message: error.message };
    }
};

const downloadFile = async (fileUrl, token, filename) => {
    try {
        const response = await axios.get(fileUrl, {
            responseType: 'blob', // Важно для скачивания файлов
            headers: {
                tokenJWTAuthorization: token, // Передаем токен в заголовке
            },
        });

        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename); // Указываем имя файла
        document.body.appendChild(link);
        link.click();
    } catch (error) {
        console.error("Ошибка при скачивании файла:", error);
    }
};

export { getFiles, downloadFile };
