import React, { useEffect, useRef, useState, useMemo } from "react";
import styled from "styled-components";
import "../css/AccountingPost.css";
import { fetchStructDataWithFilters } from "../api/fetch_records";

const Container = styled.div`height: 88vh; display: flex; flex-direction: column; background: #f4f4f9; font-family: Arial, sans-serif; width: -moz-available;`;
const ContentWrapper = styled.div`display: flex; flex: 1; width: 100%;`;
const MapContainer = styled.div`flex: 1; widtn:200px;  min-width: 350px; border-bottom: 2px solid #ddd;`;
const MarkerList = styled.div` text-align: center; padding: 20px; background: #fff; overflow-y: auto; max-height: 100%; max-width: fit-content ; width: 725px; border-left: 2px solid #ddd; box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);`;

const Table = styled.table`width: fit-content;
border-collapse: collapse;
margin-top: 15px;
margin-left: 2px;
font-size: 28px;`;
const TableHeader = styled.th`padding: 12px; background-color: #4CAF50; color: white; font-weight: bold; border-bottom: 2px solid #ddd;`;
const TableRow = styled.tr`border-bottom: 1px solid #ddd; &:hover { background-color: #f8f8f8; }`;
const TableCell = styled.td`padding: 12px; text-align: center; color: #333;`;

const StatusBadge = styled.span`
padding: 6px 12px;
border-radius: 20px;
font-weight: bold;
color: white;
background: ${(props) =>
  props.status === "sent"
  ? "#4CAF50"
  : props.status === "in_progress"
  ? "#FFB900"
  : props.status === "not_sent"
  ? "#FF6347"
  : props.status === "closed"
  ? "#808080"
  : ""};

  text-transform: capitalize;
  `;

  const STRUCT_NAME = "getall_coord_points";

  const MONTH_ORDER = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
"июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
  ];

  const DGisMap = () => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [markers, setMarkers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [statusFilter, setStatusFilter] = useState("");
    const [orgFilter, setOrgFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");

    const getShortLabel = (label) => {
      const match = label.match(/\((.*?)\)/);
      if (match) {
        return match[1]; // если есть текст в скобках — используем его
      }

      return label
      .split(" ")                  // разбить на слова
      .filter(w => w.length > 0)   // убрать лишние пробелы
      .map(w => w[0].toUpperCase()) // взять первую букву и сделать её заглавной
      .join("");                   // соединить в строку
    };

    const getStatusText = (status) => ({
      sent: "Отчет отправлен",
      in_progress: "В процессе",
      not_sent: "Не отправлен",
      closed: "Закрыт"
    }[status]);

    const filteredMarkers = useMemo(() => {
      return markers
      .filter((m) => {
        const statusMatch = !statusFilter || m.status === statusFilter;
        const orgMatch = !orgFilter || m.label === orgFilter;
        const monthMatch = !monthFilter || m.month === monthFilter;
        return statusMatch && orgMatch && monthMatch;
      })
      .sort((a, b) => {
        return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month);
      });
    }, [markers, statusFilter, orgFilter, monthFilter]);

    const uniqueOrgs = useMemo(() => [...new Set(markers.map(m => m.label))], [markers]);
    const uniqueMonths = useMemo(() => [...new Set(markers.map(m => m.month))].sort(
      (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
    ), [markers]);

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
      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      if (!mapContainer.current || mapRef.current) return;
      const script = document.createElement("script");
      script.src = "https://maps.api.2gis.ru/2.0/loader.js?pkg=full";
      script.async = true;
      script.onload = () => window.DG.then(initMap);
      document.body.appendChild(script);
      return () => document.body.removeChild(script);
    }, []);

    useEffect(() => {
      if (!mapRef.current) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      filteredMarkers.forEach((m) => {
        const mk = addMarker(mapRef.current, m);
        markersRef.current.push(mk);
      });
    }, [filteredMarkers]);

    const initMap = () => {
      if (mapRef.current) return; // предотвратим повторную инициализацию
      const map = window.DG.map(mapContainer.current, {
        center: [55.35, 86.07],
        zoom: 9,
        scrollWheelZoom: true,
      });
      map.setMaxBounds([
        [53.5, 84.0],
        [56.5, 89.0],
      ]);
      mapRef.current = map;
    };

    const addMarker = (map, { lat, lng, label, status }) => {
      const statusColors = {
        not_sent: "#FF6347",
        in_progress: "#FFB900",
        sent: "#4CAF50",
        closed: "#808080",
      };
      const icon = window.DG.divIcon({
        className: "custom-icon",
        html: `<div style="
        background: ${statusColors[status] || "#ccc"};
        color: #000;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        ">${getShortLabel(label)}</div>`,
                                     iconSize: [40, 40],
                                     iconAnchor: [20, 20],
      });
      return window.DG.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`${label} (${lat.toFixed(4)}, ${lng.toFixed(4)}) — ${getStatusText(status)}`);
    };

    const handleMarkerClick = (lat, lng) => {
      mapRef.current?.setView([lat, lng], 12, { animate: true });
    };

    return (
      <Container>
      <ContentWrapper>
      <MapContainer ref={mapContainer} />
      <MarkerList>
      <h3>Список меток организаций {loading && "(загрузка...)"}</h3>
      <div className="filters-container">
      <div className="filter-block">
      <label>Организации</label>
      <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
      <option value="">Все организации</option>
      {uniqueOrgs.map((org, i) => (
        <option key={i} value={org}>{org}</option>
      ))}
      </select>
      </div>
      <div className="filter-block">
      <label>Статус</label>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
      <option value="">Все статусы</option>
      <option value="not_sent">Не отправлен</option>
      <option value="in_progress">В процессе</option>
      <option value="sent">Отправлен</option>
      <option value="closed">Закрыт</option>
      </select>
      </div>
      <div className="filter-block">
      <label>Месяц</label>
      <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
      <option value="">Все месяцы</option>
      {uniqueMonths.map((month, i) => (
        <option key={i} value={month}>{month}</option>
      ))}
      </select>
      </div>
      </div>
      <Table>
      <thead>
      <TableRow>
      <TableHeader>Название</TableHeader>
      <TableHeader>Координаты</TableHeader>
      <TableHeader>Месяц</TableHeader>
      <TableHeader>Статус</TableHeader>
      </TableRow>
      </thead>
      <tbody>
      {filteredMarkers.map((m, i) => (
        <TableRow key={i} onClick={() => handleMarkerClick(m.lat, m.lng)}>
        <TableCell>{getShortLabel(m.label)}</TableCell>
        <TableCell>{`${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`}</TableCell>
        <TableCell>{m.month}</TableCell>
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
