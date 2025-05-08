import React, { createContext, useState, useContext } from "react";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [editMessage, setEditMessage] = useState(null);

    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        message: "",
        onConfirm: null,
        onCancel: null,
    });

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

    const askConfirmation = (message = "Вы уверены, что хотите продолжить?") => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                onConfirm: () => {
                    resolve(true);
                    setConfirmState({ ...confirmState, isOpen: false });
                },
                onCancel: () => {
                    resolve(false);
                    setConfirmState({ ...confirmState, isOpen: false });
                },
            });
        });
    };

    return (
        <NotificationContext.Provider value={{ showSuccess, showError, showEdit, askConfirmation }}>

        {successMessage && <div className="custom-alert">{successMessage}</div>}
        {editMessage && <div className="custom-alert-edit">{editMessage}</div>}
        {errorMessage && <div className="custom-alert-error">{errorMessage}</div>}

        {confirmState.isOpen && (
            <div className="confirm-modal-overlay">
            <div className="confirm-modal">
            <p>{confirmState.message}</p>
            <div className="confirm-buttons">
            <button onClick={confirmState.onConfirm}>Да</button>
            <button onClick={confirmState.onCancel}>Нет</button>
            </div>
            </div>
            </div>

        )}
        {children}
        </NotificationContext.Provider>
    );
};
