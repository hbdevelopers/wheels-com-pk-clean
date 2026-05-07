// mobile/app/listing/[id].tsx
import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, FlatList, Linking, Alert, Dimensions, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Slider from '@react-native-community/slider';
import { vehiclesApi, chatApi, aiApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, RADIUS, formatPKR, formatRelativeTime, calculateEMI } from '../../constants/theme';

const { width: W } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [downPct, setDownPct] = useState(20);
  const [loadingFraud, setLoadingFraud] = useState(false);
  const [fraudData, setFraudData] = useState<any>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => vehiclesApi.getOne(id!).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={s.loading}>
        <Text style={{ color: COLORS.primary, fontSize: 32 }}>🚗</Text>
        <Text style={{ color: COLORS.gray2, marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }
  if (!listing) return null;

  const images = listing.images?.length > 0 ? listing.images : [{ url: listing.vehicle_image }];
  const monthly = calculateEMI(listing.price, downPct);
  const trustColor = listing.fraud_risk_score < 20 ? COLORS.primary : listing.fraud_risk_score < 50 ? COLORS.amber : COLORS.red;
  const trustWidth = 100 - Math.min(listing.fraud_risk_score, 100);

  const handleChat = async () => {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    try {
      const { data: chat } = await chatApi.startChat(listing.id, listing.seller_id);
      router.push(`/chat/${chat.id}`);
    } catch { Alert.alert('Error', 'Could not start chat'); }
  };

  const handleCall = () => {
    if (listing.seller?.phone) {
      Linking.openURL(`tel:${listing.seller.phone}`);
    }
  };

  const handleWhatsApp = () => {
    const phone = listing.seller?.phone?.replace(/^0/, '92');
    const msg = encodeURIComponent(`Hi, I saw your ${listing.year} ${listing.make} ${listing.model} on wheels.com.pk. Is it still available?`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  const handleShare = () => {
    Share.share({
      title: `${listing.year} ${listing.make} ${listing.model} — PKR ${formatPKR(listing.price)}`,
      message: `Check out this ${listing.year} ${listing.make} ${listing.model} for PKR ${formatPKR(listing.price)} on wheels.com.pk`,
      url: `https://wheels.com.pk/listing/${listing.id}`,
    });
  };

  const fetchFraudScore = async () => {
    setLoadingFraud(true);
    try {
      const { data } = await aiApi.getFraudScore(listing.id);
      setFraudData(data);
    } catch { /* silent */ }
    finally { setLoadingFraud(false); }
  };

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image Gallery */}
        <View style={{ height: 280 }}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={e => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / W))}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={{ width: W, height: 280 }} resizeMode="cover" />
            )}
          />
          {/* Gradient overlay */}
          <View style={s.imgOverlay} />
          {/* Back + share */}
          <SafeAreaView style={s.imgNav}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
              <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={s.iconBtn} onPress={() => setSaved(!saved)}>
                <Text style={{ fontSize: 16, color: saved ? COLORS.red : '#fff' }}>{saved ? '♥' : '♡'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
                <Text style={{ color: '#fff', fontSize: 16 }}>⬆</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          {/* Dot indicators */}
          <View style={s.dots}>
            {images.map((_, i) => (
              <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
            ))}
          </View>
          <View style={s.photoCount}>
            <Text style={s.photoCountText}>{activeImg + 1}/{images.length}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Badges */}
          <View style={s.badgeRow}>
            {listing.inspection_badge && (
              <View style={s.inspBadge}><Text style={s.inspText}>✓ INSPECTED</Text></View>
            )}
            {listing.dealer_id && (
              <View style={s.dealerBadge}><Text style={s.dealerText}>DEALER</Text></View>
            )}
          </View>

          {/* Title + Price */}
          <Text style={s.title}>{listing.year} {listing.make} {listing.model}{listing.variant ? ` ${listing.variant}` : ''}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>PKR {formatPKR(listing.price)}</Text>
            {listing.price_negotiable && <Text style={s.negotiable}>Negotiable</Text>}
          </View>
          <Text style={s.meta}>📍 {listing.city} · {listing.view_count} views · {formatRelativeTime(listing.created_at)}</Text>

          {/* Spec grid */}
          <View style={s.specGrid}>
            {[
              { icon: '🛣️', label: 'Mileage', val: `${Math.round((listing.mileage||0)/1000)}k km` },
              { icon: '⚙️', label: 'Trans', val: listing.transmission },
              { icon: '⛽', label: 'Fuel', val: listing.fuel_type },
              { icon: '🎨', label: 'Color', val: listing.color },
              { icon: '🏙️', label: 'Reg. City', val: listing.registered_city || listing.city },
              { icon: '🔧', label: 'Assembly', val: listing.assembly || 'Local' },
            ].map(spec => (
              <View key={spec.label} style={s.specItem}>
                <Text style={{ fontSize: 16, marginBottom: 4 }}>{spec.icon}</Text>
                <Text style={s.specLabel}>{spec.label}</Text>
                <Text style={s.specVal} numberOfLines={1}>{spec.val || '—'}</Text>
              </View>
            ))}
          </View>

          {/* AI Trust Score */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>✦ AI Trust Score</Text>
              <Text style={[s.trustLabel, { color: trustColor }]}>
                {listing.fraud_risk_score < 20 ? 'Low Risk' : listing.fraud_risk_score < 50 ? 'Medium Risk' : 'High Risk'}
              </Text>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${trustWidth}%`, backgroundColor: trustColor }]} />
            </View>
            <Text style={s.trustSub}>
              {listing.seller?.phone_verified ? '✓ Phone verified' : '⚠ Phone unverified'}
              {' · '}
              {listing.seller?.cnic_verified ? '✓ CNIC verified' : '⚠ CNIC unverified'}
              {' · '}
              {listing.inspection_badge ? '✓ Inspection passed' : '⚠ Not inspected'}
            </Text>
          </View>

          {/* Description */}
          {listing.description && (
            <View style={s.card}>
              <Text style={s.cardTitle}>About this vehicle</Text>
              <Text style={s.description}>{listing.description}</Text>
            </View>
          )}

          {/* Features */}
          {listing.features?.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>✅ Features</Text>
              <View style={s.featureWrap}>
                {listing.features.map((f: string) => (
                  <View key={f} style={s.featureChip}>
                    <Text style={s.featureText}>✓ {f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Price History */}
          {listing.price_history?.length > 1 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>📉 Price History</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 50, marginTop: 8 }}>
                {listing.price_history.map((p: any, i: number) => {
                  const prices = listing.price_history.map((x: any) => x.price || x);
                  const max = Math.max(...prices);
                  const val = p.price || p;
                  const h = Math.max(8, (val / max) * 44);
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontSize: 8, color: i === listing.price_history.length - 1 ? COLORS.primary : COLORS.gray3 }}>
                        {formatPKR(val)}
                      </Text>
                      <View style={{ width: '90%', height: h, borderRadius: 3, backgroundColor: i === listing.price_history.length - 1 ? COLORS.primary : COLORS.gray4 }} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Finance Calculator */}
          <View style={s.card}>
            <TouchableOpacity style={s.cardHeader} onPress={() => setShowFinance(!showFinance)}>
              <Text style={s.cardTitle}>💰 Finance Estimate</Text>
              <Text style={{ color: COLORS.primary }}>{showFinance ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showFinance && (
              <View style={{ marginTop: 12 }}>
                <Text style={s.downLabel}>Down Payment: {downPct}% — PKR {formatPKR(listing.price * downPct / 100)}</Text>
                <Slider
                  style={{ width: '100%', height: 32 }}
                  minimumValue={10} maximumValue={50} step={5}
                  value={downPct} onValueChange={setDownPct}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.gray4}
                  thumbTintColor={COLORS.primary}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: COLORS.gray3 }}>Monthly (5 years)</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primary }}>PKR {formatPKR(monthly)}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.financeBtn}
                    onPress={() => router.push(`/finance?vehicle_id=${listing.id}&price=${listing.price}`)}
                  >
                    <Text style={s.financeBtnText}>Get Quotes →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Seller */}
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={s.sellerAvatar}>
                <Text style={s.sellerAvatarText}>
                  {listing.seller?.full_name?.slice(0, 2).toUpperCase() || '??'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.sellerName}>{listing.seller?.full_name}</Text>
                  {listing.seller?.cnic_verified && <Text style={{ fontSize: 14 }}>✅</Text>}
                </View>
                <Text style={{ fontSize: 11, color: COLORS.gray3 }}>
                  ⭐ {listing.seller?.avg_rating || 'New'} · {listing.seller?.total_reviews || 0} reviews
                </Text>
              </View>
              <TouchableOpacity
                style={s.viewProfileBtn}
                onPress={() => router.push(`/user/${listing.seller_id}`)}
              >
                <Text style={{ fontSize: 12, color: COLORS.gray2, fontWeight: '600' }}>Profile →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Similar */}
          {listing.similar?.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[s.cardTitle, { marginBottom: 12 }]}>Similar Cars</Text>
              <FlatList
                horizontal
                data={listing.similar}
                keyExtractor={i => i.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.similarCard}
                    onPress={() => router.replace(`/listing/${item.id}`)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.white }}>{item.year} {item.make} {item.model}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '800', marginTop: 4 }}>PKR {formatPKR(item.price)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* CTA Bar */}
      <View style={s.ctaBar}>
        <TouchableOpacity style={s.ctaChat} onPress={handleChat}>
          <Text style={s.ctaText}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaWA} onPress={handleWhatsApp}>
          <Text style={[s.ctaText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaCall} onPress={handleCall}>
          <Text style={[s.ctaText, { color: '#000' }]}>📞 Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  imgNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 14, backgroundColor: COLORS.primary },
  photoCount: { position: 'absolute', bottom: 10, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  photoCountText: { fontSize: 10, color: '#fff' },
  body: { padding: SPACING.lg },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  inspBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.primary, borderRadius: 99 },
  inspText: { fontSize: 9, fontWeight: '800', color: '#000' },
  dealerBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.blue + '33', borderRadius: 99, borderWidth: 1, borderColor: COLORS.blue + '44' },
  dealerText: { fontSize: 9, fontWeight: '700', color: COLORS.blue },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 6, letterSpacing: -0.3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  price: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  negotiable: { fontSize: 12, color: COLORS.gray3 },
  meta: { fontSize: 11, color: COLORS.gray3, marginBottom: 16 },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  specItem: {
    width: (W - SPACING.lg * 2 - 8 * 2) / 3,
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 10,
  },
  specLabel: { fontSize: 9, color: COLORS.gray3, marginBottom: 2, fontWeight: '600' },
  specVal: { fontSize: 12, fontWeight: '600', color: COLORS.gray1 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  trustLabel: { fontSize: 11, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: COLORS.bgElevated, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  trustSub: { fontSize: 10, color: COLORS.gray3, marginTop: 8 },
  description: { fontSize: 13, color: COLORS.gray2, lineHeight: 20, marginTop: 6 },
  featureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  featureChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.primaryFaint, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary + '33' },
  featureText: { fontSize: 11, color: COLORS.gray1 },
  downLabel: { fontSize: 11, color: COLORS.gray2, marginBottom: 4 },
  financeBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  financeBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '33', borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  sellerName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  viewProfileBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.bgElevated, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  similarCard: { width: 160, padding: 12, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: SPACING.md, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  ctaChat: { flex: 1, padding: 13, backgroundColor: COLORS.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  ctaWA: { flex: 1, padding: 13, backgroundColor: COLORS.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: '#25D36644', alignItems: 'center' },
  ctaCall: { flex: 1, padding: 13, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center' },
  ctaText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
});
