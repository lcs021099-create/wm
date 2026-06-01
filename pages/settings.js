import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { authAPI, usersAPI } from '../lib/api';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'staff' });
  const [userMsg, setUserMsg] = useState('');
  const [tab, setTab] = useState('account');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    usersAPI.list().then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const changePw = async () => {
    if (pwForm.newPassword !== pwForm.confirm) return setPwMsg('新密碼與確認不符');
    try {
      await authAPI.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      setPwMsg('✅ 密碼已更新');
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setPwMsg('❌ ' + (err.response?.data?.error || '更新失敗')); }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) return setUserMsg('請填寫所有必填欄位');
    try {
      await usersAPI.create(newUser);
      const r = await usersAPI.list();
      setUsers(r.data);
      setNewUser({ username: '', password: '', name: '', role: 'staff' });
      setUserMsg('✅ 用戶已新增');
    } catch (err) { setUserMsg('❌ ' + (err.response?.data?.error || '新增失敗')); }
  };

  const toggleUser = async (u) => {
    await usersAPI.update(u.id, { ...u, active: u.active ? 0 : 1 });
    const r = await usersAPI.list();
    setUsers(r.data);
  };

  const inp = { border: '1px solid #dee2e6', borderRadius: 6, padding: '9px 11px', fontSize: 14, width: '100%', boxSizing: 'border-box' };

  return (
    <Layout>
      <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>⚙️ 系統設定</p>

      <div style={{ display: 'flex', gap: 2, background: '#f1f3f5', borderRadius: 6, padding: 3, marginBottom: 14 }}>
        {[['account','帳戶'],['users','用戶管理'],['about','關於']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: tab===k ? '#fff' : 'none', color: tab===k ? '#1a6fdb' : '#6c757d' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <>
          <div style={card}>
            <div style={sec}>👤 帳戶資料</div>
            {[['用戶名稱', user?.username], ['顯示名稱', user?.name], ['角色', user?.role === 'admin' ? '管理員' : '業務員']].map(([k,v]) => (
              <div key={k} style={row}><span style={{ color: '#6c757d', fontSize: 14 }}>{k}</span><span style={{ fontWeight: 500, fontSize: 14 }}>{v}</span></div>
            ))}
          </div>
          <div style={card}>
            <div style={sec}>🔐 更改密碼</div>
            {['oldPassword', 'newPassword', 'confirm'].map((k, i) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={lbl}>{['現有密碼','新密碼','確認新密碼'][i]}</label>
                <input style={inp} type="password" value={pwForm[k]} onChange={e => setPwForm({ ...pwForm, [k]: e.target.value })} />
              </div>
            ))}
            {pwMsg && <p style={{ fontSize: 13, marginBottom: 10, color: pwMsg.startsWith('✅') ? '#2d8a4e' : '#c0392b' }}>{pwMsg}</p>}
            <button onClick={changePw} style={primaryBtn}>更新密碼</button>
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          <div style={card}>
            <div style={sec}>➕ 新增用戶</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
              {[['username','帳號'],['name','姓名'],['password','密碼']].map(([k,l]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input style={inp} type={k==='password'?'password':'text'} value={newUser[k]} onChange={e => setNewUser({...newUser,[k]:e.target.value})} />
                </div>
              ))}
              <div>
                <label style={lbl}>角色</label>
                <select style={inp} value={newUser.role} onChange={e => setNewUser({...newUser,role:e.target.value})}>
                  <option value="staff">業務員</option>
                  <option value="admin">管理員</option>
                </select>
              </div>
            </div>
            {userMsg && <p style={{ fontSize: 13, marginBottom: 10, color: userMsg.startsWith('✅') ? '#2d8a4e' : '#c0392b' }}>{userMsg}</p>}
            <button onClick={addUser} style={primaryBtn}>新增用戶</button>
          </div>

          <div style={card}>
            <div style={sec}>用戶列表</div>
            {users.map(u => (
              <div key={u.id} style={row}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name} <span style={{ fontSize: 12, color: '#6c757d' }}>({u.username})</span></div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>{u.role === 'admin' ? '管理員' : '業務員'}</div>
                </div>
                <button onClick={() => toggleUser(u)}
                  style={{ padding: '4px 12px', border: '1px solid #dee2e6', borderRadius: 6, background: u.active ? '#fff' : '#fdecea', color: u.active ? '#212529' : '#c0392b', cursor: 'pointer', fontSize: 13 }}>
                  {u.active ? '啟用中' : '已停用'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'about' && (
        <div style={card}>
          <div style={sec}>關於系統</div>
          {[['系統名稱','報價管理系統'],['版本','v1.0.0'],['前端','Next.js on Vercel'],['後端','Node.js Express'],['資料庫','SQL Server (MSSQL)'],['穿透','Cloudflare Tunnel']].map(([k,v]) => (
            <div key={k} style={row}><span style={{ color: '#6c757d', fontSize: 14 }}>{k}</span><span style={{ fontWeight: 500, fontSize: 14 }}>{v}</span></div>
          ))}
        </div>
      )}
    </Layout>
  );
}

const card = { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: '12px 16px', marginBottom: 12 };
const sec = { fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '0.5px solid #dee2e6' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #dee2e6' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 5 };
const primaryBtn = { padding: '9px 20px', background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 };
