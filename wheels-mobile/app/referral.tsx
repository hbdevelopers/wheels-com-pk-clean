// mobile/app/referral.tsx
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Share, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { COLORS, SPACING } from '../constants/theme';

export default function ReferralScreen() {
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => usersApi.getReferralStats().then(r => r.data),
  });

  const code = data?.referral_code || '---';
  const shareMsg = data?.share_message || `Join wheels.com.pk — Pakistan's smartest car marketplace! Use code ${code}`;

  const copyCode = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    Share.share({ message: shareMsg, title: 'Join wheels.com.pk' });
  };

  const HOW_IT_WORKS = [
    { step: '1', icon: '📤', title: 'Share your code', desc: 'Send your unique referral code to friends and family' },
    { step: '2', icon: '📱', title: 'They sign up', desc: 'They download the app and register using your code' },
    { step: '3', icon: '💰', title: 'You both earn', desc: 'You get PKR 200 listing credit when they post their first listing' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.title}>Refer & Earn</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ flex: 1, padding: SPACING.lg }}>
        {/* Hero */}
        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>🎁</Text>
          <Text style={s.heroTitle}>Earn PKR 200 per referral</Text>
          <Text style={s.heroSub}>Invite friends to wheels.com.pk and earn listing credits for every person who posts a vehicle</Text>
        </View>

        {/* Referral code */}
        <View style={s.codeCard}>
          <Text style={s.codeLabel}>Your Referral Code</Text>
          <View style={s.codeRow}>
            <Text style={s.code}>{code}</Text>
            <TouchableOpacity style={[s.copyBtn, copied && s.copyBtnCopied]} onPress={copyCode}>
              <Text style={[s.copyBtnText, copied && { color: '#000' }]}>{copied ? '✓ Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.shareBtn} onPress={shareLink}>
            <Text style={s.shareBtnText}>📤 Share with Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>{data?.total_referrals || 0}</Text>
            <Text style={s.statLabel}>Total Referrals</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: COLORS.primary }]}>{data?.paid_rewards || 0}</Text>
            <Text style={s.statLabel}>Rewards Paid</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: COLORS.amber }]}>{data?.pending_rewards || 0}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
        </View>

        {/* How it works */}
        <Text style={s.howTitle}>How it works</Text>
        {HOW_IT_WORKS.map(step => (
          <View key={step.step} style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumText}>{step.step}</Text></View>
            <Text style={s.stepIcon}>{step.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={s.disclaimer}>Credits expire after 90 days. One reward per referred user.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  heroCard: { backgroundColor: COLORS.primaryFaint, borderWidth: 1, borderColor: COLORS.primary + '44', borderRadius: 16, padding: SPACING.xl, alignItems: 'center', marginBottom: 16 },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 13, color: COLORS.gray2, textAlign: 'center', lineHeight: 20 },
  codeCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: 16 },
  codeLabel: { fontSize: 11, color: COLORS.gray3, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  code: { flex: 1, fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 4, fontFamily: 'monospace' },
  copyBtn: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: COLORS.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  copyBtnCopied: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  copyBtnText: { fontWeight: '700', color: COLORS.gray1, fontSize: 13 },
  shareBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 13, alignItems: 'center' },
  shareBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: COLORS.white, marginBottom: 4 },
  statLabel: { fontSize: 10, color: COLORS.gray3 },
  howTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 11, fontWeight: '900', color: '#000' },
  stepIcon: { fontSize: 20 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  stepDesc: { fontSize: 11, color: COLORS.gray3, lineHeight: 16 },
  disclaimer: { fontSize: 10, color: COLORS.gray3, textAlign: 'center', marginTop: 16 },
});
