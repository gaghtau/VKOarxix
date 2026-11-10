"""Parse the customer's 'Календарь памятных дат' text (RU+KZ) into JSON pairs."""
import json, re, sys
src, out = sys.argv[1], sys.argv[2]
lines = [l.strip() for l in open(src, encoding='utf8') if l.strip()]
kz_start = next(i for i, l in enumerate(lines) if 'күнтізбесі' in l)
def pairs(block):
    block = [l for l in block if not re.fullmatch(r'2026 (год|жыл)', l) and 'Календарь' not in l and 'на 2026' not in l and 'күнтізбесі' not in l]
    return [(block[i], block[i + 1]) for i in range(0, len(block) - 1, 2)]
ru, kz = pairs(lines[:kz_start]), pairs(lines[kz_start:])
items = []
for i, (d, t) in enumerate(ru):
    kd, kt = kz[i] if i < len(kz) else (d, t)
    items.append({"date": {"ru": d, "kz": kd}, "text": {"ru": t, "kz": kt}})
json.dump({"year": 2026, "source": "Календарь юбилейных и памятных дат ВКО на 2026 год (материалы заказчика)", "items": items}, open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(ru), len(kz))
