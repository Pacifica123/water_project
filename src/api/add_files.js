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

export { uploadFile };
