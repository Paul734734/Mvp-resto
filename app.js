/* Chez Junior — logique menu + panier + commande WhatsApp
   Le menu et les réglages sont chargés depuis le back-office (server.js). */

// ---------- Base API ----------

const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]']);
const rawApiBase = window.__API_BASE__ || '';
const unresolved = rawApiBase.startsWith('__PORT_');
if (unresolved && !localHostnames.has(location.hostname)) {
  throw new Error('Backend proxy placeholder was not rewritten');
}
const API = '';

// ---------- Valeurs par défaut (si le serveur est injoignable) ----------

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

const DEFAULT_MENU = [
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

const DEFAULT_CATEGORY_LABELS = {
  burgers: 'Burgers',
  shawarmas: 'Shawarmas',
  'poulet-frit': 'Poulet frit',
  pizzas: 'Pizzas',
  sandwichs: 'Sandwichs',
  accompagnements: 'Accompagnements',
  boissons: 'Boissons',
};

const state = {
  cat: 'all',
  cart: {}, // { dishId: qty }
  menu: DEFAULT_MENU,
  settings: DEFAULT_SETTINGS,
  categoryLabels: DEFAULT_CATEGORY_LABELS,
};

const fcfa = (n) => n.toLocaleString('fr-FR') + ' F';

/* ---------- Chargement des données du back-office ---------- */

async function loadState() {
  try {
    const res = await fetch(`${API}/api/state`);
    if (!res.ok) throw new Error('state');
    const data = await res.json();
    state.menu = data.dishes || DEFAULT_MENU;
    state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    state.categoryLabels = { ...DEFAULT_CATEGORY_LABELS, ...(data.categoryLabels || {}) };
  } catch (e) {
    // Le back-office est injoignable : on garde le menu par défaut
    console.warn('Back-office injoignable, menu par défaut utilisé.');
  }
}

function applySettings() {
  const s = state.settings;
  document.title = `${s.restaurantName} ${s.restaurantType} — Menu & commande sur WhatsApp | Yaoundé`;
  document.querySelector('.brand__name').textContent = s.restaurantName;
  document.querySelector('.brand__tag').textContent = s.restaurantType;
  document.querySelector('.site-footer strong').textContent = s.restaurantName;
  const infoItems = document.querySelectorAll('.info-item__value');
  if (infoItems.length >= 3) {
    infoItems[0].textContent = s.address;
    infoItems[1].textContent = s.hours;
    infoItems[2].textContent = s.delivery;
  }
  document.querySelector('#meta-rating').textContent = s.rating;
  document.querySelector('#meta-reviews').textContent = s.reviews;
  document.querySelector('#meta-delivery').textContent = s.deliveryTime;
  const resaMsg = `Bonjour ${s.restaurantName} ! Je voudrais réserver une table.`;
  const resaUrl = `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(resaMsg)}`;
  document.getElementById('reserve-link').setAttribute('href', resaUrl);
  document.getElementById('reserve-link-footer').setAttribute('href', resaUrl);
}

/* ---------- Rendu du menu ---------- */

function dishCard(d) {
  const media = d.img
    ? `<div class="dish__media">
         ${d.tag ? `<span class="dish__tag">${d.tag}</span>` : ''}
         <img src="${d.img}" alt="${d.name}" loading="lazy" width="640" height="400"
              onerror="this.parentElement.style.display='none'">
       </div>`
    : (d.tag ? `<span class="dish__tag dish__tag--solo">${d.tag}</span>` : '');
  return `
    <article class="dish reveal" data-dish="${d.id}">
      ${media}
      <div class="dish__body">
        <div class="dish__head">
          <h3 class="dish__name">${d.name}</h3>
          <span class="dish__price">${fcfa(d.price)}</span>
        </div>
        <p class="dish__desc">${d.desc}</p>
        <button class="dish__add" type="button" data-add="${d.id}"
                aria-label="Ajouter ${d.name} au panier">
          + Ajouter
        </button>
      </div>
    </article>`;
}

function renderMenu() {
  const grid = document.getElementById('menu-grid');
  const visible = state.menu.filter((d) => d.available !== false);
  const dishes = state.cat === 'all' ? visible : visible.filter((d) => d.cat === state.cat);
  grid.innerHTML = dishes.map(dishCard).join('');
  requestAnimationFrame(() => {
    grid.querySelectorAll('.reveal').forEach((el) => el.setAttribute('data-visible', 'true'));
  });
}

function renderTabs() {
  const tabs = document.getElementById('menu-tabs');
  const cats = ['all', ...new Set(state.menu.map((d) => d.cat))];
  tabs.innerHTML = cats
    .map((c) => {
      const label = c === 'all' ? 'Tout le menu' : state.categoryLabels[c] || c;
      return `<button class="menu-tab" type="button" role="tab" data-cat="${c}" aria-selected="${
        c === state.cat
      }">${label}</button>`;
    })
    .join('');
}

/* ---------- Panier ---------- */

function cartItems() {
  return Object.entries(state.cart)
    .map(([id, qty]) => {
      const d = state.menu.find((m) => m.id === id);
      return d ? { ...d, qty } : null;
    })
    .filter(Boolean);
}

function cartTotal() {
  return cartItems().reduce((sum, it) => sum + it.price * it.qty, 0);
}

function cartCount() {
  return cartItems().reduce((n, it) => n + it.qty, 0);
}

function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  renderCart();
  openDrawer();
}

function changeQty(id, delta) {
  state.cart[id] = (state.cart[id] || 0) + delta;
  if (state.cart[id] <= 0) delete state.cart[id];
  renderCart();
}

function removeLine(id) {
  delete state.cart[id];
  renderCart();
}

function renderCart() {
  const count = cartCount();
  document.querySelectorAll('.cart-button__count').forEach((el) => {
    el.textContent = count;
    el.setAttribute('data-empty', count === 0 ? 'true' : 'false');
  });

  const bar = document.getElementById('cart-bar');
  bar.setAttribute('data-visible', count > 0 ? 'true' : 'false');
  document.body.classList.toggle('has-cart', count > 0);
  bar.querySelector('.cart-bar__count').textContent = count;
  bar.querySelector('.cart-bar__total').textContent = fcfa(cartTotal());

  const body = document.getElementById('cart-body');
  const items = cartItems();

  if (items.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon" aria-hidden="true">🍔</div>
        <h3>Votre panier est vide</h3>
        <p>Choisissez vos plats dans le menu, la commande s\u2019envoie ensuite directement sur WhatsApp.</p>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="cart-form">
        ${items
          .map(
            (it) => `
          <div class="cart-line">
            <div>
              <div class="cart-line__name">${it.name}</div>
              <div class="cart-line__price">${fcfa(it.price)} \u00b7 ${fcfa(it.price * it.qty)}</div>
              <div class="cart-line__qty">
                <button class="qty-btn" type="button" data-qty="${it.id}" data-delta="-1" aria-label="Retirer un ${it.name}">−</button>
                <span class="qty-value">${it.qty}</span>
                <button class="qty-btn" type="button" data-qty="${it.id}" data-delta="1" aria-label="Ajouter un ${it.name}">+</button>
              </div>
            </div>
            <button class="cart-line__remove" type="button" data-remove="${it.id}">Retirer</button>
          </div>`
          )
          .join('')}
        <div class="field">
          <label for="customer-name">Votre nom</label>
          <input id="customer-name" type="text" autocomplete="name" placeholder="Ex. : Marie">
        </div>
        <fieldset class="field" style="border:none">
          <legend style="font-size:var(--text-xs);font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:var(--space-2)">Mode de réception</legend>
          <div class="choice-row">
            <span class="choice">
              <input type="radio" name="order-mode" id="mode-livraison" value="Livraison" checked>
              <label class="choice__label" for="mode-livraison">🛵 Livraison</label>
            </span>
            <span class="choice">
              <input type="radio" name="order-mode" id="mode-retrait" value="Retrait sur place">
              <label class="choice__label" for="mode-retrait">🏠 Sur place</label>
            </span>
          </div>
        </fieldset>
        <div class="field">
          <label for="order-note">Note (quartier, précision…)</label>
          <textarea id="order-note" rows="2" placeholder="Ex. : livrer à Odza, vers 12h30"></textarea>
        </div>
      </div>`;
  }

  const total = document.getElementById('cart-total-value');
  total.textContent = fcfa(cartTotal());

  const waBtn = document.getElementById('order-whatsapp-btn');
  if (items.length === 0) {
    waBtn.setAttribute('href', '#');
    waBtn.setAttribute('aria-disabled', 'true');
  } else {
    waBtn.removeAttribute('aria-disabled');
    waBtn.setAttribute('href', buildWhatsAppLink());
  }
}

function buildWhatsAppLink() {
  const name = document.getElementById('customer-name')?.value.trim() || '';
  const mode =
    document.querySelector('input[name="order-mode"]:checked')?.value || 'Livraison';
  const note = document.getElementById('order-note')?.value.trim() || '';
  const lines = cartItems().map(
    (it) => `• ${it.qty} x ${it.name} — ${fcfa(it.price * it.qty)}`
  );
  const msg =
    `Bonjour ${state.settings.restaurantName} ! Je voudrais commander :\n\n${lines.join('\n')}\n\n` +
    `Total : ${fcfa(cartTotal())}\n` +
    `Nom : ${name || '(à préciser)'}\n` +
    `Mode : ${mode}${note ? `\nNote : ${note}` : ''}`;
  return `https://wa.me/${state.settings.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

/* Enregistre la commande dans le back-office du gérant (le message
   WhatsApp part toujours ; si l'enregistrement échoue, on ne bloque pas). */
function recordOrder() {
  if (cartCount() === 0) return;
  let apiBase = window.__API_BASE__ || '';
  if (apiBase.startsWith('__PORT_')) apiBase = 'http://localhost:8001'; // tests locaux
  const payload = {
    customer: document.getElementById('customer-name')?.value.trim() || '',
    mode: document.querySelector('input[name="order-mode"]:checked')?.value || 'Livraison',
    note: document.getElementById('order-note')?.value.trim() || '',
    items: cartItems().map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
  };
  fetch(`${apiBase}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/* ---------- Tiroir ---------- */

function openDrawer() {
  document.getElementById('cart-overlay').setAttribute('data-open', 'true');
  const drawer = document.getElementById('cart-drawer');
  drawer.setAttribute('data-open', 'true');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('cart-overlay').setAttribute('data-open', 'false');
  const drawer = document.getElementById('cart-drawer');
  drawer.setAttribute('data-open', 'false');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
  document.body.style.overflow = '';
}

/* ---------- Routage public / admin ---------- */

function route() {
  const isAdmin = location.hash === '#admin';
  document.getElementById('admin-view').hidden = !isAdmin;
  document.getElementById('site-main').hidden = isAdmin;
  document.querySelector('.site-header').hidden = isAdmin;
  document.querySelector('.site-footer').hidden = isAdmin;
  document.getElementById('cart-bar').hidden = isAdmin;
  if (isAdmin) {
    closeDrawer();
    window.adminInit && window.adminInit();
  }
}

/* ---------- Événements ---------- */

function init() {
  // Onglets catégories
  const tabs = document.getElementById('menu-tabs');
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    tabs.querySelectorAll('.menu-tab').forEach((t) =>
      t.setAttribute('aria-selected', t === btn ? 'true' : 'false')
    );
    renderMenu();
  });

  // Ajout au panier (délégation)
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      addToCart(add.dataset.add);
      return;
    }
    const qty = e.target.closest('[data-qty]');
    if (qty) {
      changeQty(qty.dataset.qty, parseInt(qty.dataset.delta, 10));
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      removeLine(rm.dataset.remove);
    }
  });

  // Recalcul du lien WhatsApp quand le formulaire change
  document.getElementById('cart-body').addEventListener('input', () => {
    const waBtn = document.getElementById('order-whatsapp-btn');
    if (cartCount() > 0) waBtn.setAttribute('href', buildWhatsAppLink());
  });

  // Enregistrement de la commande au clic sur WhatsApp
  document.getElementById('order-whatsapp-btn').addEventListener('click', recordOrder);

  // Ouverture / fermeture tiroir
  document.getElementById('open-cart').addEventListener('click', openDrawer);
  document.getElementById('cart-bar-button').addEventListener('click', openDrawer);
  document.getElementById('close-cart').addEventListener('click', closeDrawer);
  document.getElementById('cart-overlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // Routage
  window.addEventListener('hashchange', route);

  // Apparition au scroll
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.setAttribute('data-visible', 'true');
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  const observeReveals = () =>
    document.querySelectorAll('.reveal:not([data-visible])').forEach((el) => io.observe(el));

  renderMenu();
  renderCart();
  route();
  observeReveals();
  // Les plats ajoutés après coup (changement d'onglet) apparaissent directement
  const mo = new MutationObserver(observeReveals);
  mo.observe(document.getElementById('menu-grid'), { childList: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  applySettings();
  renderTabs();
  renderMenu();
  init();
});
