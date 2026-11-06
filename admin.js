/* Espace gérant — back-office du menu (admin.js) */

(() => {
  const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]']);
  const rawApiBase = window.__API_BASE__ || '';
  const unresolved = rawApiBase.startsWith('__PORT_');
  const API = '';

  let adminToken = null; // en mémoire : il faut se reconnecter à chaque visite

  const notice = (msg, ok = true) => {
    const el = document.getElementById('admin-notice');
    el.textContent = msg;
    el.classList.toggle('admin-notice--error', !ok);
    el.hidden = false;
    clearTimeout(notice._t);
    notice._t = setTimeout(() => (el.hidden = true), 3500);
  };

  const api = async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {}),
        ...(opts.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  };

  /* ---------- Connexion ---------- */

  const loginView = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');

  async function showLogin() {
    stopLive();
    panel.hidden = true;
    loginView.hidden = false;
    document.getElementById('admin-pass').focus();
  }

  async function tryLogin(password) {
    const data = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    adminToken = data.token;
    loginView.hidden = true;
    panel.hidden = false;
    await renderPanel();
    ordersCache = '';
    await refreshLive();
    startLive();
  }

  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('admin-login-error');
    err.hidden = true;
    try {
      await tryLogin(document.getElementById('admin-pass').value);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  /* ---------- Panneau ---------- */

  const SETTING_FIELDS = [
    ['set-name', 'restaurantName'],
    ['set-type', 'restaurantType'],
    ['set-whatsapp', 'whatsappNumber'],
    ['set-hours', 'hours'],
    ['set-address', 'address'],
    ['set-delivery', 'delivery'],
    ['set-rating', 'rating'],
    ['set-delivery-time', 'deliveryTime'],
  ];

  let categoryLabels = {};

  function categoryOptions(selected) {
    const cats = [...new Set(window.__menuState?.map((d) => d.cat) || [])].concat(
      Object.keys(categoryLabels).filter((c) => !(window.__menuState || []).some((d) => d.cat === c))
    );
    const unique = [...new Set(cats)];
    return unique
      .map(
        (c) =>
          `<option value="${c}" ${c === selected ? 'selected' : ''}>${
            categoryLabels[c] || c
          }</option>`
      )
      .join('');
  }

  const esc = (s) =>
    String(s || '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');

  /* ---------- Aide décisionnelle (dashboard + commandes) ---------- */

  const STATUS_META = {
    nouvelle: { label: 'Nouvelle', next: 'preparation', nextLabel: 'Commencer' },
    preparation: { label: 'En préparation', next: 'prete', nextLabel: 'Marquer prête' },
    prete: { label: 'Prête', next: 'livree', nextLabel: 'Marquer livrée' },
    livree: { label: 'Livrée', next: null, nextLabel: '' },
    annulee: { label: 'Annulée', next: null, nextLabel: '' },
  };
  const ACTIVE_STATUSES = ['nouvelle', 'preparation', 'prete'];

  const fcfa = (n) =>
    Number(n || 0).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ') + ' F';
  const compactF = (n) =>
    n >= 1000 ? (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }).replace(/[\u202F\u00A0]/g, ' ') + 'k' : String(n);

  // Yaoundé = UTC+1, comme côté serveur
  const fmtTime = (ts) => {
    const d = new Date(ts + 3600000);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  };

  let ordersCache = '';

  function renderKpis(stats) {
    const kpis = [
      { label: 'Commandes du jour', value: String(stats.todayCount) },
      { label: "Chiffre d'affaires du jour", value: fcfa(stats.todayRevenue) },
      { label: 'Ticket moyen', value: fcfa(stats.avgTicket) },
      { label: 'En cours', value: String(stats.activeCount), accent: stats.activeCount > 0 },
    ];
    document.getElementById('admin-kpis').innerHTML = kpis
      .map(
        (k) => `
        <div class="kpi${k.accent ? ' kpi--accent' : ''}">
          <span class="kpi__value">${esc(k.value)}</span>
          <span class="kpi__label">${esc(k.label)}</span>
        </div>`
      )
      .join('');
  }

  function renderDaysChart(days) {
    const max = Math.max(...days.map((d) => d.revenue), 1);
    document.getElementById('admin-chart-days').innerHTML = days
      .map(
        (d) => `
        <div class="chart-bar" title="${d.count} commande(s) · ${fcfa(d.revenue)}">
          <span class="chart-bar__value">${compactF(d.revenue)}</span>
          <div class="chart-bar__track"><div class="chart-bar__fill" style="height:${Math.max(4, Math.round((d.revenue / max) * 100))}%"></div></div>
          <span class="chart-bar__label">${esc(d.label)}</span>
        </div>`
      )
      .join('');
  }

  function renderHoursChart(hours) {
    const from = 8, to = 23; // heures d'ouverture
    const slice = hours.slice(from, to + 1);
    const max = Math.max(...slice, 1);
    document.getElementById('admin-chart-hours').innerHTML = slice
      .map(
        (count, i) => `
        <div class="chart-bar" title="${count} commande(s) à ${from + i}h">
          <span class="chart-bar__value">${count > 0 ? count : '\u00A0'}</span>
          <div class="chart-bar__track"><div class="chart-bar__fill chart-bar__fill--muted" style="height:${count ? Math.max(4, Math.round((count / max) * 100)) : 2}%"></div></div>
          <span class="chart-bar__label${(from + i) % 2 === 1 ? ' chart-bar__label--minor' : ''}">${from + i}h</span>
        </div>`
      )
      .join('');
  }

  function renderTopDishes(topDishes) {
    const max = Math.max(...topDishes.map((d) => d.qty), 1);
    document.getElementById('admin-topdishes').innerHTML = topDishes.length
      ? topDishes
          .map(
            (d) => `
          <div class="admin-top__row">
            <span class="admin-top__name">${esc(d.name)}</span>
            <div class="admin-top__bar"><div class="admin-top__fill" style="width:${Math.round((d.qty / max) * 100)}%"></div></div>
            <span class="admin-top__qty">${d.qty} vendus</span>
            <span class="admin-top__rev">${fcfa(d.revenue)}</span>
          </div>`
          )
          .join('')
      : '<p class="order-hint">Pas encore de ventes enregistrées.</p>';
  }

  function orderCard(o) {
    const meta = STATUS_META[o.status] || STATUS_META.nouvelle;
    const items = o.items
      .map((it) => `<li>${it.qty} × ${esc(it.name)} — <strong>${fcfa(it.qty * it.price)}</strong></li>`)
      .join('');
    return `
      <article class="order-card order-card--${o.status}" data-order-id="${o.id}">
        <div class="order-card__head">
          <div class="order-card__id">
            <strong>${esc(o.id)}</strong>
            <span class="status-chip status-chip--${o.status}">${meta.label}</span>
          </div>
          <span class="order-card__time">${fmtTime(o.createdAt)}</span>
        </div>
        <div class="order-card__meta">
          ${esc(o.customer)} · ${esc(o.mode)}
          ${o.note ? `<span class="order-card__note">« ${esc(o.note)} »</span>` : ''}
        </div>
        <ul class="order-card__items">${items}</ul>
        <div class="order-card__foot">
          <strong class="order-card__total">${fcfa(o.total)}</strong>
          <div class="order-card__actions">
            ${meta.next ? `<button class="btn btn--primary btn--sm" type="button" data-order-next="${o.id}" data-next="${meta.next}">${meta.nextLabel}</button>` : ''}
            ${ACTIVE_STATUSES.includes(o.status) ? `<button class="btn btn--ghost btn--sm" type="button" data-order-cancel="${o.id}">Annuler</button>` : ''}
            ${o.status === 'livree' || o.status === 'annulee' ? `<button class="btn btn--ghost btn--sm" type="button" data-order-reset="${o.id}">Rouvrir</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  function renderOrders(orders) {
    const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const done = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status)).slice(0, 20);

    document.getElementById('admin-orders-count').textContent = active.length
      ? active.length + ' en attente'
      : 'Tout est servi';
    document.getElementById('admin-orders').innerHTML = active.length
      ? active.map(orderCard).join('')
      : '<p class="order-hint">Aucune commande en attente. Elles apparaîtront ici dès qu\u2019un client commande.</p>';
    document.getElementById('admin-orders-history').innerHTML = done.length
      ? done.map(orderCard).join('')
      : '<p class="order-hint">Pas encore de commande terminée.</p>';
  }

  async function refreshLive() {
    const [orders, stats] = await Promise.all([
      api('/api/admin/orders'),
      api('/api/admin/stats'),
    ]);
    renderKpis(stats);
    renderDaysChart(stats.days);
    renderHoursChart(stats.hours);
    renderTopDishes(stats.topDishes);
    const serialized = JSON.stringify(orders);
    if (serialized !== ordersCache) {
      ordersCache = serialized;
      renderOrders(orders);
    }
  }

  let liveTimer = null;
  function startLive() {
    if (liveTimer) return;
    liveTimer = setInterval(refreshLive, 15000);
  }
  function stopLive() {
    clearInterval(liveTimer);
    liveTimer = null;
  }

  async function handleOrderAction(e) {
    const btn = e.target.closest('button[data-order-next],button[data-order-cancel],button[data-order-reset]');
    if (!btn) return;
    let status = btn.dataset.next || null;
    if (btn.dataset.orderCancel !== undefined) {
      if (!confirm('Annuler cette commande ?')) return;
      status = 'annulee';
    } else if (btn.dataset.orderReset !== undefined) {
      status = 'nouvelle';
    }
    if (!status) return;
    const id = btn.dataset.orderNext || btn.dataset.orderCancel || btn.dataset.orderReset;
    try {
      await api(`/api/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      ordersCache = '';
      await refreshLive();
    } catch (ex) {
      notice(ex.message, false);
    }
  }

  document.getElementById('admin-orders').addEventListener('click', handleOrderAction);
  document.getElementById('admin-orders-history').addEventListener('click', handleOrderAction);

  function dishRow(d, isNew = false) {
    return `
      <form class="admin-dish" data-dish-id="${d.id || ''}" data-is-new="${isNew}">
        <div class="admin-dish__row">
          <div class="field admin-dish__name">
            <label>Nom du plat</label>
            <input type="text" name="name" value="${esc(d.name)}" required>
          </div>
          <div class="field admin-dish__price">
            <label>Prix (F)</label>
            <input type="number" name="price" min="0" step="50" value="${d.price ?? 1000}" required>
          </div>
          <div class="field admin-dish__cat">
            <label>Catégorie</label>
            <select name="cat">${categoryOptions(d.cat)}</select>
          </div>
          <div class="field admin-dish__tag">
            <label>Étiquette (facultatif)</label>
            <input type="text" name="tag" value="${esc(d.tag)}" placeholder="Best-seller…">
          </div>
        </div>
        <div class="admin-dish__row">
          <div class="field admin-dish__img">
            <label>Photo (lien, facultatif)</label>
            <input type="text" name="img" value="${esc(d.img)}" placeholder="assets/burger.jpg">
          </div>
          <div class="field admin-dish__desc">
            <label>Description</label>
            <textarea name="desc" rows="2">${esc(d.desc)}</textarea>
          </div>
        </div>
        <div class="admin-dish__actions">
          <label class="admin-check">
            <input type="checkbox" name="available" ${d.available !== false ? 'checked' : ''}>
            Disponible à la vente
          </label>
          <span class="admin-dish__spacer"></span>
          <button class="btn btn--ghost" type="button" data-cancel="${isNew}">Annuler</button>
          <button class="btn btn--danger" type="button" data-delete>Supprimer</button>
          <button class="btn btn--primary" type="submit">${isNew ? 'Ajouter le plat' : 'Enregistrer'}</button>
        </div>
      </form>`;
  }

  async function renderPanel() {
    const data = await api('/api/state');
    window.__menuState = data.dishes;
    categoryLabels = data.categoryLabels || {};

    // Réglages
    for (const [fieldId, key] of SETTING_FIELDS) {
      document.getElementById(fieldId).value = data.settings[key] || '';
    }

    // Plats
    document.getElementById('admin-dishes').innerHTML = data.dishes.map((d) => dishRow(d)).join('');
  }

  document.getElementById('admin-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {};
    for (const [fieldId, key] of SETTING_FIELDS) body[key] = document.getElementById(fieldId).value;
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
      notice('Informations enregistrées. Rechargez la page du site pour les voir.');
    } catch (ex) {
      notice(ex.message, false);
    }
  });

  document.getElementById('admin-add-dish').addEventListener('click', () => {
    const wrap = document.getElementById('admin-dishes');
    wrap.insertAdjacentHTML(
      'afterbegin',
      dishRow({ name: '', price: 1000, cat: 'burgers', desc: '', img: '', tag: '', available: true }, true)
    );
    wrap.querySelector('[data-is-new="true"] input[name="name"]').focus();
  });

  document.getElementById('admin-dishes').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const form = btn.closest('.admin-dish');
    if (btn.dataset.delete !== undefined) {
      const isNew = form.dataset.isNew === 'true';
      if (isNew) {
        form.remove();
        return;
      }
      if (!confirm('Supprimer définitivement ce plat du menu ?')) return;
      try {
        await api(`/api/dishes/${form.dataset.dishId}`, { method: 'DELETE' });
        form.remove();
        notice('Plat supprimé.');
      } catch (ex) {
        notice(ex.message, false);
      }
    } else if (btn.dataset.cancel !== undefined) {
      if (form.dataset.isNew === 'true') form.remove();
      else await renderPanel();
    }
  });

  document.getElementById('admin-dishes').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.classList.contains('admin-dish')) return;
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'),
      price: parseInt(fd.get('price'), 10) || 0,
      cat: fd.get('cat'),
      tag: fd.get('tag'),
      img: fd.get('img'),
      desc: fd.get('desc'),
      available: fd.get('available') === 'on',
    };
    const isNew = form.dataset.isNew === 'true';
    try {
      if (isNew) {
        await api('/api/dishes', { method: 'POST', body: JSON.stringify(payload) });
        notice('Plat ajouté au menu.');
      } else {
        await api(`/api/dishes/${form.dataset.dishId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notice('Plat enregistré.');
      }
      await renderPanel();
    } catch (ex) {
      notice(ex.message, false);
    }
  });

  /* ---------- Point d'entrée appelé par app.js quand #admin ---------- */

  window.adminInit = async () => {
    if (adminToken) {
      loginView.hidden = true;
      panel.hidden = false;
      try {
        await renderPanel();
        ordersCache = '';
        await refreshLive();
        startLive();
      } catch (ex) {
        adminToken = null;
        await showLogin();
      }
    } else {
      await showLogin();
    }
  };
})();
