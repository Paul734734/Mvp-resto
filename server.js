require('dotenv').config();
const bcrypt = require('bcryptjs');
/* Serveur back-office — Chez Junior Fast Food MVP
   Express + stockage JSON simple. Port 8000. */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 8001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_HASH = process.env.ADMIN_HASH;
if (!ADMIN_HASH) { console.error('ADMIN_HASH manquant dans .env'); process.exit(1); }
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_HASH + (process.env.SESSION_SECRET || '') + '::chezjunior').digest('hex');

const DEFAULT_SETTINGS = {
  restaurantName: 'Chez Junior',
  restaurantType: 'Fast Food',
  whatsappNumber: '237699000000',
  address: 'Carrefour Odza, face station Total — Yaoundé',
  hours: 'Lun – Dim · 10h00 – 23h30',
  delivery: 'Yaoundé centre & environs · 500 – 1 000 F selon le quartier',
  rating: '4,8/5',
  reviews: '320',
  deliveryTime: '25 min',
};

const DEFAULT_DISHES = [
  { id: 'cheeseburger', cat: 'burgers', name: 'Cheeseburger', desc: 'Pain brioché, steak de bœuf grillé, cheddar fondu, crudités, sauce maison.', price: 1500, img: 'assets/burger.jpg', tag: 'Best-seller', available: true },
  { id: 'double-cheese', cat: 'burgers', name: 'Double cheese', desc: 'Deux steaks, double cheddar, oignons caramélisés, sauce barbecue.', price: 2500, img: '', tag: '', available: true },
  { id: 'chicken-burger', cat: 'burgers', name: 'Chicken burger', desc: 'Filet de poulet pané croustillant, salade, sauce blanche aux herbes.', price: 1800, img: '', tag: '', available: true },
  { id: 'shawarma-poulet', cat: 'shawarmas', name: 'Shawarma poulet', desc: 'Poulet mariné grillé, galette toastée, crudités, sauce ail maison.', price: 1500, img: 'assets/shawarma.jpg', tag: 'Fait maison', available: true },
  { id: 'shawarma-mixte', cat: 'shawarmas', name: 'Shawarma mixte', desc: 'Poulet et bœuf grillés, double sauce, portion généreuse.', price: 2000, img: '', tag: '', available: true },
  { id: 'poulet-frit-2', cat: 'poulet-frit', name: 'Poulet frit (2 pcs) + frites', desc: 'Morceaux marinés 12h, panure croustillante, servi avec frites et sauce.', price: 2500, img: 'assets/poulet-frit.jpg', tag: '', available: true },
  { id: 'bucket-8', cat: 'poulet-frit', name: 'Bucket familial (8 pcs)', desc: '8 morceaux de poulet frit, 2 grandes frites, 4 sauces offertes.', price: 8000, img: '', tag: 'À partager', available: true },
  { id: 'nuggets', cat: 'poulet-frit', name: 'Nuggets (6 pcs)', desc: 'Nuggets de poulet croustillants, sauce au choix : tomate, ail ou piquante.', price: 1500, img: 'assets/nuggets.jpg', tag: '', available: true },
  { id: 'pizza-royale', cat: 'pizzas', name: 'Pizza royale (1 part)', desc: 'Pâte fine, mozzarella, pepperoni, champignons, poivrons.', price: 1800, img: 'assets/pizza.jpg', tag: '', available: true },
  { id: 'pizza-entiere', cat: 'pizzas', name: 'Pizza moyenne (entière)', desc: '6 parts, garniture au choix : royale, marguerite, poulet fromage.', price: 6000, img: '', tag: '', available: true },
  { id: 'panini-poulet', cat: 'sandwichs', name: 'Panini poulet', desc: 'Pain panini grillé, poulet, emmental, crudités.', price: 1200, img: '', tag: '', available: true },
  { id: 'tacos-poulet', cat: 'sandwichs', name: 'Tacos poulet', desc: 'Galette garnie, poulet, frites, fromage fondu, sauce algérienne.', price: 2000, img: '', tag: '', available: true },
  { id: 'frites', cat: 'accompagnements', name: 'Frites maison', desc: 'Frites croustillantes, sauce tomate ou mayonnaise.', price: 1000, img: 'assets/frites.jpg', tag: '', available: true },
  { id: 'alloco', cat: 'accompagnements', name: 'Alloco (plantains frits)', desc: 'Plantains mûrs dorés, servi avec sauce piquante à l\u2019oignon.', price: 1000, img: 'assets/plantains.jpg', tag: '', available: true },
  { id: 'bissap', cat: 'boissons', name: 'Jus de bissap frais', desc: 'Infusion d\u2019hibiscus glacée, préparée le matin même.', price: 500, img: 'assets/bissap.webp', tag: '', available: true },
  { id: 'soda', cat: 'boissons', name: 'Soda 33 cl', desc: 'Bien frais, servi avec glaçons.', price: 400, img: '', tag: '', available: true },
  { id: 'milkshake', cat: 'boissons', name: 'Milkshake chocolat', desc: 'Lait frais, glace vanille, copeaux de chocolat.', price: 1500, img: 'assets/milkshake.webp', tag: '', available: true },
  { id: 'eau', cat: 'boissons', name: 'Eau minérale 1,5 L', desc: 'Eau de source en bouteille.', price: 300, img: '', tag: '', available: true },
];

const CATEGORY_LABELS = {
  burgers: 'Burgers',
  shawarmas: 'Shawarmas',
  'poulet-frit': 'Poulet frit',
  pizzas: 'Pizzas',
  sandwichs: 'Sandwichs',
  accompagnements: 'Accompagnements',
  boissons: 'Boissons',
};

function loadDb() {
  if (fs.existsSync(DATA_FILE)) {
    const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!existing.orders) existing.orders = [];
    return existing;
  }
  // Version pilote réel : base vide, aucune donnée de démonstration.
  // (Pour régénérer un jeu de démo : DEMO_SEED=1 node server.js)
  const db = { settings: DEFAULT_SETTINGS, dishes: DEFAULT_DISHES, orders: [] };
  if (process.env.DEMO_SEED === '1') db.orders = seedOrders(db.dishes);
  saveDb(db);
  return db;
}

function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db, null, 2)); fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
}

const db = loadDb();
const app = express();
const _path = require('path');
const FRONT_FILES = ['index.html', 'app.js', 'admin.js', 'style.css', 'base.css'];
app.get('/', (req, res) => res.sendFile(_path.join(__dirname, 'index.html')));
FRONT_FILES.forEach((f) => app.get('/' + f, (req, res) => res.sendFile(_path.join(__dirname, f))));
app.use('/assets', express.static(_path.join(__dirname, 'assets'), { dotfiles: 'ignore' }));
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives, réessayez dans 15 minutes.' } }));
app.use('/api/orders', rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de commandes, réessayez dans une minute.' } }));
app.use(express.json({ limit: '10mb' }));

// Autorise le site statique local pendant les tests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function requireAdmin(req, res, next) {
  if (req.header('X-Admin-Token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

/* ---------- Commandes ---------- */

const ORDER_STATUSES = ['nouvelle', 'preparation', 'prete', 'livree', 'annulee'];

function nextOrderId(orders) {
  const n = orders.reduce((max, o) => {
    const m = /^C-(\d+)$/.exec(o.id);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return 'C-' + String(n + 1).padStart(4, '0');
}

function makeOrder(db, payload) {
  const items = (payload.items || [])
    .filter((it) => it && typeof it.name === 'string' && it.qty > 0 && it.price >= 0)
    .map((it) => ({ name: it.name, qty: Math.round(it.qty), price: Math.round(it.price) }));
  if (items.length === 0) return null;
  const order = {
    id: nextOrderId(db.orders),
    createdAt: Date.now(),
    status: 'nouvelle',
    customer: String(payload.customer || '').trim() || 'Client',
    mode: payload.mode === 'Retrait sur place' ? 'Retrait sur place' : 'Livraison',
    note: String(payload.note || '').trim(),
    items,
    total: items.reduce((sum, it) => sum + it.price * it.qty, 0),
  };
  return order;
}

app.post('/api/orders', (req, res) => {
  const order = makeOrder(db, req.body || {});
  if (!order) return res.status(400).json({ error: 'Commande invalide' });
  db.orders.push(order);
  saveDb(db);
  res.status(201).json(order);
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  res.json(db.orders.slice().sort((a, b) => b.createdAt - a.createdAt));
});

app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  order.status = status;
  saveDb(db);
  res.json(order);
});

/* ---------- Statistiques ---------- */

// Yaoundé = UTC+1 : on calcule les jours/heures avec ce décalage
const TZ_OFFSET_MS = 60 * 60 * 1000;
function dayKey(ts) {
  return new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10);
}
function hourKey(ts) {
  return new Date(ts + TZ_OFFSET_MS).getUTCHours();
}
function dayLabel(key) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}`;
}

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const orders = db.orders.filter((o) => o.status !== 'annulee');
  const todayKey = dayKey(Date.now());

  const todayOrders = orders.filter((o) => dayKey(o.createdAt) === todayKey);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const activeOrders = db.orders.filter((o) =>
    ['nouvelle', 'preparation', 'prete'].includes(o.status)
  );

  // 7 derniers jours
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(Date.now() - i * 86400000);
    const dayOrders = orders.filter((o) => dayKey(o.createdAt) === key);
    days.push({
      key,
      label: dayLabel(key),
      count: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    });
  }

  // Heures de la journée (répartition de la semaine)
  const hours = Array.from({ length: 24 }, () => 0);
  for (const o of orders) hours[hourKey(o.createdAt)]++;

  // Top plats
  const dishCount = new Map();
  for (const o of orders) {
    for (const it of o.items) {
      const prev = dishCount.get(it.name) || { qty: 0, revenue: 0 };
      prev.qty += it.qty;
      prev.revenue += it.qty * it.price;
      dishCount.set(it.name, prev);
    }
  }
  const topDishes = [...dishCount.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  res.json({
    todayCount: todayOrders.length,
    todayRevenue,
    avgTicket: todayOrders.length ? Math.round(todayRevenue / todayOrders.length) : 0,
    activeCount: activeOrders.length,
    weekOrders: orders.length,
    weekRevenue: orders.reduce((s, o) => s + o.total, 0),
    days,
    hours,
    topDishes,
  });
});

/* ---------- Données de démonstration ----------
   Générées une seule fois (au premier lancement) pour que le
   tableau de bord montre des chiffres réalistes dès la démo. */

function seedOrders(dishes) {
  const sellable = dishes.filter((d) => d.available !== false);
  if (sellable.length === 0) return [];
  const names = ['Marie', 'Junior', 'Sandra', 'Boris', 'Nadège', 'Kevin', 'Aisha', 'Patrick', 'Clarisse', 'Rodrigue', 'Mireille', 'Steve'];
  const modes = ['Livraison', 'Livraison', 'Retrait sur place'];
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = () => sellable[rand(sellable.length)];
  const now = Date.now();
  const orders = [];

  for (let d = 6; d >= 0; d--) {
    // week-end plus chargé
    const dayOrders = 5 + rand(4) + (d % 6 === 5 || d % 6 === 6 ? 3 : 0);
    for (let i = 0; i < dayOrders; i++) {
      // pics : midi (12-14h) et soir (19-22h)
      const hour = Math.random() < 0.45 ? 12 + rand(3) : Math.random() < 0.8 ? 19 + rand(4) : 10 + rand(2);
      const ts = new Date(now - d * 86400000);
      ts.setHours(hour, rand(60), 0, 0);
      const itemCount = 1 + rand(3);
      const items = [];
      for (let k = 0; k < itemCount; k++) {
        const dish = pick();
        items.push({ name: dish.name, qty: 1 + rand(2), price: dish.price });
      }
      const total = items.reduce((s, it) => s + it.qty * it.price, 0);
      const isToday = d === 0;
      const isOld = !isToday || hour < 18; // hier et avant 18h : terminées
      const status = isOld
        ? (Math.random() < 0.95 ? 'livree' : 'annulee')
        : ['nouvelle', 'preparation', 'prete', 'livree'][rand(4)];
      orders.push({
        id: 'C-' + String(orders.length + 1).padStart(4, '0'),
        createdAt: ts.getTime(),
        status,
        customer: names[rand(names.length)],
        mode: modes[rand(modes.length)],
        note: Math.random() < 0.3 ? 'Sonner au portail' : '',
        items,
        total,
      });
    }
  }
  // Au moins 3 commandes actives aujourd'hui pour la démo
  const active = orders.filter((o) => o.status === 'nouvelle');
  while (active.length < 3) {
    const dish = pick();
    const qty = 1 + rand(2);
    orders.push({
      id: 'C-' + String(orders.length + 1).padStart(4, '0'),
      createdAt: now - rand(25) * 60000,
      status: 'nouvelle',
      customer: names[rand(names.length)],
      mode: modes[rand(modes.length)],
      note: '',
      items: [{ name: dish.name, qty, price: dish.price }],
      total: qty * dish.price,
    });
    active.push(orders[orders.length - 1]);
  }
  return orders.sort((a, b) => a.createdAt - b.createdAt);
}

// ---------- API publique ----------

app.get('/api/state', (req, res) => {
  res.json({ settings: db.settings, dishes: db.dishes, categoryLabels: CATEGORY_LABELS });
});

// ---------- Auth ----------

app.post('/api/admin/login', (req, res) => {
  if (bcrypt.compareSync(String((req.body || {}).password || ''), ADMIN_HASH)) {
    return res.json({ token: ADMIN_TOKEN });
  }
  return res.status(401).json({ error: 'Mot de passe incorrect' });
});

// ---------- Plats ----------

function validDish(d) {
  return (
    d && typeof d.name === 'string' && d.name.trim().length > 0 &&
    typeof d.price === 'number' && d.price >= 0 &&
    typeof d.cat === 'string' && d.cat.trim().length > 0
  );
}

app.post('/api/dishes', requireAdmin, (req, res) => {
  const d = req.body || {};
  if (!validDish(d)) return res.status(400).json({ error: 'Plat invalide : nom, catégorie et prix sont requis.' });
  const id = (d.id && !db.dishes.some((x) => x.id === d.id))
    ? d.id
    : d.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36).slice(-4);
  const dish = {
    id,
    cat: d.cat,
    name: d.name.trim(),
    desc: (d.desc || '').trim(),
    price: Math.round(d.price),
    img: (d.img || '').trim(),
    tag: (d.tag || '').trim(),
    available: d.available !== false,
  };
  db.dishes.push(dish);
  saveDb(db);
  res.status(201).json(dish);
});

app.put('/api/dishes/:id', requireAdmin, (req, res) => {
  const dish = db.dishes.find((x) => x.id === req.params.id);
  if (!dish) return res.status(404).json({ error: 'Plat introuvable' });
  const d = req.body || {};
  if (!validDish({ ...dish, ...d })) return res.status(400).json({ error: 'Plat invalide.' });
  dish.name = (d.name ?? dish.name).trim();
  dish.cat = (d.cat ?? dish.cat).trim();
  dish.desc = (d.desc ?? dish.desc).trim();
  dish.price = Math.round(d.price ?? dish.price);
  dish.img = (d.img ?? dish.img).trim();
  dish.tag = (d.tag ?? dish.tag).trim();
  if (typeof d.available === 'boolean') dish.available = d.available;
  saveDb(db);
  res.json(dish);
});

app.delete('/api/dishes/:id', requireAdmin, (req, res) => {
  const idx = db.dishes.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Plat introuvable' });
  db.dishes.splice(idx, 1);
  saveDb(db);
  res.json({ deleted: req.params.id });
});

// ---------- Réglages ----------

app.put('/api/settings', requireAdmin, (req, res) => {
  const s = req.body || {};
  const allowed = ['restaurantName', 'restaurantType', 'whatsappNumber', 'address', 'hours', 'delivery', 'rating', 'reviews', 'deliveryTime'];
  for (const key of allowed) {
    if (typeof s[key] === 'string') db.settings[key] = s[key].trim();
  }
  saveDb(db);
  res.json(db.settings);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Back-office Chez Junior à l'écoute sur le port ${PORT}`);
});
