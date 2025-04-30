import React, { createContext, useState, useContext } from "react";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [editMessage, setEditMessage] = useState(null); // ✏️ добавлено

    const showSuccess = (message = "✅ Данные успешно отправлены!") => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    const showError = (message = "❌ Данные не отправлены") => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    const showEdit = (message = "✏️ Данные успешно обновлены!") => {
        setEditMessage(message);
        setTimeout(() => setEditMessage(null), 5000);
    };

    return (
        <NotificationContext.Provider value={{ showSuccess, showError, showEdit }}>
        {children}
        {successMessage && <div className="custom-alert">{successMessage}</div>}
        {editMessage && <div className="custom-alert-edit">{editMessage}</div>}
        {errorMessage && <div className="custom-alert-error">{errorMessage}</div>}
        </NotificationContext.Provider>
    );
};
