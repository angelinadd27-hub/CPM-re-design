/* Прототип «Покупка гостем». Роутинг по hash, состояние в памяти и sessionStorage. */
(function () {
  const { DELIVERY, PAYWAY, SELLERS, ITEMS, AUCTIONS, REVIEWS, CATEGORIES, TAGS, SELLER_TYPES, CITIES, PVZ } = window.MFM;
  const MENU = window.MFM_MENU || [];
  const DESC = window.MFM_DESC || {};
  const HOME = window.MFM_HOME || { cats: [], clubs: [], events: [] };
  const SITE = 'https://minifreemarket.com';
  const appEl = document.getElementById('app');
  const ovEl = document.getElementById('ov');
  const KEY = 'mfm-guest-v2';
  const T0 = Date.now();

  /* Реальные описания, характеристики и фото с сайта */
  ITEMS.forEach((i) => { const d = DESC[i.id]; if (!d) return; if (d.specs.length) i.specs = d.specs; i.text = d.text; if (d.photos.length) i.photos = d.photos; });
  AUCTIONS.forEach((a) => { const d = DESC[a.id]; a.photos = d && d.photos.length ? [a.img].concat(d.photos.slice(1, 5)) : [a.img]; a.specs = (d && d.specs) || []; });

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
  const byId = (id) => ITEMS.find((i) => i.id === id);
  const byAny = (id) => byId(id) || AUCTIONS.find((a) => a.id === id);
  const spec = (o, k) => { const r = (o.specs || []).find((x) => x[0] === k); return r ? r[1] : ''; };
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const dateStr = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    cart: '<path d="M2 3h3l1 3m0 0h15l-2 9H8L6 6Z"/><circle cx="9.5" cy="20" r="1.5"/><circle cx="17.5" cy="20" r="1.5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
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
  const DEFCAT = () => ({ tab: 'all', node: null, sort: 'new', per: 24, q: '', min: '', max: '', country: 'Все', city: 'Все', f: {}, closed: {}, view: 'two' });
  const DEF = () => ({
    cart: [], favs: [], viewed: [], lang: 'RUS', cur: 'RUB',
    form: {}, co: { city: '', cityTxt: '', dl: {}, pay: {}, pvz: {}, comment: {}, promo: {} },
    flags: { emailExists: false, autoConfirm: false, fail: 'none', itemOut: false, partial: false, minSum: false, soldOut: false, auth: false },
    comments: {},
    cat: DEFCAT(), orders: null, banner: null, notice: null,
  });
  let S = DEF();
  try { const raw = sessionStorage.getItem(KEY); if (raw) { S = Object.assign(DEF(), JSON.parse(raw)); S.cat = Object.assign(DEFCAT(), S.cat); } } catch (e) { /* без хранилища работаем из памяти */ }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* пропускаем */ } };

  const ui = { menu: false, l1: 0, l2: null, mmMore: {}, drawer: false, dr: [], filters: false, modal: null, photo: 0, tab: 'desc', descOpen: false, lb: null, toast: null, opened: {}, cityOpen: false, touched: {}, submitted: false, loading: false, qty: 1, promoErr: {}, tagsOpen: false, relOff: {}, homeTab: 'Все', footOpen: {}, clamp: {}, crumbs: false, revSort: 'new', coStep: 1, certOpen: false, certErr: '' };
  let toastT = null;

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
    if (name === 'empty') S.cart = [];
    if (name === 'one') S.cart = [{ id: 'strudd', qty: 1, on: true }];
    if (name === 'two') S.cart = [{ id: 'strudd', qty: 1, on: true }, { id: 'trukk', qty: 1, on: true }];
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
    return { name: parts[0] || 'home', id: parts[1], q };
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
    country(v) { S.cat.country = v; },
    city(v) { S.cat.city = v; },
    lang(v) { S.lang = v; toast('Смена языка в прототипе только показывается'); },
    cur(v) { S.cur = v; toast('Смена валюты в прототипе только показывается'); },
    rev(v) { ui.revSort = v; },
  };
  const closeDD = () => document.querySelectorAll('.dd-menu:not([hidden])').forEach((m) => { m.hidden = true; const b = m.parentNode.querySelector('[data-dd-toggle]'); if (b) b.setAttribute('aria-expanded', 'false'); });

  /* ---------- Шапка ---------- */
  const rating = (s) => (s.reviews ? `${STAR}<span class="sb">${s.rating.toFixed(2)}</span>` : '<span class="tag mute">Новый продавец</span>');
  const logoHtml = () => '<a class="logo" href="#/" aria-label="Свободный Рынок Миниатюр, на главную"><img src="assets/logo.png" alt="СРМ"></a>';
  const searchForm = () => `<form class="hdr-search" data-form="search" role="search" autocomplete="off">
      <input name="q" type="search" placeholder=" " value="${esc(S.cat.q)}" aria-label="Поиск">
      <button type="submit" class="hdr-search-go" aria-label="Найти">${ic('search')}</button>
    </form>`;

  function header(r) {
    const n = cartCount(); const f = S.favs.length;
    const badge = (v) => (v ? `<span class="badge-n">${v}</span>` : '');
    const soon = (t) => `data-act="soon" data-text="${t}"`;
    const icons = (extra) => `<a class="hdr-link" href="#/" ${soon('Продажа это отдельный сценарий, соберём его позже')} aria-label="Продать">${ic('price', 24)}<span>Продать</span></a>
            <a class="hdr-link" href="#/" ${soon('Страницу избранного соберём позже, сердечки уже работают')} aria-label="Избранное">${ic('heart', 24)}<span>Избранное</span>${badge(f)}</a>
            <a class="hdr-link" href="#/cart" aria-label="Корзина">${ic('cart', 24)}<span>Корзина</span>${badge(n)}</a>
            <button class="hdr-link" data-act="login" aria-label="Войти">${ic('user', 24)}<span>${S.flags.auth ? 'Профиль' : 'Войти'}</span></button>${extra || ''}`;
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
  const CATS_FLAT = (() => { const o = []; MENU.forEach((m) => { o.push(m.t); m.groups.forEach((g) => g.items.forEach((i) => { o.push(i.t); (i.sub || []).forEach((s) => o.push(s)); })); }); return o.filter((v, i, a) => a.indexOf(v) === i); })();
  function spCard(it) {
    const c = inCart(it.id);
    return `<article class="sp-c"><a href="#/item/${it.id}"><img src="${it.img}" alt=""><span class="sp-pr">${fmt(it.price)}</span><span class="sp-ct">${esc(it.title)}</span></a>
      ${c ? qtyStep(it, c, 'sm') : `<button type="button" class="btn primary sm" data-act="addc" data-id="${it.id}">В корзину</button>`}</article>`;
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
    const words = ['Warhammer 40.000', 'Kill team', 'Dice', 'Magic: The Gathering', 'Краски Citadel', 'Террейн', 'LEGO'];
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let w = 0; let c = 0; let del = false; let wait = 0;
    setInterval(() => {
      if (wait > 0) { wait -= 1; return; }
      const word = words[w]; c += del ? -1 : 1;
      if (c > word.length) { del = true; c = word.length; wait = 18; return; }
      if (c < 0) { del = false; c = 0; w = (w + 1) % words.length; wait = 3; return; }
      document.querySelectorAll('input[name=q]').forEach((i) => { if (document.activeElement !== i) i.placeholder = word.slice(0, c) || ' '; });
    }, 90);
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
  const sellerName = (s) => `<span class="pc-sn">${esc(s.name)}, г. ${esc(s.city)}</span>`;
  const sellerRate = (s) => (s.reviews ? `<span class="pc-rate">${STAR}<b>${s.rating.toFixed(2)}</b><span>${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}</span></span>` : '<span class="pc-rate"><span>Новый продавец</span></span>');
  const badgeList = (it) => { const v = SELLERS[it.seller]; const b = []; if (v.freeFrom) b.push(`Бесплатная доставка от ${fmt(v.freeFrom)}`); if (v.safe) b.push('Безопасная сделка'); return b; };
  const badges = (it) => { const b = badgeList(it); return b.length ? `<div class="pc-badges">${b.map((t) => `<span>${t}</span>`).join('')}</div>` : ''; };
  /* 25. Количество появляется вместо кнопки, при нуле кнопка возвращается */
  const qtyStep = (it, c, cls) => `<div class="step ${cls}" aria-label="Количество"><button data-act="cartQty" data-id="${it.id}" data-d="-1" aria-label="Меньше">${ic('minus', 16)}</button><input class="step-i" inputmode="numeric" aria-label="Количество" data-lineqty="${it.id}" value="${c.qty}"><button data-act="cartQty" data-id="${it.id}" data-d="1" ${c.qty >= it.stock ? 'disabled' : ''} aria-label="Больше">${ic('plus', 16)}</button></div>`;
  const heart = (id, fav) => `<button class="pc-heart ${fav ? 'fav-on' : ''}" data-act="fav" data-id="${id}" aria-label="В избранное" aria-pressed="${fav}">${ic('heart', 20)}</button>`;
  function pcard(it, mini) {
    const s = SELLERS[it.seller]; const fav = S.favs.includes(it.id); const g = swap(it); const c = inCart(it.id);
    return `<article class="pc">
      <div class="pc-media" ${g.attr}>
        <a href="#/item/${it.id}" class="pc-img"><img loading="lazy" src="${it.img}" alt="${esc(it.title)}"></a>
        ${badges(it)}
        ${g.dots}
      </div>
      <div class="pc-body">
        <div class="pc-buy">
          <a href="#/item/${it.id}" class="pc-price">${fmt(it.price)}</a>
          <div class="pc-btns">
            ${heart(it.id, fav)}
            ${c ? qtyStep(it, c, 'sm pc-step') : `<button class="btn primary sm pc-add" data-act="addc" data-id="${it.id}" aria-label="В корзину">${ic('cart', 16)}<span>В корзину</span></button>`}
          </div>
        </div>
        <a href="#/item/${it.id}" class="pc-link">
          <span class="pc-title">${esc(it.title)}</span>
          ${mini ? '' : `${sellerName(s)}${sellerRate(s)}`}
        </a>
      </div>
    </article>`;
  }
  function acard(a) {
    const s = SELLERS[a.seller]; const fav = S.favs.includes(a.id); const g = swap(a);
    const end = T0 + a.hours * 3600000; const urgent = a.hours < 24;
    const soon = 'data-act="soon" data-text="Лот и ставка это сценарий аукциона, соберём его следующим"';
    return `<article class="pc">
      <div class="pc-media" ${g.attr}>
        <a href="#/" ${soon} class="pc-img"><img loading="lazy" src="${a.img}" alt="${esc(a.title)}"></a>
        <span class="pc-timer ${urgent ? 'urgent' : ''}"><span class="tip down" data-tip="Аукцион" tabindex="0">${ic('gavel', 16)}</span><span data-end="${end}"></span></span>
        ${g.dots}
      </div>
      <div class="pc-body">
        <div class="pc-buy">
          <a href="#/" ${soon} class="pc-price">${fmt(a.price)}</a>
          <div class="pc-btns">${heart(a.id, fav)}<button class="btn primary sm pc-add wide" ${soon}><span class="lab-long">Сделать ставку</span><span class="lab-short">Ставка</span></button></div>
        </div>
        <a href="#/" ${soon} class="pc-link">
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
    const sellers = [['pocket', ['strudd', 'assassins']], ['lexx', ['a-redemptor', 'a-deathwatch']], ['krsk', ['arkham', 'zombicide']], ['wolf', ['terminators', 'brutalis']]];
    const events = HOME.events.slice(0, 3);
    const clubs = HOME.clubs.slice(0, 3);
    const soon = (t) => `data-act="soon" data-text="${t}"`;
    return `<h1 class="vh">Свободный Рынок Миниатюр: маркет миниатюр, настольных и карточных игр</h1>
      <section class="adv"><div class="wrap adv-in">
        <div class="adv-i">${ic('shield', 24)}<span><b>Работаем с 2018 года</b><span>Маркет сообщества</span></span></div>
        <div class="adv-i">${ic('user', 24)}<span><b>Около 60 тысяч человек в месяц</b><span>Покупают и продают на СРМ</span></span></div>
        <div class="adv-i hide-m-only">${ic('card', 24)}<span><b>Оплата напрямую продавцу</b><span>После подтверждения заказа</span></span></div>
      </div></section>
      <section class="band first"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Текущие аукционы</h2><a class="link row-l" href="#/catalog" data-act="tab" data-v="auc">Посмотреть все ${ic('right', 14)}</a></div>
        <div class="scroller">${AUCTIONS.map(acard).join('')}</div>
      </div></section>
      <section class="band white"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Популярные категории</h2><a class="link row-l" href="#/catalog" data-act="node" data-top="" data-v="">Все категории ${ic('right', 14)}</a></div>
        <div class="tiles">${HOME.cats.map((c) => `<a class="tile" href="#/catalog" data-act="nodeq" data-v="${esc(c.t)}"><img loading="lazy" src="${c.img}" alt=""><span>${esc(c.t)}</span></a>`).join('')}</div>
      </div></section>


      <section class="band"><div class="wrap">
        <div class="sec-hd wrap-hd"><h2 class="sec-t">Новые объявления</h2>
          <div class="tabs-seg scroll-x">${Object.keys(hits).map((k) => `<button class="${ui.homeTab === k ? 'on' : ''}" data-act="homeTab" data-v="${k}">${k}</button>`).join('')}</div></div>
        <div class="grid">${hits[ui.homeTab].map((id) => pcard(byId(id))).join('')}</div>
        <div class="center"><a class="btn secondary lg" href="#/catalog" data-act="node" data-top="" data-v="">Посмотреть все объявления</a></div>
      </div></section>

      <section class="band band-next"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Популярные объявления</h2><a class="link row-l" href="#/catalog" data-act="homePop">Посмотреть все ${ic('right', 14)}</a></div>
        <div class="grid">${popular.map(pcard).join('')}</div>
      </div></section>
      ${howBlock('band white')}

      <section class="band"><div class="wrap">
        <div class="sec-hd"><h2 class="sec-t">Продавцы с лучшими отзывами</h2><a class="link row-l" href="#/" ${soon('Раздел «Продавцы» соберём отдельным блоком')}>Все продавцы ${ic('right', 14)}</a></div>
        <div class="sell-row">${sellers.map(([k, ids]) => { const s = SELLERS[k]; return `<article class="sell-c"><a href="#/" ${soon('Страницу продавца соберём отдельным блоком')} class="sell-h"><span class="ava">${esc(s.name[0])}</span><span class="sell-b"><span class="row"><span class="sb">${esc(s.name)}</span>${s.pro ? '<span class="tag pro">PRO</span>' : ''}</span><span class="t12 c2">г.\u00a0${esc(s.city)}</span><span class="pc-rate">${STAR}<b>${s.rating.toFixed(2)}</b><span>${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}</span></span></span></a><div class="sell-items">${ids.map((id) => { const o = byAny(id); return `<a href="${byId(id) ? `#/item/${id}` : '#/'}" ${byId(id) ? '' : soon('Лот и ставка это сценарий аукциона, соберём его следующим')}><img loading="lazy" src="${o.img}" alt=""><span class="sell-p">${fmt(o.price)}</span><span class="sell-t">${esc(o.title)}</span></a>`; }).join('')}</div></article>`; }).join('')}</div>
      </div></section>

      <section class="band white"><div class="wrap comm">
        <div><div class="sec-hd"><h2 class="sec-t">Клубы</h2><a class="link row-l" href="#/" ${soon('Клубы соберём отдельным блоком')}>Все клубы ${ic('right', 14)}</a></div>
          <ul class="comm-l">${clubs.map((c) => `<li><a href="#/" ${soon('Страницу клуба соберём отдельным блоком')}><img loading="lazy" src="${c.img}" alt=""><span><b>${esc(c.t)}</b><span class="t12 c3">${esc(c.place)}</span></span></a></li>`).join('')}</ul></div>
        <div><div class="sec-hd"><h2 class="sec-t">Мероприятия клубов</h2><a class="link row-l" href="#/" ${soon('Мероприятия соберём отдельным блоком')}>Афиша ${ic('right', 14)}</a></div>
          <ul class="comm-l">${events.map((c) => `<li><a href="#/" ${soon('Страницу мероприятия соберём отдельным блоком')}><img loading="lazy" src="${c.img}" alt=""><span><b>${esc(c.t)}</b><span class="t12 c3">${esc(c.place)}${c.when ? `, ${esc(c.when)}` : ''}</span></span></a></li>`).join('')}</ul></div>
      </div></section>

      <section class="band"><div class="wrap"><div class="promo">
        <div class="promo-t"><h2 class="sec-t">Есть что продать?</h2><p>Разместите объявление: его увидят игроки и коллекционеры</p><button class="btn primary lg" ${soon('Продажа это отдельный сценарий, соберём его позже')}>Разместить объявление</button></div>
        <div class="promo-f" aria-hidden="true"><img class="f1" src="assets/cut-skorpekh.png" alt=""><img class="f2" src="assets/cut-strudd.png" alt=""></div>
      </div></div></section>`;
  }

  /* ---------- Каталог ---------- */
  function catalogList() {
    const c = S.cat; const q = c.q.trim().toLowerCase();
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
    if (c.sort === 'cheap') list.sort((a, b) => a.o.price - b.o.price);
    if (c.sort === 'dear') list.sort((a, b) => b.o.price - a.o.price);
    if (c.sort === 'old') list.reverse();
    return list;
  }
  function activeFilters() {
    const c = S.cat; const o = [];
    if (c.node) o.push({ l: c.node, k: 'node' });
    if (c.q) o.push({ l: `Поиск: ${c.q}`, k: 'q' });
    if (c.min || c.max) o.push({ l: `Цена ${c.min ? 'от ' + c.min : ''} ${c.max ? 'до ' + c.max : ''}`.trim(), k: 'price' });
    if (c.city !== 'Все') o.push({ l: c.city, k: 'city' });
    if (c.country !== 'Все') o.push({ l: c.country, k: 'country' });
    Object.keys(c.f).forEach((k) => (c.f[k] || []).forEach((v) => o.push({ l: v, k: 'f', g: k, v })));
    return o;
  }
  const fOn = (k) => { const c = S.cat; if (k === 'cat') return !!c.node; if (k === 'price') return !!(c.min || c.max); if (k === 'geo') return c.city !== 'Все' || c.country !== 'Все'; return !!(c.f[k] && c.f[k].length); };
  const FCLOSED = ['geo'].concat(FILTERS.map((f) => f.k));
  const fClosed = (k) => (k in S.cat.closed ? S.cat.closed[k] : FCLOSED.includes(k));
  const fsec = (k, title, body) => { const off = fClosed(k); return `<div class="flt"><button class="flt-t ${fOn(k) ? 'on' : ''}" data-act="fltT" data-k="${k}" aria-expanded="${!off}">${ic(off ? 'right' : 'down', 16)}${title}</button>${off ? '' : `<div class="flt-b">${body}</div>`}</div>`; };
  const chks = (g, opts) => `<div class="stack-4">${opts.map((t) => `<label class="chk"><input type="checkbox" data-act-chg="flt" data-g="${g}" value="${esc(t)}" ${(S.cat.f[g] || []).includes(t) ? 'checked' : ''}><span class="box">${ic('check', 14)}</span><span>${esc(t)}</span></label>`).join('')}</div>`;
  /* Путь до категории: верхний раздел, подраздел, третий уровень */
  function nodePath(n) {
    let out = null;
    if (!n) return null;
    MENU.forEach((m) => {
      if (m.t === n && !out) out = { top: m };
      m.groups.forEach((g) => g.items.forEach((i) => {
        if (i.t === n && !out) out = { top: m, group: g, l2: i };
        (i.sub || []).forEach((x) => { if (x === n && !out) out = { top: m, group: g, l2: i, l3: x }; });
      }));
    });
    return out;
  }
  const NOT_CATS = ['Клубы', 'Афиша мероприятий', 'Подарочные сертификаты'];
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
      const cats = MENU.filter((m) => !NOT_CATS.includes(m.t)).map((m) => m.t);
      return `${items(cats, 'ct-all', 'root', (t) => MENU.find((m) => m.t === t).groups.length)}<div class="ct-sep"></div>${NOT_CATS.map((t) => `<a class="ct" href="#/" data-act="soon" data-text="Это отдельный раздел, не категория товаров">${esc(t)}</a>`).join('')}`;
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
  function filtersHtml() {
    return ['cat', 'price', 'seller', 'safe', 'geo'].concat(FILTERS.map((f) => f.k)).map((k) => fsec(k, FTITLE[k], fBody(k))).join('');
  }
  const clampRow = (k, html, cls = '') => `<div class="clamp-box"><div class="clamp ${cls} ${ui.clamp[k] ? 'open' : ''}" data-clamp="${k}">${html}</div><button class="clamp-btn" data-act="clampT" data-k="${k}" hidden>${ui.clamp[k] ? 'Скрыть' : 'Показать ещё'}</button></div>`;
  function clampFit() {
    document.querySelectorAll('[data-clamp]').forEach((el) => {
      const b = el.parentNode.querySelector('.clamp-btn');
      b.hidden = !(ui.clamp[el.dataset.clamp] || el.scrollHeight > el.clientHeight + 2);
    });
  }
  const perDd = (noPrefix) => dd('per', S.cat.per, [[24, '24'], [48, '48'], [96, '96']], { aria: 'Сколько выводить на странице', prefix: noPrefix ? '' : 'Выводить по ' });
  function nodeCrumbs(n) {
    const p = nodePath(n); if (!n) return [];
    if (!p) return [{ t: n }];
    const chain = [p.top.t, p.l2 && p.l2.t, p.l3].filter(Boolean);
    return chain.map((t, i) => (i === chain.length - 1 ? { t } : { t, a: `data-act="nodef" data-v="${esc(t)}"` }));
  }
  function pageCatalog() {
    const c = S.cat; const list = catalogList(); const act = activeFilters();
    const shown = list.slice(0, c.per);
    return `<div class="wrap page">
      ${crumbs([HOME_C, CAT_C].concat(nodeCrumbs(c.node)))}
      <div class="between" style="margin-bottom:12px"><h1 class="h1">${c.q ? `Поиск: ${esc(c.q)}` : esc(c.node || 'Каталог')}</h1>${list.length ? `<span class="c3 cat-count">${list.length} ${plural(list.length, 'объявление', 'объявления', 'объявлений')}</span>` : ''}</div>
      ${clampRow('tags', TAGS.map((t) => `<button class="chip plain" data-act="tagq" data-v="${t}">${t}</button>`).join(''), 'one')}
      <div class="cat-layout">
        <aside class="cat-side" aria-label="Фильтры">${filtersHtml()}<div class="flt-act"><button class="btn ghost sm" data-act="resetCat">Сбросить</button><button class="btn secondary sm" data-act="saveSearch">${ic('save', 16)}Сохранить поиск</button></div></aside>
        <div>
          <div class="cat-bar">
            <div class="tabs-seg cat-tabs" role="tablist">${[['all', 'Все'], ['goods', 'Товары'], ['auc', 'Аукционы']].map(([k, l]) => `<button role="tab" aria-selected="${c.tab === k}" class="${c.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div>
            ${act.length ? '' : `<button class="btn hide-d cat-flt" data-act="filters">${ic('filter', 16)}Фильтры</button>`}
            <div class="view-tg hide-t-up" role="group" aria-label="Вид выдачи"><button class="${c.view === 'two' ? 'on' : ''}" data-act="view" data-v="two" aria-label="По две карточки в ряд" aria-pressed="${c.view === 'two'}">${ic('grid', 20)}</button><button class="${c.view === 'one' ? 'on' : ''}" data-act="view" data-v="one" aria-label="Список, по одной в ряд" aria-pressed="${c.view === 'one'}">${ic('list', 20)}</button></div>
            <div class="sp-auto row hide-m-only">${perDd()}${dd('sort', c.sort, SORTS, { aria: 'Сортировка' })}</div>
          </div>
          ${act.length ? `<div class="act-f"><button class="af-filter hide-d" data-act="filters" aria-label="Фильтры, применено ${act.length}">${ic('filter', 18)}<span class="badge-n">${act.length}</span></button>${act.map((a, i) => `<span class="chip plain af"><button data-act="fEdit" data-i="${i}">${esc(a.l)}</button><button class="af-x" data-act="dropF" data-i="${i}" aria-label="Убрать фильтр">${ic('x', 14)}</button></span>`).join('')}<button class="linkbtn" data-act="resetCat">Сбросить все</button></div>` : ''}
          ${shown.length ? `<div class="grid g3 ${c.view === 'one' ? 'as-list' : ''}">${shown.map((x) => (x.t === 'i' ? pcard(x.o) : acard(x.o))).join('')}</div>`
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
    const reviewsTxt = s.reviews ? `${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}` : 'Отзывов пока нет';
    const page = 'data-act="soon" data-text="Страницу продавца соберём отдельным блоком"';
    return `<section class="card seller" aria-label="Продавец">
      <div class="seller-hd">
        <span class="ava">${esc(s.name[0])}</span>
        <div style="min-width:0;flex:1">
          <div class="row"><a class="sb" href="#/" ${page}>${esc(s.name)}</a>${s.pro ? '<span class="tag pro">PRO</span>' : ''}</div>
          <div class="rate-row"><span>г.\u00a0${esc(s.city)}</span>${rating(s)}<button class="link" data-act="itab" data-v="reviews">${reviewsTxt}</button></div>
        </div>
      </div>
      <dl class="seller-stats">
        <div><dt>На площадке</dt><dd>${esc(s.stazh)}</dd></div>
        <div><dt>Срок отправки</dt><dd>до ${esc(s.shipWait)}</dd></div>
        <div><dt>Вероятность задержки</dt><dd>${s.late}%</dd></div>
      </dl>
      <div class="seller-act">
        <button class="seller-l" data-act="loginFor" data-text="Войдите, чтобы подписаться: новые объявления продавца будут приходить в уведомления">${ic('bell', 24)}<span>Подписаться</span></button>
        <a class="seller-l" href="#/" ${page}>${ic('grid', 24)}<span>Все товары</span></a>
        <button class="seller-l" data-act="loginFor" data-text="Войдите, чтобы заблокировать продавца: его объявления перестанут вам показываться">${ic('block', 24)}<span>Заблокировать</span></button>
      </div>
    </section>`;
  }
  const favBtn = (it, fav) => `<button class="icon-btn line lg ${fav ? 'fav-on' : ''}" data-act="fav" data-id="${it.id}" aria-label="В избранное" aria-pressed="${fav}">${ic('heart', 22)}</button>`;
  function buyBlock(it) {
    const s = SELLERS[it.seller]; const out = S.flags.soldOut; const c = inCart(it.id); const fav = S.favs.includes(it.id);
    const dl = s.deliveries.map((d) => DELIVERY[d].title).join(', ');
    const pay = s.pay.map((p) => PAYWAY[p].title.replace('\u00a0', ' ')).join(', ');
    return `<div class="buy-top">
        <a class="c3 t12" href="#/catalog" data-act="nodeq" data-v="${esc(it.cat)}">${esc(it.cat)}</a>
        <h1 class="pdp-title">${esc(it.title)}</h1>
      </div>
      <div class="buy-price">
        <div class="price-big">${fmt(it.price)}</div>
        ${out ? `<span class="stock no">${ic('x', 16)}Нет в наличии</span>` : `<span class="stock">${ic('check', 16)}В наличии: ${it.stock} шт.</span>`}
        ${badgeList(it).length ? `<div class="buy-badges">${badgeList(it).map((t) => `<span>${t}</span>`).join('')}</div>` : ''}
      </div>
      <div class="hide-m-cta">
        ${out ? `<div class="buy-cta"><a class="btn secondary lg" href="#/catalog">Похожие товары</a>${favBtn(it, fav)}</div>`
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
  const COMMENTS = [ // пример
    { who: 'User51234', date: '02 ноября 2026', text: 'Подскажите, база идёт в комплекте или её нужно докупать отдельно?', replies: [{ who: 'PocketSized Prints', seller: true, date: '02 ноября 2026', text: 'База в комплекте, миниатюра с базой на 32 мм.' }, { who: 'User51234', date: '03 ноября 2026', text: 'Спасибо!' }] },
    { who: 'GriinWan', date: '28 октября 2026', text: 'Можно напечатать в другом масштабе?', replies: [{ who: 'PocketSized Prints', seller: true, date: '28 октября 2026', text: 'Да, напишите в комментарии к заказу, какой масштаб нужен.' }] },
  ];
  const cmItem = (c, i, reply) => `<article class="cm ${reply ? 'reply' : ''}"><span class="ava sm">${esc(c.who[0])}</span><div><div class="row"><span class="sb">${esc(c.who)}</span>${c.seller ? '<span class="tag mute">Продавец</span>' : ''}<span class="t12 c3">${esc(c.date)}</span></div><p>${esc(c.text)}</p>${!reply && S.flags.auth ? `<button class="linkbtn t12" data-act="replyT" data-i="${i}">Ответить</button>` : ''}</div></article>`;
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
  function pageItem(r) {
    const it = byId(r.id) || ITEMS[0];
    const s = SELLERS[it.seller]; const revs = REVIEWS[it.seller] || [];
    const tabs = [['desc', 'Описание'], ['talk', 'Обсуждение', 0], ['reviews', 'Отзывы о продавце', s.reviews]];
    const similar = ITEMS.filter((i) => i.id !== it.id && i.top === it.top).slice(0, 4);
    let tabBody = '';
    if (ui.tab === 'desc') {
      tabBody = `${it.specs.length ? `<h2 class="h3 d-sec">Характеристики</h2><dl class="spec">${it.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        <h2 class="h3 d-sec">Описание</h2>${descHtml(it)}
        <div class="d-foot"><span class="t12 c3">Опубликовано ${esc(it.added)}</span><button class="linkbtn" style="color:var(--text-2)" data-act="report">${ic('flag', 16)}Пожаловаться на объявление</button></div>`;
    } else if (ui.tab === 'talk') {
      const list = S.comments[it.id] || (it.id === 'strudd' ? COMMENTS : []);
      tabBody = it.noComments ? '<p class="c2">Продавец отключил комментарии к\u00a0этому объявлению</p>' : `
        ${list.length ? `<div class="cm-list">${list.map((c, i) => `<div class="cm-thread">${cmItem(c, i)}${(c.replies || []).length || ui.replyTo === i ? `<div class="cm-replies">${(c.replies || []).map((x) => cmItem(x, i, true)).join('')}${ui.replyTo === i ? `<div class="cm-form in"><textarea class="inp" id="cmReply" rows="2" placeholder="Ваш ответ"></textarea><div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-act="replyT" data-i="${i}">Отмена</button><button class="btn primary sm" data-act="replySend" data-id="${it.id}" data-i="${i}">Ответить</button></div></div>` : ''}</div>` : ''}</div>`).join('')}</div>` : '<p class="c2" style="margin-bottom:12px">Вопросов пока нет. Спросите продавца о\u00a0комплектации, доставке или фото</p>'}
        ${S.flags.auth ? `<div class="cm-form"><label class="fld"><span class="lbl">Ваш вопрос или комментарий</span><textarea class="inp" id="cmText" rows="3" placeholder="Например, есть ли дополнительные фото"></textarea></label><div class="between"><button class="linkbtn" data-act="soon" data-text="Прикрепление изображений как на сайте">${ic('clip', 16)}Изображения</button><button class="btn primary" data-act="comment" data-id="${it.id}">Отправить</button></div></div>`
          : `<div class="note info">${ic('info')}<div class="body">Чтобы задать вопрос, войдите в\u00a0аккаунт. <button class="linkbtn" data-act="login">Войти</button></div></div>`}`;
    } else {
      const sorted = revs.slice();
      if (ui.revSort === 'old') sorted.reverse();
      if (ui.revSort === 'good') sorted.sort((a, b) => Number(b.good) - Number(a.good));
      if (ui.revSort === 'bad') sorted.sort((a, b) => Number(a.good) - Number(b.good));
      tabBody = s.reviews ? `${revSummary(s)}
        ${revs.length > 1 ? `<div class="rev-bar">${dd('rev', ui.revSort, [['new', 'Сначала новые'], ['old', 'Сначала старые'], ['good', 'Сначала с высокой оценкой'], ['bad', 'Сначала с низкой оценкой']], { aria: 'Сортировка отзывов' })}</div>` : ''}
        ${sorted.map((v) => `<article class="rev"><div class="between"><span class="sb">${esc(v.who)}</span><span class="t12 c3">${esc(v.date)}</span></div><div class="rev-st" aria-label="Оценка ${v.good ? 5 : 1} из 5">${[1, 2, 3, 4, 5].map((x) => `<span class="${x <= (v.good ? 5 : 1) ? 'on' : ''}">${STAR}</span>`).join('')}</div><p>${esc(v.text)}</p></article>`).join('')}
        ${s.reviews > revs.length ? '<button class="btn secondary" style="margin-top:8px" data-act="soon" data-text="Полный список отзывов будет на странице продавца">Показать все отзывы</button>' : ''}`
        : '<p class="c2">У этого продавца пока нет отзывов. Он на площадке ' + esc(s.stazh) + '</p>';
    }
    return `<div class="wrap page">
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
      ${similar.length ? `<section class="sec"><div class="sec-hd"><h2 class="h2">Похожие товары</h2></div><div class="scroller">${similar.map((x) => pcard(x)).join('')}</div></section>` : ''}
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
        <a class="ci-t" href="#/item/${it.id}">${esc(it.title)}</a>
        <p class="t12 c3">${esc(it.cat)}</p>
        ${out ? `<div class="err-t">${ic('alert', 14)}<span>${rest < 1 ? 'Товар закончился' : `В наличии только ${rest} шт.`}</span></div>` : ''}
        ${out && rest > 0 ? `<button class="linkbtn t12" style="margin-top:4px" data-act="fixQty" data-id="${it.id}" data-v="${rest}">Оставить ${rest} шт.</button>` : ''}
      </div>
      <div class="ci-ctl">
        <span class="ci-price">${fmt(it.price * l.qty)}</span>
        <div class="row">
          ${stepper ? `<div class="step sm"><button data-act="lineQty" data-id="${it.id}" data-d="-1" ${l.qty <= 1 ? 'disabled' : ''} aria-label="Меньше">${ic('minus', 16)}</button><input class="step-i" inputmode="numeric" aria-label="Количество" data-lineqty="${it.id}" value="${l.qty}"><button data-act="lineQty" data-id="${it.id}" data-d="1" ${l.qty >= it.stock ? 'disabled' : ''} aria-label="Больше">${ic('plus', 16)}</button></div>` : `<span class="t12 c3">${l.qty} шт.</span>`}
          <button class="icon-btn" style="width:32px;height:32px" data-act="rm" data-id="${it.id}" aria-label="Удалить">${ic('trash', 18)}</button>
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
      ${off ? '' : `<p class="t12 c2 rel-h">Они войдут в этот же заказ у продавца</p><div class="rel-list">${rel.slice(0, 6).map((i) => `<a class="rl" href="#/item/${i.id}"><img loading="lazy" src="${i.img}" alt=""><span class="rl-p">${fmt(i.price)}</span><span class="rl-t">${esc(i.title)}</span></a>`).join('')}</div>`}</div>`;
  }
  function viewedBlock(exclude) {
    const seen = S.viewed.filter((id) => !exclude.includes(id)).slice(0, 4);
    const ids = seen.length ? seen : ['prisoners', 'lutazy', 'warriors', 'zeratul'].filter((id) => !exclude.includes(id));
    return `<section class="sec"><div class="sec-hd"><h2 class="h2">Вы смотрели</h2></div><div class="scroller">${ids.map((id) => pcard(byId(id))).join('')}</div></section>`;
  }
  function recsBlock(exclude) {
    const ids = ['terminators', 'darkshroud', 'yucatan', 'arkham', 'zombicide', 'warriors'].filter((id) => !exclude.includes(id) && !S.viewed.slice(0, 4).includes(id)).slice(0, 4);
    return `<section class="sec"><div class="sec-hd"><h2 class="h2">Может понравиться</h2></div><div class="scroller">${ids.map((id) => pcard(byId(id))).join('')}</div></section>`;
  }
  function cartCta(blocked, anyOut, minBad) {
    if (!blocked) return '<a class="btn primary lg block hide-sm" href="#/checkout">Перейти к оформлению</a>';
    const why = anyOut ? 'Уберите товары, которых нет в наличии' : minBad ? 'Сумма заказа меньше минимальной у продавца' : 'Выберите хотя бы один товар';
    return `<div><button class="btn lg block is-disabled" disabled>Перейти к оформлению</button><p class="err-t">${ic('info', 14)}<span>${why}</span></p></div>`;
  }
  function pageCart() {
    const all = groups(false); const on = groups(true);
    if (!S.cart.length) {
      return `<div class="wrap page"><h1 class="h1" style="margin-bottom:16px">Корзина</h1>
        <div class="empty"><div class="ico">${ic('cart', 28)}</div><p class="h3">В корзине пока пусто</p><p class="c2" style="margin:4px 0 16px">Найдите нужное в каталоге или через поиск</p><a class="btn primary" href="#/catalog">Перейти в каталог</a></div>
        ${viewedBlock([])}</div>`;
    }
    const total = on.reduce((a, g) => a + g.sum, 0);
    const count = on.reduce((a, g) => a + g.lines.reduce((x, l) => x + l.qty, 0), 0);
    const anyOut = S.cart.some(isOut); const minBad = on.some(minProblem);
    const blocked = !count || anyOut || minBad;
    const allOn = S.cart.every((c) => c.on);
    return `<div class="wrap page">
      <div class="between" style="margin-bottom:12px"><h1 class="h1">Корзина</h1><span class="c3">${cartCount()} ${plural(cartCount(), 'товар', 'товара', 'товаров')}</span></div>
      ${S.notice ? `<div class="note bad" style="margin-bottom:12px" role="alert">${ic('alert')}<div class="body">${esc(S.notice)}</div></div>` : ''}
      <div class="two">
        <div>
          <div class="cart-tools">
            <label class="chk"><input type="checkbox" data-act-chg="all" ${allOn ? 'checked' : ''}><span class="box">${ic('check', 14)}</span><span>Выбрать все</span></label>
            <button class="linkbtn" data-act="rmOff" style="color:var(--text-2)">${ic('trash', 16)}Удалить выбранное</button>
          </div>
          ${all.map((g) => {
            const gOn = on.find((x) => x.sid === g.sid);
            const need = gOn ? minProblem(gOn) : 0;
            const free = g.seller.freeFrom;
            return `<section class="sg">
              <header class="sg-hd"><span class="sb">${esc(g.seller.name)}</span>${g.seller.pro ? '<span class="tag pro">PRO</span>' : ''}<span class="row t12 c2" style="gap:4px">${g.seller.reviews ? `${STAR}${g.seller.rating.toFixed(2)}` : 'Новый продавец'}</span><span class="t12 c3">${esc(g.seller.city)}</span></header>
              ${g.lines.map(cartLine).join('')}
              <div class="sg-ft">
                ${need ? `<div class="note warn" role="status">${ic('alert')}<div class="body">Минимальная сумма заказа у продавца ${fmt(g.seller.minSum)}. Доберите товаров на ${fmt(need)}</div></div>` : ''}
                ${free && !need ? `<div class="note ok">${ic('truck')}<div class="body">${gOn && gOn.sum >= free ? 'Бесплатная доставка!' : `Добавьте товаров на ${fmt(free - (gOn ? gOn.sum : 0))}, чтобы получить бесплатную доставку`}</div></div>` : ''}
                <div class="between"><span class="c2">Итого у продавца, без доставки</span><span class="sb">${fmt(gOn ? gOn.sum : 0)}</span></div>
              </div>
              ${relatedBlock(g)}
            </section>`;
          }).join('')}
        </div>
        <aside class="two-side sum-card" aria-label="Итог">
          <div class="h3">Ваш заказ</div>
          ${on.length > 1 ? `<div class="note info">${ic('info')}<div class="body"><b>Будет ${on.length} ${plural(on.length, 'заказ', 'заказа', 'заказов')}.</b> У каждого продавца своё подтверждение, оплата и доставка</div></div>` : ''}
          ${on.map((g) => `<div class="sum-row"><span class="c2">${esc(g.seller.name)}</span><span class="v">${fmt(g.sum)}</span></div>`).join('')}
          <div class="sum-row"><span class="c2">Доставка</span><span class="v c2">на следующем шаге</span></div>
          <div class="sum-total"><span>Итого за товары</span><span class="v">${fmt(total)}</span></div>
          ${cartCta(blocked, anyOut, minBad)}
        </aside>
      </div>
      ${viewedBlock(S.cart.map((c) => c.id))}
      ${recsBlock(S.cart.map((c) => c.id))}
    </div>
    <div class="sticky-bar"><div class="sum"><span class="t12 c3">Итого за товары</span><b>${fmt(total)}</b></div>${blocked ? '<button class="btn lg is-disabled" disabled>К оформлению</button>' : '<a class="btn primary lg" href="#/checkout">К оформлению</a>'}</div>`;
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
  const needsIndex = () => coGroups().some((g) => S.co.dl[g.sid] === 'post');
  function fieldError(n) {
    const v = (S.form[n] || '').trim();
    if (n === 'email') { if (!v) return 'Укажите email'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) return 'Проверьте email: например, name@example.com'; }
    if (n === 'phone') { const d = v.replace(/\D/g, ''); if (!d || d === '7') return 'Укажите телефон'; if (d.length < 11) return 'Проверьте номер: нужно 10 цифр после +7'; }
    if (n === 'fio') { if (!v) return 'Укажите фамилию и имя'; if (v.split(/\s+/).length < 2) return 'Нужны хотя бы фамилия и имя'; }
    if (n === 'street' && needsAddress() && !v) return 'Укажите улицу';
    if (n === 'house' && needsAddress() && !v) return 'Укажите дом';
    if (n === 'index' && needsIndex() && !/^\d{6}$/.test(v)) return v ? 'В индексе 6 цифр' : 'Индекс нужен для Почты России';
    return '';
  }
  const showErr = (n) => (ui.submitted || ui.touched[n]) && fieldError(n);
  function field(n, cls) {
    const f = FIELD[n]; const err = showErr(n);
    return `<label class="fld ${err ? 'err' : ''} ${cls || ''}" data-fld="${n}">
      <span class="lbl">${f.label}${f.opt ? ' <em>необязательно</em>' : ''}</span>
      <input class="inp" name="${n}" type="${f.type || 'text'}" ${f.ac ? `autocomplete="${f.ac}"` : ''} ${f.im ? `inputmode="${f.im}"` : ''} ${f.ph ? `placeholder="${f.ph}"` : ''} value="${esc(S.form[n] || '')}" ${err ? 'aria-invalid="true"' : ''}>
      ${err ? `<span class="err-t">${err}</span>` : f.hint ? `<span class="hint">${f.hint}</span>` : ''}
    </label>`;
  }
  const dlPrice = (g) => {
    const d = S.co.dl[g.sid]; if (!d) return null;
    if (g.seller.freeFrom && g.sum >= g.seller.freeFrom) return 0;
    return DELIVERY[d].price + (S.co.surcharge && S.co.surcharge[g.sid] ? S.co.surcharge[g.sid] : 0);
  };
  const promoOff = (g) => (S.co.promo[g.sid] === 'MINI10' ? Math.round(g.sum * 0.1) : 0);
  const orderTotal = (g) => g.sum - promoOff(g) + (dlPrice(g) || 0);
  const certOff = (sum) => (S.co.cert === 'GIFT500' ? Math.min(500, sum) : 0);
  const grand = () => { const v = coGroups().reduce((a, g) => a + orderTotal(g), 0); return v - certOff(v); };

  /* Адрес один на все заказы: значения хранятся в форме, поэтому при смене способа не сбрасываются */
  function addressFields() {
    return `<div class="addr"><p class="lbl-b">Адрес доставки, ${esc(S.co.city)}</p><div class="addr-grid">${field('street', 'a-street')}${field('house', 'a-sm')}${field('flat', 'a-sm')}${needsIndex() ? field('index', 'a-idx') : ''}</div></div>`;
  }
  function addressSlot(g) {
    const dl = S.co.dl[g.sid];
    if (!dl || DELIVERY[dl].needs !== 'address') return '';
    const first = coGroups().find((x) => { const d = S.co.dl[x.sid]; return d && DELIVERY[d].needs === 'address'; });
    if (first.sid === g.sid) return addressFields();
    const own = S.co.addr && S.co.addr[g.sid];
    if (own) {
      const inp = (k, label, cls) => `<label class="fld ${cls}"><span class="lbl">${label}</span><input class="inp" data-addr="${g.sid}" data-k="${k}" value="${esc(own[k] || '')}"></label>`;
      const bad = ui.submitted && (!own.street || !own.house);
      return `<div class="addr"><div class="lbl-row"><p class="lbl-b" style="margin:0">Адрес этого заказа, ${esc(S.co.city)}</p><button type="button" class="x-btn" data-act="addrOff" data-s="${g.sid}" aria-label="Использовать адрес выше">${ic('x', 16)}</button></div><div class="addr-grid">${inp('street', 'Улица', 'a-street')}${inp('house', 'Дом', 'a-sm')}${inp('flat', 'Квартира', 'a-sm')}${dl === 'post' ? inp('index', 'Индекс', 'a-idx') : ''}</div>${bad ? `<p class="err-t">${ic('alert', 14)}<span>Укажите улицу и дом</span></p>` : ''}</div>`;
    }
    const f = S.form; const line = [f.street, f.house && `д. ${f.house}`, f.flat && `кв. ${f.flat}`].filter(Boolean).join(', ');
    return `<div class="addr-same"><p class="c2">Адрес как в заказе выше${line ? `: ${esc(line)}` : ''}</p><button type="button" class="linkbtn" data-act="addrOn" data-s="${g.sid}">${ic('plus', 16)}Добавить другой адрес</button></div>`;
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
        ${g.lines.length === 1 ? `<div class="so-item-one"><img src="${g.lines[0].item.img}" alt="" width="56" height="56"><div style="min-width:0"><p class="t">${esc(g.lines[0].item.title)}</p><p class="t12 c3">${g.lines[0].qty} шт. · ${fmt(g.sum)}</p></div></div>`
          : `<div><div class="so-items">${g.lines.map((l) => `<img src="${l.item.img}" alt="${esc(l.item.title)}">`).join('')}</div><p class="t12 c3" style="margin-top:4px">${g.lines.reduce((a, l) => a + l.qty, 0)} шт. · ${fmt(g.sum)}</p></div>`}
        ${!city ? '<p class="c3">Укажите город выше, и мы покажем доступные способы получения</p>' : `
        <div>
          <p class="lbl-b">Как получить</p>
          <div class="opt-list two-col" role="radiogroup" aria-label="Способ получения">
            ${opts.map((d) => { const D = DELIVERY[d]; const on = dl === d; const free = D.price === 0 || (s.freeFrom && g.sum >= s.freeFrom);
              return `<label class="opt ${on ? 'on' : ''}"><input type="radio" name="dl-${g.sid}" data-act-chg="dl" data-s="${g.sid}" value="${d}" ${on ? 'checked' : ''}><span class="dot"></span><span class="main"><span class="sb" style="display:block">${D.title}</span><span class="pr">${free ? 'бесплатно' : fmt(D.price)}</span><span class="t12 c3" style="display:block">${d === 'pickup' ? `${esc(s.city)}. ${D.note}` : D.note}</span>
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
  function payBlock(g, i, n) {
    const s = g.seller; const co = S.co; const dl = co.dl[g.sid];
    const payOpts = s.pay.filter((p) => p !== 'cash' || dl === 'pickup');
    const pay = payOpts.includes(co.pay[g.sid]) ? co.pay[g.sid] : payOpts[0];
    co.pay[g.sid] = pay;
    const openC = ui.opened['c' + g.sid]; const openP = ui.opened['p' + g.sid];
    const x = (k) => `<button type="button" class="x-btn" data-act="close" data-k="${k}${g.sid}" data-s="${g.sid}" aria-label="Убрать">${ic('x', 16)}</button>`;
    return `<div class="pay-b">
      <div class="pay-hd"><div class="so-items">${g.lines.slice(0, 3).map((l) => `<img src="${l.item.img}" alt="${esc(l.item.title)}">`).join('')}</div><div style="min-width:0"><p class="sb">${n > 1 ? `Заказ ${i + 1} из ${n}: ` : ''}${esc(s.name)}</p><p class="c2">${g.lines.reduce((a, l) => a + l.qty, 0)} шт. на ${fmt(orderTotal(g))}</p></div></div>
      <div class="opt-list two-col" role="radiogroup" aria-label="Способ оплаты">
        ${payOpts.map((p) => { const P = PAYWAY[p]; const on = pay === p; return `<label class="opt ${on ? 'on' : ''}"><input type="radio" name="pay-${g.sid}" data-act-chg="pay" data-s="${g.sid}" value="${p}" ${on ? 'checked' : ''}><span class="dot"></span><span class="main"><span class="sb" style="display:block">${P.title}</span><span class="t12 c3" style="display:block">${P.note}</span></span></label>`; }).join('')}
      </div>
      ${openC ? `<div class="fld"><div class="lbl-row"><label class="lbl" for="cm-${g.sid}">Комментарий продавцу</label>${x('c')}</div><textarea class="inp" id="cm-${g.sid}" rows="3" data-co-comment="${g.sid}" placeholder="Например, удобное время для связи">${esc(co.comment[g.sid] || '')}</textarea></div>` : ''}
      ${co.promo[g.sid] ? `<div class="note ok">${ic('tag')}<div class="body between"><span>Промокод ${esc(co.promo[g.sid])}: скидка ${fmt(promoOff(g))}</span><button type="button" class="x-btn" data-act="promoOff" data-s="${g.sid}" aria-label="Убрать промокод">${ic('x', 16)}</button></div></div>`
        : openP ? `<div class="fld ${ui.promoErr[g.sid] ? 'err' : ''}"><div class="lbl-row"><label class="lbl" for="promo-${g.sid}">Промокод</label>${x('p')}</div><div class="promo-row"><input class="inp" id="promo-${g.sid}" autocomplete="off"><button type="button" class="btn secondary" data-act="promo" data-s="${g.sid}">Применить</button></div>${ui.promoErr[g.sid] ? `<span class="err-t">${ui.promoErr[g.sid]}</span>` : ''}</div>` : ''}
      ${openC && (openP || co.promo[g.sid]) ? '' : `<div class="row pay-more">
        ${openC ? '' : `<button type="button" class="linkbtn" data-act="open" data-k="c${g.sid}">${ic('plus', 16)}Комментарий продавцу</button>`}
        ${openP || co.promo[g.sid] ? '' : `<button type="button" class="linkbtn" data-act="open" data-k="p${g.sid}">${ic('plus', 16)}Промокод</button>`}
      </div>`}
    </div>`;
  }
  function certBlock() {
    const raw = coGroups().reduce((a, g) => a + orderTotal(g), 0);
    if (S.co.cert) return `<div class="sum-row"><span class="c2">Сертификат ${esc(S.co.cert)}</span><span class="v row">−${fmt(certOff(raw))}<button type="button" class="x-btn" data-act="certOff" aria-label="Убрать сертификат">${ic('x', 16)}</button></span></div>`;
    if (!ui.certOpen) return `<button type="button" class="linkbtn" data-act="certT">${ic('plus', 16)}Подарочный сертификат</button>`;
    return `<div class="fld ${ui.certErr ? 'err' : ''}"><div class="lbl-row"><label class="lbl" for="cert">Подарочный сертификат</label><button type="button" class="x-btn" data-act="certT" aria-label="Убрать">${ic('x', 16)}</button></div><div class="promo-row"><input class="inp" id="cert" autocomplete="off" placeholder="Код"><button type="button" class="btn secondary" data-act="certGo">Применить</button></div>${ui.certErr ? `<span class="err-t">${ui.certErr}</span>` : ''}</div>`;
  }
  const ctaText = (n) => (n > 1 ? `Оформить ${n} ${plural(n, 'заказ', 'заказа', 'заказов')}` : 'Оформить заказ');
  function summary() {
    const gs = coGroups(); const n = gs.length;
    return `<div class="sum-card" id="summary">
      <div class="h3">${n > 1 ? `${n} ${plural(n, 'заказ', 'заказа', 'заказов')}` : 'Ваш заказ'}</div>
      ${n > 1 ? `<div class="note info">${ic('info')}<div class="body">У каждого продавца своё подтверждение, своя оплата и свой срок</div></div>` : ''}
      ${gs.map((g) => { const p = dlPrice(g); return `<div class="sum-order">
        ${n > 1 ? `<div class="sb">${esc(g.seller.name)}</div>` : ''}
        <div class="sum-row"><span class="c2">Товары, ${g.lines.reduce((a, l) => a + l.qty, 0)} шт.</span><span class="v">${fmt(g.sum)}</span></div>
        ${promoOff(g) ? `<div class="sum-row"><span class="c2">Скидка</span><span class="v">−${fmt(promoOff(g))}</span></div>` : ''}
        <div class="sum-row"><span class="c2">Доставка</span><span class="v ${p === null ? 'c3' : ''}">${p === null ? 'не выбрана' : p === 0 ? 'бесплатно' : fmt(p)}</span></div>
      </div>`; }).join('')}
      ${certBlock()}
      <div class="sum-total" style="padding-top:0;border-top:0"><span>Итого</span><span class="v">${fmt(grand())}</span></div>
      <button class="btn primary lg block hide-sm ${ui.loading ? 'is-loading' : ''}" data-act="submit">${ui.loading ? '<span class="spin"></span>' : ctaText(n)}</button>
      <div class="key">${ic('card')}<div><p class="sb">Сейчас платить не нужно</p><p>Реквизиты получите, когда продавец подтвердит заказ</p></div></div>
      <div class="key">${ic('truck')}<div><p class="sb">Сумму доставки подтвердит продавец</p><p>Стоимость рекомендованная, продавец может её изменить. Новую сумму вы увидите до оплаты</p></div></div>
      <p class="t12 c3">Нажимая кнопку, вы принимаете <a class="link" href="#/checkout">пользовательское соглашение</a></p>
    </div>`;
  }
  const cityList = (v) => { const list = CITIES.filter((c) => !v || c.toLowerCase().startsWith(v.toLowerCase())); return list.length ? `<div class="dd-menu" style="position:absolute"><div class="dd-list" role="listbox">${list.map((c) => `<button type="button" role="option" class="dd-o" data-act="city" data-v="${c}"><span>${c}</span></button>`).join('')}</div></div>` : ''; };
  function pageCheckout() {
    const gs = coGroups();
    if (!gs.length) { setTimeout(() => go('#/cart'), 0); return ''; }
    const cityErr = (ui.submitted || ui.touched.city) && !S.co.city;
    const st = ui.coStep; const names = ['Получатель', 'Доставка', 'Оплата', 'Проверка'];
    const mobileBtn = st < 4 ? '<button class="btn primary lg" data-act="coNext">Далее</button>' : `<button class="btn primary lg ${ui.loading ? 'is-loading' : ''}" data-act="submit">${ui.loading ? '<span class="spin"></span>' : ctaText(gs.length)}</button>`;
    return `<div class="wrap page focus-page">
      <div class="co-wrap" data-step="${st}">
      <a class="back ${st > 1 ? 'hide-below-d' : ''}" href="#/cart">${ic('left', 16)}Вернуться в корзину</a>
      ${st > 1 ? `<button class="back hide-d" data-act="coBack">${ic('left', 16)}${names[st - 2]}</button>` : ''}
      <h1 class="h1" style="margin-bottom:12px">Оформление заказа</h1>
      <ol class="co-steps hide-d" aria-label="Шаги оформления">${names.map((n, i) => `<li class="${i + 1 === st ? 'on' : i + 1 < st ? 'done' : ''}"><button data-act="coGo" data-v="${i + 1}" ${i + 1 < st ? '' : 'disabled'}><span class="n">${i + 1 < st ? ic('check', 12) : i + 1}</span><span>${n}</span></button></li>`).join('')}</ol>
      ${S.banner ? `<div class="note ${S.banner.kind}" style="margin-bottom:12px" role="alert">${ic('alert')}<div class="body">${esc(S.banner.text)}</div></div>` : ''}
      <div class="two co">
        <div>
          <div class="key st st-3 hide-d" style="margin-bottom:12px;background:var(--surface)">${ic('card')}<div><p class="sb">Сейчас платить не нужно</p><p>Реквизиты получите, когда продавец подтвердит заказ</p></div></div>
          <div class="guest-bar st st-1"><span class="c2">Оформляете как гость. Аккаунт создадим автоматически</span><span>Уже есть аккаунт? <button class="linkbtn" data-act="login">Войти</button></span></div>
          <section class="co-sec st st-1" aria-labelledby="s1"><div class="co-hd"><span class="n">1</span><h2 class="h3" id="s1">Получатель</h2></div>
            <p class="co-sub">Заказ выдадут по этим данным, проверьте их</p>
            <div class="form-grid">${field('fio')}${field('email', 'col3')}${field('phone', 'col3')}</div>
          </section>
          <section class="co-sec st st-2" aria-labelledby="s2"><div class="co-hd"><span class="n">2</span><h2 class="h3" id="s2">Доставка</h2></div>
            <div class="fld city-box ${cityErr ? 'err' : ''}" data-fld="city">
              <label class="lbl" for="city">Город получателя</label>
              <input class="inp" id="city" autocomplete="off" role="combobox" aria-expanded="${ui.cityOpen}" placeholder="Начните вводить город" value="${esc(S.co.cityTxt)}">
              <div id="cityList">${ui.cityOpen ? cityList(S.co.cityTxt) : ''}</div>
              ${cityErr ? '<span class="err-t">Укажите город</span>' : ''}
            </div>
            ${gs.map((g, i) => sellerBlock(g, i, gs.length)).join('')}
          </section>
          <section class="co-sec st st-3" aria-labelledby="s3"><div class="co-hd"><span class="n">3</span><h2 class="h3" id="s3">Оплата</h2></div>
            ${gs.map((g, i) => payBlock(g, i, gs.length)).join('')}
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
      for (const g of coGroups()) { const a = S.co.addr && S.co.addr[g.sid]; if (a && S.co.dl[g.sid] && DELIVERY[S.co.dl[g.sid]].needs === 'address' && (!a.street || !a.house)) return `#so-${g.sid}`; }
    }
    return null;
  }
  function firstError() {
    for (const n of ['fio', 'email', 'phone']) if (fieldError(n)) return `[data-fld="${n}"]`;
    if (!S.co.city) return '[data-fld="city"]';
    for (const g of coGroups()) { const d = S.co.dl[g.sid]; if (!d || (DELIVERY[d].needs === 'pvz' && !S.co.pvz[g.sid])) return `#so-${g.sid}`; }
    for (const n of ['street', 'house', 'index']) if (fieldError(n)) return `[data-fld="${n}"]`;
    for (const g of coGroups()) { const a = S.co.addr && S.co.addr[g.sid]; if (a && S.co.dl[g.sid] && DELIVERY[S.co.dl[g.sid]].needs === 'address' && (!a.street || !a.house)) return `#so-${g.sid}`; }
    return null;
  }
  function submit() {
    ui.submitted = true;
    const bad = firstError();
    if (bad) {
      ui.coStep = /fio|email|phone/.test(bad) ? 1 : 2;
      render();
      const el = document.querySelector(bad);
      if (el) { el.scrollIntoView({ block: 'center' }); const inp = el.querySelector('input'); if (inp && inp.type !== 'radio') inp.focus({ preventScroll: true }); }
      return;
    }
    ui.loading = true; render();
    setTimeout(() => {
      ui.loading = false;
      const f = S.flags.fail;
      if (f === 'changed' && !S.co.surcharge) {
        S.co.surcharge = {}; const g = coGroups()[0]; S.co.surcharge[g.sid] = 150;
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
      makeOrders(); S.cart = S.cart.filter((c) => !c.on || isOut(c)); S.banner = null; S.co.surcharge = null;
      save(); ui.submitted = false; ui.touched = {}; go('#/success');
    }, 900);
  }
  function makeOrders() {
    const d48 = new Date(Date.now() + 48 * 3600000);
    S.orders = coGroups().map((g, i) => ({
      no: 464801 + i, sid: g.sid, dl: S.co.dl[g.sid], pay: S.co.pay[g.sid], pvz: S.co.pvz[g.sid], sum: g.sum, delivery: dlPrice(g) || 0, total: orderTotal(g) - (i === 0 ? certOff(coGroups().reduce((a, x) => a + orderTotal(x), 0)) : 0), deadline: d48.getTime(),
      lines: g.lines.map((l) => ({ id: l.id, qty: l.qty })),
    }));
    S.buyer = { email: S.form.email || 'ivanov@example.com', name: (S.form.fio || 'Иванов Иван').trim().split(/\s+/)[1] || 'Иван' };
  }
  function ensureOrders() {
    if (S.orders) return;
    if (!S.cart.length) preset('one');
    fillForm(); makeOrders(); S.cart = [];
  }

  /* ---------- Успех ---------- */
  const isConfirmed = (o) => S.flags.autoConfirm && SELLERS[o.sid].pro;
  function timeline(o, confirmed, email, multi) {
    const s = SELLERS[o.sid]; const cash = o.pay === 'cash'; const pickup = o.dl === 'pickup';
    const dl = dateStr(new Date(o.deadline));
    const steps = [
      confirmed ? { t: 'Продавец подтвердил заказ', d: 'Автоматически, сразу после оформления' } : { t: multi ? 'Продавцы подтвердят заказы' : 'Продавец подтвердит заказ', d: `До ${dl}. Если продавец не ответит за 48 часов, заказ отменится автоматически` },
      multi ? { t: 'Вы оплатите каждый заказ отдельно', d: `Реквизиты и срок оплаты придут на ${email} после подтверждения. Если не успеть, заказ отменится` } : cash ? { t: 'Оплатите наличными при встрече', d: 'Договоритесь с продавцом о месте и времени' } : { t: 'Вы оплатите переводом и приложите чек', d: `Реквизиты придут на ${email}. На оплату будет ${s.payWait}, если не успеть, заказ отменится` },
      multi ? { t: 'Продавцы отправят заказы', d: 'У каждого свой срок отправки, он указан в письме и в заказе' } : pickup ? { t: 'Заберёте заказ у продавца', d: `${s.city}` } : { t: 'Продавец отправит заказ', d: `В течение ${s.shipWait} после оплаты` },
      { t: 'Подтвердите получение', d: 'Через 30 дней заказ сам считается полученным' },
    ];
    const cur = confirmed ? 1 : 0;
    return `<ol class="tl">${steps.map((x, i) => `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><span class="d">${i < cur ? ic('check', 14) : i + 1}</span><div><p class="tl-t">${esc(x.t)}</p><p class="tl-d">${esc(x.d)}</p></div></li>`).join('')}</ol>`;
  }
  function orderCard(o) {
    const s = SELLERS[o.sid]; const confirmed = isConfirmed(o);
    const first = byId(o.lines[0].id);
    const names = o.lines.map((l) => byId(l.id).title).join(', ');
    const count = o.lines.reduce((a, l) => a + l.qty, 0);
    const pvz = PVZ.find((p) => p.id === o.pvz);
    return `<section class="card stack-12">
      <div class="between"><span class="sb t16">Заказ №${o.no}</span><span class="tag ${confirmed ? 'ok' : 'warn'}">${confirmed ? 'Ожидает оплату' : 'Ожидает подтверждения'}</span></div>
      <div class="oc-row"><img src="${first.img}" alt=""><div style="min-width:0"><p class="sb" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(names)}</p><p class="t12 c3">${count} шт. · продавец ${esc(s.name)}</p></div></div>
      <div class="oc-rows">
        <div class="sum-row"><span class="c2">${DELIVERY[o.dl].title}${pvz ? ', ' + pvz.name : ''}</span><span class="v">${o.delivery ? fmt(o.delivery) : 'бесплатно'}</span></div>
        <div class="sum-row"><span class="c2">${PAYWAY[o.pay].title}</span><span class="v sb">Итого ${fmt(o.total)}</span></div>
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
    return `<div class="wrap page"><div class="ok-page stack-12">
      <header class="ok-hd"><span class="ok-ic${okPlay ? ' play' : ''}"><svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><circle class="ok-c" cx="28" cy="28" r="28"/><path class="ok-k" d="M16 29l8 8 16-17" pathLength="1"/></svg></span><h1 class="h1">${title}</h1></header>
      ${multi ? `<div class="note info">${ic('info')}<div class="body">Это ${os.length} отдельных заказа: у каждого продавца своё подтверждение, оплата и доставка</div></div>` : ''}
      <section class="card">
        <h2 class="h3" style="margin-bottom:16px">Что будет дальше</h2>${timeline(os[0], allConf, S.buyer.email, multi)}
        <div class="tg-box"><img src="assets/tg.svg" alt="" width="40" height="40"><div><h3 class="h3">Статус заказа в\u00a0Телеграме</h3><p class="c2">Подключите уведомления, и бот сообщит, когда продавец ответит</p></div><button class="btn secondary" data-act="soon" data-text="Подключение Телеграма оставляем как на сайте">Получать уведомления</button></div>
      </section>
      ${accountBlock()}
      ${os.map(orderCard).join('')}
      <div class="acts">
        <button class="btn primary lg" data-act="soon" data-text="Вход и заказ в личном кабинете это следующий сценарий: CJM 2 «После заказа»">${allConf ? 'Войти и оплатить' : 'Войти и открыть заказ'}</button>
        <a class="btn secondary lg" href="#/catalog">Продолжить покупки</a>
      </div>
    </div></div>`;
  }

  /* ---------- Письмо ---------- */
  function pageEmail() {
    ensureOrders();
    const o = S.orders[0]; const s = SELLERS[o.sid]; const ex = S.flags.emailExists; const e = S.buyer.email; const conf = isConfirmed(o);
    return `<div class="wrap page"><div class="mail">
      <div class="mail-meta"><p class="sb">${conf ? `Заказ №${o.no} подтверждён, можно оплатить` : `Вы оформили заказ №${o.no}`}</p><p class="t12 c3">От: Свободный Рынок Миниатюр. Кому: ${esc(e)}</p></div>
      <div class="mail-body stack-16">
        <img src="assets/logo.png" alt="СРМ" height="32" style="height:32px">
        <h1 class="h2">${conf ? 'Заказ подтверждён' : 'Заказ оформлен'}</h1>
        <p>${esc(S.buyer.name)}, ${conf ? `продавец ${esc(s.name)} подтвердил заказ. Оплатите его в течение ${esc(s.payWait)}.` : `продавец ${esc(s.name)} подтвердит заказ до ${dateStr(new Date(o.deadline))}. Платить пока не нужно: когда он ответит, пришлём письмо с реквизитами.`}</p>
        <div class="mail-box stack-8">
          <p class="sb">Заказ №${o.no}</p>
          ${o.lines.map((l) => `<div class="sum-row"><span>${esc(byId(l.id).title)}, ${l.qty} шт.</span><span class="v">${fmt(byId(l.id).price * l.qty)}</span></div>`).join('')}
          <div class="sum-row"><span>${DELIVERY[o.dl].title}</span><span class="v">${o.delivery ? fmt(o.delivery) : 'бесплатно'}</span></div>
          <div class="sum-row sb"><span>Итого</span><span class="v">${fmt(o.total)}</span></div>
        </div>
        <div class="mail-box stack-4">
          <p class="sb">${ex ? 'Заказ в вашем аккаунте' : 'Мы создали для вас аккаунт'}</p>
          <p class="c2">${ex ? `Заказ добавлен в аккаунт ${esc(e)}. Войдите со своим паролем` : `Логин: ${esc(e)}. Пароль в письме «Регистрация». В аккаунте статус заказа, оплата и чек`}</p>
        </div>
        <button class="btn primary lg" data-act="soon" data-text="Кнопка ведёт на заказ в личном кабинете: следующий сценарий">${conf ? 'Оплатить заказ' : 'Открыть заказ'}</button>
        <p class="t12 c3">Вопросы к заказу задавайте продавцу в личном кабинете</p>
      </div>
      <p style="margin-top:12px"><a class="link" href="#/success">Вернуться к экрану заказа</a></p>
    </div></div>`;
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
    if (ui.filters) {
      const one = ui.fEdit;
      const head = one ? FTITLE[one] : 'Фильтры';
      const body = one ? fBody(one) : `${window.innerWidth < 768 ? `${fsec('sort', 'Сортировка', dd('sort', S.cat.sort, SORTS, { aria: 'Сортировка' }))}${fsec('per', 'Выводить по', perDd(true))}` : ''}${filtersHtml()}`;
      const foot = one ? `<button class="btn primary lg block" data-act="closeFilters">Показать ${catalogList().length}</button>` : `<button class="btn primary lg block" data-act="closeFilters">Показать ${catalogList().length}</button><div class="flt-ft2"><button class="btn ghost sm" data-act="resetCat">Сбросить</button><button class="btn secondary sm" data-act="saveSearch">${ic('save', 16)}Сохранить поиск</button></div>`;
      h += `<div class="scrim" data-act="closeFilters"><div class="modal" role="dialog" aria-label="${head}" data-stop><div class="modal-hd"><span class="h3">${head}</span><button class="icon-btn" data-act="closeFilters" aria-label="Закрыть">${ic('x')}</button></div><div class="modal-bd">${body}</div><div class="modal-ft flt-ft">${foot}</div></div></div>`;
    }
    if (ui.modal && ui.modal.login !== undefined) {
      const stub = 'data-act="soon" data-text="Вход разберём в сценарии покупки с аккаунтом"';
      h += `<div class="scrim" data-act="closeModal"><div class="modal" role="dialog" aria-label="Вход" data-stop><div class="modal-hd"><span class="h3">Вход</span><button class="icon-btn" data-act="closeModal" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="modal-bd stack-12">${ui.modal.login ? `<p class="c2">${esc(ui.modal.login)}</p>` : ''}<label class="fld"><span class="lbl">Email</span><input class="inp" type="email"></label><label class="fld"><span class="lbl">Пароль</span><input class="inp" type="password"></label>
        <button class="btn primary lg block" ${stub}>Войти</button>
        <a class="link" href="#/" data-act="soon" data-text="Восстановление пароля соберём с регистрацией">Забыли пароль?</a>
        <div class="row"><button class="btn secondary block" ${stub}>ВКонтакте</button><button class="btn secondary block" ${stub}>Яндекс ID</button></div></div></div></div>`;
    }
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
      const it = byId(route().id) || ITEMS[0];
      h += `<div class="lb" role="dialog" aria-label="Фото"><img src="${it.photos[ui.lb]}" alt="${esc(it.title)}"><button class="icon-btn" style="right:16px;top:16px" data-act="lbClose" aria-label="Закрыть">${ic('x', 24)}</button>
        ${it.photos.length > 1 ? `<button class="icon-btn" style="left:16px;top:50%" data-act="lbStep" data-d="-1" aria-label="Назад">${ic('left', 24)}</button><button class="icon-btn" style="right:16px;top:50%" data-act="lbStep" data-d="1" aria-label="Вперёд">${ic('right', 24)}</button>` : ''}</div>`;
    }
    if (ui.toast) h += `<div class="toast" role="status"><span class="body">${esc(ui.toast.text)}</span>${ui.toast.href ? `<a href="${ui.toast.href}">${esc(ui.toast.label)}</a>` : ''}${ui.toast.act ? `<button class="tl" data-act="${ui.toast.act}">${esc(ui.toast.label)}</button>` : ''}</div>`;
    ovEl.innerHTML = h;
    typo(ovEl);
    const nw = ovEl.querySelector('.modal-bd, .drawer-bd'); if (nw) nw.scrollTop = top;
    document.body.classList.toggle('lock', !!(ui.drawer || ui.filters || ui.modal || ui.lb !== null));
  }
  function toast(text, href, label, act) {
    ui.toast = { text, href, label, act }; overlay();
    clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; overlay(); }, act ? 6000 : 4000);
  }

  /* ---------- Рендер ---------- */
  const PAGES = { home: pageHome, catalog: pageCatalog, item: pageItem, cart: pageCart, checkout: pageCheckout, success: pageSuccess, email: pageEmail };
  function itemSticky(it) {
    if (S.flags.soldOut) return `<div class="sticky-bar"><div class="sum"><b>${fmt(it.price)}</b><span class="t12 c3">Нет в наличии</span></div><a class="btn secondary lg" href="#/catalog">Похожие товары</a></div>`;
    const c = inCart(it.id);
    return `<div class="sticky-bar"><div class="sum"><b>${fmt(it.price)}</b><span class="t12 c3">В наличии: ${it.stock} шт.</span></div>${favBtn(it, S.favs.includes(it.id))}${c ? `${qtyStep(it, c, 'lg')}<a class="icon-btn line lg" href="#/cart" aria-label="Перейти в корзину">${ic('cart', 20)}</a>` : `<button class="btn primary lg" data-act="add" data-id="${it.id}">В корзину</button>`}</div>`;
  }
  function render() {
    const r = route();
    if (r.name === 'item' && r.id) S.viewed = [r.id].concat(S.viewed.filter((x) => x !== r.id)).slice(0, 8);
    const page = (PAGES[r.name] || pageHome)(r);
    appEl.innerHTML = header(r) + `<main>${page}</main>` + footer(r);
    const hasSticky = (r.name === 'cart' && S.cart.length) || r.name === 'checkout' || r.name === 'item';
    if (r.name === 'item') appEl.insertAdjacentHTML('beforeend', itemSticky(byId(r.id) || ITEMS[0]));
    document.body.classList.toggle('has-sticky', !!hasSticky);
    document.body.classList.toggle('menu-open', !!ui.menu);
    document.body.classList.remove('searching');
    typo(appEl); overlay(); tick(); bindAfter(r); clampFit(); notify();
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
    if (parent !== window) parent.postMessage({ type: 'mfm-state', route: route().name, flags: S.flags, cart: S.cart.length, hasOrders: !!S.orders }, '*');
  }
  function tick() {
    document.querySelectorAll('[data-end]').forEach((e) => {
      const ms = +e.dataset.end - Date.now(); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
      e.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  function setNode(v) { S.cat.closed.cat = false; S.cat.node = v || null; S.cat.grp = null; S.cat.q = ''; ui.menu = false; ui.drawer = false; ui.dr = []; save(); go('#/catalog'); }
  const A = {
    menu() { if (window.innerWidth < 1024) { ui.drawer = true; ui.dr = []; overlay(); return; } ui.menu = !ui.menu; render(); },
    drawer() { ui.drawer = !ui.drawer; ui.dr = []; overlay(); },
    dr(el, ev) { ev.preventDefault(); ui.dr = ui.dr.concat(ui.dr.length ? el.dataset.v : +el.dataset.v); overlay(); },
    drBack() { ui.dr = ui.dr.slice(0, -1); overlay(); },
    mmMore(el) { ui.mmMore[el.dataset.k] = !ui.mmMore[el.dataset.k]; if (ui.drawer || ui.filters) overlay(); else if (ui.menu) repaintMenu(); else render(); },
    node(el, ev) { ev.preventDefault(); setNode(el.dataset.v || el.dataset.top); },
    nodef(el, ev) { ev.preventDefault(); S.cat.node = el.dataset.v || null; S.cat.grp = null; save(); if (ui.filters) overlay(); else render(); },
    nodeg(el, ev) { ev.preventDefault(); S.cat.node = el.dataset.top; S.cat.grp = el.dataset.v; save(); if (ui.filters) overlay(); else render(); },
    nodeq(el, ev) { ev.preventDefault(); closeSearch(); setNode(el.dataset.v); },
    filters() { ui.filters = true; overlay(); },
    closeFilters() { ui.filters = false; ui.fEdit = null; render(); },
    fEdit(el) {
      if (window.innerWidth >= 1024) return;
      const a = activeFilters()[+el.dataset.i];
      const k = a.k === 'f' ? a.g : a.k === 'node' ? 'cat' : a.k === 'price' ? 'price' : (a.k === 'city' || a.k === 'country') ? 'geo' : null;
      if (!k) return;
      ui.fEdit = k; ui.filters = true; overlay();
    },
    login() { ui.drawer = false; ui.modal = { login: '' }; overlay(); },
    loginFor(el) { ui.modal = { login: el.dataset.text }; overlay(); },
    closeModal() { ui.modal = null; overlay(); },
    report() { ui.modal = { report: true }; overlay(); },
    reportDo() { ui.modal = null; toast('Спасибо, модераторы проверят объявление'); },
    soon(el, ev) { ev.preventDefault(); ui.drawer = false; ui.modal = null; if (ui.menu) { ui.menu = false; render(); } toast(el.dataset.text); },
    tab(el, ev) { ev.preventDefault(); S.cat.tab = el.dataset.v; save(); go('#/catalog'); },
    comment(el) {
      const v = document.getElementById('cmText').value.trim(); if (!v) return;
      const id = el.dataset.id; const base = S.comments[id] || (id === 'strudd' ? COMMENTS.slice() : []);
      S.comments[id] = base.concat({ who: 'User1', date: 'Только что', text: v, replies: [] }); save(); render();
    },
    replyT(el) { const i = +el.dataset.i; ui.replyTo = ui.replyTo === i ? null : i; render(); },
    replySend(el) {
      const v = document.getElementById('cmReply').value.trim(); if (!v) return;
      const id = el.dataset.id; const i = +el.dataset.i;
      const list = JSON.parse(JSON.stringify(S.comments[id] || (id === 'strudd' ? COMMENTS : [])));
      list[i].replies = (list[i].replies || []).concat({ who: 'User1', date: 'Только что', text: v });
      S.comments[id] = list; ui.replyTo = null; save(); render();
    },
    certT() { ui.certOpen = !ui.certOpen; ui.certErr = ''; render(); },
    certGo() { const v = (document.getElementById('cert').value || '').trim().toUpperCase(); if (v === 'GIFT500') { S.co.cert = v; ui.certErr = ''; ui.certOpen = false; } else ui.certErr = v ? 'Сертификат не найден' : 'Введите код сертификата'; save(); render(); },
    addrOn(el) { S.co.addr = S.co.addr || {}; S.co.addr[el.dataset.s] = {}; save(); render(); },
    addrOff(el) { delete S.co.addr[el.dataset.s]; save(); render(); },
    certOff() { delete S.co.cert; save(); render(); },
    coNext() {
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
    homePop() { S.cat = Object.assign(DEFCAT(), { closed: S.cat.closed, sort: 'pop' }); save(); go('#/catalog'); },
    resetCat() { const closed = S.cat.closed; S.cat = Object.assign(DEFCAT(), { closed }); save(); if (ui.filters) overlay(); render(); },
    dropF(el) {
      const a = activeFilters()[+el.dataset.i]; const c = S.cat;
      if (a.k === 'node') c.node = null; if (a.k === 'q') c.q = ''; if (a.k === 'price') { c.min = ''; c.max = ''; } if (a.k === 'city') c.city = 'Все'; if (a.k === 'country') c.country = 'Все';
      if (a.k === 'f') c.f[a.g] = c.f[a.g].filter((x) => x !== a.v);
      save(); render();
    },
    fltT(el) { S.cat.closed[el.dataset.k] = !fClosed(el.dataset.k); save(); if (ui.filters) overlay(); else render(); },
    saveSearch() { ui.filters = false; ui.modal = { login: 'Войдите, чтобы сохранить поиск: он появится в избранном, а новые объявления по нему придут в уведомления' }; overlay(); },
    fav(el, ev) { ev.preventDefault(); const id = el.dataset.id; const i = S.favs.indexOf(id); if (i >= 0) S.favs.splice(i, 1); else S.favs.push(id); save(); render(); },
    homeTab(el) { ui.homeTab = el.dataset.v; render(); },
    foot(el) { ui.footOpen[el.dataset.k] = !ui.footOpen[el.dataset.k]; render(); },
    toTop() { window.scrollTo(0, 0); },
    photo(el) { setPhoto(+el.dataset.i); },
    photoStep(el) { const n = byId(route().id).photos.length; setPhoto((ui.photo + (+el.dataset.d) + n) % n); },
    lb(el) { ui.lb = +el.dataset.i; overlay(); },
    lbClose() { ui.lb = null; overlay(); },
    lbStep(el) { const n = byId(route().id).photos.length; ui.lb = (ui.lb + (+el.dataset.d) + n) % n; overlay(); },
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
    close(el) { const k = el.dataset.k; ui.opened[k] = false; if (k[0] === 'c') delete S.co.comment[el.dataset.s]; ui.promoErr[el.dataset.s] = ''; save(); render(); },
    city(el) { S.co.city = S.co.cityTxt = el.dataset.v; ui.cityOpen = false; resetBadDl(); save(); render(); },
    pvz(el, ev) { ev.preventDefault(); ui.modal = { pvz: el.dataset.s }; overlay(); },
    pvzPick(el) { S.co.pvz[el.dataset.s] = el.dataset.v; ui.modal = null; save(); render(); },
    promo(el) {
      const sid = el.dataset.s; const v = (document.getElementById('promo-' + sid).value || '').trim().toUpperCase();
      if (v === 'MINI10') { S.co.promo[sid] = v; ui.promoErr[sid] = ''; } else ui.promoErr[sid] = v ? 'Промокод не найден' : 'Введите промокод';
      save(); render();
    },
    promoOff(el) { delete S.co.promo[el.dataset.s]; ui.opened['p' + el.dataset.s] = false; save(); render(); },
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
    if (opt) { const id = opt.closest('[data-dd]').dataset.dd; DD[id](opt.dataset.ddVal); save(); closeDD(); if (ui.filters || ui.drawer) overlay(); else render(); return; }
    if (t.closest('[data-dd-search]')) return;
    closeDD();
    const el = t.closest('[data-act]');
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
    if (t.dataset.actChg === 'line') { inCart(t.dataset.id).on = t.checked; save(); render(); return; }
    if (t.dataset.actChg === 'all') { S.cart.forEach((c) => { c.on = t.checked; }); save(); render(); return; }
    if (t.dataset.actChg === 'dl') { S.co.dl[t.dataset.s] = t.value; save(); render(); return; }
    if (t.dataset.actChg === 'pay') { S.co.pay[t.dataset.s] = t.value; save(); render(); return; }
    if (t.dataset.actChg === 'flt') {
      const g = t.dataset.g; const cur = S.cat.f[g] || []; S.cat.f[g] = t.checked ? cur.concat(t.value) : cur.filter((x) => x !== t.value);
      save(); if (ui.filters) overlay(); else render(); return;
    }
    if (t.dataset.cat) { S.cat[t.dataset.cat] = t.value.replace(/\D/g, ''); save(); if (ui.filters) overlay(); else render(); }
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
    const old = box.querySelector('.err-t, .hint'); if (old) old.remove();
    if (err) box.insertAdjacentHTML('beforeend', `<span class="err-t">${err}</span>`); else if (f.hint) box.insertAdjacentHTML('beforeend', `<span class="hint">${f.hint}</span>`);
    typo(box);
  }
  document.addEventListener('input', (ev) => {
    const t = ev.target;
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
    if (t.dataset.addr) { S.co.addr[t.dataset.addr][t.dataset.k] = t.value; save(); return; }
    if (t.dataset.coComment) { S.co.comment[t.dataset.coComment] = t.value; save(); return; }
    if (t.name && FIELD[t.name]) {
      if (t.name === 'phone') t.value = phoneMask(t.value);
      S.form[t.name] = t.value; save();
      if (ui.touched[t.name] || ui.submitted) refreshField(t.name, t);
    }
  });
  document.addEventListener('focusin', (ev) => {
    const t = ev.target;
    if (t.id === 'city') { ui.cityOpen = true; document.getElementById('cityList').innerHTML = cityList(t.value); }
    if (t.name === 'q' && t.closest('[data-form=search]')) { t.placeholder = 'Поиск по объявлениям'; openSearch(t.closest('form'), false); }
  });
  document.addEventListener('focusout', (ev) => {
    const t = ev.target;
    if (t.name && FIELD[t.name]) { ui.touched[t.name] = true; refreshField(t.name, t); }
    if (t.id === 'city') ui.touched.city = true;
  });
  document.addEventListener('submit', (ev) => {
    const f = ev.target; if (f.dataset.form !== 'search') return;
    ev.preventDefault(); S.cat.q = f.q.value.trim(); S.cat.node = null; closeSearch(); save(); go('#/catalog');
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { closeDD(); closeSearch(); ui.modal = null; ui.filters = false; ui.drawer = false; ui.lb = null; if (ui.menu) { ui.menu = false; render(); } else overlay(); }
  });
  document.addEventListener('error', (ev) => {
    const t = ev.target;
    if (t.tagName === 'IMG' && !t.dataset.broken) {
      t.dataset.broken = '1';
      t.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ededef"/></svg>');
    }
  }, true);

  window.addEventListener('hashchange', () => {
    ui.menu = false; ui.drawer = false; ui.toast = null; ui.photo = 0; ui.tab = 'desc'; ui.descOpen = false; ui.qty = 1; ui.lb = null; ui.crumbs = false; ui.revSort = 'new';
    if (route().name === 'checkout') { S.notice = null; ui.coStep = 1; }
    if (route().name === 'catalog') S.cat.closed.cat = false;
    window.scrollTo(0, 0); render();
  });

  /* Команды панели проверки */
  window.addEventListener('message', (ev) => {
    const m = ev.data || {};
    if (m.type === 'mfm-go') {
      if (m.hash === '#/checkout' && !S.cart.length) preset('one');
      go(m.hash);
    }
    if (m.type === 'mfm-preset') { preset(m.name); save(); render(); }
    if (m.type === 'mfm-flag') {
      S.flags[m.key] = m.value;
      if (m.key === 'itemOut' && m.value && !S.cart.some((c) => c.id === 'trukk')) S.cart.push({ id: 'trukk', qty: 1, on: true });
      if (m.key === 'partial' && m.value) { const c = inCart('strudd'); if (c) c.qty = Math.max(c.qty, 2); else S.cart.push({ id: 'strudd', qty: 2, on: true }); }
      if (m.key === 'minSum' && m.value) S.cart = [{ id: 'lutazy', qty: 1, on: true }];
      if (m.key === 'fail') { S.banner = null; S.co.surcharge = null; }
      save(); render();
    }
    if (m.type === 'mfm-fill') { if (!S.cart.length) preset('one'); fillForm(); ui.submitted = false; save(); render(); }
    if (m.type === 'mfm-empty-submit') { S.form = {}; S.co = DEF().co; save(); render(); setTimeout(submit, 0); }
    if (m.type === 'mfm-reset') { S = DEF(); save(); Object.assign(ui, { submitted: false, touched: {}, opened: {} }); go('#/'); render(); }
  });

  S.cat.closed.cat = false;
  render();
})();
