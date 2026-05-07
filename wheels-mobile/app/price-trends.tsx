// mobile/app/price-trends.tsx
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, formatPKR } from '../constants/theme';
import { VEHICLE_MAKES } from '../constants/theme';
import api from '../services/api';

const { width: W } = Dimensions.get('window');
const CHART_W = W - SPACING.lg * 2 - 32;
const CHART_H = 180;

// Mock 12-month trend data — replaced by real API data in production
function generateMockTrend(basePrice: number, volatility = 0.05) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let price = basePrice * 0.88;
  return months.map(month => {
    price = price * (1 + (Math.random() - 0.4) * volatility);
    return { month, price: Math.round(price / 50000) * 50000 };
  });
}

const POPULAR_SEARCHES = [
  { make: 'Toyota', model: 'Corolla', variant: 'Altis X', year: 2022, basePrice: 6200000 },
  { make: 'Honda',  model: 'Civic',   variant: 'Oriel',   year: 2021, basePrice: 7000000 },
  { make: 'Suzuki', model: 'Alto',    variant: 'VXR',     year: 2023, basePrice: 3000000 },
  { make: 'Hyundai',model: 'Tucson',  variant: 'AWD',     year: 2022, basePrice: 11800000 },
  { make: 'KIA',    model: 'Sportage',variant: 'FWD',     year: 2022, basePrice: 9200000 },
];

// ── SVG Line Chart ────────────────────────────────────────────
function PriceChart({ data, color = COLORS.primary }: { data: { month: string; price: number }[]; color?: string }) {
  if (!data || data.length === 0) return null;

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices) * 0.97;
  const maxPrice = Math.max(...prices) * 1.03;
  const range = maxPrice - minPrice || 1;

  const xStep = CHART_W / (data.length - 1);
  const getY = (price: number) => CHART_H - ((price - minPrice) / range) * CHART_H;
  const getX = (i: number) => i * xStep;

  // Build SVG path
  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.price).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${getX(data.length - 1).toFixed(1)} ${CHART_H} L 0 ${CHART_H} Z`;

  // Find min and max points
  const maxIdx = prices.indexOf(Math.max(...prices));
  const minIdx = prices.indexOf(Math.min(...prices));
  const lastIdx = data.length - 1;

  const priceDiff = data[lastIdx].price - data[0].price;
  const pctChange = ((priceDiff / data[0].price) * 100).toFixed(1);
  const trending = priceDiff >= 0;

  return (
    <View>
      {/* Trend summary */}
      <View style={cs.trendRow}>
        <View>
          <Text style={cs.trendCurrent}>PKR {formatPKR(data[lastIdx].price)}</Text>
          <Text style={cs.trendSub}>Current avg market price</Text>
        </View>
        <View style={[cs.trendBadge, { backgroundColor: trending ? COLORS.primary + '22' : COLORS.red + '22' }]}>
          <Text style={[cs.trendBadgeText, { color: trending ? COLORS.primary : COLORS.red }]}>
            {trending ? '↑' : '↓'} {Math.abs(parseFloat(pctChange))}% (12m)
          </Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={CHART_W + 32} height={CHART_H + 40} style={{ marginLeft: -4 }}>
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = t * CHART_H;
          const price = maxPrice - t * range;
          return (
            <Line key={t} x1={0} y1={y} x2={CHART_W} y2={y}
              stroke={COLORS.border} strokeWidth={1} strokeDasharray="3,3" />
          );
        })}

        {/* Area fill */}
        <Path d={areaD} fill="url(#chartGrad)" />

        {/* Line */}
        <Path d={pathD} fill="none" stroke={color} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Max point */}
        <Circle cx={getX(maxIdx)} cy={getY(data[maxIdx].price)} r={5} fill={COLORS.primary} />
        <SvgText x={getX(maxIdx)} y={getY(data[maxIdx].price) - 10} fontSize={9} fill={COLORS.primary} textAnchor="middle" fontWeight="700">
          {formatPKR(data[maxIdx].price)}
        </SvgText>

        {/* Last point */}
        <Circle cx={getX(lastIdx)} cy={getY(data[lastIdx].price)} r={6} fill={color} stroke={COLORS.bg} strokeWidth={2} />

        {/* X axis labels */}
        {data.map((d, i) => (
          i % 2 === 0 ? (
            <SvgText key={i} x={getX(i)} y={CHART_H + 16} fontSize={9} fill={COLORS.gray3} textAnchor="middle">{d.month}</SvgText>
          ) : null
        ))}
      </Svg>

      {/* Stats row */}
      <View style={cs.statsRow}>
        <View style={cs.statBox}>
          <Text style={cs.statLabel}>12m Low</Text>
          <Text style={cs.statVal}>PKR {formatPKR(Math.min(...prices))}</Text>
        </View>
        <View style={cs.statBox}>
          <Text style={cs.statLabel}>12m High</Text>
          <Text style={cs.statVal}>PKR {formatPKR(Math.max(...prices))}</Text>
        </View>
        <View style={cs.statBox}>
          <Text style={cs.statLabel}>Avg Price</Text>
          <Text style={cs.statVal}>PKR {formatPKR(Math.round(prices.reduce((a, b) => a + b) / prices.length))}</Text>
        </View>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  trendCurrent: { fontSize: 22, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
  trendSub: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  trendBadgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statBox: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: 8, padding: 8, alignItems: 'center' },
  statLabel: { fontSize: 9, color: COLORS.gray3, marginBottom: 3 },
  statVal: { fontSize: 11, fontWeight: '700', color: COLORS.white },
});

// ── Main Screen ───────────────────────────────────────────────
export default function PriceTrendsScreen() {
  const [selected, setSelected] = useState(POPULAR_SEARCHES[0]);
  const [customMake, setCustomMake] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [searching, setSearching] = useState(false);

  // In production: fetch from GET /ai/price-trends?make=&model=&year=
  // Using generated mock data to demonstrate the chart
  const trendData = generateMockTrend(selected.basePrice);

  const handleCustomSearch = () => {
    if (!customMake || !customModel) return;
    setSelected({ make: customMake, model: customModel, variant: '', year: new Date().getFullYear() - 1, basePrice: 5000000 });
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>📈 Price Trends</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Popular shortcuts */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Popular Models</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg }}>
              {POPULAR_SEARCHES.map(item => (
                <TouchableOpacity
                  key={`${item.make}${item.model}`}
                  style={[s.popularChip, selected.make === item.make && selected.model === item.model && s.popularChipActive]}
                  onPress={() => setSelected(item)}
                >
                  <Text style={[s.popularChipMake, selected.make === item.make && selected.model === item.model && { color: COLORS.primary }]}>{item.make}</Text>
                  <Text style={[s.popularChipModel, selected.make === item.make && selected.model === item.model && { color: COLORS.white }]}>{item.model}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Custom search */}
        <View style={s.searchCard}>
          <Text style={s.sectionTitle}>Search Any Model</Text>
          <View style={s.searchRow}>
            <TextInput
              style={[s.searchInput, { flex: 1 }]}
              value={customMake}
              onChangeText={setCustomMake}
              placeholder="Make (Toyota)"
              placeholderTextColor={COLORS.gray3}
            />
            <TextInput
              style={[s.searchInput, { flex: 1 }]}
              value={customModel}
              onChangeText={setCustomModel}
              placeholder="Model (Corolla)"
              placeholderTextColor={COLORS.gray3}
            />
            <TouchableOpacity style={s.searchBtn} onPress={handleCustomSearch}>
              <Text style={s.searchBtnText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chart */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>
            {selected.year} {selected.make} {selected.model}
            {selected.variant ? ` ${selected.variant}` : ''}
          </Text>
          <Text style={s.chartSub}>12-Month Price Trend · Pakistan Market</Text>
          <PriceChart data={trendData} />
        </View>

        {/* Insight cards */}
        <View style={{ paddingHorizontal: SPACING.lg }}>
          <Text style={s.sectionTitle}>Market Insights</Text>
          <View style={s.insightGrid}>
            {[
              { icon: '📊', title: 'Demand', body: 'High demand in Lahore & Karachi. Prices 3-5% above national average in these cities.' },
              { icon: '⛽', title: 'Fuel Impact', body: 'CNG variants gaining popularity as petrol prices rise. Hybrid premium up 8% YoY.' },
              { icon: '📅', title: 'Best Time to Buy', body: 'Prices typically dip 5-8% in July-August and December-January (Eid + year-end).' },
              { icon: '🔧', title: 'Maintenance Cost', body: `Annual maintenance for ${selected.make} ${selected.model} estimated at PKR 25,000-45,000.` },
            ].map(insight => (
              <View key={insight.title} style={s.insightCard}>
                <Text style={s.insightIcon}>{insight.icon}</Text>
                <Text style={s.insightTitle}>{insight.title}</Text>
                <Text style={s.insightBody}>{insight.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Similar models to compare */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.xl }}>
          <Text style={s.sectionTitle}>Compare with Similar</Text>
          {POPULAR_SEARCHES.filter(p => p.make !== selected.make || p.model !== selected.model).slice(0, 3).map(car => (
            <TouchableOpacity
              key={`${car.make}${car.model}`}
              style={s.similarRow}
              onPress={() => router.push(`/compare?cars=${selected.make}+${selected.model},${car.make}+${car.model}`)}
            >
              <View>
                <Text style={s.similarName}>{car.make} {car.model}</Text>
                <Text style={s.similarPrice}>Avg PKR {formatPKR(car.basePrice)}</Text>
              </View>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>Compare ⚖️</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  section: { paddingVertical: SPACING.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 10, paddingHorizontal: SPACING.lg },
  popularChip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, minWidth: 90, alignItems: 'center' },
  popularChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  popularChipMake: { fontSize: 10, color: COLORS.gray3, fontWeight: '600', marginBottom: 2 },
  popularChipModel: { fontSize: 13, color: COLORS.gray2, fontWeight: '700' },
  searchCard: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  searchInput: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.white, fontSize: 13 },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  chartCard: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.xl },
  chartTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  chartSub: { fontSize: 11, color: COLORS.gray3, marginBottom: SPACING.lg },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  insightCard: { width: '47%', backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  insightIcon: { fontSize: 22, marginBottom: 6 },
  insightTitle: { fontSize: 12, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  insightBody: { fontSize: 11, color: COLORS.gray2, lineHeight: 16 },
  similarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: COLORS.border },
  similarName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  similarPrice: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
});
