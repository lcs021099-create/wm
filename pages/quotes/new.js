import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { quotesAPI, clientsAPI } from '../../lib/api';

const UNITS = ['件', '式', '月', '日', '小時', '個', '張', '份', '套', '次'];

export default function QuoteForm({ quote }) {
  const router = useRouter();
  const isEdit = !!quote;

  const [form, setForm] = useState({
    client_name: '', contact: '', phone: '', email: '',
    quote_date: new Date().toISOString().slice(0, 10),
    valid_until: '', status: 'draft', discount: 0, tax_rate: 8, notes: '',
    items: [{ description: '', quantity: 1, unit: '件', unit_price: 0 }],
    ...quote,
  });

  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    clientsAPI.list({ search: '' }).then(r => setClients(r.data)).catch(() => {});
  }, []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setItem = (i, k, v) => {
    const items = [...form.items];
    items[i] = { ...items[i], [k]: v };
    setField('items', items);
  };

  const addItem = () => setField('items', [...form.items, { description: '', quantity: 1, unit: '件', unit_price: 0 }]);
  const delItem = (i) => { if (form.items.length > 1) setField('items', form.items.filter((_, j) => j !== i)); };

  const selectClient = (id) => {
    const c = clients.find(c => c.id === Number(id));
    if (c) setForm(f => ({ ...f, client_id: c.id, client_name: c.name, contact: c.contact, phone: c.phone, email: c.email }));
  };

  const calc = () => {
    const sub = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    const disc = Number(form.discount) || 0;
    const after = sub - disc;
    const tax = after * ((Number(form.tax_rate) || 0) / 100);
    return { sub, after, tax, total: after + tax };
  };

  const fmt = (n) => 'HK$' + Math.round(n).toLocaleString();

  const save = async () => {
    if (!form.client_name.trim()) return setError('請填寫客戶名稱');
    if (!form.items.some(i => i.description)) return setError('請至少新增一個報價項目');
    setError('');
    setSaving(true);
    try {
      const { sub, tax, total } = calc();
      const payload = { ...form, subtotal: sub, tax_amount: tax, total };
      if (isEdit) {
        await quotesAPI.update(quote.id, payload);
      } else {
        await quotesAPI.create(payload);
      }
      router.push('/quotes');
    } catch (err) {
      setError(err.response?.data?.error || '儲存失敗');
    } finally { setSaving(false); }
  };

  const { sub, after, tax, total } = calc();
  const inp = { border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box' };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{isEdit ? '✏️ 編輯報價單' : '➕ 新增報價單'}</p>
      </div>

      <div style={s.card}>
        <div style={s.sec}>基本資料</div>
        <div style={s.row2}>
          <div style={s.fg}>
            <label style={s.lbl}>狀態</label>
            <select style={inp} value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="draft">草稿</option>
              <option value="pending">待確認</option>
              <option value="confirmed">已確認</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <div style={s.fg}>
            <label style={s.lbl}>報價日期</label>
            <input style={inp} type="date" value={form.quote_date} onChange={e => setField('quote_date', e.target.value)} />
          </div>
          <div style={s.fg}>
            <label style={s.lbl}>有效期至</label>
            <input style={inp} type="date" value={form.valid_until || ''} onChange={e => setField('valid_until', e.target.value)} />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.sec}>客戶資料</div>
        {clients.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={s.lbl}>從現有客戶選擇</label>
            <select style={inp} onChange={e => selectClient(e.target.value)} defaultValue="">
              <option value="">— 選擇客戶 —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <label style={s.lbl}>客戶名稱 *</label>
          <input style={inp} placeholder="公司/個人名稱" value={form.client_name} onChange={e => setField('client_name', e.target.value)} />
        </div>
        <div style={s.row2}>
          <div style={s.fg}><label style={s.lbl}>聯絡人</label><input style={inp} value={form.contact || ''} onChange={e => setField('contact', e.target.value)} /></div>
          <div style={s.fg}><label style={s.lbl}>電話</label><input style={inp} value={form.phone || ''} onChange={e => setField('phone', e.target.value)} /></div>
          <div style={s.fg}><label style={s.lbl}>電郵</label><input style={inp} type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} /></div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.sec}>報價項目</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={s.th}>描述</th><th style={{ ...s.th, width: 65 }}>數量</th>
                <th style={{ ...s.th, width: 60 }}>單位</th><th style={{ ...s.th, width: 90 }}>單價</th>
                <th style={{ ...s.th, width: 90 }}>小計</th><th style={{ ...s.th, width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, i) => (
                <tr key={i}>
                  <td style={s.td}><input style={{ ...inp, padding: '5px 8px' }} value={it.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="項目描述" /></td>
                  <td style={s.td}><input style={{ ...inp, padding: '5px 8px', width: 60 }} type="number" min="0" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} /></td>
                  <td style={s.td}>
                    <select style={{ ...inp, padding: '5px 6px', width: 55 }} value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={s.td}><input style={{ ...inp, padding: '5px 8px', width: 85 }} type="number" min="0" step="0.01" value={it.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} /></td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{fmt((it.quantity || 0) * (it.unit_price || 0))}</td>
                  <td style={s.td}><button onClick={() => delItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: 16 }}>✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} style={{ textAlign: 'right', padding: '6px 10px', fontSize: 13, color: '#6c757d' }}>小計</td><td style={{ padding: '6px 10px', fontWeight: 500 }}>{fmt(sub)}</td><td></td></tr>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', padding: '4px 10px', fontSize: 13, color: '#6c757d' }}>折扣</td>
                <td><input style={{ ...inp, width: 85, padding: '4px 8px', fontSize: 13 }} type="number" min="0" value={form.discount} onChange={e => setField('discount', e.target.value)} /></td>
                <td style={{ padding: '4px 10px', color: '#c0392b', fontSize: 13 }}>{Number(form.discount) > 0 ? `-${fmt(form.discount)}` : ''}</td><td></td>
              </tr>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', padding: '4px 10px', fontSize: 13, color: '#6c757d' }}>稅率 (%)</td>
                <td><input style={{ ...inp, width: 85, padding: '4px 8px', fontSize: 13 }} type="number" min="0" max="100" value={form.tax_rate} onChange={e => setField('tax_rate', e.target.value)} /></td>
                <td style={{ padding: '4px 10px', fontSize: 13 }}>{fmt(tax)}</td><td></td>
              </tr>
              <tr style={{ background: '#e8f1fc' }}>
                <td colSpan={4} style={{ textAlign: 'right', padding: 10, fontWeight: 700, color: '#1a6fdb', fontSize: 14 }}>合計</td>
                <td style={{ padding: 10, fontWeight: 700, color: '#1a6fdb', fontSize: 15 }}>{fmt(total)}</td><td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button onClick={addItem} style={{ marginTop: 10, padding: '6px 14px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>＋ 增加項目</button>
      </div>

      <div style={s.card}>
        <div style={s.sec}>備註</div>
        <textarea style={{ ...inp, minHeight: 80 }} placeholder="備註…" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} />
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => router.push('/quotes')} style={{ padding: '10px 20px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>取消</button>
        <button onClick={save} disabled={saving} style={{ padding: '10px 24px', background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          {saving ? '儲存中…' : '💾 儲存報價'}
        </button>
      </div>
    </Layout>
  );
}

const s = {
  card: { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: 16, marginBottom: 12 },
  sec: { fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12, paddingBottom: 6, borderBottom: '0.5px solid #dee2e6' },
  row2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 },
  fg: {},
  lbl: { display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 5 },
  th: { padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#6c757d', borderBottom: '0.5px solid #dee2e6' },
  td: { padding: '6px 10px', borderBottom: '0.5px solid #dee2e6', verticalAlign: 'middle' },
};
