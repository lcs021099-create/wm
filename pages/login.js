import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { authAPI } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || '登入失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }} />
          <h1 style={styles.title}>報價管理系統</h1>
          <p style={styles.sub}>請登入以繼續使用</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={styles.group}>
            <label style={styles.label}>用戶名稱</label>
            <input style={styles.input} placeholder="輸入用戶名稱" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div style={styles.group}>
            <label style={styles.label}>密碼</label>
            <input style={styles.input} type="password" placeholder="輸入密碼" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
          <p style={styles.footer}>
            還沒有帳號？<Link href="/register" style={styles.footerLink}>註冊新帳號</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#1a6fdb,#0d4a9e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400 },
  logo: { textAlign: 'center', marginBottom: 28 },
  logoIcon: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 700, color: '#212529', margin: 0 },
  sub: { fontSize: 14, color: '#6c757d', marginTop: 6 },
  group: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1px solid #dee2e6', borderRadius: 6, fontSize: 15, boxSizing: 'border-box', outline: 'none' },
  error: { color: '#c0392b', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: { width: '100%', padding: 13, background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  footer: { textAlign: 'center', fontSize: 13, color: '#6c757d', marginTop: 18 },
  footerLink: { color: '#1a6fdb', textDecoration: 'none', fontWeight: 500 },
};
