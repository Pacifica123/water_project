# config.py

CONFIG = {
    # рендер PDF в растровое изображение
    'DPI': 300,

    # языки для OCR (EasyOCR/East, pytesseract и т.д.)
    'LANGS': ['rus', 'eng'],

    # параметры морфологии для variant1:
    # горизонтальный и вертикальный кернелы
    'MORPH_KERNEL': {'h': (40, 1), 'v': (1, 40)},

    # минимальная площадь ячейки для variant1
    'MIN_CELL_AREA': 1000,

    # допуски для кластеризации строк/столбцов в variant2
    'ROW_TOL': 50,
    'COL_TOL': 50,
}
