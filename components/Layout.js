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
    { href: '/inventory', icon: '📦', label: '庫存' },
    { href: '/settings', icon: '⚙️', label: '設定' },
  ];

  const active = (href) => {
    if (href === '/') return router.pathname === '/';
    return router.pathname.startsWith(href);
  };

  if (!user) return null;

  return (
    <div className="app">
      {/* 頂部 */}
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="Logo" className="logo" />
        </div>
        <div className="user">
          <div className="avatar">{user.name?.[0] || 'U'}</div>
          <span className="uname">{user.name}</span>
          <button onClick={logout} className="logout" title="登出">🚪</button>
        </div>
      </header>

      {/* 電腦：左側導航 */}
      <aside className="sidebar">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={`sideItem${active(item.href) ? ' on' : ''}`}>
            <span className="ic">{item.icon}</span>
            <span className="lb">{item.label}</span>
          </Link>
        ))}
      </aside>

      {/* 內容 */}
      <main className="content">{children}</main>

      {/* 手機：底部導航 */}
      <nav className="bottomnav">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={`navItem${active(item.href) ? ' on' : ''}`}>
            <span className="ic2">{item.icon}</span>
            <span className="lb2">{item.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .app {
          min-height: 100vh;
          background: #f8f9fa;
        }
        .topbar {
          background: #fff;
          border-bottom: 0.5px solid #dee2e6;
          padding: 0 16px;
          padding-top: env(safe-area-inset-top);
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo {
          height: 40px;
          width: auto;
          display: block;
        }
        .user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #1a6fdb;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }
        .uname {
          font-size: 13px;
          color: #6c757d;
        }
        .logout {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 6px;
        }

        /* 左側 sidebar：手機隱藏 */
        .sidebar {
          display: none;
        }

        .content {
          max-width: 800px;
          margin: 0 auto;
          padding: 16px;
          padding-bottom: calc(64px + env(safe-area-inset-bottom));
        }

        /* 手機底部導航 */
        .bottomnav {
          background: #fff;
          border-top: 0.5px solid #dee2e6;
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .navItem {
          flex: 1;
          padding: 10px 4px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: #6c757d;
          text-decoration: none;
        }
        .navItem .ic2 {
          font-size: 20px;
        }
        .navItem .lb2 {
          font-size: 10px;
        }
        .navItem.on {
          color: #1a6fdb;
        }

        /* ====== 電腦（≥768px）：導航移到左側 ====== */
        @media (min-width: 768px) {
          .sidebar {
            display: flex;
            flex-direction: column;
            gap: 4px;
            position: fixed;
            top: calc(54px + env(safe-area-inset-top));
            left: 0;
            bottom: 0;
            width: 220px;
            background: #fff;
            border-right: 0.5px solid #dee2e6;
            padding: 14px 12px;
            z-index: 90;
          }
          .sideItem {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 11px 14px;
            border-radius: 8px;
            color: #495057;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
          }
          .sideItem .ic {
            font-size: 18px;
          }
          .sideItem:hover {
            background: #f1f3f5;
          }
          .sideItem.on {
            background: #e8f1fc;
            color: #1a6fdb;
          }

          .bottomnav {
            display: none;
          }

          .content {
            margin: 0;
            margin-left: 220px;
            max-width: 980px;
            padding: 24px 32px;
          }
        }
      `}</style>
    </div>
  );
}
