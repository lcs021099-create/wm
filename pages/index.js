import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { quotesAPI, usersAPI } from '../lib/api';
import Link from 'next/link';

const statusMap = {
  confirmed: { label: '已確認', color: '#2d8a4e', bg: '#e8f5ed' },
  pending:   { label: '待確認', color: '#d4851a', bg: '#fef6e8' },
  draft:     { label: '草稿',   color: '#6c757d', bg: '#f1f3f5' },
  expired:   { label: '已過期', color: '#c0392b', bg: '#fdecea' },
  cancelled: { label: '已取消', color: '#c0392b', bg: '#fdecea' },
};

const fmt = (n) => 'HK$' + Math.round(Number(n) || 0).toLocaleString();

export default function Home() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [user, setUser] = useState(null);
  const [pending, setPending] = useState([]);
  const [actingId, setActingId] = useState(null);

  const loadPending = () => usersAPI.pending().then(r => setPending(r.data)).catch(() => {});

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const parsed = u ? JSON.parse(u) : null;
    setUser(parsed);
    quotesAPI.stats().then(r => setStats(r.data)).catch(() => {});
    quotesAPI.list({ limit: 5 }).then(r => setRecent(r.data.data)).catch(() => {});
    if (parsed?.role === 'admin') loadPending();
  }, []);

  const approve = async (id) => {
    setActingId(id);
    try { await usersAPI.approve(id); await loadPending(); }
    catch (err) { alert(err.response?.data?.error || '批准失敗'); }
    finally { setActingId(null); }
  };

  const reject = async (id) => {
    if (!confirm('確定要拒絕此註冊申請？')) return;
    setActingId(id);
    try { await usersAPI.reject(id); await loadPending(); }
    catch (err) { alert(err.response?.data?.error || '拒絕失敗'); }
    finally { setActingId(null); }
  };

  const statCards = [
    { label: '本月報價', value: stats?.total ?? '-', sub: '份', color: '#1a6fdb', bg: '#e8f1fc' },
    { label: '已確認', value: stats?.confirmed ?? '-', sub: '份', color: '#2d8a4e', bg: '#e8f5ed' },
    { label: '待確認', value: stats?.pending ?? '-', sub: '份', color: '#d4851a', bg: '#fef6e8' },
    { label: '確認金額', value: stats ? fmt(stats.confirmed_revenue) : '-', sub: '', color: '#1a6fdb', bg: '#e8f1fc', small: true },
  ];

  return (
    <Layout>
      <p style={styles.pageTitle}>📊 首頁總覽</p>

      {user?.role === 'admin' && pending.length > 0 && (
        <div style={{ ...styles.card, borderLeft: '3px solid #d4851a', background: '#fffdf7' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>🔔 待批准用戶（{pending.length}）</span>
          </div>
          {pending.map(u => (
            <div key={u.id} style={styles.pendingItem}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <div style={styles.quoteClient}>
                  {u.name} <span style={{ fontSize: 12, color: '#6c757d' }}>({u.username})</span>
                </div>
                <div style={styles.quoteDate}>申請時間：{u.created_at?.slice(0, 10) || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => approve(u.id)} disabled={actingId === u.id} style={styles.approveBtn}>
                  {actingId === u.id ? '…' : '批准'}
                </button>
                <button onClick={() => reject(u.id)} disabled={actingId === u.id} style={styles.rejectBtn}>
                  拒絕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.statsGrid}>
        {statCards.map((s, i) => (
          <div key={i} style={{ ...styles.statCard, borderLeftColor: s.color, background: s.bg }}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={{ ...styles.statValue, fontSize: s.small ? 16 : 22, color: s.color }}>{s.value}</div>
            {s.sub && <div style={styles.statSub}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>最近報價</span>
          <Link href="/quotes" style={styles.linkBtn}>查看全部</Link>
        </div>
        {recent.length === 0 ? (
          <div style={styles.empty}><div>📭</div><p>暫無報價單</p></div>
        ) : recent.map(q => {
          const s = statusMap[q.status] || statusMap.draft;
          return (
            <Link key={q.id} href={`/quotes/${q.id}`} style={styles.quoteItem}>
              <div>
                <div style={styles.quoteNo}>{q.quote_no}</div>
                <div style={styles.quoteDate}>{q.quote_date?.slice(0,10)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '0 10px' }}>
                <div style={styles.quoteClient}>{q.client_name}</div>
                <div style={styles.quoteDate}>{q.contact}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={styles.quoteAmount}>{fmt(q.total)}</div>
                <span style={{ ...styles.badge, color: s.color, background: s.bg }}>{s.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <Link href="/quotes/new" style={{ ...styles.actionBtn, background: '#1a6fdb', color: '#fff', flex: 1 }}>➕ 新增報價</Link>
        <Link href="/clients" style={{ ...styles.actionBtn, background: '#fff', border: '1px solid #dee2e6', flex: 1 }}>👥 客戶管理</Link>
      </div>
    </Layout>
  );
}

const styles = {
  pageTitle: { fontSize: 17, fontWeight: 700, color: '#212529', marginBottom: 14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 },
  statCard: { borderRadius: 10, border: '0.5px solid #dee2e6', borderLeft: '3px solid', padding: 14 },
  statLabel: { fontSize: 11, color: '#6c757d', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700 },
  statSub: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  card: { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: '12px 16px', marginBottom: 12 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: 600 },
  linkBtn: { fontSize: 13, color: '#1a6fdb', textDecoration: 'none', padding: '5px 12px', border: '1px solid #dee2e6', borderRadius: 6 },
  quoteItem: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #dee2e6', textDecoration: 'none', color: 'inherit' },
  quoteNo: { fontSize: 13, fontWeight: 600, color: '#1a6fdb', minWidth: 80 },
  quoteClient: { fontSize: 14, fontWeight: 500, color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  quoteDate: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  quoteAmount: { fontSize: 14, fontWeight: 600 },
  badge: { display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, marginTop: 3 },
  empty: { textAlign: 'center', padding: '30px 0', color: '#6c757d', fontSize: 14 },
  pendingItem: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f0e6cf' },
  approveBtn: { padding: '6px 14px', border: 'none', borderRadius: 6, background: '#2d8a4e', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  rejectBtn: { padding: '6px 14px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', color: '#c0392b', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  actionBtn: { textAlign: 'center', padding: '12px 0', borderRadius: 8, fontWeight: 500, fontSize: 14, textDecoration: 'none', display: 'block' },
};
