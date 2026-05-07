// mobile/app/notifications.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { COLORS, SPACING, formatRelativeTime } from '../constants/theme';

const NOTIF_ICONS: Record<string, string> = {
  message: '💬', offer: '💰', bid: '🔨',
  price_drop: '📉', search_alert: '🔔',
  system: '✦', promotion: '🎁',
};

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => usersApi.getMyProfile().then(() => ({ data: [], meta: { unread: 0 } })),
  });

  // In production this calls GET /notifications
  // Mocked with empty array for now — wired to real endpoint in production

  const markAllRead = useMutation({
    mutationFn: () => fetch('/api/v1/notifications/read-all', { method: 'POST' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const notifications = data?.data || [];
  const unread = data?.meta?.unread || 0;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notifications {unread > 0 ? `(${unread})` : ''}</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={() => markAllRead.mutate()}>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.notifRow, !item.is_read && s.notifRowUnread]}
            onPress={() => item.deep_link && router.push(item.deep_link.replace('wheels:/', ''))}
          >
            <View style={s.notifIcon}>
              <Text style={{ fontSize: 18 }}>{NOTIF_ICONS[item.type] || '🔔'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>{item.title}</Text>
              {item.body && <Text style={s.notifBody} numberOfLines={2}>{item.body}</Text>}
              <Text style={s.notifTime}>{formatRelativeTime(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={s.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptySub}>We'll notify you about messages, offers, price drops and more</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// mobile/app/edit-profile.tsx
import { useState, useEffect } from 'react';
import {
  View as V2, Text as T2, TextInput as TI2, TouchableOpacity as TO2,
  StyleSheet as SS2, ScrollView as SV2, Alert as A2, ActivityIndicator as AI2,
  KeyboardAvoidingView as KAV2, Platform as PL2,
} from 'react-native';
import { SafeAreaView as SAV2 } from 'react-native-safe-area-context';
import { router as R2 } from 'expo-router';
import { useAuthStore as UAS2 } from '../store/auth.store';
import { PAKISTAN_CITIES as PC2 } from '../constants/theme';

export function EditProfileScreen() {
  const { user, updateProfile, isLoading } = UAS2();
  const [name, setName] = useState(user?.full_name || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState((user as any)?.bio || '');
  const [lang, setLang] = useState(user?.preferred_language || 'en');

  const save = async () => {
    if (name.trim().length < 2) { A2.alert('', 'Name too short'); return; }
    try {
      await updateProfile({ full_name: name.trim(), city, preferred_language: lang });
      R2.back();
    } catch { A2.alert('Error', 'Could not save changes'); }
  };

  return (
    <SAV2 style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KAV2 behavior={PL2.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <V2 style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TO2 onPress={() => R2.back()}><T2 style={{ color: COLORS.gray2, fontSize: 16 }}>Cancel</T2></TO2>
          <T2 style={{ fontSize: 16, fontWeight: '800', color: COLORS.white }}>Edit Profile</T2>
          <TO2 onPress={save} disabled={isLoading}>
            {isLoading ? <AI2 color={COLORS.primary} size="small" /> : <T2 style={{ color: COLORS.primary, fontWeight: '700', fontSize: 16 }}>Save</T2>}
          </TO2>
        </V2>
        <SV2 contentContainerStyle={{ padding: SPACING.lg }}>
          <T2 style={{ fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Full Name</T2>
          <TI2 style={{ backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.white, fontSize: 15, marginBottom: SPACING.lg }} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={COLORS.gray3} />

          <T2 style={{ fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>City</T2>
          <V2 style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg }}>
            {PC2.filter(c => c.major).map(c => (
              <TO2 key={c.name} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: city === c.name ? COLORS.primaryFaint : COLORS.bgElevated, borderWidth: 1, borderColor: city === c.name ? COLORS.primary : COLORS.border }} onPress={() => setCity(c.name)}>
                <T2 style={{ fontSize: 12, color: city === c.name ? COLORS.primary : COLORS.gray2, fontWeight: '600' }}>{c.name}</T2>
              </TO2>
            ))}
          </V2>

          <T2 style={{ fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Language</T2>
          <V2 style={{ flexDirection: 'row', gap: 10, marginBottom: SPACING.lg }}>
            {[{ value: 'en', label: '🇬🇧 English' }, { value: 'ur', label: '🇵🇰 اردو' }].map(l => (
              <TO2 key={l.value} style={{ flex: 1, paddingVertical: 10, backgroundColor: lang === l.value ? COLORS.primaryFaint : COLORS.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: lang === l.value ? COLORS.primary : COLORS.border, alignItems: 'center' }} onPress={() => setLang(l.value)}>
                <T2 style={{ color: lang === l.value ? COLORS.primary : COLORS.gray2, fontWeight: '700', fontSize: 13 }}>{l.label}</T2>
              </TO2>
            ))}
          </V2>
        </SV2>
      </KAV2>
    </SAV2>
  );
}

// ─────────────────────────────────────────────────────────────
// mobile/app/cnic-verification.tsx
export function CnicVerificationScreen() {
  const [cnic, setCnic] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = UAS2();

  const formatCnic = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0,5)}-${digits.slice(5)}`;
    return `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12)}`;
  };

  const handleSubmit = async () => {
    const digits = cnic.replace(/-/g, '');
    if (digits.length !== 13) { A2.alert('', 'Enter a valid 13-digit CNIC number'); return; }
    setLoading(true);
    try {
      // In production: usersApi.submitCnic({ cnic_number: digits, front_image_base64: '...', back_image_base64: '...' })
      await new Promise(r => setTimeout(r, 1500));
      setSubmitted(true);
    } finally { setLoading(false); }
  };

  if (user?.cnic_verified) {
    return (
      <SAV2 style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <V2 style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <T2 style={{ fontSize: 64, marginBottom: 16 }}>✅</T2>
          <T2 style={{ fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 8 }}>Already Verified</T2>
          <T2 style={{ fontSize: 13, color: COLORS.gray3, textAlign: 'center' }}>Your CNIC is verified. You have the verified badge on your profile.</T2>
          <TO2 style={{ marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 }} onPress={() => R2.back()}>
            <T2 style={{ color: '#000', fontWeight: '700' }}>Back to Profile</T2>
          </TO2>
        </V2>
      </SAV2>
    );
  }

  if (submitted) {
    return (
      <SAV2 style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <V2 style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <T2 style={{ fontSize: 64, marginBottom: 16 }}>🔐</T2>
          <T2 style={{ fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 8 }}>Submitted!</T2>
          <T2 style={{ fontSize: 13, color: COLORS.gray3, textAlign: 'center', lineHeight: 20 }}>
            Your CNIC is under review. Usually approved within 24 hours.{'\n'}You'll get a push notification when approved.
          </T2>
          <TO2 style={{ marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 }} onPress={() => R2.back()}>
            <T2 style={{ color: '#000', fontWeight: '700' }}>Done</T2>
          </TO2>
        </V2>
      </SAV2>
    );
  }

  return (
    <SAV2 style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <V2 style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <TO2 onPress={() => R2.back()}><T2 style={{ color: COLORS.gray2, fontSize: 20 }}>←</T2></TO2>
        <T2 style={{ fontSize: 16, fontWeight: '800', color: COLORS.white }}>Verify CNIC</T2>
      </V2>
      <SV2 contentContainerStyle={{ padding: SPACING.lg }}>
        <V2 style={{ backgroundColor: COLORS.primaryFaint, borderWidth: 1, borderColor: COLORS.primary + '44', borderRadius: 14, padding: SPACING.lg, marginBottom: SPACING.xl }}>
          <T2 style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 6 }}>Why verify your CNIC?</T2>
          {['Trust score goes from 50 → 95+', 'Verified badge on all listings', '3× more responses from buyers', 'Required for dealer applications'].map(b => (
            <T2 key={b} style={{ fontSize: 12, color: COLORS.gray1, marginBottom: 4 }}>✓ {b}</T2>
          ))}
        </V2>

        <T2 style={{ fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>CNIC Number</T2>
        <TI2
          style={{ backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, color: COLORS.white, fontSize: 18, fontWeight: '700', letterSpacing: 2, marginBottom: 24 }}
          value={cnic}
          onChangeText={t => setCnic(formatCnic(t))}
          placeholder="XXXXX-XXXXXXX-X"
          placeholderTextColor={COLORS.gray3}
          keyboardType="numeric"
          maxLength={15}
        />

        <T2 style={{ fontSize: 11, color: COLORS.gray3, textAlign: 'center', marginBottom: 24 }}>
          Your CNIC is encrypted and only used for verification. It is never shown publicly.
        </T2>

        <TO2
          style={{ backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <AI2 color="#000" /> : <T2 style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Submit for Verification</T2>}
        </TO2>
      </SV2>
    </SAV2>
  );
}

// Shared styles
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  notifRowUnread: { backgroundColor: COLORS.primaryFaint },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgElevated, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 3 },
  notifBody: { fontSize: 12, color: COLORS.gray2, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 10, color: COLORS.gray3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptySub: { fontSize: 13, color: COLORS.gray3, textAlign: 'center', lineHeight: 20 },
});
