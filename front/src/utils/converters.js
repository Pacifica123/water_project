const convertToDMS = (decimal) => {
  const deg = Math.floor(decimal);
  const minFloat = (decimal - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return { deg, min, sec };
};

const parseDMS = (dmsString) => {
  const re = /(\d+)°(\d+)′(\d+)″/;
  const m = dmsString.match(re);
  if (!m) return { deg: "", min: "", sec: "" };
  return { deg: m[1], min: m[2], sec: m[3] };
};

const isoToRu = iso => {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
};


// Форматируем дату для отображения "дд.мм.гггг"
const formatDate = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date)) return isoString;
  return date.toLocaleDateString("ru-RU");
};



export {convertToDMS, parseDMS, isoToRu, formatDate}
