import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateStudentId, validatePassword, validatePaymentScreenshot, validateTransactionNumber } from './src/validation.js';
import { verifyPayment, registrationDecision, canViewResults } from './src/registration.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(dir, 'data.json');
const UPLOADS = path.join(dir, 'uploads');
const PORT = process.env.PORT || 3000;

const MODULES = [
  'SWE302 - Software Testing & Quality Assurance',
  'DBS201 - Database Systems',
  'WEB202 - Web Application Development'
];
const RESULTS = [
  ['SWE302', 'Software Testing & Quality Assurance', 'A'],
  ['DBS201', 'Database Systems', 'B+'],
  ['WEB202', 'Web Application Development', 'A-']
];

// Passwords are stored as salt:hash, never as plain text.
const hash = (pw, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
const passwordOk = (pw, stored) => hash(pw, stored.split(':')[0]) === stored;

function seed() {
  return {
    nextId: 1,
    students: [{ id: '02240358', password: hash('Student123') }],
    staff: [
      { id: 'admin01', name: 'Administrator', role: 'admin', password: hash('Admin1234'), authorised: true },
      { id: 'T001', name: 'Karma Dorji', role: 'teacher', password: hash('Teacher123'), authorised: true },
      { id: 'T002', name: 'Sonam Choden', role: 'teacher', password: hash('Teacher123'), authorised: false },
      { id: 'T003', name: 'Pema Lhamo', role: 'teacher', password: hash('Teacher123'), authorised: false }
    ],
    payments: [],
    registrations: [{ id: 0, studentId: '02240358', module: MODULES[0], status: 'Approved' }]
  };
}

let data;
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
else { data = seed(); save(); }
fs.mkdirSync(UPLOADS, { recursive: true });

const sessions = new Map();

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const fail = (res, status, message) => send(res, status, { ok: false, message });
const ok = (res, body = {}) => send(res, 200, { ok: true, ...body });
const tuitionVerified = studentId => data.payments.some(p => p.studentId === studentId && p.status === 'Verified');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size <= 5e6) chunks.push(c); });
    req.on('end', () => {
      if (size > 5e6) return reject(Object.assign(new Error('The file is too large. Please use a screenshot under 3 MB.'), { status: 413 }));
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); }
      catch { reject(Object.assign(new Error('Bad request.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname, m = req.method;

  if (m === 'GET' && (p === '/' || p === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(dir, 'index.html')));
  }
  if (!p.startsWith('/api/')) return fail(res, 404, 'Not found.');
  const body = m === 'POST' ? await readBody(req) : {};

  // Login (no token needed)
  if (m === 'POST' && p === '/api/login/student') {
    const a = validateStudentId(String(body.id || '').trim()), b = validatePassword(String(body.password || ''));
    if (!a.valid || !b.valid) return fail(res, 400, a.valid ? b.message : a.message);
    const s = data.students.find(x => x.id === String(body.id).trim());
    if (!s || !passwordOk(body.password, s.password)) return fail(res, 401, 'Student ID or password is incorrect.');
    const token = crypto.randomBytes(16).toString('hex');
    sessions.set(token, { role: 'student', id: s.id, name: s.id });
    return ok(res, { token, role: 'student', id: s.id, name: s.id });
  }
  if (m === 'POST' && p === '/api/login/staff') {
    const id = String(body.id || '').trim(), pw = String(body.password || '');
    if (!id || !pw) return fail(res, 400, 'Staff ID and password are required.');
    const s = data.staff.find(x => x.id === id);
    if (!s || !passwordOk(pw, s.password)) return fail(res, 401, 'Staff ID or password is incorrect.');
    if (!s.authorised) return fail(res, 403, 'Your account is not authorised as a teacher. Please contact the admin.');
    const token = crypto.randomBytes(16).toString('hex');
    sessions.set(token, { role: s.role, id: s.id, name: s.name });
    return ok(res, { token, role: s.role, id: s.id, name: s.name });
  }

  // Everything below needs a logged-in user
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const user = sessions.get(token);
  if (!user) return fail(res, 401, 'Please log in first.');
  const need = role => user.role === role;
  const forbidden = () => fail(res, 403, 'You are not allowed to do this.');

  if (m === 'POST' && p === '/api/logout') { sessions.delete(token); return ok(res); }
  if (m === 'GET' && p === '/api/me') return ok(res, { role: user.role, id: user.id, name: user.name });

  // Student
  if (p === '/api/my/payments' && m === 'GET') {
    if (!need('student')) return forbidden();
    return ok(res, { payments: data.payments.filter(x => x.studentId === user.id).map(({ txn, file, status }) => ({ txn, file, status })) });
  }
  if (p === '/api/my/registrations' && m === 'GET') {
    if (!need('student')) return forbidden();
    return ok(res, { registrations: data.registrations.filter(x => x.studentId === user.id).map(({ module, status }) => ({ module, status })) });
  }
  if (p === '/api/payments' && m === 'POST') {
    if (!need('student')) return forbidden();
    const fileName = String(body.fileName || ''), txn = String(body.txn || '').trim();
    const a = validatePaymentScreenshot(fileName), b = validateTransactionNumber(txn);
    if (!a.valid) return fail(res, 400, a.message);
    if (!b.valid) return fail(res, 400, b.message);
    const bytes = Buffer.from(String(body.fileData || '').split(',').pop(), 'base64');
    if (!bytes.length) return fail(res, 400, 'The screenshot could not be read.');
    if (bytes.length > 3e6) return fail(res, 413, 'The file is too large. Please use a screenshot under 3 MB.');
    const id = data.nextId++;
    const stored = id + '-' + fileName.replace(/[^A-Za-z0-9._-]/g, '_');
    fs.writeFileSync(path.join(UPLOADS, stored), bytes);
    data.payments.push({ id, studentId: user.id, txn, file: fileName, stored, status: 'Pending' });
    save();
    return ok(res, { message: 'Payment submitted. The teacher will verify it.' });
  }
  if (p === '/api/registrations' && m === 'POST') {
    if (!need('student')) return forbidden();
    const mod = String(body.module || '');
    if (!MODULES.includes(mod)) return fail(res, 400, 'Please choose a module.');
    const exists = data.registrations.some(r => r.studentId === user.id && r.module === mod && r.status !== 'Rejected');
    const d = registrationDecision({ tuitionVerified: true, drugTestVerified: true, registrationOpen: true, alreadyRegistered: exists });
    if (!d.allowed) return fail(res, 409, d.message);
    data.registrations.push({ id: data.nextId++, studentId: user.id, module: mod, status: 'Pending' });
    save();
    return ok(res, { message: 'Registration request sent for ' + mod + '. Waiting for teacher approval.' });
  }
  if (p === '/api/results' && m === 'GET') {
    if (!need('student')) return forbidden();
    const approved = data.registrations.some(r => r.studentId === user.id && r.status === 'Approved');
    if (!canViewResults(approved)) return fail(res, 403, 'Access denied. You must be a registered student.');
    return ok(res, { message: 'Results loaded successfully.', results: RESULTS });
  }

  // Teacher
  if (p === '/api/payments' && m === 'GET') {
    if (!need('teacher')) return forbidden();
    return ok(res, { payments: data.payments.map(({ id, studentId, txn, file, status }) => ({ id, studentId, txn, file, status })) });
  }
  let x;
  if (m === 'GET' && (x = p.match(/^\/api\/payments\/(\d+)\/screenshot$/))) {
    if (!need('teacher')) return forbidden();
    const pay = data.payments.find(q => q.id === Number(x[1]));
    if (!pay) return fail(res, 404, 'Payment not found.');
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
    res.writeHead(200, { 'Content-Type': types[path.extname(pay.stored).toLowerCase()] || 'application/octet-stream' });
    return res.end(fs.readFileSync(path.join(UPLOADS, pay.stored)));
  }
  if (m === 'POST' && (x = p.match(/^\/api\/payments\/(\d+)\/(verify|reject)$/))) {
    if (!need('teacher')) return forbidden();
    const pay = data.payments.find(q => q.id === Number(x[1]));
    if (!pay) return fail(res, 404, 'Payment not found.');
    if (pay.status !== 'Pending') return fail(res, 409, 'This payment has already been checked.');
    if (x[2] === 'reject') { pay.status = 'Rejected'; save(); return ok(res, { message: 'Payment rejected.' }); }
    const v = verifyPayment(true, Boolean(pay.file && pay.txn));
    pay.status = v.complete ? 'Verified' : 'Rejected'; save();
    return ok(res, { message: v.complete ? 'Payment verified. Electronic receipt generated.' : 'Payment is incomplete.' });
  }
  if (p === '/api/registrations' && m === 'GET') {
    if (!need('teacher')) return forbidden();
    return ok(res, { registrations: data.registrations.map(r => ({ ...r, tuition: tuitionVerified(r.studentId) ? 'Verified' : 'Not verified' })) });
  }
  if (m === 'POST' && (x = p.match(/^\/api\/registrations\/(\d+)\/(approve|reject)$/))) {
    if (!need('teacher')) return forbidden();
    const r = data.registrations.find(q => q.id === Number(x[1]));
    if (!r) return fail(res, 404, 'Registration not found.');
    if (r.status !== 'Pending') return fail(res, 409, 'This request has already been decided.');
    if (x[2] === 'reject') { r.status = 'Rejected'; save(); return ok(res, { message: 'Registration rejected.' }); }
    const d = registrationDecision({ tuitionVerified: tuitionVerified(r.studentId), drugTestVerified: true, registrationOpen: true, alreadyRegistered: false });
    if (!d.allowed) return fail(res, 409, d.message);
    r.status = 'Approved'; save();
    return ok(res, { message: 'Registration approved.' });
  }

  // Admin
  if (p === '/api/staff' && m === 'GET') {
    if (!need('admin')) return forbidden();
    return ok(res, { staff: data.staff.filter(s => s.role === 'teacher').map(({ id, name, authorised }) => ({ id, name, authorised })) });
  }
  if (m === 'POST' && (x = p.match(/^\/api\/staff\/([A-Za-z0-9]+)\/toggle$/))) {
    if (!need('admin')) return forbidden();
    const s = data.staff.find(q => q.id === x[1] && q.role === 'teacher');
    if (!s) return fail(res, 404, 'Staff member not found.');
    s.authorised = !s.authorised; save();
    return ok(res, { message: s.name + (s.authorised ? ' is now an authorised teacher.' : ' is no longer authorised.'), authorised: s.authorised });
  }
  if (p === '/api/reset' && m === 'POST') {
    if (!need('admin')) return forbidden();
    data = seed(); save();
    fs.rmSync(UPLOADS, { recursive: true, force: true }); fs.mkdirSync(UPLOADS, { recursive: true });
    return ok(res, { message: 'Test data has been reset.' });
  }

  return fail(res, 404, 'Not found.');
}

http.createServer(async (req, res) => {
  try { await route(req, res); }
  catch (e) { fail(res, e.status || 500, e.status ? e.message : 'Server error.'); }
}).listen(PORT, () => console.log('Server running at http://localhost:' + PORT));
