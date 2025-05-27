import fitz       # PyMuPDF
import cv2
import numpy as np
import easyocr

# Здесь используем конфиг из config.py (импорт на усмотрение)
DPI = None      # возьмёт по default из config.CONFIG['DPI']
MORPH_H = None  # из config.CONFIG['MORPH_KERNEL']['h']
MORPH_V = None  # из config.CONFIG['MORPH_KERNEL']['v']
MIN_AREA = None # из config.CONFIG['MIN_CELL_AREA']


def render_page(pdf_path: str, page_num: int, dpi: int) -> np.ndarray:
    """Рендерит страницу PDF в BGR-изображение"""
    doc = fitz.open(pdf_path)
    pix = doc[page_num].get_pixmap(dpi=dpi)
    arr = np.frombuffer(pix.samples, dtype=np.uint8)
    img = arr.reshape(pix.height, pix.width, pix.n)
    if img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img


def extract_table_cells(img: np.ndarray, h_kernel: tuple, v_kernel: tuple, min_area: int) -> list:
    """Морфологический детектор ячеек таблицы"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    horiz = cv2.getStructuringElement(cv2.MORPH_RECT, h_kernel)
    vert  = cv2.getStructuringElement(cv2.MORPH_RECT, v_kernel)

    lines_h = cv2.morphologyEx(bw, cv2.MORPH_OPEN, horiz, iterations=2)
    lines_v = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vert, iterations=2)
    grid = cv2.add(lines_h, lines_v)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
    clean = cv2.morphologyEx(grid, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(clean, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    cells = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w*h >= min_area:
            cells.append((x, y, w, h))
    return sorted(cells, key=lambda r: (r[1], r[0]))


def apply_mask(img: np.ndarray, mask_path: str) -> list:
    """Загрузить и применить бинарную маску, вернуть ROI"""
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    _, bin_mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rois = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        rois.append((x, y, w, h))
    return sorted(rois, key=lambda r: (r[1], r[0]))


def run_ocr(img: np.ndarray, rois: list, langs: list) -> list:
    """OCR списка ROI через EasyOCR"""
    reader = easyocr.Reader(langs, gpu=False)
    results = []
    for (x, y, w, h) in rois:
        roi = img[y:y+h, x:x+w]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text = reader.readtext(bw, detail=0, paragraph=True)
        results.append({'bbox':[x,y,w,h], 'text':' '.join(text)})
    return results


def process(pdf_path: str, pages: list, config: dict) -> list:
    """
    Общий метод для run.py:
    - рендер страниц
    - выбор режима: морфология или маска (по ключу в config)
    - OCR
    - возврат списка результатов
    """
    dpi = config['DPI']
    h_kernel = config['MORPH_KERNEL']['h']
    v_kernel = config['MORPH_KERNEL']['v']
    min_area = config['MIN_CELL_AREA']

    results = []
    mode = 'morphology' if 'mask_dir' not in config else 'mask'

    for page in pages:
        img = render_page(pdf_path, page, dpi)

        if mode == 'morphology':
            rois = extract_table_cells(img, h_kernel, v_kernel, min_area)
        else:
            mask_path = config['mask_dir_template'].format(page=page)
            rois = apply_mask(img, mask_path)

        ocr_res = run_ocr(img, rois, config['LANGS'])
        for r in ocr_res:
            r['page'] = page
            results.append(r)
    return results
