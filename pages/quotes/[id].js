import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { quotesAPI } from '../../lib/api';
import Link from 'next/link';

const statusMap = {
  confirmed: { label: '已確認', color: '#2d8a4e', bg: '#e8f5ed' },
  pending:   { label: '待確認', color: '#d4851a', bg: '#fef6e8' },
  draft:     { label: '草稿',   color: '#6c757d', bg: '#f1f3f5' },
  expired:   { label: '已過期', color: '#c0392b', bg: '#fdecea' },
  cancelled: { label: '已取消', color: '#c0392b', bg: '#fdecea' },
};
const fmt = (n) => 'HK$' + Math.round(Number(n) || 0).toLocaleString();

export default function QuoteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    quotesAPI.get(id).then(r => setQuote(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('確定刪除此報價單？')) return;
    await quotesAPI.delete(id);
    router.push('/quotes');
  };

  const handleCopy = async () => {
    try {
      await quotesAPI.copy(id);
      router.push('/quotes');
    } catch { alert('複製失敗'); }
  };

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>載入中…</p></Layout>;
  if (!quote) return <Layout><p style={{ textAlign: 'center', padding: 40 }}>找不到報價單</p></Layout>;

  const s = statusMap[quote.status] || statusMap.draft;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6c757d' }}>←</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCopy} style={btn.outline}>📋 複製</button>
          <Link href={`/quotes/${id}/edit`} style={btn.primary}>✏️ 編輯</Link>
          <button onClick={handleDelete} style={btn.danger}>🗑</button>
        </div>
      </div>

      {/* 標題卡 */}
      <div style={{ background: '#1a6fdb', borderRadius: 10, padding: 16, marginBottom: 12, color: '#fff' }}>
        <div style={{ fontSize: 12, opacity: .8, marginBottom: 4 }}>{quote.quote_no}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{quote.client_name}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, opacity: .85, flexWrap: 'wrap' }}>
          {quote.contact && <span>👤 {quote.contact}</span>}
          <span>📅 {quote.quote_date?.slice(0,10)}</span>
          {quote.valid_until && <span>⏰ 有效至 {quote.valid_until?.slice(0,10)}</span>}
        </div>
      </div>

      {/* 基本資訊 */}
      <div style={card}>
        {[
          ['狀態', <span style={{ ...badge, color: s.color, background: s.bg }}>{s.label}</span>],
          ['電話', quote.phone || '-'],
          ['電郵', quote.email || '-'],
          ['建立者', quote.created_by_name || '-'],
        ].map(([k, v]) => (
          <div key={k} style={row}>
            <span style={{ color: '#6c757d', fontSize: 14 }}>{k}</span>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* 項目表 */}
      <div style={card}>
        <div style={sec}>報價項目</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8f9fa' }}>
              <th style={th}>描述</th><th style={{ ...th, width: 50 }}>數量</th>
              <th style={{ ...th, width: 40 }}>單位</th><th style={{ ...th, width: 80 }}>單價</th>
              <th style={{ ...th, width: 90 }}>小計</th>
            </tr></thead>
            <tbody>
              {(quote.items || []).map((it, i) => (
                <tr key={i}>
                  <td style={td}>{it.description}</td>
                  <td style={td}>{it.quantity}</td>
                  <td style={td}>{it.unit}</td>
                  <td style={td}>{fmt(it.unit_price)}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} style={{ textAlign: 'right', padding: '6px 10px', color: '#6c757d' }}>小計</td><td style={{ padding: '6px 10px', fontWeight: 500 }}>{fmt(quote.subtotal)}</td></tr>
              {Number(quote.discount) > 0 && <tr><td colSpan={4} style={{ textAlign: 'right', padding: '4px 10px', color: '#6c757d' }}>折扣</td><td style={{ padding: '4px 10px', color: '#c0392b' }}>-{fmt(quote.discount)}</td></tr>}
              {Number(quote.tax_rate) > 0 && <tr><td colSpan={4} style={{ textAlign: 'right', padding: '4px 10px', color: '#6c757d' }}>稅款 ({quote.tax_rate}%)</td><td style={{ padding: '4px 10px' }}>{fmt(quote.tax_amount)}</td></tr>}
              <tr style={{ background: '#e8f1fc' }}>
                <td colSpan={4} style={{ textAlign: 'right', padding: 10, fontWeight: 700, color: '#1a6fdb', fontSize: 14 }}>合計</td>
                <td style={{ padding: 10, fontWeight: 700, color: '#1a6fdb', fontSize: 16 }}>{fmt(quote.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {quote.notes && (
        <div style={{ ...card, background: '#f8f9fa' }}>
          <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>備註</div>
          <div style={{ fontSize: 14 }}>{quote.notes}</div>
        </div>
      )}
    </Layout>
  );
}

const card = { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: '12px 16px', marginBottom: 12 };
const sec = { fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid #dee2e6' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #dee2e6' };
const badge = { display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 };
const th = { padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#6c757d', borderBottom: '0.5px solid #dee2e6' };
const td = { padding: '8px 10px', borderBottom: '0.5px solid #dee2e6', fontSize: 13 };
const btn = {
  outline: { padding: '7px 14px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 },
  primary: { padding: '7px 14px', background: '#1a6fdb', color: '#fff', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 500 },
  danger: { padding: '7px 12px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
};
