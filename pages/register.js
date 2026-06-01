import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', name: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('兩次輸入的密碼不一致');
    if (form.password.length < 6) return setError('密碼至少需 6 個字元');
    setLoading(true);
    try {
      await authAPI.register({ username: form.username, name: form.name, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || '註冊失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/logo.png" alt="Logo" style={{ width: 104, height: 104, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }} />
          <h1 style={styles.title}>註冊新帳號</h1>
          <p style={styles.sub}>建立帳號後需等待管理員批准</p>
        </div>

        {done ? (
          <div style={styles.success}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#212529', margin: 0 }}>註冊申請已送出</p>
            <p style={{ fontSize: 14, color: '#6c757d', marginTop: 8 }}>
              請等待管理員批准後即可登入。
            </p>
            <Link href="/login" style={{ ...styles.btn, display: 'block', textDecoration: 'none', marginTop: 18, boxSizing: 'border-box' }}>
              返回登入
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={styles.group}>
              <label style={styles.label}>用戶名稱</label>
              <input style={styles.input} placeholder="輸入用戶名稱" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>顯示名稱</label>
              <input style={styles.input} placeholder="輸入您的姓名" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>密碼</label>
              <input style={styles.input} type="password" placeholder="至少 6 個字元" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>確認密碼</label>
              <input style={styles.input} type="password" placeholder="再次輸入密碼" value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? '送出中...' : '送出註冊申請'}
            </button>
            <p style={styles.footer}>
              已有帳號？<Link href="/login" style={styles.footerLink}>前往登入</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#eef0f3,#d7dce2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' },
  logo: { textAlign: 'center', marginBottom: 28 },
  logoIcon: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 700, color: '#212529', margin: 0 },
  sub: { fontSize: 14, color: '#6c757d', marginTop: 6 },
  group: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1px solid #dee2e6', borderRadius: 6, fontSize: 15, boxSizing: 'border-box', outline: 'none' },
  error: { color: '#c0392b', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: { width: '100%', padding: 13, background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
  footer: { textAlign: 'center', fontSize: 13, color: '#6c757d', marginTop: 18 },
  footerLink: { color: '#1a6fdb', textDecoration: 'none', fontWeight: 500 },
  success: { textAlign: 'center', padding: '10px 0' },
};
