import React, { useState, useEffect } from "react";
import { fetchFile, downloadFile } from "../api/fetch_files";
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
    const handleDownload = () => {
        downloadFile(fileUrl, fileName);
    };
    const [isPdf, setIsPdf] = useState(false);
    const token = localStorage.getItem('jwtToken');
    // const authorizedFileUrl = ;
    useEffect(() => {
        // При монтировании компонента проверяем, есть ли файл на сервере
        const checkExistingFile = async () => {
            const fileInfo = await fetchFile(entityType, entityId, fileType);
            if (fileInfo) {
                setFileUrl(fileInfo.fileUrl);
                setFileName(fileInfo.fileName);
                setIsPdf(fileInfo.fileName?.toLowerCase().endsWith('.pdf'));
            }
        };
        checkExistingFile();
    }, [entityType, entityId, fileType]);

    const handleChange = async (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setIsPdf(selectedFile.name.toLowerCase().endsWith('.pdf'));
        if (onUpload && selectedFile) {
            await onUpload(selectedFile, { entityType, entityId, fileType });
            // Повторно получаем файл с сервера после загрузки
            const fileInfo = await fetchFile(entityType, entityId, fileType);
            if (fileInfo) {
                setFileUrl(fileInfo.fileUrl);
                setFileName(fileInfo.fileName);
                setIsPdf(fileInfo.fileName.toLowerCase().endsWith('.pdf'));
            }
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
        <label>{fileUrl ? 'Просмотр ' + label : 'Загрузить ' + label }</label>
        {!fileUrl && (
            <input type="file" accept={accept} onChange={handleChange} />
        )}
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
            <button className="delete-button" onClick={handleDelete}>Удалить</button>
            </div>
        ) : file ? (
            <div className="file-info">
            <span>{file.name}</span>
            </div>
        ) : null}
        {fileUrl && preview && (
            <button className="custom-button" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Закрыть" : 'Открыть файл'}
            </button>
        )}
        {showPreview && preview && (file || fileUrl) && (
            <div
            className="modal"
            onClick={() => setShowPreview(false)}
            >
            <div
            onClick={(e) => e.stopPropagation()}
            >

            </div>
            {isPdf ? (
                <iframe
                src={file ? URL.createObjectURL(file) : `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${token}`}
                width="900px"
                height="390vh"
                title="PDF Preview"
                style={{ position:"relative"}}
                />
            ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Предпросмотр недоступен для этого типа файла</p>
                {!isPdf && (
                    <button
                    onClick={handleDownload}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '20px'
                    }}
                    >
                    Скачать файл
                    </button>
                )}
                </div>
            )}
            </div>
        )}
        </div>
    );
};

export default FileUpload;
