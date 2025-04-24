import React, { useState, useEffect } from "react";
import { fetchFile } from "../api/fetch_files";
import { deleteFile } from "../api/add_files";

const FileUpload = ({
    label,
    accept,
    icon,
    entityType,
    entityId,
    fileType,
    preview = false,
    onUpload,
}) => {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState(null); // Добавляем состояние для имени файла
    const [fileUrl, setFileUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        // При монтировании компонента проверяем, есть ли файл на сервере
        const checkExistingFile = async () => {
            const fileInfo = await fetchFile(entityType, entityId, fileType);
            if (fileInfo) {
                setFileUrl(fileInfo.fileUrl);
                setFileName(fileInfo.fileName); // Сохраняем имя файла из ответа сервера
            }
        };
        checkExistingFile();
    }, [entityType, entityId, fileType]);

    const handleChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setFileName(selectedFile.name); // Сохраняем имя файла
        if (onUpload && selectedFile) {
            onUpload(selectedFile, { entityType, entityId, fileType });
        }
    };

    const handleDelete = async () => {
        if (fileUrl && fileName) { // Используем сохраненное имя файла
            const success = await deleteFile(entityType, entityId, fileType, fileName);
            if (success) {
                setFileUrl(null);
                setFileName(null); // Очищаем имя файла
                setFile(null); // Очищаем состояние файла
            }
        }
    };

    return (
        <div className="file-upload">
        <label>{label}</label>
        <input type="file" accept={accept} onChange={handleChange} />

        {fileUrl ? (
            <div className="file-info">
            <span
            onClick={() => preview && setShowPreview(true)}
            style={{ cursor: preview ? "pointer" : "default" }}
            title={preview ? "Просмотреть файл" : ""}
            >
            {icon}
            </span>
            <span>{fileName}</span> {/* Используем сохраненное имя файла */}
            <button onClick={handleDelete}>Удалить</button>
            </div>
        ) : file ? (
            <div className="file-info">
            <span>{file.name}</span>
            </div>
        ) : null}

        {showPreview && preview && file && (
            <div
            className="modal"
            onClick={() => setShowPreview(false)}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.7)",
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            zIndex: 1000,
            }}
            >
            <div
            style={{
                background: "#fff",
                padding: 20,
                maxWidth: "90vw",
                maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
            >
            <button onClick={() => setShowPreview(false)}>Закрыть</button>
            <iframe
            src={URL.createObjectURL(file)}
            width="600px"
            height="800px"
            title="Preview"
            style={{ border: "none" }}
            />
            </div>
            </div>
        )}
        </div>
    );
};

export default FileUpload;
