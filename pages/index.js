import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

const CO = {
  wuming:   { zh: '東莞市無名紙業有限公司', en: 'DONGGUAN WUMING PAPER CO.,LTD', email: 'wuming@prostandard.com.hk' },
  standard: { zh: '標準紙行有限公司',       en: 'PRO-STANDARD PAPER CO.,LTD',    email: 'paper@prostandard.com.hk' },
  pangu:    { zh: '東莞市盤古紙業有限公司', en: 'DONGGUAN PAN GU PAPER CO.,LTD',  email: 'pangu@prostandard.com.hk' },
};

const SENDERS = {
  '羅志成': '5139 3389 / 139 2298 7974',
  '廖國強': '6176 2929 / 136 0027 1357',
  '李政諭': '138 2927 8356',
};

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [form, setForm] = useState({
    company: 'wuming', to: '', attn: '', date: '', from: '羅志成', phone: SENDERS['羅志成'],
    remarks: '', currency: '人民幣含稅價', payment: '月結30天', min: '2',
  });
  const [products, setProducts] = useState([{ item: '', size: '', qty: '', price: '' }]);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const pageRef = useRef(null);
  const wrapRef = useRef(null);

  // 登入檢查 + 初始化
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    setForm((f) => ({ ...f, date: todayStr() }));
    setRecords(JSON.parse(localStorage.getItem('qrecs') || '[]'));
  }, []);

  const loadRecords = () => setRecords(JSON.parse(localStorage.getItem('qrecs') || '[]'));

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
  const saveRecord = () => {
    if (!form.to.trim()) { alert('請先填寫「致 (To)」公司名稱再保存。'); return; }
    const rec = {
      id: Date.now(), to: form.to.trim(), attn: form.attn, date: form.date,
      fromName: form.from, fromPhone: form.phone, company: form.company,
      currency: form.currency, payment: form.payment, min: form.min, remarks: form.remarks,
      products: products.map((p) => ({ ...p })),
      by: user?.name || user?.username || '—', savedAt: new Date().toLocaleString('zh-HK'),
    };
    const all = JSON.parse(localStorage.getItem('qrecs') || '[]');
    all.push(rec);
    localStorage.setItem('qrecs', JSON.stringify(all));
    loadRecords();
    alert('✅ 已保存：' + rec.to);
    setSection('records');
  };

  const loadRecord = (id) => {
    const all = JSON.parse(localStorage.getItem('qrecs') || '[]');
    const r = all.find((x) => x.id === id);
    if (!r) return;
    setForm({
      company: r.company, to: r.to, attn: r.attn, date: r.date, from: r.fromName,
      phone: r.fromPhone, remarks: r.remarks, currency: r.currency, payment: r.payment, min: r.min,
    });
    setProducts(r.products && r.products.length ? r.products.map((p) => ({ ...p })) : [{ item: '', size: '', qty: '', price: '' }]);
    setSection('quotation');
  };

  const deleteRecord = (id) => {
    if (!confirm('確定刪除此報價記錄？')) return;
    const all = JSON.parse(localStorage.getItem('qrecs') || '[]').filter((r) => r.id !== id);
    localStorage.setItem('qrecs', JSON.stringify(all));
    loadRecords();
  };

  const doPrint = () => window.print();

  const doLogout = () => {
    if (!confirm('確定登出？')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  const co = CO[form.company];
  const paymentText = `${form.currency}，${form.payment}`;
  const query = search.toLowerCase().trim();
  const filtered = query
    ? records.filter((r) => {
        const items = (r.products || []).map((p) => p.item).join(' ').toLowerCase();
        return r.to.toLowerCase().includes(query) || items.includes(query);
      })
    : records;

  // A4 報價單內容（預覽與列印共用）
  const quoteBody = (
    <>
      <div className="q-header">
        <p className="co-zh">{co.zh}</p>
        <p className="co-en">{co.en}</p>
        <div className="co-det">
          國內公司: 東莞市虎門鎮連升中路億洲商務中心605室 &nbsp; 工廠: 東莞市洪梅鎮河西工業大道<br />
          香港公司: 標準紙行有限公司 香港新界荃灣沙咀道十一至十九號, 達貿中心五樓三至五室<br />
          Tel: (769) 8555 2197 &nbsp; (769) 8122 4183 &nbsp; (852) 2498 9638 &nbsp; Email: {co.email}
        </div>
      </div>
      <div className="meta-info">
        <div className="meta-left">
          <div className="meta-row"><span className="meta-lbl">致:</span><span>{form.to}</span></div>
          <div className="meta-row"><span className="meta-lbl">收件:</span><span>{form.attn}</span></div>
        </div>
        <div className="meta-right">
          <div className="meta-row"><span className="meta-lbl">自:</span><span>{form.from}</span></div>
          <div className="meta-row" style={{ paddingLeft: 48 }}><span>{form.phone}</span></div>
          <div className="meta-row"><span className="meta-lbl">日期:</span><span>{form.date}</span></div>
        </div>
      </div>
      <div className="q-title">報 價 單</div>
      <table className="q-table">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>品名</th>
            <th style={{ width: '15%' }}>尺寸</th>
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

  const navLink = (id, icon, label) => (
    <a className={`nav-link${section === id ? ' active' : ''}`} onClick={() => setSection(id)} role="button" tabIndex={0}>
      <span className="nav-icon">{icon}</span><span className="nav-label">{label}</span>
    </a>
  );
  const bnItem = (id, icon, label) => (
    <button className={`bn-item${section === id ? ' active' : ''}`} onClick={() => setSection(id)}>
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
        <ul className="nav-list">
          <li>{navLink('dashboard', '🏠', '儀表板')}</li>
          <li>{navLink('quotation', '✍️', '生成報價')}</li>
          <li>{navLink('records', '📋', '報價紀錄')}</li>
        </ul>
        <button className="logout-btn" onClick={doLogout}>🚪 登出</button>
      </div>

      {/* Main */}
      <div className="main">
        {/* DASHBOARD */}
        {section === 'dashboard' && (
          <div className="section active">
            <div className="section-title">👋 歡迎，{user.name || user.username}</div>
            <div className="dash-grid">
              <div className="dash-card" onClick={() => setSection('quotation')}>
                <div className="icon">✍️</div><h3>生成新報價</h3><p>建立並列印新的報價單</p>
              </div>
              <div className="dash-card" onClick={() => setSection('records')}>
                <div className="icon">📋</div><h3>查閱報價紀錄</h3><p>查看過往所有報價單</p>
              </div>
              <div className="dash-card">
                <div className="icon">📊</div><h3>{records.length} 份報價</h3><p>系統內共有報價單</p>
              </div>
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
                  <input type="text" placeholder="客戶公司名稱" value={form.to} onChange={(e) => setField('to', e.target.value)} />
                </div>
                <div className="field-g">
                  <label>收件人 (Attn)</label>
                  <input type="text" placeholder="收件人姓名" value={form.attn} onChange={(e) => setField('attn', e.target.value)} />
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
                        <input type="text" placeholder="產品名稱" value={p.item} onChange={(e) => updProduct(i, 'item', e.target.value)} />
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
              <div className="action-row" style={{ marginTop: 16 }}>
                <button className="btn-save" onClick={saveRecord}>💾 保存至紀錄</button>
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
              <input className="search-input" type="search" placeholder="🔍 搜尋公司名 或 品名…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filtered.length === 0 ? (
              <div className="empty">
                暫無報價紀錄<br />
                <span style={{ fontSize: 13, color: '#ddd' }}>完成報價後點擊「保存至紀錄」即可儲存</span>
              </div>
            ) : (
              [...filtered].reverse().map((r) => {
                const itemStr = (r.products || []).map((p) => p.item).filter(Boolean).join('、');
                return (
                  <div className="rec-card" key={r.id}>
                    <div className="rec-top">
                      <span className="rec-co">{r.to}</span>
                      <span className="rec-date">{r.date || ''}</span>
                    </div>
                    <div className="rec-meta">收件: {r.attn || '—'} &nbsp;|&nbsp; 發件: {r.fromName || '—'} &nbsp;|&nbsp; 儲存: {r.by || '—'}</div>
                    {itemStr ? <div className="rec-items">📦 {itemStr}</div> : null}
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
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {bnItem('dashboard', '🏠', '首頁')}
        {bnItem('quotation', '✍️', '報價')}
        {bnItem('records', '📋', '紀錄')}
        <button className="bn-item" onClick={doLogout}><span className="bn-icon">🚪</span><span className="bn-label">登出</span></button>
      </nav>

      {/* Print area（列印時才顯示，未縮放） */}
      <div id="printArea"><div className="page">{quoteBody}</div></div>

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

        .nav-list { list-style: none; flex: 1; margin: 0; padding: 4px 0; display: flex; flex-direction: column; gap: 4px; }
        .nav-link {
          position: relative; display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; color: #5b6275; text-decoration: none; font-size: 14.5px;
          cursor: pointer; border-radius: 12px; font-weight: 500; letter-spacing: .2px;
          transition: background .2s ease, color .2s ease, transform .12s ease, box-shadow .2s ease;
          overflow: hidden;
        }
        .nav-link::before {
          content: ''; position: absolute; left: 0; top: 50%;
          width: 3px; height: 0; background: #667eea; border-radius: 0 3px 3px 0;
          transform: translateY(-50%); transition: height .25s cubic-bezier(.4,0,.2,1);
        }
        .nav-link:hover {
          background: rgba(102,126,234,.07);
          color: #4f59d4;
        }
        .nav-link:hover::before { height: 18px; }
        .nav-link:hover .nav-icon { transform: scale(1.1); }
        .nav-link:active { transform: scale(.98); }
        .nav-link.active {
          background: linear-gradient(135deg,#7a8eee 0%,#8d6bd1 100%);
          color: #fff; font-weight: 600;
          box-shadow: 0 10px 24px -6px rgba(102,126,234,.55), inset 0 1px 0 rgba(255,255,255,.18);
        }
        .nav-link.active::before { display: none; }
        .nav-icon {
          font-size: 19px; line-height: 1; width: 22px; text-align: center;
          flex-shrink: 0; transition: transform .2s ease; filter: drop-shadow(0 1px 1px rgba(0,0,0,.06));
        }
        .nav-label { line-height: 1; }
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
          padding: 11px 12px; border: 1.5px solid #e0e0e0; border-radius: 8px;
          font-size: 14px; font-family: inherit; transition: .2s; background: #fafafa;
        }
        .field-g input:focus, .field-g select:focus, .field-g textarea:focus {
          outline: none; border-color: #667eea; background: #fff; box-shadow: 0 0 0 3px rgba(102,126,234,.1);
        }
        .field-g textarea { height: 72px; resize: vertical; }

        .prod-row { background: #f8f9ff; border: 1.5px solid #e8eaf6; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .prod-row .prod-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
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
        .page {
          width: 210mm; min-height: 296mm; padding: 14mm 17mm;
          background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,.18);
          font-family: 'Microsoft JhengHei', sans-serif; color: #000;
        }
        .q-header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
        .co-zh { font-size: 24px; font-weight: 700; margin-bottom: 3px; }
        .co-en { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .co-det { font-size: 9.5px; line-height: 1.5; }
        .meta-info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12.5px; }
        .meta-left, .meta-right { width: 48%; }
        .meta-row { display: flex; margin-bottom: 4px; }
        .meta-lbl { font-weight: 700; min-width: 48px; }
        .q-title { text-align: center; font-size: 22px; font-weight: 700; text-decoration: underline; letter-spacing: 3px; margin-bottom: 16px; }
        .q-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12.5px; }
        .q-table th, .q-table td { border: 1px solid #000; padding: 8px; text-align: center; }
        .q-table th { background: #f0f0f0; font-weight: 700; }
        .q-remarks { font-size: 12.5px; margin-bottom: 12px; white-space: pre-wrap; line-height: 1.6; }
        .q-footer { font-size: 12.5px; line-height: 2; }
        .q-footer .hl { font-weight: 700; margin-top: 5px; }

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
          .sidebar { display: none; }
          .main { margin-left: 0; padding: 16px; padding-bottom: 80px; }
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
        .bn-item {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          padding: 10px 0 12px; cursor: pointer; color: #aaa; font-size: 10px; gap: 3px;
          border: none; background: none; transition: .15s;
        }
        .bn-item .bn-icon { font-size: 22px; line-height: 1; }
        .bn-item.active { color: #667eea; }
        .bn-item.active .bn-label { font-weight: 700; }

        @media (min-width: 681px) and (max-width: 1024px) {
          .sidebar { width: 212px; }
          .main { margin-left: 212px; padding: 20px; }
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #printArea, #printArea * { visibility: visible !important; }
          #printArea { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          #printArea .page { box-shadow: none; margin: 0 !important; width: 100%; min-height: auto; padding: 10mm 12mm; transform: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
