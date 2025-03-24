import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Универсальная функция для отправки данных формы на бэкенд.
 *
 * @param {string} formName - Название формы, которую нужно отправить (например, 'send_quarter', 'add_user', и т.д.).
 * @param {object} data - Объект с данными формы для отправки.
 * @param {object} [config] - Дополнительные параметры конфигурации, включая waterObjectCode и другие необходимые данные.
 * @returns {Promise<any>} - Промис, который разрешается с данными ответа или отклоняется с ошибкой.
 * @throws {Error} - Выбрасывает ошибку при проблемах с отправкой данных.
 */
const sendFormData = async (formName, data, config = {}) => {
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await axios.post(`${API_BASE_URL}/send_form`, {
            ...config, // Добавляем дополнительные параметры конфигурации
            ...data, // Добавляем данные формы
            send_form: formName // Указываем название формы
        }, {
            headers: {
                'tokenJWTAuthorization': token
            },
            withCredentials: true
        });

        return response.data; // Возвращаем данные ответа
    } catch (error) {
        console.error("Ошибка при отправке данных:", error);
        throw new Error(`Ошибка при отправке данных формы "${formName}": ${error.message}`);
    }
};

const sendSingleData = async (tableName, data, config = {}) => {
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await axios.post(`${API_BASE_URL}/records/${tableName}`, {
            ...data // Добавляем данные формы
        }, {
            headers: {
                'tokenJWTAuthorization': token
            },
            withCredentials: true
        });

        return response.data; // Возвращаем данные ответа
    } catch (error) {
        console.error("Ошибка при отправке данных:", error);
        throw new Error(`Ошибка при отправке данных формы "${tableName}": ${error.message}`);
    }
};


const sendUpdateData = async (tableName, recordId, data, config = {}) => {
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await axios.put(`${API_BASE_URL}/records/${tableName}/${recordId}`, {
            ...data // Добавляем данные формы
        }, {
            headers: {
                'tokenJWTAuthorization': token
            },
            withCredentials: true
        });

        return response.data; // Возвращаем данные ответа
    } catch (error) {
        console.error("Ошибка при отправке данных для обновления:", error);
        throw new Error(`Ошибка при отправке данных формы "${tableName}" для записи с ID ${recordId}: ${error.message}`);
    }
};


const sendDeleteData = async (tableName, recordId, config = {}) => {
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await axios.delete(`${API_BASE_URL}/records/${tableName}/${recordId}`, {
            headers: {
                'tokenJWTAuthorization': token
            },
            withCredentials: true
        });

        return response.data; // Возвращаем данные ответа
    } catch (error) {
        console.error("Ошибка при отправке данных для удаления:", error);
        throw new Error(`Ошибка при отправке запроса на удаление "${tableName}" для записи с ID ${recordId}: ${error.message}`);
    }
};


export {sendFormData, sendSingleData, sendUpdateData, sendDeleteData };
