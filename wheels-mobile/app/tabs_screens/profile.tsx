// mobile/app/(tabs)/profile.tsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { usersApi, vehiclesApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, formatRelativeTime, formatPKR } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(true);

  const { data: myListings } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => vehiclesApi.getMyListings().then(r => r.data),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loginPrompt}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>👤</Text>
          <Text style={s.loginTitle}>Sign in to your account</Text>
          <Text style={s.loginSub}>Access your listings, messages, and profile</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.loginBtnText}>Login with OTP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const MENU_ITEMS = [
    { icon: '🚗', label: 'My Listings', count: myListings?.length, onPress: () => {} },
    { icon: '♥', label: 'Saved Vehicles', onPress: () => {} },
    { icon: '🔔', label: 'Saved Searches', onPress: () => {} },
    { icon: '💰', label: 'Payment History', onPress: () => router.push('/payments/history') },
    { icon: '🎁', label: 'Refer & Earn', onPress: () => router.push('/referral') },
    { icon: '🛡️', label: 'Verify CNIC', badge: !user?.cnic_verified ? 'Verify' : '✓', onPress: () => router.push('/cnic-verification') },
    { icon: '⚙️', label: 'Settings', onPress: () => {} },
    { icon: '❓', label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile header */}
        <View style={s.profileHeader}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{user?.full_name?.slice(0, 2).toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={s.editAvatar}>
              <Text style={{ fontSize: 12 }}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.name}>{user?.full_name}</Text>
          <View style={s.badgeRow}>
            {user?.phone_verified && <View style={s.badge}><Text style={s.badgeText}>📱 Phone</Text></View>}
            {user?.cnic_verified && <View style={[s.badge, s.badgeGreen]}><Text style={[s.badgeText, { color: COLORS.primary }]}>✓ CNIC</Text></View>}
          </View>
          <Text style={s.city}>📍 {user?.city || 'Pakistan'}</Text>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Listings', value: myListings?.length || 0 },
              { label: 'Trust Score', value: `${user?.trust_score || 0}%` },
              { label: 'Rating', value: user?.avg_rating ? `${user.avg_rating}⭐` : 'New' },
            ].map(stat => (
              <View key={stat.label} style={s.stat}>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.editBtn}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={s.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* My Active Listings */}
        {myListings?.filter((l: any) => l.status === 'active').length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Listings</Text>
            {myListings.slice(0, 3).map((listing: any) => (
              <TouchableOpacity
                key={listing.id}
                style={s.listingRow}
                onPress={() => router.push(`/listing/${listing.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.listingTitle} numberOfLines={1}>{listing.title}</Text>
                  <Text style={s.listingPrice}>PKR {formatPKR(listing.price)}</Text>
                  <Text style={s.listingMeta}>{listing.view_count} views · {listing.city}</Text>
                </View>
                <View style={[s.statusBadge,
                  listing.status === 'active' ? s.statusActive :
                  listing.status === 'pending' ? s.statusPending : s.statusOther,
                ]}>
                  <Text style={s.statusText}>{listing.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.viewAllBtn} onPress={() => {}}>
              <Text style={s.viewAllText}>View all listings →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu */}
        <View style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuRow, i < MENU_ITEMS.length - 1 && s.menuRowBorder]}
              onPress={item.onPress}
            >
              <Text style={{ fontSize: 18, marginRight: 12 }}>{item.icon}</Text>
              <Text style={s.menuLabel}>{item.label}</Text>
              {item.count !== undefined && (
                <View style={s.countBadge}><Text style={s.countText}>{item.count}</Text></View>
              )}
              {item.badge && (
                <View style={[s.menuBadge, item.badge === '✓' && s.menuBadgeGreen]}>
                  <Text style={[s.menuBadgeText, item.badge === '✓' && { color: COLORS.primary }]}>{item.badge}</Text>
                </View>
              )}
              <Text style={s.menuArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Language + Dark mode */}
        <View style={s.menuCard}>
          <View style={s.menuRow}>
            <Text style={{ fontSize: 18, marginRight: 12 }}>🌙</Text>
            <Text style={s.menuLabel}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.primary }} />
          </View>
          <View style={[s.menuRow, s.menuRowBorder]}>
            <Text style={{ fontSize: 18, marginRight: 12 }}>🌐</Text>
            <Text style={s.menuLabel}>Language</Text>
            <Text style={{ color: COLORS.gray2, fontSize: 13 }}>English</Text>
            <Text style={s.menuArrow}>→</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => logout()}>
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>wheels.com.pk v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loginTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  loginSub: { fontSize: 13, color: COLORS.gray3, textAlign: 'center', marginBottom: 24 },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  loginBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  profileHeader: { padding: SPACING.xl, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontSize: 24, fontWeight: '900' },
  editAvatar: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.bgElevated, borderWidth: 2, borderColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  badgeGreen: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary + '44' },
  badgeText: { fontSize: 11, color: COLORS.gray2, fontWeight: '600' },
  city: { fontSize: 12, color: COLORS.gray3, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  editBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated },
  editBtnText: { color: COLORS.gray1, fontSize: 13, fontWeight: '600' },
  section: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  listingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listingTitle: { fontSize: 13, fontWeight: '600', color: COLORS.white, flex: 1 },
  listingPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  listingMeta: { fontSize: 11, color: COLORS.gray3, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, marginLeft: 8 },
  statusActive: { backgroundColor: COLORS.primary + '22' },
  statusPending: { backgroundColor: COLORS.amber + '22' },
  statusOther: { backgroundColor: COLORS.gray4 },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.gray1 },
  viewAllBtn: { marginTop: 12 },
  viewAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  menuCard: { marginHorizontal: SPACING.lg, marginTop: 16, backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.white, fontWeight: '500' },
  menuArrow: { color: COLORS.gray3, fontSize: 14 },
  countBadge: { backgroundColor: COLORS.bgElevated, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  countText: { fontSize: 11, color: COLORS.gray2, fontWeight: '700' },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: COLORS.amber + '22', marginRight: 8 },
  menuBadgeGreen: { backgroundColor: COLORS.primaryFaint },
  menuBadgeText: { fontSize: 10, color: COLORS.amber, fontWeight: '700' },
  logoutBtn: { marginHorizontal: SPACING.lg, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.red + '44', alignItems: 'center' },
  logoutText: { color: COLORS.red, fontWeight: '700', fontSize: 14 },
  version: { textAlign: 'center', color: COLORS.gray3, fontSize: 11, marginTop: 16, marginBottom: 8 },
});
