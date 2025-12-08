export const validateAndCorrectDate = (dateString) => {
    const today = new Date();
    const minDate = new Date("1991-01-01");
    const maxDate = new Date("2100-12-31");

    if (!dateString) return today.toISOString().split("T")[0];

    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return today.toISOString().split("T")[0];

    if (parsedDate < minDate) return "1991-01-01";
    if (parsedDate > maxDate) return "2100-12-31";

    return parsedDate.toISOString().split("T")[0];
};

