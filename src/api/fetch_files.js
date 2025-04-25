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

// const downloadFile = async (fileUrl, token, filename) => {
//     try {
//         const response = await axios.get(fileUrl, {
//             responseType: 'blob', // Важно для скачивания файлов
//             headers: {
//                 tokenJWTAuthorization: token, // Передаем токен в заголовке
//             },
//         });
//
//         // Создаем ссылку для скачивания
//         const url = window.URL.createObjectURL(new Blob([response.data]));
//         const link = document.createElement('a');
//         link.href = url;
//         link.setAttribute('download', filename); // Указываем имя файла
//         document.body.appendChild(link);
//         link.click();
//     } catch (error) {
//         console.error("Ошибка при скачивании файла:", error);
//     }
// };

const fetchFile = async (entityType, entityId, fileType) => {
    const token = localStorage.getItem("jwtToken");

    try {
        const response = await fetch(
            API_URL+`/files?entity_type=${entityType}&entity_id=${entityId}&file_type=${fileType}`,
            {
                method: "GET",
                headers: {
                    tokenJWTAuthorization: token,
                },
            }
        );
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            return data|| null; // Возвращаем URL файла или null, если файла нет
        } else if (response.status === 404) {
            return null; // Файл не найден
        } else {
            throw new Error("Ошибка при проверке наличия файла");
        }
    } catch (error) {
        console.error(error);
        return null; // В случае ошибки возвращаем null
    }
};


const downloadFile = async (fileUrl, fileName, token) => {
    try {
        const response = await fetch(fileUrl, {
            headers: {
                'tokenJWTAuthorization': token,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a); // append the element to the dom
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a); //remove the element after download
    } catch (error) {
        console.error('Download error:', error);
        // Здесь можно добавить логику обработки ошибок, например, отображение уведомления пользователю.
    }
};

export { getFiles, downloadFile, fetchFile };
