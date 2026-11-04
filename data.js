/* Данные прототипа. Лоты, продавцы, сроки и отзывы взяты с minifreemarket.com 04.11.2026.
   Примерные значения помечены комментарием «пример». */
(function () {
  const IMG = 'https://minifreemarket.com/upload/thumbs/catalog/';
  const full = (p) => IMG + 'full/' + p;
  const thumb = (p) => IMG + 'thumb/' + p;
  const auc = (p) => IMG + 'auction_thumb/' + p;

  const DELIVERY = {
    pickup: { title: 'Самовывоз', price: 0, needs: 'none', note: 'Договоритесь с продавцом о месте и времени' },
    tk: { title: 'Транспортная компания', price: 350, needs: 'address', note: 'Нужен адрес. Компанию уточнит продавец' },
    post: { title: 'Почта России', price: 350, needs: 'address', note: 'Нужны адрес и индекс' },
    cdek: { title: 'СДЭК', price: 320, needs: 'pvz', note: 'Пункт выдачи выбираете на карте' }, // цена — пример
    yd: { title: 'Яндекс Доставка', price: 290, needs: 'pvz', note: 'Пункт выдачи выбираете на карте' }, // цена — пример
    ozon: { title: 'Ozon', price: 350, needs: 'pvz', note: 'Пункт выдачи выбираете на карте' },
  };

  const PAYWAY = {
    card: { title: 'Перевод на карту', note: 'Реквизиты появятся после подтверждения заказа', icon: 'card' },
    cash: { title: 'Наличными', note: 'При самовывозе, продавцу при встрече', icon: 'cash' },
  };

  const SELLERS = {
    pocket: { name: 'PocketSized Prints', pro: true, rank: 36, rating: 4.97, reviews: 388, pos: 385, neg: 3, city: 'Уфа', stazh: '3 года', payWait: '3 дня', shipWait: '15 дней', late: 13, deliveries: ['pickup', 'tk', 'post', 'yd'], pay: ['card', 'cash'], autoConfirm: true },
    tema: { name: 'Tema1992', pro: false, rating: 5.0, reviews: 1, pos: 1, neg: 0, city: 'Владимир', stazh: '6 лет', done: 3, payWait: '3 дня', shipWait: '10 дней', late: 0, deliveries: ['pickup', 'tk', 'post', 'yd'], pay: ['card', 'cash'], minSum: 2000 /* пример */ },
    baphomet: { name: 'Baphomet', pro: true, rating: 4.93, reviews: 111, pos: 108, neg: 3, city: 'Санкт-Петербург', stazh: '7 лет', done: 308, payWait: '3 дня', shipWait: '5 дней', late: 0, deliveries: ['post', 'yd'], pay: ['card'] },
    richard: { name: 'RichardZamok', pro: false, rating: 0, reviews: 0, pos: 0, neg: 0, city: 'Москва', stazh: '14 дней', done: 0, payWait: '3 дня', shipWait: '10 дней', late: 0, deliveries: ['pickup', 'post', 'cdek'], pay: ['card'] },
    psiblade: { name: 'psiblad3_art', pro: false, rating: 5.0, reviews: 1, pos: 1, neg: 0, city: 'Екатеринбург', stazh: '3 года', done: 2, payWait: '3 дня', shipWait: '3 дня', late: 0, deliveries: ['pickup', 'tk', 'post', 'yd'], pay: ['card', 'cash'] },
    wolf: { name: 'Wolf', pro: false, rating: 5.0, reviews: 4, pos: 4, neg: 0, city: 'Краснодар', stazh: '6 лет', done: 10, payWait: '3 дня', shipWait: '30 дней', late: 0, deliveries: ['pickup', 'tk', 'yd'], pay: ['card', 'cash'] },
    mekboy: { name: 'Mekboy Workshop', pro: true, rank: 83, rating: 4.71, reviews: 21, pos: 19, neg: 2, city: 'Краснодар', stazh: '1 год', done: 74, payWait: '3 дня', shipWait: '30 дней', late: 0, deliveries: ['pickup', 'tk', 'cdek', 'ozon'], pay: ['card', 'cash'], freeFrom: 5000 },
    harvest: { safe: true, name: 'Harvest', pro: false, rank: 140, rating: 5.0, reviews: 53, pos: 53, neg: 0, city: 'Иркутск', stazh: '8 месяцев', done: 176, payWait: '3 дня', shipWait: '10 дней', late: 0, deliveries: ['pickup', 'post', 'cdek'], pay: ['card', 'cash'] },
    krsk: { name: 'krsk.M', pro: false, rank: 443, rating: 5.0, reviews: 9, pos: 9, neg: 0, city: 'Красноярск', stazh: '6 лет', done: 17, payWait: '1 день', shipWait: '5 дней', late: 0, deliveries: ['pickup', 'post'], pay: ['card'] },
    lexx: { name: 'LexxGreen', pro: true, rank: 56, rating: 4.87, reviews: 283, pos: 273, neg: 10, city: 'Краснодар', stazh: '5 лет', payWait: '2 дня', shipWait: '30 дней', late: 0, deliveries: ['pickup', 'tk', 'yd', 'ozon'], pay: ['card', 'cash'] },
    igc: { name: 'IGC', pro: true, rank: 816, rating: 4.76, reviews: 34, pos: 32, neg: 2, city: 'Самара', stazh: '2 года', done: 90, payWait: '3 дня', shipWait: '60 дней', late: 0, deliveries: ['tk', 'cdek', 'yd'], pay: ['card', 'cash'] },
  };

  const WH = ['Варгеймы', 'Warhammer 40.000'];
  const ITEMS = [
    {
      id: 'strudd', title: 'Strudd Panzermensh', seller: 'pocket', price: 2250, stock: 100, top: 'Ролевые игры', cat: 'Миниатюры для ролевых игр', crumbs: ['Ролевые игры', 'Миниатюры для ролевых игр'],
      img: thumb('3/3/9/5/1-jpg37_4.12790438.webp'),
      photos: [full('3/3/9/5/1-jpg37_4.12790438.webp'), full('1/4/7/e/3-jpg27_2.05381980.webp'), full('9/a/3/3/4-jpg12_8.58884002.webp')],
      specs: [['Состояние модели', 'снят с литников'], ['Материал', '3д печать'], ['Комплектация', 'модель или отряд']],
      desc: ['1 миниатюра в 32-ом масштабе с базой. Высота 100 мм.', 'Миниатюры изготовлены методом фотополимерной 3D-печати на 16K принтере с толщиной слоя 0,02 мм. Перед отправкой детали очищаются от смолы и поддержек, дополнительно засвечиваются.', 'Миниатюры поставляются в сером цвете, в разобранном и неокрашенном виде. Для сборки потребуется суперклей.'],
      added: '04.11.2026',
    },
    {
      id: 'trukk', title: 'Trukk', seller: 'tema', price: 1400, stock: 1, top: 'Варгеймы', cat: 'Orks', crumbs: [...WH, 'Orks'],
      img: thumb('4/0/d/6/1000025890_0.55500848.webp'),
      photos: [full('4/0/d/6/1000025890_0.55500848.webp'), full('7/7/6/3/1000025889_7.87539188.webp'), full('b/1/8/8/1000025887_9.62822657.webp'), full('3/a/b/e/1000025888_3.63854475.webp'), full('6/b/d/6/1000025886_4.84754378.webp')],
      specs: [['Оригинальность', 'литье'], ['Состояние модели', 'в грунте'], ['Материал', 'смола, литьевой пластик'], ['Комплектация', 'модель или отряд']],
      desc: ['Орочий трук. Литье. Небольшая конверсия, на фото все видно.'], added: '04.11.2026',
    },
    {
      id: 'zeratul', title: 'Zeratul Promo', seller: 'baphomet', price: 10990, stock: 1, top: 'Варгеймы', cat: 'StarCraft', crumbs: ['Варгеймы', 'StarCraft'],
      img: thumb('3/9/8/e/img-1434_1.33221477.webp'), photos: [full('3/9/8/e/img-1434_1.33221477.webp')],
      specs: [['Оригинальность', 'оригинал'], ['Состояние модели', 'в упаковке'], ['Материал', 'пластик'], ['Комплектация', 'модель или отряд']],
      desc: ['Новый, в плёнке.', 'Самовывоза нет. Со СДЭК и Ozon не работаю. Почта или Яндекс.'], added: '01.11.2026', noComments: true,
    },
    {
      id: 'worldeaters', title: 'World Eaters Battleforce: Gorestorm Slaughterpack', seller: 'richard', price: 25000, stock: 1, top: 'Варгеймы', cat: 'World Eaters', crumbs: [...WH, 'World Eaters'],
      img: thumb('0/8/9/2/1000019741_0.95020985.webp'), photos: [IMG + 'medium/0/8/9/2/1000019741_0.95020985.webp', IMG + 'dop/1/c/2/9/1000019748_1.16771964.webp'],
      specs: [['Оригинальность', 'оригинал'], ['Состояние модели', 'в упаковке'], ['Материал', 'пластик'], ['Комплектация', 'модель или отряд']],
      desc: ['Оригинальный набор Пожирателей Миров. Упаковка запечатана и готова к отправке в любой город страны.'], added: '28.10.2026',
    },
    { id: 'warriors', title: 'Necron Warriors (x20)', seller: 'psiblade', price: 2250, stock: 1, top: 'Варгеймы', cat: 'Necrons', crumbs: [...WH, 'Necrons'], img: full('2/c/2/4/6bf0mh6dfskehz7upaen2rs-jwwy6igxqp8cjod0mozeq3tmb0q2ync64jp7fdxrjer4ia-uteq1lkshdrrjv4qa_7.00350147.webp'), photos: [full('2/c/2/4/6bf0mh6dfskehz7upaen2rs-jwwy6igxqp8cjod0mozeq3tmb0q2ync64jp7fdxrjer4ia-uteq1lkshdrrjv4qa_7.00350147.webp'), full('6/d/8/6/4pbf8hro71vkclwbzw6htpgtok0lcyiisg9sfjpra0yapw0eiajgskxbyzvwygrmgp9v-mvmqq53rgmhbn4-5pj0_5.99454233.webp')], specs: [['Оригинальность', 'оригинал'], ['Состояние модели', 'снят с литников'], ['Материал', 'пластик']], desc: ['Описание продавца.'], added: '03.11.2026' },
    { id: 'skorpekh', title: 'Skorpekh Lord', seller: 'psiblade', price: 3000, stock: 1, top: 'Варгеймы', cat: 'Necrons', crumbs: [...WH, 'Necrons'], img: thumb('c/f/2/9/d1_4.46053326.webp'), photos: [full('c/f/2/9/d1_4.46053326.webp')], specs: [['Оригинальность', 'оригинал'], ['Состояние модели', 'покрашена'], ['Материал', 'пластик']], desc: ['Описание продавца.'], added: '03.11.2026' },
    { id: 'lutazy', title: 'Лутазы', seller: 'tema', price: 800, stock: 1, top: 'Варгеймы', cat: 'Orks', crumbs: [...WH, 'Orks'], img: thumb('1/1/8/d/1000025884_7.36027174.webp'), photos: [full('1/1/8/d/1000025884_7.36027174.webp')], specs: [['Оригинальность', 'оригинал'], ['Состояние модели', 'начата покраска'], ['Материал', 'пластик']], desc: ['Описание продавца.'], added: '04.11.2026' },
    { id: 'terminators', title: 'Wolf Guard Terminators 20 + 3 героя', seller: 'wolf', price: 6000, stock: 1, top: 'Варгеймы', cat: 'Adeptus Astartes: Space Wolves', crumbs: [...WH, 'Adeptus Astartes: Space Wolves'], img: thumb('8/d/6/8/b5ou2t1ypdy46tom6oizflr4dcua6sccclewr6o3wscmujoz0crbjxt99plh1m4xarijwazgs2ajpfszouhji1nm_4.74737492.webp'), photos: [full('8/d/6/8/b5ou2t1ypdy46tom6oizflr4dcua6sccclewr6o3wscmujoz0crbjxt99plh1m4xarijwazgs2ajpfszouhji1nm_4.74737492.webp')], specs: [['Оригинальность', 'прочее'], ['Состояние модели', 'покрашена'], ['Материал', 'различные материалы']], desc: ['Описание продавца.'], added: '02.11.2026' },
    { id: 'brutalis', title: 'Brutalis Dreadnought', seller: 'wolf', price: 1100, stock: 1, top: 'Варгеймы', cat: 'Adeptus Astartes: Space Wolves', crumbs: [...WH, 'Adeptus Astartes: Space Wolves'], img: thumb('5/7/6/c/tqbx7xhmdy3nimn0wzk9xdqscybq5ajrlfis-urwnxrzwqxcf4d3-bjqzvcndnwsd29haysexcocgyruk-oi9v1g_1.19663690.webp'), photos: [full('5/7/6/c/tqbx7xhmdy3nimn0wzk9xdqscybq5ajrlfis-urwnxrzwqxcf4d3-bjqzvcndnwsd29haysexcocgyruk-oi9v1g_1.19663690.webp')], specs: [['Оригинальность', '3д печать'], ['Состояние модели', 'покрашена'], ['Материал', '3д печать']], desc: ['Описание продавца.'], added: '02.11.2026' },
    { id: 'darkshroud', title: 'Land Speeder Vengeance / Ravenwing Darkshroud 1 модель', seller: 'mekboy', price: 2460, stock: 99, top: 'Варгеймы', cat: 'Adeptus Astartes: Dark Angels', crumbs: [...WH, 'Adeptus Astartes: Dark Angels'], img: thumb('c/6/7/d/vengeance_3.94839028.webp'), photos: [full('c/6/7/d/vengeance_3.94839028.webp'), full('5/3/e/7/m2860336a-99120101098-darkshroud01-873x627_0.13735313.webp')], specs: [['Оригинальность', '3д печать'], ['Состояние модели', 'снят с литников'], ['Материал', '3д печать']], desc: ['Описание продавца.'], added: '01.11.2026' },
    { id: 'yucatan', title: 'Yucatan', seller: 'harvest', price: 7000, stock: 1, top: 'Настольные игры', cat: 'Кооперативные игры', crumbs: ['Настольные игры', 'Кооперативные игры'], img: thumb('c/d/1/5/bosyzurruaio7ngyi9uenp7-y0ehd-m7kdqtjyh-zd-pclia2cz2e42ld1r3sjhktezoccizgs4bikgtj9htmeij_8.69240796.webp'), photos: [full('c/d/1/5/bosyzurruaio7ngyi9uenp7-y0ehd-m7kdqtjyh-zd-pclia2cz2e42ld1r3sjhktezoccizgs4bikgtj9htmeij_8.69240796.webp')], specs: [], desc: ['Описание продавца.'], added: '31.10.2026' },
    { id: 'arkham', title: 'Ужас Аркхэма. Карточная игра', seller: 'krsk', price: 2300, stock: 1, top: 'Настольные игры', cat: 'Карточные игры', crumbs: ['Настольные игры', 'Карточные игры'], img: thumb('1/4/0/2/20_5.42377860.webp'), photos: [full('1/4/0/2/20_5.42377860.webp')], specs: [], desc: ['Описание продавца.'], added: '30.10.2026' },
    { id: 'zombicide', title: 'Зомбицид. Zombicide. 1 редакция. ENG', seller: 'krsk', price: 5500, stock: 1, top: 'Настольные игры', cat: 'Кооперативные игры', crumbs: ['Настольные игры', 'Кооперативные игры'], img: thumb('e/6/1/7/zombicide-1e_1.25744049.webp'), photos: [full('e/6/1/7/zombicide-1e_1.25744049.webp')], specs: [], desc: ['Описание продавца.'], added: '30.10.2026' },
    { id: 'assassins', title: 'Assassins set', seller: 'pocket', price: 800, stock: 100, top: 'Ролевые игры', cat: 'Миниатюры для ролевых игр', crumbs: ['Ролевые игры', 'Миниатюры для ролевых игр'], img: thumb('5/2/2/9/1-jpg32_2.95919589.webp'), photos: [full('5/2/2/9/1-jpg32_2.95919589.webp')], specs: [['Состояние модели', 'снят с литников'], ['Материал', '3д печать']], desc: ['Описание продавца.'], added: '04.11.2026' },
    { id: 'prisoners', title: 'Prisoners', seller: 'pocket', price: 750, stock: 100, top: 'Ролевые игры', cat: 'Миниатюры для ролевых игр', crumbs: ['Ролевые игры', 'Миниатюры для ролевых игр'], img: thumb('0/c/7/3/1-jpg30_7.97220365.webp'), photos: [full('0/c/7/3/1-jpg30_7.97220365.webp'), full('b/b/3/7/4-jpg8_1.51487377.webp'), full('b/9/2/9/2-jpg23_2.26884627.webp')], specs: [['Состояние модели', 'снят с литников'], ['Материал', '3д печать']], desc: ['Описание продавца.'], added: '04.11.2026' },
  ];

  const AUCTIONS = [
    { id: 'a-leman', title: '2 Leman Russ Vostroyan alt', seller: 'igc', cat: 'Astra Militarum', top: 'Варгеймы', price: 900, bids: 10, hours: 22.1, img: auc('8/4/3/1/41_5.25397493.webp') },
    { id: 'a-guilliman', title: 'Roboute Guilliman', seller: 'lexx', cat: 'Adeptus Astartes: Space Marines', top: 'Варгеймы', price: 350, bids: 6, hours: 31.1, img: auc('e/9/3/5/image-3223592_4.54385967.webp') },
    { id: 'a-redemptor', title: 'Primaris Redemptor Dreadnought', seller: 'lexx', cat: 'Adeptus Astartes: Space Marines', top: 'Варгеймы', price: 650, bids: 5, hours: 31.1, img: auc('7/1/3/9/image-2631499_7.36801893.webp') },
    { id: 'a-deathwatch', title: 'Deathwatch Veterans х5', seller: 'lexx', cat: 'Adeptus Astartes: Deathwatch', top: 'Варгеймы', price: 450, bids: 0, hours: 31.1, img: auc('6/6/e/6/image-3204325_3.94116498.webp') },
  ];

  const REVIEWS = {
    pocket: [
      { who: 'Fu_Ra', date: '31 октября 2026', good: true, text: 'Лучшая печать что я видел, плюс небольшой подарок. Однозначно буду заказывать еще' },
      { who: 'GriinWan', date: '19 октября 2026', good: true, text: 'Всё хорошо. Спасибо за бонус)' },
      { who: 'khornybek', date: '19 октября 2026', good: false, text: 'Отправили миниатюру Luna в альтернативном варианте, не как в карточке товара. В остальном ок.' },
      { who: 'User60479', date: '08 октября 2026', good: true, text: 'Миниатюры качественные. Пять звёзд!' },
    ],
    tema: [{ who: 'amatveev', date: '23 сентября 2023', good: true, text: 'Хорошая упаковка и полный восторг от моделей) Благодарю вас!' }],
    baphomet: [
      { who: 'Red Ember', date: '29 октября 2026', good: true, text: 'Все хорошо' },
      { who: 'Ragnar101', date: '21 августа 2026', good: true, text: 'Быстро отправил, пришло всё в целости и сохранности' },
    ],
  };

  const CATEGORIES = ['Варгеймы', 'Стендовые модели', 'Все для моделирования', 'Настольные игры', 'Ролевые игры', 'Экшен-фигурки', 'Коллекционные карточные игры', 'LEGO', 'Литература', 'Печать 3D миниатюр', 'Услуги'];

  const TAGS = ['#28_мм', '#3d_печать', '#32_мм', '#adepta_sororitas', '#10th_edition', '#30k', '#accessories', '#army', '#bits', '#boss', '#boyz', '#bunker', '#games', '#gretchin', '#grimdark', '#miniature'];

  const SELLER_TYPES = ['Пользователь', 'Магазин', 'Розничные магазины', 'Мастерская авторских миниатюр', 'Мастерская аксессуаров', 'Литейные', 'Студии 3д печати'];

  const CITIES = ['Москва', 'Санкт-Петербург', 'Уфа', 'Владимир', 'Екатеринбург', 'Краснодар', 'Самара', 'Казань', 'Новосибирск', 'Нижний Новгород', 'Иркутск', 'Красноярск'];

  const PVZ = [ // адреса — пример
    { id: 'p1', name: 'Пункт выдачи на ул. Ленина, 12', hours: 'Ежедневно 10:00–21:00' },
    { id: 'p2', name: 'Пункт выдачи на пр. Мира, 48', hours: 'Пн–сб 09:00–20:00' },
    { id: 'p3', name: 'Постамат в ТЦ «Галерея»', hours: 'Круглосуточно' },
  ];

  window.MFM = { DELIVERY, PAYWAY, SELLERS, ITEMS, AUCTIONS, REVIEWS, CATEGORIES, TAGS, SELLER_TYPES, CITIES, PVZ };
})();
