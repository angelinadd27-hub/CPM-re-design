/* Прототип «Покупка гостем». Роутинг по hash, состояние в памяти и sessionStorage. */
(function () {
  const { DELIVERY, PAYWAY, SELLERS, ITEMS, AUCTIONS, REVIEWS, CATEGORIES, TAGS, SELLER_TYPES, CITIES, PVZ } = window.MFM;
  const MENU = window.MFM_MENU || [];
  const navigationSections = new Set(['Клубы', 'Афиша мероприятий', 'Подарочные сертификаты']);
  const catalogCategories = MENU.filter(section => !navigationSections.has(section.t));
  const DESC = window.MFM_DESC || {};
  const HOME = window.MFM_HOME || { cats: [], clubs: [], events: [] };
  const SITE = 'https://minifreemarket.com';
  const appEl = document.getElementById('app');
  const ovEl = document.getElementById('ov');
  const KEY = 'mfm-guest-v2';
  const T0 = Date.now();

  /* Реальные описания, характеристики и фото с сайта */
  ITEMS.forEach((i) => { const d = DESC[i.id]; if (!d) return; if (d.specs.length) i.specs = d.specs; i.text = d.text; if (d.photos.length) i.photos = d.photos; });
  AUCTIONS.forEach((a) => { const d = DESC[a.id]; if (d) a.text = d.text; a.photos = d && d.photos.length ? [a.img].concat(d.photos.slice(1, 5)) : [a.img]; a.specs = (d && d.specs) || []; });

  const FILTERS = [
    { k: 'orig', t: 'Оригинальность', spec: 'Оригинальность', o: ['оригинал', 'литье', '3д печать', 'скан', 'прочее'] },
    { k: 'state', t: 'Состояние модели', spec: 'Состояние модели', o: ['в упаковке', 'на литниках, снята упаковка', 'снят с литников', 'собран', 'в грунте', 'отмыт от краски', 'начата покраска', 'покрашена'] },
    { k: 'mat', t: 'Материал', spec: 'Материал', o: ['пластик', 'файнкаст (смола GW)', 'смола, литьевой пластик', 'металл', '3д печать', 'ХДФ', 'различные материалы'] },
    { k: 'eq', t: 'Комплектация', spec: 'Комплектация', o: ['битцы', 'модель или отряд', 'армия', 'книги', 'аксессуары'] },
  ];
  const SAFE = ['Безопасная сделка', 'Подтвержденный профиль', 'Гарантийный список'];
  const COUNTRIES = ['Все', 'Россия', 'Беларусь', 'Украина', 'Казахстан', 'Армения', 'Кыргызстан', 'Словакия', 'Узбекистан'];
  const SORTS = [['new', 'Сначала новые'], ['old', 'Сначала старые'], ['cheap', 'Сначала дешевле'], ['dear', 'Сначала дороже'], ['pop', 'Сначала популярные'], ['unpop', 'Сначала непопулярные']];
  const SEARCH_TERMS = ['warhammer 40000', 'necrons', 'orks', 'space marines', 'kill team', 'age of sigmar', 'fallout', 'forgefiend', 'magic the gathering', 'dice', 'краски citadel', 'террейн', 'dreadnought', 'terminators'];
  const REPORT = ['Некорректно указана категория объявления', 'Некорректные фотографии', 'Неправильно составлено описание', 'Подозрение в мошенничестве', 'Нарушение моих авторских прав'];
  const FOOT_CAT = ['Варгеймы', 'Стендовые модели', 'Все для моделирования', 'Настольные игры', 'Ролевые игры', 'Экшен-фигурки', 'Коллекционные карточные игры', 'LEGO', 'Литература', 'Печать 3D миниатюр', 'Услуги', 'Клубы', 'Афиша мероприятий', 'Подарочные сертификаты'];
  const FOOT_INFO = ['Клубы', 'Мероприятия клубов', 'О нас', 'Контакты', 'Оплата', 'Доставка', 'Услуги', 'Справка и помощь', 'Условия Безопасной сделки', 'Пользовательское соглашение', 'Конфиденциальность', 'Оферта регулярных платежей', 'Условия использования Яндекс Карт', 'Блог'];

  /* ---------- Утилиты ---------- */
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, a, b, c) => { const m = n % 100, d = n % 10; if (m > 10 && m < 20) return c; if (d === 1) return a; if (d > 1 && d < 5) return b; return c; };
  const byId = (id) => ITEMS.find((i) => i.id === id) || wonLot(id);
  const ownAuction = () => { const b = ITEMS.find((i) => i.id === 'strudd'); return Object.assign({}, b, { id: 'a-own', title: 'Strudd Panzermensh, расписанная модель', price: 2500, bids: 3, hours: 30 }); }; // пример
  const byAny = (id) => byId(id) || AUCTIONS.find((a) => a.id === id) || (id === 'a-own' ? ownAuction() : undefined);
  function wonLot(id) { const w = S.won && S.won[id]; if (!w) return undefined; const a = AUCTIONS.find((x) => x.id === id); return Object.assign({}, a, { price: w.price, stock: 1, lot: true, specs: [], crumbs: [] }); }
  function winLot(id, price) { S.won = S.won || {}; S.won[id] = { price, end: Date.now() + 47.9 * 3600000 }; if (!S.cart.some((c) => c.id === id)) S.cart.push({ id, qty: 1, on: true }); }
  const spec = (o, k) => { const r = (o.specs || []).find((x) => x[0] === k); return r ? r[1] : ''; };
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const dateStr = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const PATHS = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    cart: '<path d="M2 3h3l1 3m0 0h15l-2 9H8L6 6Z"/><circle cx="9.5" cy="20" r="1.5"/><circle cx="17.5" cy="20" r="1.5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chat: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m6 15 6-6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
    truck: '<path d="M1 5h14v11H1zM15 9h4l4 4v3h-8z"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
    alert: '<path d="M12 3 2 20h20zM12 10v4M12 17h.01"/>',
    mail: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 7 10-7"/>',
    pin: '<path d="M12 22s8-6.5 8-13a8 8 0 1 0-16 0c0 6.5 8 13 8 13Z"/><circle cx="12" cy="9" r="3"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11zM8 8h.01"/>',
    sell: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/>',
    block: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    flag: '<path d="M5 21V4h13l-3 4.5 3 4.5H5"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    price: '<path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    clip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10 18a1.7 1.7 0 0 1-2.3-2.3L15 8.5"/>',
    gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  };
  const STAR = '<svg class="i fill star" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1z"/></svg>';
  const ic = (name, size = 20, cls = '') => `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;

  /* Неразрывный пробел после предлогов и союзов, правило из CONTEXT.md */
  const SHORT = 'а|в|во|и|к|ко|о|об|обо|от|ото|до|по|за|из|изо|на|над|не|ни|но|под|при|про|с|со|у|для|без|или|что|чтобы|как|да|если|когда|перед|через|после|либо|то';
  const NB = new RegExp(`(^|[\\s(«—–-])(${SHORT})\\s+`, 'gi');
  const nbText = (s) => s.replace(NB, '$1$2 ').replace(NB, '$1$2 ');
  function typo(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach((n) => { const v = nbText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
    root.querySelectorAll('[placeholder]').forEach((e) => { e.placeholder = nbText(e.placeholder); });
  }

  /* ---------- Состояние ---------- */
  const DEFCAT = () => ({ tab: 'all', node: null, sort: 'new', per: 24, q: '', min: '', max: '', country: 'Все', city: 'Все', f: {}, view: 'two' });
  const DEF = () => ({
    cart: [], favs: [], viewed: [], lang: 'RUS', cur: 'RUB',
    form: {}, co: { city: '', cityTxt: '', dl: {}, pay: {}, safe: {}, pvz: {}, comment: {}, promo: {}, certificates: [] },
    flags: { emailExists: false, autoConfirm: false, fail: 'none', itemOut: false, partial: false, minSum: false, soldOut: false, role: 'guest' },
    comments: {},
    cat: DEFCAT(), orders: null, banner: null, notice: null,
  });
  let S = DEF();
  try { const raw = sessionStorage.getItem(KEY); if (raw) { S = Object.assign(DEF(), JSON.parse(raw)); S.cat = Object.assign(DEFCAT(), S.cat); } } catch (e) { /* без хранилища работаем из памяти */ }
  if (navigationSections.has(S.cat.node)) { S.cat.node = null; S.cat.grp = null; }
  // Older sessions stored one string per seller and one certificate for the basket.
  S.co = Object.assign(DEF().co, S.co);
  for (const [seller, codes] of Object.entries(S.co.promo)) {
    S.co.promo[seller] = [...new Set([].concat(codes).filter(Boolean))];
  }
  S.co.certificates = [...new Set(S.co.certificates.concat(S.co.cert || []).filter(Boolean))];
  delete S.co.cert;
  for (const [sid, method] of Object.entries(S.co.pay)) {
    if (method === 'safe') {
      S.co.safe[sid] ??= true;
      S.co.pay[sid] = 'card';
    }
    if (method === 'cash') S.co.safe[sid] = false;
  }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* пропускаем */ } };

  const ui = { menu: false, l1: 0, l2: null, mmMore: {}, drawer: false, dr: [], modal: null, photo: 0, tab: 'desc', descOpen: false, lb: null, toast: null, opened: {}, cityOpen: false, touched: {}, submitted: false, loading: false, qty: 1, tagsOpen: false, relOff: {}, homeTab: 'Все', footOpen: {}, clamp: {}, crumbs: false, revSort: 'new', coStep: 1, codeDraft: '', codeError: '', chooseSeller: false, codeStatus: '' };
  const catalogDesktop = window.matchMedia('(min-width: 1024px)');
  const mobileFilterSections = {};
  let toastT = null;

  /* ---------- Безопасная сделка: комиссия примерная ---------- */
  PAYWAY.safe = { title: 'Безопасная сделка', note: 'Деньги у нас, пока вы не получите заказ. Комиссия 5%', icon: 'shield' };
  const SAFE_FEE = 0.05;
  const sellerSafe = (s) => !!(s.safe || s.pro);
  const safeFee = (sum) => Math.ceil(sum * SAFE_FEE);

  /* ---------- Роли: вход и отношение к лоту. Роль определяется по лоту, а не по аккаунту ---------- */
  const OWN_SELLER = 'pocket';
  const role = () => S.flags.role || 'guest';
  const isAuth = () => role() !== 'guest';
  const isOwn = (it) => role() === 'seller' && !!it && it.seller === OWN_SELLER;
  const myName = () => (role() === 'seller' ? SELLERS[OWN_SELLER].name : 'User1');
  function setRole(r) {
    ui.recipientDraft = null;
    S.flags.role = r; ui.replyTo = null;
    if (r === 'guest') { S.favs = []; S.form = {}; S.lot = {}; S.lotDemo = 'live'; S.cart = S.cart.filter((c) => !(S.won && S.won[c.id])); S.won = {}; }
    if (r === 'seller') {
      S.cart = S.cart.filter((c) => !isOwn(byId(c.id)));
      S.favs = S.favs.filter((id) => !isOwn(byAny(id)));
    }
  }

  /* ---------- Корзина ---------- */
  const cartCount = () => S.cart.reduce((a, c) => a + c.qty, 0);
  const inCart = (id) => S.cart.find((c) => c.id === id);
  function addCart(id, qty) {
    const c = inCart(id); const it = byId(id);
    if (c) c.qty = Math.min(it.stock, c.qty + qty); else S.cart.push({ id, qty: Math.min(it.stock, qty), on: true });
  }
  const restOf = (c) => {
    if (S.flags.itemOut && c.id === 'trukk') return 0;
    if (S.flags.partial && c.id === 'strudd') return 1;
    return byId(c.id).stock;
  };
  const isOut = (c) => restOf(c) < c.qty;
  function groups(onlyOn) {
    const m = {};
    S.cart.forEach((c) => {
      if (onlyOn && (!c.on || isOut(c))) return;
      const it = byId(c.id); (m[it.seller] = m[it.seller] || []).push(Object.assign({}, c, { item: it }));
    });
    return Object.keys(m).map((sid) => ({ sid, seller: SELLERS[sid], lines: m[sid], sum: m[sid].reduce((a, l) => a + l.item.price * l.qty, 0) }));
  }
  const minProblem = (g) => (S.flags.minSum && g.seller.minSum && g.sum < g.seller.minSum ? g.seller.minSum - g.sum : 0);

  function preset(name) {
    resetCodeEntry();
    if (name === 'empty') S.cart = [];
    if (name === 'one') S.cart = [{ id: 'strudd', qty: 1, on: true }];
    if (name === 'two') S.cart = [{ id: 'strudd', qty: 1, on: true }, { id: 'trukk', qty: 1, on: true }];
    if (name === 'multi' || name === 'cash') {
      S.cart = [{ id: 'strudd', qty: 1, on: true }, { id: 'assassins', qty: 2, on: true }];
      S.co = DEF().co;
      fillForm();
      S.flags.fail = 'none';
      ui.coStep = 1;
      ui.recipientDraft = null;
      ui.opened = {};
      if (name === 'cash') {
        S.co.city = S.co.cityTxt = SELLERS.pocket.city;
        S.co.dl.pocket = 'pickup'; S.co.pay.pocket = 'cash';
      }
    }
    if (name === 'twoPro') {
      S.co = DEF().co;
      S.cart = [{ id: 'assassins', qty: 1, on: true }, { id: 'zeratul', qty: 1, on: true }];
      fillForm();
    }
    if (name === 'three') S.cart = [{ id: 'strudd', qty: 1, on: true }, { id: 'assassins', qty: 2, on: true }, { id: 'trukk', qty: 1, on: true }];
    S.flags.itemOut = S.flags.partial = S.flags.minSum = false;
    ui.submitted = false; ui.touched = {}; S.banner = null; S.notice = null;
  }
  function fillForm() {
    S.form = { email: 'ivanov@example.com', phone: '+7 (900) 123-45-67', fio: 'Иванов Иван Иванович', street: 'ул. Садовая', house: '1', flat: '10', index: '101000' };
    S.co.city = S.co.cityTxt = 'Москва';
    groups(true).forEach((g) => {
      const d = g.seller.deliveries.includes('post') ? 'post' : g.seller.deliveries.includes('tk') ? 'tk' : g.seller.deliveries[0];
      S.co.dl[g.sid] = d; S.co.pay[g.sid] = 'card';
      if (DELIVERY[d].needs === 'pvz') S.co.pvz[g.sid] = PVZ[0].id;
    });
  }

  /* ---------- Роутинг ---------- */
  function route() {
    const h = (location.hash || '#/').slice(1);
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const q = {}; (qs || '').split('&').filter(Boolean).forEach((p) => { const [k, v] = p.split('='); q[k] = decodeURIComponent(v || ''); });
    return { name: parts[0] || 'home', id: parts[1], sub: parts[2], q };
  }
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  /* ---------- Выпадающий список: единый вид вместо системного ---------- */
  function dd(id, cur, opts, o = {}) {
    const list = opts.map((x) => (Array.isArray(x) ? x : [x, x]));
    const label = (list.find((x) => String(x[0]) === String(cur)) || [cur, cur])[1];
    return `<div class="dd ${o.cls || ''}" data-dd="${id}">
      <button type="button" class="dd-btn" data-dd-toggle aria-haspopup="listbox" aria-expanded="false"${o.aria ? ` aria-label="${o.aria}"` : ''}><span class="dd-v">${esc(o.prefix ? o.prefix + label : label)}</span>${ic('down', 16)}</button>
      <div class="dd-menu" hidden>
        ${o.search ? `<div class="dd-s">${ic('search', 16)}<input type="text" placeholder="Поиск" data-dd-search aria-label="Поиск по списку"></div>` : ''}
        <div class="dd-list" role="listbox">${list.map(([v, l]) => `<button type="button" role="option" class="dd-o ${String(v) === String(cur) ? 'on' : ''}" data-dd-val="${esc(v)}" aria-selected="${String(v) === String(cur)}"><span>${esc(l)}</span>${String(v) === String(cur) ? ic('check', 16) : ''}</button>`).join('')}</div>
      </div>
    </div>`;
  }
  const DD = {
    sort(v) { S.cat.sort = v; },
    per(v) { S.cat.per = +v; },
    country(v) { pend('.cat-side [data-dd=country]'); S.cat.country = v; },
    city(v) { pend('.cat-side [data-dd=city]'); S.cat.city = v; },
    lkSt(v) { ui.lkF = Object.assign({}, ui.lkF, { st: v }); },
    lkPay(v) { ui.lkF = Object.assign({}, ui.lkF, { pay: v }); },
    lkDl(v) { ui.lkF = Object.assign({}, ui.lkF, { dl: v }); },
    lkSort(v) { ui.lkF = Object.assign({}, ui.lkF, { sort: v }); },
    lang(v) { S.lang = v; toast('Смена языка в прототипе только показывается'); },
    cur(v) { S.cur = v; toast('Смена валюты в прототипе только показывается'); },
    rev(v) { ui.revSort = v; },
    bidRes(v) { ui.bidRes = v; },
  };
  const closeDD = () => document.querySelectorAll('.dd-menu:not([hidden])').forEach((m) => { m.hidden = true; const b = m.parentNode.querySelector('[data-dd-toggle]'); if (b) b.setAttribute('aria-expanded', 'false'); });

  /* ---------- Шапка ---------- */
  const rating = (s) => (s.reviews ? `${STAR}<span class="sb">${s.rating.toFixed(2)}</span>` : '<span class="tag mute">Новый продавец</span>');
  const logoHtml = () => '<a class="logo" href="#/" aria-label="Свободный Рынок Миниатюр, на главную"><img src="assets/logo.png" alt="СРМ"></a>';
  const searchExamples = ['Warhammer 40.000', 'Kill team', 'Dice', 'Magic: The Gathering', 'Краски Citadel', 'Террейн', 'LEGO'];
  const searchForm = () => `<form class="hdr-search" data-form="search" role="search" autocomplete="off">
      <input name="q" type="search" placeholder="${searchExamples[0]}" value="${esc(S.cat.q)}" aria-label="Поиск">
      <button type="submit" class="hdr-search-go" aria-label="Найти">${ic('search')}</button>
      <button type="button" class="hdr-search-x" data-act="searchClear" aria-label="Очистить">${ic('x', 18)}</button><button type="submit" class="hdr-search-do">Найти</button>
    </form>`;

  function header(r) {
    const n = cartCount(); const f = S.favs.length;
    const badge = (v) => (v ? `<span class="badge-n">${v}</span>` : '');
    const soon = (t) => `data-act="soon" data-text="${t}"`;
    const icons = (extra) => `<a class="hdr-link" href="#/" ${soon('Продажа это отдельный сценарий, соберём его позже')} aria-label="Продать">${ic('price', 24)}<span>Продать</span></a>
            <a class="hdr-link" href="#/" ${isAuth() ? soon('Страницу избранного соберём позже, сердечки уже работают') : 'data-act="loginFor" data-text="Войдите, чтобы открыть избранное"'} aria-label="Избранное">${ic('heart', 24)}<span>Избранное</span>${badge(f)}</a>
            <a class="hdr-link" href="#/cart" aria-label="Корзина">${ic('cart', 24)}<span>Корзина</span>${badge(n)}</a>
            <button class="hdr-link" data-act="${isAuth() ? 'profile' : 'login'}" aria-label="${isAuth() ? 'Профиль' : 'Войти'}">${ic('user', 24)}<span>${isAuth() ? 'Профиль' : 'Войти'}</span>${isAuth() ? badge(wonNeed()) : ''}</button>${extra || ''}`;
    return `<div class="hdr-m1 hide-t-up"><div class="wrap hdr-m1-row"><div class="brand">${logoHtml()}</div><nav class="hdr-act" aria-label="Действия">${icons()}</nav></div></div>
      <div class="hdr-top hide-below-d"><div class="wrap hdr-top-row">
        <div class="row hdr-top-l">
          ${dd('lang', S.lang, ['RUS', 'ENG'], { cls: 'plain', aria: 'Язык' })}
          ${dd('cur', S.cur, ['RUB', 'USD', 'EUR'], { cls: 'plain', aria: 'Валюта' })}
        </div>
        <nav class="hdr-top-nav" aria-label="Разделы">
          <a href="#/" ${soon('Раздел «Продавцы» соберём отдельным блоком')}>Продавцы</a>
          <a href="#/" ${soon('Сертификаты соберём отдельным блоком')}>Подарочные сертификаты</a>
          <a href="#/" ${soon('Клубы соберём отдельным блоком')}>Клубы</a>
          <a href="#/" ${soon('Мероприятия соберём отдельным блоком')}>Мероприятия</a>
          <a href="#/" ${soon('Открывается help.minifreemarket.com')}>Справка и помощь</a>
        </nav>
      </div></div>
      <header class="hdr" id="hdr">
        <div class="wrap hdr-row">
          <div class="brand">
            ${logoHtml()}
            <button class="brand-cat" data-act="menu" aria-label="Каталог" aria-expanded="${ui.menu}"><span class="cat-ic">${ic('grid', 20)}</span><span class="cat-t">Каталог</span><span class="cat-ch">${ic(ui.menu ? 'up' : 'down', 16)}</span></button>
          </div>
          <div class="hdr-s-d">${searchForm()}</div>
          <nav class="hdr-act hide-m-only" aria-label="Действия">${icons()}</nav>
        </div>
        <div class="sp" id="sp" hidden></div>
        ${ui.menu ? `<div class="mm hide-below-d" id="mm">${megaMenu()}</div>` : ''}
      </header>`;
  }

  /* Правило показа: прячем под «Ещё» только больше 15 подпунктов */
  function limited(list, key, max = 15) {
    if (list.length <= max) return { list, more: null };
    return ui.mmMore[key] ? { list, more: 'less' } : { list: list.slice(0, max), more: list.length - max };
  }
  const moreBtn = (key, m) => (m === null ? '' : `<button class="mm-more" data-act="mmMore" data-k="${esc(key)}">${m === 'less' ? 'Свернуть' : `Ещё (${m})`} ${ic(m === 'less' ? 'up' : 'down', 14)}</button>`);
  const findL2 = (m, t) => { for (const g of m.groups) { const f = g.items.find((i) => i.t === t); if (f) return f; } return null; };
  function megaMenu() {
    const cur = MENU[ui.l1] || MENU[0];
    const l3 = ui.l2 ? findL2(cur, ui.l2) : null;
    const col2 = cur.groups.length ? cur.groups.map((g, gi) => {
      const k = `${ui.l1}-${gi}`; const { list, more } = limited(g.items, k);
      return `<div class="mm-g">${g.t ? `<p class="mm-gt">${esc(g.t)}</p>` : ''}${list.map((it) => `<a href="#/catalog" class="mm-l2 ${ui.l2 === it.t ? 'on' : ''}" data-l2="${esc(it.t)}" data-act="node" data-top="${esc(cur.t)}" data-v="${esc(it.t)}"><span>${esc(it.t)}</span>${it.sub ? ic('right', 14) : ''}</a>`).join('')}${moreBtn(k, more)}</div>`;
    }).join('') : `<a class="mm-l2" href="#/catalog" data-act="node" data-top="${esc(cur.t)}" data-v=""><span>Открыть раздел</span></a>`;
    let col3 = '';
    if (l3 && l3.sub) {
      const k = `s-${l3.t}`; const { list, more } = limited(l3.sub, k);
      col3 = `<p class="mm-h">${esc(l3.t)}</p>${list.map((s) => `<a class="mm-l3" href="#/catalog" data-act="node" data-top="${esc(cur.t)}" data-v="${esc(s)}">${esc(s)}</a>`).join('')}${moreBtn(k, more)}`;
    }
    return `<div class="wrap"><div class="mm-in">
      <div class="mm-c1">${MENU.map((m, i) => `<a href="#/catalog" class="mm-l1 ${i === ui.l1 ? 'on' : ''}" data-l1="${i}" data-act="node" data-top="${esc(m.t)}" data-v="">${m.img ? `<img src="${SITE + m.img}" alt="" width="24" height="24">` : `<span class="mm-noi">${ic('grid', 20)}</span>`}<span>${esc(m.t)}</span>${m.groups.length ? ic('right', 14) : ''}</a>`).join('')}</div>
      <div class="mm-c2"><p class="mm-h">${esc(cur.t)}</p>${col2}</div>
      <div class="mm-c3">${col3}</div>
    </div></div>`;
  }
  function repaintMenu() { const el = document.getElementById('mm'); if (!el) return; const s = el.querySelector('.mm-c2'); const top = s ? s.scrollTop : 0; el.innerHTML = megaMenu(); typo(el); const n = el.querySelector('.mm-c2'); if (n) n.scrollTop = top; }

  /* ---------- Поиск ---------- */
  const CATS_FLAT = (() => { const o = []; catalogCategories.forEach((m) => { o.push(m.t); m.groups.forEach((g) => g.items.forEach((i) => { o.push(i.t); (i.sub || []).forEach((s) => o.push(s)); })); }); return o.filter((v, i, a) => a.indexOf(v) === i); })();
  function spCard(it) {
    const c = inCart(it.id);
    return `<article class="sp-c"><a href="#/item/${it.id}"><img src="${it.img}" alt=""><span class="sp-pr">${fmt(it.price)}</span><span class="sp-ct">${esc(it.title)}</span></a>
      ${isOwn(it) ? ownEdit('secondary sm') : c ? qtyStep(it, c, 'sm') : `<button type="button" class="btn primary sm" data-act="addc" data-id="${it.id}">В корзину</button>`}</article>`;
  }
  function spHtml(q) {
    const v = q.trim().toLowerCase();
    const prods = ITEMS.filter((i) => !v || i.title.toLowerCase().includes(v) || i.cat.toLowerCase().includes(v)).slice(0, 4);
    if (!v) {
      return `<div class="sp-in"><div class="sp-l"><p class="sp-t">Часто ищут</p>${SEARCH_TERMS.slice(0, 5).map((t) => `<button type="button" class="sp-row" data-act="term" data-v="${esc(t)}">${ic('search', 16)}<span>${esc(t)}</span></button>`).join('')}</div>
        <div class="sp-r"><p class="sp-t">Популярные товары</p><div class="sp-grid">${ITEMS.slice(0, 4).map(spCard).join('')}</div></div></div>`;
    }
    const terms = SEARCH_TERMS.filter((t) => t.includes(v)).slice(0, 4);
    const cats = CATS_FLAT.filter((c) => c.toLowerCase().includes(v)).slice(0, 4);
    if (!terms.length && !cats.length && !prods.length) {
      return `<div class="sp-empty"><p class="sb">По запросу «${esc(q)}» ничего не нашлось</p><p class="c2">Проверьте написание или посмотрите, что часто ищут</p><div class="chips-w">${SEARCH_TERMS.slice(0, 6).map((t) => `<button type="button" class="chip-b" data-act="term" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`;
    }
    return `${terms.length ? `<div class="chips-w sp-top">${terms.map((t) => `<button type="button" class="chip-b" data-act="term" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      <div class="sp-in"><div class="sp-l">
        ${terms.length ? `<p class="sp-t">Часто ищут</p>${terms.map((t) => `<button type="button" class="sp-row" data-act="term" data-v="${esc(t)}">${ic('search', 16)}<span>${esc(t)}</span></button>`).join('')}` : ''}
        ${cats.length ? `<p class="sp-t">Найти в категории</p>${cats.map((c) => `<button type="button" class="sp-row" data-act="nodeq" data-v="${esc(c)}">${ic('grid', 16)}<span>${esc(c)}</span></button>`).join('')}` : ''}
      </div>
      <div class="sp-r"><p class="sp-t">Популярные товары</p>${prods.length ? `<div class="sp-grid">${prods.map(spCard).join('')}</div>` : '<p class="c2">Подходящих товаров пока нет</p>'}</div></div>
      <div class="sp-foot"><button type="button" class="btn secondary" data-act="searchAll">Смотреть все результаты ${ic('right', 16)}</button></div>`;
  }
  let spT = null;
  function openSearch(form, typing) {
    const sp = document.getElementById('sp'); const q = form.q.value;
    document.body.classList.add('searching'); sp.hidden = false;
    if (typing) {
      sp.innerHTML = `<div class="wrap sp-wrap"><div class="sp-load"><span class="spin dark"></span><span class="c2">Ищем «${esc(q)}»</span></div></div>`;
      clearTimeout(spT); spT = setTimeout(() => { sp.innerHTML = `<div class="wrap sp-wrap">${spHtml(q)}</div>`; typo(sp); }, 220);
    } else { sp.innerHTML = `<div class="wrap sp-wrap">${spHtml(q)}</div>`; typo(sp); }
  }
  function keepSearch(el, change) {
    const inSp = !!el.closest('#sp'); const f0 = document.querySelector('[data-form=search]'); const q = f0 ? f0.q.value : '';
    const w0 = document.querySelector('.sp-wrap'); const y = w0 ? w0.scrollTop : 0;
    change();
    if (!inSp) return false;
    const f = document.querySelector('[data-form=search]'); f.q.value = q; openSearch(f, false);
    const w = document.querySelector('.sp-wrap'); if (w) w.scrollTop = y;
    return true;
  }
  function closeSearch() { clearTimeout(spT); document.querySelectorAll('.sp').forEach((s) => { s.hidden = true; }); document.body.classList.remove('searching'); }

  /* Примеры категорий печатаются в поле поиска, как на сайте */
  (function typePlaceholder() {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let timer;
    function syncMotion() {
      clearInterval(timer);
      let index = 0;
      let length = searchExamples[0].length;
      let deleting = true;
      let pause = 18;
      function show(text) {
        const input = document.querySelector('.hdr-search input');
        if (input && !input.value && document.activeElement !== input) input.placeholder = text;
      }
      show(searchExamples[0]);
      if (motion.matches) return;
      timer = setInterval(() => {
        if (pause > 0) { pause--; return; }
        const word = searchExamples[index];
        length += deleting ? -1 : 1;
        if (length > word.length) {
          deleting = true; length = word.length; pause = 18;
        } else if (length < 0) {
          deleting = false; length = 0; pause = 3;
          index = (index + 1) % searchExamples.length;
        } else {
          show(word.slice(0, length) || ' ');
        }
      }, 90);
    }
    motion.addEventListener('change', syncMotion);
    syncMotion();
  }());

  /* ---------- Подвал как на сайте ---------- */
  function footer(r) {
    const col = (k, title, items) => `<div class="fm"><button class="fm-t" data-act="foot" data-k="${k}" aria-expanded="${!!ui.footOpen[k]}">${title}<span class="hide-t-up">${ic(ui.footOpen[k] ? 'minus' : 'plus', 20)}</span></button><ul class="fm-l ${ui.footOpen[k] ? 'open' : ''}">${items.map((t) => `<li><a href="#/">${esc(t)}</a></li>`).join('')}</ul></div>`;
    return `<footer class="ftr ${r.name === 'checkout' ? 'hide-below-d' : ''}"><div class="wrap"><div class="ftr-grid">
      ${col('cat', 'Каталог объявлений', FOOT_CAT)}
      ${col('info', 'Информация', FOOT_INFO)}
      ${col('acc', 'Личный кабинет', ['Вход', 'Регистрация', 'Забыли пароль?'])}
      <div class="fm"><p class="fm-t">Мы в социальных сетях</p>
        <div class="soc"><a href="#/" aria-label="ВКонтакте"><img src="assets/vk-logo.svg" alt=""></a><a href="#/" aria-label="Телеграм"><img src="assets/tg.svg" alt=""></a><a href="#/" aria-label="YouTube"><img src="assets/ytube-logo.svg" alt=""></a><a href="#/" aria-label="Instagram"><img src="assets/ig.svg" alt=""></a></div>
        <button class="btn primary lg block ftr-add" data-act="soon" data-text="Продажа это отдельный сценарий, соберём его позже">Разместить объявление</button>
        <div class="apps"><a href="#/" aria-label="Google Play"><img src="assets/gplay.svg" alt="Google Play"></a><a href="#/" aria-label="RuStore"><img src="assets/rustore.svg" alt="RuStore"></a></div>
      </div>
    </div></div>
    <div class="ftr-end"><div class="wrap between"><span>Copyright © 2018-2026 <b class="sb">Miniatures Free Market</b></span><button class="row" data-act="toTop">${ic('up', 16)}Наверх</button></div></div></footer>`;
  }

  /* ---------- Карточки в списках ---------- */
  const cardList = (id) => { const o = byAny(id); return (o.photos && o.photos.length ? [o.img].concat(o.photos.slice(1)) : [o.img]).slice(0, 5); };
  const swap = (o) => { const n = cardList(o.id).length; return { attr: n > 1 ? `data-swap="${o.id}"` : '', dots: n > 1 ? `<span class="pc-dots">${Array.from({ length: n }, (_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</span>` : '' }; };
  const sellerName = (s) => `<span class="pc-sn">${esc(s.name)}<span class="pc-city">, г. ${esc(s.city)}</span></span>`;
  const revCount = (n) => `<span class="pc-rev" aria-label="${n} ${plural(n, 'отзыв', 'отзыва', 'отзывов')}">${ic('chat', 14)}<span>${n} ${plural(n, 'отзыв', 'отзыва', 'отзывов')}</span></span>`;
  const sellerRate = (s) => (s.reviews ? `<span class="pc-rate">${STAR}<b>${s.rating.toFixed(2)}</b>${revCount(s.reviews)}</span>` : '<span class="pc-rate"><span>Новый продавец</span></span>');
  const badgeList = (it) => { const v = SELLERS[it.seller]; const b = []; if (v.freeFrom) b.push({ k: 'free', i: 'truck', t: `Бесплатная доставка от ${fmt(v.freeFrom)}`, s: `0 ₽ от ${fmt(v.freeFrom)}` }); if (sellerSafe(v)) b.push({ k: 'safe', i: 'shield', t: 'Безопасная сделка', s: 'Безопасная сделка' }); return b; };
  const bdgTag = (b) => `<span class="bdg ${b.k}">${ic(b.i, 14)}<span class="bdg-l">${b.t}</span><span class="bdg-s">${b.s}</span></span>`;
  /* 25. Количество появляется вместо кнопки, при нуле кнопка возвращается */
  const qtyStep = (it, c, cls) => `<div class="step ${cls}" aria-label="Количество"><button data-act="cartQty" data-id="${it.id}" data-d="-1" aria-label="Меньше">${ic('minus', 16)}</button><input class="step-i" inputmode="numeric" aria-label="Количество" data-lineqty="${it.id}" value="${c.qty}"><button data-act="cartQty" data-id="${it.id}" data-d="1" ${c.qty >= it.stock ? 'disabled' : ''} aria-label="Больше">${ic('plus', 16)}</button></div>`;
  const ownEdit = (cls) => `<button type="button" class="btn ${cls}" data-act="soon" data-text="Редактирование объявления это блок продажи, соберём его отдельно"><span>Редактировать</span></button>`;
  const heart = (id, fav) => `<button class="pc-heart ${fav ? 'fav-on' : ''}" data-act="fav" data-id="${id}" aria-label="В избранное" aria-pressed="${fav}">${ic('heart', 20)}</button>`;
  function pcard(it, mini) {
    const s = SELLERS[it.seller]; const fav = S.favs.includes(it.id); const g = swap(it); const c = inCart(it.id);
    return `<article class="pc">
      <div class="pc-media" ${g.attr}>
        <a href="#/item/${it.id}" class="pc-img"><img loading="lazy" src="${it.img}" alt="${esc(it.title)}"></a>
        ${g.dots}
      </div>
      <div class="pc-body">
        <div class="pc-buy">
          <a href="#/item/${it.id}" class="pc-price">${fmt(it.price)}</a>
          <div class="pc-btns">
            ${isOwn(it) ? ownEdit('secondary sm pc-add pc-own') : `${heart(it.id, fav)}
            ${c ? qtyStep(it, c, 'sm pc-step') : `<button class="btn primary sm pc-add" data-act="addc" data-id="${it.id}" aria-label="В корзину">${ic('cart', 16)}<span>В корзину</span></button>`}`}
          </div>
        </div>
        <a href="#/item/${it.id}" class="pc-link">
          <span class="pc-title">${esc(it.title)}</span>
          ${mini ? '' : `${sellerName(s)}${sellerRate(s)}`}
        </a>
      </div>
    </article>`;
  }
  const URGENT_MS = 2 * 3600000;
  function acard(a) {
    const s = SELLERS[a.seller]; const fav = S.favs.includes(a.id); const g = swap(a);
    const end = T0 + a.hours * 3600000; const urgent = end - Date.now() <= URGENT_MS;
    return `<article class="pc">
      <div class="pc-media" ${g.attr}>
        <a href="#/lot/${a.id}" class="pc-img"><img loading="lazy" src="${a.img}" alt="${esc(a.title)}"></a>
        <span class="pc-timer ${urgent ? 'urgent' : ''}"><span class="tip down" data-tip="Аукцион" tabindex="0">${ic('gavel', 16)}</span><span data-end="${end}"></span></span>
        ${g.dots}
      </div>
      <div class="pc-body">
        <div class="pc-buy">
          <a href="#/lot/${a.id}" class="pc-price">${fmt(lotInfo(a).price)}</a>
          <div class="pc-btns">${heart(a.id, fav)}<a class="btn primary sm pc-add wide" href="#/lot/${a.id}"><span class="lab-long">Сделать ставку</span><span class="lab-short">Ставка</span></a></div>
        </div>
        <a href="#/lot/${a.id}" class="pc-link">
          <span class="pc-sub">${a.bids ? `${a.bids} ${plural(a.bids, 'ставка', 'ставки', 'ставок')}` : 'Ставок пока нет'}</span>
          <span class="pc-title">${esc(a.title)}</span>
          ${sellerName(s)}${sellerRate(s)}
        </a>
      </div>
    </article>`;
  }

  /* Крошки: на телефоне средняя часть пути прячется под «…» */
  function crumbs(parts) {
    const sep = ic('right', 12);
    const one = (p) => (p.a ? `<a href="#/catalog" ${p.a}>${esc(p.t)}</a>` : `<span>${esc(p.t)}</span>`);
    if (parts.length < 4) return `<nav class="crumbs" aria-label="Хлебные крошки">${parts.map(one).join(sep)}</nav>`;
    const mid = parts.slice(1, -1);
    return `<nav class="crumbs ${ui.crumbs ? 'open' : ''}" aria-label="Хлебные крошки">${one(parts[0])}${sep}<button class="cr-more" data-act="crumbs" aria-label="Показать весь путь">…</button><span class="cr-mid">${mid.map(one).join(sep)}</span><span class="cr-sep">${sep}</span>${one(parts[parts.length - 1])}</nav>`;
  }
  const HOME_C = { t: 'Главная', a: 'data-act="goHome"' };
  const CAT_C = { t: 'Каталог', a: 'data-act="node" data-top="" data-v=""' };

  /* ---------- Главная ---------- */
  const howBlock = (cls) => `<section class="${cls}"><div class="wrap">
        <h2 class="sec-t">Как проходит покупка</h2>
        <ol class="how">
          <li><span class="num">${ic('cart', 20)}</span><div><p class="how-t">1. Оформляете заказ</p><p>На этом шаге вы ничего не платите</p></div></li>
          <li><span class="num">${ic('shield', 20)}</span><div><p class="how-t">2. Продавец подтверждает</p><p>Проверяет наличие и доставку. На ответ у него 48 часов</p></div></li>
          <li><span class="num">${ic('card', 20)}</span><div><p class="how-t">3. Вы оплачиваете</p><p>Переводите деньги напрямую продавцу и прикладываете чек к заказу</p></div></li>
          <li><span class="num">${ic('truck', 20)}</span><div><p class="how-t">4. Получаете и оцениваете</p><p>Статус заказа виден в личном кабинете, а отзыв помогает другим покупателям</p></div></li>
        </ol>
      </div></section>`;
  function pageHome() {
    const hits = { Все: ['strudd', 'darkshroud', 'prisoners', 'yucatan', 'trukk', 'zeratul', 'skorpekh', 'brutalis'], Варгеймы: ['trukk', 'zeratul', 'warriors', 'skorpekh', 'lutazy', 'terminators', 'brutalis', 'darkshroud'], 'Ролевые игры': ['strudd', 'assassins', 'prisoners'], 'Настольные игры': ['yucatan', 'arkham', 'zombicide'] };
    const popular = ITEMS.filter((i) => !hits['Все'].includes(i.id)).slice(0, 4);
    const sellers = [
      ['pocket', ['strudd', 'assassins']],
      ['lexx', ['a-redemptor', 'a-deathwatch']],
      ['krsk', ['arkham', 'zombicide']],
      ['wolf', ['terminators', 'brutalis']],
    ];
    const events = HOME.events.slice(0, 3);
    const clubs = HOME.clubs.slice(0, 3);
    const soon = (t) => `data-act="soon" data-text="${t}"`;
    return `<h1 class="vh">Свободный Рынок Миниатюр: маркет миниатюр, настольных и карточных игр</h1>
      <section class="adv"><div class="wrap adv-in">
        <div class="adv-i">${ic('shield', 24)}<span><b>Работаем с 2018 года</b><span>маркет сообщества</span></span></div>
        <div class="adv-i">${ic('user', 24)}<span><b>60\u00a0000+ человек в месяц</b><span>покупают и продают на СРМ</span></span></div>
        <div class="adv-i hide-m-only">${ic('card', 24)}<span><b>Оплата напрямую продавцу</b><span>после подтверждения заказа</span></span></div>
      </div></section>
      <section class="band first"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Текущие аукционы</h2><a class="link row-l" href="#/catalog" data-act="tab" data-v="auc">Посмотреть все ${ic('right', 16)}</a></div>
        <div class="scroller">${AUCTIONS.map(acard).join('')}</div>
      </div></section>
      <section class="band white"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Популярные категории</h2><a class="link row-l" href="#/catalog" data-act="node" data-top="" data-v="">Посмотреть все ${ic('right', 16)}</a></div>
        <div class="tiles">${HOME.cats.map((c) => `<a class="tile" href="#/catalog" data-act="nodeq" data-v="${esc(c.t)}"><img loading="lazy" src="${c.img}" alt=""><span>${esc(c.t)}</span></a>`).join('')}</div>
      </div></section>


      <section class="band"><div class="wrap">
        <div class="sec-hd wrap-hd"><h2 class="sec-t">Новые объявления</h2>
          <div class="tabs-seg scroll-x">${Object.keys(hits).map((k) => `<button class="${ui.homeTab === k ? 'on' : ''}" data-act="homeTab" data-v="${k}">${k}</button>`).join('')}</div></div>
        <div class="grid">${hits[ui.homeTab].slice(0, 4).map((id) => pcard(byId(id))).join('')}</div>
        <div class="center"><a class="btn secondary lg" href="#/catalog" data-act="node" data-top="" data-v="">Посмотреть все объявления</a></div>
      </div></section>

      <section class="band band-next"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Популярные объявления</h2><a class="link row-l" href="#/catalog" data-act="homePop">Посмотреть все ${ic('right', 16)}</a></div>
        <div class="grid">${popular.map((x) => pcard(x)).join('')}</div>
      </div></section>
      ${howBlock('band white')}

      <section class="band"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Продавцы с лучшими отзывами</h2><a class="link row-l" href="#/" ${soon('Раздел «Продавцы» соберём отдельным блоком')}>Посмотреть все ${ic('right', 16)}</a></div>
        <div class="sell-row">${sellers.map(([k, ids]) => { const s = SELLERS[k]; return `<article class="sell-c"><a href="#/" ${soon('Страницу продавца соберём отдельным блоком')} class="sell-h"><span class="ava">${esc(s.name[0])}</span><span class="sell-b"><span class="row"><span class="sb">${esc(s.name)}</span>${s.pro ? '<span class="tag pro">PRO</span>' : ''}</span><span class="t12 c2">г.\u00a0${esc(s.city)}</span><span class="pc-rate">${STAR}<b>${s.rating.toFixed(2)}</b>${revCount(s.reviews)}</span></span></a><div class="sell-items">${ids.map((id) => { const o = byAny(id); return `<a href="#/${AUCTIONS.some(a => a.id === id) ? 'lot' : 'item'}/${id}"><img loading="lazy" src="${o.img}" alt=""><span class="sell-p">${fmt(o.price)}</span><span class="sell-t">${esc(o.title)}</span></a>`; }).join('')}</div></article>`; }).join('')}</div>
      </div></section>

      <section class="band white"><div class="wrap comm">
        <div><div class="sec-hd"><h2 class="sec-t">Клубы</h2><a class="link row-l" href="#/" ${soon('Клубы соберём отдельным блоком')}>Посмотреть все ${ic('right', 16)}</a></div>
          <ul class="comm-l">${clubs.map((c) => `<li><a href="#/" ${soon('Страницу клуба соберём отдельным блоком')}><img loading="lazy" src="${c.img}" alt=""><span><b>${esc(c.t)}</b><span class="t12 c3">${esc(c.place)}</span></span></a></li>`).join('')}</ul></div>
        <div><div class="sec-hd"><h2 class="sec-t">Мероприятия клубов</h2><a class="link row-l" href="#/" ${soon('Мероприятия соберём отдельным блоком')}>Посмотреть все ${ic('right', 16)}</a></div>
          <ul class="comm-l">${events.map((c) => `<li><a href="#/" ${soon('Страницу мероприятия соберём отдельным блоком')}><img loading="lazy" src="${c.img}" alt=""><span><b>${esc(c.t)}</b><span class="t12 c3">${esc(c.place)}${c.when ? `, ${esc(c.when)}` : ''}</span></span></a></li>`).join('')}</ul></div>
      </div></section>

      <section class="band"><div class="wrap"><div class="promo">
        <div class="promo-t"><h2>Есть что продать?</h2><p>Разместите объявление и его увидят игроки и коллекционеры</p><button class="btn primary lg" ${soon('Продажа это отдельный сценарий, соберём его позже')}>Разместить объявление</button></div>
        <img class="promo-f" src="assets/sell-banner.png" width="1672" height="941" alt="" loading="lazy">
      </div></div></section>`;
  }

  /* ---------- Каталог ---------- */
  const catalogDisplayOrder = ['a-leman', 'a-guilliman', 'a-redemptor', 'strudd', 'darkshroud', 'prisoners', 'yucatan', 'trukk', 'zeratul', 'skorpekh', 'brutalis', 'worldeaters'];
  const catalogRank = new Map(catalogDisplayOrder.map((id, index) => [id, index]));
  function catalogList(src) {
    const c = src || S.cat; const q = c.q.trim().toLowerCase();
    let list = [];
    if (c.tab !== 'auc') list = list.concat(ITEMS.map((i) => ({ t: 'i', o: i })));
    if (c.tab !== 'goods') list = list.concat(AUCTIONS.map((a) => ({ t: 'a', o: a })));
    const hit = ({ o }) => {
      if (c.node) { const n = c.node.toLowerCase(); if (!(o.cat.toLowerCase() === n || o.top.toLowerCase() === n || (o.crumbs || []).some((x) => x.toLowerCase() === n))) return false; }
      if (q && !(o.title.toLowerCase().includes(q) || o.cat.toLowerCase().includes(q))) return false;
      if (c.min && o.price < +c.min) return false;
      if (c.max && o.price > +c.max) return false;
      if (c.city !== 'Все' && SELLERS[o.seller].city !== c.city) return false;
      for (const f of FILTERS) { const sel = c.f[f.k]; if (sel && sel.length && !sel.includes(spec(o, f.spec))) return false; }
      return true;
    };
    list = list.filter(hit);
    if (c.sort === 'new' || c.sort === 'old') {
      const rank = (entry) => catalogRank.get(entry.o.id) ?? catalogRank.size;
      list.sort((a, b) => rank(a) - rank(b));
    }
    if (c.sort === 'cheap') list.sort((a, b) => a.o.price - b.o.price);
    if (c.sort === 'dear') list.sort((a, b) => b.o.price - a.o.price);
    if (c.sort === 'old') list.reverse();
    return list;
  }
  function activeFilters(src) {
    const c = src || S.cat; const o = [];
    if (c.node) o.push({ l: c.node, k: 'node' });
    if (c.q) o.push({ l: `Поиск: ${c.q}`, k: 'q' });
    if (c.min || c.max) o.push({ l: `Цена ${c.min ? 'от ' + c.min : ''} ${c.max ? 'до ' + c.max : ''}`.trim(), k: 'price' });
    if (c.city !== 'Все') o.push({ l: c.city, k: 'city' });
    if (c.country !== 'Все') o.push({ l: c.country, k: 'country' });
    Object.keys(c.f).forEach((k) => (c.f[k] || []).forEach((v) => o.push({ l: v, k: 'f', g: k, v })));
    return o;
  }
  const fOn = (k) => { const c = S.cat; if (k === 'cat') return !!c.node; if (k === 'price') return !!(c.min || c.max); if (k === 'geo') return c.city !== 'Все' || c.country !== 'Все'; return !!(c.f[k] && c.f[k].length); };
  /* На десктопе подсказка применяет изменённые фильтры к выдаче */
  function pend(sel) { if (!catalogDesktop.matches) return; if (!ui.applied) ui.applied = JSON.parse(JSON.stringify(S.cat)); ui.fTip = sel; }
  function placeTip() {
    const t = document.getElementById('fltTip'); if (!t) return;
    const a = ui.fTip && document.querySelector(ui.fTip); if (!a) { t.hidden = true; return; }
    const box = a.closest('label') || a; const r = box.getBoundingClientRect(); const side = document.querySelector('.cat-side').getBoundingClientRect();
    const hide = r.top < side.top - 4 || r.bottom > side.bottom + 4;
    t.hidden = hide; t.style.top = `${Math.round(r.top + r.height / 2 - t.offsetHeight / 2)}px`; t.style.left = `${Math.round(side.right + 12)}px`;
  }
  const mobileFilterOpen = (k) => mobileFilterSections[k] ?? ['sort', 'cat', 'price', 'seller', 'safe'].includes(k);
  function fsec(k, title, body, mobile) {
    const color = fOn(k) ? 'on' : '';
    const open = !mobile || mobileFilterOpen(k);
    const head = mobile
      ? `<button class="flt-t ${color}" data-act="fltT" data-k="${k}" aria-expanded="${open}">${ic(open ? 'down' : 'right', 16)}${title}</button>`
      : `<h2 class="flt-t ${color}">${title}</h2>`;
    return `<section class="flt" data-filter-group="${k}">${head}${open ? `<div class="flt-b">${body}</div>` : ''}</section>`;
  }
  const chks = (g, opts) => `<div class="stack-4">${opts.map((t) => `<label class="chk"><input type="checkbox" data-act-chg="flt" data-g="${g}" value="${esc(t)}" ${(S.cat.f[g] || []).includes(t) ? 'checked' : ''}><span class="box">${ic('check', 14)}</span><span>${esc(t)}</span></label>`).join('')}</div>`;
  /* Путь до категории: верхний раздел, подраздел, третий уровень */
  function nodePath(n) {
    let out = null;
    if (!n) return null;
    catalogCategories.forEach((m) => {
      if (m.t === n && !out) out = { top: m };
      m.groups.forEach((g) => g.items.forEach((i) => {
        if (i.t === n && !out) out = { top: m, group: g, l2: i };
        (i.sub || []).forEach((x) => { if (x === n && !out) out = { top: m, group: g, l2: i, l3: x }; });
      }));
    });
    return out;
  }
  function catTree() {
    const lim = 5;
    const n = S.cat.node; const p = nodePath(n);
    const link = (t, v, cls) => `<a class="ct ${cls || ''}" href="#/catalog" data-act="nodef" data-v="${esc(v)}">${cls === 'up' ? ic('left', 16) : ''}<span>${esc(t)}</span>${cls === 'kid more' ? ic('right', 14) : ''}</a>`;
    const grp = (t, top, cls) => `<a class="ct ${cls}" href="#/catalog" data-act="nodeg" data-top="${esc(top)}" data-v="${esc(t)}">${cls === 'up' ? ic('left', 16) : ''}<span>${esc(t)}</span>${cls === 'kid more' ? ic('right', 14) : ''}</a>`;
    const items = (list, key, cls, subOf) => {
      const idx = list.indexOf(n); if (idx >= lim) ui.mmMore[key] = true;
      const res = limited(list, key, lim);
      return res.list.map((t) => link(t, t, t === n ? 'kid cur' : subOf && subOf(t) ? 'kid more' : cls)).join('') + moreBtn(key, res.more);
    };
    const hasSub = (m) => (t) => { const f = findL2(m, t); return !!(f && f.sub); };
    if (!p) {
      const names = catalogCategories.map(section => section.t);
      return items(names, 'ct-all', 'root', t => catalogCategories.find(section => section.t === t).groups.length);
    }
    const m = p.top; const named = m.groups.filter((g) => g.t).length > 1;
    let html = link('Все категории', '', 'up');
    if (!p.l2) {
      const g = S.cat.grp && m.groups.find((x) => x.t === S.cat.grp);
      if (g) return html + link(m.t, m.t, 'up') + grp(g.t, m.t, 'cur') + items(g.items.map((x) => x.t), `ct-${g.t}`, 'kid', hasSub(m));
      html += link(m.t, m.t, 'cur');
      if (named) {
        const heads = m.groups.filter((x) => x.t);
        const rest = m.groups.filter((x) => !x.t).reduce((a, x) => a.concat(x.items.map((i) => i.t)), []);
        return html + heads.map((x) => grp(x.t, m.t, 'kid more')).join('') + (rest.length ? items(rest, `ct-${m.t}-r`, 'kid', hasSub(m)) : '');
      }
      return html + items(m.groups.reduce((a, x) => a.concat(x.items.map((i) => i.t)), []), `ct-${m.t}`, 'kid', hasSub(m));
    }
    html += link(m.t, m.t, 'up');
    if (named && p.group.t) html += grp(p.group.t, m.t, 'up');
    if (p.l3) return html + link(p.l2.t, p.l2.t, 'up') + items(p.l2.sub, `ct-${p.l2.t}`, 'kid');
    if (p.l2.sub) return html + link(p.l2.t, p.l2.t, 'cur') + items(p.l2.sub, `ct-${p.l2.t}`, 'kid');
    return html + items(p.group.items.map((x) => x.t), `ct-${m.t}-g`, 'kid', hasSub(m));
  }
  const FTITLE = { cat: 'Категория', price: 'Цена, ₽', seller: 'Продавец', safe: 'Безопасность', geo: 'Страна и город' };
  FILTERS.forEach((f) => { FTITLE[f.k] = f.t; });
  function fBody(k) {
    const c = S.cat;
    if (k === 'cat') return `<div class="ct-list">${catTree()}</div>`;
    if (k === 'price') return `<div class="row"><input class="inp" inputmode="numeric" placeholder="от 1" aria-label="Цена от" data-cat="min" value="${esc(c.min)}"><input class="inp" inputmode="numeric" placeholder="до 690 000" aria-label="Цена до" data-cat="max" value="${esc(c.max)}"></div>`;
    if (k === 'seller') return chks('seller', SELLER_TYPES);
    if (k === 'safe') return chks('safe', SAFE);
    if (k === 'geo') return `<div class="stack-8">${dd('country', c.country, COUNTRIES, { search: true, aria: 'Страна' })}${dd('city', c.city, ['Все'].concat(CITIES), { search: true, aria: 'Город' })}</div>`;
    const f = FILTERS.find((x) => x.k === k);
    return chks(f.k, f.o);
  }
  function filtersHtml(mobile = false) {
    return ['cat', 'price', 'seller', 'safe', 'geo'].concat(FILTERS.map((f) => f.k)).map((k) => fsec(k, FTITLE[k], fBody(k), mobile)).join('');
  }
  const showFilterResults = () => `Показать ${catalogList().length}`;
  function filterSheet(group) {
    const full = group === 'all';
    const title = full ? 'Фильтры' : FTITLE[group];
    const sort = window.innerWidth < 768 ? fsec('sort', 'Сортировка', dd('sort', S.cat.sort, SORTS, { aria: 'Сортировка' }), true) : '';
    return `<div class="scrim" data-act="closeFilters"><div class="modal filter-modal" role="dialog" aria-modal="true" aria-labelledby="filterTitle" data-stop>
      <div class="modal-hd"><h2 class="h3" id="filterTitle">${title}</h2><button class="icon-btn" data-act="closeFilters" aria-label="Закрыть">${ic('x')}</button></div>
      <div class="modal-bd">${full ? sort + filtersHtml(true) : fBody(group)}</div>
      <div class="modal-ft flt-ft"><button class="btn primary lg block" data-act="closeFilters" id="filterResults">${showFilterResults()}</button>
        ${full ? `<div class="flt-ft2"><button class="btn ghost sm" data-act="resetCat">Сбросить</button><button class="btn secondary sm" data-act="saveSearch">${ic('save', 16)}Сохранить поиск</button></div>` : ''}
      </div>
    </div></div>`;
  }
  function openFilters(group) {
    ui.modal = { filters: group }; overlay();
    ovEl.querySelector('.filter-modal .modal-hd button').focus();
  }
  const clampRow = (k, html, cls = '') => `<div class="clamp-box"><div class="clamp ${cls} ${ui.clamp[k] ? 'open' : ''}" data-clamp="${k}">${html}</div><button class="clamp-btn" data-act="clampT" data-k="${k}" hidden>${ui.clamp[k] ? 'Скрыть' : 'Показать ещё'}</button></div>`;
  function clampFit() {
    document.querySelectorAll('[data-clamp]').forEach((el) => {
      const b = el.parentNode.querySelector('.clamp-btn');
      b.hidden = !(ui.clamp[el.dataset.clamp] || el.scrollHeight > el.clientHeight + 2);
    });
  }
  function nodeCrumbs(n) {
    const p = nodePath(n); if (!n) return [];
    if (!p) return [{ t: n }];
    const chain = [p.top.t, p.l2 && p.l2.t, p.l3].filter(Boolean);
    return chain.map((t, i) => (i === chain.length - 1 ? { t } : { t, a: `data-act="nodef" data-v="${esc(t)}"` }));
  }
  function pageCatalog() {
    const c = S.cat; const src = ui.applied || S.cat; const list = catalogList(src); const act = activeFilters(src);
    const count = `${list.length} ${plural(list.length, 'объявление', 'объявления', 'объявлений')}`;
    return `<div class="wrap page purchase-catalog">
      ${crumbs([HOME_C, CAT_C].concat(nodeCrumbs(c.node)))}
      <div class="between" style="margin-bottom:12px"><h1 class="h1">${c.q ? `Поиск: ${esc(c.q)}` : esc(c.node || 'Каталог')}</h1><span class="c3 cat-count">${count}</span></div>
      ${clampRow('tags', TAGS.map((t) => `<button class="chip plain" data-act="tagq" data-v="${t}">${t}</button>`).join(''), 'one')}
      <div class="cat-layout">
        ${ui.fTip && ui.applied ? `<div class="flt-tip" id="fltTip"><button class="btn primary sm" data-act="fltApply">${showFilterResults()}</button></div>` : ''}
        <aside class="cat-side" aria-label="Фильтры">${filtersHtml()}<div class="flt-act"><button class="btn ghost sm" data-act="resetCat">Сбросить</button><button class="btn secondary sm" data-act="saveSearch">${ic('save', 16)}Сохранить поиск</button></div></aside>
        <div>
          <div class="cat-bar">
            <div class="tabs-seg cat-tabs" role="tablist">${[['all', 'Все'], ['goods', 'Товары'], ['auc', 'Аукционы']].map(([k, l]) => `<button role="tab" aria-selected="${c.tab === k}" class="${c.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div>
            ${act.length ? '' : `<button class="btn hide-d cat-flt" data-act="filters" aria-haspopup="dialog">${ic('filter', 16)}Фильтры</button>`}
            <div class="view-tg hide-t-up" role="group" aria-label="Вид выдачи"><button class="${c.view === 'two' ? 'on' : ''}" data-act="view" data-v="two" aria-label="По две карточки в ряд" aria-pressed="${c.view === 'two'}">${ic('grid', 20)}</button><button class="${c.view === 'one' ? 'on' : ''}" data-act="view" data-v="one" aria-label="Список, по одной в ряд" aria-pressed="${c.view === 'one'}">${ic('list', 20)}</button></div>
            <div class="sp-auto row catalog-sort">${dd('sort', c.sort, SORTS, { aria: 'Сортировка' })}</div>
          </div>
          ${act.length ? `<div class="act-f"><button class="af-filter hide-d" data-act="filters" aria-haspopup="dialog" aria-label="Фильтры, применено ${act.length}">${ic('filter', 18)}<span class="badge-n">${act.length}</span></button>${act.map((a, i) => `<span class="chip plain af"><button data-act="fEdit" data-i="${i}">${esc(a.l)}</button><button class="af-x" data-act="dropF" data-i="${i}" aria-label="Убрать фильтр">${ic('x', 14)}</button></span>`).join('')}<button class="linkbtn" data-act="resetCat">Сбросить все</button></div>` : ''}
          ${list.length ? `<div class="grid g3 ${c.view === 'one' ? 'as-list' : ''}">${list.map((x) => (x.t === 'i' ? pcard(x.o) : acard(x.o))).join('')}</div>`
            : `<div class="empty"><div class="ico">${ic('search', 28)}</div><p class="h3">По вашему запросу ничего не найдено</p><p class="c2" style="margin:4px 0 16px">Попробуйте другой запрос или снимите фильтры</p><button class="btn secondary" data-act="resetCat">Сбросить фильтры</button></div>`}
        </div>
      </div>
    </div>`;
  }

  /* ---------- Карточка товара ---------- */
  function gallery(it) {
    const p = it.photos; const multi = p.length > 1;
    return `<div class="gal ${multi ? '' : 'single'}">
      ${multi ? `<div class="gal-thumbs">${p.map((src, i) => `<button class="${i === ui.photo ? 'on' : ''}" data-act="photo" data-i="${i}" aria-label="Фото ${i + 1}"><img src="${src}" alt=""></button>`).join('')}</div>` : ''}
      <div class="gal-view">
        <div class="gal-strip" id="strip">${p.map((src, i) => `<button data-act="lb" data-i="${i}" aria-label="Открыть фото ${i + 1}"><img src="${src}" alt="${esc(it.title)}, фото ${i + 1}"></button>`).join('')}</div>
        ${multi ? `<span class="gal-count" id="galCount">${ui.photo + 1} / ${p.length}</span>
        <button class="gal-nav prev" data-act="photoStep" data-d="-1" aria-label="Предыдущее фото">${ic('left')}</button>
        <button class="gal-nav next" data-act="photoStep" data-d="1" aria-label="Следующее фото">${ic('right')}</button>` : ''}
      </div>
    </div>`;
  }
  function sellerCard(it) {
    const s = SELLERS[it.seller];
    const statsKey = 'seller-' + it.seller;
    const expanded = !!ui.opened[statsKey];
    const moreStats = [['Подписчики', s.followers], ['Выполнено заказов', s.done], ['Сделано покупок', s.purchases], ['Срок ожидания оплаты', s.payWait]];
    const reviewsTxt = s.reviews ? `${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}` : 'Отзывов пока нет';
    const own = isOwn(it); const subd = (S.subs || []).includes(it.seller); const blkd = (S.blks || []).includes(it.seller);
    const page = 'data-act="soon" data-text="Страницу продавца соберём отдельным блоком"';
    return `<section class="card seller" aria-label="Продавец">
      <div class="seller-hd">
        <span class="ava">${esc(s.name[0])}</span>
        <div style="min-width:0;flex:1">
          <div class="row"><a class="sb" href="#/" ${page}>${esc(s.name)}</a>${s.pro ? '<span class="tag pro">PRO</span>' : ''}</div>
          <div class="rate-row"><span>г.\u00a0${esc(s.city)}</span>${rating(s)}${s.reviews ? `<a class="link" href="#/reviews/${it.seller}" target="_blank">${reviewsTxt}</a>` : `<span>${reviewsTxt}</span>`}</div>
        </div>
      </div>
      <dl class="seller-stats" id="seller-stats">
        <div><dt>На площадке</dt><dd>${esc(s.stazh)}</dd></div>
        <div><dt>Срок отправки</dt><dd>до ${esc(s.shipWait)}</dd></div>
        <div><dt>Вероятность задержки</dt><dd>${s.late}%</dd></div>
        ${expanded ? moreStats.filter(([, value]) => value != null).map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(String(value))}</dd></div>`).join('') : ''}
      </dl>
      <button type="button" class="linkbtn seller-more" aria-controls="seller-stats" data-act="${expanded ? 'close' : 'open'}" data-k="${statsKey}" aria-expanded="${expanded}">${expanded ? 'Свернуть' : 'Показать всё'} ${ic(expanded ? 'up' : 'down', 16)}</button>
      <div class="seller-act">
        ${own ? '' : isAuth() ? `<button class="seller-l ${subd ? 'on' : ''}" data-act="sub" data-id="${it.seller}" aria-pressed="${subd}">${ic('bell', 24)}<span>${subd ? 'Вы подписаны' : 'Подписаться'}</span></button>` : `<button class="seller-l" data-act="loginFor" data-text="Войдите, чтобы подписаться: новые объявления продавца будут приходить в уведомления">${ic('bell', 24)}<span>Подписаться</span></button>`}
        <a class="seller-l" href="#/" ${page}>${ic('grid', 24)}<span>Все товары</span></a>
        ${own ? '' : isAuth() ? `<button class="seller-l ${blkd ? 'on' : ''}" data-act="blk" data-id="${it.seller}" aria-pressed="${blkd}">${ic('block', 24)}<span>${blkd ? 'Заблокирован' : 'Заблокировать'}</span></button>` : `<button class="seller-l" data-act="loginFor" data-text="Войдите, чтобы заблокировать продавца: его объявления перестанут вам показываться">${ic('block', 24)}<span>Заблокировать</span></button>`}
      </div>
    </section>`;
  }
  const stockTxt = (it) => `В наличии: ${it.stock} шт.`;
  const favBtn = (it, fav) => `<button class="icon-btn line lg ${fav ? 'fav-on' : ''}" data-act="fav" data-id="${it.id}" aria-label="В избранное" aria-pressed="${fav}">${ic('heart', 22)}</button>`;
  function buyBlock(it) {
    const s = SELLERS[it.seller]; const out = S.flags.soldOut; const c = inCart(it.id); const fav = S.favs.includes(it.id);
    const dl = s.deliveries.map((d) => DELIVERY[d].title).join(', ');
    const pay = s.pay.filter((p) => p !== 'cash' || s.deliveries.includes('pickup')).map((p) => PAYWAY[p].title).join(', ');
    return `<div class="buy-top">
        <a class="c3 t12" href="#/catalog" data-act="nodeq" data-v="${esc(it.cat)}">${esc(it.cat)}</a>
        <h1 class="pdp-title">${esc(it.title)}</h1>
      </div>
      ${isOwn(it) ? `<div class="note info">${ic('info')}<div class="body">Это ваше объявление: покупатели видят здесь кнопку покупки</div></div>` : ''}
      <div class="buy-price">
        <div class="price-big">${fmt(it.price)}</div>
        ${out ? `<span class="stock no">${ic('x', 16)}Нет в наличии</span>` : `<span class="stock">${ic('check', 16)}${stockTxt(it)}</span>`}
        ${!out && badgeList(it).length ? `<div class="buy-badges">${badgeList(it).map(bdgTag).join('')}</div>` : ''}
      </div>
      <div class="hide-m-cta">
        ${isOwn(it) ? `<div class="buy-cta">${ownEdit('secondary lg')}</div>`
          : out ? `<div class="buy-cta"><a class="btn secondary lg" href="#/catalog" data-act="nodeq" data-v="${esc(it.cat)}">Похожие товары</a>${favBtn(it, fav)}</div>`
          : `<div class="buy-cta">
            ${c ? `${qtyStep(it, c, 'lg')}<a class="btn incart lg" href="#/cart">Перейти в корзину</a>` : `<button class="btn primary lg" data-act="add" data-id="${it.id}">Добавить в корзину</button>`}
            ${favBtn(it, fav)}
          </div>`}
      </div>
      <ul class="facts">
        <li>${ic('truck')}<span><b>Доставка.</b> ${esc(dl)}</span></li>
        <li>${ic('card')}<span><b>Оплата.</b> ${esc(pay)}. Платите продавцу напрямую, когда он подтвердит заказ</span></li>
      </ul>`;
  }

  /* Текст продавца: абзацы, списки и подзаголовки */
  function descBlocks(lines) {
    const out = []; let i = 0;
    const src = (lines || []).filter((l) => !/^Свободный Рынок Миниатюр\s*-/.test(l)).map((l) => l.replace(/(\d)\s*e\b/g, '$1 ₽'));
    while (i < src.length) {
      let l = src[i];
      if (/^[-–•]\s*/.test(l)) { const li = []; while (i < src.length && /^[-–•]\s*/.test(src[i])) { li.push(src[i].replace(/^[-–•]\s*/, '')); i += 1; } out.push({ k: 'ul', li }); continue; }
      if (/скидка$/.test(l) && src[i + 1]) { l = `${l} ${src[i + 1]}`; i += 1; }
      if ((l.length < 44 && !/[.!)?]$/.test(l)) || (/:$/.test(l) && l.length < 60)) out.push({ k: 'h', t: l.replace(/:$/, '') });
      else out.push({ k: 'p', t: l });
      i += 1;
    }
    return out;
  }
  function descHtml(it) {
    const blocks = descBlocks(it.text || it.desc);
    const chars = blocks.reduce((a, b) => a + (b.t ? b.t.length : b.li.join('').length), 0);
    const long = chars > 520; const open = ui.descOpen || !long;
    const html = blocks.map((b) => (b.k === 'h' ? `<h3 class="d-h">${esc(b.t)}</h3>` : b.k === 'ul' ? `<ul class="d-ul">${b.li.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="d-p">${esc(b.t)}</p>`)).join('');
    return `<div class="d-text ${open ? '' : 'clamped'}">${html}</div>${long ? `<button class="linkbtn" style="margin-top:8px" data-act="descT">${open ? 'Свернуть' : 'Показать полностью'} ${ic(open ? 'up' : 'down', 16)}</button>` : ''}`;
  }
  const ITEM_TAGS = { // пример
    strudd: ['#3d_печать', '#32_мм', '#miniature', '#boss'], trukk: ['#boyz', '#gretchin', '#army'], zeratul: ['#miniature', '#games'], worldeaters: ['#army', '#grimdark', '#10th_edition'],
    warriors: ['#army', '#grimdark', '#10th_edition'], skorpekh: ['#boss', '#grimdark', '#miniature'], lutazy: ['#boyz', '#bits'], terminators: ['#army', '#10th_edition'],
    brutalis: ['#miniature', '#10th_edition'], darkshroud: ['#miniature', '#10th_edition'], yucatan: ['#games'], arkham: ['#games'], zombicide: ['#games', '#miniature'],
    assassins: ['#3d_печать', '#32_мм', '#miniature'], prisoners: ['#3d_печать', '#28_мм', '#miniature'],
  };
  const COMMENTS = [ // пример
    { who: 'User51234', date: '02 ноября 2026', text: 'Подскажите, база идёт в комплекте или её нужно докупать отдельно?', replies: [{ who: 'PocketSized Prints', seller: true, date: '02 ноября 2026', text: 'База в комплекте, миниатюра с базой на 32 мм.' }, { who: 'User51234', date: '03 ноября 2026', text: 'Спасибо!' }] },
    { who: 'GriinWan', date: '28 октября 2026', text: 'Можно напечатать в другом масштабе?', replies: [{ who: 'PocketSized Prints', seller: true, date: '28 октября 2026', text: 'Да, напишите в комментарии к заказу, какой масштаб нужен.' }] },
  ];
  const LOT_COMMENTS = [{ who: 'User51234', date: '05 ноября 2026', text: 'Подскажите, доставка до Москвы возможна?', replies: [{ who: 'Продавец', seller: true, date: '05 ноября 2026', text: 'Да, отправлю СДЭК или Яндекс Доставкой.' }] }]; // пример
  const cmList = (id) => S.comments[id] || (id === 'strudd' ? COMMENTS : (AUCTIONS.some((a) => a.id === id) ? LOT_COMMENTS : []));
  const cmItem = (c, i, reply) => `<article class="cm ${reply ? 'reply' : ''}"><span class="ava sm">${esc(c.who[0])}</span><div><div class="row"><span class="sb">${esc(c.who)}</span>${c.seller ? '<span class="tag mute">Продавец</span>' : ''}<span class="t12 c3">${esc(c.date)}</span></div><p>${esc(c.text)}</p>${!reply && isAuth() ? `<button class="linkbtn t12" data-act="replyT" data-i="${i}">Ответить</button>` : ''}</div></article>`;
  /* Разбивка по звёздам примерная: на сайте хранятся средний балл и число положительных и отрицательных */
  function starDist(s) {
    const n = s.reviews; const one = Math.ceil(s.neg * 0.7); const two = s.neg - one; const rest = n - s.neg;
    const need = Math.round(s.rating * n) - one - two * 2;
    const five = Math.max(0, Math.min(rest, need - rest * 4)); const four = rest - five;
    return [five, four, 0, two, one];
  }
  function revSummary(s) {
    const d = starDist(s); const max = Math.max.apply(null, d) || 1;
    return `<div class="rev-sum"><div class="rev-avg"><span class="big">${s.rating.toFixed(2)}</span><span class="t12 c2">${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}</span></div>
      <div class="rev-bars">${d.map((v, i) => `<div class="rev-b"><span>${5 - i}</span>${STAR}<i><u style="width:${Math.round((v / max) * 100)}%"></u></i><span class="c2">${v}</span></div>`).join('')}</div></div>`;
  }
  function reviewsBody(revs, summary, more) {
    const sorted = revs.slice();
    if (ui.revSort === 'old') sorted.reverse();
    if (ui.revSort === 'good') sorted.sort((a, b) => Number(b.good) - Number(a.good));
    if (ui.revSort === 'bad') sorted.sort((a, b) => Number(a.good) - Number(b.good));
    return `${summary}
        ${revs.length > 1 ? `<div class="rev-bar">${dd('rev', ui.revSort, [['new', 'Сначала новые'], ['old', 'Сначала старые'], ['good', 'Сначала с высокой оценкой'], ['bad', 'Сначала с низкой оценкой']], { aria: 'Сортировка отзывов' })}</div>` : ''}
        ${sorted.map((v) => `<article class="rev"><div class="between"><span class="row"><span class="sb">${esc(v.who)}</span>${!v.good ? '<span class="tag mute">Заказ отменён</span>' : ''}</span><span class="t12 c3">${esc(v.date)}</span></div><div class="rev-st" aria-label="Оценка ${v.good ? 5 : 1} из 5">${[1, 2, 3, 4, 5].map((x) => `<span class="${x <= (v.good ? 5 : 1) ? 'on' : ''}">${STAR}</span>`).join('')}</div><p>${esc(v.text)}</p></article>`).join('')}
        ${more}`;
  }
  function pageSellerReviews(r) {
    const s = SELLERS[r.id] || SELLERS.pocket; const revs = REVIEWS[r.id] || [];
    const more = s.reviews > revs.length ? '<button class="btn secondary" style="margin-top:8px" data-act="soon" data-text="В прототипе показаны примеры отзывов">Показать все отзывы</button>' : '';
    return `<div class="wrap page">
      ${crumbs([HOME_C, { t: s.name }, { t: 'Отзывы' }])}
      <h1 class="h1">Отзывы о продавце</h1>
      <div class="row rev-who"><span class="sb">${esc(s.name)}</span>${s.pro ? '<span class="tag pro">PRO</span>' : ''}<span class="c2">г.\u00a0${esc(s.city)}</span></div>
      <section class="card rev-page">${s.reviews ? reviewsBody(revs, revSummary(s), more) : `<p class="c2">У этого продавца пока нет отзывов. Он на площадке ${esc(s.stazh)}</p>`}</section>
    </div>`;
  }
  function pageItem(r) {
    const it = byId(r.id) || ITEMS[0];
    const s = SELLERS[it.seller]; const revs = REVIEWS[it.seller] || [];
    const tabs = [['desc', 'Описание']].concat(it.specs.length ? [['specs', 'Характеристики']] : [], [['talk', 'Обсуждение', 0], ['reviews', 'Отзывы о товаре', revs.length]]);
    const sameCategory = ITEMS.filter((i) => i.id !== it.id && i.top === it.top).map((i) => i.id);
    const similar = [...new Set([...sameCategory, 'arkham', 'zombicide'])].filter((id) => id !== it.id).slice(0, 4).map(byId);
    const tabBody = itemTab(it, revs);
    return pageItemTail(it, s, tabs, similar, tabBody);
  }
  function itemTab(it, revs) {
    const own = isOwn(it) || (it.id === 'a-own'); let tabBody = '';
    if (ui.tab === 'desc') {
      tabBody = `${descHtml(it)}
        ${(ITEM_TAGS[it.id] || []).length ? `<div class="d-tags">${ITEM_TAGS[it.id].map((t) => `<button class="chip plain" data-act="tagq" data-v="${t}">${t}</button>`).join('')}</div>` : ''}
        <div class="d-foot"><span class="t12 c3">${it.added ? `Опубликовано ${esc(it.added)}` : ''}</span>${isOwn(it) ? '' : `<button class="linkbtn" style="color:var(--text-2)" data-act="${isAuth() ? 'report' : 'loginFor'}"${isAuth() ? '' : ' data-text="Войдите, чтобы пожаловаться на объявление"'}>${ic('flag', 16)}Пожаловаться на объявление</button>`}</div>`;
    } else if (ui.tab === 'specs') {
      tabBody = `<dl class="spec">${it.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    } else if (ui.tab === 'talk') {
      const list = cmList(it.id);
      tabBody = it.noComments ? '<p class="c2">Продавец отключил комментарии к\u00a0этому объявлению</p>' : `
        ${list.length ? `<div class="cm-list">${list.map((c, i) => `<div class="cm-thread">${cmItem(c, i)}${(c.replies || []).length || ui.replyTo === i ? `<div class="cm-replies">${(c.replies || []).map((x) => cmItem(x, i, true)).join('')}${ui.replyTo === i ? `<div class="cm-form in"><textarea class="inp" id="cmReply" rows="2" placeholder="Ваш ответ"></textarea><div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-act="replyT" data-i="${i}">Отмена</button><button class="btn primary sm" data-act="replySend" data-id="${it.id}" data-i="${i}">Ответить</button></div></div>` : ''}</div>` : ''}</div>`).join('')}</div>` : '<p class="c2" style="margin-bottom:12px">Вопросов пока нет. Спросите продавца о\u00a0комплектации, доставке или фото</p>'}
        ${isAuth() ? `<div class="cm-form"><label class="fld"><span class="lbl">${isOwn(it) ? 'Ваш комментарий' : 'Ваш вопрос или комментарий'}</span><textarea class="inp" id="cmText" rows="3" placeholder="${isOwn(it) ? 'Например, об уточнении к объявлению' : 'Например, есть ли дополнительные фото'}"></textarea></label><div class="between"><button class="linkbtn" data-act="soon" data-text="Прикрепление изображений как на сайте">${ic('clip', 16)}Изображения</button><button class="btn primary" data-act="comment" data-id="${it.id}">Отправить</button></div></div>`
          : `<div class="note info">${ic('info')}<div class="body">Чтобы задать вопрос, войдите в\u00a0аккаунт. <button class="linkbtn" data-act="login">Войти</button></div></div>`}`;
    } else {
      const neg = revs.filter((v) => !v.good).length;
      const avg = revs.reduce((n, v) => n + (v.good ? 5 : 1), 0) / (revs.length || 1);
      tabBody = revs.length ? reviewsBody(revs, revSummary({ rating: avg, reviews: revs.length, neg }), '') : '<p class="c2">Отзывов о\u00a0товаре пока нет</p>';
    }
    return tabBody;
  }
  function pageItemTail(it, s, tabs, similar, tabBody) {
    const excluded = new Set([it.id, ...similar.map((item) => item.id)]);
    const picks = ['terminators', 'darkshroud', 'yucatan', 'zeratul', 'warriors', 'brutalis', 'lutazy', 'trukk'];
    const recommendations = picks.filter((id) => !excluded.has(id)).slice(0, 4).map(byId);
    return `<div class="wrap page purchase-item">
      ${crumbs([HOME_C, CAT_C].concat(it.crumbs.map((c) => ({ t: c, a: `data-act="nodeq" data-v="${esc(c)}"` }))))}
      <div class="pdp">
        <div class="pdp-main">${gallery(it)}</div>
        <div class="pdp-side stack-12">
          <div class="card buy">${buyBlock(it)}</div>
          ${sellerCard(it)}
        </div>
        <div class="pdp-main card">
          <div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" aria-selected="${ui.tab === k}" class="${ui.tab === k ? 'on' : ''}" data-act="itab" data-v="${k}">${l}${n ? ` <span class="cnt">${n}</span>` : ''}</button>`).join('')}</div>
          <div class="tab-body" id="tabs">${tabBody}</div>
        </div>
      </div>
      ${similar.length ? `<section class="sec"><div class="sec-hd"><h2 class="sec-t">Похожие товары</h2><a class="link row-l" href="#/catalog" data-act="nodeq" data-v="${esc(it.cat)}">Посмотреть все ${ic('right', 14)}</a></div><div class="grid">${similar.map((x) => pcard(x)).join('')}</div></section>` : ''}
      <section class="sec"><div class="sec-hd"><h2 class="sec-t">Специально для вас</h2><a class="link row-l" href="#/catalog">Посмотреть все ${ic('right', 14)}</a></div><div class="grid">${recommendations.map((item) => pcard(item)).join('')}</div></section>
    </div>`;
  }

  /* ---------- Корзина ---------- */
  function cartLine(l) {
    const it = l.item; const s = SELLERS[it.seller];
    const rest = restOf(l); const out = rest < l.qty;
    const stepper = !out;
    return `<div class="ci ${!l.on || out ? 'off' : ''}">
      <label class="chk" style="padding-top:2px"><input type="checkbox" data-act-chg="line" data-id="${it.id}" ${l.on && !out ? 'checked' : ''} ${out ? 'disabled' : ''} aria-label="Включить в заказ"><span class="box">${ic('check', 14)}</span></label>
      <a class="ci-img" href="#/item/${it.id}"><img src="${it.img}" alt=""></a>
      <div class="ci-mid">
        <a class="ci-t" href="#/${it.lot ? 'lot' : 'item'}/${it.id}">${esc(it.title)}</a>
        <p class="t12 c3">${esc(it.cat)}</p>
        ${it.lot ? `<p class="ci-lot">${ic('gavel', 14)}<span>Выигранный лот, оформите за <b data-end="${S.won[it.id].end}"></b></span></p>` : ''}
        ${out ? `<div class="err-t">${ic('alert', 14)}<span>${rest < 1 ? 'Товар закончился' : `В наличии только ${rest} шт.`}</span></div>` : ''}
        ${out && rest > 0 ? `<button class="linkbtn t12 co-underline" style="margin-top:4px" data-act="fixQty" data-id="${it.id}" data-v="${rest}">Оставить ${rest} шт.</button>` : ''}
      </div>
      <div class="ci-ctl">
        <span class="ci-price">${fmt(it.price * l.qty)}</span>
        <div class="row">
          ${stepper && !it.lot ? `<div class="step sm"><button data-act="lineQty" data-id="${it.id}" data-d="-1" ${l.qty <= 1 ? 'disabled' : ''} aria-label="Меньше">${ic('minus', 16)}</button><input class="step-i" inputmode="numeric" aria-label="Количество" data-lineqty="${it.id}" value="${l.qty}"><button data-act="lineQty" data-id="${it.id}" data-d="1" ${l.qty >= it.stock ? 'disabled' : ''} aria-label="Больше">${ic('plus', 16)}</button></div>` : `<span class="t12 c3">${l.qty} шт.</span>`}
          <button class="icon-btn" style="width:32px;height:32px" ${it.lot ? `data-act="cfm" data-k="dropLot" data-id="${it.id}"` : `data-act="rm" data-id="${it.id}"`} aria-label="Удалить">${ic('trash', 18)}</button>
        </div>
      </div>
    </div>`;
  }
  function relatedBlock(g) {
    const ids = g.lines.map((l) => l.id);
    const rel = ITEMS.filter((i) => i.seller === g.sid && !ids.includes(i.id));
    if (!rel.length) return '';
    const off = ui.relOff[g.sid];
    return `<div class="rel"><button class="rel-t" data-act="relT" data-k="${g.sid}" aria-expanded="${!off}"><span>Другие товары продавца</span>${ic(off ? 'down' : 'up', 16)}</button>
      ${off ? '' : `<div class="rel-list">${rel.slice(0, 6).map((i) => `<a class="rl" href="#/item/${i.id}"><img loading="lazy" src="${i.img}" alt=""><span class="rl-p">${fmt(i.price)}</span><span class="rl-t">${esc(i.title)}</span></a>`).join('')}</div>`}</div>`;
  }
  const REC_IDS = ['terminators', 'darkshroud', 'yucatan', 'arkham', 'zombicide', 'warriors'];
  function viewedBlock(exclude) {
    const seen = S.viewed.filter((id) => !exclude.includes(id));
    const pool = ['prisoners', 'lutazy', 'warriors', 'zeratul'].concat(ITEMS.map((i) => i.id)).filter((id) => !exclude.includes(id) && !REC_IDS.includes(id));
    const ids = seen.concat(pool).filter((id, i, a) => a.indexOf(id) === i).slice(0, 8);
    const open = ui.viewedMore;
    return `<section class="sec"><div class="sec-hd"><h2 class="h2">Вы смотрели</h2></div><div class="${open ? 'grid' : 'scroller'}">${ids.slice(0, open ? 8 : 4).map((id) => pcard(byId(id))).join('')}</div>${ids.length > 4 ? `<div class="sec-more"><button class="btn secondary" data-act="viewedT">${open ? 'Свернуть' : 'Показать ещё'}</button></div>` : ''}</section>`;
  }
  function recsBlock(exclude, title) {
    const ids = REC_IDS.filter((id) => !exclude.includes(id) && !S.viewed.slice(0, 4).includes(id)).slice(0, 4);
    return `<section class="sec"><div class="sec-hd"><h2 class="h2">${title || 'Может понравиться'}</h2></div><div class="scroller">${ids.map((id) => pcard(byId(id))).join('')}</div></section>`;
  }
  function cartCta(blocked, anyOut, minBad) {
    if (!blocked) return '<a class="btn primary lg block cart-summary-cta" href="#/checkout">Перейти к оформлению</a>';
    const why = anyOut ? 'Уберите товары, которых нет в наличии' : minBad ? 'Сумма заказа меньше минимальной у продавца' : 'Выберите хотя бы один товар';
    return `<div><button class="btn lg block is-disabled" disabled>Перейти к оформлению</button><p class="err-t">${ic('info', 14)}<span>${why}</span></p></div>`;
  }
  function pageCart() {
    const all = groups(false); const on = groups(true);
    if (!S.cart.length) {
      return `<div class="wrap page cart-page"><h1 class="h1" style="margin-bottom:16px">Корзина</h1>
        <div class="empty"><div class="ico">${ic('cart', 28)}</div><p class="h3">В корзине пока пусто</p><p class="c2" style="margin:4px 0 16px">Найдите нужное в каталоге или через поиск</p><a class="btn primary" href="#/catalog">Перейти в каталог</a></div>
        ${viewedBlock([])}</div>`;
    }
    const prices = checkoutPrices(on);
    const fees = prices.reduce((sum, order) => sum + order.fee, 0);
    const safeQty = on.filter(protectedOrder).reduce((a, g) => a + g.lines.reduce((x, l) => x + l.qty, 0), 0);
    const total = prices.reduce((sum, order) => sum + order.total, 0);
    const discount = prices.reduce((sum, o) => sum + o.g.sum + (dlPrice(o.g) || 0) + o.fee - o.total, 0);
    const hasDelivery = on.some(g => dlPrice(g) !== null);
    const delivery = on.reduce((sum, g) => sum + (dlPrice(g) || 0), 0);
    const pendingDelivery = on.some(g => dlPrice(g) === null);
    const deliveryText = !hasDelivery ? 'на следующем шаге' : (delivery ? fmt(delivery) : 'бесплатно') +
      (pendingDelivery ? ' · частично выбрана' : '');
    const totalLabel = hasDelivery || discount ? 'Итого' : 'Итого за товары';
    const count = on.reduce((a, g) => a + g.lines.reduce((x, l) => x + l.qty, 0), 0);
    const anyOut = S.cart.some(isOut); const minBad = on.some(minProblem);
    const blocked = !count || anyOut || minBad;
    const allOn = S.cart.every((c) => c.on);
    return `<div class="wrap page cart-page">
      <div class="between" style="margin-bottom:12px"><h1 class="h1">Корзина</h1><span class="c3">${cartCount()} ${plural(cartCount(), 'товар', 'товара', 'товаров')}</span></div>
      ${S.notice ? `<div class="note bad" style="margin-bottom:12px" role="alert">${ic('alert')}<div class="body">${esc(S.notice)}</div></div>` : ''}
      <div class="two">
        <div>
          <div class="cart-tools">
            <label class="chk"><input type="checkbox" data-act-chg="all" ${allOn ? 'checked' : ''}><span class="box">${ic('check', 14)}</span><span>Выбрать все</span></label>
            <button class="linkbtn co-underline" data-act="rmOff" style="color:var(--text-2)">${ic('trash', 16)}Удалить выбранное</button>
          </div>
          ${all.map((g) => {
            const order = prices.find(o => o.g.sid === g.sid);
            const gOn = order?.g;
            const need = gOn ? minProblem(gOn) : 0;
            const free = g.seller.freeFrom;
            return `<section class="sg">
              <header class="sg-hd"><span class="sb">${esc(g.seller.name)}</span>${g.seller.pro ? '<span class="tag pro">PRO</span>' : ''}<span class="row t12 c2" style="gap:4px">${g.seller.reviews ? `${STAR}${g.seller.rating.toFixed(2)}` : 'Новый продавец'}</span><span class="t12 c3">${esc(g.seller.city)}</span></header>
              ${g.lines.map(cartLine).join('')}
              ${order ? safeSwitch(gOn, order.availableFee) : ''}
              ${need || free ? `<div class="sg-ft">
                ${need ? `<div class="note warn" role="status">${ic('alert')}<div class="body">Минимальная сумма заказа у продавца ${fmt(g.seller.minSum)}. Доберите товаров на ${fmt(need)}</div></div>` : ''}
                ${free && !need ? `<div class="note ok">${ic('truck')}<div class="body">${gOn && gOn.sum >= free ? 'Бесплатная доставка!' : `Добавьте товаров на ${fmt(free - (gOn ? gOn.sum : 0))}, чтобы получить бесплатную доставку`}</div></div>` : ''}
              </div>` : ''}
              ${relatedBlock(g)}
            </section>`;
          }).join('')}
        </div>
        <aside class="two-side sum-card" aria-label="Итог">
          <div class="h3">Ваш заказ</div>
          ${on.length > 1 ? `<div class="note info">${ic('info')}<div class="body"><b>Будет ${on.length} ${plural(on.length, 'заказ', 'заказа', 'заказов')}.</b> У каждого продавца своё подтверждение, оплата и доставка</div></div>` : ''}
          ${on.map((g) => `<div class="sum-row"><span class="c2">${esc(g.seller.name)}</span><span class="v">${fmt(g.sum)}</span></div>`).join('')}
          ${safeQty ? `<div class="sum-row"><span class="c2">Безопасная сделка ×${safeQty}</span><span class="v">${fmt(fees)}</span></div>` : ''}<div class="sum-row"><span class="c2">Доставка</span><span class="v c2">${deliveryText}</span></div>
          ${discount ? `<div class="sum-row"><span class="c2">Скидки и сертификаты</span><span class="v">−${fmt(discount)}</span></div>` : ''}
          <div class="sum-total"><span>${totalLabel}</span><span class="v">${fmt(total)}</span></div>
          ${cartCta(blocked, anyOut, minBad)}
        </aside>
      </div>
      ${viewedBlock(S.cart.map((c) => c.id))}
      ${recsBlock(S.cart.map((c) => c.id))}
    </div>
    <div class="sticky-bar"><div class="sum"><span class="t12 c3">${totalLabel}</span>${safeQty ? `<span class="cart-sticky-fee">Безопасная сделка ×${safeQty} ${fmt(fees)}</span>` : ''}<b>${fmt(total)}</b></div>${blocked ? '<button class="btn lg is-disabled" disabled>К оформлению</button>' : '<a class="btn primary lg" href="#/checkout">К оформлению</a>'}</div>`;
  }

  /* ---------- Оформление ---------- */
  const FIELD = {
    email: { label: 'Email', type: 'email', ac: 'email', ph: 'name@example.com', req: true, hint: 'Сюда придут статус заказа и данные для входа' },
    phone: { label: 'Телефон', type: 'tel', ac: 'tel', ph: '+7 (___) ___-__-__', req: true, hint: 'Продавец свяжется по этому номеру, если будут вопросы' },
    fio: { label: 'Фамилия, имя и отчество', ac: 'name', ph: 'Иванов Иван Иванович', req: true },
    street: { label: 'Улица', ac: 'address-line1' },
    house: { label: 'Дом', ac: 'address-line2' },
    flat: { label: 'Квартира', ac: 'address-line3' },
    index: { label: 'Индекс', ac: 'postal-code', im: 'numeric' },
  };
  const coGroups = () => groups(true);
  const needsAddress = () => coGroups().some((g) => { const d = S.co.dl[g.sid]; return d && DELIVERY[d].needs === 'address'; });
  const addressOrders = () => coGroups().filter(g => DELIVERY[S.co.dl[g.sid]]?.needs === 'address');
  const needsIndex = () => addressOrders().some((g, i) => S.co.dl[g.sid] === 'post' && (i === 0 || !S.co.addr?.[g.sid]));
  function postalError(value) {
    return /^\d{6}$/.test(value) ? '' : value ? 'В индексе 6 цифр' : 'Укажите индекс';
  }
  function ownAddressError(sid, key) {
    const value = (S.co.addr[sid][key] || '').trim();
    if (key === 'index' && S.co.dl[sid] === 'post') return postalError(value);
    if (key === 'street' && !value) return 'Укажите улицу';
    if (key === 'house' && !value) return 'Укажите дом';
    return '';
  }
  function fieldError(n) {
    const v = (recipientValue(n) || '').trim();
    if (n === 'email') { if (!v) return 'Укажите email'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) return 'Проверьте email: например, name@example.com'; }
    if (n === 'phone') { const d = v.replace(/\D/g, ''); if (!d || d === '7') return 'Укажите телефон'; if (d.length < 11) return 'Проверьте номер: нужно 10 цифр после +7'; }
    if (n === 'fio') { if (!v) return 'Укажите фамилию и имя'; if (v.split(/\s+/).length < 2) return 'Нужны хотя бы фамилия и имя'; }
    if (n === 'street' && needsAddress() && !v) return 'Укажите улицу';
    if (n === 'house' && needsAddress() && !v) return 'Укажите дом';
    if (n === 'index' && needsIndex()) return postalError(v);
    return '';
  }
  const showErr = (n) => (ui.submitted || ui.touched[n]) && fieldError(n);
  function field(n, cls) {
    const f = FIELD[n]; const err = showErr(n);
    return `<label class="fld ${err ? 'err' : ''} ${cls || ''}" data-fld="${n}">
      <span class="lbl">${f.label}${f.opt ? ' <em>необязательно</em>' : ''}</span>
      <input class="inp" name="${n}" type="${f.type || 'text'}" ${f.ac ? `autocomplete="${f.ac}"` : ''} ${f.im ? `inputmode="${f.im}"` : ''} ${f.ph ? `placeholder="${f.ph}"` : ''} value="${esc(recipientValue(n) || '')}" ${err ? 'aria-invalid="true"' : ''}>
      ${err ? `<span class="err-t">${err}</span>` : f.hint ? `<span class="hint">${f.hint}</span>` : ''}
    </label>`;
  }
  const dlPrice = (g) => {
    const d = S.co.dl[g.sid]; if (!d) return null;
    if (DELIVERY[d].price === 0 || (g.seller.freeFrom && g.sum >= g.seller.freeFrom)) return 0;
    return DELIVERY[d].price + (S.co.surcharge && S.co.surcharge[g.sid] ? S.co.surcharge[g.sid] : 0);
  };
  const CERT_VALUES = { GIFT500: 500, GIFT1000: 1000 };
  const PROMO_CODES = ['MINI10', 'SHIP200'];
  function checkoutPrices(groups = coGroups()) {
    const remaining = new Map(S.co.certificates.map(code => [code, CERT_VALUES[code] || 0]));
    return groups.map(g => {
      const delivery = dlPrice(g) || 0;
      const promos = {};
      let goodsDue = g.sum, deliveryDue = delivery;
      for (const code of S.co.promo[g.sid] || []) {
        if (code === 'MINI10') {
          promos[code] = g.sum - Math.floor(g.sum * 90 / 100);
          goodsDue -= promos[code];
        }
        if (code === 'SHIP200') {
          promos[code] = Math.min(200, deliveryDue);
          deliveryDue -= promos[code];
        }
      }
      const certificates = {};
      for (const [code, balance] of remaining) {
        const onGoods = Math.min(balance, goodsDue);
        const onDelivery = Math.min(balance - onGoods, deliveryDue);
        goodsDue -= onGoods;
        deliveryDue -= onDelivery;
        certificates[code] = onGoods + onDelivery;
        remaining.set(code, balance - certificates[code]);
      }
      const availableFee = safeFee(goodsDue);
      const fee = protectedOrder(g) ? availableFee : 0;
      return { g, promos, certificates, availableFee, fee, total: goodsDue + deliveryDue + fee };
    });
  }
  function protectedOrder(g) {
    return S.co.pay[g.sid] !== 'cash' && sellerSafe(g.seller) && !!S.co.safe[g.sid];
  }
  function safeSwitch(g, cartFee) {
    if (!sellerSafe(g.seller) || S.co.pay[g.sid] === 'cash') return '';
    const inCart = cartFee !== undefined;
    const hintId = `safe-hint-${g.sid}`;
    return `<label class="safe-option${inCart ? ' cart-safe' : ''}">${inCart ? ic('shield', 20) : ''}<span><strong>Безопасная сделка</strong><small id="${hintId}">${PAYWAY.safe.note}${inCart ? ': ' + fmt(cartFee) : ''}</small></span><input type="checkbox" role="switch" aria-label="Безопасная сделка" aria-describedby="${hintId}" data-act-chg="safe" data-s="${g.sid}" ${protectedOrder(g) ? 'checked' : ''}></label>`;
  }
  const grand = () => checkoutPrices().reduce((sum, order) => sum + order.total, 0);

  /* Адрес один на все заказы: значения хранятся в форме, поэтому при смене способа не сбрасываются */
  function addressFields() {
    return `<div class="addr"><p class="lbl-b">Адрес доставки, ${esc(S.co.city)}</p><div class="addr-grid">${field('street', 'a-street')}${field('house', 'a-sm')}${field('flat', 'a-sm')}${needsIndex() ? field('index', 'a-idx') : ''}</div></div>`;
  }
  function addressSlot(g) {
    const dl = S.co.dl[g.sid];
    if (!dl || DELIVERY[dl].needs !== 'address') return '';
    const [first] = addressOrders();
    if (first.sid === g.sid) return addressFields();
    const own = S.co.addr && S.co.addr[g.sid];
    if (own) {
      const inp = (k, label, cls) => {
        const err = ui.submitted && ownAddressError(g.sid, k);
        return `<label class="fld ${cls} ${err ? 'err' : ''}" data-own-field="${g.sid}-${k}"><span class="lbl">${label}</span><input class="inp" data-addr="${g.sid}" data-k="${k}" ${k === 'index' ? 'inputmode="numeric"' : ''} aria-invalid="${!!err}" aria-describedby="err-${g.sid}-${k}" value="${esc(own[k] || '')}"><span class="err-t" id="err-${g.sid}-${k}" ${err ? '' : 'hidden'}>${err || ''}</span></label>`;
      };
      return `<div class="addr"><div class="lbl-row"><p class="lbl-b" style="margin:0">Адрес этого заказа, ${esc(S.co.city)}</p><button type="button" class="x-btn" data-act="addrOff" data-s="${g.sid}" aria-label="Использовать адрес выше">${ic('x', 16)}</button></div><div class="addr-grid">${inp('street', 'Улица', 'a-street')}${inp('house', 'Дом', 'a-sm')}${inp('flat', 'Квартира', 'a-sm')}${dl === 'post' ? inp('index', 'Индекс', 'a-idx') : ''}</div></div>`;
    }
    const f = S.form; const line = [f.street, f.house && `д. ${f.house}`, f.flat && `кв. ${f.flat}`].filter(Boolean).join(', ');
    return `<div class="addr-same"><p class="c2">Адрес как в заказе выше${line ? `: ${esc(line)}` : ''}</p>${checkoutLink('Добавить другой адрес', 'addrOn', `data-s="${g.sid}"`)}</div>`;
  }
  function sellerBlock(g, i, n) {
    const s = g.seller; const co = S.co; const city = co.city;
    const opts = s.deliveries.filter((d) => d !== 'pickup' || s.city === city);
    const pickupHidden = s.deliveries.includes('pickup') && s.city !== city;
    const dl = co.dl[g.sid];
    const dlErr = ui.submitted && city && !dl;
    const pvzErr = ui.submitted && dl && DELIVERY[dl].needs === 'pvz' && !co.pvz[g.sid];
    const pvz = PVZ.find((p) => p.id === co.pvz[g.sid]);
    return `<div class="seller-order ${dlErr || pvzErr ? 'err' : ''}" id="so-${g.sid}">
      <div class="so-hd"><span class="sb">${n > 1 ? `Заказ ${i + 1} из ${n}: ` : ''}${esc(s.name)}</span>${s.pro ? '<span class="tag pro">PRO</span>' : ''}<span class="t12 c3">${esc(s.city)}</span></div>
      <div class="so-bd">
        ${g.lines.map(l => `<div class="so-item-one"><img src="${l.item.img}" alt="" width="56" height="56"><div><p class="t">${esc(l.item.title)}</p><p class="t12 c3">${l.qty} шт. ${g.lines.length > 1 ? `× ${fmt(l.item.price)} ` : ''}· ${fmt(l.qty * l.item.price)}</p></div></div>`).join('')}
        ${g.lines.length > 1 ? `<p class="sb">${g.lines.reduce((n, l) => n + l.qty, 0)} шт. · ${fmt(g.sum)}</p>` : ''}
        ${!city ? '<p class="c3">Укажите город выше, и мы покажем доступные способы получения</p>' : `
        <div>
          <p class="lbl-b">Как получить</p>
          <div class="opt-list two-col" role="radiogroup" aria-label="Способ получения">
            ${opts.map((d) => { const D = DELIVERY[d]; const on = dl === d; const free = D.price === 0 || (s.freeFrom && g.sum >= s.freeFrom);
              return `<label class="opt ${on ? 'on' : ''}"><input type="radio" name="dl-${g.sid}" data-act-chg="dl" data-s="${g.sid}" value="${d}" ${on ? 'checked' : ''}><span class="dot"></span><span class="main"><span class="sb" style="display:block">${D.title}</span><span class="pr">${free ? 'бесплатно' : fmt(on ? dlPrice(g) : D.price)}</span><span class="t12 c3" style="display:block">${d === 'pickup' ? `${esc(s.city)}. ${D.note}` : D.note}</span>
                ${on && D.needs === 'pvz' ? `<span class="opt-sub" style="display:block">${pvz ? `<span class="t12" style="display:block">${pvz.name}</span>` : ''}<button type="button" class="linkbtn t12" data-act="pvz" data-s="${g.sid}">${pvz ? 'Изменить пункт' : 'Выбрать пункт выдачи'}</button></span>` : ''}</span></label>`; }).join('')}
          </div>
          ${pickupHidden ? `<p class="t12 c3" style="margin-top:8px">Самовывоз доступен только в городе продавца: ${esc(s.city)}</p>` : ''}
          ${dlErr ? `<p class="err-t">${ic('alert', 14)}<span>Выберите способ получения</span></p>` : ''}
          ${pvzErr ? `<p class="err-t">${ic('alert', 14)}<span>Выберите пункт выдачи</span></p>` : ''}
        </div>
        ${addressSlot(g)}
        `}
      </div>
    </div>`;
  }
  function payBlock(g, i, n, total) {
    const s = g.seller; const co = S.co; const dl = co.dl[g.sid];
    const canPay = (p) => p !== 'cash' || dl === 'pickup';
    const payOpts = s.pay.filter(canPay);
    const pay = payOpts.includes(co.pay[g.sid]) ? co.pay[g.sid] : payOpts[0];
    co.pay[g.sid] = pay;
    const openC = ui.opened['c' + g.sid];
    return `<div class="pay-b">
      <div class="pay-hd"><div class="so-items">${g.lines.slice(0, 3).map((l) => `<img src="${l.item.img}" alt="${esc(l.item.title)}">`).join('')}</div><div style="min-width:0"><p class="sb">${n > 1 ? `Заказ ${i + 1} из ${n}: ` : ''}${esc(s.name)}</p><p class="c2">${g.lines.reduce((a, l) => a + l.qty, 0)} шт. на ${fmt(total)}</p></div></div>
      <div class="opt-list two-col" role="group" aria-label="Способ оплаты">
        ${payOpts.map((p) => { const P = PAYWAY[p]; const on = pay === p; return `<label class="opt ${on ? 'on' : ''}"><input type="radio" name="pay-${g.sid}" data-act-chg="pay" data-s="${g.sid}" value="${p}" ${on ? 'checked' : ''}><span class="dot"></span><span class="main"><span class="sb" style="display:block">${P.title}</span><span class="t12 c3" style="display:block">${P.note}</span></span></label>`; }).join('')}
        ${safeSwitch(g)}
      </div>
      ${openC ? `<div class="fld">${closeHeading('Комментарий продавцу', `cm-${g.sid}`, 'close', `data-k="c${g.sid}" data-s="${g.sid}"`)}<textarea class="inp" id="cm-${g.sid}" rows="3" data-co-comment="${g.sid}" placeholder="Например, удобное время для связи">${esc(co.comment[g.sid] || '')}</textarea></div>` : ''}
      ${openC ? '' : `<div class="row pay-more">${checkoutLink('Комментарий продавцу', 'open', `data-k="c${g.sid}"`)}</div>`}
    </div>`;
  }
  function resetCodeEntry() {
    ui.codeDraft = ''; ui.codeError = ''; ui.chooseSeller = false; ui.codeStatus = '';
  }
  function discountRow(code, amount, seller = '', showSeller = false) {
    const kind = seller ? 'Промокод' : 'Сертификат';
    const title = `${kind} ${code}${showSeller ? ' · ' + SELLERS[seller].name : ''}`;
    return `<li class="discount-row"><span>${esc(title)}</span><strong>${amount ? '−' : ''}${fmt(amount)}</strong><button type="button" class="x-btn" data-act="removeCode" data-code="${esc(code)}" data-s="${esc(seller)}" aria-label="Убрать ${seller ? 'промокод' : 'сертификат'} ${esc(code)}">${ic('x', 16)}</button></li>`;
  }
  function discountBlock(prices) {
    const rows = [];
    for (const order of prices) {
      for (const [code, amount] of Object.entries(order.promos)) rows.push(discountRow(code, amount, order.g.sid, prices.length > 1));
    }
    for (const code of S.co.certificates) {
      rows.push(discountRow(code, prices.reduce((sum, o) => sum + o.certificates[code], 0)));
    }
    const code = ui.codeDraft.trim().toUpperCase();
    const sellers = prices.filter(o => o.g.seller.pro);
    return `<div class="discount-block">
      <form data-form="discount" class="fld ${ui.codeError ? 'err' : ''}">
        <div class="promo-row"><input class="inp" id="discountCode" placeholder="Промокод или сертификат" aria-label="Промокод или сертификат" autocomplete="off" value="${esc(ui.codeDraft)}" aria-invalid="${!!ui.codeError}" aria-describedby="discountFeedback"><button type="submit" class="btn secondary">Применить</button></div>
        <span id="discountFeedback" role="status" class="${ui.codeError ? 'err-t' : 'hint'}">${esc(ui.codeError || ui.codeStatus)}</span>
      </form>
      ${ui.chooseSeller ? `<fieldset class="discount-sellers"><legend>К какому продавцу применить ${esc(code)}?</legend>${sellers.map(({g}) => `<button type="button" class="btn secondary" data-act="chooseCodeSeller" data-s="${g.sid}">${esc(g.seller.name)}${(S.co.promo[g.sid] || []).includes(code) ? ' · уже применён' : ''}</button>`).join('')}</fieldset>` : ''}
      ${rows.length ? `<ul class="discount-list" aria-label="Применённые коды">${rows.join('')}</ul>` : ''}
    </div>`;
  }
  function applyDiscount(sellerId) {
    const input = document.getElementById('discountCode');
    ui.codeDraft = input.value;
    const code = input.value.trim().toUpperCase();
    const duplicate = 'Этот код уже применён';
    let error = '', chooseSeller = false, appliedTo = '';
    if (!code) error = 'Введите промокод или сертификат';
    else if (Object.hasOwn(CERT_VALUES, code)) {
      if (S.co.certificates.includes(code)) error = duplicate;
      else S.co.certificates.push(code);
    } else if (PROMO_CODES.includes(code)) {
      const sellers = coGroups().filter(g => g.seller.pro);
      const target = sellerId ? sellers.find(g => g.sid === sellerId) : sellers.length === 1 ? sellers[0] : null;
      if (!sellers.length || (sellerId && !target)) error = 'Промокод или сертификат не найден';
      else if (!target) {
        if (sellers.every(g => (S.co.promo[g.sid] || []).includes(code))) error = duplicate;
        else chooseSeller = true;
      } else {
        const codes = S.co.promo[target.sid] ||= [];
        if (codes.includes(code)) error = duplicate;
        else { codes.push(code); appliedTo = ` · ${target.seller.name}`; }
      }
    } else error = 'Промокод или сертификат не найден';
    ui.codeError = error; ui.chooseSeller = chooseSeller; ui.codeStatus = '';
    if (!error && !chooseSeller) {
      ui.codeDraft = ''; ui.codeStatus = `Код ${code} применён${appliedTo}`; save();
    }
    render();
    document.querySelector(chooseSeller ? '.discount-sellers button' : '#discountCode').focus({ preventScroll: true });
  }
  const ctaText = (n) => (n > 1 ? `Оформить ${n} ${plural(n, 'заказ', 'заказа', 'заказов')}` : 'Оформить заказ');
  function summary() {
    const gs = coGroups(); const n = gs.length; const prices = checkoutPrices(gs);
    return `<div class="sum-card" id="summary">
      <div class="h3">${n > 1 ? `${n} ${plural(n, 'заказ', 'заказа', 'заказов')}` : 'Ваш заказ'}</div>
      ${n > 1 ? `<div class="note info">${ic('info')}<div class="body">У каждого продавца своё подтверждение, своя оплата и свой срок</div></div>` : ''}
      ${prices.map(({g, fee}) => { const p = dlPrice(g); return `<div class="sum-order">
        ${n > 1 ? `<div class="sb">${esc(g.seller.name)}</div>` : ''}
        <div class="sum-row"><span class="c2">Товары, ${g.lines.reduce((a, l) => a + l.qty, 0)} шт.</span><span class="v">${fmt(g.sum)}</span></div>
        <div class="sum-row"><span class="c2">Доставка</span><span class="v ${p === null ? 'c3' : ''}">${p === null ? 'не выбрана' : p === 0 ? 'бесплатно' : fmt(p)}</span></div>${protectedOrder(g) ? `<div class="sum-row"><span class="c2">Безопасная сделка ×${g.lines.reduce((a, l) => a + l.qty, 0)}</span><span class="v">${fmt(fee)}</span></div>` : ''}
      </div>`; }).join('')}
      ${discountBlock(prices)}
      <div class="sum-total" style="padding-top:0;border-top:0"><span>Итого</span><span class="v">${fmt(grand())}</span></div>
      <button class="btn primary lg block hide-sm ${ui.loading ? 'is-loading' : ''}" data-act="submit" ${ui.loading ? 'disabled' : ''}>${ui.loading ? '<span class="spin"></span>' : ctaText(n)}</button>
      ${paymentNote()}
      ${checkoutNote('truck', 'Сумму доставки подтвердит продавец', 'Стоимость рекомендованная, продавец может её изменить. Новую сумму вы увидите до оплаты')}
      <p class="t12 c3">Нажимая кнопку, вы принимаете <a class="link co-underline" href="${SITE}/user-agreement" target="_blank" rel="noopener">пользовательское соглашение</a></p>
    </div>`;
  }
  const cityList = (v) => { const list = CITIES.filter((c) => !v || c.toLowerCase().startsWith(v.toLowerCase())); return list.length ? `<div class="dd-menu" style="position:absolute"><div class="dd-list" role="listbox">${list.map((c) => `<button type="button" role="option" class="dd-o" data-act="city" data-v="${c}"><span>${c}</span></button>`).join('')}</div></div>` : ''; };
  const contactKeys = ['fio', 'email', 'phone'];
  const recipientValue = (key) => ui.recipientDraft?.[key] ?? S.form[key];
  function checkoutHeading(step, title) {
    return `<div class="co-hd"><span class="n">${step}</span><h2 class="h3" id="s${step}">${title}</h2></div>`;
  }
  function checkoutLink(label, action, attrs = '', icon = 'plus') {
    return `<button type="button" class="linkbtn" data-act="${action}" ${attrs}>${icon ? ic(icon, 16) : ''}${label}</button>`;
  }
  function closeHeading(label, target, action, attrs = '') {
    return `<div class="lbl-row"><label class="lbl" for="${target}">${label}</label><button type="button" class="x-btn" aria-label="Закрыть: ${label}" data-act="${action}" ${attrs}>${ic('x', 16)}</button></div>`;
  }
  function recipientBlock() {
    if (isAuth() && !ui.recipientDraft) return `<div class="recipient-summary"><strong>${esc(S.form.fio)}</strong><span>${esc(S.form.email)}</span><span>${esc(S.form.phone)}</span>${checkoutLink('Редактировать', 'recipientEdit', '', '')}</div>`;
    return `<div class="form-grid">${field('fio')}${field('email', 'col3')}${field('phone', 'col3')}</div>${ui.recipientDraft ? '<div class="recipient-actions"><button class="btn secondary" data-act="recipientSave">Сохранить</button><button class="linkbtn" data-act="recipientCancel">Отмена</button></div>' : ''}`;
  }
  function checkoutNote(icon, title, body, cls = '') {
    return `<div class="key ${cls}">${ic(icon)}<div><p class="sb">${title}</p><p>${body}</p></div></div>`;
  }
  function paymentNote(cls = '') {
    const protectedAll = coGroups().every(protectedOrder);
    return checkoutNote('card', 'Сейчас платить не нужно', protectedAll ? 'Оплатите заказ онлайн после подтверждения продавцом' : 'Способ оплаты указан в заказе. Дождитесь подтверждения продавца', cls);
  }
  function pageCheckout() {
    const gs = coGroups();
    if (!gs.length) { setTimeout(() => go('#/cart'), 0); return ''; }
    if (isAuth()) {
      const contact = { email: 'ivanov@example.com', phone: '+7 (900) 123-45-67', fio: 'Иванов Иван Иванович' };
      for (const key of contactKeys) if (!S.form[key]) S.form[key] = contact[key];
    }
    const cityErr = (ui.submitted || ui.touched.city) && !S.co.city;
    const st = ui.coStep; const names = ['Получатель', 'Доставка', 'Оплата', 'Проверка'];
    const mobileBtn = st < 4 ? '<button class="btn primary lg" data-act="coNext">Далее</button>' : `<button class="btn primary lg ${ui.loading ? 'is-loading' : ''}" data-act="submit" ${ui.loading ? 'disabled' : ''}>${ui.loading ? '<span class="spin"></span>' : ctaText(gs.length)}</button>`;
    return `<div class="wrap page focus-page">
      <div class="co-wrap" data-step="${st}">
      <a class="back ${st > 1 ? 'hide-below-d' : ''}" href="#/cart">${ic('left', 16)}Вернуться в корзину</a>
      ${st > 1 ? `<button class="back hide-d" data-act="coBack">${ic('left', 16)}${names[st - 2]}</button>` : ''}
      <h1 class="h1" style="margin-bottom:12px">Оформление заказа</h1>
      <ol class="co-steps hide-d" aria-label="Шаги оформления">${names.map((n, i) => `<li class="${i + 1 === st ? 'on' : i + 1 < st ? 'done' : ''}"><button data-act="coGo" data-v="${i + 1}" ${i + 1 < st ? '' : 'disabled'}><span class="n">${i + 1 < st ? ic('check', 12) : i + 1}</span><span>${n}</span></button></li>`).join('')}</ol>
      ${S.banner ? `<div class="note ${S.banner.kind}" style="margin-bottom:12px" role="alert">${ic('alert')}<div class="body">${esc(S.banner.text)}</div></div>` : ''}
      <div class="two co">
        <div>
          ${paymentNote('st st-3 hide-d')}
          ${isAuth() ? '' : '<div class="guest-bar st st-1"><span class="c2">Оформляете как гость. Аккаунт создадим автоматически</span><span>Уже есть аккаунт? <button class="linkbtn" data-act="login">Войти</button></span></div>'}
          <section class="co-sec st st-1" aria-labelledby="s1">${checkoutHeading(1, 'Получатель')}
            <p class="co-sub">Заказ выдадут по этим данным, проверьте их</p>
            ${recipientBlock()}
          </section>
          <section class="co-sec st st-2" aria-labelledby="s2">${checkoutHeading(2, 'Доставка')}
            <div class="fld city-box ${cityErr ? 'err' : ''}" data-fld="city">
              <label class="lbl" for="city">Город получателя</label>
              <input class="inp" id="city" autocomplete="off" role="combobox" aria-expanded="${ui.cityOpen}" placeholder="Начните вводить город" value="${esc(S.co.cityTxt)}">
              <div id="cityList">${ui.cityOpen ? cityList(S.co.cityTxt) : ''}</div>
              ${cityErr ? '<span class="err-t">Укажите город</span>' : ''}
            </div>
            ${gs.map((g, i) => sellerBlock(g, i, gs.length)).join('')}
          </section>
          <section class="co-sec st st-3" aria-labelledby="s3">${checkoutHeading(3, 'Оплата')}
            ${checkoutPrices(gs).map(({g, total}, i) => payBlock(g, i, gs.length, total)).join('')}
          </section>
        </div>
        <aside class="two-side st st-4" aria-label="Итог">${summary()}</aside>
      </div>
      </div>
    </div>
    <div class="sticky-bar"><div class="sum"><span class="t12 c3">Итого</span><b id="stickyTotal">${fmt(grand())}</b></div>${mobileBtn}</div>`;
  }
  function stepError(st) {
    if (st === 1) { for (const n of ['fio', 'email', 'phone']) if (fieldError(n)) return `[data-fld="${n}"]`; return null; }
    if (st === 2) {
      if (!S.co.city) return '[data-fld="city"]';
      for (const g of coGroups()) { const d = S.co.dl[g.sid]; if (!d || (DELIVERY[d].needs === 'pvz' && !S.co.pvz[g.sid])) return `#so-${g.sid}`; }
      for (const n of ['street', 'house', 'index']) if (fieldError(n)) return `[data-fld="${n}"]`;
      for (const g of addressOrders().slice(1)) {
        if (!S.co.addr?.[g.sid]) continue;
        for (const key of ['street', 'house', 'index']) {
          if (ownAddressError(g.sid, key)) return `[data-own-field="${g.sid}-${key}"]`;
        }
      }
    }
    return null;
  }
  function submit() {
    if (ui.loading) return;
    ui.submitted = true;
    if (!saveRecipient()) return;
    const bad = stepError(1) || stepError(2);
    if (bad) {
      ui.coStep = /fio|email|phone/.test(bad) ? 1 : 2;
      render();
      const el = document.querySelector(bad);
      if (el) {
        ui.modal = { checkoutError: bad, message: el.querySelector('.err-t')?.textContent || 'Проверьте данные заказа' };
        overlay(); ovEl.querySelector('button[data-act="fixCheckout"]').focus();
      }
      return;
    }
    ui.loading = true; render();
    setTimeout(() => {
      ui.loading = false;
      const f = S.flags.fail;
      const changedOrder = f === 'changed' && !S.co.surcharge && coGroups().find(g => dlPrice(g) > 0);
      if (changedOrder) {
        S.co.surcharge = { [changedOrder.sid]: 150 };
        S.banner = { kind: 'warn', text: 'Сумма заказа изменилась! Проверьте и подтвердите ваш заказ снова' };
        render(); window.scrollTo(0, 0); return;
      }
      if (f === 'out') {
        S.flags.itemOut = true; S.flags.fail = 'none';
        if (!S.cart.some((c) => c.id === 'trukk')) S.cart.push({ id: 'trukk', qty: 1, on: true });
        S.notice = 'Не все товарные позиции доступны для заказа. Проверьте их снова!';
        save(); notify(); go('#/cart'); return;
      }
      if (f === 'balance') {
        S.banner = { kind: 'bad', text: 'У вас отрицательный баланс, пополните его в личном кабинете' };
        render(); window.scrollTo(0, 0); return;
      }
      makeOrders();
      for (const o of S.orders) delete S.co.promo[o.sid];
      S.co.certificates = []; resetCodeEntry();
      S.cart = S.cart.filter((c) => !c.on || isOut(c)); S.banner = null; S.co.surcharge = null;
      save(); ui.submitted = false; ui.touched = {}; go('#/success');
    }, 900);
  }
  function makeOrders() {
    const d48 = new Date(Date.now() + 48 * 3600000);
    S.orders = checkoutPrices().map(({g, promos, certificates, fee, total}, i) => ({
      no: 464801 + i, sid: g.sid, dl: S.co.dl[g.sid], pay: S.co.pay[g.sid] === 'safe' ? 'card' : S.co.pay[g.sid], safe: protectedOrder(g), pvz: DELIVERY[S.co.dl[g.sid]].needs === 'pvz' ? S.co.pvz[g.sid] : null, sum: g.sum, delivery: dlPrice(g) || 0, promos, certificates, fee, total, deadline: d48.getTime(),
      lines: g.lines.map((l) => ({ id: l.id, qty: l.qty })),
    }));
    S.wonDone = (S.wonDone || []).concat(coGroups().reduce((a, g) => a.concat(g.lines.filter((l) => l.item.lot).map((l) => l.id)), []));
    S.buyer = { email: S.form.email || 'ivanov@example.com', name: (S.form.fio || 'Иванов Иван').trim().split(/\s+/)[1] || 'Иван' };
  }
  function ensureOrders() {
    if (S.orders) return;
    if (!S.cart.length) preset('one');
    fillForm(); makeOrders(); S.cart = [];
  }

  /* ---------- Успех ---------- */
  const isConfirmed = (o) => S.flags.autoConfirm && SELLERS[o.sid].pro;
  const orderSafe = (o) => o.safe ?? (o.pay === 'safe');
  const orderMethod = (o) => o.pay === 'safe' ? 'card' : o.pay;
  function timeline(o, confirmed, email, multi) {
    const s = SELLERS[o.sid]; const cash = o.pay === 'cash'; const safe = orderSafe(o); const pickup = o.dl === 'pickup';
    const dl = dateStr(new Date(o.deadline));
    const steps = [
      confirmed ? { t: 'Продавец подтвердил заказ', d: 'Автоматически, сразу после оформления' } : { t: multi ? 'Продавцы подтвердят заказы' : 'Продавец подтвердит заказ', d: `До ${dl}. Если продавец не ответит за 48 часов, заказ отменится автоматически` },
      multi ? { t: 'Вы оплатите каждый заказ отдельно', d: `Реквизиты и срок оплаты придут на ${email} после подтверждения. Если не успеть, заказ отменится` } : safe ? { t: 'Оплатите заказ онлайн', d: 'Деньги останутся у нас, пока вы не получите заказ' } : cash ? { t: 'Оплатите наличными при встрече', d: 'Договоритесь с продавцом о месте и времени' } : { t: 'Вы оплатите переводом и приложите чек', d: `Реквизиты придут на ${email}. На оплату будет ${s.payWait}, если не успеть, заказ отменится` },
      multi ? { t: 'Продавцы отправят заказы', d: 'У каждого свой срок отправки, он указан в письме и в заказе' } : pickup ? { t: 'Заберёте заказ у продавца', d: `${s.city}` } : { t: 'Продавец отправит заказ', d: `В течение ${s.shipWait} после оплаты` },
      { t: 'Подтвердите получение', d: safe ? 'После этого продавец получит деньги' : 'Через 30 дней заказ сам считается полученным' },
    ];
    const cur = confirmed ? 1 : 0;
    return `<ol class="tl">${steps.map((x, i) => `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><span class="d">${i < cur ? ic('check', 14) : i + 1}</span><div><p class="tl-t">${esc(x.t)}</p><p class="tl-d">${esc(x.d)}</p></div></li>`).join('')}</ol>`;
  }
  function appliedOrderDiscounts(o) {
    const row = (type, [code, amount]) => amount > 0 ? `<div class="sum-row"><span class="c2">${type} ${esc(code)}</span><span class="v">−${fmt(amount)}</span></div>` : '';
    return Object.entries(o.promos || {}).map(entry => row('Промокод', entry)).join('') +
      Object.entries(o.certificates || {}).map(entry => row('Сертификат', entry)).join('');
  }
  function orderCard(o) {
    const s = SELLERS[o.sid]; const confirmed = isConfirmed(o);
    const first = byId(o.lines[0].id);
    const names = o.lines.map((l) => byId(l.id).title).join(', ');
    const count = o.lines.reduce((a, l) => a + l.qty, 0);
    const pvz = DELIVERY[o.dl].needs === 'pvz' && PVZ.find((p) => p.id === o.pvz);
    return `<section class="card stack-12">
      <div class="between"><span class="sb t16">Заказ №${o.no}</span><span class="tag ${confirmed ? 'ok' : 'warn'}">${confirmed ? 'Ожидает оплату' : 'Ожидает подтверждения'}</span></div>
      <div class="oc-row"><img src="${first.img}" alt=""><div style="min-width:0"><p class="sb" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(names)}</p><p class="t12 c3">${count} шт. · продавец ${esc(s.name)}</p></div></div>
      <div class="oc-rows">
        <div class="sum-row"><span class="c2">${DELIVERY[o.dl].title}${pvz ? ', ' + pvz.name : ''}</span><span class="v">${o.delivery ? fmt(o.delivery) : 'бесплатно'}</span></div>
        ${o.fee > 0 && orderSafe(o) ? `<div class="sum-row"><span class="c2">Безопасная сделка</span><span class="v">${fmt(o.fee)}</span></div>` : ''}
        ${appliedOrderDiscounts(o)}
        <div class="sum-row"><span class="c2">${PAYWAY[orderMethod(o)].title}${orderSafe(o) ? ' · Безопасная сделка' : ''}</span><span class="v sb">Итого ${fmt(o.total)}</span></div>
      </div>
    </section>`;
  }
  function accountBlock() {
    const e = S.buyer.email; const ex = S.flags.emailExists;
    return `<section class="card"><div class="acc"><span class="ic">${ic(ex ? 'user' : 'mail', 22)}</span><div class="stack-8" style="min-width:0;flex:1">
      <h2 class="h3">${ex ? 'Заказ добавлен в ваш аккаунт' : 'Мы создали для вас аккаунт'}</h2>
      <p class="c2">${ex ? `Этот email уже зарегистрирован, поэтому заказ лежит в аккаунте <b class="sb">${esc(e)}</b>. Войдите со своим паролем, чтобы следить за заказом и оплатить его` : `Логин: <b class="sb">${esc(e)}</b>. Пароль отправили туда же, в письме «Регистрация». В аккаунте статус заказа, оплата и чек`}</p>
      ${ex ? '' : '<p class="t12 c3">Письма нет? Проверьте папку «Спам»</p>'}
    </div></div></section>`;
  }
  function pageSuccess() {
    ensureOrders();
    const os = S.orders; const multi = os.length > 1;
    const allConf = os.every(isConfirmed);
    const nums = os.map((o) => '№' + o.no).join(', ');
    const title = allConf ? (multi ? `Заказы ${nums} подтверждены` : `Заказ ${nums} подтверждён`) : (multi ? `Заказы ${nums} оформлены` : `Заказ ${nums} оформлен`);
    const okPlay = ui.okAnim !== nums; ui.okAnim = nums;
    return `<div class="wrap page success-wrap"><div class="ok-page stack-12">
      <header class="ok-hd"><span class="ok-ic${okPlay ? ' play' : ''}"><svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><circle class="ok-c" cx="28" cy="28" r="28"/><path class="ok-k" d="M16 29l8 8 16-17" pathLength="1"/></svg></span><h1 class="h1">${title}</h1></header>
      ${multi ? `<div class="note info">${ic('info')}<div class="body">Это ${os.length} отдельных заказа: у каждого продавца своё подтверждение, оплата и доставка</div></div>` : ''}
      <section class="card">
        <h2 class="h3" style="margin-bottom:16px">Что будет дальше</h2>${timeline(os[0], allConf, S.buyer.email, multi)}
        <div class="tg-box sub-box"><div><h3 class="h3">Следите за заказом</h3><p class="c2">Подключите уведомления, и мы сообщим, когда продавец ответит</p></div><div class="row"><button class="btn secondary" data-act="soon" data-text="Подключение уведомлений оставляем как на сайте" aria-label="ВКонтакте"><img src="assets/vk-logo.svg" alt="" width="20" height="20"><span>ВКонтакте</span></button><button class="btn secondary" data-act="soon" data-text="Подключение уведомлений оставляем как на сайте" aria-label="Телеграм"><img src="assets/tg.svg" alt="" width="20" height="20"><span>Телеграм</span></button></div></div>
      </section>
      ${isAuth() ? `<section class="card stack-8"><h2 class="h3">Контакт для связи</h2><p class="c2">Продавец сможет написать вам, если появятся вопросы по заказу</p><div class="row contact-row"><input class="inp" id="contactI" placeholder="Телеграм или ВК" aria-label="Контакт для связи"><button class="btn secondary" data-act="contactSave">Сохранить</button></div></section>` : accountBlock()}
      ${os.map(orderCard).join('')}
      <div class="acts">
        <button class="btn primary lg" ${isAuth() ? 'data-act="toLk"' : 'data-act="loginFor" data-text="Войдите, чтобы открыть заказ"'}>${isAuth() ? (allConf ? 'Оплатить заказ' : 'Открыть заказ') : (allConf ? 'Войти и оплатить' : 'Войти и открыть заказ')}</button>
        <a class="btn secondary lg" href="#/catalog">Продолжить покупки</a>
      </div>
    </div></div>`;
  }

  /* ---------- ЛК: общая оболочка ---------- */
  const atH = (h) => dateStr(new Date(T0 + h * 3600000));
  const hrsLeft = (h) => (h > 48 ? `${Math.floor(h / 24)} дн. ${h % 24} ч` : `${h} ч`);
  const wonIds = () => { const a = Object.keys(S.won || {}); if (!S.flags.noBids) a.push('a-redemptor'); return a.filter((x, i) => a.indexOf(x) === i && !(S.wonDone || []).includes(x)); };
  const wonNeed = () => (isAuth() ? wonIds().length : 0);
  const LK_MENU = [['orders', 'Покупки', '#/lk/orders'], ['auctions', 'Торги', '#/lk/auctions'], ['sell', 'Продажи'], ['products', 'Товары'], ['payment', 'Баланс'], ['settings', 'Настройки']];
  function lkShell(cur, body) {
    const item = ([k, t, href]) => (href ? `<a class="lk-l ${cur === k ? 'on' : ''}" href="${href}"><span>${t}</span>${k === 'auctions' && wonNeed() ? `<span class="badge-i">${wonNeed()}</span>` : ''}</a>` : `<button class="lk-l" data-act="soon" data-text="${k === 'settings' ? 'Поля ЛК это блок первого визита' : 'Этот раздел относится к блоку продажи'}">${t}</button>`);
    return `<div class="wrap page"><div class="lk">
      <aside class="lk-side" aria-label="Личный кабинет"><div class="lk-u"><span class="ava">${esc(myName()[0])}</span><span class="sb">${esc(myName())}</span></div>
        ${S.flags.minus ? `<p class="lk-bal">Баланс: <b>−55 ₽</b></p>` : ''}
        <nav class="lk-nav">${LK_MENU.map(item).join('')}<button class="lk-l" data-act="logout">Выход</button></nav></aside>
      <div class="lk-main">${body}</div>
    </div></div>`;
  }
  const lkGuest = (t) => `<div class="wrap page"><div class="empty"><div class="ico">${ic('user', 28)}</div><p class="h3">${t}</p><p class="c2" style="margin:4px 0 16px">Если заказ оформлен без регистрации, логин и пароль пришли на вашу почту</p><button class="btn primary" data-act="login">Войти</button></div></div>`;

  /* ---------- ЛК: покупки ---------- */
  const LK_BASE = [
    { no: 464812, st: 'approve', dl: 'yd', pay: 'card', left: 47, lines: [{ id: 'strudd', qty: 1 }] },
    { no: 464811, st: 'pay', dl: 'post', pay: 'card', left: 70, lines: [{ id: 'zeratul', qty: 1 }] },
    { no: 464809, st: 'pay', dl: 'pickup', pay: 'cash', left: 70, lines: [{ id: 'brutalis', qty: 1 }] },
    { no: 464808, st: 'pay', dl: 'yd', pay: 'safe', left: 70, lines: [{ id: 'assassins', qty: 1 }] },
    { no: 464806, st: 'paid', dl: 'cdek', pay: 'card', left: 30, lines: [{ id: 'darkshroud', qty: 1 }], receipt: 'чек-464806.pdf' },
    { no: 464805, st: 'paid', dl: 'yd', pay: 'safe', left: 62, lines: [{ id: 'strudd', qty: 1 }] },
    { no: 464803, st: 'process', dl: 'post', pay: 'card', left: 62, lines: [{ id: 'warriors', qty: 1 }], receipt: 'чек-464803.jpg' },
    { no: 464798, st: 'sent', dl: 'post', pay: 'card', left: 120, lines: [{ id: 'trukk', qty: 1 }], track: '80080012345678', receipt: 'чек-464798.png' },
    { no: 464790, st: 'got', dl: 'yd', pay: 'card', lines: [{ id: 'prisoners', qty: 2 }], track: 'YD102938475', receipt: 'чек-464790.pdf' },
    { no: 464788, st: 'got', dl: 'yd', pay: 'card', lines: [{ id: 'prisoners', qty: 2 }], review: { stars: 5, text: 'Всё пришло вовремя, упаковано хорошо' } },
    { no: 464781, st: 'dispute', dl: 'post', pay: 'card', stop: 5, lines: [{ id: 'arkham', qty: 1 }], track: '80080098765432', receipt: 'чек-464781.pdf', by: 'buyer' },
    { no: 464774, st: 'cancel', dl: 'post', pay: 'card', stop: 3, wasProcess: true, why: 'Продавец не отправил заказ в срок', lines: [{ id: 'yucatan', qty: 1 }] },
    { no: 464760, st: 'cancel', dl: 'pickup', pay: 'cash', stop: 1, why: 'Продавец не ответил за 48 часов', lines: [{ id: 'lutazy', qty: 1 }] },
  ];
  const newOrders = () => (S.orders || []).map((o) => ({ no: o.no, st: isConfirmed(o) ? (o.pay === 'cash' ? 'process' : 'pay') : 'approve', dl: o.dl, pay: orderMethod(o), safe: orderSafe(o), left: isConfirmed(o) ? 72 : 48, lines: o.lines, promos: o.promos, certificates: o.certificates, fee: o.fee, total: o.total, delivery: o.delivery }));
  const lkOrders = () => (S.flags.noOrders ? [] : newOrders().concat(LK_BASE).map((o) => Object.assign({}, o, (S.lkO || {})[o.no])));
  const lkGet = (no) => lkOrders().find((o) => o.no === +no);
  const lkPatch = (no, p) => { S.lkO = S.lkO || {}; S.lkO[no] = Object.assign({}, S.lkO[no], p); save(); };
  const lkSeller = (o) => byId(o.lines[0].id).seller;
  const lkSum = (o) => o.lines.reduce((a, l) => a + byId(l.id).price * l.qty, 0);
  const lkFee = (o) => (orderSafe(o) ? (o.fee ?? safeFee(lkSum(o))) : 0);
  const lkTotal = (o) => o.total ?? (lkSum(o) + DELIVERY[o.dl].price + lkFee(o));
  const OST = {
    approve: { t: 'Ожидает подтверждения', c: 'wait' }, pay: { t: 'Ожидает оплату', c: 'act' }, paid: { t: 'Произведена оплата', c: 'wait' }, process: { t: 'В обработке', c: 'wait' },
    sent: { t: 'Отправлен', c: 'act' }, got: { t: 'Получен', c: 'ok' }, dispute: { t: 'Спор', c: 'bad' }, cancel: { t: 'Отменён', c: 'mute' },
  };
  function lkNext(o) {
    const s = SELLERS[lkSeller(o)];
    const d = (h) => `${atH(h)}, осталось ${hrsLeft(h)}`;
    if (o.st === 'approve') return { h: 'Ждём ответ продавца', p: 'Он проверит наличие и стоимость доставки. Платить пока не нужно. Если не ответит, заказ отменится', d: `Ответ до ${d(o.left)}` };
    if (o.st === 'pay' && o.pay === 'cash') return { h: 'Оплата при встрече', p: `Договоритесь с ${s.name} о месте и времени. Чек загружать не нужно`, d: `Встреча до ${d(o.left)}` };
    if (o.st === 'pay' && orderSafe(o)) return { h: 'Оплатите заказ онлайн', p: 'Деньги останутся у нас и перейдут продавцу, когда вы подтвердите получение', d: `Оплатить до ${d(o.left)}` };
    if (o.st === 'paid' && orderSafe(o)) return { h: 'Деньги у сервиса', p: 'Продавец готовит заказ. Он получит деньги, когда вы подтвердите получение', d: `Отправка до ${d(o.left)}` };
    if (o.st === 'pay') return { h: 'Оплатите заказ', p: 'Переведите сумму продавцу и приложите чек. Если не успеть, заказ отменится', d: `Оплатить до ${d(o.left)}` };
    if (o.st === 'paid') return { h: 'Продавец проверяет оплату', p: 'Если он не ответит, через 48 часов заказ сам перейдёт в обработку', d: `Проверка до ${d(o.left)}` };
    if (o.st === 'process') return { h: 'Продавец готовит заказ', p: 'Когда он отправит посылку, здесь появится трек-номер', d: `Отправка до ${d(o.left)}` };
    if (o.st === 'sent') return { h: 'Заказ в пути', p: 'Когда получите, подтвердите получение. Если что-то не так, сначала откройте спор: после подтверждения его не открыть', d: `Спор можно открыть до ${d(o.left)}` };
    if (o.st === 'got') return o.review ? { h: 'Спасибо за отзыв', p: 'Он появился на странице продавца' } : { h: 'Заказ получен', p: 'Отзыв поможет другим покупателям выбрать продавца' };
    if (o.st === 'dispute') return { h: o.by === 'buyer' ? 'Вы открыли спор' : 'Спор открыл продавец', p: 'Напишите нам на почту: укажите номер заказа и опишите причину. Деньги и посылку обсудим в переписке' };
    return { h: 'Заказ отменён', p: o.why };
  }
  /* ---------- ЛК: заказ, шаги ---------- */
  function lkTimeline(o) {
    const cash = o.pay === 'cash'; const safe = orderSafe(o); const pickup = o.dl === 'pickup';
    const steps = [
      { done: 'Заказ оформлен', now: 'Заказ оформлен', d: '' },
      { done: 'Продавец подтвердил заказ', now: 'Продавец подтверждает заказ', d: 'Проверяет наличие и стоимость доставки' },
      { done: cash ? 'Оплата при встрече' : safe ? 'Заказ оплачен онлайн' : 'Заказ оплачен', now: o.st === 'paid' ? 'Продавец проверяет оплату' : cash ? 'Договоритесь об оплате при встрече' : safe ? 'Оплатите заказ онлайн' : 'Оплатите заказ и приложите чек', d: safe ? 'Деньги останутся у нас, пока вы не получите заказ' : '' },
      { done: pickup ? 'Заказ передан' : 'Заказ отправлен', now: pickup ? 'Продавец готовит заказ к встрече' : 'Продавец отправляет заказ', d: '' },
      { done: 'Заказ получен', now: 'Получите заказ и подтвердите', d: safe ? 'После подтверждения продавец получит деньги' : '' },
    ];
    const cur = { approve: 1, pay: 2, paid: 2, process: 3, sent: 4, got: 5 }[o.st];
    const stop = o.stop;
    const li = (cls, n, t, d) => `<li class="${cls}"><span class="d">${cls === 'done' ? ic('check', 14) : cls === 'stop' ? ic('x', 14) : n}</span><div><p class="tl-t">${esc(t)}</p>${d ? `<p class="tl-d">${esc(d)}</p>` : ''}</div></li>`;
    if (stop !== undefined) return `<ol class="tl">${steps.slice(0, stop).map((x, i) => li('done', i + 1, x.done, '')).join('')}${li('stop', stop + 1, o.st === 'dispute' ? 'Открыт спор' : 'Заказ отменён', o.st === 'cancel' ? o.why : '')}</ol>`;
    return `<ol class="tl">${steps.map((x, i) => (i < cur ? li('done', i + 1, x.done, '') : i === cur ? li('now', i + 1, x.now, x.d) : li('', i + 1, x.now, ''))).join('')}</ol>`;
  }
  function lkMainAct(o) {
    if (o.st === 'pay' && o.pay !== 'cash') return `<button class="btn primary lg block" data-act="payOpen" data-no="${o.no}">${orderSafe(o) ? `Оплатить ${fmt(lkTotal(o))}` : 'Оплатить'}</button>`;
    if (o.st === 'sent') return `<button class="btn primary lg block" data-act="cfm" data-k="got" data-no="${o.no}">Заказ получен</button>`;
    if (o.st === 'got' && !o.review && !S.flags.minus) return `<button class="btn primary lg block" data-act="revOpen" data-no="${o.no}">Оставить отзыв</button>`;
    if (o.st === 'cancel' && o.wasProcess && !o.review && !S.flags.minus) return `<button class="btn secondary lg block" data-act="revOpen" data-no="${o.no}">Оставить отзыв</button>`;
    return '';
  }
  function lkManage(o) {
    const next = route().q.demo === 'change-order'; const a = [];
    if (o.st === 'sent') a.push(`<button class="btn secondary block" data-act="soon" data-text="Ссылка ведёт на отслеживание у перевозчика">Отследить посылку</button>`);
    if (o.st === 'sent') a.push(`<button class="btn secondary block" data-act="cfm" data-k="openDispute" data-no="${o.no}">Открыть спор</button>`);
    if (o.st === 'dispute' && o.by === 'buyer') a.push(`<button class="btn secondary block" data-act="cfm" data-k="closeDispute" data-no="${o.no}">Закрыть спор</button>`);
    if (next && ['approve', 'pay', 'paid', 'process'].includes(o.st) && !o.dlReq) a.push(`<button class="btn secondary block" data-act="dlOpen" data-no="${o.no}">Изменить доставку</button>`);
    if (['approve', 'pay'].includes(o.st)) a.push(`<button class="btn secondary block" data-act="cfm" data-k="cancel" data-no="${o.no}">Отменить заказ</button>`);
    if (next && ['paid', 'process'].includes(o.st) && !o.cancelReq) a.push(`<button class="btn secondary block" data-act="cfm" data-k="askCancel" data-no="${o.no}">Запросить отмену</button>`);
    return a.join('');
  }
  function pageLkOrder(no) {
    const o = lkGet(no);
    if (!o) return lkShell('orders', `<div class="empty"><p class="h3">Заказ не найден</p><a class="btn primary" style="margin-top:16px" href="#/lk/orders">Все покупки</a></div>`);
    const s = SELLERS[lkSeller(o)]; const st = OST[o.st]; const n = lkNext(o); const D = DELIVERY[o.dl];
    const row = (k, v) => `<div class="info-r"><dt>${k}</dt><dd>${v}</dd></div>`;
    const delivery = o.delivery ?? D.price;
    const main = lkMainAct(o); const manage = lkManage(o);
    return lkShell('orders', `<a class="back" href="#/lk/orders">${ic('left', 16)}Все покупки</a>
      <div class="ordp-hd"><h1 class="h1">Заказ №${o.no}</h1><span class="ost ${st.c}">${st.t}</span></div>
      <div class="ordp">
        <div class="stack-12">
          <section class="ord-next ord-next-p ${st.c}"><p class="h3">${esc(n.h)}</p><p>${esc(n.p)}</p>${n.d ? `<p class="ord-dead">${ic('clock', 16)}<span>${esc(n.d)}</span></p>` : ''}${o.cancelReq ? '<p class="c2">Запрос на отмену отправлен продавцу</p>' : ''}${o.dlReq ? '<p class="c2">Запрос на смену доставки отправлен продавцу</p>' : ''}</section>
          <section class="card"><h2 class="h3 ordp-t">Как идёт заказ</h2>${lkTimeline(o)}</section>
          <section class="card"><h2 class="h3 ordp-t">Товары</h2><div class="ord-items">${o.lines.map((l) => { const it = byId(l.id); return `<a class="ord-it" href="#/${it.lot ? 'lot' : 'item'}/${it.id}"><img src="${it.img}" alt=""><span class="ord-t">${esc(it.title)}<span class="c2 ord-q">${l.qty} шт.</span></span><span class="sb ord-p">${fmt(it.price * l.qty)}</span></a>`; }).join('')}</div>
            ${o.review ? `<div class="ord-rev"><p class="sb">Ваш отзыв</p><div class="rev-st">${[1, 2, 3, 4, 5].map((x) => `<span class="${x <= o.review.stars ? 'on' : ''}">${STAR}</span>`).join('')}</div><p>${esc(o.review.text)}</p></div>` : ''}</section>
          <section class="card"><h2 class="h3 ordp-t">Доставка и оплата</h2><dl class="info">
            ${row('Способ получения', esc(D.title))}
            ${o.track ? row('Трек-номер', `${esc(o.track)} <button class="linkbtn" data-act="copy" data-v="${esc(o.track)}">Скопировать</button>`) : ''}
            ${row('Способ оплаты', esc(PAYWAY[orderMethod(o)].title))}
            ${o.receipt ? row('Чек', `<button class="linkbtn" data-act="soon" data-text="Файл открывается в новой вкладке">${ic('clip', 16)}${esc(o.receipt)}</button>`) : ''}
          </dl></section>
        </div>
        <aside class="stack-12 ordp-side">
          <section class="card stack-8 lk-order-total"><div class="sum-row"><span class="c2">Товары</span><span class="v">${fmt(lkSum(o))}</span></div><div class="sum-row"><span class="c2">Доставка</span><span class="v">${delivery ? fmt(delivery) : 'бесплатно'}</span></div>${appliedOrderDiscounts(o)}${lkFee(o) ? `<div class="sum-row"><span class="c2">Безопасная сделка ×${o.lines.reduce((a, l) => a + l.qty, 0)}</span><span class="v">${fmt(lkFee(o))}</span></div>` : ''}<div class="sum-total"><span>Итого</span><span class="v">${fmt(lkTotal(o))}</span></div>${main}</section>
          <section class="card stack-8"><h2 class="h3">Продавец</h2><a class="link" href="#/reviews/${lkSeller(o)}" target="_blank">${esc(s.name)}</a><p class="c2">г. ${esc(s.city)}</p>${S.flags.minus ? '<p class="c2">Контакты скрыты: баланс ниже нуля</p>' : `<button class="btn secondary block" data-act="soon" data-text="Контакт продавца открывается в Телеграме или ВК">Написать продавцу</button>`}</section>
          ${manage ? `<section class="card stack-8 lk-order-actions" aria-label="Действия с заказом">${manage}</section>` : ''}
        </aside>
      </div>`);
  }
  function lkCard(o) {
    const n = lkNext(o); const s = SELLERS[lkSeller(o)]; const st = OST[o.st]; const first = byId(o.lines[0].id); const url = `#/lk/order/${o.no}`;
    const count = o.lines.reduce((a, l) => a + l.qty, 0);
    return `<article class="ord ord-c card" id="o${o.no}">
      <header class="ord-hd"><div><a class="h3 ord-no" href="${url}">Заказ №${o.no}</a><p class="c2">${esc(s.name)}</p></div><span class="ost ${st.c}">${st.t}</span></header>
      <a class="ord-it" href="${url}"><img src="${first.img}" alt=""><span class="ord-t">${esc(first.title)}${o.lines.length > 1 ? ` и ещё ${o.lines.length - 1}` : ''}<span class="c2 ord-q">${count} шт.</span></span><span class="sb ord-p">${fmt(lkSum(o))}</span></a>
      <div class="ord-next ${st.c} ${n.d ? 'has-d' : ''}"><p class="sb">${esc(n.h)}</p>${n.d ? `<p>${esc(n.d)}</p>` : ''}</div>
      <div class="ord-ft">${lkMainAct(o).replace('lg block', '')}<a class="btn secondary" href="${url}">Подробнее</a></div>
    </article>`;
  }
  function pageLkOrders() {
    const tab = ui.lkTab || 'all'; const q = (ui.lkQ || '').trim().toLowerCase(); const f = ui.lkF || {};
    const active = (o) => !['got', 'cancel'].includes(o.st);
    const all = lkOrders();
    const hit = (o) => { const s = SELLERS[lkSeller(o)]; const hay = `${o.no} ${s.name} ${o.lines.map((l) => byId(l.id).title).join(' ')}`.toLowerCase(); return !q || hay.includes(q); };
    let list = all.filter((o) => (tab === 'all' || (tab === 'on' ? active(o) : !active(o))) && hit(o) && (!f.st || f.st === 'all' || o.st === f.st) && (!f.pay || f.pay === 'all' || (f.pay === 'safe' ? orderSafe(o) : orderMethod(o) === f.pay)) && (!f.dl || f.dl === 'all' || o.dl === f.dl));
    if (f.sort === 'old') list = list.slice().reverse();
    if (f.sort === 'cheap') list = list.slice().sort((a, b) => lkTotal(a) - lkTotal(b));
    if (f.sort === 'dear') list = list.slice().sort((a, b) => lkTotal(b) - lkTotal(a));
    const tabs = [['all', 'Все', all.length], ['on', 'Активные', all.filter(active).length], ['off', 'Завершённые', all.filter((o) => !active(o)).length]];
    const need = all.filter((o) => (o.st === 'pay' && o.pay !== 'cash') || o.st === 'sent').length;
    const stOpts = [['all', 'Любой статус']].concat(Object.keys(OST).map((k) => [k, OST[k].t]));
    const payOpts = [['all', 'Любая оплата']].concat(Object.keys(PAYWAY).map((k) => [k, PAYWAY[k].title]));
    const dlOpts = [['all', 'Любая доставка']].concat(Object.keys(DELIVERY).map((k) => [k, DELIVERY[k].title]));
    return lkShell('orders', `<h1 class="h1" style="margin-bottom:12px">Покупки</h1>
      ${S.flags.minus ? `<div class="note warn" style="margin-bottom:12px">${ic('alert')}<div class="body">Баланс ниже нуля, поэтому контакты второй стороны и отзывы недоступны. Пополните баланс, чтобы вернуть их</div></div>` : ''}
      ${all.length ? `<div class="lk-bar"><div class="tabs-seg scroll-x">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="lkTab" data-v="${k}">${l} ${n}</button>`).join('')}</div></div>
      <div class="lk-flt"><input class="inp lk-q" id="lkQ" placeholder="Номер, товар или продавец" aria-label="Поиск по заказам" value="${esc(ui.lkQ || '')}">${dd('lkSt', f.st || 'all', stOpts, { aria: 'Статус' })}${dd('lkPay', f.pay || 'all', payOpts, { aria: 'Способ оплаты' })}${dd('lkDl', f.dl || 'all', dlOpts, { aria: 'Доставка' })}${dd('lkSort', f.sort || 'new', [['new', 'Сначала новые'], ['old', 'Сначала старые'], ['cheap', 'Сначала дешевле'], ['dear', 'Сначала дороже']], { aria: 'Сортировка' })}</div>
      ${need && tab !== 'off' ? `<p class="c2 lk-need">Ждут вашего действия: ${need}</p>` : ''}
      ${list.length ? `<div class="stack-12">${list.map(lkCard).join('')}</div>` : `<div class="empty"><div class="ico">${ic('search', 28)}</div><p class="h3">Заказов не найдено</p><p class="c2">Измените поиск или фильтры</p><button class="btn secondary" data-act="lkReset">Сбросить фильтры</button></div>`}`
        : `<div class="empty"><div class="ico">${ic('cart', 28)}</div><p class="h3">Пока нет покупок</p><p class="c2" style="margin:4px 0 16px">Здесь появятся ваши заказы, оплата и чеки</p><a class="btn primary" href="#/catalog">Перейти в каталог</a></div>`}`);
  }
  function pageLk(r) {
    if (r.id === 'auctions') return isAuth() ? pageLkBids() : lkGuest('Войдите, чтобы увидеть свои торги');
    if (r.id === 'order') return isAuth() ? pageLkOrder(r.sub) : lkGuest('Войдите, чтобы открыть заказ');
    return isAuth() ? pageLkOrders() : lkGuest('Войдите, чтобы увидеть заказы');
  }

  /* ---------- Слои ЛК ---------- */
  const sizeTxt = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} МБ` : `${Math.max(1, Math.round(b / 1024))} КБ`);
  function rcBlock() {
    const r = ui.rc || {};
    return `<div class="rc"><p class="lbl-b">Чек об оплате</p>
      ${r.name ? `<div class="rc-f ${r.err ? 'bad' : ''}">${ic('clip', 20)}<span class="rc-n"><span class="sb">${esc(r.name)}</span><span class="t12 c3">${esc(r.size || '')}</span></span><button class="icon-btn" style="width:32px;height:32px" data-act="rcClear" aria-label="Убрать файл">${ic('x', 16)}</button></div>`
        : `<label class="rc-drop ${r.err ? 'bad' : ''}"><input type="file" id="rcFile" accept=".jpg,.jpeg,.png,.pdf">${ic('clip', 20)}<span class="sb">Выбрать файл</span></label>`}
      ${r.err ? `<p class="err-t">${ic('alert', 14)}<span>${esc(r.err)}</span></p>` : '<p class="hint">JPG, PNG или PDF, до 20 МБ</p>'}</div>`;
  }
  function lkModals() {
    const m = ui.modal; if (!m) return '';
    const wrap = (title, body, foot, label) => `<div class="scrim" data-act="closeModal"><div class="modal lk-modal" role="dialog" aria-label="${esc(label || title)}" data-stop><div class="modal-hd"><span class="h3">${esc(title)}</span><button class="icon-btn" data-act="closeModal" aria-label="Закрыть">${ic('x')}</button></div><div class="modal-bd stack-12">${body}</div>${foot ? `<div class="modal-ft">${foot}</div>` : ''}</div></div>`;
    if (m.pay && orderSafe(lkGet(m.pay))) {
      const o = lkGet(m.pay);
      return wrap(`Оплата заказа №${o.no}`, `<div class="reqs"><div class="req"><span class="c2">Товары и доставка</span><span class="req-v sb">${fmt(lkTotal(o) - lkFee(o))}</span></div><div class="req"><span class="c2">Безопасная сделка ×${o.lines.reduce((a, l) => a + l.qty, 0)}</span><span class="req-v sb">${fmt(lkFee(o))}</span></div></div><div class="note ok">${ic('shield')}<div class="body">Деньги хранятся у нас, пока вы не получите заказ. Чек загружать не нужно</div></div>`, `<button class="btn primary lg block" data-act="safePay">Оплатить ${fmt(lkTotal(o))}</button>`);
    }
    if (m.pay) {
      const o = lkGet(m.pay); const s = SELLERS[lkSeller(o)];
      const row = (k, v, copy) => `<div class="req"><span class="c2">${k}</span><span class="req-v sb">${esc(v)}</span><button class="lk-copy" aria-label="Скопировать: ${esc(k)}" data-act="copy" data-v="${esc(copy || v)}"><svg class="i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 5V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v10a1 1 0 0 0 1 1h1"/></svg></button></div>`;
      return wrap(`Оплата заказа №${o.no}`, `<div class="note warn">${ic('alert')}<div class="body">Оплатите до ${esc(atH(o.left))}, иначе заказ отменится</div></div>
        <div class="reqs">${row('Сумма', fmt(lkTotal(o)), String(lkTotal(o)))}${row('Номер карты', '2200 1234 5678 9012')}${row('Получатель', `${s.name}, Иван П.`)}</div>
        ${rcBlock()}`, `<button class="btn primary lg block ${ui.rcBusy ? 'is-loading' : ''}" data-act="rcSend">${ui.rcBusy ? '<span class="spin"></span>' : 'Отправить чек'}</button>`);
    }
    if (m.cfm) {
      const O = m.no ? lkGet(m.no) : null; const T = { got: ['Подтвердить получение?', O && orderSafe(O) ? 'После подтверждения продавец получит деньги, а открыть спор будет нельзя' : 'После подтверждения нельзя будет открыть спор. Открыть спор можно здесь, если что-то не так', 'Заказ получен', 'primary'], openDispute: ['Открыть спор?', 'Напишите нам на почту: укажите номер заказа и опишите причину', 'Открыть спор', 'primary'], cancel: ['Отменить заказ?', 'Заказ отменится для вас и продавца. Вернуть его будет нельзя', 'Отменить заказ', 'primary'], askCancel: ['Запросить отмену?', 'Продавец получит запрос. Заказ отменится, если он согласится, и он вернёт деньги напрямую', 'Отправить запрос', 'primary'], closeDispute: ['Закрыть спор?', 'Заказ вернётся в статус «Отправлен»', 'Закрыть спор', 'primary'], dropLot: ['Отказаться от лота?', 'За отказ от выигранного лота спишется штраф. Лот вернётся продавцу', 'Отказаться', 'primary'] }[m.cfm];
      const alt = m.cfm === 'got' ? `<button class="btn secondary block" data-act="cfm" data-k="openDispute" data-no="${m.no}">Открыть спор</button>` : '';
      return wrap(T[0], `<p class="c2">${esc(T[1])}</p>`, `<button class="btn primary block" data-act="cfmDo" data-k="${m.cfm}">${T[2]}</button>${alt}<button class="btn ghost block" data-act="closeModal">Назад</button>`);
    }
    if (m.dl) {
      const o = lkGet(m.dl); const s = SELLERS[lkSeller(o)];
      return wrap('Изменить доставку', `<p class="c2">Продавец получит запрос и подтвердит новую стоимость</p><div class="opt-list">${s.deliveries.map((d) => { const on = d === (ui.dlNew || o.dl); return `<label class="opt ${on ? 'on' : ''}"><input type="radio" name="dlNew" value="${d}" ${on ? 'checked' : ''}><span class="main">${esc(DELIVERY[d].title)}</span></label>`; }).join('')}</div>`, `<button class="btn primary block" data-act="dlSend">Отправить запрос</button>`);
    }
    if (m.rev) {
      const r = ui.rv || {};
      return wrap('Отзыв о заказе', `<div><p class="lbl-b">Оценка</p><div class="rate-in">${[1, 2, 3, 4, 5].map((x) => `<button class="${x <= (r.stars || 0) ? 'on' : ''}" data-act="revStar" data-v="${x}" aria-label="${x} из 5">${STAR}</button>`).join('')}</div>${r.errS ? `<p class="err-t">${ic('alert', 14)}<span>Поставьте оценку</span></p>` : ''}</div>
        <label class="fld ${r.errT ? 'err' : ''}"><span class="lbl">Ваш отзыв</span><textarea class="inp" aria-invalid="${!!r.errT}" id="revText" rows="4">${esc(r.text || '')}</textarea>${r.errT ? `<span class="err-t">Напишите отзыв</span>` : ''}</label>
        <button class="linkbtn" data-act="soon" data-text="Прикрепление изображений как на сайте">${ic('clip', 16)}Добавить изображения</button>`, `<button class="btn primary lg block" data-act="revSend">Опубликовать</button>`);
    }
    if (m.bidsOf) {
      const a = byAny(m.bidsOf); const l = lotInfo(a); const n = Math.min(l.bids, 6);
      const rows = Array.from({ length: n }, (_, i) => {
        const price = l.history?.[i] ?? l.price - i * l.step;
        return `<div class="req"><span class="c2">${l.ls.my === price ? 'Вы' : `User${51234 - i * 73}`}</span><span class="req-v sb">${fmt(price)}</span><span class="t12 c3">${atH(-(i + 1) * 3)}</span></div>`;
      }).join('');
      return wrap(`Ставки: ${l.bids}`, n ? `<div class="reqs">${rows}</div>` : '<p class="c2">Ставок пока нет</p>');
    }
    if (m.mail) {
      const sent = ui.mailSent;
      return wrap('Подтвердите почту', `<p class="c2">Для ставки нужна подтверждённая почта. ${sent ? 'Мы отправили код на ivanov@example.com' : 'Отправим код на ivanov@example.com'}</p>${sent ? `<label class="fld ${ui.mailErr ? 'err' : ''}"><span class="lbl">Код из письма</span><input class="inp" id="mailCode" aria-invalid="${!!ui.mailErr}" inputmode="numeric" value="${esc(ui.mailValue || '')}" placeholder="1234"></label>${ui.mailErr ? `<p class="err-t">${ic('alert', 14)}<span>${esc(ui.mailErr)}</span></p>` : ''}<button class="linkbtn" data-act="soon" data-text="Код отправлен ещё раз">Отправить код ещё раз</button>` : ''}`, sent ? `<button class="btn primary lg block" data-act="mailDo">Подтвердить и продолжить</button>` : `<button class="btn primary lg block" data-act="mailSend">Отправить код</button>`);
    }
    return '';
  }

  /* ---------- Аукцион ---------- */
  const LOTX = { 'a-leman': { step: 50, reserve: 1500 }, 'a-guilliman': { step: 50, blitz: 2500 }, 'a-redemptor': { step: 50 }, 'a-deathwatch': { step: 50 }, 'a-own': { step: 50 } }; // пример: шаг, резерв и блиц-цена
  const MAX_BET = 1000000;
  function lotInfo(a) {
    const x = LOTX[a.id] || { step: 50 };
    const q = route().q;
    const saved = S.lot?.[a.id] || {};
    const previous = (q.ended || q.mine) && LK_BIDS.find((bid) => bid.id === a.id);
    let ls = saved;
    if (!ls.st && previous) ls = { st: previous.st === 'wonDemo' ? 'won' : previous.st, my: previous.my };
    // При открытии завершённых торгов сохранённая активная ставка не возвращает форму.
    if (q.ended && !['won', 'lost', 'reserve', 'ended'].includes(ls.st)) {
      ls = previous?.st === 'wonDemo' ? { st: 'won', my: previous.my }
        : previous?.st === 'lost' ? { st: 'lost', my: previous.my } : { st: 'closed' };
    }
    const price = ls.price || a.price;
    const liveCount = a.bids + (ls.n || 0);
    const history = !liveCount && ls.st === 'lost' && ls.my < price ? [price, ls.my] : null;
    const bids = ls.st === 'ended' ? 0 : history?.length ?? liveCount;
    return { x, ls, price, bids, history, step: x.step, next: bids ? price + x.step : price, end: T0 + a.hours * 3600000, over: ['won', 'lost', 'reserve', 'ended', 'closed'].includes(ls.st) };
  }
  const isOwnLot = (a) => role() === 'seller' && a.seller === OWN_SELLER;
  function bidPanel(a) {
    const l = lotInfo(a); const s = SELLERS[a.seller]; const x = l.x; const ls = l.ls; const own = isOwnLot(a);
    const urgent = l.end - Date.now() <= URGENT_MS;
    const dl = s.deliveries.map((d) => DELIVERY[d].title).join(', ');
    const reserve = x.reserve ? `<span class="tag ${l.price >= x.reserve ? 'ok' : 'warn'}">${l.price >= x.reserve ? 'Резерв достигнут' : 'Резерв не достигнут'}</span>` : '';
    const cell = (k, t) => `<span><b data-c="${k}"></b><i>${t}</i></span>`;
    const head = l.over ? `<div class="bid-end"><span class="sb">Торги завершены</span><span class="t12 c2">${atH(-2)}</span></div>`
      : `<div class="bt-cells ${urgent ? 'urgent' : ''}" data-cells="${l.end}"><p class="bt-l">До конца торгов</p><div class="bt-row">${cell('h', 'часов')}${cell('m', 'минут')}${cell('s', 'секунд')}</div></div>`;
    const meta = `<button class="linkbtn" data-act="bidsOpen" data-id="${a.id}">${l.bids ? `${l.bids} ${plural(l.bids, 'ставка', 'ставки', 'ставок')}` : 'Ставок пока нет'}</button>${reserve}`;
    const priceL = `<div><p class="t12 c2">${l.bids ? (l.over ? 'Последняя ставка' : 'Текущая ставка') : 'Стартовая цена'}</p><p class="price-big">${fmt(l.price)}</p></div>`;
    const price = `<div class="bid-now">${priceL}<div class="bid-meta">${meta}</div></div>`;
    let note = '';
    if (ls.st === 'lead') note = `<div class="note ok">${ic('check')}<div class="body">Вы лидируете со ставкой ${fmt(ls.my)}${ls.auto ? `. Автоставка до ${fmt(ls.auto)}: поднимем ставку, если её перебьют` : ''}</div></div>`;
    if (ls.st === 'outbid') note = `<div class="note warn">${ic('alert')}<div class="body">Вашу ставку ${fmt(ls.my)} перебили. Поставьте от ${fmt(l.next)}, чтобы вернуться в лидеры</div></div>`;
    if (ls.st === 'won') {
      note = `<div class="note ok">${ic('check')}<div class="body"><b>Вы выиграли лот за ${fmt(ls.my)}</b></div></div>
        <ol class="tl"><li class="now"><span class="d">1</span><div><p class="tl-t">Оформите заказ за 48 часов</p><p class="tl-d">Лот уже в корзине. Если не оформить, спишется штраф</p></div></li><li><span class="d">2</span><div><p class="tl-t">Продавец подтвердит заказ</p><p class="tl-d">Проверит наличие и стоимость доставки</p></div></li><li><span class="d">3</span><div><p class="tl-t">Оплатите заказ</p></div></li></ol>
        <button class="btn primary lg block" data-act="wonGo" data-id="${a.id}" data-p="${ls.my}">Перейти в корзину</button>`;
    }
    if (ls.st === 'lost') note = `<div class="note info">${ic('info')}<div class="body">Лот выиграл другой участник. Ваша ставка ${fmt(ls.my)}</div></div><a class="btn secondary lg block" href="#/catalog" data-act="tab" data-v="auc">Другие аукционы</a>`;
    if (ls.st === 'reserve') note = `<div class="note warn">${ic('alert')}<div class="body">Резерв не достигнут: лот не продан, штрафа нет. Решение за продавцом</div></div>`;
    if (ls.st === 'ended') note = `<div class="note info">${ic('info')}<div class="body">Торги завершились без ставок</div></div>`;
    if (own) note = `<div class="note info">${ic('info')}<div class="body">Это ваш аукцион: ставить на него нельзя. Участников и ставки видно здесь</div></div>`;
    let form = '';
    if (!l.over && !own) {
      if (S.flags.minus && isAuth()) form = `<div class="note bad">${ic('alert')}<div class="body">Баланс ниже нуля. Пополните его, чтобы участвовать в торгах</div></div>`;
      else {
        const arm = ui.bidArm; const lead = ls.st === 'lead';
        form = arm ? `<div class="bid-arm">
            <p class="bid-arm-l">Подтвердите ставку</p>
            <p class="bid-arm-a">${fmt(arm)}</p>
            <p class="bid-arm-s">${l.bids ? `Текущая ставка ${fmt(l.price)}` : `Стартовая цена ${fmt(l.price)}`}. Отменить ставку нельзя</p>
            ${lead ? `<p class="bid-arm-w">${ic('info', 16)}<span>Ваша ставка уже лидирует</span></p>` : ''}${arm >= l.price * 3 ? `<p class="bid-arm-w bad">${ic('alert', 16)}<span>Это в ${Math.floor(arm / l.price)} ${plural(Math.floor(arm / l.price), 'раз', 'раза', 'раз')} больше текущей ставки</span></p>` : ''}
            <button class="btn primary lg block" id="bidOk" data-act="bidDo">Подтвердить ставку</button>
            <button class="linkbtn bid-arm-e" data-act="bidBack">Изменить сумму</button>
          </div>`
          : `<div class="bid-f"><label class="lbl" for="bidI">Ваша ставка, ₽</label><div class="bid-row"><input class="inp" id="bidI" aria-invalid="${!!ui.bidErr}" inputmode="numeric" value="${esc(ui.bidV !== undefined ? ui.bidV : l.next)}"><button class="btn primary" data-act="${isAuth() ? 'bidGo' : 'loginFor'}" ${isAuth() ? '' : 'data-text="Войдите, чтобы сделать ставку"'}>Сделать ставку</button></div>
          ${ui.bidErr ? `<p class="err-t" role="alert">${ic('alert', 14)}<span>${esc(ui.bidErr)}</span></p>` : `<p class="hint">От ${fmt(l.next)}, шаг от ${fmt(l.step)}</p>`}</div>
          ${isAuth() ? `<button class="linkbtn" data-act="autoT" aria-expanded="${!!ui.autoOpen}">Автоставка ${ic(ui.autoOpen ? 'up' : 'down', 16)}</button>
          ${ui.autoOpen ? `<div class="bid-auto"><p class="t12 c2">Поднимем вашу ставку на шаг, когда её перебьют, но не выше этой суммы</p><div class="row"><input class="inp" id="autoI" inputmode="numeric" placeholder="Сумма, ₽" aria-label="Сумма автоставки" value="${esc(ls.auto || '')}"><button class="btn secondary" data-act="autoGo">Сохранить</button></div>${ui.autoErr ? `<p class="err-t">${ic('alert', 14)}<span>${esc(ui.autoErr)}</span></p>` : ''}</div>` : ''}` : ''}
          ${x.blitz ? `<button class="btn lg block blitz" data-act="${isAuth() ? 'blitz' : 'loginFor'}" ${isAuth() ? '' : 'data-text="Войдите, чтобы купить лот"'}>Купить по блиц-цене ${fmt(x.blitz)}</button>` : ''}`;
      }
    }
    return `<div class="buy-top"><a class="c3 t12" href="#/catalog" data-act="nodeq" data-v="${esc(a.cat)}">${esc(a.cat)}</a><h1 class="pdp-title">${esc(a.title)}</h1></div>
      ${head}${price}${note}${form}
      <ul class="facts">
        <li>${ic('truck')}<span><b>Доставка.</b> ${esc(dl)}. Стоимость подтвердит продавец</span></li>
        ${own || l.over ? '' : `<li>${ic('alert')}<span>Если выиграете, оформите заказ за 48 часов, иначе спишется штраф. Ставку отменить нельзя</span></li>`}
      </ul>`;
  }
  function pageLot(r) {
    const a = byAny(r.id) || AUCTIONS[0]; const s = SELLERS[a.seller];
    const others = AUCTIONS.filter((x) => x.id !== a.id).slice(0, 4);
    const tabs = [['desc', 'Описание']].concat((a.specs || []).length ? [['specs', 'Характеристики']] : [], [['talk', 'Обсуждение']]);
    // В полном примере Leman Russ первые три строки описания показаны одним абзацем.
    const details = a.id === 'a-leman' && a.text?.length >= 3
      ? { ...a, added: a.added || '04.11.2026', text: [a.text.slice(0, 3).join('. '), ...a.text.slice(3)] }
      : a;
    const body = itemTab(details);
    return `<div class="wrap page lot-p">
      ${crumbs([HOME_C, CAT_C, { t: a.cat, a: `data-act="nodeq" data-v="${esc(a.cat)}"` }])}
      <div class="pdp">
        <div class="pdp-main">${gallery(a)}</div>
        <div class="pdp-side stack-12"><div class="card buy" id="bidBox">${bidPanel(a)}</div>${sellerCard(a)}</div>
        <div class="pdp-main card">
          <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${ui.tab === k}" class="${ui.tab === k ? 'on' : ''}" data-act="itab" data-v="${k}">${l}</button>`).join('')}</div>
          <div class="tab-body">${body}</div>
        </div>
      </div>
      ${others.length ? `<section class="sec lot-related"><div class="sec-hd"><h2 class="h2">Другие аукционы</h2><a class="row-l" href="#/catalog" data-act="tab" data-v="auc">Посмотреть все ${ic('right', 14)}</a></div><div class="lot-related-grid">${others.map(acard).join('')}</div></section>` : ''}
    </div>`;
  }
  function lotSticky(a) {
    const l = lotInfo(a);
    if (l.ls.st === 'won') return `<div class="sticky-bar"><div class="sum"><span class="t12 c3">Вы выиграли</span><b>${fmt(l.ls.my)}</b></div><button class="btn primary lg" data-act="wonGo" data-id="${a.id}" data-p="${l.ls.my}">В корзину</button></div>`;
    if (l.over || isOwnLot(a) || (isAuth() && S.flags.minus) || ui.bidArm) return '';
    return `<div class="sticky-bar"><div class="sum"><span class="t12 c3">${l.bids ? 'Текущая ставка' : 'Стартовая цена'}</span><b>${fmt(l.price)}</b></div><button class="btn primary lg" data-act="bidFocus">Сделать ставку</button></div>`;
  }

  /* ---------- ЛК: торги ---------- */
  const LK_BIDS = [{ id: 'a-leman', st: 'lead', my: 900 }, { id: 'a-guilliman', st: 'outbid', my: 300 }, { id: 'a-redemptor', st: 'wonDemo', my: 650 }, { id: 'a-deathwatch', st: 'lost', my: 350 }];
  function pageLkBids() {
    const tab = ui.bidTab || 'all'; const res = ui.bidRes || 'all';
    const data = S.flags.noBids ? [] : LK_BIDS.map((b) => { const ls = (S.lot || {})[b.id]; return ls && ls.st ? Object.assign({}, b, { st: ls.st, my: ls.my || b.my, auto: ls.auto }) : b; });
    const done = (b) => ['won', 'wonDemo', 'lost', 'reserve', 'ended'].includes(b.st);
    const win = (b) => ['won', 'wonDemo'].includes(b.st);
    const list = data.filter((b) => (tab === 'all' || (tab === 'on' ? !done(b) : done(b))) && (res === 'all' || (res === 'win' ? win(b) : done(b) && !win(b))));
    const TAG = { lead: ['ok', 'Вы лидируете'], outbid: ['act', 'Ставку перебили'], won: ['ok', 'Вы выиграли'], wonDemo: ['ok', 'Вы выиграли'], lost: ['mute', 'Лот у другого участника'], reserve: ['mute', 'Резерв не достигнут'], ended: ['mute', 'Завершён'] };
    const card = (b) => {
      const a = byAny(b.id); const l = lotInfo(a); const t = TAG[b.st] || ['wait', 'Идут торги'];
      const url = `#/lot/${a.id}${done(b) ? '?ended=1' : '?mine=1'}`; const need = win(b) && !(S.wonDone || []).includes(b.id);
      const cta = b.st === 'outbid' ? `<a class="btn primary" href="${url}">Поставить снова</a>` : need ? `<button class="btn primary" data-act="wonGo" data-id="${a.id}" data-p="${b.my}">Оформить заказ</button>` : `<a class="btn secondary" href="${url}">Открыть лот</a>`;
      return `<article class="ord card lk-bid-card"><header class="ord-hd"><div><h2 class="h3">${esc(a.title)}</h2><p class="t12 c3">${esc(SELLERS[a.seller].name)}</p></div><span class="ost ${t[0]}">${t[1]}</span></header>
        <div class="ord-items"><a class="ord-it" href="${url}"><img src="${a.img}" alt=""><span class="bid-rows"><span><span class="c2">Ваша ставка</span> <b>${fmt(b.my)}</b></span><span><span class="c2">${done(b) ? 'Последняя ставка' : 'Текущая'}</span> <b>${fmt(l.price)}</b></span>${b.auto ? `<span><span class="c2">Автоставка</span> <b>${fmt(b.auto)}</b></span>` : ''}${done(b) ? '' : `<span><span class="c2">До конца</span> <b data-end="${l.end}"></b></span>`}${need ? '<span class="ord-need">Оформите заказ за 48 часов</span>' : ''}</span></a></div>
        <div class="ord-ft"><span></span><div class="ord-acts">${cta}</div></div></article>`;
    };
    return lkShell('auctions', `<h1 class="h1" style="margin-bottom:12px">Торги</h1>
      ${data.length ? `<div class="lk-bar"><div class="tabs-seg scroll-x bid-tabs">${[['all', 'Все'], ['on', 'Активные'], ['off', 'Завершённые']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="bidTab" data-v="${k}">${l}</button>`).join('')}</div>${dd('bidRes', res, [['all', 'Любой итог'], ['win', 'Выигранные'], ['lose', 'Проигранные']], { aria: 'Итог торгов' })}</div>
      ${list.length ? `<div class="stack-12">${list.map(card).join('')}</div>` : `<div class="empty"><p class="h3">Ничего не найдено</p><p class="c2">Выберите другой фильтр</p></div>`}`
        : `<div class="empty"><div class="ico">${ic('gavel', 28)}</div><p class="h3">Вы пока не участвовали в торгах</p><p class="c2" style="margin:4px 0 16px">Здесь появятся ваши ставки и выигранные лоты</p><a class="btn primary" href="#/catalog" data-act="tab" data-v="auc">К торгам</a></div>`}`);
  }

  /* ---------- Слои ---------- */
  function drawerHtml() {
    const [a, b] = ui.dr; let body = ''; let title = 'Каталог'; let back = false;
    const row = (t, attrs, chev, img) => `<a class="dl" href="#/catalog" ${attrs}><span class="row">${img || ''}<span>${esc(t)}</span></span>${chev ? ic('right') : ''}</a>`;
    const more = (k, m) => (m === null ? '' : `<button class="dl dl-m" data-act="mmMore" data-k="${esc(k)}">${m === 'less' ? 'Свернуть' : `Ещё (${m})`}</button>`);
    if (a === undefined) {
      body = row('Все категории', 'data-act="node" data-top="" data-v=""', false) + MENU.map((m, i) => row(m.t, m.groups.length ? `data-act="dr" data-v="${i}"` : `data-act="node" data-top="${esc(m.t)}" data-v=""`, !!m.groups.length, m.img ? `<img src="${SITE + m.img}" alt="" width="24" height="24">` : '')).join('');
    } else if (b === undefined) {
      const m = MENU[a]; title = m.t; back = true;
      body = row(`Все объявления: ${m.t}`, `data-act="node" data-top="${esc(m.t)}" data-v=""`, false) + m.groups.map((g, gi) => {
        const k = `d${a}-${gi}`; const r = limited(g.items, k);
        return `${g.t ? `<p class="dl-g">${esc(g.t)}</p>` : ''}${r.list.map((it) => row(it.t, it.sub ? `data-act="dr" data-v="${esc(it.t)}"` : `data-act="node" data-top="${esc(m.t)}" data-v="${esc(it.t)}"`, !!it.sub)).join('')}${more(k, r.more)}`;
      }).join('');
    } else {
      const m = MENU[a]; const it = findL2(m, b); title = it.t; back = true;
      const k = `ds-${it.t}`; const r = limited(it.sub, k);
      body = row(`Все объявления: ${it.t}`, `data-act="node" data-top="${esc(m.t)}" data-v="${esc(it.t)}"`, false) + r.list.map((s) => row(s, `data-act="node" data-top="${esc(m.t)}" data-v="${esc(s)}"`, false)).join('') + more(k, r.more);
    }
    return `<div class="drawer" role="dialog" aria-label="Каталог"><div class="drawer-hd">${back ? `<button class="icon-btn" data-act="drBack" aria-label="Назад">${ic('left', 24)}</button>` : ''}<span class="h3" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title)}</span>${a === undefined ? `${dd('lang', S.lang, ['RUS', 'ENG'], { cls: 'plain', aria: 'Язык' })}${dd('cur', S.cur, ['RUB', 'USD', 'EUR'], { cls: 'plain', aria: 'Валюта' })}` : ''}<button class="icon-btn" data-act="drawer" aria-label="Закрыть">${ic('x', 24)}</button></div>
      <div class="drawer-bd">${body}
      ${a === undefined ? `<div class="drawer-links">${['Продавцы', 'Подарочные сертификаты', 'Клубы', 'Мероприятия', 'Справка и помощь'].map((t) => `<a href="#/" data-act="soon" data-text="Раздел соберём отдельным блоком">${t}</a>`).join('')}</div>` : ''}
      </div></div>`;
  }
  function overlay() {
    const old = ovEl.querySelector('.modal-bd, .drawer-bd'); const top = old ? old.scrollTop : 0;
    let h = '';
    if (ui.drawer) h += drawerHtml();
    if (ui.modal?.filters) h += filterSheet(ui.modal.filters);
    if (ui.modal && ui.modal.login !== undefined) {
      const stub = 'data-act="soon" data-text="Вход через соцсети это блок первого визита"';
      h += `<div class="scrim" data-act="closeModal"><div class="modal" role="dialog" aria-label="Вход" data-stop><div class="modal-hd"><span class="h3">Вход</span><button class="icon-btn" data-act="closeModal" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="modal-bd stack-12">${ui.modal.login ? `<p class="c2">${esc(ui.modal.login)}</p>` : ''}<label class="fld"><span class="lbl">Email</span><input class="inp" type="email"></label><label class="fld"><span class="lbl">Пароль</span><input class="inp" type="password"></label>
        <button class="btn primary lg block" data-act="loginDo">Войти</button>
        <a class="link" href="#/" data-act="soon" data-text="Восстановление пароля соберём с регистрацией">Забыли пароль?</a>
        <div class="row"><button class="btn secondary block" ${stub}>ВКонтакте</button><button class="btn secondary block" ${stub}>Яндекс ID</button></div></div></div></div>`;
    }
    if (ui.modal && ui.modal.profile) {
      const p = ui.modal.profile;
      const li = (t, text) => `<button class="prof-i" data-act="soon" data-text="${text}">${t}</button>`;
      h += `<div class="prof-sc" data-act="closeModal"><nav class="prof-menu" aria-label="Профиль" data-stop style="top:${p.top}px;right:${p.right}px">
        <p class="prof-n sb">${esc(myName())}</p>
        <a class="prof-i" href="#/lk/orders" data-act="closeModal">Покупки</a><a class="prof-i" href="#/lk/auctions" data-act="closeModal"><span>Торги</span>${wonNeed() ? `<span class="badge-i">${wonNeed()}</span>` : ''}</a>${li('Продажи', 'Продажи это блок продажи')}${li('Товары', 'Товары это блок продажи')}${li('Баланс', 'Баланс и пополнение комиссии это блок продажи')}${li('Настройки', 'Поля ЛК это блок первого визита')}
        <button class="prof-i" data-act="logout">Выход</button>
      </nav></div>`;
    }
    if (ui.modal?.checkoutError) {
      h += `<div class="scrim" data-act="fixCheckout"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="checkoutErrorTitle" aria-describedby="checkoutErrorText" data-stop>
        <div class="modal-hd"><h2 class="h3" id="checkoutErrorTitle">Проверьте заказ</h2></div>
        <div class="modal-bd" id="checkoutErrorText">${esc(ui.modal.message)}</div>
        <div class="modal-ft"><button class="btn primary" data-act="fixCheckout">Исправить</button></div></div></div>`;
    }
    h += lkModals();
    if (ui.modal && ui.modal.report) {
      h += `<div class="scrim" data-act="closeModal"><div class="modal" role="dialog" aria-label="Жалоба" data-stop><div class="modal-hd"><span class="h3">Пожаловаться на объявление</span><button class="icon-btn" data-act="closeModal" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="modal-bd stack-12"><p class="c2">Сообщите нам причину, по которой объявление нужно удалить или исправить:</p><div class="opt-list">${REPORT.map((t) => `<button type="button" class="opt" style="text-align:left" data-act="reportDo"><span class="main">${esc(t)}</span></button>`).join('')}</div></div>
        <div class="modal-ft"><button class="btn ghost block" data-act="closeModal">Отмена</button></div></div></div>`;
    }
    if (ui.modal && ui.modal.pvz) {
      const sid = ui.modal.pvz;
      h += `<div class="scrim" data-act="closeModal"><div class="modal wide" role="dialog" aria-label="Пункт выдачи" data-stop><div class="modal-hd"><span class="h3">Пункт выдачи, ${esc(S.co.city)}</span><button class="icon-btn" data-act="closeModal" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="modal-bd stack-12"><div class="map-mock"><span class="pin" style="left:24%;top:30%">${ic('pin', 28)}</span><span class="pin" style="left:58%;top:48%">${ic('pin', 28)}</span><span class="pin" style="left:76%;top:20%">${ic('pin', 28)}</span><span class="cap">Здесь будет карта</span></div>
        <div class="opt-list">${PVZ.map((p) => `<button type="button" class="opt" style="text-align:left" data-act="pvzPick" data-s="${sid}" data-v="${p.id}"><span class="main"><span class="sb">${p.name}</span><span class="t12 c3" style="display:block">${p.hours}</span></span></button>`).join('')}</div></div></div></div>`;
    }
    if (ui.lb !== null) {
      const it = byAny(route().id) || ITEMS[0];
      h += `<div class="lb" role="dialog" aria-label="Фото"><img src="${it.photos[ui.lb]}" alt="${esc(it.title)}"><button class="icon-btn" style="right:16px;top:16px" data-act="lbClose" aria-label="Закрыть">${ic('x', 24)}</button>
        ${it.photos.length > 1 ? `<button class="icon-btn" style="left:16px;top:50%" data-act="lbStep" data-d="-1" aria-label="Назад">${ic('left', 24)}</button><button class="icon-btn" style="right:16px;top:50%" data-act="lbStep" data-d="1" aria-label="Вперёд">${ic('right', 24)}</button>` : ''}</div>`;
    }
    if (ui.toast) h += `<div class="toast" role="status"><span class="body">${esc(ui.toast.text)}</span>${ui.toast.href ? `<a href="${ui.toast.href}">${esc(ui.toast.label)}</a>` : ''}${ui.toast.act ? `<button class="tl" data-act="${ui.toast.act}">${esc(ui.toast.label)}</button>` : ''}</div>`;
    ovEl.innerHTML = h;
    typo(ovEl);
    const nw = ovEl.querySelector('.modal-bd, .drawer-bd'); if (nw) nw.scrollTop = top;
    document.body.classList.toggle('lock', !!(ui.drawer || ui.modal || ui.lb !== null));
    appEl.inert = !!ui.modal?.filters;
  }
  function toast(text, href, label, act) {
    ui.toast = { text, href, label, act }; overlay();
    clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; overlay(); }, act ? 6000 : 4000);
  }

  /* ---------- Рендер ---------- */
  const PAGES = { home: pageHome, catalog: pageCatalog, item: pageItem, cart: pageCart, checkout: pageCheckout, success: pageSuccess, reviews: pageSellerReviews, lk: pageLk, lot: pageLot };
  function itemSticky(it) {
    if (isOwn(it)) return `<div class="sticky-bar"><div class="sum"><b>${fmt(it.price)}</b><span class="t12 c3">${S.flags.soldOut ? 'Нет в наличии' : stockTxt(it)}</span></div>${ownEdit('secondary lg')}</div>`;
    if (S.flags.soldOut) return `<div class="sticky-bar"><div class="sum"><b>${fmt(it.price)}</b><span class="t12 c3">Нет в наличии</span></div><a class="btn secondary lg" href="#/catalog" data-act="nodeq" data-v="${esc(it.cat)}">Похожие товары</a></div>`;
    const c = inCart(it.id);
    return `<div class="sticky-bar"><div class="sum"><b>${fmt(it.price)}</b><span class="t12 c3">${stockTxt(it)}</span></div>${favBtn(it, S.favs.includes(it.id))}${c ? `${qtyStep(it, c, 'lg')}<a class="icon-btn line lg" href="#/cart" aria-label="Перейти в корзину">${ic('cart', 20)}</a>` : `<button class="btn primary lg" data-act="add" data-id="${it.id}">В корзину</button>`}</div>`;
  }
  function render() {
    const r = route();
    if (r.name === 'item' && r.id) S.viewed = [r.id].concat(S.viewed.filter((x) => x !== r.id)).slice(0, 8);
    const page = (PAGES[r.name] || pageHome)(r);
    const panelScroll = appEl.querySelector('.cat-side')?.scrollTop || 0;
    appEl.innerHTML = header(r) + `<main>${page}</main>` + footer(r);
    if (panelScroll && r.name === 'catalog') appEl.querySelector('.cat-side').scrollTop = panelScroll;
    const lotA = r.name === 'lot' ? (byAny(r.id) || AUCTIONS[0]) : null;
    const lotBar = lotA ? lotSticky(lotA) : '';
    const hasSticky = (r.name === 'cart' && S.cart.length) || r.name === 'checkout' || r.name === 'item' || !!lotBar;
    if (r.name === 'item') appEl.insertAdjacentHTML('beforeend', itemSticky(byId(r.id) || ITEMS[0]));
    if (lotBar) appEl.insertAdjacentHTML('beforeend', lotBar);
    document.body.classList.toggle('has-sticky', !!hasSticky);
    document.body.classList.toggle('menu-open', !!ui.menu);
    document.body.classList.remove('searching');
    typo(appEl); overlay(); tick(); bindAfter(r); clampFit(); notify(); placeTip();
  }
  function bindAfter(r) {
    if (r.name !== 'item') return;
    const st = document.getElementById('strip'); if (!st) return;
    st.scrollLeft = ui.photo * st.clientWidth;
    st.addEventListener('scroll', () => {
      const i = Math.round(st.scrollLeft / st.clientWidth);
      if (i !== ui.photo) {
        ui.photo = i;
        const c = document.getElementById('galCount'); if (c) c.textContent = `${i + 1} / ${byId(r.id).photos.length}`;
        document.querySelectorAll('.gal-thumbs button').forEach((b, k) => b.classList.toggle('on', k === i));
      }
    }, { passive: true });
  }
  function notify() {
    if (parent !== window) parent.postMessage({ type: 'mfm-state', route: route().name === 'lk' && route().id === 'auctions' ? 'bids' : route().name, flags: S.flags, lotSt: S.lotDemo, cart: S.cart.length, hasOrders: !!S.orders }, '*');
  }
  function tick() {
    document.querySelectorAll('[data-end]').forEach((e) => {
      const ms = +e.dataset.end - Date.now(); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
      e.parentElement.classList.toggle('urgent', ms <= URGENT_MS);
      e.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    });
    document.querySelectorAll('[data-cells]').forEach((w) => {
      const ms = +w.dataset.cells - Date.now(); const v = { h: Math.floor(ms / 3600000), m: Math.floor(ms / 60000) % 60, s: Math.floor(ms / 1000) % 60 };
      w.classList.toggle('urgent', ms <= URGENT_MS);
      w.querySelectorAll('[data-c]').forEach((b) => { b.textContent = String(v[b.dataset.c]).padStart(2, '0'); });
    });
  }
  setInterval(tick, 1000);
  window.addEventListener('resize', clampFit);

  /* Смена фото при наведении на карточку, на телефоне свайпом */
  function showPhoto(media, i) {
    const list = cardList(media.dataset.swap); if (!list[i] || media.dataset.i === String(i)) return;
    media.dataset.i = i;
    media.querySelector('.pc-img img').src = list[i];
    media.querySelectorAll('.pc-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  }
  document.addEventListener('mousemove', (ev) => {
    const m = ev.target.closest && ev.target.closest('[data-swap]'); if (!m) return;
    const b = m.getBoundingClientRect(); const n = cardList(m.dataset.swap).length;
    showPhoto(m, Math.min(n - 1, Math.floor(((ev.clientX - b.left) / b.width) * n)));
  });
  document.addEventListener('mouseout', (ev) => {
    const m = ev.target.closest && ev.target.closest('[data-swap]'); if (!m) return;
    if (ev.relatedTarget && m.contains(ev.relatedTarget)) return;
    showPhoto(m, 0);
  });
  let tx = null;
  document.addEventListener('touchstart', (ev) => { tx = ev.target.closest && ev.target.closest('[data-swap]') ? ev.touches[0].clientX : null; }, { passive: true });
  document.addEventListener('touchend', (ev) => {
    if (tx === null) return; const m = ev.target.closest('[data-swap]'); if (!m) return;
    const dx = ev.changedTouches[0].clientX - tx; if (Math.abs(dx) < 32) return;
    const n = cardList(m.dataset.swap).length; const c = +(m.dataset.i || 0);
    showPhoto(m, (c + (dx < 0 ? 1 : -1) + n) % n);
  }, { passive: true });

  /* Меню каталога по наведению */
  let mmT = null;
  document.addEventListener('mouseover', (ev) => {
    if (!ui.menu || !ev.target.closest) return;
    const l1 = ev.target.closest('[data-l1]'); const l2 = ev.target.closest('[data-l2]');
    if (l1 || l2) {
      clearTimeout(mmT);
      mmT = setTimeout(() => {
        if (l1 && +l1.dataset.l1 !== ui.l1) { ui.l1 = +l1.dataset.l1; ui.l2 = null; repaintMenu(); }
        if (l2 && l2.dataset.l2 !== ui.l2) { ui.l2 = l2.dataset.l2; repaintMenu(); }
      }, 90);
    }
  });

  /* ---------- События ---------- */
  function setNode(v) {
    if (navigationSections.has(v)) {
      ui.menu = false; ui.drawer = false; render();
      toast('Это отдельный раздел сайта');
      return;
    }
    S.cat.node = v || null; S.cat.grp = null; S.cat.q = ''; ui.menu = false; ui.drawer = false; ui.dr = []; save(); go('#/catalog'); }
  function saveRecipient() {
    if (!ui.recipientDraft) return true;
    contactKeys.forEach(k => { ui.touched[k] = true; });
    const invalid = contactKeys.find(fieldError);
    if (invalid) {
      render(); document.querySelector(`[name="${invalid}"]`)?.focus(); return false;
    }
    Object.assign(S.form, ui.recipientDraft); ui.recipientDraft = null; save();
    return true;
  }
  const A = {
    fixCheckout() {
      const field = document.querySelector(ui.modal.checkoutError);
      ui.modal = null; overlay(); field?.scrollIntoView({ block: 'center' });
      field?.querySelector('input, button')?.focus({ preventScroll: true });
    },
    recipientEdit() {
      ui.recipientDraft = Object.fromEntries(contactKeys.map(k => [k, S.form[k]]));
      render(); document.querySelector('[name="fio"]').focus();
    },
    recipientSave() { if (saveRecipient()) { render(); document.querySelector('[data-act="recipientEdit"]').focus(); } },
    recipientCancel() { ui.recipientDraft = null; render(); document.querySelector('[data-act="recipientEdit"]').focus(); },
    menu() { if (window.innerWidth < 1024) { ui.drawer = true; ui.dr = []; overlay(); return; } ui.menu = !ui.menu; render(); },
    drawer() { ui.drawer = !ui.drawer; ui.dr = []; overlay(); },
    dr(el, ev) { ev.preventDefault(); ui.dr = ui.dr.concat(ui.dr.length ? el.dataset.v : +el.dataset.v); overlay(); },
    drBack() { ui.dr = ui.dr.slice(0, -1); overlay(); },
    mmMore(el) { ui.mmMore[el.dataset.k] = !ui.mmMore[el.dataset.k]; if (ui.drawer || ui.modal?.filters) overlay(); else if (ui.menu) repaintMenu(); else render(); },
    node(el, ev) { ev.preventDefault(); setNode(el.dataset.v || el.dataset.top); },
    nodef(el, ev) { ev.preventDefault(); S.cat.node = el.dataset.v || null; S.cat.grp = null; save(); if (ui.modal?.filters) overlay(); else render(); },
    nodeg(el, ev) { ev.preventDefault(); S.cat.node = el.dataset.top; S.cat.grp = el.dataset.v; save(); if (ui.modal?.filters) overlay(); else render(); },
    nodeq(el, ev) { ev.preventDefault(); closeSearch(); setNode(el.dataset.v); },
    filters() { openFilters('all'); },
    closeFilters() {
      ui.modal = null; render();
      appEl.querySelector('[data-act="filters"]')?.focus({ preventScroll: true });
    },
    fltT(el) {
      const k = el.dataset.k;
      mobileFilterSections[k] = !mobileFilterOpen(k);
      overlay();
      ovEl.querySelector(`[data-act="fltT"][data-k="${k}"]`)?.focus({ preventScroll: true });
    },
    fEdit(el) {
      const a = activeFilters()[+el.dataset.i];
      if (!a || a.k === 'q') return;
      const k = a.k === 'f' ? a.g : a.k === 'node' ? 'cat' : ['city', 'country'].includes(a.k) ? 'geo' : a.k;
      if (catalogDesktop.matches) appEl.querySelector(`[data-filter-group="${k}"]`)?.scrollIntoView({ block: 'nearest' });
      else openFilters(k);
    },
    toLk() { go(S.orders && S.orders.length === 1 ? `#/lk/order/${S.orders[0].no}` : '#/lk/orders'); },
    contactSave() { toast('Контакт сохранён, его увидит продавец заказа'); },
    safePay() { lkPatch(ui.modal.pay, { st: 'paid', left: 120 }); ui.modal = null; render(); toast('Заказ оплачен, деньги у сервиса'); },
    lkReset() { ui.lkQ = ''; ui.lkF = {}; ui.lkTab = 'all'; render(); document.getElementById('lkQ')?.focus(); },
    lkTab(el) { ui.lkTab = el.dataset.v; render(); },
    payOpen(el) { ui.rc = null; ui.modal = { pay: +el.dataset.no }; overlay(); },
    rcClear() { ui.rc = null; overlay(); },
    rcSend() {
      if (!ui.rc || !ui.rc.name) { ui.rc = { err: 'Файл не выбран' }; overlay(); return; }
      if (ui.rc.err && !ui.rc.retry) { overlay(); return; }
      ui.rcBusy = true; overlay();
      setTimeout(() => {
        ui.rcBusy = false;
        if (S.flags.rcFail && !ui.rc.retry) { ui.rc = Object.assign({}, ui.rc, { err: 'Сбой загрузки. Попробуйте ещё раз', retry: true }); overlay(); return; }
        lkPatch(ui.modal.pay, { st: 'paid', left: 48, receipt: ui.rc.name }); ui.modal = null; ui.rc = null; render(); toast('Чек отправлен. Продавец проверит оплату');
      }, 700);
    },
    copy(el) { try { navigator.clipboard.writeText(el.dataset.v); } catch (e) { /* без буфера */ } toast('Скопировано'); },
    cfm(el) { ui.modal = { cfm: el.dataset.k, no: +el.dataset.no, id: el.dataset.id }; overlay(); },
    cfmDo(el) {
      const k = el.dataset.k; const m = ui.modal;
      if (k === 'got') { lkPatch(m.no, { st: 'got' }); toast('Спасибо! Теперь можно оставить отзыв'); }
      if (k === 'openDispute') { lkPatch(m.no, { st: 'dispute', stop: 5, by: 'buyer' }); toast('Спор открыт'); }
      if (k === 'cancel') { lkPatch(m.no, { st: 'cancel', stop: 1, why: 'Вы отменили заказ' }); toast('Заказ отменён'); }
      if (k === 'askCancel') { lkPatch(m.no, { cancelReq: true }); toast('Запрос отправлен продавцу'); }
      if (k === 'closeDispute') { lkPatch(m.no, { st: 'sent', stop: undefined, left: 96 }); toast('Спор закрыт'); }
      if (k === 'dropLot') { S.cart = S.cart.filter((c) => c.id !== m.id); delete S.won[m.id]; save(); toast('Вы отказались от лота'); }
      ui.modal = null; render();
    },
    bidBack() { ui.bidArm = null; render(); },
    dlOpen(el) { ui.dlNew = null; ui.modal = { dl: +el.dataset.no }; overlay(); },
    dlSend() { lkPatch(ui.modal.dl, { dlReq: true }); ui.modal = null; render(); toast('Запрос отправлен продавцу'); },
    revOpen(el) { ui.rv = {}; ui.modal = { rev: +el.dataset.no }; overlay(); },
    revStar(el) { const t = document.getElementById('revText'); ui.rv = Object.assign({}, ui.rv, { stars: +el.dataset.v, errS: false, text: t ? t.value : '' }); overlay(); },
    revSend() {
      const text = document.getElementById('revText').value.trim(); const r = ui.rv || {};
      if (!r.stars || !text) { ui.rv = Object.assign({}, r, { text, errS: !r.stars, errT: !text }); overlay(); return; }
      lkPatch(ui.modal.rev, { review: { stars: r.stars, text } }); ui.modal = null; render(); toast('Отзыв опубликован');
    },
    bidsOpen(el) { ui.modal = { bidsOf: el.dataset.id }; overlay(); },
    bidFocus() { const b = document.getElementById('bidBox'); if (b) b.scrollIntoView({ block: 'center' }); const i = document.getElementById('bidI'); if (i) i.focus(); },
    bidGo() {
      const a = byAny(route().id); const l = lotInfo(a); const v = parseInt((document.getElementById('bidI').value || '').replace(/\D/g, ''), 10) || 0;
      ui.bidV = v || ''; ui.bidErr = '';
      if (v < l.next) ui.bidErr = `Ставка должна быть не меньше ${fmt(l.next)}`;
      else if (v > MAX_BET) ui.bidErr = `Ставка должна быть не больше ${fmt(MAX_BET)}`;
      if (ui.bidErr) { render(); return; }
      if (S.flags.noEmail) { ui.mailSent = false; ui.mailErr = ''; ui.mailValue = ''; ui.modal = { mail: v }; overlay(); return; }
      ui.bidArm = v; render(); const c = document.getElementById('bidOk'); if (c) c.focus();
    },
    bidDo() {
      const a = byAny(route().id); const ls = (S.lot || {})[a.id] || {}; const v = ui.bidArm;
      S.lot = S.lot || {}; S.lot[a.id] = Object.assign({}, ls, { st: 'lead', my: v, price: v, n: (ls.n || 0) + 1 }); S.lotDemo = 'lead';
      ui.bidArm = null; ui.bidV = undefined; save(); render(); toast('Ваша ставка учтена');
    },
    autoT() { ui.autoOpen = !ui.autoOpen; render(); },
    autoGo() {
      const a = byAny(route().id); const l = lotInfo(a); const v = parseInt(document.getElementById('autoI').value.replace(/\D/g, ''), 10) || 0;
      if (v < l.next) { ui.autoErr = `Автоставка должна быть не меньше ${fmt(l.next)}`; render(); return; }
      ui.autoErr = ''; ui.autoOpen = false; S.lot = S.lot || {}; S.lot[a.id] = Object.assign({}, l.ls, { auto: v, st: l.ls.st || 'lead', my: l.ls.my || l.next, price: l.ls.price || l.next, n: (l.ls.n || 0) + (l.ls.my ? 0 : 1) }); save(); render(); toast('Автоставка сохранена');
    },
    blitz() { const a = byAny(route().id); winLot(a.id, LOTX[a.id].blitz); S.lot = S.lot || {}; S.lot[a.id] = { st: 'won', my: LOTX[a.id].blitz, price: LOTX[a.id].blitz }; save(); render(); toast('Лот ваш и уже в корзине'); },
    mailSend() { ui.mailSent = true; overlay(); },
    mailDo() {
      const v = (document.getElementById('mailCode').value || '').trim();
      if (v !== '1234') { ui.mailValue = v; ui.mailErr = 'Неверный код'; overlay(); return; }
      const amt = ui.modal.mail; S.flags.noEmail = false; ui.mailErr = ''; ui.modal = null; ui.bidArm = amt; save(); render(); toast('Почта подтверждена');
    },
    wonGo(el) { winLot(el.dataset.id, +el.dataset.p); save(); go('#/cart'); },
    bidTab(el) { ui.bidTab = el.dataset.v; render(); },
    login() { ui.drawer = false; ui.modal = { login: '' }; overlay(); },
    loginDo() { ui.modal = null; setRole('buyer'); save(); render(); toast('Вы вошли как User1'); },
    logout() { ui.modal = null; setRole('guest'); save(); render(); },
    profile(el) { const r = el.getBoundingClientRect(); ui.drawer = false; ui.modal = { profile: { top: Math.round(r.bottom + 4), right: Math.max(8, Math.round(window.innerWidth - r.right)) } }; overlay(); },
    sub(el) { const k = el.dataset.id; S.subs = S.subs || []; const on = S.subs.includes(k); S.subs = on ? S.subs.filter((x) => x !== k) : S.subs.concat(k); save(); render(); toast(on ? 'Подписка отменена' : 'Новые объявления продавца будут приходить в уведомления'); },
    blk(el) { const k = el.dataset.id; S.blks = S.blks || []; const on = S.blks.includes(k); S.blks = on ? S.blks.filter((x) => x !== k) : S.blks.concat(k); save(); render(); toast(on ? 'Продавец разблокирован' : 'Объявления продавца больше не будут вам показываться'); },
    loginFor(el) { ui.modal = { login: el.dataset.text }; overlay(); },
    closeModal() { ui.modal = null; overlay(); },
    report() { ui.modal = { report: true }; overlay(); },
    reportDo() { ui.modal = null; toast('Спасибо, модераторы проверят объявление'); },
    soon(el, ev) { ev.preventDefault(); ui.drawer = false; ui.modal = null; if (ui.menu) { ui.menu = false; render(); } toast(el.dataset.text); },
    tab(el, ev) { ev.preventDefault(); S.cat.tab = el.dataset.v; save(); go('#/catalog'); },
    comment(el) {
      const v = document.getElementById('cmText').value.trim(); if (!v) return;
      const id = el.dataset.id; const base = cmList(id).slice();
      S.comments[id] = base.concat({ who: myName(), seller: isOwn(byAny(id)), date: 'Только что', text: v, replies: [] }); save(); render();
    },
    replyT(el) { const i = +el.dataset.i; ui.replyTo = ui.replyTo === i ? null : i; render(); },
    replySend(el) {
      const v = document.getElementById('cmReply').value.trim(); if (!v) return;
      const id = el.dataset.id; const i = +el.dataset.i;
      const list = JSON.parse(JSON.stringify(cmList(id)));
      list[i].replies = (list[i].replies || []).concat({ who: myName(), seller: isOwn(byAny(id)), date: 'Только что', text: v });
      S.comments[id] = list; ui.replyTo = null; save(); render();
    },
    addrOn(el) { S.co.addr = S.co.addr || {}; S.co.addr[el.dataset.s] = {}; save(); render(); },
    addrOff(el) { delete S.co.addr[el.dataset.s]; save(); render(); },
    coNext() {
      if (!saveRecipient()) return;
      const bad = stepError(ui.coStep);
      if (bad) { ui.submitted = true; render(); const e = document.querySelector(bad); if (e) { e.scrollIntoView({ block: 'center' }); } return; }
      ui.submitted = false; ui.coStep += 1; render(); window.scrollTo(0, 0);
    },
    coBack() { ui.coStep -= 1; ui.submitted = false; render(); window.scrollTo(0, 0); },
    coGo(el) { ui.coStep = +el.dataset.v; ui.submitted = false; render(); window.scrollTo(0, 0); },
    clampT(el) { ui.clamp[el.dataset.k] = !ui.clamp[el.dataset.k]; render(); },
    view(el) { S.cat.view = el.dataset.v; save(); render(); },
    crumbs() { ui.crumbs = !ui.crumbs; render(); },
    goHome(el, ev) { ev.preventDefault(); go('#/'); },
    tagq(el) { toast(`Выдача по тегу ${el.dataset.v}: одинаковые теги объединяем`); },
    viewedT() { ui.viewedMore = !ui.viewedMore; render(); },
    homePop() { S.cat = Object.assign(DEFCAT(), { sort: 'pop' }); save(); go('#/catalog'); },
    resetCat() { S.cat = DEFCAT(); save(); if (ui.modal?.filters) overlay(); else render(); },
    dropF(el) {
      const a = activeFilters()[+el.dataset.i]; const c = S.cat;
      if (a.k === 'node') c.node = null; if (a.k === 'q') c.q = ''; if (a.k === 'price') { c.min = ''; c.max = ''; } if (a.k === 'city') c.city = 'Все'; if (a.k === 'country') c.country = 'Все';
      if (a.k === 'f') c.f[a.g] = c.f[a.g].filter((x) => x !== a.v);
      save(); render();
    },
    fltApply() { ui.applied = null; ui.fTip = null; render(); },
    searchClear(el) { const f = el.closest('form'); const had = !!S.cat.q; f.q.value = ''; f.classList.remove('dirty'); S.cat.q = ''; save(); if (had && route().name === 'catalog') render(); const n = [...document.querySelectorAll('input[name=q]')].find((i) => i.offsetParent); if (n) n.focus(); },
    saveSearch() {
      if (isAuth()) { ui.modal = null; render(); toast('Поиск сохранён: он появится в избранном'); return; }
      ui.modal = { login: 'Войдите, чтобы сохранить поиск: он появится в избранном, а новые объявления по нему придут в уведомления' };
      render();
    },
    fav(el, ev) { ev.preventDefault(); if (!isAuth()) { ui.modal = { login: 'Войдите, чтобы сохранять товары в избранное' }; overlay(); return; } const id = el.dataset.id; const i = S.favs.indexOf(id); if (i >= 0) S.favs.splice(i, 1); else S.favs.push(id); save(); render(); },
    homeTab(el) { ui.homeTab = el.dataset.v; render(); },
    foot(el) { ui.footOpen[el.dataset.k] = !ui.footOpen[el.dataset.k]; render(); },
    toTop() { window.scrollTo(0, 0); },
    photo(el) { setPhoto(+el.dataset.i); },
    photoStep(el) { const n = byAny(route().id).photos.length; setPhoto((ui.photo + (+el.dataset.d) + n) % n); },
    lb(el) { ui.lb = +el.dataset.i; overlay(); },
    lbClose() { ui.lb = null; overlay(); },
    lbStep(el) { const n = byAny(route().id).photos.length; ui.lb = (ui.lb + (+el.dataset.d) + n) % n; overlay(); },
    qty(el) { ui.qty += +el.dataset.d; render(); },
    add(el) { addCart(el.dataset.id, ui.qty); ui.qty = 1; S.notice = null; save(); render(); if (window.innerWidth >= 1024) toast('Товар в корзине', '#/cart', 'Перейти'); },
    addc(el, ev) {
      ev.preventDefault();
      if (keepSearch(el, () => { addCart(el.dataset.id, 1); save(); render(); })) return;
      if (window.innerWidth >= 1024) toast('Товар в корзине', '#/cart', 'Перейти');
    },
    itab(el) { const side = !!el.closest('.pdp-side'); ui.tab = el.dataset.v; render(); const t = document.querySelector('.tabs'); if (t && (side || window.innerWidth < 1024)) t.scrollIntoView({ block: 'start' }); },
    descT() { ui.descOpen = !ui.descOpen; render(); },
    relT(el) { ui.relOff[el.dataset.k] = !ui.relOff[el.dataset.k]; render(); },
    lineQty(el) { const c = inCart(el.dataset.id); c.qty = Math.max(1, Math.min(byId(c.id).stock, c.qty + (+el.dataset.d))); save(); render(); },
    fixQty(el) { const c = inCart(el.dataset.id); c.qty = +el.dataset.v; S.flags.partial = false; save(); render(); },
    rm(el) { ui.undo = S.cart.slice(); S.cart = S.cart.filter((c) => c.id !== el.dataset.id); if (!S.cart.some(isOut)) S.notice = null; save(); render(); toast('Товар убран из корзины', null, 'Отменить', 'undoRm'); },
    undoRm() { S.cart = ui.undo || S.cart; ui.undo = null; ui.toast = null; save(); render(); },
    cartQty(el) {
      const c = inCart(el.dataset.id); const v = c.qty + (+el.dataset.d);
      keepSearch(el, () => {
        if (v <= 0) { S.cart = S.cart.filter((x) => x.id !== c.id); ui.toast = null; } else c.qty = Math.min(byId(c.id).stock, v);
        save(); render();
      });
    },
    rmOff() { if (!S.cart.some((c) => c.on)) { toast('Отметьте товары, которые хотите удалить'); return; } ui.undo = S.cart.slice(); S.cart = S.cart.filter((c) => !c.on); if (!S.cart.some(isOut)) S.notice = null; save(); render(); toast('Товары убраны из корзины', null, 'Отменить', 'undoRm'); },
    open(el) { ui.opened[el.dataset.k] = true; render(); },
    close(el) { const k = el.dataset.k; ui.opened[k] = false; if (k[0] === 'c') delete S.co.comment[el.dataset.s]; save(); render(); },
    city(el) { S.co.city = S.co.cityTxt = el.dataset.v; ui.cityOpen = false; resetBadDl(); save(); render(); },
    pvz(el, ev) { ev.preventDefault(); ui.modal = { pvz: el.dataset.s }; overlay(); },
    pvzPick(el) { S.co.pvz[el.dataset.s] = el.dataset.v; ui.modal = null; save(); render(); },
    chooseCodeSeller(el) { applyDiscount(el.dataset.s); },
    removeCode(el) {
      const { code, s } = el.dataset;
      if (s) S.co.promo[s] = S.co.promo[s].filter(c => c !== code);
      else S.co.certificates = S.co.certificates.filter(c => c !== code);
      resetCodeEntry(); ui.codeStatus = `Код ${code} удалён`; save(); render();
      document.getElementById('discountCode').focus({ preventScroll: true });
    },
    term(el) { S.cat.q = el.dataset.v; S.cat.node = null; closeSearch(); save(); go('#/catalog'); },
    searchAll() { const f = [...document.querySelectorAll('[data-form=search]')].find((x) => x.offsetParent); S.cat.q = f.q.value.trim(); S.cat.node = null; closeSearch(); save(); go('#/catalog'); },
    submit() { if (!ui.loading) submit(); },
  };
  function setPhoto(i) { ui.photo = i; const st = document.getElementById('strip'); if (st) st.scrollTo({ left: i * st.clientWidth, behavior: 'smooth' }); }
  function resetBadDl() { coGroups().forEach((g) => { if (S.co.dl[g.sid] === 'pickup' && g.seller.city !== S.co.city) delete S.co.dl[g.sid]; }); }

  document.addEventListener('click', (ev) => {
    const t = ev.target;
    /* Выпадающие списки */
    const tog = t.closest('[data-dd-toggle]');
    if (tog) { const m = tog.parentNode.querySelector('.dd-menu'); const was = m.hidden; closeDD(); m.hidden = !was; tog.setAttribute('aria-expanded', String(was)); if (was) { const s = m.querySelector('[data-dd-search]'); if (s) s.focus(); } return; }
    const opt = t.closest('[data-dd-val]');
    if (opt) { const id = opt.closest('[data-dd]').dataset.dd; DD[id](opt.dataset.ddVal); save(); closeDD(); if (ui.drawer || ui.modal?.filters) overlay(); else render(); return; }
    if (t.closest('[data-dd-search]')) return;
    closeDD();
    const el = t.closest('[data-act]');
    if (el && ui.applied && !['fltApply', 'fav', 'addc', 'cartQty', 'soon'].includes(el.dataset.act)) { ui.applied = null; ui.fTip = null; }
    if (!t.closest('.hdr-search') && !t.closest('#sp')) closeSearch();
    if (!el) {
      if (ui.menu && !t.closest('#mm') && !t.closest('.brand-cat')) { ui.menu = false; render(); }
      if (ui.cityOpen && !t.closest('.city-box')) { ui.cityOpen = false; const l = document.getElementById('cityList'); if (l) l.innerHTML = ''; }
      return;
    }
    if (el.classList.contains('scrim') && t.closest('[data-stop]')) return;
    const fn = A[el.dataset.act];
    if (fn) fn(el, ev);
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.qty) { ui.qty = Math.max(1, Math.min(+t.dataset.qty, parseInt(t.value, 10) || 1)); render(); return; }
    if (t.dataset.lineqty) {
      const c = inCart(t.dataset.lineqty); const v = parseInt(t.value, 10);
      keepSearch(t, () => {
        if (v === 0) S.cart = S.cart.filter((x) => x.id !== c.id); else c.qty = Math.max(1, Math.min(byId(c.id).stock, v || 1));
        save(); render();
      });
      return;
    }
    if (t.id === 'rcFile') {
      const f = t.files[0]; if (!f) return;
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) ui.rc = { err: 'Этот формат не подходит. Нужен JPG, PNG или PDF' };
      else if (f.size > 20 * 1048576) ui.rc = { name: f.name, size: sizeTxt(f.size), err: 'Файл больше 20 МБ' };
      else ui.rc = { name: f.name, size: sizeTxt(f.size) };
      overlay(); return;
    }
    if (t.dataset.actChg === 'line') { inCart(t.dataset.id).on = t.checked; save(); render(); return; }
    if (t.dataset.actChg === 'all') { S.cart.forEach((c) => { c.on = t.checked; }); save(); render(); return; }
    if (t.name === 'dlNew') { ui.dlNew = t.value; overlay(); return; }
    if (t.dataset.actChg === 'dl') { S.co.dl[t.dataset.s] = t.value; save(); render(); return; }
    if (t.dataset.actChg === 'safe') {
      S.co.safe[t.dataset.s] = t.checked;
      save(); render();
      document.querySelector(`[data-act-chg="safe"][data-s="${t.dataset.s}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (t.dataset.actChg === 'pay') {
      S.co.pay[t.dataset.s] = t.value;
      if (t.value === 'cash') S.co.safe[t.dataset.s] = false;
      save(); render(); return;
    }
    if (t.dataset.actChg === 'flt') {
      const g = t.dataset.g; pend(`.cat-side input[data-g="${g}"][value="${t.value.replace(/"/g, '\\"')}"]`); const cur = S.cat.f[g] || []; S.cat.f[g] = t.checked ? cur.concat(t.value) : cur.filter((x) => x !== t.value);
      save();
      if (ui.modal?.filters) {
        overlay();
        const replacement = ovEl.querySelector(`input[data-g="${g}"][value="${CSS.escape(t.value)}"]`);
        replacement?.focus({ preventScroll: true });
      } else render();
      return;
    }
    if (t.dataset.cat && !ui.modal?.filters) { pend(`.cat-side [data-cat=${t.dataset.cat}]`); S.cat[t.dataset.cat] = t.value.replace(/\D/g, ''); save(); render(); }
  });
  const phoneMask = (v) => {
    let d = v.replace(/\D/g, ''); if (d[0] === '8') d = '7' + d.slice(1); if (d && d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
    if (!d) return '';
    const p = d.slice(1); let o = '+7';
    if (p.length) o += ' (' + p.slice(0, 3); if (p.length >= 3) o += ')'; if (p.length > 3) o += ' ' + p.slice(3, 6); if (p.length > 6) o += '-' + p.slice(6, 8); if (p.length > 8) o += '-' + p.slice(8, 10);
    return o;
  };
  function refreshField(n, input) {
    const box = input.closest('.fld'); const err = showErr(n); const f = FIELD[n];
    box.classList.toggle('err', !!err);
    input.setAttribute('aria-invalid', String(!!err));
    const old = box.querySelector('.err-t, .hint'); if (old) old.remove();
    if (err) box.insertAdjacentHTML('beforeend', `<span class="err-t">${err}</span>`); else if (f.hint) box.insertAdjacentHTML('beforeend', `<span class="hint">${f.hint}</span>`);
    typo(box);
  }
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (ui.modal?.filters && t.dataset.cat) {
      t.value = t.value.replace(/\D/g, '');
      S.cat[t.dataset.cat] = t.value;
      save();
      ovEl.querySelector('#filterResults').textContent = showFilterResults();
      return;
    }
    if (t.id === 'discountCode') {
      ui.codeDraft = t.value; ui.chooseSeller = false; ui.codeStatus = ''; ui.codeError = '';
      t.closest('form').classList.remove('err'); t.setAttribute('aria-invalid', 'false');
      document.getElementById('discountFeedback').textContent = '';
      document.querySelector('.discount-sellers')?.remove();
      return;
    }
    if (t.dataset.ddSearch !== undefined) {
      const v = t.value.toLowerCase();
      t.closest('.dd-menu').querySelectorAll('.dd-o').forEach((o) => { o.hidden = !o.textContent.toLowerCase().includes(v); });
      return;
    }
    if (t.name === 'q' && t.closest('[data-form=search]')) { openSearch(t.closest('form'), !!t.value.trim()); return; }
    if (t.id === 'city') {
      S.co.cityTxt = t.value; S.co.city = ''; ui.cityOpen = true;
      document.getElementById('cityList').innerHTML = cityList(t.value); return;
    }
    if (t.dataset.addr) {
      const {addr, k} = t.dataset;
      S.co.addr[addr][k] = t.value;
      if (ui.submitted) {
        const err = ownAddressError(addr, k);
        const box = t.closest('.fld');
        box.classList.toggle('err', !!err);
        t.setAttribute('aria-invalid', String(!!err));
        const hint = box.querySelector('.err-t');
        hint.hidden = !err;
        hint.textContent = err;
      }
      save(); return;
    }
    if (t.dataset.coComment) { S.co.comment[t.dataset.coComment] = t.value; save(); return; }
    if (t.name && FIELD[t.name]) {
      if (t.name === 'phone') t.value = phoneMask(t.value);
      if (ui.recipientDraft && contactKeys.includes(t.name)) ui.recipientDraft[t.name] = t.value;
      else { S.form[t.name] = t.value; save(); }
      if (ui.touched[t.name] || ui.submitted) refreshField(t.name, t);
    }
  });
  document.addEventListener('input', (ev) => { if (ev.target.name === 'q' && ev.target.closest('.hdr-search')) ev.target.closest('.hdr-search').classList.toggle('dirty', ev.target.value.trim() !== S.cat.q); if (ev.target.id === 'lkQ') { ui.lkQ = ev.target.value; const p = ev.target.selectionStart; render(); const n = document.getElementById('lkQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } } if (ev.target.id === 'bidI') { ui.bidV = ev.target.value.replace(/\D/g, ''); } });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id === 'bidI') { ev.preventDefault(); const b = document.querySelector('[data-act=bidGo]'); if (b) b.click(); } });
  document.addEventListener('focusin', (ev) => {
    const t = ev.target;
    if (t.id === 'city') { ui.cityOpen = true; document.getElementById('cityList').innerHTML = cityList(t.value); }
    if (t.name === 'q' && t.closest('[data-form=search]')) {
      t.form.classList.add('editing');
      t.placeholder = ' ';
      openSearch(t.form, false);
    }
  });
  document.addEventListener('focusout', (ev) => {
    const t = ev.target;
    const search = t.closest('[data-form=search]');
    if (search && !search.contains(ev.relatedTarget)) search.classList.remove('editing');
    if (search && t.name === 'q') t.placeholder = searchExamples[0];
    if (t.name && FIELD[t.name]) { ui.touched[t.name] = true; refreshField(t.name, t); }
    if (t.id === 'city') ui.touched.city = true;
  });
  document.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (f.dataset.form === 'discount') { ev.preventDefault(); applyDiscount(); return; }
    if (f.dataset.form !== 'search') return;
    ev.preventDefault(); S.cat.q = f.q.value.trim(); S.cat.node = null; closeSearch(); save(); go('#/catalog');
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && ui.modal?.checkoutError) { A.fixCheckout(); return; }
    if (ev.key === 'Escape' && ui.modal?.filters) { A.closeFilters(); return; }
    if (ev.key === 'Escape') { closeDD(); closeSearch(); ui.modal = null; ui.drawer = false; ui.lb = null; if (ui.menu) { ui.menu = false; render(); } else overlay(); }
  });
  document.addEventListener('error', (ev) => {
    const t = ev.target;
    if (t.tagName === 'IMG' && !t.dataset.broken) {
      t.dataset.broken = '1';
      t.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ededef"/></svg>');
    }
  }, true);

  window.addEventListener('scroll', placeTip, { passive: true });
  document.addEventListener('scroll', placeTip, { passive: true, capture: true });
  window.addEventListener('hashchange', () => {
    if (ui.modal?.filters) ui.modal = null;
    ui.applied = null; ui.fTip = null; ui.bidArm = null; ui.bidV = undefined; ui.bidErr = ''; ui.menu = false; ui.drawer = false; ui.toast = null; ui.photo = 0; ui.tab = 'desc'; ui.descOpen = false; ui.qty = 1; ui.lb = null; ui.crumbs = false; ui.revSort = 'new';
    ui.okAnim = null;
    if (route().name === 'checkout') { S.notice = null; ui.coStep = 1; }
    window.scrollTo(0, 0); render();
  });
  catalogDesktop.addEventListener('change', () => {
    if (ui.modal?.filters) A.closeFilters();
    else if (ui.applied) A.fltApply();
  });

  /* Команды панели проверки */
  window.addEventListener('message', (ev) => {
    const m = ev.data || {};
    if (m.type === 'mfm-go') {
      if (m.hash === '#/success') ui.okAnim = null;
      if (m.hash === '#/checkout' && !S.cart.length) preset('one');
      go(m.hash);
    }
    if (m.type === 'mfm-preset') {
      preset(m.name);
      save(); render();
    }
    if (m.type === 'mfm-flag') {
      if (m.key === 'role') setRole(m.value); else S.flags[m.key] = m.value;
      if (m.key === 'itemOut' && m.value && !S.cart.some((c) => c.id === 'trukk')) S.cart.push({ id: 'trukk', qty: 1, on: true });
      if (m.key === 'partial' && m.value) { const c = inCart('strudd'); if (c) c.qty = Math.max(c.qty, 2); else S.cart.push({ id: 'strudd', qty: 2, on: true }); }
      if (m.key === 'minSum' && m.value) S.cart = [{ id: 'lutazy', qty: 1, on: true }];
      if (m.key === 'fail') { S.banner = null; S.co.surcharge = null; }
      save(); render();
    }
    if (m.type === 'mfm-lot') {
      const id = route().id; const a = byAny(id); if (a) {
        const p = a.price; const T = { live: {}, lead: { st: 'lead', my: p }, outbid: { st: 'outbid', my: p - 100 }, auto: { st: 'lead', my: p, auto: p + 500 }, won: { st: 'won', my: p }, lost: { st: 'lost', my: p - 100 }, reserve: { st: 'reserve', my: p }, ended: { st: 'ended' } };
        S.lot = S.lot || {}; S.lot[id] = T[m.value]; S.lotDemo = m.value; ui.bidV = undefined; ui.bidErr = '';
        if (m.value === 'won') winLot(id, p); else if (S.won && S.won[id]) { delete S.won[id]; S.cart = S.cart.filter((c) => c.id !== id); }
        save(); render();
      }
    }
    if (m.type === 'mfm-rc') {
      ui.rc = { ok: { name: 'чек-оплаты.pdf', size: '340 КБ' }, big: { name: 'скан-чека.pdf', size: '21,0 МБ', err: 'Файл больше 20 МБ' }, bad: { err: 'Этот формат не подходит. Нужен JPG, PNG или PDF' } }[m.value];
      if (!ui.modal || !ui.modal.pay) ui.modal = { pay: 464811 };
      overlay();
    }
    if (m.type === 'mfm-fill') { if (!S.cart.length) preset('one'); fillForm(); ui.submitted = false; save(); render(); }
    if (m.type === 'mfm-empty-submit') { resetCodeEntry(); S.form = {}; S.co = DEF().co; save(); render(); setTimeout(submit, 0); }
    if (m.type === 'mfm-reset') { resetCodeEntry(); S = DEF(); save(); Object.assign(ui, { submitted: false, touched: {}, opened: {}, recipientDraft: null }); go('#/'); render(); }
  });


  render();
})();
