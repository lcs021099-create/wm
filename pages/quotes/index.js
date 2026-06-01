import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { quotesAPI } from '../../lib/api';
import Link from 'next/link';

const statusMap = {
  all:       { label: '全部' },
  confirmed: { label: '已確認', color: '#2d8a4e', bg: '#e8f5ed' },
  pending:   { label: '待確認', color: '#d4851a', bg: '#fef6e8' },
  draft:     { label: '草稿',   color: '#6c757d', bg: '#f1f3f5' },
  expired:   { label: '已過期', color: '#c0392b', bg: '#fdecea' },
};
const fmt = (n) => 'HK$' + Math.round(Number(n) || 0).toLocaleString();

export default function QuotesList() {
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await quotesAPI.list({ search, status, page, limit: 20 });
      setQuotes(r.data.data);
      setTotal(r.data.total);
    } finally { setLoading(false); }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={styles.pageTitle}>📄 報價單列表</p>
        <Link href="/quotes/new" style={styles.newBtn}>＋ 新增</Link>
      </div>

      <input style={styles.searchInput} placeholder="搜尋客戶、編號、聯絡人…" value={search} onChange={handleSearch} />

      <div style={styles.tabs}>
        {Object.entries(statusMap).map(([k, v]) => (
          <button key={k} style={{ ...styles.tab, ...(status === (k === 'all' ? '' : k) ? styles.tabActive : {}) }}
            onClick={() => { setStatus(k === 'all' ? '' : k); setPage(1); }}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {loading ? <div style={styles.empty}>載入中…</div> :
          quotes.length === 0 ? <div style={styles.empty}><div>📭</div><p>沒有相關報價單</p></div> :
          quotes.map(q => {
            const s = statusMap[q.status] || statusMap.draft;
            return (
              <Link key={q.id} href={`/quotes/${q.id}`} style={styles.item}>
                <div>
                  <div style={styles.quoteNo}>{q.quote_no}</div>
                  <div style={styles.meta}>{q.quote_date?.slice(0,10)}</div>
                </div>
                <div style={{ flex: 1, padding: '0 10px', minWidth: 0 }}>
                  <div style={styles.client}>{q.client_name}</div>
                  <div style={styles.meta}>{q.contact}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.amount}>{fmt(q.total)}</div>
                  <span style={{ ...styles.badge, color: s.color, background: s.bg }}>{s.label}</span>
                </div>
              </Link>
            );
          })
        }
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button style={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一頁</button>
          <span style={{ padding: '6px 12px', fontSize: 13 }}>{page} / {Math.ceil(total / 20)}</span>
          <button style={styles.pageBtn} disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>下一頁</button>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  pageTitle: { fontSize: 17, fontWeight: 700, margin: 0 },
  newBtn: { padding: '8px 16px', background: '#1a6fdb', color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 500, textDecoration: 'none' },
  searchInput: { width: '100%', padding: '9px 12px', border: '1px solid #dee2e6', borderRadius: 6, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' },
  tabs: { display: 'flex', gap: 2, background: '#f1f3f5', borderRadius: 6, padding: 3, marginBottom: 12 },
  tab: { flex: 1, padding: '7px 4px', border: 'none', background: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#6c757d' },
  tabActive: { background: '#fff', color: '#1a6fdb' },
  card: { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: '4px 16px' },
  item: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #dee2e6', textDecoration: 'none', color: 'inherit' },
  quoteNo: { fontSize: 12, fontWeight: 600, color: '#1a6fdb', minWidth: 80 },
  meta: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  client: { fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  amount: { fontSize: 14, fontWeight: 600 },
  badge: { display: 'inline-block', fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 500, marginTop: 3 },
  empty: { textAlign: 'center', padding: '30px 0', color: '#6c757d', fontSize: 14 },
  pageBtn: { padding: '6px 14px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 },
};
