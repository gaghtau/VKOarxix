// Собственные функции команды (сверх кейса):
// 1) «Как найти документы о родственнике» — пошаговый навигатор с памяткой для печати;
// 2) «Тогда и сейчас» — сравнение исторического и современного вида со шторкой.
import { S, t, tr, esc, L, pageHead, M, credit } from './core.js';
import { icon } from './icons.js';

const X = (o) => o[S.lang] ?? o.ru;

// ---------------------------------------------------------------- Сравнение «тогда / сейчас»
export const compareHtml = (thenKey, nowKey, thenLabel, nowLabel) => {
  const a = M(thenKey), b = M(nowKey);
  if (!a || !b) return '';
  return `<figure class="fig" style="margin:0"><div class="compare" style="--pos:50%">
    <img class="now" src="${esc(b.url)}" alt="${esc(b.title)}" loading="lazy">
    <img class="then" src="${esc(a.url)}" alt="${esc(a.title)}" loading="lazy">
    <span class="lbl l">${esc(thenLabel)}</span><span class="lbl r">${esc(nowLabel)}</span><span class="handle" aria-hidden="true"></span>
    <input type="range" min="0" max="100" value="50" aria-label="${esc({ ru: 'Сдвиньте, чтобы сравнить', kz: 'Салыстыру үшін жылжытыңыз', en: 'Slide to compare' }[S.lang])}: ${esc(thenLabel)} / ${esc(nowLabel)}">
  </div><figcaption><span>${esc(thenLabel)}: ${esc(a.title)} · ${esc(nowLabel)}: ${esc(b.title)}</span><span class="cr">${credit(a)}<br>${credit(b)}</span></figcaption></figure>`;
};
export function mountCompare(root) {
  root.querySelectorAll('.compare input[type=range]').forEach((r) => { r.oninput = () => r.closest('.compare').style.setProperty('--pos', r.value + '%'); });
}
const PAIRS = [
  ['uk-1891', 'uk-irtysh', { ru: 'Усть-Каменогорск у Иртыша', kz: 'Ертіс жағасындағы Өскемен', en: 'Ust-Kamenogorsk on the Irtysh' }, '1891', { ru: 'сегодня', kz: 'бүгін', en: 'today' }, { ru: 'Слева — гравюра из книги Дж. Кеннана, справа — современный вид города с реки. Сдвигайте шторку, чтобы сравнить.', kz: 'Сол жақта — 1891 жылғы гравюра, оң жақта — қазіргі көрініс.', en: 'Left: an 1891 engraving; right: the city today.' }],
  ['building-krylova', 'building', { ru: 'Здания архива', kz: 'Архив ғимараттары', en: 'Archive buildings' }, { ru: 'до 1991', kz: '1991 дейін', en: 'before 1991' }, { ru: 'с 1991', kz: '1991 бастап', en: 'since 1991' }, { ru: 'До 1991 года архив работал на ул. Крылова, 39. Затем ему передали здание бывшего партархива на ул. Головкова (Бейбітшілік), 26/1.', kz: '1991 жылға дейін архив Крылов к-сі, 39-да болды.', en: 'Until 1991 the archive was on Krylov St.; then it moved to 26/1 Golovkov St.' }],
  ['zaisan-1875', 'zaisan-lake', { ru: 'Зайсанский край', kz: 'Зайсан өңірі', en: 'The Zaysan area' }, '1875', { ru: 'сегодня', kz: 'бүгін', en: 'today' }, { ru: 'Зайсанский пост на снимке А. Н. Боярского 1875 года и озеро Зайсан сегодня.', kz: 'А. Н. Боярскийдің 1875 жылғы суреті және бүгінгі Зайсан көлі.', en: 'The Zaysan post in 1875 and Lake Zaysan today.' }],
];
export function thenNow() {
  const title = X({ ru: 'Тогда и сейчас', kz: 'Сол кезде және қазір', en: 'Then and now' });
  const html = `${pageHead(esc(title), esc(X({ ru: 'Исторические изображения из архива и открытых источников рядом с современными видами тех же мест.', kz: 'Тарихи және қазіргі көріністер қатар.', en: 'Historical images next to the same places today.' })), [[t('menu.memory')[0], L('memory')], [title]])}
  <div class="wrap section" style="padding-top:28px;display:grid;gap:44px">
    ${PAIRS.map(([a, b, h, l1, l2, d], i) => `<section aria-labelledby="tn-${i}"><span class="sec-no">${String(i + 1).padStart(2, '0')}</span><h2 id="tn-${i}">${esc(X(h))}</h2><p class="muted" style="max-width:60ch">${esc(X(d))}</p>${compareHtml(a, b, typeof l1 === 'string' ? l1 : X(l1), X(l2))}</section>`).join('')}
  </div>`;
  return { title, html, after: mountCompare };
}

// ---------------------------------------------------------------- Навигатор «Как найти документы о родственнике»
const GOALS = {
  stazh: { ru: 'Подтвердить стаж или зарплату', kz: 'Еңбек өтілін немесе жалақыны растау', en: 'Confirm employment record or salary' },
  bio: { ru: 'Узнать биографию, найти фотографии', kz: 'Өмірбаянын білу, суреттерін табу', en: 'Learn a life story, find photos' },
  war: { ru: 'Участник Великой Отечественной войны', kz: 'Ұлы Отан соғысының қатысушысы', en: 'Great Patriotic War veteran' },
  repr: { ru: 'Сведения о репрессиях и реабилитации', kz: 'Қуғын-сүргін және ақтау туралы мәліметтер', en: 'Repression and rehabilitation' },
  edu: { ru: 'Учёба, награды, документы организации', kz: 'Оқу, марапаттар, ұйым құжаттары', en: 'Education, awards, organisation records' },
};
const PERIODS = { p1: { ru: 'до 1917 года', kz: '1917 жылға дейін', en: 'before 1917' }, p2: { ru: '1917–1940', kz: '1917–1940', en: '1917–1940' }, p3: { ru: '1941–1945', kz: '1941–1945', en: '1941–1945' }, p4: { ru: '1946–1991', kz: '1946–1991', en: '1946–1991' }, p5: { ru: 'после 1991 года', kz: '1991 жылдан кейін', en: 'after 1991' } };
const PERIOD_RANGE = { p1: [1700, 1916], p2: [1917, 1940], p3: [1941, 1945], p4: [1946, 1991], p5: [1991, 2026] };

function advice(goal, period, branch) {
  const R = S.lang; const B = branch; const main = (S.meta?.branches || []).find((b) => b.slug === 'main');
  const ls = (S.meta?.branches || []).find((b) => b.slug === 'ust-kamenogorsk-ls');
  const where = [];
  if (goal === 'stazh') {
    where.push(B && B.slug !== 'main' ? B : ls);
    if (B && B.slug === 'main') where.push(ls);
  } else { where.push(main); if (B && B.slug !== 'main') where.push(B); }
  const steps = {
    stazh: { ru: ['Выясните точное название организации и годы работы: по ним ищут документы по личному составу (приказы, лицевые счета).', 'Если организация ликвидирована, её документы обычно передаются в городской или районный архив по месту нахождения.', 'Справка о стаже — это государственная услуга: заявление подаётся через eGov.kz или лично в архиве. На этом сайте заявления не принимаются.', 'Возьмите удостоверение личности и, если есть, трудовую книжку или её копию.'], kz: ['Ұйымның нақты атауы мен жұмыс жылдарын анықтаңыз.', 'Ұйым таратылған болса, оның құжаттары қалалық немесе аудандық архивке беріледі.', 'Өтілі туралы анықтама — мемлекеттік қызмет: өтініш eGov.kz арқылы немесе архивте беріледі.', 'Жеке куәлігіңізді және еңбек кітапшасын алыңыз.'], en: ['Find the exact organisation name and years of work.', 'Records of closed organisations usually go to the city or district archive.', 'An employment certificate is a state service: apply via eGov.kz or in person.', 'Bring an ID and, if possible, your employment record book.'] },
    bio: { ru: ['Проверьте электронный каталог: личные фонды, фотографии, описи организаций, где работал человек.', 'Полезны газеты того времени — в архиве хранятся областные и районные газеты 1935–2011 годов.', 'Запишите шифры найденных дел (Ф., Оп., Д.) — с ними работа в читальном зале пойдёт быстрее.', 'В читальном зале можно бесплатно ознакомиться с открытыми документами; копирование — по правилам архива.'], kz: ['Электрондық каталогты тексеріңіз: жеке қорлар, фотосуреттер.', '1935–2011 жылдардағы облыстық және аудандық газеттер пайдалы.', 'Табылған істердің шифрларын жазып алыңыз.', 'Оқу залында ашық құжаттармен танысуға болады.'], en: ['Search the e-catalogue: personal fonds, photographs, organisation inventories.', 'Newspapers of 1935–2011 are kept in the archive.', 'Write down the reference codes (F., Inv., File).', 'Open documents can be read in the reading room.'] },
    war: { ru: ['Сведения о призыве и тыловой работе могут находиться в документах исполкомов, предприятий и колхозов того района, где жил человек.', 'Проверьте открытые базы участников войны и материалы раздела «Полезные ссылки».', 'Фронтовые письма, фотографии и воспоминания иногда хранятся в личных фондах — поищите в каталоге по теме «ВОВ».', 'Для официальной справки обратитесь в архив через eGov.kz или лично.'], kz: ['Шақыру және тылдағы жұмыс туралы мәліметтер аудандық атқару комитеттерінің құжаттарында болуы мүмкін.', 'Соғыс қатысушыларының ашық базаларын тексеріңіз.', 'Майдан хаттары жеке қорларда болуы мүмкін.', 'Ресми анықтама үшін eGov.kz арқылы жүгініңіз.'], en: ['Call-up and home-front records may be in district committee and enterprise records.', 'Check open veteran databases in “Useful links”.', 'Letters and photos may be in personal fonds — search the topic “WWII”.', 'For an official certificate, apply via eGov.kz.'] },
    repr: { ru: ['В области работает региональная комиссия по полной реабилитации жертв политических репрессий; сотрудники архива участвуют в поиске сведений.', 'Часть документов содержит персональные данные и выдаётся только в порядке, установленном законом, — на сайте они не публикуются.', 'Обратитесь в архив лично или через e-Otinish, указав ФИО, годы жизни и место проживания репрессированного.', 'Возьмите документы, подтверждающие родство.'], kz: ['Облыста саяси қуғын-сүргін құрбандарын толық ақтау жөніндегі өңірлік комиссия жұмыс істейді.', 'Дербес деректері бар құжаттар заңда белгіленген тәртіппен беріледі.', 'Архивке жеке немесе e-Otinish арқылы жүгініңіз.', 'Туыстықты растайтын құжаттарды алыңыз.'], en: ['A regional rehabilitation commission works in the region with the archive’s help.', 'Records with personal data are released only as provided by law.', 'Contact the archive in person or via e-Otinish.', 'Bring documents proving kinship.'] },
    edu: { ru: ['Найдите в каталоге фонд учебного заведения или организации (поиск по названию или населённому пункту).', 'Документы об учёбе: приказы о зачислении и выпуске, экзаменационные ведомости; о наградах — решения исполкомов и приказы предприятий.', 'Запишите шифры и приходите в читальный зал; для официальной копии документа — госуслуга через eGov.kz.'], kz: ['Каталогтан оқу орнының қорын табыңыз.', 'Оқу туралы құжаттар: қабылдау және бітіру туралы бұйрықтар.', 'Шифрларды жазып, оқу залына келіңіз.'], en: ['Find the institution’s fonds in the catalogue.', 'Education records: enrolment and graduation orders; awards: committee decisions.', 'Note the codes and visit the reading room.'] },
  }[goal][R] || [];
  const extra = period === 'p1' ? X({ ru: 'Документы до 1917 года по нашему краю немногочисленны: часть из них хранится в Центральном государственном архиве РК и архивах соседних регионов, к которым край относился в то время.', kz: '1917 жылға дейінгі құжаттардың бір бөлігі ҚР Орталық мемлекеттік архивінде сақталады.', en: 'Pre-1917 records are few; some are held in the Central State Archive of Kazakhstan and neighbouring regions.' }) : '';
  const [from, to] = PERIOD_RANGE[period] || [];
  const topic = { war: 'ВОВ', edu: 'образование', bio: 'личности', repr: 'власть', stazh: 'кадры' }[goal];
  const cat = `${L('catalog')}?${new URLSearchParams({ ...(from ? { from, to } : {}), ...(goal === 'bio' ? { kind: 'personal' } : {}), ...(topic && goal !== 'stazh' ? { topic } : {}) })}`;
  return { where: where.filter(Boolean), steps, extra, cat, service: goal === 'stazh' || goal === 'war' || goal === 'repr' };
}

export function family() {
  const R = S.lang;
  const title = X({ ru: 'Как найти документы о родственнике', kz: 'Туысыңыз туралы құжаттарды қалай табуға болады', en: 'How to find records about a relative' });
  const br = (S.meta?.branches || []);
  const html = `${pageHead(esc(title), esc(X({ ru: 'Ответьте на три вопроса — мы подскажем, в какой архив или филиал обратиться, что искать в каталоге и что взять с собой. Это памятка, а не заявление: данные никуда не отправляются.', kz: 'Үш сұраққа жауап беріңіз — қай архивке жүгіну керектігін айтамыз. Деректер ешқайда жіберілмейді.', en: 'Answer three questions and we will suggest where to go and what to bring. Nothing is sent anywhere.' })), [[t('nav.info')], [title]])}
  <div class="wrap section" style="padding-top:28px;max-width:960px">
    <form class="wizard" data-wz novalidate>
      <fieldset><legend>1. ${esc(X({ ru: 'Что вы хотите узнать?', kz: 'Не білгіңіз келеді?', en: 'What do you want to find out?' }))}</legend><div class="opts">${Object.entries(GOALS).map(([k, v], i) => `<label><input type="radio" name="goal" value="${k}" ${i === 0 ? 'required' : ''}><span>${esc(X(v))}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>2. ${esc(X({ ru: 'В какие годы?', kz: 'Қай жылдары?', en: 'Which years?' }))}</legend><div class="opts">${Object.entries(PERIODS).map(([k, v]) => `<label><input type="radio" name="period" value="${k}"><span>${esc(X(v))}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>3. ${esc(X({ ru: 'Где человек жил или работал?', kz: 'Адам қайда тұрды немесе жұмыс істеді?', en: 'Where did the person live or work?' }))}</legend>
        <label class="field"><span class="label">${esc(X({ ru: 'Город или район области', kz: 'Облыстың қаласы немесе ауданы', en: 'Town or district' }))}</span><select class="input" name="branch" style="min-height:52px;font-size:1.05rem"><option value="main">${esc(X({ ru: 'Усть-Каменогорск, Глубокое, Улан', kz: 'Өскемен, Глубокое, Ұлан', en: 'Ust-Kamenogorsk, Glubokoye, Ulan' }))}</option>${br.filter((b) => !['main', 'ust-kamenogorsk-ls', 'glubokoe', 'ulan'].includes(b.slug)).map((b) => `<option value="${b.slug}">${esc(b.city)}</option>`).join('')}<option value="">${esc(X({ ru: 'Не знаю / другой регион', kz: 'Білмеймін / басқа өңір', en: 'Not sure / another region' }))}</option></select></label>
      </fieldset>
      <div class="row"><button class="btn btn-accent" style="min-height:52px;font-size:1.05rem">${icon('search')}${esc(X({ ru: 'Показать, куда обратиться', kz: 'Қайда жүгіну керектігін көрсету', en: 'Show where to go' }))}</button><span class="small muted" data-msg role="status"></span></div>
    </form>
    <div data-result style="margin-top:28px" aria-live="polite"></div>
  </div>`;
  return {
    title, html,
    after(root) {
      root.querySelector('[data-wz]').onsubmit = (e) => {
        e.preventDefault(); const f = new FormData(e.target);
        const goal = f.get('goal'), period = f.get('period') || 'p4';
        if (!goal) { root.querySelector('[data-msg]').textContent = '⚠ ' + X({ ru: 'Выберите, что вы хотите узнать', kz: 'Не білгіңіз келетінін таңдаңыз', en: 'Choose what you want to find' }); root.querySelector('input[name=goal]').focus(); return; }
        root.querySelector('[data-msg]').textContent = '';
        const b = br.find((x) => x.slug === f.get('branch'));
        const a = advice(goal, period, b);
        const out = root.querySelector('[data-result]');
        out.innerHTML = `<article class="result-sheet"><span class="sec-no">${esc(X({ ru: 'ПАМЯТКА', kz: 'ЖАДЫНАМА', en: 'CHECKLIST' }))} · ${esc(X(GOALS[goal]))} · ${esc(X(PERIODS[period]))}</span>
          <h3>${esc(X({ ru: 'Куда обратиться', kz: 'Қайда жүгіну керек', en: 'Where to go' }))}</h3>
          ${a.where.map((w) => `<div style="border-top:1px solid var(--line);padding:10px 0"><b>${esc(tr(w.name))}</b><div>${esc(w.address)}</div><div>${w.phone.match(/\d/) ? `<a href="tel:${esc(w.phone.replace(/\D/g, ''))}">${esc(w.phone)}</a>` : esc(w.phone)} · ${esc(w.hours || tr(S.meta?.org?.hours))}</div><a href="${L('branches?b=' + w.slug)}">${esc(t('route'))} →</a></div>`).join('')}
          ${!f.get('branch') ? `<p class="muted">${esc(X({ ru: 'Если человек жил в другой области, документы скорее всего хранятся в архиве того региона.', kz: 'Басқа облыста тұрса, құжаттар сол өңірдің архивінде болуы мүмкін.', en: 'If the person lived elsewhere, the records are likely in that region’s archive.' }))}</p>` : ''}
          <h3 style="margin-top:18px">${esc(X({ ru: 'Что делать по шагам', kz: 'Қадамдар', en: 'Steps' }))}</h3><ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          ${a.extra ? `<p class="notice">${icon('info')}<span>${esc(a.extra)}</span></p>` : ''}
          <div class="row" style="margin-top:16px"><a class="btn btn-brand" href="${a.cat}">${icon('archive')}${esc(X({ ru: 'Посмотреть в каталоге', kz: 'Каталогтан қарау', en: 'Open the catalogue' }))}</a>${a.service ? `<a class="btn" href="${L('services')}">${icon('file')}${esc(t('menu.services')[0])}</a>` : ''}<button class="btn" type="button" data-print>${icon('download')}${esc(X({ ru: 'Распечатать памятку', kz: 'Жадынаманы басып шығару', en: 'Print checklist' }))}</button></div>
          <p class="small muted" style="margin-top:14px">${esc(X({ ru: 'Подсказка сформирована по общим правилам работы архива и не является ответом на запрос. Результат поиска в архиве не гарантирован.', kz: 'Кеңес архивтің жалпы ережелері бойынша қалыптастырылды.', en: 'General guidance, not an answer to a request.' }))}</p></article>`;
        out.querySelector('[data-print]').onclick = () => window.print();
        out.scrollIntoView({ behavior: document.documentElement.dataset.reading ? 'auto' : 'smooth', block: 'start' });
        out.querySelector('h3').setAttribute('tabindex', '-1'); out.querySelector('h3').focus({ preventScroll: true });
      };
    },
  };
}
