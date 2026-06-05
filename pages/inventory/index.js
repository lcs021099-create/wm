import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { palletsAPI } from '../../lib/api';
import Link from 'next/link';

const gradeBadge = (g) => {
  const map = { A: { color: '#2d8a4e', bg: '#e8f5ed', label: 'A 優良' }, B: { color: '#d4851a', bg: '#fef6e8', label: 'B 正常' }, C: { color: '#c0392b', bg: '#fdecea', label: 'C 次品' } };
  const s = map[g]; if (!s) return <span style={{ fontSize: 11, color: '#999' }}>未分級</span>;
  return <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, color: s.color, background: s.bg }}>{s.label}</span>;
};
const statusBadge = (st) => {
  if (st === 'out') return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: '#6c757d', background: '#f1f3f5' }}>已出庫</span>;
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: '#1a6fdb', background: '#e8f1fc' }}>在庫</span>;
};

export default function InventoryPage() {
  const [stats, setStats] = useState(null);
  const [pallets, setPallets] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        palletsAPI.stats(), palletsAPI.list({ search, status: filter || undefined })
      ]);
      setStats(s.data); setPallets(p.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search, filter]);

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📦 庫存管理</p>
        <Link href="/inventory/scan" style={{ padding: '8px 16px', background: '#1a6fdb', color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>📷 掃碼入庫</Link>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 14 }}>
          {[
            { label: '在庫', value: stats.inStock, color: '#1a6fdb' },
            { label: 'A 優良', value: stats.gradeA, color: '#2d8a4e' },
            { label: 'B 正常', value: stats.gradeB, color: '#d4851a' },
            { label: 'C 次品', value: stats.gradeC, color: '#c0392b' },
            { label: '未分級', value: stats.ungraded, color: '#6c757d' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', textAlign: 'center', border: '0.5px solid #dee2e6' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 搜尋和篩選 */}
      <input style={inp} placeholder="搜尋板號、紙種、批次碼…" value={search} onChange={e => { setSearch(e.target.value); }} />
      <div style={{ display: 'flex', gap: 2, background: '#f1f3f5', borderRadius: 6, padding: 3, marginBottom: 12 }}>
        {[['', '全部'], ['in_stock', '在庫'], ['out', '已出庫']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: filter === k ? '#fff' : 'none', color: filter === k ? '#1a6fdb' : '#6c757d' }}>
            {l}
          </button>
        ))}
      </div>

      {/* 板列表 */}
      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: '4px 16px' }}>
        {loading ? <div style={empty}>載入中…</div> :
          pallets.length === 0 ? <div style={empty}><div>📭</div><p>沒有庫存記錄</p></div> :
          pallets.map(p => (
            <Link key={p.id} href={`/inventory/${p.id}`} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #dee2e6', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.paper_type || '未知紙種'}</div>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>
                  {p.pallet_no || '—'} · {p.format_size || '—'} · {p.weight ? p.weight + 'kg' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 2 }}>{p.batch_code || ''} {p.commission_no ? `#${p.commission_no}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                {gradeBadge(p.quality_grade)}
                <div style={{ marginTop: 4 }}>{statusBadge(p.status)}</div>
              </div>
            </Link>
          ))
        }
      </div>
    </Layout>
  );
}

const inp = { width: '100%', padding: '9px 12px', border: '1px solid #dee2e6', borderRadius: 6, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' };
const empty = { textAlign: 'center', padding: '30px 0', color: '#6c757d', fontSize: 14 };
