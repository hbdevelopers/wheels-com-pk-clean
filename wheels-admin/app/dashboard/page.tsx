// admin/app/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Users, Car, DollarSign, AlertTriangle, TrendingUp, ShieldCheck, Bell, Settings, LogOut, Menu, ChevronDown, Eye, Trash2, CheckCircle, XCircle, Flag, BarChart2, Package, Tag, Wrench } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ── Color tokens ─────────────────────────────────────────────
const C = {
  bg: '#0A0B0F',
  sidebar: '#0D0E14',
  card: '#111318',
  border: '#1C1E26',
  green: '#00E676',
  greenDim: '#00C85A',
  red: '#FF4757',
  amber: '#FFB300',
  blue: '#3D8EFF',
  purple: '#9B59FF',
  white: '#FFFFFF',
  gray1: '#E8E9EE',
  gray2: '#9A9BAA',
  gray3: '#4A4B5A',
  gray4: '#1E2028',
};

// ── Mock stats ────────────────────────────────────────────────
const STATS = [
  { label: 'Total Users', value: '48,291', change: '+12.4%', up: true, icon: Users, color: C.blue },
  { label: 'Active Listings', value: '12,847', change: '+8.1%', up: true, icon: Car, color: C.green },
  { label: 'Revenue (PKR)', value: '4.2 Cr', change: '+23.7%', up: true, icon: DollarSign, color: C.purple },
  { label: 'Fraud Reports', value: '34', change: '-18%', up: false, icon: AlertTriangle, color: C.amber },
];

const RECENT_LISTINGS = [
  { id: 1, title: '2022 Toyota Corolla Altis', seller: 'Ahmed Raza', city: 'Lahore', price: '65 Lac', status: 'pending', flagged: false, time: '2m ago' },
  { id: 2, title: '2021 Honda Civic Oriel', seller: 'AutoMax KHI', city: 'Karachi', price: '72 Lac', status: 'active', flagged: false, time: '8m ago' },
  { id: 3, title: '2019 Suzuki Alto VXR', seller: 'Bilal Hassan', city: 'Islamabad', price: '22 Lac', status: 'pending', flagged: true, time: '15m ago' },
  { id: 4, title: '2023 Hyundai Tucson AWD', seller: 'Premier Motors', city: 'Lahore', price: '1.18 Cr', status: 'active', flagged: false, time: '32m ago' },
  { id: 5, title: '2020 KIA Sportage FWD', seller: 'Usman Ali', city: 'Rawalpindi', price: '82 Lac', status: 'rejected', flagged: true, time: '1h ago' },
];

const RECENT_USERS = [
  { id: 1, name: 'Ahmed Raza', phone: '0300-1234567', city: 'Lahore', role: 'seller', verified: true, listings: 3, joined: '2d ago' },
  { id: 2, name: 'AutoMax KHI', phone: '0333-9876543', city: 'Karachi', role: 'dealer', verified: true, listings: 47, joined: '5d ago' },
  { id: 3, name: 'Sara Khan', phone: '0312-5554443', city: 'Islamabad', role: 'buyer', verified: false, listings: 0, joined: '1d ago' },
  { id: 4, name: 'Bilal Hassan', phone: '0321-7778889', city: 'Faisalabad', role: 'seller', verified: true, listings: 1, joined: '3d ago' },
];

// Revenue sparkline data
const REVENUE_DATA = [12, 18, 14, 22, 19, 28, 31, 26, 35, 38, 42, 48];
const LISTING_DATA = [80, 92, 76, 110, 98, 125, 118, 140, 132, 158, 172, 168];

// ── Reusable Components ────────────────────────────────────────
function StatCard({ label, value, change, up, icon: Icon, color }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '20px 24px', flex: 1, minWidth: 200,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          color: up ? C.green : C.red, background: up ? C.green + '22' : C.red + '22',
        }}>{up ? '↑' : '↓'} {change}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.white, letterSpacing: '-1px', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.gray2 }}>{label}</div>
    </div>
  );
}

function MiniChart({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 160, H = 48;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`g${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { color: C.amber, label: 'Pending' },
    active: { color: C.green, label: 'Active' },
    rejected: { color: C.red, label: 'Rejected' },
    sold: { color: C.blue, label: 'Sold' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.color + '22', padding: '3px 9px', borderRadius: 99 }}>
      {s.label}
    </span>
  );
}

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ active, setActive, collapsed }) {
  const nav = [
    { id: 'dashboard', icon: BarChart2, label: 'Dashboard' },
    { id: 'listings', icon: Car, label: 'Listings', badge: 34 },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'dealers', icon: Package, label: 'Dealers' },
    { id: 'auctions', icon: Tag, label: 'Auctions' },
    { id: 'reports', icon: Flag, label: 'Reports', badge: 12 },
    { id: 'revenue', icon: DollarSign, label: 'Revenue' },
    { id: 'notifications', icon: Bell, label: 'Push Notifications' },
    { id: 'inspections', icon: Wrench, label: 'Inspections' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div style={{
      width: collapsed ? 64 : 220, background: C.sidebar,
      borderRight: `1px solid ${C.border}`, height: '100vh',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      transition: 'width 0.2s',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: C.green, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>W</div>
        {!collapsed && <div style={{ fontSize: 14, fontWeight: 800, color: C.white }}>wheels<span style={{ color: C.green }}>.pk</span> <span style={{ fontSize: 10, color: C.gray3, fontWeight: 500 }}>Admin</span></div>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: active === item.id ? C.green + '18' : 'transparent',
            color: active === item.id ? C.green : C.gray2,
            marginBottom: 2, position: 'relative',
            transition: 'all 0.15s',
          }}>
            <item.icon size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: 13, fontWeight: active === item.id ? 700 : 500, flex: 1, textAlign: 'left' }}>{item.label}</span>}
            {!collapsed && item.badge && (
              <span style={{ fontSize: 10, fontWeight: 800, background: C.red, color: '#fff', borderRadius: 99, padding: '1px 6px' }}>{item.badge}</span>
            )}
            {collapsed && item.badge && (
              <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: C.red }} />
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000', flexShrink: 0 }}>SA</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Super Admin</div>
            <div style={{ fontSize: 10, color: C.gray3 }}>admin@wheels.com.pk</div>
          </div>
        )}
        {!collapsed && <LogOut size={14} color={C.gray3} style={{ cursor: 'pointer', flexShrink: 0 }} />}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
function DashboardView() {
  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white, letterSpacing: '-0.5px' }}>Dashboard</div>
          <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>wheels.com.pk · Monday, 20 April 2026</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '8px 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.gray2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            Last 30 days <ChevronDown size={12} />
          </button>
          <button style={{ padding: '8px 16px', background: C.green, border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer' }}>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: C.gray2, marginBottom: 4 }}>Monthly Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>PKR 4.2 Cr</div>
            </div>
            <span style={{ fontSize: 11, color: C.green, background: C.green + '22', padding: '3px 8px', borderRadius: 99, fontWeight: 700 }}>↑ 23.7%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {REVENUE_DATA.map((v, i) => {
              const max = Math.max(...REVENUE_DATA);
              const h = (v / max) * 72 + 8;
              const isLast = i === REVENUE_DATA.length - 1;
              return (
                <div key={i} style={{ flex: 1, height: h, borderRadius: '4px 4px 0 0', background: isLast ? C.green : C.green + '44', transition: 'height 0.4s', minWidth: 4 }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['J','F','M','A','M','J','J','A','S','O','N','D'].map(m => (
              <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: C.gray3 }}>{m}</div>
            ))}
          </div>
        </div>

        {/* Listing activity */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: C.gray2, marginBottom: 4 }}>New Listings</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>168 <span style={{ fontSize: 13, color: C.gray2, fontWeight: 400 }}>this month</span></div>
            </div>
            <MiniChart data={LISTING_DATA} color={C.blue} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Cars', value: 98, color: C.blue },
              { label: 'Bikes', value: 42, color: C.purple },
              { label: 'Parts', value: 28, color: C.amber },
            ].map(item => (
              <div key={item.label} style={{ background: C.gray4, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.gray2, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Listings + Fraud Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Listings pending moderation */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Listings Queue</div>
            <span style={{ fontSize: 11, color: C.amber, background: C.amber + '22', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>34 pending</span>
          </div>
          <div>
            {RECENT_LISTINGS.map((listing, i) => (
              <div key={listing.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: i < RECENT_LISTINGS.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listing.title}</span>
                    {listing.flagged && <AlertTriangle size={12} color={C.red} />}
                  </div>
                  <div style={{ fontSize: 11, color: C.gray2 }}>{listing.seller} · {listing.city} · {listing.price}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <StatusBadge status={listing.status} />
                  {listing.status === 'pending' && (
                    <>
                      <button style={{ width: 28, height: 28, borderRadius: 8, background: C.green + '22', border: `1px solid ${C.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <CheckCircle size={14} color={C.green} />
                      </button>
                      <button style={{ width: 28, height: 28, borderRadius: 8, background: C.red + '22', border: `1px solid ${C.red}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <XCircle size={14} color={C.red} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Send Push', icon: Bell, color: C.blue },
                { label: 'Approve Dealers', icon: ShieldCheck, color: C.green },
                { label: 'View Reports', icon: Flag, color: C.red },
                { label: 'Boost Listing', icon: TrendingUp, color: C.purple },
              ].map(a => (
                <button key={a.label} style={{
                  padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.gray4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  color: C.gray1, fontSize: 12, fontWeight: 600,
                }}>
                  <a.icon size={14} color={a.color} /> {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* City Distribution */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 14 }}>Listings by City</div>
            {[
              { city: 'Lahore', count: 4821, pct: 38 },
              { city: 'Karachi', count: 3920, pct: 31 },
              { city: 'Islamabad', count: 2105, pct: 17 },
              { city: 'Rawalpindi', count: 1210, pct: 9 },
              { city: 'Others', count: 791, pct: 5 },
            ].map(c => (
              <div key={c.city} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: C.gray2 }}>{c.city}</span>
                  <span style={{ fontSize: 11, color: C.gray1, fontWeight: 600 }}>{c.count.toLocaleString()}</span>
                </div>
                <div style={{ height: 4, background: C.gray4, borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: C.green, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Recent Registrations</div>
          <button style={{ fontSize: 12, color: C.green, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.gray4 }}>
              {['User', 'Phone', 'City', 'Role', 'Verified', 'Listings', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 20px', fontSize: 11, color: C.gray2, fontWeight: 600, textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_USERS.map((user, i) => (
              <tr key={user.id} style={{ borderBottom: i < RECENT_USERS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.green, flexShrink: 0 }}>
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: C.gray2 }}>{user.phone}</td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: C.gray2 }}>{user.city}</td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', color: user.role === 'dealer' ? C.blue : user.role === 'seller' ? C.green : C.gray2, background: (user.role === 'dealer' ? C.blue : user.role === 'seller' ? C.green : C.gray3) + '22', padding: '2px 8px', borderRadius: 99 }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '12px 20px' }}>
                  {user.verified
                    ? <CheckCircle size={16} color={C.green} />
                    : <XCircle size={16} color={C.gray3} />}
                </td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: C.gray1, fontWeight: 600 }}>{user.listings}</td>
                <td style={{ padding: '12px 20px', fontSize: 11, color: C.gray3 }}>{user.joined}</td>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ width: 28, height: 28, borderRadius: 8, background: C.gray4, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Eye size={13} color={C.gray2} />
                    </button>
                    <button style={{ width: 28, height: 28, borderRadius: 8, background: C.red + '22', border: `1px solid ${C.red}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Trash2 size={13} color={C.red} />
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

// ── App ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{
      display: 'flex', height: '100vh', background: C.bg,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: C.white, overflow: 'hidden',
    }}>
      <Sidebar active={activeSection} setActive={setActiveSection} collapsed={sidebarCollapsed} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <div style={{
          height: 56, background: C.sidebar, borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0,
        }}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: 'none', border: 'none', color: C.gray2, cursor: 'pointer', display: 'flex' }}>
            <Menu size={18} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Bell size={16} color={C.gray2} />
              </button>
              <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: C.red, border: `2px solid ${C.sidebar}` }} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000' }}>SA</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection !== 'dashboard' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.gray3 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.gray2, textTransform: 'capitalize' }}>{activeSection} Module</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Full CRUD UI — Phase 4 delivery</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
