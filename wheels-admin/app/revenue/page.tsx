'use client';
// admin/app/revenue/page.tsx
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const C = { bg:'#0A0B0F', card:'#111318', border:'#1C1E26', green:'#00E676', red:'#FF4757', amber:'#FFB300', blue:'#3D8EFF', white:'#FFFFFF', gray1:'#E8E9EE', gray2:'#9A9BAA', gray3:'#4A4B5A', gray4:'#1E2028', purple:'#9B59FF' };

function authFetch(path: string) {
  return fetch(`${API}${path}`, { headers: { 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}` } }).then(r => r.json());
}

const fmt = (n: number) => n >= 10000000 ? `${(n/10000000).toFixed(2)} Cr` : n >= 100000 ? `${(n/100000).toFixed(1)} Lac` : n.toLocaleString('en-PK');

export default function RevenuePage() {
  const [data, setData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch(`/admin/revenue?period=${period}`).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); });
  }, [period]);

  const total = data.reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const txCount = data.reduce((s, r) => s + parseInt(r.transactions || 0), 0);

  // Group by payment method
  const byMethod: Record<string, number> = {};
  data.forEach(r => { byMethod[r.payment_method] = (byMethod[r.payment_method] || 0) + parseFloat(r.total || 0); });

  // Chart bars
  const maxTotal = Math.max(...data.map(r => parseFloat(r.total || 0)), 1);

  // Group by date for chart
  const byDate: Record<string, number> = {};
  data.forEach(r => {
    const d = r.date ? r.date.slice(0, 10) : '';
    if (d) byDate[d] = (byDate[d] || 0) + parseFloat(r.total || 0);
  });
  const dateEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const maxBar = Math.max(...dateEntries.map(([, v]) => v), 1);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Revenue</div>
          <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>Track payments and subscription income</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: period === p ? C.green : C.card, color: period === p ? '#000' : C.gray2 }}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: `Total Revenue (${period})`, value: `PKR ${fmt(total)}`, color: C.green },
          { label: 'Transactions', value: txCount.toLocaleString(), color: C.blue },
          { label: 'Avg per Transaction', value: txCount > 0 ? `PKR ${fmt(total / txCount)}` : '—', color: C.purple },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
            <div style={{ fontSize: 12, color: C.gray2, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue bar chart */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 16 }}>Daily Revenue</div>
        {loading ? (
          <div style={{ textAlign: 'center', color: C.gray3, padding: 40 }}>Loading chart...</div>
        ) : dateEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.gray3, padding: 40 }}>No revenue data for this period</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {dateEntries.map(([date, value]) => {
              const h = Math.max(4, (value / maxBar) * 100);
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div title={`PKR ${fmt(value)}`} style={{ width: '100%', height: h, background: `${C.green}cc`, borderRadius: '3px 3px 0 0', minWidth: 4 }} />
                  <div style={{ fontSize: 8, color: C.gray3, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    {new Date(date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* By payment method */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 16 }}>Revenue by Payment Method</div>
        {Object.entries(byMethod).map(([method, amount]) => (
          <div key={method} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.gray2, textTransform: 'capitalize' }}>{method || 'Unknown'}</span>
              <span style={{ fontSize: 12, color: C.white, fontWeight: 700 }}>PKR {fmt(amount)}</span>
            </div>
            <div style={{ height: 6, background: C.gray4, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(amount / total) * 100}%`, background: method === 'jazzcash' ? C.green : method === 'easypaisa' ? C.blue : C.purple, borderRadius: 99 }} />
            </div>
          </div>
        ))}
        {Object.keys(byMethod).length === 0 && <div style={{ color: C.gray3, textAlign: 'center', padding: 20 }}>No data</div>}
      </div>
    </div>
  );
}
