'use client';
// admin/app/listings/page.tsx
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const C = { bg:'#0A0B0F', card:'#111318', border:'#1C1E26', green:'#00E676', red:'#FF4757', amber:'#FFB300', blue:'#3D8EFF', white:'#FFFFFF', gray1:'#E8E9EE', gray2:'#9A9BAA', gray3:'#4A4B5A', gray4:'#1E2028' };

function authFetch(path: string, method = 'GET', body?: any) {
  return fetch(`${API}${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected'>('pending');

  useEffect(() => { loadListings(); }, [activeTab]);

  const loadListings = async () => {
    setLoading(true);
    const data = await authFetch(activeTab === 'pending' ? '/admin/listings/pending' : `/vehicles?status=${activeTab}&limit=30`);
    setListings(Array.isArray(data) ? data : data?.data || []);
    setLoading(false);
  };

  const approve = async (id: string) => {
    await authFetch(`/admin/listings/${id}/approve`, 'PUT');
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const reject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    await authFetch(`/admin/listings/${id}/reject`, 'PUT', { reason });
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const TABS = [
    { id: 'pending', label: 'Pending Review', color: C.amber },
    { id: 'active',  label: 'Active',         color: C.green },
    { id: 'rejected',label: 'Rejected',        color: C.red },
  ] as const;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Listings Moderation</div>
        <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>Review, approve or reject vehicle listings</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.card, borderRadius: 12, padding: 4, width: 'fit-content', border: `1px solid ${C.border}` }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: activeTab === tab.id ? C.gray4 : 'transparent', color: activeTab === tab.id ? tab.color : C.gray3, transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.gray4 }}>
              {['Vehicle', 'Seller', 'City', 'Price', 'Fraud Score', 'Posted', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, color: C.gray2, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>Loading...</td></tr>}
            {!loading && listings.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>No listings in this category</td></tr>}
            {listings.map((listing) => (
              <tr key={listing.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{listing.year} {listing.make} {listing.model}</div>
                    {listing.variant && <div style={{ fontSize: 10, color: C.gray3 }}>{listing.variant}</div>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2 }}>{listing.seller_name || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2 }}>{listing.city}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.green, fontWeight: 700 }}>
                  PKR {listing.price >= 10000000 ? `${(listing.price/10000000).toFixed(1)} Cr` : `${(listing.price/100000).toFixed(1)} Lac`}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: listing.fraud_risk_score < 20 ? C.green : listing.fraud_risk_score < 50 ? C.amber : C.red, background: (listing.fraud_risk_score < 20 ? C.green : listing.fraud_risk_score < 50 ? C.amber : C.red) + '22', padding: '2px 8px', borderRadius: 99 }}>
                    {listing.fraud_risk_score}% risk
                  </span>
                  {listing.fraud_risk_score >= 40 && <AlertTriangle size={12} color={C.red} style={{ marginLeft: 4, display: 'inline' }} />}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: C.gray3 }}>
                  {listing.created_at ? new Date(listing.created_at).toLocaleDateString('en-PK') : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={`/listing/${listing.id}`} target="_blank" rel="noopener" style={{ width: 28, height: 28, borderRadius: 8, background: C.gray4, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none' }}>
                      <Eye size={13} color={C.gray2} />
                    </a>
                    {activeTab === 'pending' && (
                      <>
                        <button onClick={() => approve(listing.id)} style={{ width: 28, height: 28, borderRadius: 8, background: C.green + '22', border: `1px solid ${C.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <CheckCircle size={13} color={C.green} />
                        </button>
                        <button onClick={() => reject(listing.id)} style={{ width: 28, height: 28, borderRadius: 8, background: C.red + '22', border: `1px solid ${C.red}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <XCircle size={13} color={C.red} />
                        </button>
                      </>
                    )}
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
