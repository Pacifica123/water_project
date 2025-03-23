// import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL_STRUCT = "http://127.0.0.1:5000/api/get_struct";
const API_URL_SINGLE = "http://127.0.0.1:5000/api/edit_reference";
// const API_URL_SCHEMA = "http://127.0.0.1:5000/api/get_schema"; TODO


// const fetchModelSchema = ... TODO

/**
 * Универсальная функция для получения данных структуры из API.
 * @param {string} structName - Имя структуры для запроса.
 * @param {object} filters - Объект с фильтрами для запроса (ключ: значение).
 * @param {string} token - JWT токен для авторизации (опционально).
 * @returns {Promise<object>} - Промис, разрешающийся в данные структуры или отклоняющийся с ошибкой.
 */
const fetchStructureData = async (structName, filters = {}, token = null) => {
    try {
        const params = {
            struct_name: structName,
            ...Object.entries(filters).reduce((acc, [key, value]) => {
                acc[`filter_k`] = key;
                acc[`filter_v`] = value;
                return acc;
            }, {})
        };
        const token = localStorage.getItem('jwtToken');
        const headers = token ? { 'tokenJWTAuthorization': token } : {};

        const response = await axios.get(API_URL_STRUCT, {
            params: params,
            headers: headers,
            withCredentials: true
        });

        if (response.status >= 400) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = response.data;

        console.log(JSON.stringify(data, null, 4));

        if (data.status !== "success") {
            throw new Error(`API Error: ${data.error}`);
        }

        console.log("Данные успешно получены:");

        return data;
    } catch (error) {
        console.error("Ошибка при получении структуры:", error);
        console.log("Структура была:", structName);
        throw error; // Пробрасываем ошибку дальше
    }
};

// export default fetchStructureData;

// Пример использования:
// 1. Импортировать функцию в ваш компонент:
//    import fetchStructureData from './path/to/fetchStructureData';

// 2. Вызвать функцию, передав необходимые параметры:
//    const fetchData = async () => {
//      try {
//        const data = await fetchStructureData(
//          'point_consumption',
//          { organisation_id: '2' },
//          localStorage.getItem('jwtToken')
//        );
//        // Обработайте полученные данные
//        console.log(data);
//      } catch (error) {
//        // Обработайте ошибку
//        console.error(error);
//      }
//    };

//    fetchData();

const fetchSingleTableData = async (tableName) => {
    try {
        const token = localStorage.getItem('jwtToken');
        console.log(tableName);
        const headers = token ? { 'tokenJWTAuthorization': token } : {};
        const response = await axios.get(API_URL_SINGLE, {
            headers: headers,
            params: { reference_select: tableName },
            withCredentials: true
        });
        // console.log(response);

        if (response.status >= 400) {
            console.log("Ошибка HTTP: ", response);
            return null;
        }

        const data = response.data;
        const records = data.new_content;

        console.log(" --> Сейчас будет - ", data.selected_reference)
        console.log(records);

        if (!records || records.length === 0) {
            console.log("Нет записей в таблице");
            return null;
        }

        return records;
    } catch (error) {
        console.log("Ошибка при получении данных таблицы:", error.message);
        return null;
    }
};

export {fetchStructureData, fetchSingleTableData};
