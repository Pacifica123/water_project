import React, { useEffect, useState } from "react";
import { getFiles, downloadFile } from "../api/fetch_files";
import "../css/FileSectionsPage.css";

const FILE_TYPES = [
  { label: "Скан разрешения", type: "PERMISSION_SCAN" },
  { label: "Месячное закрытие", type: "MONTH_CLOSURE_SCAN" },
  { label: "Эл.подпись", type: "SIGNATURE" }
];

const FileSectionsPage = () => {
  const org = JSON.parse(localStorage.getItem("org") || "{}");
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      const all = [];
      for (const type of FILE_TYPES) {
        const res = await getFiles(undefined, undefined, type.type);
        if (!res) continue;

        // Если res — объект с file_id и file_url, преврати его в массив из одного элемента
        const filesArray = Array.isArray(res.data) ? res.data : [res.data];

        // sigRes — аналогично, если нужен
        const sigRes = await getFiles(undefined, undefined, `${type.type}`);
        const sigMap = (Array.isArray(sigRes) ? sigRes : [sigRes]).reduce((acc, f) => {
          acc[f.original_filename || f.filename] = f;
          return acc;
        }, {});

        filesArray.forEach(file => {
          console.log('file:', file);
          if (!file || (!file.filename && !file.file_id && !file.id)) return; // пропускаем пустые
          all.push({
            ...file,
            type: type.label, // чтобы фильтр работал
            sigFile: file.filename ? (sigMap[file.filename] || null) : null,
            date: file.upload_date || file.created_at || "-",
            url: file.file_url || `http://127.0.0.1:5000/api/download_file?file_id=${file.file_id || file.id}`,
          });
        });

      }

      
      setFiles(all);
      setFilteredFiles(all);
      setLoading(false);
    };
    loadFiles();
  }, [org.id]);

  useEffect(() => {
    const filtered = files.filter(f =>
      (!typeFilter || f.fileType === typeFilter) &&
      (!dateFilter || f.date?.startsWith(dateFilter))
    );
    setFilteredFiles(filtered);
  }, [typeFilter, dateFilter, files]);

  const handleDownload = (url, name) => {
    downloadFile(url, name);
  };

  return (
    <div className="file-sections">
      <h2>Файлы организации: {org.organisation_name}</h2>

      <div className="filters">
        <label>
          Тип файла:
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Все</option>
            {FILE_TYPES.map(t => (
              <option key={t.type} value={t.label}>{t.label}</option>
            ))}
          </select>
        </label>

        <label>
          Дата загрузки:
          <input
            type="Date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : filteredFiles.length === 0 ? (
        <p>Файлы не найдены</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Тип</th>
              <th>Имя файла</th>
              <th>Дата</th>
              <th>Файл</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((f, i) => (
              <tr key={i}>
                <td>{f.type}</td>
                <td>{f.filename}</td>
                <td>{f.date?.slice(0, 10)}</td>
                <td>
                  <button onClick={() => handleDownload(f.url, f.filename)}>📥 Скачать</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FileSectionsPage;
