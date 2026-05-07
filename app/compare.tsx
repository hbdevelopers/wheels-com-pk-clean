// mobile/app/compare.tsx
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { vehiclesApi } from '../services/api';
import { COLORS, SPACING, formatPKR } from '../constants/theme';

const { width: W } = Dimensions.get('window');
const MAX_CARS = 3;

// Spec rows to compare
const SPEC_ROWS = [
  { key: 'price',          label: 'Price',           format: (v: any) => v ? `PKR ${formatPKR(v)}` : '—', higherIsBetter: false },
  { key: 'year',           label: 'Year',             format: (v: any) => v || '—',                        higherIsBetter: true  },
  { key: 'mileage',        label: 'Mileage',          format: (v: any) => v ? `${Math.round(v/1000)}k km` : '—', higherIsBetter: false },
  { key: 'engine_capacity',label: 'Engine',           format: (v: any) => v ? `${v} cc` : '—',            higherIsBetter: false },
  { key: 'fuel_type',      label: 'Fuel',             format: (v: any) => v || '—',                        higherIsBetter: null  },
  { key: 'transmission',   label: 'Transmission',     format: (v: any) => v || '—',                        higherIsBetter: null  },
  { key: 'assembly',       label: 'Assembly',         format: (v: any) => v || '—',                        higherIsBetter: null  },
  { key: 'color',          label: 'Color',            format: (v: any) => v || '—',                        higherIsBetter: null  },
  { key: 'body_type',      label: 'Body Type',        format: (v: any) => v || '—',                        higherIsBetter: null  },
  { key: 'city',           label: 'Location',         format: (v: any) => v || '—',                        higherIsBetter: null  },
  { key: 'inspection_badge',label: 'Inspected',       format: (v: any) => v ? '✓ Yes' : '✗ No',           higherIsBetter: true  },
  { key: 'fraud_risk_score',label: 'Trust Score',     format: (v: any) => v !== undefined ? `${100 - v}%` : '—', higherIsBetter: true },
  { key: 'view_count',     label: 'Popularity',       format: (v: any) => v ? `${v} views` : '—',         higherIsBetter: true  },
];

// Score each car (0-100) for overall comparison
function scoreCar(car: any, all: any[]) {
  let score = 50;
  if (car.inspection_badge) score += 15;
  if (car.fraud_risk_score < 20) score += 10;
  const prices = all.map(c => c.price).filter(Boolean);
  if (prices.length > 1) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    score += Math.round(((maxPrice - car.price) / range) * 15);
  }
  const years = all.map(c => c.year).filter(Boolean);
  if (years.length > 1) {
    const maxYear = Math.max(...years);
    score += car.year === maxYear ? 10 : 0;
  }
  const mileages = all.map(c => c.mileage).filter(Boolean);
  if (mileages.length > 1 && car.mileage) {
    const minMileage = Math.min(...mileages);
    const maxMileage = Math.max(...mileages);
    const range = maxMileage - minMileage || 1;
    score += Math.round(((maxMileage - car.mileage) / range) * 10);
  }
  return Math.min(100, Math.max(0, score));
}

// Determine winner for a numeric spec row
function getWinner(row: typeof SPEC_ROWS[0], cars: any[]): number | null {
  if (row.higherIsBetter === null) return null;
  const vals = cars.map(c => {
    const v = c[row.key];
    return v !== undefined && v !== null ? Number(v) : null;
  });
  if (vals.every(v => v === null)) return null;
  const target = row.higherIsBetter
    ? Math.max(...vals.filter(v => v !== null) as number[])
    : Math.min(...vals.filter(v => v !== null) as number[]);
  const idx = vals.findIndex(v => v === target);
  return idx;
}

// ── Search panel to add a car ─────────────────────────────────
function CarSearchPanel({ onSelect, onClose }: { onSelect: (car: any) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const { data } = await vehiclesApi.search({ q, limit: 10 });
      setResults(data.data || []);
    } finally { setLoading(false); }
  }, [q]);

  return (
    <View style={sp.overlay}>
      <View style={sp.panel}>
        <View style={sp.header}>
          <Text style={sp.title}>Search a Car to Add</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>✕</Text></TouchableOpacity>
        </View>
        <View style={sp.inputRow}>
          <TextInput
            style={sp.input}
            value={q}
            onChangeText={setQ}
            placeholder="Toyota Corolla, Honda Civic..."
            placeholderTextColor={COLORS.gray3}
            autoFocus
            onSubmitEditing={search}
          />
          <TouchableOpacity style={sp.searchBtn} onPress={search} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={sp.searchBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>
        <FlatList
          data={results}
          keyExtractor={i => i.id}
          style={{ maxHeight: 320 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={sp.resultRow} onPress={() => { onSelect(item); onClose(); }}>
              <View style={sp.resultImg} />
              <View style={{ flex: 1 }}>
                <Text style={sp.resultTitle}>{item.year} {item.make} {item.model}</Text>
                <Text style={sp.resultPrice}>PKR {formatPKR(item.price)} · {item.city}</Text>
              </View>
              <Text style={{ color: COLORS.primary, fontSize: 18 }}>+</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            results.length === 0 && !loading ? (
              <Text style={{ color: COLORS.gray3, textAlign: 'center', padding: 20, fontSize: 13 }}>
                {q.length > 0 ? 'No results. Try different keywords.' : 'Type to search listings...'}
              </Text>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end', zIndex: 100 },
  panel: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 11, color: COLORS.white, fontSize: 14 },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  resultImg: { width: 60, height: 45, borderRadius: 8, backgroundColor: COLORS.gray4 },
  resultTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  resultPrice: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
});

// ── Main Compare Screen ───────────────────────────────────────
export default function CompareScreen() {
  const [cars, setCars] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchSlot, setSearchSlot] = useState<number | null>(null);

  const addCar = (car: any) => {
    if (searchSlot !== null) {
      // Replace specific slot
      setCars(prev => { const next = [...prev]; next[searchSlot] = car; return next; });
    } else if (cars.length < MAX_CARS) {
      setCars(prev => [...prev, car]);
    }
    setShowSearch(false);
    setSearchSlot(null);
  };

  const removeCar = (i: number) => setCars(prev => prev.filter((_, j) => j !== i));

  const scores = cars.length > 1 ? cars.map(c => scoreCar(c, cars)) : [];
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const carWidth = cars.length === 1 ? W - 80 : cars.length === 2 ? (W - 80) / 2 : (W - 80) / 3;

  return (
    <SafeAreaView style={s.container}>
      {showSearch && <CarSearchPanel onSelect={addCar} onClose={() => { setShowSearch(false); setSearchSlot(null); }} />}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Compare Cars</Text>
        {cars.length > 0 && (
          <TouchableOpacity onPress={() => setCars([])}><Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700' }}>Clear All</Text></TouchableOpacity>
        )}
        {cars.length === 0 && <View style={{ width: 60 }} />}
      </View>

      {cars.length === 0 ? (
        // Empty state
        <View style={s.emptyState}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>⚖️</Text>
          <Text style={s.emptyTitle}>Compare up to 3 cars</Text>
          <Text style={s.emptySub}>Add cars to see a side-by-side comparison of specs, price, trust score, and more</Text>
          <TouchableOpacity style={s.addFirstBtn} onPress={() => setShowSearch(true)}>
            <Text style={s.addFirstBtnText}>+ Add First Car</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          {/* Car header row */}
          <ScrollView horizontal={cars.length === MAX_CARS} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {/* Row label column */}
              <View style={s.labelCol}>
                <View style={s.labelColHeader} />
                {scores.length > 1 && <View style={[s.specRowLabel, { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary + '33' }]}><Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '800' }}>SCORE</Text></View>}
                {SPEC_ROWS.map(row => (
                  <View key={row.key} style={s.specRowLabel}>
                    <Text style={s.specRowLabelText}>{row.label}</Text>
                  </View>
                ))}
              </View>

              {/* Car columns */}
              {cars.map((car, i) => (
                <View key={car.id} style={[s.carCol, { width: carWidth }]}>
                  {/* Car header */}
                  <View style={[s.carHeader, scores.length > 1 && scores[i] === bestScore && s.carHeaderWinner]}>
                    {scores.length > 1 && scores[i] === bestScore && (
                      <View style={s.bestBadge}><Text style={s.bestBadgeText}>BEST</Text></View>
                    )}
                    <View style={s.carImgPlaceholder} />
                    <Text style={s.carTitle} numberOfLines={2}>{car.year} {car.make} {car.model}</Text>
                    {car.variant && <Text style={s.carVariant}>{car.variant}</Text>}
                    <TouchableOpacity style={s.viewBtn} onPress={() => router.push(`/listing/${car.id}`)}>
                      <Text style={s.viewBtnText}>View →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeCar(i)}>
                      <Text style={{ color: COLORS.red, fontSize: 10, fontWeight: '700' }}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Overall score */}
                  {scores.length > 1 && (
                    <View style={[s.specCell, { backgroundColor: COLORS.primaryFaint }]}>
                      <View style={s.scoreBar}>
                        <View style={[s.scoreBarFill, { width: `${scores[i]}%`, backgroundColor: scores[i] === bestScore ? COLORS.primary : COLORS.gray3 }]} />
                      </View>
                      <Text style={[s.scorePct, { color: scores[i] === bestScore ? COLORS.primary : COLORS.gray2 }]}>
                        {scores[i]}/100
                      </Text>
                    </View>
                  )}

                  {/* Spec cells */}
                  {SPEC_ROWS.map(row => {
                    const winnerIdx = getWinner(row, cars);
                    const isWinner = winnerIdx === i;
                    const val = car[row.key];
                    return (
                      <View key={row.key} style={[s.specCell, isWinner && s.specCellWinner]}>
                        <Text style={[s.specCellText, isWinner && { color: COLORS.primary, fontWeight: '700' }]}>
                          {row.format(val)}
                        </Text>
                        {isWinner && <Text style={s.winnerDot}>✓</Text>}
                      </View>
                    );
                  })}
                </View>
              ))}

              {/* Add car column */}
              {cars.length < MAX_CARS && (
                <View style={[s.carCol, { width: 80 }]}>
                  <TouchableOpacity style={s.addCarBtn} onPress={() => setShowSearch(true)}>
                    <Text style={s.addCarBtnIcon}>+</Text>
                    <Text style={s.addCarBtnText}>Add Car</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action bar */}
          {cars.length >= 2 && (
            <View style={s.actionBar}>
              <Text style={s.actionBarTitle}>
                {scores.indexOf(bestScore) >= 0
                  ? `✦ Best overall: ${cars[scores.indexOf(bestScore)].make} ${cars[scores.indexOf(bestScore)].model}`
                  : 'Comparison complete'}
              </Text>
              <TouchableOpacity style={s.actionBtn} onPress={() => router.push(`/listing/${cars[scores.indexOf(bestScore)]?.id}`)}>
                <Text style={s.actionBtnText}>View Winner →</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 10 },
  emptySub: { fontSize: 13, color: COLORS.gray3, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  addFirstBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  addFirstBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  labelCol: { width: 80, flexShrink: 0 },
  labelColHeader: { height: 200, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  specRowLabel: { height: 48, justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  specRowLabelText: { fontSize: 10, color: COLORS.gray2, fontWeight: '600' },
  carCol: { borderLeftWidth: 1, borderLeftColor: COLORS.border, flexShrink: 0 },
  carHeader: { height: 200, backgroundColor: COLORS.bgCard, padding: 10, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, position: 'relative' },
  carHeaderWinner: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary + '44' },
  bestBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.primary, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  bestBadgeText: { fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  carImgPlaceholder: { width: '100%', height: 72, backgroundColor: COLORS.gray4, borderRadius: 8 },
  carTitle: { fontSize: 11, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginTop: 6 },
  carVariant: { fontSize: 9, color: COLORS.gray3, textAlign: 'center' },
  viewBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  viewBtnText: { fontSize: 10, fontWeight: '700', color: '#000' },
  removeBtn: { marginTop: 4 },
  specCell: { height: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 6, position: 'relative' },
  specCellWinner: { backgroundColor: COLORS.primaryFaint },
  specCellText: { fontSize: 11, color: COLORS.gray1, textAlign: 'center' },
  winnerDot: { position: 'absolute', top: 4, right: 4, fontSize: 8, color: COLORS.primary, fontWeight: '900' },
  scoreBar: { width: '80%', height: 4, backgroundColor: COLORS.gray4, borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  scoreBarFill: { height: '100%', borderRadius: 99 },
  scorePct: { fontSize: 11, fontWeight: '800' },
  addCarBtn: { height: 200, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.border },
  addCarBtnIcon: { fontSize: 24, color: COLORS.primary, marginBottom: 4 },
  addCarBtnText: { fontSize: 9, color: COLORS.primary, fontWeight: '700' },
  actionBar: { margin: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary + '44', padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBarTitle: { fontSize: 12, fontWeight: '700', color: COLORS.white, flex: 1, marginRight: 10 },
  actionBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  actionBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
});
