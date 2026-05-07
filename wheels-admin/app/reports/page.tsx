'use client';
// admin/app/reports/page.tsx
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const C = { bg:'#0A0B0F', card:'#111318', border:'#1C1E26', green:'#00E676', red:'#FF4757', amber:'#FFB300', blue:'#3D8EFF', white:'#FFFFFF', gray1:'#E8E9EE', gray2:'#9A9BAA', gray3:'#4A4B5A', gray4:'#1E2028' };

function authFetch(path: string, method = 'GET', body?: any) {
  return fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}` }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
}

const REPORT_COLORS: Record<string, string> = { fraud: C.red, spam: C.amber, misleading: C.amber, inappropriate: C.red, other: C.blue };

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');

  useEffect(() => {
    authFetch(`/admin/reports?status=${status}`).then(data => { setReports(Array.isArray(data) ? data : []); setLoading(false); });
  }, [status]);

  const resolve = async (id: string, action: string) => {
    await authFetch(`/admin/reports/${id}/resolve`, 'PUT', { action, notes: action });
    setReports(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Reports & Fraud Queue</div>
        <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>Review user-submitted reports and take action</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['open', 'under_review', 'resolved', 'dismissed'].map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{ padding: '7px 16px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: status === s ? C.green : C.card, color: status === s ? '#000' : C.gray2, transition: 'all 0.15s' }}>
            {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.gray4 }}>
              {['Reporter', 'Type', 'Target', 'Description', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, color: C.gray2, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>Loading...</td></tr>}
            {!loading && reports.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.gray3 }}>No {status} reports 🎉</td></tr>}
            {reports.map(report => (
              <tr key={report.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2 }}>{report.reporter_name || 'Unknown'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: REPORT_COLORS[report.report_type] || C.blue, background: (REPORT_COLORS[report.report_type] || C.blue) + '22', padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>
                    {report.report_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: C.blue }}>
                  {report.reported_vehicle_id ? `Listing: ${report.reported_vehicle_id.slice(0, 8)}...` : report.reported_user_id ? `User: ${report.reported_user_id.slice(0, 8)}...` : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.gray2, maxWidth: 280 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.description}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: C.gray3 }}>
                  {report.created_at ? new Date(report.created_at).toLocaleDateString('en-PK') : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {status === 'open' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => resolve(report.id, 'remove_listing')} style={{ fontSize: 10, fontWeight: 700, color: C.red, background: C.red + '22', border: `1px solid ${C.red}44`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Remove</button>
                      <button onClick={() => resolve(report.id, 'dismiss')} style={{ fontSize: 10, fontWeight: 700, color: C.gray2, background: C.gray4, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Dismiss</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
