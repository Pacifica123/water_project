// api/add_files.js
import axios from "axios";
const API_URL = "http://127.0.0.1:5000/api";

const uploadFile = async (file, entity_type, entity_id, file_type, description) => {

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entity_type);
    formData.append("entity_id", entity_id);
    formData.append("file_type", file_type);
    formData.append("description", description);

    try {
        const token = localStorage.getItem('jwtToken');
        const response = await axios.post(API_URL+"/upload_file", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                tokenJWTAuthorization: token,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Ошибка при загрузке файла:", error);
        return { status: error.response?.status || 500, message: error.message };
    }
};

const uploadFileToBackend = async (file, { entityType, entityId, fileType }) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("file_type", fileType);
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(API_URL+"/upload_file", {
            method: "POST",
            headers: {
                tokenJWTAuthorization: token, // Добавляем токен в заголовок
            },
            body: formData,
        });
        if (!response.ok) {
            throw new Error("Ошибка загрузки файла");
        }
        // Можно обработать ответ сервера, например, показать уведомление
    } catch (error) {
        console.error(error);
    }
};

const deleteFile = async (entityType, entityId, fileType, fileName) => {
    const token = localStorage.getItem("jwtToken");

    try {
        const response = await fetch(API_URL+"/files", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                tokenJWTAuthorization: token,
            },
            body: JSON.stringify({
                entity_type: entityType,
                entity_id: entityId,
                file_type: fileType,
                file_name: fileName,
            }),
        });

        if (!response.ok) {
            console.log(response);
            throw new Error("Ошибка при удалении файла: ");
        }
        return true; // Возвращаем true, если удаление прошло успешно
    } catch (error) {
        console.error(error);
        return false; // В случае ошибки возвращаем false
    }
};

export { uploadFile, uploadFileToBackend, deleteFile  };
