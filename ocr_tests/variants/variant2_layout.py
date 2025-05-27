# variants/variant2_table.py

import fitz
import cv2
import numpy as np
import pytesseract
from collections import defaultdict
import os
os.environ['TESSDATA_PREFIX'] = '/usr/share/tessdata'

def render_page(pdf_path, page_no, dpi):
    doc = fitz.open(pdf_path)
    pix = doc[page_no].get_pixmap(dpi=dpi)
    arr = np.frombuffer(pix.samples, dtype=np.uint8)
    img = arr.reshape(pix.height, pix.width, pix.n)
    return img[..., :3] if img.shape[2] == 4 else img

def deskew_and_crop(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    coords = np.column_stack(np.where(gray < 255))
    angle = cv2.minAreaRect(coords)[-1]
    angle = -(angle + 90) if angle < -45 else -angle
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h),
                             flags=cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_REPLICATE)
    # обрезка по самому большому контуру
    gray2 = cv2.cvtColor(rotated, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray2, 0, 255,
                          cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(255-th, cv2.RETR_EXTERNAL,
                                   cv2.CHAIN_APPROX_SIMPLE)
    x,y,wc,hc = cv2.boundingRect(max(contours, key=cv2.contourArea))
    return rotated[y:y+hc, x:x+wc]

def preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        15, 10
    )

def cluster_coords(coords, tol):
    clusters = []
    for c in sorted(coords):
        for cl in clusters:
            if abs(cl[0] - c) <= tol:
                cl.append(c)
                break
        else:
            clusters.append([c])
    return [int(sum(cl)/len(cl)) for cl in clusters]

def process(pdf_path, pages, config):
    """
    config — это config.CONFIG из корня проекта,
    словарь с ключами 'DPI', 'LANGS', 'ROW_TOL', 'COL_TOL' и т.д.
    """
    results = []
    for page_no in pages:
        # 1) рендерим и нормализуем
        img = render_page(pdf_path, page_no, dpi=config['DPI'])
        img = deskew_and_crop(img)
        bin_img = preprocess(img)

        # 2) получаем данные от tesseract
        data = pytesseract.image_to_data(
            bin_img,
            output_type=pytesseract.Output.DICT,
            lang='+'.join(config['LANGS'])
        )

        # 3) собираем центры bbox
        x_centers, y_centers = [], []
        n = len(data['level'])
        for i in range(n):
            txt = data['text'][i].strip()
            if not txt:
                continue
            x, y, w, h = (data['left'][i], data['top'][i],
                          data['width'][i], data['height'][i])
            x_centers.append(x + w/2)
            y_centers.append(y + h/2)

        # 4) кластеризуем по строкам и колонкам
        rows = cluster_coords(y_centers, tol=config['ROW_TOL'])
        cols = cluster_coords(x_centers, tol=config['COL_TOL'])

        # 5) собираем слова в ячейки
        table = defaultdict(list)
        for i in range(n):
            txt = data['text'][i].strip()
            if not txt:
                continue
            x, y, w, h = (data['left'][i], data['top'][i],
                          data['width'][i], data['height'][i])
            xc, yc = x + w/2, y + h/2
            ridx = min(range(len(rows)), key=lambda j: abs(rows[j]-yc))
            cidx = min(range(len(cols)), key=lambda j: abs(cols[j]-xc))
            table[(ridx, cidx)].append((x, y, w, h, txt))

        # 6) финальные ячейки с bbox и чистым OCR
        for (r, c), words in sorted(table.items()):
            xs = [x for x,_,_,_,_ in words]
            ys = [y for _,y,_,_,_ in words]
            x0, y0 = min(xs), min(ys)
            x1 = max(x+w for x,_,w,_,_ in words)
            y1 = max(y+h for _,y,_,h,_ in words)
            cell_img = bin_img[y0:y1, x0:x1]

            # upscale для улучшения OCR
            cell_img = cv2.resize(cell_img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

            cell_data = pytesseract.image_to_data(
                cell_img,
                config='--psm 7',
                lang='+'.join(config['LANGS']),
                output_type=pytesseract.Output.DICT
            )

            texts = []
            for i, conf in enumerate(cell_data['conf']):
                if int(conf) > 50:
                    t = cell_data['text'][i].strip()
                    if t:
                        texts.append(t)
            text = " ".join(texts).strip()

            if text:  # добавляем только непустые ячейки
                results.append({
                    'page': page_no,
                    'row': r,
                    'col': c,
                    'bbox': [int(x0), int(y0), int(x1 - x0), int(y1 - y0)],
                    'text': text
                })


    return results
