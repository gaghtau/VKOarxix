// Интеллектуальные инструменты. Работают ЛОКАЛЬНО (без передачи данных внешним ИИ-поставщикам):
// разбор запроса на естественном языке (тема, период, тип, населённый пункт), словарь синонимов
// и вариантов написания (рус/каз/англ), ранжирование по открытым записям каталога,
// шаблонные ответы помощника с обязательной ссылкой на источник.

const KZ = { 'ә': 'а', 'ғ': 'г', 'қ': 'к', 'ң': 'н', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'һ': 'х', 'і': 'и', 'ё': 'е', 'й': 'и' };
export const norm = (s = '') => s.toLowerCase().replace(/[әғқңөұүһіёй]/g, (c) => KZ[c]).replace(/[«»"'.,!?():;\/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (w) => (w.length > 5 ? w.slice(0, Math.max(5, w.length - 3)) : w);

// Каноническое понятие → варианты (рус / каз / англ / старые названия)
const SYN = {
  'усть-каменогорск': ['усть-каменогорск', 'усть каменогорск', 'устькаменогорск', 'оскемен', 'өскемен', 'ust-kamenogorsk', 'ust kamenogorsk', 'oskemen'],
  'риддер': ['риддер', 'лениногорск', 'ridder', 'leninogorsk'],
  'алтай': ['зыряновск', 'зырян', 'алтай', 'altai', 'zyryanovsk'],
  'зайсан': ['зайсан', 'zaisan', 'zaysan'],
  'шемонаиха': ['шемонаиха', 'shemonaikha'],
  'катон-карагай': ['катон-карагай', 'катонкарагай', 'катон', 'katon-karagai', 'катонқарағай'],
  'серебрянск': ['серебрянск', 'бухтарма', 'бухтарминск', 'buktyrma', 'бұқтырма'],
  photo: ['фото', 'фотографи', 'фотодокумент', 'снимк', 'снимок', 'карточк', 'сурет', 'фотосурет', 'photo', 'photos', 'picture', 'image', 'фотки'],
  map: ['карта', 'карты', 'план', 'схема', 'чертеж', 'чертёж', 'map', 'maps', 'plan', 'карта-схема'],
  personal: ['личн', 'письм', 'дневник', 'воспомин', 'семь', 'жеке', 'хат', 'letter', 'diary', 'personal'],
  audio: ['аудио', 'запись голоса', 'audio', 'дыбыс'],
  video: ['видео', 'кинохроник', 'фильм', 'video', 'newsreel'],
  newspaper: ['газет', 'пресс', 'newspaper', 'газет'],
  'ВОВ': ['вов', 'война', 'войны', 'великая отечественная', 'фронт', 'победа', 'победы', 'соғыс', 'майдан', 'war', 'ww2', 'wwii', 'эвакуац', 'мобилизац'],
  'промышленность': ['промышлен', 'завод', 'комбинат', 'предприят', 'цех', 'металлург', 'гэс', 'электростанц', 'рудник', 'өнеркәсіп', 'industry', 'plant', 'factory'],
  'образование': ['образован', 'школ', 'училищ', 'техникум', 'учащ', 'студент', 'білім', 'мектеп', 'education', 'school'],
  'город': ['город', 'улиц', 'набережн', 'микрорайон', 'застройк', 'қала', 'city', 'street', 'town'],
  'сельское хозяйство': ['сельск', 'колхоз', 'посев', 'пасек', 'рыболов', 'ауыл', 'agricultur', 'farm'],
  'культура': ['культур', 'театр', 'клуб', 'библиотек', 'мәдениет', 'culture'],
  'экология': ['полигон', 'ядерн', 'эколог', 'nuclear', 'test site'],
};
const TYPE_KEYS = ['photo', 'map', 'personal', 'audio', 'video', 'newspaper'];
const PLACE_KEYS = ['усть-каменогорск', 'риддер', 'алтай', 'зайсан', 'шемонаиха', 'катон-карагай', 'серебрянск'];
const PLACE_VALUE = { 'усть-каменогорск': 'Усть-Каменогорск', 'риддер': 'Риддер', 'алтай': 'Алтай', 'зайсан': 'Зайсан', 'шемонаиха': 'Шемонаиха', 'катон-карагай': 'Катон-Карагай', 'серебрянск': 'Серебрянск' };

function detect(nq) {
  const found = new Set();
  for (const [k, vars] of Object.entries(SYN)) if (vars.some((v) => nq.includes(norm(v)))) found.add(k);
  return found;
}

export function parsePeriod(q) {
  const s = q.toLowerCase();
  let m = s.match(/(1[789]\d|20[0-2])0[- ]?(?:х|е|x|s|ые|-ых|-шы|ж)/); // 1960-х, 1960s
  if (m) { const y = Number(m[1] + '0'); return { from: y, to: y + 9, label: `${y}-е` }; }
  m = s.match(/\b([2-9]0)[- ]?(?:х|е|s|ых)\b/); // 60-х
  if (m) { const y = 1900 + Number(m[1]); return { from: y, to: y + 9, label: `${y}-е` }; }
  m = s.match(/(?:с|from|между)\s*(1[789]\d\d|20[0-2]\d)\s*(?:по|до|to|и|-|–)\s*(1[789]\d\d|20[0-2]\d)/) || s.match(/(1[789]\d\d|20[0-2]\d)\s*[-–]\s*(1[789]\d\d|20[0-2]\d)/);
  if (m) return { from: +m[1], to: +m[2], label: `${m[1]}–${m[2]}` };
  m = s.match(/\b(1[789]\d\d|20[0-2]\d)\b/);
  if (m) return { from: +m[1], to: +m[1], label: m[1] };
  if (/xx\s*(век|в\.|ғ|century)/.test(s)) return { from: 1900, to: 1999, label: 'XX век' };
  if (/xix\s*(век|в\.|ғ|century)/.test(s)) return { from: 1800, to: 1899, label: 'XIX век' };
  if (/(вов|войн|war|соғыс)/.test(s)) return { from: 1941, to: 1945, label: '1941–1945', soft: true };
  return null;
}

export function parseCipher(q) {
  const m = q.match(/(?:ф|f|қ)\.?\s*(п-\d+|фд-\d+|л-\d+|\d+)(?:[.,\s]*(?:оп|inv|т)\.?\s*(\d+))?(?:[.,\s]*(?:д|file|і)\.?\s*(\d+))?/i);
  return m ? { fund: m[1].toUpperCase(), inv: m[2], case: m[3] } : null;
}

// Понимание запроса (используется и каталогом, и помощником)
export function understand(q) {
  const nq = norm(q);
  const concepts = detect(nq);
  const types = TYPE_KEYS.filter((t) => concepts.has(t));
  const places = PLACE_KEYS.filter((p) => concepts.has(p)).map((p) => PLACE_VALUE[p]);
  const topics = [...concepts].filter((c) => !TYPE_KEYS.includes(c) && !PLACE_KEYS.includes(c));
  const period = parsePeriod(q);
  const cipher = parseCipher(q);
  const stop = new Set(['хочу', 'найти', 'покажи', 'показать', 'есть', 'ли', 'в', 'во', 'на', 'по', 'о', 'об', 'про', 'и', 'годов', 'годах', 'год', 'года', 'х', 'с', 'из', 'the', 'of', 'in', 'find', 'show', 'me', 'документы', 'документ', 'материалы', 'архив', 'какие', 'мне', 'нужны', 'нужен', 'туралы', 'бар', 'ма', 'за', 'для', 'что', 'как', 'где']);
  const words = nq.split(' ').filter((w) => w.length > 2 && !stop.has(w) && !/^\d+$/.test(w)).map(stem);
  return { q, nq, types, places, topics, period, cipher, words };
}

const text = (r) => norm([r.title?.ru, r.title?.kz, r.title?.en, r.descr?.ru, r.place, r.author, (r.topics || []).join(' '), r.cipher].filter(Boolean).join(' '));

// Ранжирование: учитываются тема/синонимы, период, тип, место, слова запроса
export function rank(records, u, { strictPeriod = true } = {}) {
  const out = [];
  for (const r of records) {
    const t = text(r);
    let s = 0;
    if (u.cipher) {
      const fundOk = (r.fund_no || '').toUpperCase() === u.cipher.fund;
      if (!fundOk) continue;
      if (u.cipher.case && r.case_no !== u.cipher.case) continue;
      s += 10;
    }
    if (u.period) {
      const overlap = (r.date_from ?? 0) <= u.period.to && (r.date_to ?? r.date_from ?? 0) >= u.period.from;
      if (overlap) s += 4; else if (strictPeriod && !u.period.soft) continue;
    }
    if (u.types.length) { if (u.types.includes(r.doc_type)) s += 5; else continue; }
    if (u.places.length) { if (u.places.includes(r.place)) s += 4; else s -= 1; }
    for (const tp of u.topics) {
      if ((r.topics || []).includes(tp)) s += 4;
      else if (SYN[tp]?.some((v) => t.includes(norm(v)))) s += 2;
    }
    for (const w of u.words) if (t.includes(w)) s += 1.5;
    // Если в запросе есть смысловые слова, а распознан только период — нужен хотя бы один совпавший термин
    const concept = u.cipher || u.types.length || u.places.length || u.topics.length;
    if (s <= 0 || (!concept && u.words.length && !u.words.some((w) => t.includes(w)))) continue;
    out.push({ r, s });
  }
  return out.sort((a, b) => b.s - a.s);
}

export function suggestions(u, lang = 'ru') {
  const s = [];
  const P = u.places[0];
  if (u.types.includes('photo') && P) s.push(`${P} — документы`, `${P} — карты и планы`);
  if (u.period && P) s.push(`${P} ${u.period.from - 10}-е`, `${P} ${u.period.to + 1}-е`);
  if (u.topics.includes('ВОВ')) s.push('письма с фронта', 'эвакуация предприятий 1941');
  if (u.topics.includes('промышленность')) s.push('Бухтарминская ГЭС', 'Риддер рудники');
  if (!s.length) s.push('фотографии Усть-Каменогорска 1960-х', 'документы о войне', 'карты Рудного Алтая');
  return [...new Set(s)].slice(0, 4);
}

// ---------------------------------------------------------------- ИИ-помощник
const T = {
  auto: { ru: 'Ответ сформирован автоматически по открытым материалам сайта и не является архивной справкой.', kz: 'Жауап сайттың ашық материалдары бойынша автоматты түрде қалыптастырылды және архивтік анықтама болып табылмайды.', en: 'This answer was generated automatically from open site materials and is not an official archival certificate.' },
  found: { ru: (n, u) => `Нашёл ${n} ${plural(n, 'материал', 'материала', 'материалов')}${u.period ? ` за период ${u.period.label}` : ''}${u.places.length ? ` (${u.places.join(', ')})` : ''}. Вот наиболее подходящие:`, kz: (n) => `${n} материал табылды. Ең сәйкестері:`, en: (n) => `Found ${n} matching item(s). Best matches:` },
  none: { ru: 'В открытых материалах сайта не найдено документов по этому запросу. Я не буду придумывать шифры или ссылки. Попробуйте изменить формулировку или период — или обратитесь в читальный зал: часть фондов ещё не описана в электронном каталоге.', kz: 'Сайттың ашық материалдарында бұл сұрау бойынша құжаттар табылмады. Мен шифрлар мен сілтемелерді ойлап таппаймын. Сұрауды өзгертіп көріңіз немесе оқу залына хабарласыңыз.', en: 'No documents matching this request were found in the open materials. I will not invent archival codes or links. Try rephrasing or changing the period, or contact the reading room.' },
  restricted: { ru: 'Найдены записи с ограниченным доступом. Я могу показать только опубликованное описание — цифровые копии и содержание таких документов (персональные данные, документы на экспертизе) не выдаются ни на сайте, ни через помощника. Условия доступа указаны в карточке; ознакомление возможно в читальном зале в порядке, установленном законодательством РК.', kz: 'Қолжетімділігі шектеулі жазбалар табылды. Тек жарияланған сипаттаманы көрсете аламын; цифрлық көшірмелер берілмейді. Танысу ҚР заңнамасына сәйкес оқу залында мүмкін.', en: 'Restricted records found. I can only show the published description — digital copies and contents (personal data, documents under review) are not provided. Access is possible in the reading room as provided by law.' },
};
const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const pick = (o, lang) => o[lang] ?? o.ru;

const INTENTS = [
  { id: 'contacts', re: /(контакт|телефон|адрес|почт|email|e-mail|где наход|как добрат|байланыс|мекенжай|contact|phone|address|where is)/ },
  { id: 'hours', re: /(режим|время работ|график|часы|когда работ|открыт|жұмыс уақыт|opening|hours|когда можно прийти)/ },
  { id: 'services', re: /(справк|заявлен|запрос|заказ|услуг|стаж|egov|анықтама|қызмет|certificate|service|apply|order)/ },
  { id: 'price', re: /(цен|стоимост|прейскурант|платн|сколько стоит|оплат|баға|ақылы|price|cost|fee)/ },
  { id: 'cipher', re: /(шифр|фонд.*опис|что такое (фонд|опись|дело)|как читать|cipher|reference code|шифрі)/ },
  { id: 'reading', re: /(читальн|оқу зал|reading room)/ },
  { id: 'anticorruption', re: /(коррупц|комплаенс|жемқор|compliance|corruption)/ },
  { id: 'calendar', re: /(памятн|юбилей|календар|атаулы|anniversar)/ },
  { id: 'exhibitions', re: /(выставк|экспозиц|көрме|exhibition)/ },
  { id: 'howto', re: /(как (искать|найти|пользоваться)|фильтр|поиск работает|how to search|қалай іздеу)/ },
];

export function assistant({ q, lang = 'ru', records, restrictedRecords, branches, org }) {
  const nq = norm(q);
  const u = understand(q);
  const branchHit = branches.find((b) => [b.city, b.name?.ru, b.slug].filter(Boolean).some((v) => nq.includes(norm(v).split(' ')[0])) && b.slug !== 'main');
  const intent = INTENTS.find((i) => i.re.test(q.toLowerCase()))?.id;
  const L = (o) => pick(o, lang);
  const base = { auto: L(T.auto), engine: 'local-nlu-v1', understood: summarizeU(u, lang) };

  // 1. Справочные намерения
  if (intent === 'contacts' || intent === 'hours') {
    if (branchHit) return { ...base, kind: 'info', answer: `${branchHit.name[lang] || branchHit.name.ru}: ${branchHit.address}. ${lang === 'en' ? 'Phone' : lang === 'kz' ? 'Телефон' : 'Телефон'}: ${branchHit.phone}, e-mail: ${branchHit.email}.`, sources: [{ title: branchHit.name[lang] || branchHit.name.ru, url: `/${lang}/branches?b=${branchHit.slug}` }] };
    return { ...base, kind: 'info', answer: ({ ru: `Главное здание: ${org.address.ru}. Приёмная: ${org.phoneReception}, e-mail: ${org.email}. Режим работы: ${org.hours.ru}; читальный зал: ${org.readingHours.ru}.`, kz: `Бас ғимарат: ${org.address.kz}. Қабылдау: ${org.phoneReception}. Жұмыс уақыты: ${org.hours.kz}; оқу залы: ${org.readingHours.kz}.`, en: `Main building: ${org.address.en}. Reception: ${org.phoneReception}, e-mail: ${org.email}. Hours: ${org.hours.en}; reading room: ${org.readingHours.en}.` })[lang], sources: [{ title: lang === 'en' ? 'Contacts' : 'Контакты', url: `/${lang}/contacts` }, { title: lang === 'en' ? 'Branches map' : 'Филиалы и карта', url: `/${lang}/branches` }] };
  }
  if (intent === 'services') return { ...base, kind: 'info', answer: ({ ru: 'Сайт носит информационный характер: заявления и заказы здесь не принимаются. В разделе «Государственная услуга» описаны правила, сроки и документы для получения архивной справки или копий. Подать заявление можно через портал eGov.kz, e-Otinish или лично в архиве/филиале.', kz: 'Сайт ақпараттық сипатта: өтініштер мұнда қабылданбайды. Ереже мен мерзімдер «Мемлекеттік қызмет» бөлімінде. Өтінішті eGov.kz арқылы немесе архивке жеке беруге болады.', en: 'This site is informational: applications are not accepted here. The "State service" section explains rules, deadlines and documents. Apply via eGov.kz, e-Otinish or in person.' })[lang], sources: [{ title: lang === 'en' ? 'State service' : 'Государственная услуга', url: `/${lang}/services` }, { title: 'eGov.kz', url: 'https://egov.kz', external: true }] };
  if (intent === 'price') return { ...base, kind: 'info', answer: ({ ru: 'Стоимость платных услуг определяется утверждённым прейскурантом. Он публикуется в разделе «Платные услуги» вместе с постановлением об утверждении. Расчёт и оплата на сайте не производятся.', kz: 'Ақылы қызметтердің құны бекітілген прейскурантпен анықталады. Ол «Ақылы қызметтер» бөлімінде жарияланады.', en: 'Prices are set by the approved price list published in "Paid services". No payments on this site.' })[lang], sources: [{ title: lang === 'en' ? 'Paid services' : 'Платные услуги', url: `/${lang}/services/paid` }] };
  if (intent === 'cipher') return { ...base, kind: 'info', answer: ({ ru: 'Архивный шифр — это «адрес» документа: Ф. — номер фонда (документы одного учреждения или человека), Оп. — номер описи (перечень дел), Д. — номер дела (папка), Л. — листы. Например, «Ф.25. Оп.1. Д.7» — дело № 7 описи 1 фонда облисполкома. Шифр можно ввести прямо в строку поиска каталога.', kz: 'Архивтік шифр — құжаттың мекенжайы: Қ. — қор, Т. — тізімдеме, І. — іс, П. — парақтар. Шифрды каталогтың іздеу жолына енгізуге болады.', en: 'An archival reference is the document\'s address: F. = fonds, Inv. = inventory, File = file, L. = sheets. You can type it straight into the catalogue search.' })[lang], sources: [{ title: lang === 'en' ? 'Guide' : 'Справочная информация', url: `/${lang}/guide#cipher` }] };
  if (intent === 'reading') return { ...base, kind: 'info', answer: ({ ru: `Читальный зал работает ${org.readingHours.ru}. Правила работы и регламент описаны на странице «Читальный зал». Запись и заказ дел через сайт не производятся.`, kz: `Оқу залы: ${org.readingHours.kz}. Ережелер «Оқу залы» бетінде.`, en: `Reading room: ${org.readingHours.en}. Rules are on the "Reading room" page.` })[lang], sources: [{ title: lang === 'en' ? 'Reading room' : 'Читальный зал', url: `/${lang}/reading-room` }] };
  if (intent === 'anticorruption') return { ...base, kind: 'info', answer: ({ ru: 'Информация о комплаенс-службе, результатах внутреннего анализа коррупционных рисков и План мероприятий опубликованы в разделе «Антикоррупция».', kz: 'Комплаенс қызметі туралы ақпарат «Сыбайлас жемқорлыққа қарсы» бөлімінде.', en: 'Compliance service information is in the "Anti-corruption" section.' })[lang], sources: [{ title: lang === 'en' ? 'Anti-corruption' : 'Антикоррупция', url: `/${lang}/anticorruption` }] };
  if (intent === 'calendar') return { ...base, kind: 'info', answer: ({ ru: 'Календарь юбилейных и памятных дат ВКО на 2026 год содержит 42 даты — от 130-летия Е.Н. Пермитина до 240-летия Риддера.', kz: '2026 жылғы атаулы күндер күнтізбесінде 42 күн бар.', en: 'The 2026 calendar lists 42 memorable dates of the region.' })[lang], sources: [{ title: lang === 'en' ? 'Calendar' : 'Календарь памятных дат', url: `/${lang}/calendar` }] };
  if (intent === 'exhibitions') return { ...base, kind: 'info', answer: ({ ru: 'Сейчас доступны три онлайн-выставки: об истории Усть-Каменогорска, о Восточном Казахстане в годы войны и о промышленном развитии региона.', kz: 'Қазір үш онлайн-көрме қолжетімді.', en: 'Three online exhibitions are available.' })[lang], sources: [{ title: lang === 'en' ? 'Exhibitions' : 'Онлайн-выставки', url: `/${lang}/exhibitions` }] };
  if (intent === 'howto') return { ...base, kind: 'info', answer: ({ ru: 'Введите в строку поиска слова, шифр или обычный вопрос. Затем уточните выдачу фильтрами слева: период, тип документа, населённый пункт, филиал, наличие цифровой копии. Найденную карточку можно открыть, скопировать шифр и поделиться ссылкой.', kz: 'Іздеу жолына сөздерді, шифрды немесе сұрақты енгізіп, сүзгілерді қолданыңыз.', en: 'Type words, a code or a question, then refine with filters.' })[lang], sources: [{ title: lang === 'en' ? 'Catalogue' : 'Электронный каталог', url: `/${lang}/catalog` }, { title: lang === 'en' ? 'Guide' : 'Справочная', url: `/${lang}/guide` }] };
  if (branchHit && !u.types.length && !u.topics.length && !u.period) return { ...base, kind: 'info', answer: `${branchHit.name[lang] || branchHit.name.ru}: ${branchHit.address}, ${branchHit.phone}.`, sources: [{ title: branchHit.name[lang] || branchHit.name.ru, url: `/${lang}/branches?b=${branchHit.slug}` }] };

  // 2. Поиск по каталогу
  const hits = rank(records, u);
  const sensitive = /(личн(ое|ые) дел|персональн|паспорт|адрес прожив|иин|закрыт|секрет|дербес дерек|personal data|personnel file)/i.test(q);
  const restrictedHits = rank(restrictedRecords, { ...u, types: [] }, { strictPeriod: false });
  if (sensitive || (!hits.length && restrictedHits.length)) {
    return { ...base, kind: 'restricted', answer: L(T.restricted), results: restrictedHits.slice(0, 3).map(({ r }) => card(r, lang)), sources: restrictedHits.slice(0, 3).map(({ r }) => ({ title: r.cipher, url: `/${lang}/catalog/${r.id}` })) };
  }
  if (!hits.length) return { ...base, kind: 'none', answer: L(T.none), suggestions: suggestions(u, lang), sources: [{ title: lang === 'en' ? 'Reading room' : 'Читальный зал', url: `/${lang}/reading-room` }] };
  const top = hits.slice(0, 5);
  return {
    ...base, kind: 'found', answer: pick(T.found, lang)(hits.length, u), results: top.map(({ r }) => card(r, lang)),
    sources: top.map(({ r }) => ({ title: r.cipher, url: `/${lang}/catalog/${r.id}` })),
    catalogUrl: `/${lang}/catalog?q=${encodeURIComponent(q)}`, suggestions: suggestions(u, lang),
  };
}
const card = (r, lang) => ({ id: r.id, title: r.title[lang] || r.title.ru, cipher: r.cipher, year: !r.date_from ? 'не датир.' : r.date_from === r.date_to ? r.date_from : `${r.date_from}–${r.date_to}`, type: r.doc_type, file: r.file_status });

function summarizeU(u, lang) {
  const parts = [];
  if (u.topics.length) parts.push((lang === 'en' ? 'topic: ' : lang === 'kz' ? 'тақырып: ' : 'тема: ') + u.topics.join(', '));
  if (u.period) parts.push((lang === 'en' ? 'period: ' : lang === 'kz' ? 'кезең: ' : 'период: ') + u.period.label);
  if (u.types.length) parts.push((lang === 'en' ? 'type: ' : lang === 'kz' ? 'түрі: ' : 'тип: ') + u.types.join(', '));
  if (u.places.length) parts.push((lang === 'en' ? 'place: ' : lang === 'kz' ? 'орны: ' : 'место: ') + u.places.join(', '));
  if (u.cipher) parts.push((lang === 'en' ? 'code: F.' : 'шифр: Ф.') + u.cipher.fund);
  return parts;
}

// ---------------------------------------------------------------- Агент по историческим материалам
export function annotate(r, all) {
  const txt = [r.title.ru, r.descr?.ru].join('. ');
  const years = [...new Set((txt.match(/\b1[789]\d\d|20[0-2]\d\b/g) || []).concat(r.date_from ? [String(r.date_from)] : []))].sort();
  const names = [...new Set(txt.match(/[А-ЯЁ]\.\s?[А-ЯЁ]\.\s?[А-ЯЁ][а-яё]+|[А-ЯЁ][а-яё]+\s[А-ЯЁ]\.\s?[А-ЯЁ]\./g) || [])];
  const places = [...new Set([r.place, ...Object.values(PLACE_VALUE).filter((p) => txt.includes(p.slice(0, 6)))].filter(Boolean))];
  const related = all.filter((x) => x.id !== r.id && ((x.topics || []).some((t) => (r.topics || []).includes(t)) || x.place === r.place))
    .map((x) => ({ x, s: (x.topics || []).filter((t) => (r.topics || []).includes(t)).length * 2 + (x.place === r.place ? 1 : 0) + (x.doc_type !== r.doc_type ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, 4).map(({ x }) => ({ id: x.id, title: x.title, cipher: x.cipher, type: x.doc_type }));
  const typeName = { text: 'Текстовый документ', photo: 'Фотодокумент', map: 'Картографический документ', personal: 'Документ личного происхождения', org: 'Документ организации', audio: 'Аудиодокумент', video: 'Видеодокумент', newspaper: 'Периодическое издание' }[r.doc_type] || 'Документ';
  const summary = `${typeName}${r.date_from ? `, ${r.date_from === r.date_to ? r.date_from + ' г.' : r.date_from + '–' + r.date_to + ' гг.'}` : ''}${r.place ? `, ${r.place}` : ''}. ${r.descr?.ru || ''}`.trim();
  return { summary, keyDates: years, names, places, topics: r.topics || [], related, auto: true, note: 'Аннотация сформирована автоматически (локальный алгоритм) по опубликованному описанию. Требует проверки специалистом.' };
}

// ---------------------------------------------------------------- Админ-инструмент: извлечение метаданных
const ORG_RE = /((?:[А-ЯЁ][а-яё-]+\s){0,3}(?:исполком|комбинат|завод|совет|горсовет|райисполком|облисполком|уисполком|обком|комитет|отдел|училищ[ае]|техникум|школ[аы]|управлени[ея])(?:\s[«"][^»"]+[»"])?)/gi;
export function extractMetadata(input, catalog = []) {
  const t = input.replace(/\s+/g, ' ').trim();
  const dates = [...new Set(t.match(/\b\d{1,2}[.\s](?:\d{1,2}|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[.\s]\d{4}\b|\b1[789]\d\d\b|\b20[0-2]\d\b/gi) || [])];
  const persons = [...new Set(t.match(/[А-ЯЁ]\.\s?[А-ЯЁ]\.\s?[А-ЯЁ][а-яё]+|[А-ЯЁ][а-яё]+\s[А-ЯЁ]\.\s?[А-ЯЁ]\.|[А-ЯЁ][а-яё]+(?:ов|ев|ин|ский|кий)\s[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+(?:вич|вна|ұлы|қызы)/g) || [])];
  const orgs = [...new Set((t.match(ORG_RE) || []).map((s) => s.trim()))].slice(0, 6);
  const nq = norm(t);
  const concepts = detect(nq);
  const geo = PLACE_KEYS.filter((p) => concepts.has(p)).map((p) => PLACE_VALUE[p]);
  const categories = [...concepts].filter((c) => !PLACE_KEYS.includes(c) && !TYPE_KEYS.includes(c));
  const docType = TYPE_KEYS.find((x) => concepts.has(x)) || (/(протокол|решени|приказ|постановлени|отчет|отчёт|акт)/i.test(t) ? 'text' : 'text');
  const words = nq.split(' ').filter((w) => w.length > 5);
  const freq = {};
  for (const w of words) freq[stem(w)] = (freq[stem(w)] || 0) + 1;
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  const firstSentence = (t.match(/^[^.!?]{20,240}[.!?]/) || [t.slice(0, 200)])[0];
  const titleWords = new Set(norm(firstSentence).split(' ').filter((w) => w.length > 4).map(stem));
  const duplicates = catalog.map((r) => {
    const rw = new Set(norm(r.title.ru).split(' ').filter((w) => w.length > 4).map(stem));
    const inter = [...titleWords].filter((w) => rw.has(w)).length;
    return { r, sim: inter / Math.max(1, Math.min(titleWords.size, rw.size)) };
  }).filter((x) => x.sim >= 0.5).sort((a, b) => b.sim - a.sim).slice(0, 3).map(({ r, sim }) => ({ id: r.id, cipher: r.cipher, title: r.title.ru, similarity: Math.round(sim * 100) }));
  return { dates, persons, orgs, geo, categories, docType, keywords, draftDescription: firstSentence, duplicates, auto: true, note: 'Результат автоматической обработки. Перед публикацией обязательна проверка и подтверждение сотрудником архива.' };
}

// ---------------------------------------------------------------- Аналитика качества сайта
export function analytics({ searchlog, stats, content, feedback }) {
  const byQ = {};
  for (const s of searchlog) { const k = norm(s.q); (byQ[k] ||= { q: s.q, n: 0, zero: 0 }); byQ[k].n++; if (!s.results) byQ[k].zero++; }
  const top = Object.values(byQ).sort((a, b) => b.n - a.n).slice(0, 8);
  const zero = Object.values(byQ).filter((x) => x.zero).sort((a, b) => b.zero - a.zero).slice(0, 8);
  const pages = Object.entries(stats).filter(([k]) => k.startsWith('page:')).map(([k, v]) => ({ page: k.slice(5), views: v })).sort((a, b) => b.views - a.views);
  const recs = [];
  if (zero.some((z) => /метрич/.test(z.q))) recs.push({ level: 'high', text: 'Пользователи часто ищут «метрические книги», но в каталоге нет таких записей. Рекомендуется опубликовать описание фонда метрических книг или страницу-пояснение о месте их хранения.' });
  if (zero.some((z) => /(стаж|справк)/.test(z.q))) recs.push({ level: 'high', text: 'Запросы «справка о стаже» не находят документов: это запрос услуги, а не материала. Добавьте на главную блок «Как получить архивную справку» со ссылкой на раздел «Государственная услуга» и eGov.kz.' });
  if (zero.some((z) => /колхоз/.test(z.q))) recs.push({ level: 'medium', text: 'Запрос «колхоз» без результатов: стоит добавить в словарь синонимов «колхоз → сельское хозяйство» и описать фонды районных сельхозуправлений.' });
  const stale = content.filter((c) => c.type === 'news').sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  if (stale[0] && (Date.now() - new Date(stale[0].data.date)) / 864e5 > 14) recs.push({ level: 'medium', text: `Последняя новость опубликована ${stale[0].data.date}. Рекомендуется обновлять ленту не реже раза в две недели.` });
  const lowPages = pages.filter((p) => p.views < 500);
  if (lowPages.length) recs.push({ level: 'low', text: `Низкая посещаемость разделов: ${lowPages.map((p) => p.page).join(', ')}. Добавьте ссылки на них с главной страницы и из ответов помощника.` });
  const missingKz = content.filter((c) => ['news', 'exhibition'].includes(c.type) && c.wf_status === 'published' && !c.data.title?.kz).length;
  if (missingKz) recs.push({ level: 'medium', text: `${missingKz} опубликованных материалов не имеют казахской версии заголовка.` });
  if (feedback.length) recs.push({ level: 'low', text: `Получено ${feedback.length} отзывов посетителей — проверьте раздел «Отзывы».` });
  return { top, zero, pages, recommendations: recs, auto: true, privacy: 'Анализируются только обезличенные агрегированные данные: запросы без привязки к посетителю, счётчики просмотров разделов.' };
}
