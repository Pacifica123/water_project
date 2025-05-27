import argparse
import importlib
import json

from config import CONFIG


def parse_pages(pages_str):
    pages = []
    for part in pages_str.split(','):
        if '-' in part:
            a, b = map(int, part.split('-'))
            pages.extend(range(a, b+1))
        else:
            pages.append(int(part))
    return sorted(set(pages))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', required=True)
    parser.add_argument('--pages', default='0')
    parser.add_argument('--variant', required=True,
                        help='Имя модуля в папке variants, например variant1_mask')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    # Динамическая загрузка модуля-метода
    module = importlib.import_module(f'variants.{args.variant}')
    # Каждый модуль должен предоставлять функцию process(pdf_path, page_nums, config)

    results = module.process(
        pdf_path=args.pdf,
        pages=parse_pages(args.pages),
        config=CONFIG
    )

    # Сохраняем результат
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
