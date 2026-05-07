// mobile/app/user/id.tsx  (maps to /user/[id])
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usersApi, vehiclesApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, formatPKR, formatRelativeTime } from '../../constants/theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me, isAuthenticated } = useAuthStore();
  const [following, setFollowing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: () => usersApi.getProfile(id!).then(r => r.data),
    enabled: !!id,
    onSuccess: (data: any) => setFollowing(data.isFollowing),
  });

  const { data: listings } = useQuery({
    queryKey: ['user-listings', id],
    queryFn: () => vehiclesApi.search({ seller_id: id, limit: 10 }).then(r => r.data.data),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: () => usersApi.followUser(id!),
    onSuccess: (data: any) => setFollowing(data.data.following),
  });

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}><Text style={{ fontSize: 32 }}>👤</Text></View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = me?.id === id;
  const trustColor = profile.trust_score >= 80 ? COLORS.primary : profile.trust_score >= 60 ? COLORS.amber : COLORS.red;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          {isOwnProfile && (
            <TouchableOpacity onPress={() => router.push('/edit-profile')}>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          )}
          {!isOwnProfile && <View style={{ width: 40 }} />}
        </View>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarFallbackText}>{profile.full_name?.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            {/* Trust ring */}
            <View style={[s.trustRing, { borderColor: trustColor }]} />
          </View>

          <Text style={s.name}>{profile.full_name}</Text>
          {profile.username && <Text style={s.username}>@{profile.username}</Text>}

          {/* Badges */}
          <View style={s.badgesRow}>
            {profile.phone_verified && (
              <View style={s.badge}><Text style={s.badgeText}>📱 Phone</Text></View>
            )}
            {profile.cnic_verified && (
              <View style={[s.badge, s.badgeGreen]}><Text style={[s.badgeText, { color: COLORS.primary }]}>✓ CNIC</Text></View>
            )}
            {profile.badges?.map((b: any) => (
              <View key={b.badge_type} style={[s.badge, s.badgeGreen]}>
                <Text style={[s.badgeText, { color: COLORS.primary }]}>✓ {b.badge_type.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>

          {profile.city && <Text style={s.city}>📍 {profile.city}</Text>}
          {profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { label: 'Listings', value: profile.activeListings || 0 },
              { label: 'Sold', value: profile.total_sold || 0 },
              { label: 'Rating', value: profile.avg_rating ? `${Number(profile.avg_rating).toFixed(1)}⭐` : 'New' },
              { label: 'Followers', value: profile.followers_count || 0 },
            ].map(stat => (
              <View key={stat.label} style={s.stat}>
                <Text style={s.statVal}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Trust score */}
          <View style={s.trustRow}>
            <Text style={s.trustLabel}>Trust Score</Text>
            <View style={s.trustBarBg}>
              <View style={[s.trustBarFill, { width: `${profile.trust_score}%`, backgroundColor: trustColor }]} />
            </View>
            <Text style={[s.trustPct, { color: trustColor }]}>{profile.trust_score}/100</Text>
          </View>

          {/* Action buttons */}
          {!isOwnProfile && isAuthenticated && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.followBtn, following && s.followingBtn]}
                onPress={() => followMutation.mutate()}
              >
                <Text style={[s.followBtnText, following && { color: COLORS.gray2 }]}>
                  {following ? '✓ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.reportBtn}
                onPress={() => router.push(`/report?user_id=${id}`)}
              >
                <Text style={s.reportBtnText}>⚑ Report</Text>
              </TouchableOpacity>
            </View>
          )}
          {isOwnProfile && (
            <TouchableOpacity style={s.editProfileBtn} onPress={() => router.push('/edit-profile')}>
              <Text style={s.editProfileBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active listings */}
        {listings && listings.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isOwnProfile ? 'My Listings' : `${profile.full_name?.split(' ')[0]}'s Listings`}</Text>
            {listings.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={s.listingRow}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <View style={s.listingImg} />
                <View style={{ flex: 1 }}>
                  <Text style={s.listingTitle} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
                  <Text style={s.listingPrice}>PKR {formatPKR(item.price)}</Text>
                  <Text style={s.listingMeta}>{item.city} · {item.view_count} views</Text>
                </View>
                <Text style={{ color: COLORS.primary, fontSize: 18 }}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reviews */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Reviews ({profile.total_reviews || 0})</Text>
          {profile.total_reviews === 0 ? (
            <Text style={{ color: COLORS.gray3, fontSize: 13 }}>No reviews yet</Text>
          ) : (
            <TouchableOpacity style={s.reviewsLink} onPress={() => {}}>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                View all {profile.total_reviews} reviews →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 32 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  profileCard: { padding: SPACING.xl, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 28, fontWeight: '900', color: '#000' },
  trustRing: { position: 'absolute', inset: -3, borderRadius: 47, borderWidth: 3, top: -3, left: -3, right: -3, bottom: -3, width: 94, height: 94 },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  username: { fontSize: 13, color: COLORS.gray3, marginBottom: 8 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  badgeGreen: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary + '44' },
  badgeText: { fontSize: 11, color: COLORS.gray2, fontWeight: '600' },
  city: { fontSize: 12, color: COLORS.gray3, marginBottom: 6 },
  bio: { fontSize: 13, color: COLORS.gray2, textAlign: 'center', lineHeight: 20, marginBottom: 14, maxWidth: 300 },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  trustRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  trustLabel: { fontSize: 11, color: COLORS.gray3, width: 72 },
  trustBarBg: { flex: 1, height: 6, backgroundColor: COLORS.gray4, borderRadius: 99, overflow: 'hidden' },
  trustBarFill: { height: '100%', borderRadius: 99 },
  trustPct: { fontSize: 11, fontWeight: '700', width: 46, textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  followBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  followingBtn: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  followBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  reportBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  reportBtnText: { color: COLORS.gray2, fontWeight: '600', fontSize: 13 },
  editProfileBtn: { width: '100%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  editProfileBtnText: { color: COLORS.gray1, fontWeight: '600', fontSize: 14 },
  section: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listingImg: { width: 72, height: 54, borderRadius: 8, backgroundColor: COLORS.gray4 },
  listingTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  listingPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginVertical: 2 },
  listingMeta: { fontSize: 10, color: COLORS.gray3 },
  reviewsLink: { paddingVertical: 8 },
});
