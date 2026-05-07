'use client';
// admin/app/users/page.tsx
import { useState } from 'react';
import { CheckCircle, XCircle, Eye, Ban, Shield } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const C = { bg:'#0A0B0F', card:'#111318', border:'#1C1E26', green:'#00E676', red:'#FF4757', amber:'#FFB300', blue:'#3D8EFF', white:'#FFFFFF', gray1:'#E8E9EE', gray2:'#9A9BAA', gray3:'#4A4B5A', gray4:'#1E2028', purple:'#9B59FF' };

async function apiCall(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${API}${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const ROLES = ['all', 'buyer', 'seller', 'dealer', 'admin'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    const data = await apiCall(`/admin/users?page=${page}&q=${q}&role=${role === 'all' ? '' : role}`);
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const blockUser = async (id: string, blocked: boolean) => {
    await apiCall(`/admin/users/${id}/block`, 'PUT', { blocked });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_blocked: blocked } : u));
  };

  const approveCnic = async (id: string) => {
    await apiCall(`/admin/users/${id}/approve-cnic`, 'PUT');
    setUsers(prev => prev.map(u => u.id === id ? { ...u, cnic_verified: true } : u));
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Users</div>
          <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>Manage all registered users</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Search name or phone..."
          style={{ flex: 1, minWidth: 200, padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 13, outline: 'none' }}
        />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 13 }}>
          {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <button onClick={load}
          style={{ padding: '9px 20px', background: C.green, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#000', cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.gray4 }}>
              {['User', 'Phone', 'City', 'Role', 'Verified', 'Trust', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, color: C.gray2, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>
                {loading ? 'Loading...' : 'Search to load users'}
              </td></tr>
            )}
            {users.map((user, i) => (
              <tr key={user.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.green, flexShrink: 0 }}>
                      {user.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{user.full_name}</div>
                      <div style={{ fontSize: 10, color: C.gray3 }}>{user.email || ''}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2 }}>{user.phone}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2 }}>{user.city || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: user.role === 'dealer' ? C.blue : user.role === 'admin' ? C.purple : user.role === 'seller' ? C.green : C.gray2, background: (user.role === 'dealer' ? C.blue : user.role === 'admin' ? C.purple : user.role === 'seller' ? C.green : C.gray3) + '22', padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {user.phone_verified && <span title="Phone verified"><CheckCircle size={14} color={C.green} /></span>}
                    {user.cnic_verified ? <span title="CNIC verified"><Shield size={14} color={C.green} /></span>
                      : <button onClick={() => approveCnic(user.id)} title="Approve CNIC" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Shield size={14} color={C.gray3} /></button>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 40, height: 4, background: C.gray4, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${user.trust_score}%`, background: user.trust_score >= 80 ? C.green : user.trust_score >= 60 ? C.amber : C.red, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, color: C.gray2 }}>{user.trust_score}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: user.is_blocked ? C.red : C.green, background: (user.is_blocked ? C.red : C.green) + '22', padding: '2px 8px', borderRadius: 99 }}>
                    {user.is_blocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ width: 28, height: 28, borderRadius: 8, background: C.gray4, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Eye size={13} color={C.gray2} />
                    </button>
                    <button onClick={() => blockUser(user.id, !user.is_blocked)} style={{ width: 28, height: 28, borderRadius: 8, background: (user.is_blocked ? C.green : C.red) + '22', border: `1px solid ${(user.is_blocked ? C.green : C.red)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Ban size={13} color={user.is_blocked ? C.green : C.red} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
