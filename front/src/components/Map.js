import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { fetchStructDataWithFilters } from "../api/fetch_records";

const Container = styled.div`
  height: 88vh;
  display: flex;
  flex-direction: column;
  background: #f4f4f9;
  font-family: Arial, sans-serif;
  width: 162vh;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
`;

const MapContainer = styled.div`
  flex: 1;
  min-width: 300px;
  border-bottom: 2px solid #ddd;
`;

const MarkerList = styled.div`
  padding: 20px;
  background: #fff;
  overflow-y: auto;
  max-height: 100%;
  max-width: 800px;
  width: 100%;
  border-left: 2px solid #ddd;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
`;

const TableHeader = styled.th`
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  font-weight: bold;
  text-align: left;
  border-bottom: 2px solid #ddd;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #ddd;
  &:hover {
    background-color: #f8f8f8;
  }
`;

const TableCell = styled.td`
  padding: 12px;
  text-align: left;
  color: #333;
`;

const StatusBadge = styled.span`
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: bold;
  color: white;
  background: ${(props) =>
    props.status === "sent"
      ? "#4CAF50"
      : props.status === "processing"
      ? "#FFB900"
      : "#FF6347"};
  font-size: 12px;
  text-transform: capitalize;
`;

// URL вашего эндпоинта
const STRUCT_NAME = "getall_coord_points";

const DGisMap = ({ filters = {} }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]); // чтобы хранить экземпляры DG-маркеров
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Загружаем данные с бэка
useEffect(() => {
  let cancelled = false;
  async function loadData() {
    setLoading(true);
    const result = await fetchStructDataWithFilters(STRUCT_NAME, {});
    setLoading(false);
    if (!cancelled && result?.status === "success") {
      setMarkers(result.data);
    }
  }
  loadData();
  return () => { cancelled = true; };
}, []);  // <-- пустой массив зависимостей
  

  // 2. Инициализация карты
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const script = document.createElement("script");
    script.src = "https://maps.api.2gis.ru/2.0/loader.js?pkg=full";
    script.async = true;
    script.onload = () => {
      window.DG.then(initMap);
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // 3. После того как карта и данные готовы — рисуем маркеры
  useEffect(() => {
    if (!mapRef.current) return;

    // 3.1 Сначала очищаем старые
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 3.2 Рисуем новые
    markers.forEach(m => {
      const mk = addMarker(mapRef.current, m);
      markersRef.current.push(mk);
    });
  }, [markers]);

  const initMap = () => {
    const map = window.DG.map(mapContainer.current, {
      center: [55.35, 86.07],
      zoom: 9,
      scrollWheelZoom: true,
    });
    map.setMaxBounds([
      [53.5, 84.0],
      [56.5, 89.0],
    ]);
    map.on("click", handleMapClick);
    mapRef.current = map;
  };

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    const label = prompt("Введите название метки:");
    if (!label) return;

    const status = prompt("Введите статус (not_sent, processing, sent):", "not_sent");
    if (!["not_sent", "processing", "sent"].includes(status)) {
      alert("Некорректный статус!");
      return;
    }

    // Опционально: сохраняем на бэке, чтобы не терялись после перезагрузки
    // await savePoint({ latitude: lat, longitude: lng, label, status });

    const newMarker = { lat, lng, label, status };
    setMarkers(prev => [...prev, newMarker]);
  };

  const addMarker = (map, { lat, lng, label, status }) => {
    const statusColors = {
      not_sent: "#ff6347",
      processing: "#FFB900",
      sent: "#4CAF50",
    };
    const icon = window.DG.divIcon({
      className: "custom-icon",
      html: `<div style="
        background: ${statusColors[status]};
        color: #000;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      ">${label}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    return window.DG.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`${label} (${lat.toFixed(4)}, ${lng.toFixed(4)}) — ${getStatusText(status)}`);
  };

  const getStatusText = (status) => ({
    sent: "Отчет отправлен",
    in_progress: "В обработке",
    not_sent: "Не отправлен",
  }[status]);

  const handleMarkerClick = (lat, lng) => {
    mapRef.current?.setView([lat, lng], 12, { animate: true });
  };

  return (
    <Container>
      <ContentWrapper>
        <MapContainer ref={mapContainer} />
        <MarkerList>
          <h3>Список меток организаций {loading && "(загрузка...)"}</h3>
          <Table>
            <thead>
              <TableRow>
                <TableHeader>Название</TableHeader>
                <TableHeader>Координаты</TableHeader>
                <TableHeader>Статус</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {markers.map((m, i) => (
                <TableRow key={i} onClick={() => handleMarkerClick(m.lat, m.lng)}>
                  <TableCell>{m.label}</TableCell>
                  <TableCell>{`${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status}>{getStatusText(m.status)}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </MarkerList>
      </ContentWrapper>
    </Container>
  );
};

export default DGisMap;