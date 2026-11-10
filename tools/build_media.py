"""Готовит изображения: сжатие (<=1600 px, JPEG q82) + миниатюры и манифест источников.
Сайт: public/img/site (открытые иллюстрации). Каталог: storage/catalog (выдаются только через API с проверкой доступа).
Запуск: python -I tools/build_media.py"""
import json, re, sys, os, html
from PIL import Image, ImageOps

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = os.path.join(ROOT, 'materials', 'old-site')
COM = os.path.join(ROOT, 'materials', 'commons')
SITE = os.path.join(ROOT, 'public', 'img', 'site')
CAT = os.path.join(ROOT, 'storage', 'catalog')
OLD_PAGE = 'http://e-arhiv.vko.gov.kz/ru/Page/Index/'
ARCH = 'Государственный архив ВКО (e-arhiv.vko.gov.kz)'
os.makedirs(SITE, exist_ok=True)
os.makedirs(CAT, exist_ok=True)


def save(src, out_dir, key):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    big = im.copy()
    big.thumbnail((1600, 1600))
    big.save(os.path.join(out_dir, key + '.jpg'), quality=82, optimize=True, progressive=True)
    t = im.copy()
    t.thumbnail((520, 520))
    t.save(os.path.join(out_dir, key + '_t.jpg'), quality=78, optimize=True)
    return big.size


media = {}


def site_old(key, h, title, page, kind='archive'):
    f = next(x for x in os.listdir(OLD) if x.startswith(h))
    w, hh = save(os.path.join(OLD, f), SITE, key)
    media[key] = {'url': f'/img/site/{key}.jpg', 'thumb': f'/img/site/{key}_t.jpg', 'w': w, 'h': hh, 'title': title,
                  'source': ARCH, 'sourceUrl': OLD_PAGE + str(page),
                  'license': 'Материалы официального сайта архива', 'kind': kind}


coms = {m['file'][:10]: m for m in json.load(open(os.path.join(COM, '_sources.json'), encoding='utf8'))}


def site_com(key, h, title, kind='open'):
    m = coms[h]
    w, hh = save(os.path.join(COM, m['file']), SITE, key)
    artist = re.sub(r'Unknown author\s*', '', m['artist']).strip() or 'автор неизвестен'
    media[key] = {'url': f'/img/site/{key}.jpg', 'thumb': f'/img/site/{key}_t.jpg', 'w': w, 'h': hh, 'title': title,
                  'source': f'Wikimedia Commons · {artist}', 'sourceUrl': m['page'], 'license': m['license'],
                  'date': re.sub(r'date QS.*|\s*\d\d:\d\d(:\d\d)?$', '', m['date']).strip(), 'kind': kind}


# --- Фото архива (официальный сайт)
site_old('building', '25c87bd0f6', 'Здание Государственного архива ВКО, ул. Бейбітшілік (Головкова), 26/1', 1330)
site_old('building-1991', '53017e621a', 'Здание архива по ул. Головкова, 26/1 (передано архиву в 1991 г.)', 1599)
site_old('building-krylova', '272357fd6c', 'Здание архива по ул. Крылова, 39 (до 1991 г.)', 1599)
site_old('building-3', '7416b15c0b', 'Архивное здание (из публикации «Госархив ВКО за 20 лет Независимости»)', 1599)
site_old('reading-1', '6761a892bb', 'Читальный зал архива', 1338)
site_old('reading-2', '04ae24de85', 'Исследователь в читальном зале', 1338)
site_old('reading-3', 'ecc909926e', 'Работа с микрофильмами в читальном зале', 1338)
site_old('reading-4', '68d9a3a94a', 'Мультимедийная презентация в читальном зале', 1338)
site_old('exhibition-astana', '989d7dd9ec', 'Выставка архивных документов', 1599)
site_old('visitors-1', 'e4276e16b1', 'Работа с посетителями архива', 1599)
site_old('visitors-2', '45cc86769b', 'Посетители в читальном зале', 1599)
site_old('publications', '67059eb589', 'Издания Государственного архива ВКО', 1599)
site_old('storage', '2b558bb148', 'Архивохранилище', 1593)
site_old('exhibition-2', 'e602af7231', 'Выставка изданий архива', 1594)
site_old('region-map', 'd110ba6b89', 'Карта Восточно-Казахстанской области', 1354)
site_old('flag', 'baa650636a', 'Государственный Флаг Республики Казахстан', 42569, 'symbol')
site_old('emblem', '96b5c25f67', 'Государственный Герб Республики Казахстан', 42569, 'symbol')
site_old('repressions', '1ee17f8130', 'Выставка «Информация о не реабилитированных лицах…»', 42541)
for key, h, name, page in [
    ('staff-kostina', '2edb28', 'Костина Елена Валерьевна', 1382),
    ('staff-uvalzhanova', '73f72e', 'Увальжанова Кульмира Оспановна', 1384),
    ('staff-baelova', '86cf28', 'Баелова Альмира Тугельбаевна', 1388),
    ('staff-shustova', '146c96', 'Шустова Татьяна Владимировна', 1392),
    ('staff-bekniyazkyzy', '11d3d7', 'Бекниязқызы Жангуль', 1400),
]:
    site_old(key, h, name, page, 'staff')

# --- Открытые источники (Wikimedia Commons)
site_com('uk-1891', 'b3c1cbc609', 'Город Усть-Каменогорск. Гравюра из книги Дж. Кеннана «Сибирь и ссылка», 1891', 'history')
site_com('map-1768', 'ce3676348a', 'Карта Колывано-Кузнецкой линии, 1768 г.', 'history')
site_com('zaisan-1875', '3ec78a9c3d', 'Зайсанский пост, 1875 г. Фото А. Н. Боярского', 'history')
site_com('zhemini-1875', '0c95195705', 'Ущелье близ Зайсанского поста, 1875 г. Фото А. Н. Боярского', 'history')
site_com('uk-hpp', '79ff53c507', 'Усть-Каменогорская ГЭС', 'open')
site_com('uk-hpp-2', '8b78cbedd7', 'Плотина Усть-Каменогорской ГЭС', 'open')
site_com('bukhtarma-hpp', '5fd037d18f', 'Бухтарминская ГЭС', 'open')
site_com('bukhtarma-sea', 'aee86d5fbf', 'Бухтарминское водохранилище', 'open')
site_com('uk-irtysh', '3b8f563fb1', 'Иртыш в Усть-Каменогорске', 'open')
site_com('uk-panorama', 'a2ae49d1d4', 'Панорама Усть-Каменогорска', 'open')
site_com('uk-ulba', '3e2bceaee3', 'Река Ульба в Усть-Каменогорске', 'open')
site_com('uk-beibitshilik', '0f75cf075c', 'Историческое здание на ул. Бейбітшілік, Усть-Каменогорск', 'open')
site_com('uk-ethnopark', 'ea2b4d8db0', 'Дом в этнопарке им. Касыма Кайсенова, Усть-Каменогорск', 'open')
site_com('uk-gorky', 'ef41924b67', 'Историческое здание на ул. Горького, Усть-Каменогорск', 'open')
site_com('uk-theatre', '0b8617e886', 'Восточно-Казахстанский драматический театр', 'open')
site_com('uk-strelka', '5f7fc6167d', 'Стела на Стрелке, Усть-Каменогорск', 'open')
site_com('ridder', 'd18c70b0c7', 'Риддер', 'open')
site_com('ridder-coa', '3d27df738e', 'Герб города Риддер', 'open')
site_com('zyryanovsk', '8cad239a81', 'Зыряновск (г. Алтай)', 'open')
site_com('zaisan-lake', '7ac83f19d1', 'Озеро Зайсан', 'open')
site_com('markakol', '451330ecee', 'Озеро Маркаколь', 'open')
site_com('katon', 'fe71596c6b', 'Катон-Карагайский национальный парк', 'open')

# --- Каталог: личные фонды (описания и фото со страниц официального сайта)
funds = json.load(open(os.path.join(OLD, 'funds', '_funds.json'), encoding='utf8'))
NOISE = re.compile(r'(Государственные Символы РК|Какой раздел сайта|Архив опросов).*', re.S)
out = []
for idx, f in enumerate(funds):
    cip = ' '.join(f['ciphers'])
    name = f['names'][0].replace('  ', ' ').strip().rstrip('.,')
    if not cip.startswith('ГАВКО'):
        continue
    m = re.search(r'ф\.\s*(\d+)\s*,\s*(?:оп\.|опись)\s*([\d]+)', cip)
    fund_no = m.group(1) if m else re.search(r'ф\.\s*(\d+)', cip).group(1)
    inv = m.group(2) if m else '1'
    if name.startswith('ЧИЖИКОВ'):
        inv = '5'  # на странице фонда: ф.1466, оп.5
    units = re.search(r'(\d+)\s*ед\.?\s*хр', cip)
    rest = re.sub(r'ф\.\s*\d+|оп\.\s*[\d\-, ]+|\d+\s*ед\.?\s*хр', ' ', cip)
    yrs = [int(y) for y in re.findall(r'(1[6-9]\d\d|20[0-2]\d)', rest)]
    text = NOISE.sub('', html.unescape(f['text'])).strip()
    k = text.find(' г.г.')
    if 0 <= k < 260:
        text = text[k + 5:].strip()
    if text.startswith('Государственный архив') or len(text) < 30:
        text = ''
    imgs = []
    for i, im in enumerate(f['images']):
        key = f'pf{idx:03d}-{i}'
        try:
            w, h = save(os.path.join(OLD, 'funds', im['file']), CAT, key)
        except Exception as e:
            print('skip', im, e)
            continue
        imgs.append({'key': key, 'w': w, 'h': h, 'src': im['src']})
    out.append({'name': name, 'fund_no': fund_no, 'inv': inv, 'units': int(units.group(1)) if units else None,
                'from': min(yrs) if yrs else None, 'to': max(yrs) if yrs else None, 'cipherText': cip,
                'text': text[:1400], 'page': f['page'], 'images': imgs})

json.dump(media, open(os.path.join(ROOT, 'server', 'data', 'media.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
json.dump(out, open(os.path.join(ROOT, 'server', 'data', 'personal_funds.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(media), 'site media;', len(out), 'funds;', sum(len(x['images']) for x in out), 'catalog images')
