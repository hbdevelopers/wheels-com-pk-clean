'use client';
// admin/app/dealers/page.tsx
import { useState, useEffect } from 'react';
import { CheckCircle, Star, ExternalLink } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const C = { bg:'#0A0B0F', card:'#111318', border:'#1C1E26', green:'#00E676', red:'#FF4757', amber:'#FFB300', blue:'#3D8EFF', white:'#FFFFFF', gray1:'#E8E9EE', gray2:'#9A9BAA', gray3:'#4A4B5A', gray4:'#1E2028', purple:'#9B59FF' };

const TIER_COLORS: Record<string, string> = { free: C.gray3, basic: C.blue, professional: C.green, enterprise: C.purple };

function authFetch(path: string, method = 'GET', body?: any) {
  return fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}` }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
}

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'pending'|'verified'>('all');

  useEffect(() => {
    authFetch(`/dealers?verified=${filter === 'verified' ? 'true' : filter === 'pending' ? 'false' : ''}`).then(data => {
      setDealers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [filter]);

  const approveDealer = async (dealerId: string) => {
    // In production: PUT /admin/dealers/:id/approve
    setDealers(prev => prev.map(d => d.id === dealerId ? { ...d, is_verified: true } : d));
  };

  const featureDealer = async (dealerId: string, featured: boolean) => {
    setDealers(prev => prev.map(d => d.id === dealerId ? { ...d, is_featured: featured } : d));
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Dealers</div>
          <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>Manage dealer applications and subscriptions</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Dealers', value: dealers.length, color: C.white },
          { label: 'Verified', value: dealers.filter(d => d.is_verified).length, color: C.green },
          { label: 'Pending', value: dealers.filter(d => !d.is_verified).length, color: C.amber },
          { label: 'Featured', value: dealers.filter(d => d.is_featured).length, color: C.purple },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.gray3, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'pending', 'verified'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 16px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? C.green : C.card, color: filter === f ? '#000' : C.gray2 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.gray4 }}>
              {['Business', 'City', 'Tier', 'Listings', 'Rating', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, color: C.gray2, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>Loading...</td></tr>}
            {!loading && dealers.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>No dealers found</td></tr>}
            {dealers.map(dealer => (
              <tr key={dealer.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green + '22', border: `1px solid ${C.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: C.green, flexShrink: 0 }}>
                      {dealer.business_name?.slice(0, 1)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{dealer.business_name}</div>
                      <div style={{ fontSize: 10, color: C.gray3 }}>{dealer.slug}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2 }}>{dealer.city}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: TIER_COLORS[dealer.subscription_tier] || C.gray3, background: (TIER_COLORS[dealer.subscription_tier] || C.gray3) + '22', padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>
                    {dealer.subscription_tier}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.white, fontWeight: 600 }}>{dealer.total_listings || 0}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} color={C.amber} fill={C.amber} />
                    <span style={{ fontSize: 12, color: C.white, fontWeight: 600 }}>{dealer.avg_rating || '—'}</span>
                    <span style={{ fontSize: 10, color: C.gray3 }}>({dealer.total_reviews || 0})</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: dealer.is_verified ? C.green : C.amber, background: (dealer.is_verified ? C.green : C.amber) + '22', padding: '2px 8px', borderRadius: 99 }}>
                    {dealer.is_verified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!dealer.is_verified && (
                      <button onClick={() => approveDealer(dealer.id)} style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Approve
                      </button>
                    )}
                    <button onClick={() => featureDealer(dealer.id, !dealer.is_featured)} style={{ fontSize: 10, fontWeight: 700, color: dealer.is_featured ? C.amber : C.gray3, background: C.gray4, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                      {dealer.is_featured ? '★ Featured' : '☆ Feature'}
                    </button>
                    <a href={`/dealer/${dealer.slug}`} target="_blank" rel="noopener" style={{ width: 26, height: 26, borderRadius: 6, background: C.gray4, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      <ExternalLink size={12} color={C.gray2} />
                    </a>
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
