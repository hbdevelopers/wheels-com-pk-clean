// mobile/app/dealer/slug.tsx  (maps to /dealer/[slug])
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, FlatList, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { dealersApi } from '../../services/api';
import { COLORS, SPACING, formatPKR, formatRelativeTime } from '../../constants/theme';

export default function DealerStorefrontScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['dealer', slug, page],
    queryFn: () => dealersApi.getDealerBySlug(slug!).then(r => r.data),
    enabled: !!slug,
  });

  if (isLoading) {
    return <SafeAreaView style={s.container}><View style={s.loading}><Text style={{ color: COLORS.primary, fontSize: 32 }}>🏪</Text></View></SafeAreaView>;
  }

  const { dealer, listings } = data || {};
  if (!dealer) return null;

  const TIER_COLOR = { free: COLORS.gray3, basic: COLORS.blue, professional: COLORS.primary, enterprise: COLORS.purple };
  const tierColor = TIER_COLOR[dealer.subscription_tier as keyof typeof TIER_COLOR] || COLORS.gray3;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover / Header */}
        <View style={s.coverWrap}>
          <View style={s.coverBg} />
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View style={s.dealerMeta}>
            <View style={s.dealerLogoWrap}>
              <Text style={s.dealerLogoText}>{dealer.business_name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.dealerName}>{dealer.business_name}</Text>
                {dealer.is_verified && <Text style={{ fontSize: 16 }}>✅</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={[s.tierBadge, { borderColor: tierColor + '66', backgroundColor: tierColor + '22' }]}>
                  <Text style={[s.tierText, { color: tierColor }]}>{dealer.subscription_tier?.toUpperCase()}</Text>
                </View>
                <Text style={s.ratingText}>⭐ {dealer.avg_rating || 'New'} · {dealer.total_reviews || 0} reviews</Text>
              </View>
              <Text style={s.dealerCity}>📍 {dealer.city}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Total Listings', value: dealer.total_listings || 0 },
            { label: 'Vehicles Sold', value: dealer.total_sold || 0 },
            { label: 'Rating', value: dealer.avg_rating ? `${dealer.avg_rating}⭐` : '—' },
          ].map(stat => (
            <View key={stat.label} style={s.stat}>
              <Text style={s.statVal}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Contact buttons */}
        <View style={s.contactRow}>
          {dealer.phone && (
            <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`tel:${dealer.phone}`)}>
              <Text style={s.contactBtnText}>📞 Call</Text>
            </TouchableOpacity>
          )}
          {dealer.whatsapp && (
            <TouchableOpacity style={[s.contactBtn, s.contactBtnWA]} onPress={() => Linking.openURL(`https://wa.me/${dealer.whatsapp?.replace(/^0/, '92')}`)}>
              <Text style={[s.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {dealer.website && (
            <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(dealer.website!)}>
              <Text style={s.contactBtnText}>🌐 Website</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {dealer.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.description}>{dealer.description}</Text>
          </View>
        )}

        {/* Address */}
        {dealer.address && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Location</Text>
            <Text style={s.description}>📍 {dealer.address}</Text>
          </View>
        )}

        {/* Listings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Current Inventory ({listings?.length || 0})</Text>
          {(listings || []).map((listing: any) => (
            <TouchableOpacity
              key={listing.id}
              style={s.listingRow}
              onPress={() => router.push(`/listing/${listing.id}`)}
            >
              <View style={s.listingImg}>
                {listing.image && <Image source={{ uri: listing.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listingTitle} numberOfLines={1}>{listing.year} {listing.make} {listing.model}</Text>
                {listing.variant && <Text style={s.listingVariant}>{listing.variant}</Text>}
                <Text style={s.listingPrice}>PKR {formatPKR(listing.price)}</Text>
                <Text style={s.listingMeta}>{listing.city} · {listing.mileage ? `${Math.round(listing.mileage / 1000)}k km` : ''}</Text>
              </View>
              {listing.inspection_badge && (
                <View style={s.inspBadge}><Text style={{ fontSize: 8, fontWeight: '800', color: '#000' }}>✓</Text></View>
              )}
            </TouchableOpacity>
          ))}
          {listings?.length === 0 && (
            <Text style={{ color: COLORS.gray3, fontSize: 13, textAlign: 'center', padding: 20 }}>No active listings</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// mobile/app/finance-calculator.tsx
export function FinanceCalculatorScreen() {
  const [price, setPrice] = useState('6500000');
  const [downPct, setDownPct] = useState(20);
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(22);

  const principal = (parseFloat(price) || 0) * (1 - downPct / 100);
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly = principal > 0 && r > 0
    ? Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1))
    : 0;
  const totalPayment = monthly * n;
  const totalInterest = totalPayment - principal;

  return (
    <SafeAreaView style={s.container}>
      <View style={s2.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s2.title}>💰 Finance Calculator</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Text style={s2.disclaimer}>Estimate based on standard bank rates. Actual rates vary.</Text>

        {/* Car price */}
        <Text style={s2.label}>Car Price (PKR)</Text>
        <View style={s2.inputWrap}>
          <Text style={s2.inputPrefix}>PKR</Text>
          <TextInput
            style={s2.input}
            value={price}
            onChangeText={v => setPrice(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholderTextColor={COLORS.gray3}
          />
        </View>
        {price.length > 3 && <Text style={s2.formatted}>= {formatPKR(parseFloat(price))}</Text>}

        {/* Down payment slider */}
        <Text style={s2.label}>Down Payment: {downPct}% — PKR {formatPKR((parseFloat(price) || 0) * downPct / 100)}</Text>
        <View style={s2.sliderRow}>
          {[10, 20, 30, 40, 50].map(pct => (
            <TouchableOpacity
              key={pct}
              style={[s2.sliderChip, downPct === pct && s2.sliderChipActive]}
              onPress={() => setDownPct(pct)}
            >
              <Text style={[s2.sliderChipText, downPct === pct && { color: COLORS.primary }]}>{pct}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tenure */}
        <Text style={s2.label}>Loan Tenure</Text>
        <View style={s2.sliderRow}>
          {[3, 5, 7].map(yr => (
            <TouchableOpacity
              key={yr}
              style={[s2.sliderChip, years === yr && s2.sliderChipActive, { flex: 1 }]}
              onPress={() => setYears(yr)}
            >
              <Text style={[s2.sliderChipText, years === yr && { color: COLORS.primary }]}>{yr} Years</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Annual rate */}
        <Text style={s2.label}>Annual Interest Rate: {rate}%</Text>
        <View style={s2.sliderRow}>
          {[18, 20, 22, 24, 26].map(r2 => (
            <TouchableOpacity
              key={r2}
              style={[s2.sliderChip, rate === r2 && s2.sliderChipActive]}
              onPress={() => setRate(r2)}
            >
              <Text style={[s2.sliderChipText, rate === r2 && { color: COLORS.primary }]}>{r2}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result */}
        <View style={s2.resultCard}>
          <View style={s2.resultRow}>
            <Text style={s2.resultLabel}>Monthly Payment</Text>
            <Text style={s2.resultMain}>PKR {formatPKR(monthly)}</Text>
          </View>
          <View style={s2.divider} />
          <View style={s2.resultRow}>
            <Text style={s2.resultSub}>Down Payment</Text>
            <Text style={s2.resultSubVal}>PKR {formatPKR((parseFloat(price) || 0) * downPct / 100)}</Text>
          </View>
          <View style={s2.resultRow}>
            <Text style={s2.resultSub}>Loan Amount</Text>
            <Text style={s2.resultSubVal}>PKR {formatPKR(principal)}</Text>
          </View>
          <View style={s2.resultRow}>
            <Text style={s2.resultSub}>Total Payment</Text>
            <Text style={s2.resultSubVal}>PKR {formatPKR(totalPayment)}</Text>
          </View>
          <View style={s2.resultRow}>
            <Text style={s2.resultSub}>Total Interest</Text>
            <Text style={[s2.resultSubVal, { color: COLORS.red }]}>PKR {formatPKR(totalInterest)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s2.cta}
          onPress={() => router.push('/dealer/leads?type=financing')}
        >
          <Text style={s2.ctaText}>Get Financing Quotes from Banks →</Text>
        </TouchableOpacity>

        <Text style={s2.bankList}>Partner Banks: Meezan Bank · Bank Alfalah · HBL · MCB · UBL</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Shared styles for dealer
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverWrap: { height: 160, position: 'relative', backgroundColor: COLORS.bgCard },
  coverBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.green + '18' },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  dealerMeta: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  dealerLogoWrap: { width: 64, height: 64, borderRadius: 16, backgroundColor: COLORS.primary + '33', borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  dealerLogoText: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  dealerName: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  tierText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  ratingText: { fontSize: 11, color: COLORS.gray2 },
  dealerCity: { fontSize: 11, color: COLORS.gray3, marginTop: 2 },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stat: { flex: 1, alignItems: 'center', paddingVertical: SPACING.lg, borderRightWidth: 1, borderRightColor: COLORS.border },
  statVal: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 10, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  contactBtn: { flex: 1, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  contactBtnWA: { borderColor: '#25D36644' },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.gray1 },
  section: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  description: { fontSize: 13, color: COLORS.gray2, lineHeight: 20 },
  listingRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  listingImg: { width: 88, height: 66, borderRadius: 8, backgroundColor: COLORS.gray4, overflow: 'hidden' },
  listingTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  listingVariant: { fontSize: 10, color: COLORS.gray3 },
  listingPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginVertical: 2 },
  listingMeta: { fontSize: 10, color: COLORS.gray3 },
  inspBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});

// Finance calculator styles
const s2 = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  disclaimer: { fontSize: 11, color: COLORS.gray3, marginBottom: SPACING.xl, lineHeight: 17 },
  label: { fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 8, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  inputPrefix: { paddingHorizontal: 12, paddingVertical: 12, color: COLORS.gray3, fontSize: 13, borderRightWidth: 1, borderRightColor: COLORS.border },
  input: { flex: 1, padding: 12, color: COLORS.white, fontSize: 18, fontWeight: '700' },
  formatted: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginBottom: SPACING.md },
  sliderRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  sliderChip: { flex: 1, paddingVertical: 9, backgroundColor: COLORS.bgElevated, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  sliderChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  sliderChipText: { fontSize: 12, color: COLORS.gray2, fontWeight: '700' },
  resultCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.lg },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  resultLabel: { fontSize: 13, color: COLORS.gray2 },
  resultMain: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  resultSub: { fontSize: 12, color: COLORS.gray3 },
  resultSubVal: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  cta: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 14 },
  bankList: { fontSize: 11, color: COLORS.gray3, textAlign: 'center' },
});

// Need this import at top of file
import { useState as useStateImport } from 'react';
import { TextInput } from 'react-native';
