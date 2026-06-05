import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { palletsAPI } from '../../lib/api';

const gradeColors = { A: { bg: '#e8f5ed', border: '#2d8a4e', color: '#2d8a4e' }, B: { bg: '#fef6e8', border: '#d4851a', color: '#d4851a' }, C: { bg: '#fdecea', border: '#c0392b', color: '#c0392b' } };
const fmtDate = (d) => d ? new Date(d).toLocaleString('zh-HK', { timeZone: 'Asia/Shanghai' }) : '—';

export default function PalletDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [pallet, setPallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const r = await palletsAPI.get(id);
      setPallet(r.data);
      setGrade(r.data.quality_grade || '');
      setNotes(r.data.quality_notes || '');
    } catch { router.push('/inventory'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const saveGrade = async () => {
    setSaving(true);
    try {
      await palletsAPI.update(id, { quality_grade: grade, quality_notes: notes });
      alert('品質分級已更新');
      await load();
    } catch (err) { alert('更新失敗: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const doOut = async () => {
    if (!confirm('確定將此板出庫？')) return;
    try {
      await palletsAPI.out(id, { notes: '手動出庫' });
      alert('已出庫');
      await load();
    } catch (err) { alert('出庫失敗: ' + (err.response?.data?.error || err.message)); }
  };

  const doDelete = async () => {
    if (!confirm('確定刪除此記錄？此操作不可恢復。')) return;
    try { await palletsAPI.delete(id); router.push('/inventory'); }
    catch (err) { alert('刪除失敗'); }
  };

  if (loading) return <Layout><div style={{ textAlign: 'center', padding: 40, color: '#999' }}>載入中…</div></Layout>;
  if (!pallet) return <Layout><div style={{ textAlign: 'center', padding: 40 }}>找不到記錄</div></Layout>;

  const gc = gradeColors[pallet.quality_grade];

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => router.push('/inventory')} style={backBtn}>&larr;</button>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>板詳情</p>
        {pallet.status === 'in_stock' && <span style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 20, color: '#1a6fdb', background: '#e8f1fc' }}>在庫</span>}
        {pallet.status === 'out' && <span style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 20, color: '#6c757d', background: '#f1f3f5' }}>已出庫</span>}
      </div>

      {/* 紙種 & 品質 */}
      <div style={{ ...card, background: gc ? gc.bg : '#f8f9fa', borderColor: gc ? gc.border : '#dee2e6' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: gc ? gc.color : '#333' }}>{pallet.paper_type || '未知紙種'}</div>
        <div style={{ fontSize: 14, color: gc ? gc.color : '#6c757d', marginTop: 4 }}>
          {pallet.quality_grade ? `品質等級: ${pallet.quality_grade}` : '未分級'} {pallet.graded_by ? ` · 由 ${pallet.graded_by} 評定` : ''}
        </div>
      </div>

      {/* 標籤資料 */}
      <div style={card}>
        <div style={sec}>標籤資料</div>
        {[
          ['板號 Pal.-Nr.', pallet.pallet_no],
          ['訂單編號 Com.-Nr.', pallet.commission_no],
          ['批次碼 MaRu', pallet.batch_code],
          ['尺寸 Format', pallet.format_size],
          ['厚度 Caliper', pallet.caliper ? pallet.caliper + ' mm' : ''],
          ['重量', pallet.weight ? pallet.weight + ' kg' : ''],
          ['張數', pallet.sheets ? pallet.sheets + ' pcs' : ''],
          ['供應商', pallet.supplier],
          ['客戶', pallet.customer],
          ['生產日期', pallet.production_date],
          ['出貨日期', pallet.shipment_date],
          ['產地', pallet.origin],
          ['存放位置', pallet.location],
          ['條碼', pallet.barcode],
        ].filter(([,v]) => v).map(([k, v]) => (
          <div key={k} style={row}><span style={{ color: '#6c757d', fontSize: 13 }}>{k}</span><span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span></div>
        ))}
        <div style={{ ...row, borderBottom: 'none' }}><span style={{ color: '#6c757d', fontSize: 13 }}>入庫時間</span><span style={{ fontSize: 13 }}>{fmtDate(pallet.created_at)}</span></div>
      </div>

      {/* 品質分級（可編輯） */}
      {pallet.status === 'in_stock' && (
        <div style={card}>
          <div style={sec}>品質分級</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['A', 'B', 'C'].map(g => {
              const c = gradeColors[g]; const on = grade === g;
              return (
                <button key={g} onClick={() => setGrade(on ? '' : g)}
                  style={{ flex: 1, padding: '12px 8px', border: `2px solid ${on ? c.border : '#dee2e6'}`, borderRadius: 10, background: on ? c.bg : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: on ? c.color : '#adb5bd' }}>{g}</div>
                  <div style={{ fontSize: 11, color: on ? c.color : '#adb5bd' }}>{{ A: '優良', B: '正常', C: '次品' }[g]}</div>
                </button>
              );
            })}
          </div>
          <textarea style={{ ...inp, minHeight: 50 }} placeholder="品質備註…" value={notes} onChange={e => setNotes(e.target.value)} />
          <button onClick={saveGrade} disabled={saving} style={{ ...primaryBtn, width: '100%', marginTop: 8 }}>{saving ? '保存中…' : '更新品質分級'}</button>
        </div>
      )}

      {/* 交易記錄 */}
      {pallet.transactions?.length > 0 && (
        <div style={card}>
          <div style={sec}>交易記錄</div>
          {pallet.transactions.map(t => (
            <div key={t.id} style={{ ...row, gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.type === 'in' ? '#2d8a4e' : '#c0392b' }}>{t.type === 'in' ? '入庫' : '出庫'}</span>
              <span style={{ fontSize: 12, color: '#6c757d', flex: 1 }}>{t.notes || ''}</span>
              <span style={{ fontSize: 11, color: '#adb5bd' }}>{fmtDate(t.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 操作按鈕 */}
      {pallet.status === 'in_stock' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={doOut} style={{ ...primaryBtn, flex: 1, background: '#d4851a' }}>📤 出庫</button>
          <button onClick={doDelete} style={{ padding: '10px 16px', background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>🗑</button>
        </div>
      )}
    </Layout>
  );
}

const card = { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: 16, marginBottom: 12 };
const sec = { fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12, paddingBottom: 6, borderBottom: '0.5px solid #dee2e6' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid #f1f3f5' };
const inp = { border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn = { padding: '10px 20px', background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const backBtn = { padding: '6px 12px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16 };
