'use client';
// admin/app/notifications/page.tsx
import { useState } from 'react';
import { Send, Users, CheckCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const C = { bg:'#0A0B0F', card:'#111318', border:'#1C1E26', green:'#00E676', red:'#FF4757', amber:'#FFB300', blue:'#3D8EFF', white:'#FFFFFF', gray1:'#E8E9EE', gray2:'#9A9BAA', gray3:'#4A4B5A', gray4:'#1E2028', purple:'#9B59FF' };

const TEMPLATES = [
  { title: '🚗 New Listings Alert', body: 'New cars matching your saved search are now available on wheels.com.pk!' },
  { title: '📉 Price Drop Alert', body: 'A vehicle you saved has dropped in price. Check it out now!' },
  { title: '🔨 Live Auction Starting!', body: 'A live auction is starting in 30 minutes. Place your bid before it\'s too late!' },
  { title: '🎉 Exclusive Deals', body: 'Limited-time deals on featured listings. Browse now on wheels.com.pk' },
];

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [target, setTarget] = useState<'all'|'sellers'|'dealers'|'buyers'>('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState([
    { id: 1, title: '🚗 Weekend Deals', target: 'all', sent: 48291, opened: 12043, date: '2025-04-15' },
    { id: 2, title: '📉 Price Drops', target: 'buyers', sent: 31204, opened: 8901, date: '2025-04-10' },
    { id: 3, title: '🏪 Dealer Promo', target: 'dealers', sent: 234, opened: 189, date: '2025-04-05' },
  ]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { alert('Title and body are required'); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/admin/push-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ title, body, deep_link: deepLink || undefined, target }),
      });
      const data = await res.json();
      setResult(data);
      setHistory(prev => [{ id: Date.now(), title, target, sent: data.token_count || 0, opened: 0, date: new Date().toISOString().slice(0, 10) }, ...prev]);
    } finally { setSending(false); }
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => { setTitle(t.title); setBody(t.body); };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Push Campaigns</div>
        <div style={{ fontSize: 13, color: C.gray2, marginTop: 2 }}>Send targeted push notifications to users</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Compose */}
        <div>
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 20 }}>Compose Notification</div>

            {/* Templates */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.gray3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Templates</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TEMPLATES.map(t => (
                  <button key={t.title} onClick={() => applyTemplate(t)} style={{ fontSize: 11, padding: '5px 10px', background: C.gray4, border: `1px solid ${C.border}`, borderRadius: 8, color: C.gray2, cursor: 'pointer' }}>
                    {t.title.split(' ')[0]} {t.title.split(' ').slice(1, 3).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.gray2, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Audience</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['all', '👥 All Users', '~48k'], ['buyers', '🔍 Buyers', '~31k'], ['sellers', '🚗 Sellers', '~12k'], ['dealers', '🏪 Dealers', '~234']] as const).map(([val, label, count]) => (
                  <button key={val} onClick={() => setTarget(val)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${target === val ? C.green : C.border}`, background: target === val ? C.green + '18' : C.gray4, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: target === val ? C.green : C.gray1 }}>{label}</div>
                    <div style={{ fontSize: 10, color: C.gray3 }}>{count} users</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.gray2, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title *</div>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                placeholder="Notification title..." style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Body */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.gray2, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message *</div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={250}
                placeholder="Notification body..." style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ fontSize: 10, color: C.gray3, textAlign: 'right' }}>{body.length}/250</div>
            </div>

            {/* Deep link */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.gray2, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deep Link (optional)</div>
              <input value={deepLink} onChange={e => setDeepLink(e.target.value)}
                placeholder="e.g. wheels://search or wheels://listing/..." style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Preview */}
            {(title || body) && (
              <div style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.gray3, marginBottom: 8, fontWeight: 700 }}>PREVIEW</div>
                <div style={{ background: C.gray4, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>{title || 'Title...'}</div>
                  <div style={{ fontSize: 12, color: C.gray2 }}>{body || 'Message...'}</div>
                </div>
              </div>
            )}

            <button onClick={handleSend} disabled={sending || !title || !body}
              style={{ width: '100%', padding: 13, background: sending || !title || !body ? C.gray4 : C.green, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: sending || !title || !body ? C.gray3 : '#000', cursor: sending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Send size={16} />
              {sending ? 'Sending...' : `Send to ${target === 'all' ? 'All Users' : target.charAt(0).toUpperCase() + target.slice(1)}`}
            </button>

            {result && (
              <div style={{ marginTop: 14, padding: 12, background: C.green + '18', borderRadius: 10, border: `1px solid ${C.green}44`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color={C.green} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Campaign queued!</div>
                  <div style={{ fontSize: 11, color: C.gray2 }}>{result.token_count?.toLocaleString()} devices targeted</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div>
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.white }}>Campaign History</div>
            {history.map((h, i) => (
              <div key={h.id} style={{ padding: '14px 20px', borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{h.title}</div>
                  <div style={{ fontSize: 10, color: C.gray3 }}>{h.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ fontSize: 11, color: C.gray2 }}>
                    <span style={{ color: C.blue, fontWeight: 700 }}>{h.sent.toLocaleString()}</span> sent
                  </div>
                  <div style={{ fontSize: 11, color: C.gray2 }}>
                    <span style={{ color: C.green, fontWeight: 700 }}>{h.opened.toLocaleString()}</span> opened
                    <span style={{ color: C.gray3 }}> ({h.sent > 0 ? ((h.opened / h.sent) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: C.gray4, color: C.gray2, textTransform: 'capitalize' }}>{h.target}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
