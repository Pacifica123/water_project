import React, { useEffect, useState } from "react";
import { getFiles, downloadFile } from "../api/fetch_files";
import { formatDate } from "../utils/converters";

const renderWaterLogTable = (records) => {
    console.log("[records in renderWaterLogTable]:", records);
    if (!Array.isArray(records)) return <p>Нет записей</p>;


    return (
        <table className="water-report-table">
        <thead>
        <tr>
        <th>Дата измерения</th>
        <th>Дней работы</th>
        <th>Расход воды (м³/сут)</th>
        <th>Показания счетчика</th>
        <th>Подпись</th>
        </tr>
        </thead>
        <tbody>
        {records.map((rec, idx) => (
            <tr key={idx}>
            <td>{formatDate(rec.measurement_date)}</td>
            <td>{rec.operating_time_days}</td>
            <td>{rec.water_consumption_m3_per_day}</td>
            <td>{rec.meter_readings}</td>
            <td>{rec.person_signature}</td>
            </tr>
        ))}
        </tbody>
        </table>
    );
};


const WaterlogCompleteNotification = ({ parsedContent }) => {
    console.log("parsedContent in WaterlogCompleteNotification: ", parsedContent.parsed)

    const [files, setFiles] = useState({ pdf: null, sig: null });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadFiles = async () => {
            setLoading(true);
            try {
                const { file_ids } = parsedContent.parsed;

                // Получаем pdf файл
                let pdfFile = null;
                if (file_ids?.pdf?.pdf_id) {
                    const pdfRes = await getFiles(
                        file_ids.pdf.entity_type,
                        file_ids.pdf.entity_id,
                        file_ids.pdf.file_type,
                        parsedContent.parsed.org_id
                    );
                    pdfFile = Array.isArray(pdfRes.data) ? pdfRes.data[0] : pdfRes.data;
                }

                // Получаем файл подписи
                let sigFile = null;
                if (file_ids?.sig?.sig_id) {
                    const sigRes = await getFiles(
                        file_ids.sig.entity_type,
                        file_ids.sig.entity_id,
                        file_ids.sig.file_type,
                        parsedContent.parsed.org_id
                    );
                    sigFile = Array.isArray(sigRes.data) ? sigRes.data[0] : sigRes.data;
                }

                setFiles({
                    pdf: pdfFile,
                    sig: sigFile,
                });
            } catch (error) {
                console.error("Ошибка загрузки файлов уведомления:", error);
            } finally {
                setLoading(false);
            }
        };

        loadFiles();
    }, [parsedContent]);

    const handleDownload = (file) => {
        if (!file) return;
        const url = file.file_url || `http://127.0.0.1:5000/api/download_file?file_id=${file.file_id || file.id}`;
        const name = file.filename || "file.pdf";
        downloadFile(url, name);
    };

    return (
        <div>
        <h3>{parsedContent.parsed.header}</h3>
        <p>
        Организация: <strong>{parsedContent.parsed.organisation_name}</strong><br />
        Водообъект: <strong>{parsedContent.parsed.water_object_code}</strong><br />
        Период: <strong>{parsedContent.parsed.month}.{parsedContent.parsed.year}</strong>
        </p>

        {/* Здесь вставь свою таблицу с записями */}
        {renderWaterLogTable(parsedContent.parsed.records)}

        <div className="file-download-buttons" style={{ marginTop: "1em" }}>
        {loading ? (
            <p>Загрузка файлов...</p>
        ) : (
            <>
            {files.pdf ? (
                <button onClick={() => handleDownload(files.pdf)}>📄 Скачать PDF</button>
            ) : (
                <p>PDF файл не найден</p>
            )}
            {files.sig ? (
                <button onClick={() => handleDownload(files.sig)}>✍️ Скачать подпись</button>
            ) : (
                <p>Файл подписи не найден</p>
            )}
            </>
        )}
        </div>
        </div>
    );
}

export {WaterlogCompleteNotification};
