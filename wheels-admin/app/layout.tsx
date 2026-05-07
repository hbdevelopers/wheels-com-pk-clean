// admin/app/layout.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2, Users, Car, Package, Flag, DollarSign,
  Bell, Settings, LogOut, Menu, ShieldCheck, Wrench,
} from 'lucide-react';

const C = {
  bg: '#0A0B0F', sidebar: '#0D0E14', card: '#111318',
  border: '#1C1E26', green: '#00E676', red: '#FF4757',
  amber: '#FFB300', blue: '#3D8EFF', white: '#FFFFFF',
  gray1: '#E8E9EE', gray2: '#9A9BAA', gray3: '#4A4B5A', gray4: '#1E2028',
};

const NAV = [
  { href: '/dashboard', icon: BarChart2, label: 'Dashboard' },
  { href: '/listings',  icon: Car,       label: 'Listings',  badge: 34 },
  { href: '/users',     icon: Users,     label: 'Users' },
  { href: '/dealers',   icon: Package,   label: 'Dealers' },
  { href: '/reports',   icon: Flag,      label: 'Reports', badge: 12 },
  { href: '/revenue',   icon: DollarSign,label: 'Revenue' },
  { href: '/notifications', icon: Bell,  label: 'Push Campaigns' },
  { href: '/inspections',   icon: Wrench,label: 'Inspections' },
  { href: '/settings',      icon: Settings, label: 'Settings' },
];

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: C.bg, fontFamily: font, color: C.white }}>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          {/* Sidebar */}
          <aside style={{
            width: collapsed ? 64 : 220, background: C.sidebar,
            borderRight: `1px solid ${C.border}`, display: 'flex',
            flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s',
          }}>
            {/* Logo */}
            <div style={{ padding: '20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: C.green, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#000', flexShrink: 0 }}>W</div>
              {!collapsed && <span style={{ fontSize: 14, fontWeight: 800 }}>wheels<span style={{ color: C.green }}>.pk</span> <span style={{ fontSize: 10, color: C.gray3, fontWeight: 400 }}>Admin</span></span>}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
              {NAV.map(item => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                      borderRadius: 10, background: active ? C.green + '18' : 'transparent',
                      color: active ? C.green : C.gray2, marginBottom: 2, cursor: 'pointer',
                      position: 'relative', transition: 'all 0.15s',
                    }}>
                      <item.icon size={17} style={{ flexShrink: 0 }} />
                      {!collapsed && <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, flex: 1 }}>{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: C.red, color: '#fff', borderRadius: 99, padding: '1px 6px' }}>{item.badge}</span>
                      )}
                      {collapsed && item.badge && (
                        <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: C.red }} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* User */}
            <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000', flexShrink: 0 }}>SA</div>
              {!collapsed && (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Super Admin</div>
                    <div style={{ fontSize: 10, color: C.gray3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>admin@wheels.com.pk</div>
                  </div>
                  <LogOut size={14} color={C.gray3} style={{ cursor: 'pointer', flexShrink: 0 }} />
                </>
              )}
            </div>
          </aside>

          {/* Main */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Top bar */}
            <div style={{ height: 56, background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
              <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: C.gray2, cursor: 'pointer', display: 'flex' }}>
                <Menu size={18} />
              </button>
              <div style={{ flex: 1 }} />
              <div style={{ position: 'relative' }}>
                <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Bell size={16} color={C.gray2} />
                </button>
                <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: C.red, border: `2px solid ${C.sidebar}` }} />
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000' }}>SA</div>
            </div>

            {/* Page content */}
            <div style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
