const TECH_FIELDS = [
    "created_at", "created_by", "updated_at", "updated_by",
"deleted_at", "deleted_by", "is_deleted", "id"
];

function collectStringFields(obj, depth = 0) {
    if (depth > 2) return []; // чтобы не уходить слишком глубоко

    let result = [];
    for (const [key, value] of Object.entries(obj)) {
        if (TECH_FIELDS.includes(key)) continue;
        if (typeof value === "string" && value.trim() !== "") {
            result.push(value);
        } else if (typeof value === "object" && value !== null) {
            // Рекурсивно ищем строки во вложенных объектах
            result = result.concat(collectStringFields(value, depth + 1));
        }
    }
    return result;
}

const getStringFieldsLabel = (item) => {
    const strings = collectStringFields(item);
    if (strings.length === 0) return String(item.id);
    return strings.join(", ");
};


export {getStringFieldsLabel}
