const LS = { rooms: 'bh_rooms', tenants: 'bh_tenants', payments: 'bh_payments' };
const store = {
  get(k) { return JSON.parse(localStorage.getItem(k)) || []; },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const ROOM_TYPES = ['Single', 'Double', 'Family'];
const STATUS = { Available: 'available', Occupied: 'occupied' };
const PAY_STATUS = ['paid', 'pending'];

if (!localStorage.getItem(LS.rooms)) {
  store.set(LS.rooms, [
    { id: 1, number: '101', type: 'Single', rent: 3500, status: STATUS.Occupied },
    { id: 2, number: '102', type: 'Double', rent: 5000, status: STATUS.Available },
    { id: 3, number: '201', type: 'Single', rent: 3500, status: STATUS.Occupied },
    { id: 4, number: '202', type: 'Family', rent: 8000, status: STATUS.Available }
  ]);
  store.set(LS.tenants, [
    { id: 1, name: 'Juan Dela Cruz', contact: '09171234567', room: '101', rent: 3500, moveIn: '2026-06-01' },
    { id: 2, name: 'Maria Santos', contact: '09185556666', room: '201', rent: 3500, moveIn: '2026-07-01' }
  ]);
  store.set(LS.payments, [
    { id: 1, tenantId: 1, amount: 3500, date: '2026-08-01', status: 'paid' },
    { id: 2, tenantId: 2, amount: 3500, date: '2026-08-05', status: 'pending' }
  ]);
}

const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => '₱' + Number(n || 0).toLocaleString();

const rooms = () => store.get(LS.rooms);
const tenants = () => store.get(LS.tenants);
const payments = () => store.get(LS.payments);
const saveRooms = (v) => store.set(LS.rooms, v);
const saveTenants = (v) => store.set(LS.tenants, v);
const savePayments = (v) => store.set(LS.payments, v);

function tenantName(id) {
  const t = tenants().find((x) => x.id === id);
  return t ? t.name : '(deleted)';
}

function visiblePayments() {
  const ps = payments();
  return user && user.role === 'tenant' ? ps.filter((p) => p.tenantId === user.tenantId) : ps;
}

function renderDashboard() {
  const rs = rooms(), ts = tenants();
  document.getElementById('st-total').textContent = rs.length;
  document.getElementById('st-occupied').textContent = rs.filter((r) => r.status === STATUS.Occupied).length;
  document.getElementById('st-available').textContent = rs.filter((r) => r.status === STATUS.Available).length;
  document.getElementById('st-rent').textContent = fmt(ts.reduce((s, t) => s + (t.rent || 0), 0));
  const body = document.getElementById('recent-payments').querySelector('tbody');
  const recent = visiblePayments().slice(-5).reverse();
  body.innerHTML = recent.length
    ? recent.map((p) => `<tr><td>${esc(tenantName(p.tenantId))}</td><td>${fmt(p.amount)}</td><td>${p.date}</td><td><span class="badge ${p.status}">${p.status}</span></td></tr>`).join('')
    : `<tr><td colspan="4" class="empty">No payments yet</td></tr>`;
}

function renderRooms() {
  const body = document.getElementById('rooms-table').querySelector('tbody');
  const rs = rooms();
  const isAdmin = !user || user.role === 'admin';
  body.innerHTML = rs.length
    ? rs.map((r) => `<tr>
        <td>${esc(r.number)}</td><td>${esc(r.type)}</td><td>${fmt(r.rent)}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        ${isAdmin ? `<td><button class="btn sm" onclick="openRoom(${r.id})">Edit</button>
        <button class="btn sm danger" onclick="delRoom(${r.id})">Delete</button></td>` : ''}
      </tr>`).join('')
    : `<tr><td colspan="${isAdmin ? 5 : 4}" class="empty">No rooms</td></tr>`;
}

function renderTenants() {
  const body = document.getElementById('tenants-table').querySelector('tbody');
  const ts = tenants();
  body.innerHTML = ts.length
    ? ts.map((t) => `<tr>
        <td>${esc(t.name)}</td><td>${esc(t.contact)}</td><td>${esc(t.room)}</td>
        <td>${fmt(t.rent)}</td><td>${t.moveIn}</td>
        <td><button class="btn sm" onclick="openTenant(${t.id})">Edit</button>
        <button class="btn sm danger" onclick="delTenant(${t.id})">Delete</button></td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="empty">No tenants</td></tr>`;
}

function renderPayments() {
  const body = document.getElementById('payments-table').querySelector('tbody');
  const ps = visiblePayments();
  body.innerHTML = ps.length
    ? ps.map((p) => `<tr><td>${esc(tenantName(p.tenantId))}</td><td>${fmt(p.amount)}</td><td>${p.date}</td><td><span class="badge ${p.status}">${p.status}</span></td></tr>`).join('')
    : `<tr><td colspan="4" class="empty">No payments yet</td></tr>`;
}

function refresh() { renderDashboard(); renderRooms(); renderTenants(); renderPayments(); }

function setRoomStatus(roomId, status) {
  const rs = rooms().map((r) => (r.id === roomId ? { ...r, status } : r));
  saveRooms(rs);
}

function availableRooms() {
  return rooms().filter((r) => r.status === STATUS.Available);
}

/* ---------- modals ---------- */
let editId = null;
let editKind = null;

function openModal() {
  document.getElementById('overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('overlay').classList.add('hidden');
  editId = null; editKind = null;
}

function formFields() {
  return Object.fromEntries(new FormData(document.getElementById('modal-form')).entries());
}

function openRoom(id) {
  editKind = 'room'; editId = id;
  const r = rooms().find((x) => x.id === id);
  document.getElementById('modal-title').textContent = 'Edit Room';
  document.getElementById('modal-form').innerHTML = `
    <label>Room number<input name="number" value="${esc(r.number)}" required></label>
    <label>Type<select name="type">${ROOM_TYPES.map((t) => `<option ${t === r.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Monthly rent<input name="rent" type="number" min="0" value="${r.rent}" required></label>
    <label>Status<select name="status">${Object.values(STATUS).map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`;
  openModal();
}

function addRoomForm() {
  editKind = 'room'; editId = null;
  document.getElementById('modal-title').textContent = 'Add Room';
  document.getElementById('modal-form').innerHTML = `
    <label>Room number<input name="number" required></label>
    <label>Type<select name="type">${ROOM_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></label>
    <label>Monthly rent<input name="rent" type="number" min="0" value="0" required></label>
    <label>Status<select name="status"><option value="${STATUS.Available}">Available</option><option value="${STATUS.Occupied}">Occupied</option></select></label>`;
  openModal();
}

function openTenant(id) {
  editKind = 'tenant'; editId = id;
  const t = tenants().find((x) => x.id === id);
  document.getElementById('modal-title').textContent = 'Edit Tenant';
  document.getElementById('modal-form').innerHTML = `
    <label>Full name<input name="name" value="${esc(t.name)}" required></label>
    <label>Contact number<input name="contact" value="${esc(t.contact)}" required></label>
    <label>Assigned room<select name="room">${rooms().map((r) => `<option value="${r.number}" ${r.number === t.room ? 'selected' : ''}>${r.number} (${r.status})</option>`).join('')}</select></label>
    <label>Monthly rent<input name="rent" type="number" min="0" value="${t.rent}" required></label>
    <label>Move-in date<input name="moveIn" type="date" value="${t.moveIn}" required></label>`;
  openModal();
}

function addTenantForm() {
  editKind = 'tenant'; editId = null;
  const opts = availableRooms().length
    ? availableRooms().map((r) => `<option value="${r.number}">${r.number} (${r.type})</option>`).join('')
    : `<option value="">No available rooms</option>`;
  document.getElementById('modal-title').textContent = 'Add Tenant';
  document.getElementById('modal-form').innerHTML = `
    <label>Full name<input name="name" required></label>
    <label>Contact number<input name="contact" required></label>
    <label>Assigned room<select name="room">${opts}</select></label>
    <label>Monthly rent<input name="rent" type="number" min="0" value="0" required></label>
    <label>Move-in date<input name="moveIn" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>`;
  openModal();
}

function addPaymentForm() {
  editKind = 'payment'; editId = null;
  const ts = tenants();
  const opts = ts.length ? ts.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('') : `<option value="">No tenants</option>`;
  document.getElementById('modal-title').textContent = 'Add Payment';
  document.getElementById('modal-form').innerHTML = `
    <label>Tenant<select name="tenantId">${opts}</select></label>
    <label>Amount<input name="amount" type="number" min="0" value="0" required></label>
    <label>Payment date<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>
    <label>Status<select name="status">${PAY_STATUS.map((s) => `<option value="${s}">${s}</option>`).join('')}</select></label>`;
  openModal();
}

/* ---------- save ---------- */
function saveForm() {
  const f = formFields();
  if (editKind === 'room') {
    const rs = rooms();
    const data = { id: editId || uid(), number: f.number, type: f.type, rent: Number(f.rent), status: f.status };
    if (editId) {
      const idx = rs.findIndex((x) => x.id === editId);
      rs[idx] = { ...rs[idx], ...data, id: editId };
    } else rs.push(data);
    saveRooms(rs);
  } else if (editKind === 'tenant') {
    const ts = tenants();
    const old = editId ? ts.find((x) => x.id === editId) : null;
    const data = { id: editId || uid(), name: f.name, contact: f.contact, room: f.room, rent: Number(f.rent), moveIn: f.moveIn };
    if (editId) {
      const idx = ts.findIndex((x) => x.id === editId);
      if (old && old.room !== f.room) { setRoomStatusByNumber(old.room, STATUS.Available); }
      ts[idx] = { ...ts[idx], ...data, id: editId };
    } else ts.push(data);
    saveTenants(ts);
    setRoomStatusByNumber(f.room, STATUS.Occupied);
  } else if (editKind === 'payment') {
    const ps = payments();
    ps.push({ id: uid(), tenantId: Number(f.tenantId), amount: Number(f.amount), date: f.date, status: f.status });
    savePayments(ps);
  }
  closeModal();
  refresh();
}

function setRoomStatusByNumber(number, status) {
  const rs = rooms().map((r) => (r.number === number ? { ...r, status } : r));
  saveRooms(rs);
}

/* ---------- delete ---------- */
function delRoom(id) {
  if (!confirm('Delete this room?')) return;
  saveRooms(rooms().filter((r) => r.id !== id));
  refresh();
}

function delTenant(id) {
  if (!confirm('Delete this tenant?')) return;
  const t = tenants().find((x) => x.id === id);
  saveTenants(tenants().filter((x) => x.id !== id));
  if (t) setRoomStatusByNumber(t.room, STATUS.Available);
  refresh();
}

/* ---------- auth ---------- */
let user = null;

function showLogin() {
  user = null;
  document.getElementById('login').classList.remove('hidden');
  document.getElementById('main').classList.add('hidden');
  document.getElementById('nav').classList.add('hidden');
  document.getElementById('logout').classList.add('hidden');
  document.querySelectorAll('[data-admin]').forEach((b) => b.classList.remove('hidden'));
  document.getElementById('login-error').classList.add('hidden');
}

function showApp() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden');
  document.getElementById('logout').classList.remove('hidden');
  if (user.role === 'tenant') {
    document.querySelectorAll('[data-admin]').forEach((b) => b.classList.add('hidden'));
    document.querySelectorAll('[data-admin-only]').forEach((b) => b.classList.add('hidden'));
  }
  document.querySelector('.view.active') || document.getElementById('dashboard').classList.add('active');
  refresh();
}

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get('name') || '').trim();
  const room = String(f.get('room') || '').trim();
  const err = document.getElementById('login-error');
  const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };

  if (f.get('role') === 'admin') {
    if (name === 'landlord' && f.get('password') === 'admin123pass') {
      user = { role: 'admin' };
      showApp();
    } else fail('Invalid admin credentials');
  } else {
    const t = tenants().find((x) => x.name.toLowerCase() === name.toLowerCase() && String(x.room) === room);
    if (t) { user = { role: 'tenant', tenantId: t.id, room: t.room }; showApp(); }
    else fail('Tenant not found — check your name and room number');
  }
});

document.getElementById('logout').addEventListener('click', showLogin);

document.querySelectorAll('#login-form [name="role"]').forEach((s) =>
  s.addEventListener('change', () => {
    const isAdmin = s.value === 'admin';
    document.getElementById('login-pass').classList.toggle('hidden', !isAdmin);
    document.getElementById('login-room').classList.toggle('hidden', isAdmin);
  })
);

/* ---------- nav & events ---------- */
document.querySelectorAll('nav button').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById(b.dataset.view).classList.add('active');
  })
);

document.querySelectorAll('.btn.add').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.open === 'room-modal') addRoomForm();
    else if (b.dataset.open === 'tenant-modal') addTenantForm();
    else addPaymentForm();
  })
);

document.getElementById('cancel').addEventListener('click', closeModal);
document.getElementById('modal-form').addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });

refresh();
showLogin();