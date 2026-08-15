const { db, auth, FS, FBA } = window;
const { collection, getDocs, setDoc, deleteDoc, doc } = FS;
const { signInWithEmailAndPassword, signOut } = FBA;

const ROOM_TYPES = ['Single', 'Double', 'Family'];
const STATUS = { Available: 'available', Occupied: 'occupied' };
const PAY_STATUS = ['paid', 'pending'];

const uid = () => String(Date.now() + Math.floor(Math.random() * 1000));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => '₱' + Number(n || 0).toLocaleString();

let cache = { rooms: [], tenants: [], payments: [] };
const rooms = () => cache.rooms;
const tenants = () => cache.tenants;
const payments = () => cache.payments;

const getCol = async (name) => (await getDocs(collection(db, name))).docs.map((d) => d.data());
const setDoc_ = (name, item) => setDoc(doc(db, name, String(item.id)), item);

async function refresh() {
  cache.rooms = await getCol('rooms');
  cache.tenants = await getCol('tenants');
  cache.payments = await getCol('payments');
  renderDashboard(); renderRooms(); renderTenants(); renderPayments();
}

async function seed() {
  if (cache.rooms.length) return;
  await setDoc_('rooms', { id: '1', number: '101', type: 'Single', rent: 3500, status: STATUS.Occupied });
  await setDoc_('rooms', { id: '2', number: '102', type: 'Double', rent: 5000, status: STATUS.Available });
  await setDoc_('rooms', { id: '3', number: '201', type: 'Single', rent: 3500, status: STATUS.Occupied });
  await setDoc_('rooms', { id: '4', number: '202', type: 'Family', rent: 8000, status: STATUS.Available });
  await setDoc_('tenants', { id: '1', name: 'Juan Dela Cruz', email: 'juan@bhs.local', password: 'juan123', contact: '09171234567', room: '101', rent: 3500, moveIn: '2026-06-01' });
  await setDoc_('tenants', { id: '2', name: 'Maria Santos', email: 'maria@bhs.local', password: 'maria123', contact: '09185556666', room: '201', rent: 3500, moveIn: '2026-07-01' });
  await setDoc_('payments', { id: '1', tenantId: '1', amount: 3500, date: '2026-08-01', status: 'paid' });
  await setDoc_('payments', { id: '2', tenantId: '2', amount: 3500, date: '2026-08-05', status: 'pending' });
}

function tenantName(id) {
  const t = tenants().find((x) => String(x.id) === String(id));
  return t ? t.name : '(deleted)';
}

function visiblePayments() {
  const ps = payments();
  return user && user.role === 'tenant' ? ps.filter((p) => String(p.tenantId) === String(user.tenantId)) : ps;
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

function availableRooms() {
  return rooms().filter((r) => r.status === STATUS.Available);
}

async function setRoomStatusByNumber(number, status) {
  const r = rooms().find((x) => x.number === number);
  if (r) await setDoc_( 'rooms', { ...r, status });
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
  editKind = 'room'; editId = String(id);
  const r = rooms().find((x) => String(x.id) === String(id));
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
  editKind = 'tenant'; editId = String(id);
  const t = tenants().find((x) => String(x.id) === String(id));
  document.getElementById('modal-title').textContent = 'Edit Tenant';
  document.getElementById('modal-form').innerHTML = `
    <label>Full name<input name="name" value="${esc(t.name)}" required></label>
    <label>Email<input name="email" type="email" value="${esc(t.email || '')}"></label>
    <label>Password<input name="password" type="password" value="${esc(t.password || '')}"></label>
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
    <label>Email<input name="email" type="email"></label>
    <label>Password<input name="password" type="password"></label>
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
async function saveForm() {
  const f = formFields();
  if (editKind === 'room') {
    const data = { id: editId || uid(), number: f.number, type: f.type, rent: Number(f.rent), status: f.status };
    await setDoc_('rooms', data);
  } else if (editKind === 'tenant') {
    const data = { id: editId || uid(), name: f.name, email: f.email, password: f.password, contact: f.contact, room: f.room, rent: Number(f.rent), moveIn: f.moveIn };
    if (editId) {
      const old = tenants().find((x) => String(x.id) === editId);
      if (old && old.room !== f.room) await setRoomStatusByNumber(old.room, STATUS.Available);
    }
    await setDoc_('tenants', data);
    await setRoomStatusByNumber(f.room, STATUS.Occupied);
  } else if (editKind === 'payment') {
    await setDoc_('payments', { id: uid(), tenantId: String(f.tenantId), amount: Number(f.amount), date: f.date, status: f.status });
  }
  closeModal();
  await refresh();
}

/* ---------- delete ---------- */
async function delRoom(id) {
  if (!confirm('Delete this room?')) return;
  await deleteDoc(doc(db, 'rooms', String(id)));
  await refresh();
}

async function delTenant(id) {
  if (!confirm('Delete this tenant?')) return;
  const t = tenants().find((x) => String(x.id) === String(id));
  await deleteDoc(doc(db, 'tenants', String(id)));
  if (t) await setRoomStatusByNumber(t.room, STATUS.Available);
  await refresh();
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

async function showApp() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden');
  document.getElementById('logout').classList.remove('hidden');
  if (user.role === 'tenant') {
    document.querySelectorAll('[data-admin]').forEach((b) => b.classList.add('hidden'));
    document.querySelectorAll('[data-admin-only]').forEach((b) => b.classList.add('hidden'));
  }
  document.querySelector('.view.active') || document.getElementById('dashboard').classList.add('active');
  await refresh();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const email = String(f.get('email') || '').trim().toLowerCase();
  const err = document.getElementById('login-error');
  const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };

  if (f.get('role') === 'admin') {
    try {
      await signInWithEmailAndPassword(auth, email, f.get('password') || '');
      user = { role: 'admin' };
      await showApp();
    } catch { fail('Invalid admin credentials'); }
  } else {
    const t = tenants().find((x) => (x.email || '').toLowerCase() === email && x.password === f.get('password'));
    if (t) { user = { role: 'tenant', tenantId: t.id, room: t.room }; await showApp(); }
    else fail('Tenant not found — check your email and password');
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await signOut(auth).catch(() => {});
  showLogin();
});

document.querySelectorAll('#login-form [name="role"]').forEach((s) =>
  s.addEventListener('change', () => {
    const isAdmin = s.value === 'admin';
    document.getElementById('login-pass').classList.toggle('hidden', !isAdmin);
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

(async () => {
  await refresh();
  await seed();
  await refresh();
  showLogin();
})();