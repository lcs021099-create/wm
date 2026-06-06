// 內建記憶體後端（Vercel serverless）。把原 mock-backend 邏輯搬進 Next.js API 路由，
// 讓前端同源呼叫 /api/...，無需外部後端。
// ⚠️ 資料存在記憶體，serverless 冷啟動或多實例會重置，僅供測試 OCR / 流程用。
//
// 註：具體路由 /api/ocr-label 由 pages/api/ocr-label.js 處理（優先於此 catch-all）。

// 用 globalThis 讓資料在熱實例 / 熱重載間保留
const g = globalThis;
if (!g.__memdb) {
  g.__memdb = {
    users: [
      { id: 1, username: 'LCS', name: '管理員', role: 'admin', password: '12345678', approved: 1, active: 1, created_at: '2026-01-01' },
      { id: 2, username: 'sales', name: '業務員小陳', role: 'staff', password: '123456', approved: 1, active: 1, created_at: '2026-02-01' },
    ],
    pending: [],
    nextUserId: 100,
    quotations: [],
    nextQuotationId: 1,
    pallets: [],
    nextPalletId: 1,
    tokens: {},
  };
}
const db = g.__memdb;

const getIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
const pub = (u) => ({
  id: u.id, username: u.username, name: u.name, role: u.role, active: u.active, approved: u.approved, created_at: u.created_at,
  login_count: u.login_count || 0, last_login_at: u.last_login_at || null, last_login_ip: u.last_login_ip || null, total_seconds: u.total_seconds || 0,
});

// 無狀態 token：把 user id 編進 token，避免冷啟動 session 遺失
const makeToken = (u) => 'tok_' + u.id + '_' + Date.now();
const userOf = (req) => {
  const t = (req.headers['authorization'] || '').replace('Bearer ', '');
  const sess = db.tokens[t];
  if (sess) return db.users.find((u) => u.id === sess.uid) || null;
  // fallback：從 tok_<id>_ 解析
  const m = t.match(/^tok_(\d+)_/);
  if (m) return db.users.find((u) => u.id === +m[1]) || null;
  return null;
};

export default async function handler(req, res) {
  const slug = req.query.slug || [];
  const path = '/api/' + (Array.isArray(slug) ? slug.join('/') : slug);
  const m = req.method;
  const q = req.query;
  const data = (m === 'POST' || m === 'PUT') ? (req.body || {}) : {};
  const re = (p) => path.match(p);
  let mm;

  try {
    // -------- AUTH --------
    if (path === '/api/auth/login' && m === 'POST') {
      const u = db.users.find((x) => x.username.toLowerCase() === String(data.username || '').toLowerCase() && x.password === data.password);
      if (!u) return res.status(401).json({ error: '帳號或密碼錯誤' });
      if (!u.approved) return res.status(403).json({ error: '帳號尚待管理員批准' });
      if (!u.active) return res.status(403).json({ error: '帳號已被停用' });
      u.login_count = (u.login_count || 0) + 1;
      u.last_login_at = new Date().toISOString();
      u.last_login_ip = getIp(req);
      const t = makeToken(u);
      db.tokens[t] = { uid: u.id, loginAt: Date.now() };
      return res.status(200).json({ token: t, user: pub(u) });
    }
    if (path === '/api/auth/register' && m === 'POST') {
      if (!data.username || !data.password || !data.name) return res.status(400).json({ error: '請填寫所有欄位' });
      const exists = [...db.users, ...db.pending].some((x) => x.username.toLowerCase() === data.username.toLowerCase());
      if (exists) return res.status(409).json({ error: '此帳號已存在' });
      db.pending.push({ id: db.nextUserId++, username: data.username, name: data.name, role: 'staff', password: data.password, approved: 0, active: 1, created_at: new Date().toISOString().slice(0, 10) });
      return res.status(201).json({ message: '註冊成功，待管理員批准' });
    }
    if (path === '/api/auth/me' && m === 'GET') {
      const u = userOf(req);
      return u ? res.status(200).json(pub(u)) : res.status(401).json({ error: '未登入' });
    }
    if (path === '/api/auth/logout' && m === 'POST') {
      const t = (req.headers['authorization'] || '').replace('Bearer ', '');
      delete db.tokens[t];
      return res.status(200).json({ message: 'ok' });
    }
    if (path === '/api/auth/change-password' && m === 'POST') {
      const u = userOf(req);
      if (!u) return res.status(401).json({ error: '未登入' });
      if (u.password !== data.oldPassword) return res.status(400).json({ error: '現有密碼錯誤' });
      u.password = data.newPassword;
      return res.status(200).json({ message: 'ok' });
    }

    // -------- USERS --------
    if (path === '/api/users' && m === 'GET') return res.status(200).json(db.users.map(pub));
    if (path === '/api/users/pending' && m === 'GET') return res.status(200).json(db.pending.map(pub));
    if ((mm = re(/^\/api\/users\/(\d+)\/approve$/)) && m === 'POST') {
      const i = db.pending.findIndex((x) => x.id === +mm[1]);
      if (i < 0) return res.status(404).json({ error: '找不到申請' });
      const u = db.pending.splice(i, 1)[0]; u.approved = 1; db.users.push(u);
      return res.status(200).json({ message: 'approved' });
    }
    if ((mm = re(/^\/api\/users\/(\d+)\/reject$/)) && m === 'POST') {
      db.pending = db.pending.filter((x) => x.id !== +mm[1]);
      return res.status(200).json({ message: 'rejected' });
    }
    if (path === '/api/users' && m === 'POST') {
      const nu = { id: db.nextUserId++, username: data.username, name: data.name, role: data.role || 'staff', password: data.password, approved: 1, active: 1, created_at: new Date().toISOString().slice(0, 10) };
      db.users.push(nu); return res.status(201).json(pub(nu));
    }
    if ((mm = re(/^\/api\/users\/(\d+)$/)) && m === 'PUT') {
      const u = db.users.find((x) => x.id === +mm[1]);
      if (!u) return res.status(404).json({ error: 'not found' });
      if (data.name !== undefined) u.name = data.name;
      if (data.role !== undefined) u.role = data.role;
      if (data.active !== undefined) u.active = data.active;
      if (data.password) u.password = data.password;
      return res.status(200).json(pub(u));
    }
    if ((mm = re(/^\/api\/users\/(\d+)$/)) && m === 'DELETE') {
      db.users = db.users.filter((x) => x.id !== +mm[1]);
      return res.status(200).json({ message: 'deleted' });
    }

    // -------- QUOTATIONS --------
    if (path === '/api/quotations' && m === 'GET') return res.status(200).json(db.quotations);
    if ((mm = re(/^\/api\/quotations\/(\d+)$/)) && m === 'GET') {
      const x = db.quotations.find((y) => y.id === +mm[1]);
      return x ? res.status(200).json(x) : res.status(404).json({ error: 'not found' });
    }
    if (path === '/api/quotations' && m === 'POST') {
      const nq = { id: db.nextQuotationId++, created_at: new Date().toISOString(), ...data };
      db.quotations.push(nq); return res.status(201).json(nq);
    }
    if ((mm = re(/^\/api\/quotations\/(\d+)$/)) && m === 'PUT') {
      const x = db.quotations.find((y) => y.id === +mm[1]);
      if (!x) return res.status(404).json({ error: 'not found' });
      Object.assign(x, data); return res.status(200).json(x);
    }
    if ((mm = re(/^\/api\/quotations\/(\d+)$/)) && m === 'DELETE') {
      db.quotations = db.quotations.filter((y) => y.id !== +mm[1]);
      return res.status(200).json({ message: 'deleted' });
    }

    // -------- PALLETS --------
    if (path === '/api/pallets/stats' && m === 'GET') {
      const inStock = db.pallets.filter((x) => x.status === 'in_stock');
      return res.status(200).json({ total: db.pallets.length, inStock: inStock.length, gradeA: inStock.filter((x) => x.quality_grade === 'A').length, gradeB: inStock.filter((x) => x.quality_grade === 'B').length, gradeC: inStock.filter((x) => x.quality_grade === 'C').length, ungraded: inStock.filter((x) => !x.quality_grade).length });
    }
    if (path === '/api/pallets' && m === 'GET') {
      let list = db.pallets.slice();
      if (q.search) { const s = String(q.search).toLowerCase(); list = list.filter((x) => ((x.pallet_no || '') + (x.paper_type || '') + (x.batch_code || '') + (x.commission_no || '') + (x.barcode || '')).toLowerCase().includes(s)); }
      if (q.status) list = list.filter((x) => x.status === q.status);
      return res.status(200).json(list.reverse());
    }
    if ((mm = re(/^\/api\/pallets\/barcode\/(.+)$/)) && m === 'GET') {
      const p = db.pallets.find((x) => x.barcode === decodeURIComponent(mm[1]));
      return res.status(200).json(p || null);
    }
    if ((mm = re(/^\/api\/pallets\/(\d+)\/out$/)) && m === 'POST') {
      const p = db.pallets.find((x) => x.id === +mm[1]);
      if (!p) return res.status(404).json({ error: 'not found' });
      p.status = 'out';
      p.transactions = p.transactions || [];
      p.transactions.unshift({ id: Date.now(), type: 'out', notes: data.notes || '', created_at: new Date().toISOString() });
      return res.status(200).json(p);
    }
    if ((mm = re(/^\/api\/pallets\/(\d+)$/)) && m === 'GET') {
      const p = db.pallets.find((x) => x.id === +mm[1]);
      return p ? res.status(200).json(p) : res.status(404).json({ error: 'not found' });
    }
    if (path === '/api/pallets' && m === 'POST') {
      const u = userOf(req);
      const np = { id: db.nextPalletId++, status: 'in_stock', created_at: new Date().toISOString(), created_by: u?.username || 'mock', transactions: [{ id: Date.now(), type: 'in', notes: '入庫', created_at: new Date().toISOString() }], ...data };
      db.pallets.push(np);
      return res.status(201).json(np);
    }
    if ((mm = re(/^\/api\/pallets\/(\d+)$/)) && m === 'PUT') {
      const p = db.pallets.find((x) => x.id === +mm[1]);
      if (!p) return res.status(404).json({ error: 'not found' });
      Object.assign(p, data);
      return res.status(200).json(p);
    }
    if ((mm = re(/^\/api\/pallets\/(\d+)$/)) && m === 'DELETE') {
      db.pallets = db.pallets.filter((x) => x.id !== +mm[1]);
      return res.status(200).json({ message: 'deleted' });
    }

    return res.status(404).json({ error: `Not found: ${m} ${path}` });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
