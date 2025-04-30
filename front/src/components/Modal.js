import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Modal = ({ children, onClose }) => {
    const [error, setError] = useState(null);

    // Если на странице существует контейнер для модальных окон, используем его, иначе document.body
    const modalRoot = document.getElementById("modal-root") || document.body;

    // Обработчик для закрытия модального окна по нажатию клавиши Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Остановка всплытия клика внутри контента модального окна, чтобы клик по контенту не закрывал окно
    const handleContentClick = (e) => {
        e.stopPropagation();
    };

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={handleContentClick}>
        <button className="modal-close" onClick={onClose}>
        ×
        </button>
        {children}
        </div>
        </div>,
        modalRoot
    );
};

export default Modal;
