// mobile/app/(tabs)/index.tsx
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, TextInput, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { vehiclesApi, auctionsApi, aiApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatPKR, formatRelativeTime, calculateEMI } from '../../constants/theme';

const { width: W } = Dimensions.get('window');

// ── ListingCard ───────────────────────────────────────────────
function ListingCard({ item, horizontal }: { item: any; horizontal?: boolean }) {
  const [saved, setSaved] = useState(false);
  return (
    <TouchableOpacity
      style={[s.card, horizontal && { width: W * 0.62 }]}
      onPress={() => router.push(`/listing/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={s.cardImg}>
        <Image
          source={{ uri: item.primary_image?.thumbnail_url || item.image }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={s.cardImgOverlay} />
        {item.inspection_badge && (
          <View style={s.inspectedBadge}><Text style={s.inspectedText}>✓ INSPECTED</Text></View>
        )}
        <TouchableOpacity style={s.saveBtn} onPress={() => setSaved(!saved)}>
          <Text style={{ fontSize: 16, color: saved ? COLORS.red : COLORS.white }}>{saved ? '♥' : '♡'}</Text>
        </TouchableOpacity>
        <View style={s.cardPriceWrap}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.year} {item.make} {item.model}
          </Text>
          <Text style={s.cardPrice}>PKR {formatPKR(item.price)}</Text>
        </View>
      </View>
      <View style={s.cardBody}>
        <View style={s.tagRow}>
          {[`${Math.round(item.mileage / 1000)}k km`, item.transmission, item.city].map(t => (
            <View key={t} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
          ))}
        </View>
        <View style={s.cardFooter}>
          <View style={[s.trustBadge, { backgroundColor: item.fraud_risk_score < 20 ? COLORS.primary + '22' : COLORS.amber + '22' }]}>
            <Text style={[s.trustText, { color: item.fraud_risk_score < 20 ? COLORS.primary : COLORS.amber }]}>
              {item.fraud_risk_score < 20 ? '● Low Risk' : '● Med Risk'}
            </Text>
          </View>
          <Text style={s.timeText}>{formatRelativeTime(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── AuctionCard ───────────────────────────────────────────────
function AuctionCard({ item }: { item: any }) {
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((new Date(item.ends_at).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), sec = timeLeft % 60;
  const timer = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  const urgent = timeLeft < 300;

  return (
    <TouchableOpacity style={s.auctionCard} onPress={() => router.push(`/auction/${item.id}`)}>
      <Image
        source={{ uri: item.vehicle_image }}
        style={s.auctionImg}
        resizeMode="cover"
      />
      <View style={s.auctionImgOverlay} />
      <View style={[s.timerBadge, urgent && s.timerUrgent]}>
        <Text style={[s.timerText, urgent && { color: '#fff' }]}>⏱ {timer}</Text>
      </View>
      <View style={s.auctionInfo}>
        <Text style={s.auctionTitle} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
        <Text style={s.auctionBid}>PKR {formatPKR(item.current_price || item.start_price)}</Text>
        <Text style={s.auctionBids}>{item.total_bids} bids</Text>
        <TouchableOpacity style={s.bidBtn}>
          <Text style={s.bidBtnText}>Bid Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Home Screen ───────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuthStore();
  const [aiQuery, setAiQuery] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [financePrice, setFinancePrice] = useState(6500000);
  const [downPct, setDownPct] = useState(20);

  const { data: featured, refetch: refetchFeatured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured'],
    queryFn: () => vehiclesApi.getFeatured(8).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const { data: latest, isLoading: loadingLatest, refetch } = useQuery({
    queryKey: ['latest'],
    queryFn: () => vehiclesApi.search({ sort: 'newest', limit: 10 }).then(r => r.data.data),
  });

  const { data: auctions } = useQuery({
    queryKey: ['live-auctions'],
    queryFn: () => auctionsApi.getAuctions('live').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchFeatured()]);
    setRefreshing(false);
  };

  const handleAiAsk = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await aiApi.chatbot(aiQuery);
      setAiReply(data.reply);
    } catch { setAiReply('Sorry, AI is unavailable right now.'); }
    finally { setAiLoading(false); }
  };

  const monthly = calculateEMI(financePrice, downPct);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>Pakistan's Smartest</Text>
            <Text style={s.headerTitle}>
              wheels<Text style={{ color: COLORS.primary }}>.com.pk</Text>
            </Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.avatar}
              onPress={() => router.push(user ? '/(tabs)/profile' : '/(auth)/login')}
            >
              <Text style={s.avatarText}>
                {user ? user.full_name.slice(0, 2).toUpperCase() : '?'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={s.searchBar} onPress={() => router.push('/(tabs)/search')}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <Text style={s.searchPlaceholder}>Search cars, bikes, parts...</Text>
          <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI ✦</Text></View>
        </TouchableOpacity>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {[
            { label: '🚗 Cars', type: 'car' },
            { label: '🏍️ Bikes', type: 'bike' },
            { label: '⚙️ Parts', type: 'auto_part' },
            { label: '🏷️ Plates', type: 'number_plate' },
            { label: '🔨 Auctions', type: 'auction' },
          ].map(c => (
            <TouchableOpacity
              key={c.type}
              style={s.pill}
              onPress={() => c.type === 'auction'
                ? router.push('/auction')
                : router.push({ pathname: '/(tabs)/search', params: { vehicle_type: c.type } })}
            >
              <Text style={s.pillText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI Assistant */}
        <View style={s.aiCard}>
          <View style={s.aiCardHeader}>
            <Text style={{ fontSize: 20 }}>✦</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.aiCardTitle}>Ask AI Assistant</Text>
              <Text style={s.aiCardSub}>Urdu supported · e.g. "Best car under 30 lac Lahore"</Text>
            </View>
          </View>
          <View style={s.aiInputRow}>
            <TextInput
              style={s.aiInput}
              value={aiQuery}
              onChangeText={setAiQuery}
              placeholder="Type your question..."
              placeholderTextColor={COLORS.gray3}
              onSubmitEditing={handleAiAsk}
            />
            <TouchableOpacity style={s.aiAskBtn} onPress={handleAiAsk} disabled={aiLoading}>
              <Text style={s.aiAskText}>{aiLoading ? '...' : 'Ask'}</Text>
            </TouchableOpacity>
          </View>
          {aiReply ? <Text style={s.aiReply}>{aiReply}</Text> : null}
        </View>

        {/* Live Auctions */}
        {auctions?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.liveDot} />
                <Text style={s.sectionTitle}>Live Auctions</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/auction')}>
                <Text style={s.seeAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={auctions}
              keyExtractor={i => i.id}
              renderItem={({ item }) => <AuctionCard item={item} />}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 12 }}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Featured */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>⭐ Featured</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={featured || []}
            keyExtractor={i => i.id}
            renderItem={({ item }) => <ListingCard item={item} horizontal />}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 12 }}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Finance Calculator */}
        <View style={s.financeCard}>
          <Text style={s.financeTitle}>💰 Quick Finance Check</Text>
          <View style={s.financeRow}>
            <View style={s.financeItem}>
              <Text style={s.financeLabel}>Car Price</Text>
              <Text style={s.financeValue}>PKR {formatPKR(financePrice)}</Text>
            </View>
            <View style={[s.financeItem, s.financeHighlight]}>
              <Text style={[s.financeLabel, { color: COLORS.primary }]}>Monthly (5yr)</Text>
              <Text style={[s.financeValue, { color: COLORS.primary }]}>~{formatPKR(monthly)}</Text>
            </View>
            <TouchableOpacity
              style={s.financeBtn}
              onPress={() => router.push('/finance-calculator')}
            >
              <Text style={s.financeBtnText}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Latest Listings */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🕐 Latest Listings</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: SPACING.lg, gap: 12 }}>
            {(latest || []).map(item => <ListingCard key={item.id} item={item} />)}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerSub: { fontSize: 11, color: COLORS.primary, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#000', fontSize: 13, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    marginBottom: 12,
  },
  searchPlaceholder: { flex: 1, color: COLORS.gray3, fontSize: 14 },
  aiBadge: {
    backgroundColor: COLORS.primaryFaint,
    borderWidth: 1, borderColor: COLORS.primary + '44',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  aiBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  pills: { paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 16 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pillText: { fontSize: 12, color: COLORS.gray2, fontWeight: '600' },
  aiCard: {
    marginHorizontal: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1, borderColor: COLORS.primary + '33',
    borderRadius: 14, marginBottom: 20,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  aiCardSub: { fontSize: 11, color: COLORS.gray2, marginTop: 2 },
  aiInputRow: { flexDirection: 'row', gap: 8 },
  aiInput: {
    flex: 1, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    color: COLORS.white, fontSize: 13,
  },
  aiAskBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9, justifyContent: 'center',
  },
  aiAskText: { color: '#000', fontWeight: '700', fontSize: 13 },
  aiReply: {
    marginTop: 10, fontSize: 13, color: COLORS.gray1,
    lineHeight: 20, padding: 10,
    backgroundColor: COLORS.bg, borderRadius: 8,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  seeAll: { fontSize: 12, color: COLORS.primary },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.red,
    shadowColor: COLORS.red, shadowRadius: 4, shadowOpacity: 1,
  },
  // Card styles
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, overflow: 'hidden',
  },
  cardImg: { height: 160, position: 'relative' },
  cardImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
  },
  inspectedBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
  },
  inspectedText: { fontSize: 9, fontWeight: '800', color: '#000' },
  saveBtn: {
    position: 'absolute', top: 6, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardPriceWrap: { position: 'absolute', bottom: 8, left: 10, right: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardPrice: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  cardBody: { padding: 12 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tag: {
    backgroundColor: COLORS.bgElevated, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: COLORS.gray2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trustBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  trustText: { fontSize: 10, fontWeight: '700' },
  timeText: { fontSize: 10, color: COLORS.gray3 },
  // Auction card
  auctionCard: {
    width: W * 0.55, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.red + '44',
    backgroundColor: COLORS.bgCard,
  },
  auctionImg: { width: '100%', height: 100 },
  auctionImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timerBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: COLORS.red + '22',
    borderWidth: 1, borderColor: COLORS.red + '44',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  timerUrgent: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  timerText: { fontSize: 9, color: COLORS.red, fontWeight: '800' },
  auctionInfo: { padding: 10 },
  auctionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.white, marginBottom: 3 },
  auctionBid: { fontSize: 15, fontWeight: '900', color: COLORS.primary, marginBottom: 2 },
  auctionBids: { fontSize: 10, color: COLORS.gray3, marginBottom: 8 },
  bidBtn: {
    backgroundColor: COLORS.red, borderRadius: 8,
    paddingVertical: 7, alignItems: 'center',
  },
  bidBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  // Finance card
  financeCard: {
    marginHorizontal: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, marginBottom: 24,
  },
  financeTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  financeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  financeItem: {
    flex: 1, padding: 10,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  financeHighlight: { borderColor: COLORS.primary + '44', backgroundColor: COLORS.primaryFaint },
  financeLabel: { fontSize: 9, color: COLORS.gray3, marginBottom: 2 },
  financeValue: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  financeBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  financeBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
});
