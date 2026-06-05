import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { authAPI, usersAPI, quotationsAPI, palletsAPI } from '../lib/api';

const CO = {
  wuming:   { zh: '東莞市無名紙業有限公司', en: 'DONGGUAN WUMING PAPER CO.,LTD', email: 'wuming@prostandard.com.hk', logo: '/logo.png' },
  standard: { zh: '標準紙行有限公司',       en: 'PRO-STANDARD PAPER CO.,LTD',    email: 'paper@prostandard.com.hk', logo: '' },
  pangu:    { zh: '東莞市盤古紙業有限公司', en: 'DONGGUAN PAN GU PAPER CO.,LTD',  email: 'pangu@prostandard.com.hk', logo: '' },
};

const SENDERS = {
  '羅志成': '5139 3389 / 139 2298 7974',
  '廖國強': '6176 2929 / 136 0027 1357',
  '李政諭': '138 2927 8356',
};

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const formatDuration = (s) => {
  s = Math.round(s || 0);
  if (s < 60) return s + ' 秒';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' 分鐘';
  const h = Math.floor(m / 60);
  return h + ' 小時 ' + (m % 60) + ' 分';
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [form, setForm] = useState({
    company: 'wuming', to: '', attn: '', date: '', from: '羅志成', phone: SENDERS['羅志成'],
    remarks: '', currency: '人民幣含稅價', payment: '月結30天', min: '2', internalNote: '',
  });
  const [products, setProducts] = useState([{ item: '', size: '', qty: '', price: '' }]);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [actingId, setActingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const pageRef = useRef(null);
  const wrapRef = useRef(null);
  // 庫存
  const [pallets, setPallets] = useState([]);
  const [palletStats, setPalletStats] = useState(null);
  const [palletSearch, setPalletSearch] = useState('');
  const [palletFilter, setPalletFilter] = useState('');
  const [palletDetail, setPalletDetail] = useState(null);
  const [scanBarcode, setScanBarcode] = useState('');
  const [scanForm, setScanForm] = useState({ supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '', format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '', sheets: '', production_date: '', shipment_date: '', origin: '', quality_grade: '', quality_notes: '', location: '' });
  const [scanStep, setScanStep] = useState('scan'); // scan, form, done
  const scannerRef = useRef(null);

  // 登入檢查 + 初始化
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    const parsed = u ? JSON.parse(u) : null;
    if (parsed) setUser(parsed);
    setForm((f) => ({ ...f, date: todayStr() }));
    quotationsAPI.list().then((r) => setRecords(r.data || [])).catch(() => {});
    if (parsed?.role === 'admin') {
      usersAPI.pending().then((r) => setPending(r.data)).catch(() => {});
      usersAPI.list().then((r) => setUsers(r.data)).catch(() => {});
    }
  }, []);

  const loadRecords = () => quotationsAPI.list().then((r) => setRecords(r.data || [])).catch(() => {});
  const loadPending = () => usersAPI.pending().then((r) => setPending(r.data)).catch(() => {});
  const loadUsers = () => usersAPI.list().then((r) => setUsers(r.data)).catch(() => {});
  const loadPallets = async () => {
    try {
      const [s, p] = await Promise.all([palletsAPI.stats(), palletsAPI.list({ search: palletSearch, status: palletFilter || undefined })]);
      setPalletStats(s.data); setPallets(p.data);
    } catch {}
  };
  const loadPalletDetail = async (id) => {
    try { const r = await palletsAPI.get(id); setPalletDetail(r.data); } catch {}
  };

  // 修改密碼
  const changePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) return setPwMsg('❌ 請填寫現有密碼與新密碼');
    if (pwForm.newPassword !== pwForm.confirm) return setPwMsg('❌ 新密碼與確認不符');
    if (pwForm.newPassword.length < 6) return setPwMsg('❌ 新密碼至少需 6 個字元');
    try {
      await authAPI.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      setPwMsg('✅ 密碼已成功更新');
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setPwMsg('❌ ' + (err.response?.data?.error || '更新失敗')); }
  };

  // 管理員審批
  const approveUser = async (id) => {
    setActingId(id);
    try { await usersAPI.approve(id); await loadPending(); await loadUsers(); }
    catch (err) { alert(err.response?.data?.error || '批准失敗'); }
    finally { setActingId(null); }
  };
  const rejectUser = async (id) => {
    if (!confirm('確定拒絕此註冊申請？')) return;
    setActingId(id);
    try { await usersAPI.reject(id); await loadPending(); }
    catch (err) { alert(err.response?.data?.error || '拒絕失敗'); }
    finally { setActingId(null); }
  };
  const deleteUser = async (u) => {
    if (u.id === user.id) return alert('不能刪除自己的帳號');
    if (!confirm(`確定刪除用戶「${u.name}」(${u.username})？`)) return;
    setActingId(u.id);
    try { await usersAPI.delete(u.id); await loadUsers(); }
    catch (err) { alert(err.response?.data?.error || '刪除失敗'); }
    finally { setActingId(null); }
  };
  const resetUserPassword = async (u) => {
    const np = prompt(`為「${u.name}」(${u.username}) 設定新密碼（至少 6 個字元）：`);
    if (np === null) return;
    if (np.length < 6) return alert('密碼至少需 6 個字元');
    try { await usersAPI.update(u.id, { password: np }); alert(`✅ 已更新「${u.name}」的密碼`); }
    catch (err) { alert(err.response?.data?.error || '更新失敗'); }
  };

  // 表單與產品
  const setField = (k, val) => setForm((f) => ({ ...f, [k]: val }));
  const onFromChange = (name) => setForm((f) => ({ ...f, from: name, phone: SENDERS[name] || '' }));
  const addProduct = () => setProducts((p) => [...p, { item: '', size: '', qty: '', price: '' }]);
  const delProduct = (i) => setProducts((p) => (p.length <= 1 ? (alert('最少保留一項產品'), p) : p.filter((_, idx) => idx !== i)));
  const updProduct = (i, k, val) => setProducts((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: val } : row)));

  // A4 預覽縮放置中
  const scalePreview = useCallback(() => {
    const wrap = wrapRef.current, page = pageRef.current;
    if (!wrap || !page) return;
    const a4W = 794; // 210mm ≈ 794px @96dpi
    const avail = wrap.clientWidth - 32;
    const scale = Math.min(1, avail / a4W);
    page.style.transformOrigin = 'top left';
    page.style.transform = `scale(${scale})`;
    page.style.marginLeft = (avail - a4W * scale) / 2 + 'px';
    const origH = page.scrollHeight;
    page.style.marginBottom = origH * scale - origH + 'px';
  }, []);

  useEffect(() => { scalePreview(); }, [section, products, form, scalePreview]);
  useEffect(() => {
    window.addEventListener('resize', scalePreview);
    return () => window.removeEventListener('resize', scalePreview);
  }, [scalePreview]);

  // 保存 / 載入 / 刪除
  const saveRecord = async (mode) => {
    if (!form.to.trim()) { alert('請先填寫「致 (To)」公司名稱再保存。'); return; }
    const data = {
      to: form.to.trim(), attn: form.attn, date: form.date,
      fromName: form.from, fromPhone: form.phone, company: form.company,
      currency: form.currency, payment: form.payment, min: form.min, remarks: form.remarks,
      internalNote: form.internalNote,
      products: products.map((p) => ({ ...p })),
      by: user?.name || user?.username || '—',
    };
    try {
      if (mode === 'update' && editingId) {
        await quotationsAPI.update(editingId, data);
        alert('✅ 已修正原報價：' + data.to);
      } else {
        await quotationsAPI.create(data);
        alert('✅ 已新建報價：' + data.to);
      }
      await loadRecords();
      setEditingId(null);
      setSection('records');
    } catch (err) {
      alert('❌ 儲存失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const loadRecord = (id) => {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    setForm({
      company: r.company, to: r.to, attn: r.attn, date: r.date, from: r.fromName,
      phone: r.fromPhone, remarks: r.remarks, currency: r.currency, payment: r.payment, min: r.min,
      internalNote: r.internalNote || '',
    });
    setProducts(r.products && r.products.length ? r.products.map((p) => ({ ...p })) : [{ item: '', size: '', qty: '', price: '' }]);
    setEditingId(id);
    setSection('quotation');
  };

  const newQuote = () => {
    setForm({ company: 'wuming', to: '', attn: '', date: todayStr(), from: '羅志成', phone: SENDERS['羅志成'], remarks: '', currency: '人民幣含稅價', payment: '月結30天', min: '2', internalNote: '' });
    setProducts([{ item: '', size: '', qty: '', price: '' }]);
    setEditingId(null);
    setSection('quotation');
  };

  const deleteRecord = async (id) => {
    if (!confirm('確定刪除此報價記錄？')) return;
    try {
      await quotationsAPI.delete(id);
      await loadRecords();
    } catch (err) {
      alert('❌ 刪除失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const doPrint = () => window.print();

  const doLogout = async () => {
    if (!confirm('確定登出？')) return;
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  const co = CO[form.company];
  const paymentText = `${form.currency}，${form.payment}`;
  const pastCompanies = [...new Set((records || []).map((r) => r.to).filter(Boolean))];
  const pastAttns = [...new Set((records || []).map((r) => r.attn).filter(Boolean))];
  const pastItems = [...new Set((records || []).flatMap((r) => (r.products || []).map((p) => p.item)).filter(Boolean))];
  const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = terms.length === 0
    ? records
    : records.filter((r) => {
        const haystack = [
          r.to, r.attn, r.fromName,
          ...(r.products || []).map((p) => p.item),
        ].filter(Boolean).join(' ').toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });

  // A4 報價單內容（預覽與列印共用）
  const quoteBody = (
    <>
      <div className="q-header">
        {co.logo ? <img src={co.logo} className="q-logo" alt="logo" /> : null}
        <div className="q-head-text">
          <p className="co-zh">{co.zh}</p>
          <p className="co-en">{co.en}</p>
          <div className="co-det">
            國內公司: 東莞市虎門鎮連升中路億洲商務中心605室 &nbsp; 工廠: 東莞市洪梅鎮河西工業大道<br />
            香港公司: 標準紙行有限公司 香港新界荃灣沙咀道十一至十九號, 達貿中心五樓三至五室<br />
            Tel: (769) 8555 2197 &nbsp; (769) 8122 4183 &nbsp; (852) 2498 9638 &nbsp; Email: {co.email}
          </div>
        </div>
      </div>
      <div className="meta-info">
        <div className="meta-left">
          <div className="meta-row"><span className="meta-lbl">致:</span><span>{form.to}</span></div>
          <div className="meta-row"><span className="meta-lbl">收件:</span><span>{form.attn}</span></div>
        </div>
        <div className="meta-right">
          <div className="meta-row"><span className="meta-lbl">自:</span><span>{form.from}</span></div>
          <div className="meta-row"><span className="meta-lbl" /><span>{form.phone}</span></div>
          <div className="meta-row"><span className="meta-lbl">日期:</span><span>{form.date}</span></div>
        </div>
      </div>
      <div className="q-title">報 價 單</div>
      <table className="q-table">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>品名</th>
            <th style={{ width: '20%' }}>尺寸</th>
            <th style={{ width: '20%' }}>數量</th>
            <th style={{ width: '20%' }}>噸價</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i}>
              <td>{p.item}</td><td>{p.size}</td><td>{p.qty}</td><td>{p.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {form.remarks ? <div className="q-remarks">{form.remarks}</div> : null}
      <div className="q-footer">
        <div>{form.min || '2'} 噸起送貨，不夠 {form.min || '2'} 噸須自取。</div>
        <div>訂單抬頭：{co.zh}</div>
        <div className="hl">*** {paymentText} ***</div>
      </div>
    </>
  );

  const navLink = (id, icon, label) => {
    const isActive = section === id;
    return (
      <button type="button" className={`menu-btn${isActive ? ' is-on' : ''}`} onClick={() => setSection(id)}>
        <span className="mb-icon">{icon}</span>
        <span className="mb-text">{label}</span>
        {isActive && <span className="mb-dot" />}
      </button>
    );
  };
  const bnItem = (id, icon, label) => (
    <button className={`bn-item${section === id ? ' is-on' : ''}`} onClick={() => setSection(id)}>
      <span className="bn-icon">{icon}</span><span className="bn-label">{label}</span>
    </button>
  );

  return (
    <div className="app active">
      {/* Desktop Sidebar */}
      <div className="sidebar">
        <div className="sb-head">
          <div className="sb-logo">📊</div>
          <div>
            <h2>報價系統</h2>
            <p className="sb-sub">Quotation System</p>
          </div>
        </div>
        <div className="sb-user">
          <div className="sb-avatar">{(user.name || user.username || 'U')[0]}</div>
          <div>
            <div className="sb-uname">{user.name || user.username}</div>
            <div className="sb-role">{user.role === 'admin' ? '管理員' : '業務員'}</div>
          </div>
        </div>
        <div className="menu-group">
          <div className="menu-label">主選單</div>
          {navLink('dashboard', '🏠', '儀表板')}
          {navLink('quotation', '✍️', '生成報價')}
          {navLink('records', '📋', '報價紀錄')}
          {navLink('inventory', '📦', '庫存管理')}
          {navLink('password', '🔑', '修改密碼')}
          {user.role === 'admin' && navLink('users', '👥', `用戶管理${pending.length ? ` (${pending.length})` : ''}`)}
        </div>
        <button className="logout-btn" onClick={doLogout}>🚪 登出</button>
      </div>

      {/* Main */}
      <div className="main">
        {/* DASHBOARD */}
        {section === 'dashboard' && (
          <div className="section active">
            <div className="section-title">👋 歡迎，{user.name || user.username}</div>
            <div className="dash-grid">
              <div className="dash-card" onClick={newQuote}>
                <div className="icon">✍️</div><h3>生成新報價</h3><p>建立並列印新的報價單</p>
              </div>
              <div className="dash-card" onClick={() => setSection('records')}>
                <div className="icon">📋</div><h3>查閱報價紀錄</h3><p>查看過往所有報價單</p>
              </div>
              <div className="dash-card">
                <div className="icon">📊</div><h3>{records.length} 份報價</h3><p>系統內共有報價單</p>
              </div>
              <div className="dash-card" onClick={() => { setSection('inventory'); loadPallets(); }}>
                <div className="icon">📦</div><h3>庫存管理</h3><p>掃碼入庫、品質分級、出入庫</p>
              </div>
              <div className="dash-card" onClick={() => { setScanStep('scan'); setScanBarcode(''); setScanForm({ supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '', format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '', sheets: '', production_date: '', shipment_date: '', origin: '', quality_grade: '', quality_notes: '', location: '' }); setSection('scan'); }}>
                <div className="icon">📷</div><h3>掃碼入庫</h3><p>用手機相機掃標籤條碼</p>
              </div>
              <div className="dash-card" onClick={() => setSection('password')}>
                <div className="icon">🔑</div><h3>修改密碼</h3><p>更改你的登入密碼</p>
              </div>
              {user.role === 'admin' && (
                <div className="dash-card" onClick={() => setSection('users')}>
                  <div className="icon">👥</div><h3>用戶管理{pending.length ? ` (${pending.length})` : ''}</h3><p>審批註冊、刪除用戶、改密碼</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUOTATION */}
        {section === 'quotation' && (
          <div className="section active">
            <div className="section-title">✍️ 生成報價單</div>

            <div className="panel">
              <h3>基本資訊</h3>
              <div className="form-row">
                <div className="field-g">
                  <label>抬頭公司</label>
                  <select value={form.company} onChange={(e) => setField('company', e.target.value)}>
                    <option value="wuming">東莞市無名紙業有限公司</option>
                    <option value="standard">標準紙行有限公司</option>
                    <option value="pangu">東莞市盤古紙業有限公司</option>
                  </select>
                </div>
                <div className="field-g">
                  <label>致 (To) 客戶公司</label>
                  <input type="text" placeholder="客戶公司名稱" list="past-companies" autoComplete="off" value={form.to} onChange={(e) => setField('to', e.target.value)} />
                  <datalist id="past-companies">
                    {pastCompanies.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="field-g">
                  <label>收件人 (Attn)</label>
                  <input type="text" placeholder="收件人姓名" list="past-attns" autoComplete="off" value={form.attn} onChange={(e) => setField('attn', e.target.value)} />
                  <datalist id="past-attns">
                    {pastAttns.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 10 }}>
                <div className="field-g">
                  <label>日期</label>
                  <input type="text" value={form.date} onChange={(e) => setField('date', e.target.value)} />
                </div>
                <div className="field-g">
                  <label>發件人 (From)</label>
                  <select value={form.from} onChange={(e) => onFromChange(e.target.value)}>
                    <option value="羅志成">羅志成</option>
                    <option value="廖國強">廖國強</option>
                    <option value="李政諭">李政諭</option>
                  </select>
                </div>
                <div className="field-g">
                  <label>聯絡電話</label>
                  <input type="text" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="panel">
              <h3>產品清單</h3>
              <div>
                {products.map((p, i) => (
                  <div className="prod-row" key={i}>
                    <div className="prod-fields">
                      <div className="field-g prod-name">
                        <label>品名</label>
                        <input type="text" placeholder="產品名稱" list="past-items" autoComplete="off" value={p.item} onChange={(e) => updProduct(i, 'item', e.target.value)} />
                      </div>
                      <div className="field-g"><label>尺寸</label><input type="text" placeholder="如 787×1092" value={p.size} onChange={(e) => updProduct(i, 'size', e.target.value)} /></div>
                      <div className="field-g"><label>數量</label><input type="text" placeholder="如 5噸" value={p.qty} onChange={(e) => updProduct(i, 'qty', e.target.value)} /></div>
                      <div className="field-g"><label>噸價</label><input type="text" placeholder="如 3800" value={p.price} onChange={(e) => updProduct(i, 'price', e.target.value)} /></div>
                    </div>
                    <button className="del-btn" onClick={() => delProduct(i)}>🗑 刪除此項目</button>
                  </div>
                ))}
              </div>
              <button className="btn-add-prod" onClick={addProduct}>➕ 新增產品項目</button>
              <datalist id="past-items">
                {pastItems.map((it) => <option key={it} value={it} />)}
              </datalist>
            </div>

            <div className="panel">
              <h3>備註與條款</h3>
              <div className="form-row">
                <div className="field-g" style={{ gridColumn: '1/-1' }}>
                  <label>備註事項（留空則不顯示）</label>
                  <textarea placeholder="如有特殊備註，請在此填寫..." value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 10 }}>
                <div className="field-g">
                  <label>幣種與稅項</label>
                  <select value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
                    <option value="人民幣含稅價">人民幣含稅價</option>
                    <option value="人民幣不含稅價">人民幣不含稅價</option>
                    <option value="港幣">港幣</option>
                    <option value="美金">美金</option>
                  </select>
                </div>
                <div className="field-g">
                  <label>付款方式</label>
                  <select value={form.payment} onChange={(e) => setField('payment', e.target.value)}>
                    <option value="款到發貨">款到發貨</option>
                    <option value="貨到付款">貨到付款</option>
                    <option value="當月結">當月結</option>
                    <option value="月結30天">月結30天</option>
                    <option value="月結60天">月結60天</option>
                    <option value="月結90天">月結90天</option>
                  </select>
                </div>
                <div className="field-g">
                  <label>起送噸數</label>
                  <input type="number" step="0.1" value={form.min} onChange={(e) => setField('min', e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 10 }}>
                <div className="field-g" style={{ gridColumn: '1/-1' }}>
                  <label>🔒 公司內部備註（只供同事查看報價紀錄，不會出現在報價單／列印）</label>
                  <textarea placeholder="例如：成本、議價空間、客戶背景…（客戶看不到）" value={form.internalNote} onChange={(e) => setField('internalNote', e.target.value)} style={{ background: '#fff8e1' }} />
                </div>
              </div>
              <div className="action-row" style={{ marginTop: 16 }}>
                {editingId ? (
                  <>
                    <button className="btn-save" onClick={() => saveRecord('update')}>✏️ 修正報價</button>
                    <button className="btn-save" style={{ background: '#5c6bc0' }} onClick={() => saveRecord('new')}>➕ 另存新報價</button>
                  </>
                ) : (
                  <button className="btn-save" onClick={() => saveRecord('new')}>💾 保存至紀錄</button>
                )}
                <button className="btn-print" onClick={doPrint}>🖨️ 列印 / PDF</button>
              </div>
            </div>

            {/* LIVE PREVIEW */}
            <div className="panel" style={{ padding: 14 }}>
              <h3>📄 即時預覽</h3>
              <div className="preview-wrap" ref={wrapRef}>
                <div className="page" ref={pageRef}>{quoteBody}</div>
              </div>
            </div>
          </div>
        )}

        {/* RECORDS */}
        {section === 'records' && (
          <div className="section active">
            <div className="section-title">📋 報價紀錄</div>
            <div className="search-bar">
              <input className="search-input" type="search" placeholder="🔍 搜尋公司名、品名（可組合，空格分隔）…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filtered.length === 0 ? (
              <div className="empty">
                暫無報價紀錄<br />
                <span style={{ fontSize: 13, color: '#ddd' }}>完成報價後點擊「保存至紀錄」即可儲存</span>
              </div>
            ) : (
              [...filtered].reverse().map((r) => {
                const itemStr = (r.products || [])
                  .filter((p) => p.item || p.price)
                  .map((p) => `${p.item || ''}${p.price ? ' ' + p.price : ''}`.trim())
                  .join('、');
                return (
                  <div className="rec-card" key={r.id}>
                    <div className="rec-top">
                      <span className="rec-co">{r.to}</span>
                      <span className="rec-date">{r.date || ''}</span>
                    </div>
                    <div className="rec-meta">收件: {r.attn || '—'} &nbsp;|&nbsp; 發件: {r.fromName || '—'} &nbsp;|&nbsp; 儲存: {r.by || '—'}</div>
                    {itemStr ? <div className="rec-items">📦 {itemStr}{r.currency ? `（${r.currency}）` : ''}</div> : null}
                    {r.internalNote ? <div className="rec-items" style={{ color: '#e65100', fontStyle: 'normal', background: '#fff8e1', padding: '6px 10px', borderRadius: 6 }}>🔒 內部備註：{r.internalNote}</div> : null}
                    <div className="rec-actions">
                      <button className="rec-load" onClick={() => loadRecord(r.id)}>📂 載入編輯</button>
                      <button className="rec-del" onClick={() => deleteRecord(r.id)}>🗑</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {section === 'password' && (
          <div className="section active">
            <div className="section-title">🔑 修改密碼</div>
            <div className="panel">
              <h3>更改登入密碼</h3>
              <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="field-g">
                  <label>現有密碼</label>
                  <input type="password" value={pwForm.oldPassword} onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })} />
                </div>
                <div className="field-g">
                  <label>新密碼（至少 6 個字元）</label>
                  <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                </div>
                <div className="field-g">
                  <label>確認新密碼</label>
                  <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                </div>
              </div>
              {pwMsg && <p style={{ fontSize: 13, marginTop: 12, color: pwMsg.startsWith('✅') ? '#2e7d32' : '#e53935' }}>{pwMsg}</p>}
              <div className="action-row" style={{ marginTop: 14 }}>
                <button className="btn-save" onClick={changePassword}>💾 更新密碼</button>
              </div>
            </div>
          </div>
        )}

        {/* USER MANAGEMENT (admin only) */}
        {section === 'users' && user.role === 'admin' && (
          <div className="section active">
            <div className="section-title">👥 用戶管理</div>

            {/* 待批准申請 */}
            <div className="panel">
              <h3>待批准的註冊申請（{pending.length}）</h3>
              {pending.length === 0 ? (
                <div className="empty" style={{ padding: '24px 0' }}>
                  目前沒有待批准的申請<br />
                  <span style={{ fontSize: 13, color: '#ddd' }}>有新用戶在登入頁註冊後會出現在這裡</span>
                </div>
              ) : (
                pending.map((u) => (
                  <div className="rec-card" key={u.id} style={{ marginBottom: 10 }}>
                    <div className="rec-top">
                      <span className="rec-co">
                        {u.name} <span style={{ fontSize: 13, color: '#999', fontWeight: 400 }}>({u.username})</span>
                      </span>
                      <span className="rec-date">{u.created_at || ''}</span>
                    </div>
                    <div className="rec-actions">
                      <button className="rec-load" disabled={actingId === u.id} style={{ background: '#2e7d32' }} onClick={() => approveUser(u.id)}>
                        {actingId === u.id ? '處理中…' : '✓ 批准'}
                      </button>
                      <button className="rec-del" disabled={actingId === u.id} onClick={() => rejectUser(u.id)}>✕ 拒絕</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 現有用戶 */}
            <div className="panel">
              <h3>現有用戶（{users.length}）</h3>
              {users.length === 0 ? (
                <div className="empty" style={{ padding: '24px 0' }}>尚無用戶資料</div>
              ) : (
                users.map((u) => (
                  <div className="rec-card" key={u.id} style={{ marginBottom: 10 }}>
                    <div className="rec-top">
                      <span className="rec-co">
                        {u.name} <span style={{ fontSize: 13, color: '#999', fontWeight: 400 }}>({u.username})</span>
                        {u.id === user.id && <span style={{ fontSize: 12, color: '#667eea', marginLeft: 6 }}>（你）</span>}
                      </span>
                      <span className="rec-date">{u.role === 'admin' ? '管理員' : '業務員'}</span>
                    </div>
                    <div className="rec-meta" style={{ fontSize: 12 }}>
                      🔢 {u.login_count || 0} 次 &nbsp;·&nbsp; 🕒 {u.last_login_at ? new Date(u.last_login_at).toLocaleString('zh-HK') : '—'} &nbsp;·&nbsp; 🌐 {u.last_login_ip || '—'}
                    </div>
                    <div className="rec-actions">
                      <button className="rec-load" disabled={actingId === u.id} onClick={() => resetUserPassword(u)}>🔑 改密碼</button>
                      <button className="rec-del" disabled={actingId === u.id || u.id === user.id} onClick={() => deleteUser(u)}>
                        {actingId === u.id ? '…' : '🗑 刪除'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {section === 'inventory' && (
          <div className="section active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>📦 庫存管理</div>
              <button className="btn-save" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => { setScanStep('scan'); setScanBarcode(''); setScanForm({ supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '', format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '', sheets: '', production_date: '', shipment_date: '', origin: '', quality_grade: '', quality_notes: '', location: '' }); setSection('scan'); }}>📷 掃碼入庫</button>
            </div>
            {palletStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px,1fr))', gap: 8, marginBottom: 14 }}>
                {[{ l: '在庫', v: palletStats.inStock, c: '#667eea' }, { l: 'A 優良', v: palletStats.gradeA, c: '#2e7d32' }, { l: 'B 正常', v: palletStats.gradeB, c: '#d4851a' }, { l: 'C 次品', v: palletStats.gradeC, c: '#e53935' }, { l: '未分級', v: palletStats.ungraded, c: '#999' }].map(s => (
                  <div key={s.l} className="panel" style={{ textAlign: 'center', padding: '12px 8px', marginBottom: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="search-bar">
              <input className="search-input" type="search" placeholder="🔍 搜尋板號、紙種、批次碼…" value={palletSearch} onChange={e => setPalletSearch(e.target.value)} onKeyUp={() => loadPallets()} />
            </div>
            <div style={{ display: 'flex', gap: 2, background: '#f1f3f5', borderRadius: 6, padding: 3, marginBottom: 14 }}>
              {[['', '全部'], ['in_stock', '在庫'], ['out', '已出庫']].map(([k, l]) => (
                <button key={k} onClick={() => { setPalletFilter(k); setTimeout(loadPallets, 0); }}
                  style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: palletFilter === k ? '#fff' : 'none', color: palletFilter === k ? '#667eea' : '#999' }}>
                  {l}
                </button>
              ))}
            </div>
            {pallets.length === 0 ? (
              <div className="empty">暫無庫存記錄<br /><span style={{ fontSize: 13, color: '#ddd' }}>點擊「掃碼入庫」開始新增</span></div>
            ) : (
              pallets.map(p => (
                <div className="rec-card" key={p.id} onClick={() => { loadPalletDetail(p.id); setSection('palletDetail'); }} style={{ cursor: 'pointer' }}>
                  <div className="rec-top">
                    <span className="rec-co">{p.paper_type || '未知紙種'}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, color: p.quality_grade === 'A' ? '#2e7d32' : p.quality_grade === 'B' ? '#d4851a' : p.quality_grade === 'C' ? '#e53935' : '#999', background: p.quality_grade === 'A' ? '#e8f5ed' : p.quality_grade === 'B' ? '#fef6e8' : p.quality_grade === 'C' ? '#fdecea' : '#f5f5f5' }}>
                      {p.quality_grade ? p.quality_grade : '未分級'}
                    </span>
                  </div>
                  <div className="rec-meta">{p.pallet_no || '—'} · {p.format_size || '—'} · {p.weight ? p.weight + 'kg' : ''}</div>
                  <div className="rec-items">{p.batch_code || ''} {p.commission_no ? `#${p.commission_no}` : ''} · {p.status === 'in_stock' ? '🟢 在庫' : '⚪ 已出庫'}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PALLET DETAIL */}
        {section === 'palletDetail' && palletDetail && (
          <div className="section active">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => { setSection('inventory'); loadPallets(); }} style={{ padding: '6px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16 }}>&larr;</button>
              <div className="section-title" style={{ marginBottom: 0 }}>板詳情</div>
              <span style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 20, color: palletDetail.status === 'in_stock' ? '#667eea' : '#999', background: palletDetail.status === 'in_stock' ? '#eef0ff' : '#f5f5f5' }}>{palletDetail.status === 'in_stock' ? '在庫' : '已出庫'}</span>
            </div>
            <div className="panel" style={{ background: palletDetail.quality_grade === 'A' ? '#e8f5ed' : palletDetail.quality_grade === 'B' ? '#fef6e8' : palletDetail.quality_grade === 'C' ? '#fdecea' : '#f8f9ff' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{palletDetail.paper_type || '未知紙種'}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{palletDetail.quality_grade ? `品質等級: ${palletDetail.quality_grade}` : '未分級'} {palletDetail.graded_by ? ` · 由 ${palletDetail.graded_by} 評定` : ''}</div>
            </div>
            <div className="panel">
              <h3>標籤資料</h3>
              {[['板號', palletDetail.pallet_no], ['訂單編號', palletDetail.commission_no], ['批次碼', palletDetail.batch_code], ['尺寸', palletDetail.format_size], ['厚度', palletDetail.caliper ? palletDetail.caliper + ' mm' : ''], ['重量', palletDetail.weight ? palletDetail.weight + ' kg' : ''], ['張數', palletDetail.sheets ? palletDetail.sheets + ' pcs' : ''], ['供應商', palletDetail.supplier], ['客戶', palletDetail.customer], ['生產日期', palletDetail.production_date], ['出貨日期', palletDetail.shipment_date], ['產地', palletDetail.origin], ['位置', palletDetail.location], ['條碼', palletDetail.barcode]].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #f1f3f5', fontSize: 13 }}><span style={{ color: '#999' }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
              ))}
            </div>
            {palletDetail.status === 'in_stock' && (
              <div className="panel">
                <h3>品質分級</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['A', 'B', 'C'].map(g => {
                    const on = palletDetail.quality_grade === g;
                    const cc = { A: '#2e7d32', B: '#d4851a', C: '#e53935' }[g];
                    return (
                      <button key={g} onClick={async () => { try { await palletsAPI.update(palletDetail.id, { quality_grade: g }); await loadPalletDetail(palletDetail.id); } catch {} }}
                        style={{ flex: 1, padding: '12px 8px', border: `2px solid ${on ? cc : '#e0e0e0'}`, borderRadius: 10, background: on ? (g === 'A' ? '#e8f5ed' : g === 'B' ? '#fef6e8' : '#fdecea') : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: on ? cc : '#ccc' }}>{g}</div>
                        <div style={{ fontSize: 11, color: on ? cc : '#ccc' }}>{{ A: '優良', B: '正常', C: '次品' }[g]}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="action-row">
                  <button className="btn-save" style={{ background: '#d4851a' }} onClick={async () => { if (!confirm('確定出庫？')) return; try { await palletsAPI.out(palletDetail.id, {}); await loadPalletDetail(palletDetail.id); alert('已出庫'); } catch(e) { alert('失敗'); } }}>📤 出庫</button>
                  <button style={{ padding: '10px 16px', background: '#ffebee', color: '#e53935', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }} onClick={async () => { if (!confirm('確定刪除？')) return; try { await palletsAPI.delete(palletDetail.id); setSection('inventory'); loadPallets(); } catch {} }}>🗑 刪除</button>
                </div>
              </div>
            )}
            {palletDetail.transactions?.length > 0 && (
              <div className="panel">
                <h3>交易記錄</h3>
                {palletDetail.transactions.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f1f3f5', fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: t.type === 'in' ? '#2e7d32' : '#e53935' }}>{t.type === 'in' ? '入庫' : '出庫'}</span>
                    <span style={{ color: '#999', flex: 1 }}>{t.notes}</span>
                    <span style={{ color: '#ccc' }}>{t.created_at ? new Date(t.created_at).toLocaleString('zh-HK', { timeZone: 'Asia/Shanghai' }) : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCAN */}
        {section === 'scan' && (
          <div className="section active">
            {scanStep === 'scan' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => setSection('inventory')} style={{ padding: '6px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16 }}>&larr;</button>
                  <div className="section-title" style={{ marginBottom: 0 }}>📷 掃碼入庫</div>
                </div>
                <div className="panel">
                  <div id="scanner-region" ref={scannerRef} style={{ width: '100%', borderRadius: 8, overflow: 'hidden', background: '#000', minHeight: 200 }} />
                  <p style={{ textAlign: 'center', color: '#999', fontSize: 13, marginTop: 10 }}>📷 對準標籤上的條碼</p>
                </div>
                <div className="panel">
                  <h3>或手動輸入</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="search-input" style={{ flex: 1 }} placeholder="輸入條碼編號" value={scanBarcode} onChange={e => setScanBarcode(e.target.value)} />
                    <button className="btn-save" style={{ padding: '10px 16px' }} onClick={() => { setScanForm(f => ({ ...f, barcode: scanBarcode })); setScanStep('form'); }}>確認</button>
                  </div>
                  <button onClick={() => { setScanForm(f => ({ ...f, barcode: '' })); setScanStep('form'); }} style={{ width: '100%', marginTop: 10, padding: 10, background: '#f6f7fb', border: '1.5px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#666' }}>無條碼，直接手動錄入</button>
                </div>
              </>
            )}
            {scanStep === 'form' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => setScanStep('scan')} style={{ padding: '6px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16 }}>&larr;</button>
                  <div className="section-title" style={{ marginBottom: 0 }}>填寫貨品資料</div>
                </div>
                {scanForm.barcode && <div className="panel" style={{ background: '#f6f7fb', padding: '10px 14px', fontSize: 13 }}>條碼: <strong>{scanForm.barcode}</strong></div>}
                <div className="panel">
                  <h3>品質分級</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['A', 'B', 'C'].map(g => {
                      const on = scanForm.quality_grade === g;
                      const cc = { A: '#2e7d32', B: '#d4851a', C: '#e53935' }[g];
                      return (
                        <button key={g} onClick={() => setScanForm(f => ({ ...f, quality_grade: on ? '' : g }))}
                          style={{ flex: 1, padding: '14px 8px', border: `2px solid ${on ? cc : '#e0e0e0'}`, borderRadius: 10, background: on ? (g === 'A' ? '#e8f5ed' : g === 'B' ? '#fef6e8' : '#fdecea') : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: on ? cc : '#ccc' }}>{g}</div>
                          <div style={{ fontSize: 11, color: on ? cc : '#ccc' }}>{{ A: '優良', B: '正常', C: '次品' }[g]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="panel">
                  <h3>標籤資料</h3>
                  <div className="form-row">
                    <div className="field-g"><label>紙種 *</label><input placeholder="如 PUZZLE BOARD BLUE PASTED" value={scanForm.paper_type} onChange={e => setScanForm(f => ({ ...f, paper_type: e.target.value }))} /></div>
                    <div className="field-g"><label>板號 Pal.-Nr.</label><input placeholder="如 9014/26" value={scanForm.pallet_no} onChange={e => setScanForm(f => ({ ...f, pallet_no: e.target.value }))} /></div>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <div className="field-g"><label>訂單 Com.-Nr.</label><input placeholder="如 349179/1" value={scanForm.commission_no} onChange={e => setScanForm(f => ({ ...f, commission_no: e.target.value }))} /></div>
                    <div className="field-g"><label>批次碼 MaRu</label><input placeholder="如 24SK05005" value={scanForm.batch_code} onChange={e => setScanForm(f => ({ ...f, batch_code: e.target.value }))} /></div>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <div className="field-g"><label>尺寸</label><input placeholder="如 78,7 x 109,2 SB" value={scanForm.format_size} onChange={e => setScanForm(f => ({ ...f, format_size: e.target.value }))} /></div>
                    <div className="field-g"><label>厚度 mm</label><input placeholder="如 1,90" value={scanForm.caliper} onChange={e => setScanForm(f => ({ ...f, caliper: e.target.value }))} /></div>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <div className="field-g"><label>重量 kg</label><input placeholder="如 565" value={scanForm.weight} onChange={e => setScanForm(f => ({ ...f, weight: e.target.value }))} /></div>
                    <div className="field-g"><label>張數</label><input placeholder="如 500" value={scanForm.sheets} onChange={e => setScanForm(f => ({ ...f, sheets: e.target.value }))} /></div>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <div className="field-g"><label>供應商</label><input value={scanForm.supplier} onChange={e => setScanForm(f => ({ ...f, supplier: e.target.value }))} /></div>
                    <div className="field-g"><label>產地</label><input placeholder="如 Made in Germany" value={scanForm.origin} onChange={e => setScanForm(f => ({ ...f, origin: e.target.value }))} /></div>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <div className="field-g"><label>存放位置</label><input placeholder="如 A區-3排" value={scanForm.location} onChange={e => setScanForm(f => ({ ...f, location: e.target.value }))} /></div>
                  </div>
                </div>
                <div className="action-row" style={{ marginBottom: 20 }}>
                  <button className="btn-save" style={{ flex: 1 }} onClick={async () => {
                    if (!scanForm.paper_type?.trim()) { alert('請填寫紙種'); return; }
                    try { await palletsAPI.create({ ...scanForm, barcode: scanForm.barcode || scanBarcode }); setScanStep('done'); } catch(e) { alert('儲存失敗: ' + (e.response?.data?.error || e.message)); }
                  }}>確認入庫</button>
                </div>
              </>
            )}
            {scanStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <div style={{ fontSize: 60, marginBottom: 16, color: '#2e7d32' }}>✓</div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#2e7d32' }}>入庫成功！</p>
                <p style={{ fontSize: 14, color: '#999' }}>{scanForm.paper_type} · {scanForm.pallet_no}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                  <button className="btn-save" onClick={() => { setScanStep('scan'); setScanBarcode(''); setScanForm({ supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '', format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '', sheets: '', production_date: '', shipment_date: '', origin: '', quality_grade: '', quality_notes: '', location: '' }); }}>繼續掃碼</button>
                  <button className="btn-print" onClick={() => { setSection('inventory'); loadPallets(); }}>返回庫存</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {bnItem('dashboard', '🏠', '首頁')}
        {bnItem('quotation', '✍️', '報價')}
        {bnItem('inventory', '📦', '庫存')}
        {user.role === 'admin' ? bnItem('users', '👥', '管理') : bnItem('password', '🔑', '密碼')}
        <button className="bn-item" onClick={doLogout}><span className="bn-icon">🚪</span><span className="bn-label">登出</span></button>
      </nav>

      {/* Print area（列印時才顯示，未縮放） */}
      <div id="printArea" style={{ display: 'none' }}><div className="page">{quoteBody}</div></div>

      <style jsx>{`
        .app { display: flex; min-height: 100vh; background: #f0f2f5; }
        .sidebar {
          width: 248px; flex-shrink: 0; background: #fff;
          border-right: 1px solid #eef0f4;
          box-shadow: 2px 0 18px rgba(0,0,0,.04);
          display: flex; flex-direction: column;
          position: fixed; left: 0; top: 0; height: 100vh; z-index: 200; overflow-y: auto;
          padding: 18px 14px;
        }
        .sb-head { display: flex; align-items: center; gap: 12px; padding: 6px 6px 18px; }
        .sb-logo {
          width: 44px; height: 44px; border-radius: 13px;
          background: linear-gradient(135deg,#667eea,#764ba2);
          display: flex; align-items: center; justify-content: center;
          font-size: 23px; box-shadow: 0 8px 18px rgba(102,126,234,.4); flex-shrink: 0;
        }
        .sb-head h2 { font-size: 17px; color: #2d2f48; margin: 0; line-height: 1.2; font-weight: 700; }
        .sb-sub { font-size: 9.5px; color: #b3b6c4; letter-spacing: 1px; margin: 3px 0 0; text-transform: uppercase; }

        .sb-user {
          display: flex; align-items: center; gap: 11px;
          background: #f6f7fb; border-radius: 13px; padding: 11px 12px; margin-bottom: 16px;
        }
        .sb-avatar {
          width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg,#667eea,#764ba2); color: #fff;
          display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;
          box-shadow: 0 4px 12px rgba(102,126,234,.3);
        }
        .sb-uname { font-size: 13.5px; font-weight: 600; color: #333; }
        .sb-role { font-size: 11px; color: #9aa0b4; margin-top: 1px; }

        .menu-group { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 4px 0; }
        .menu-label {
          font-size: 10.5px; font-weight: 700; color: #b0b3c5;
          text-transform: uppercase; letter-spacing: 1.5px;
          padding: 6px 14px 10px;
        }
        .logout-btn {
          margin-top: 8px; padding: 12px; background: #f6f7fb; color: #8a8fa3;
          border: none; border-radius: 12px; cursor: pointer; font-size: 13.5px; font-weight: 600;
          transition: .2s; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .logout-btn:hover { background: #ffece8; color: #e53935; }

        .main { margin-left: 248px; flex: 1; padding: 24px; overflow-y: auto; min-height: 100vh; }

        .bottom-nav { display: none; }

        .section { animation: fadeIn .25s ease; }
        .section-title { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 20px; }

        .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 14px; }
        .dash-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,.06); cursor: pointer; transition: .2s; }
        .dash-card:active { transform: scale(.97); }
        .dash-card .icon { font-size: 34px; margin-bottom: 10px; }
        .dash-card h3 { font-size: 15px; color: #333; margin-bottom: 4px; }
        .dash-card p { font-size: 12px; color: #aaa; }

        .panel { background: #fff; border-radius: 12px; padding: 18px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
        .panel h3 { font-size: 14px; font-weight: 700; color: #333; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 2px solid #667eea; }

        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap: 12px; }
        .field-g { display: flex; flex-direction: column; gap: 5px; }
        .field-g label { font-size: 12px; font-weight: 600; color: #666; }
        .field-g input, .field-g select, .field-g textarea {
          width: 100%; min-width: 0; box-sizing: border-box;
          padding: 11px 12px; border: 1.5px solid #e0e0e0; border-radius: 8px;
          font-size: 14px; font-family: inherit; transition: .2s; background: #fafafa;
        }
        .field-g input:focus, .field-g select:focus, .field-g textarea:focus {
          outline: none; border-color: #667eea; background: #fff; box-shadow: 0 0 0 3px rgba(102,126,234,.1);
        }
        .field-g textarea { height: 72px; resize: vertical; }

        .prod-row { background: #f8f9ff; border: 1.5px solid #e8eaf6; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .prod-row .prod-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 10px; }
        .prod-row .prod-name { grid-column: 1/-1; }
        .prod-row .del-btn { width: 100%; padding: 9px; background: #fff0f0; color: #e53935; border: 1.5px solid #ffcdd2; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-add-prod { width: 100%; padding: 12px; background: #f0fff4; color: #2e7d32; border: 1.5px dashed #a5d6a7; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; margin-top: 4px; transition: .2s; }
        .btn-add-prod:active { background: #e8f5e9; }

        .action-row { display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
        .btn-save { flex: 1; min-width: 130px; padding: 13px; background: #00acc1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-save:active { background: #00838f; }
        .btn-print { flex: 1; min-width: 130px; padding: 13px; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-print:active { opacity: .85; }

        .preview-wrap { background: #ccc; padding: 16px; border-radius: 12px; overflow-x: auto; }

        .search-bar { display: flex; gap: 10px; margin-bottom: 16px; }
        .search-input { flex: 1; padding: 12px 14px; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: #fff; }
        .search-input:focus { outline: none; border-color: #667eea; }
        .rec-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 10px rgba(0,0,0,.06); }
        .rec-card .rec-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .rec-card .rec-co { font-size: 16px; font-weight: 700; color: #333; }
        .rec-card .rec-date { font-size: 12px; color: #aaa; }
        .rec-card .rec-meta { font-size: 13px; color: #666; margin-bottom: 10px; line-height: 1.6; }
        .rec-card .rec-items { font-size: 12px; color: #999; margin-bottom: 12px; font-style: italic; }
        .rec-card .rec-actions { display: flex; gap: 8px; }
        .rec-load { flex: 1; padding: 10px; background: #667eea; color: #fff; border: none; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .rec-del { flex: 0 0 auto; padding: 10px 14px; background: #ffebee; color: #e53935; border: none; border-radius: 7px; cursor: pointer; font-size: 13px; }
        .empty { text-align: center; padding: 60px 20px; color: #ccc; font-size: 15px; }

        #printArea { display: none; }

        @media (max-width: 680px) {
          .app { height: 100dvh; overflow: hidden; }
          .sidebar { display: none; }
          .main {
            margin-left: 0; min-height: 0; height: 100%;
            padding: 16px; padding-bottom: 88px;
            overflow-y: auto; -webkit-overflow-scrolling: touch;
          }
          .bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            background: #fff; border-top: 1px solid #eee; z-index: 200;
            box-shadow: 0 -2px 12px rgba(0,0,0,.08); padding-bottom: env(safe-area-inset-bottom);
          }
          .preview-wrap { padding: 10px; }
          .action-row { flex-direction: column; }
          .btn-save, .btn-print { min-width: unset; width: 100%; }
          .section-title { font-size: 17px; }
        }
        @media (min-width: 681px) and (max-width: 1024px) {
          .sidebar { width: 212px; }
          .main { margin-left: 212px; padding: 20px; }
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <style jsx global>{`
        /* === A4 quotation sheet (forced global; also used by print) === */
        .page {
          width: 210mm; min-height: 296mm; padding: 14mm 16mm;
          background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,.18);
          font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; color: #000;
        }
        .q-header {
          position: relative; min-height: 96px;
          display: flex; align-items: center;
          border-bottom: 2.5px solid #000; padding-bottom: 12px; margin-bottom: 18px;
        }
        .q-logo {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 96px; height: auto; object-fit: contain;
        }
        .q-head-text { width: 100%; text-align: center; }
        .co-zh { font-size: 25px; font-weight: 700; margin: 0 0 3px; letter-spacing: 1px; }
        .co-en { font-size: 13px; font-weight: 700; margin: 0 0 5px; letter-spacing: .5px; }
        .co-det { font-size: 9.5px; line-height: 1.6; }
        .meta-info { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 13px; }
        .meta-left, .meta-right { width: 48%; }
        .meta-row { display: flex; margin-bottom: 7px; }
        .meta-lbl { font-weight: 700; min-width: 54px; }
        .q-title { text-align: center; font-size: 23px; font-weight: 700; text-decoration: underline; letter-spacing: 5px; margin-bottom: 18px; }
        .q-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13px; }
        .q-table th, .q-table td { border: 1px solid #000; padding: 9px; text-align: center; }
        .q-table th { background: #fff; font-weight: 700; }
        .q-remarks { font-size: 13px; margin-bottom: 12px; white-space: pre-wrap; line-height: 1.7; }
        .q-footer { font-size: 13px; line-height: 2; }
        .q-footer .hl { font-weight: 700; margin-top: 6px; }

        /* === Sidebar menu buttons (forced global to bypass styled-jsx scope issue with <button>) === */
        .menu-btn {
          position: relative;
          display: flex !important;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 13px 16px;
          margin: 0;
          background: transparent;
          border: none;
          outline: none;
          color: #4a5060;
          font-size: 14.5px;
          font-weight: 600;
          font-family: inherit;
          text-align: left;
          letter-spacing: .3px;
          cursor: pointer;
          border-radius: 12px;
          transition: background .22s ease, color .22s ease, transform .12s ease, box-shadow .25s ease;
          -webkit-appearance: none;
          appearance: none;
        }
        .menu-btn::before {
          content: '';
          position: absolute;
          left: -14px;
          top: 50%;
          width: 4px;
          height: 0;
          background: #667eea;
          border-radius: 0 4px 4px 0;
          transform: translateY(-50%);
          transition: height .28s cubic-bezier(.4,0,.2,1);
        }
        .menu-btn:hover {
          background: linear-gradient(90deg, rgba(102,126,234,.12), rgba(102,126,234,.04));
          color: #4f59d4;
        }
        .menu-btn:hover::before { height: 22px; }
        .menu-btn:hover .mb-icon { transform: scale(1.15) rotate(-4deg); }
        .menu-btn:active { transform: scale(.97); }
        .menu-btn.is-on {
          background: linear-gradient(135deg, #6e7ff3 0%, #9168d5 100%);
          color: #fff;
          box-shadow:
            0 12px 28px -8px rgba(102,126,234,.55),
            0 4px 10px -2px rgba(145,104,213,.3),
            inset 0 1px 0 rgba(255,255,255,.25);
        }
        .menu-btn.is-on::before { display: none; }
        .menu-btn.is-on .mb-icon {
          transform: none;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,.18));
        }
        .mb-icon {
          font-size: 20px;
          line-height: 1;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
          transition: transform .28s cubic-bezier(.34,1.56,.64,1);
          filter: drop-shadow(0 1px 2px rgba(0,0,0,.08));
        }
        .mb-text { line-height: 1; flex: 1; }
        .mb-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 10px rgba(255,255,255,.8);
          flex-shrink: 0;
        }

        /* === Mobile bottom nav (forced global to bypass styled-jsx button scope issue) === */
        .bottom-nav {
          background: rgba(255,255,255,.96);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          backdrop-filter: saturate(180%) blur(14px);
          border-top: 1px solid #eef0f4;
          box-shadow: 0 -6px 24px rgba(0,0,0,.07);
          padding: 4px 6px;
          padding-bottom: calc(4px + env(safe-area-inset-bottom));
        }
        .bn-item {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 9px 0 7px;
          background: transparent;
          border: none;
          outline: none;
          cursor: pointer;
          color: #9aa0b4;
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          -webkit-appearance: none;
          appearance: none;
          position: relative;
          transition: color .2s ease, transform .12s ease;
        }
        .bn-item:active { transform: scale(.88); }
        .bn-icon {
          font-size: 22px;
          line-height: 1;
          transition: transform .3s cubic-bezier(.34,1.56,.64,1);
          filter: drop-shadow(0 1px 2px rgba(0,0,0,.1));
        }
        .bn-label { line-height: 1; letter-spacing: .3px; }
        .bn-item.is-on { color: #667eea; }
        .bn-item.is-on .bn-icon { transform: translateY(-3px) scale(1.16); }
        .bn-item.is-on .bn-label { font-weight: 800; }
        .bn-item.is-on::after {
          content: '';
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 3px;
          border-radius: 0 0 4px 4px;
          background: linear-gradient(90deg, #667eea, #9168d5);
        }

        @media print {
          html, body {
            height: auto !important; min-height: 0 !important;
            overflow: visible !important; margin: 0 !important; padding: 0 !important;
          }
          .app {
            display: block !important; height: auto !important;
            min-height: 0 !important; overflow: visible !important;
          }
          .sidebar, .main, .bottom-nav { display: none !important; }
          #printArea { display: block !important; }
          #printArea .page {
            box-shadow: none !important; margin: 0 !important; width: 100% !important;
            min-height: auto !important; padding: 10mm 12mm !important; transform: none !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
