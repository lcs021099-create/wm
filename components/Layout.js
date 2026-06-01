import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!token) { router.push('/login'); return; }
    if (u) setUser(JSON.parse(u));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { href: '/', icon: '🏠', label: '首頁' },
    { href: '/quotes', icon: '📄', label: '報價單' },
    { href: '/quotes/new', icon: '➕', label: '新增' },
    { href: '/clients', icon: '👥', label: '客戶' },
    { href: '/settings', icon: '⚙️', label: '設定' },
  ];

  const active = (href) => {
    if (href === '/') return router.pathname === '/';
    return router.pathname.startsWith(href);
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: 64 }}>
      {/* 頂部 */}
      <div style={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40, width: 'auto', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.avatar}>{user.name?.[0] || 'U'}</div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{user.name}</span>
          <button onClick={logout} style={styles.logoutBtn} title="登出">🚪</button>
        </div>
      </div>

      {/* 內容 */}
      <div style={styles.content}>{children}</div>

      {/* 底部導航 */}
      <nav style={styles.bottomnav}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{ ...styles.navItem, color: active(item.href) ? '#1a6fdb' : '#6c757d', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10 }}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

const styles = {
  topbar: { background: '#fff', borderBottom: '0.5px solid #dee2e6', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: '#1a6fdb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 },
  logoutBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 6 },
  content: { maxWidth: 800, margin: '0 auto', padding: 16 },
  bottomnav: { background: '#fff', borderTop: '0.5px solid #dee2e6', display: 'flex', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 },
  navItem: { flex: 1, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
};
