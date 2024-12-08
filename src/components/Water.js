import React, { useState } from "react";

const Water = () => {
  const orgData = localStorage.getItem("org");
  let orgInfo = {}; // Инициализируем orgInfo как пустой объект

  if (orgData) {
    try {
      orgInfo = JSON.parse(orgData); // Пытаемся разобрать данные
    } catch (error) {
      console.error("Ошибка парсинга org:", error);
      orgInfo = {}; // Устанавливаем пустой объект в случае ошибки
    }
  }
  const [currentStep, setCurrentStep] = useState(1);
    
  const hadleSubmit = () => {
    alert("Форма отправленая!")
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="water-container">
      <div className="form-container">
        {currentStep === 1 && (
          <div className="form-step">
            <h2>Журнал учета водопотребления</h2>
            <div className="input-group">
              <label>
                Наименование организации:
               { " "+orgInfo.organisation_name || 'Без организации'}
              </label>
            </div>
            <div className="input-group">
              <label>
                Наименование организации (забор воды):
                <select>
                  <option value="">Выбрать организацию</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="form-step">
            <h2>Пункт учета забора воды</h2>
            <div className="input-group">
              <label>
                Наименование пункта учета:
                <select>
                  <option value="">Выбрать пункт учета</option>
                </select>
              </label>
            </div>
            <div className="input-group">
              <label>
                Координаты пункта:
                <input type="text" placeholder="54°20′0″N 37°30′0″E" />
              </label>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="form-step">
            <h2>Приборы учета</h2>
            <div className="input-group">
              <label>
                Наименование прибора:
                <select>
                  <option value="">Выбрать прибор</option>
                </select>
              </label>
            </div>
            <div className="input-group">
              <label>
                Наименование водоисточника:
                <select>
                  <option value="">Выбрать водоисточник</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="form-step">
            <h2>Данные измерений</h2>
            <table>
              <thead>
                <tr>
                  <th>Дата измерения</th>
                  <th>Измерительный прибор №1</th>
                  <th>Время работы (сут.)</th>
                  <th>Расход воды (м³/сут.)</th>
                  <th>Подпись</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><input type="date" /></td>
                  <td><input type="text" /></td>
                  <td><input type="number" /></td>
                  <td><input type="number" /></td>
                  <td><input type="text" /></td>
                  <td><button>Удалить</button></td>
                </tr>
              </tbody>
            </table>
            <button>Добавить строку</button>
          </div>
        )}

        <div className="navigation-buttons">
          {currentStep > 1 && (
          <button onClick={handlePreviousStep}>
            Назад
          </button>
          )}
          {currentStep < 4 && (
          <button onClick={handleNextStep}>
            Далее
          </button>
          )}
          {currentStep > 3 && (
          <button onClick={hadleSubmit} >
            отправить
          </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Water;
