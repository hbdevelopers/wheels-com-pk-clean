// mobile/app/(tabs)/search.tsx
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useListingStore } from '../../store/auth.store';
import { COLORS, SPACING, RADIUS, formatPKR } from '../../constants/theme';
import { PAKISTAN_CITIES, VEHICLE_MAKES } from '../../constants/theme';
import { vehiclesApi } from '../../services/api';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'popular', label: 'Popular' },
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ vehicle_type?: string; q?: string }>();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(params.q || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vehicle_type: params.vehicle_type || 'car',
    city: '', make: '', min_price: undefined as number | undefined,
    max_price: undefined as number | undefined,
    min_year: undefined as number | undefined,
    transmission: '', fuel_type: '', inspected_only: false,
    sort: 'newest',
  });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);

  const doSearch = useCallback(async (reset = true) => {
    setLoading(true);
    const p = reset ? 1 : page + 1;
    try {
      const { data } = await vehiclesApi.search({ ...filters, q: query, page: p, limit: 20 });
      setResults(reset ? data.data : prev => [...prev, ...data.data]);
      setTotal(data.meta.total);
      setHasNext(data.meta.has_next);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [filters, query, page]);

  const fetchSuggestions = async (text: string) => {
    if (text.length < 2) { setSuggestions([]); return; }
    try {
      const { data } = await vehiclesApi.autocomplete(text);
      setSuggestions(data.slice(0, 6));
    } catch { setSuggestions([]); }
  };

  const FilterChip = ({ label, active, onPress }: any) => (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Search input */}
      <View style={s.searchRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={[s.searchBar, query.length > 0 && s.searchBarActive]}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            value={query}
            onChangeText={t => { setQuery(t); fetchSuggestions(t); }}
            onSubmitEditing={() => { setSuggestions([]); doSearch(true); }}
            placeholder="Make, model, city..."
            placeholderTextColor={COLORS.gray3}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
              <Text style={{ color: COLORS.gray3, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <View style={s.suggestionBox}>
          {suggestions.map(s2 => (
            <TouchableOpacity
              key={s2}
              style={s.suggestionRow}
              onPress={() => { setQuery(s2); setSuggestions([]); doSearch(true); }}
            >
              <Text style={{ color: COLORS.primary, marginRight: 8 }}>✦</Text>
              <Text style={s.suggestionText}>{s2}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {PAKISTAN_CITIES.filter(c => c.major).slice(0, 6).map(city => (
          <FilterChip
            key={city.name}
            label={`📍 ${city.name}`}
            active={filters.city === city.name}
            onPress={() => setFilters(f => ({ ...f, city: f.city === city.name ? '' : city.name }))}
          />
        ))}
        {SORT_OPTIONS.map(o => (
          <FilterChip
            key={o.value}
            label={o.label}
            active={filters.sort === o.value}
            onPress={() => setFilters(f => ({ ...f, sort: o.value }))}
          />
        ))}
        <FilterChip
          label="✓ Inspected"
          active={filters.inspected_only}
          onPress={() => setFilters(f => ({ ...f, inspected_only: !f.inspected_only }))}
        />
      </ScrollView>

      {/* Result count + search button */}
      <View style={s.resultHeader}>
        <Text style={s.resultCount}>{total > 0 ? `${total.toLocaleString()} listings` : 'Search above'}</Text>
        <TouchableOpacity style={s.searchBtn} onPress={() => doSearch(true)}>
          <Text style={s.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.resultCard}
            onPress={() => router.push(`/listing/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={s.resultImg}>
                {item.primary_image?.thumbnail_url && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.gray4 }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resultTitle} numberOfLines={1}>
                  {item.year} {item.make} {item.model}
                </Text>
                {item.variant && <Text style={s.resultVariant}>{item.variant}</Text>}
                <Text style={s.resultPrice}>PKR {formatPKR(item.price)}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {[`${Math.round((item.mileage||0)/1000)}k km`, item.city, item.fuel_type].map(t =>
                    t ? <View key={t} style={s.resultTag}><Text style={s.resultTagText}>{t}</Text></View> : null,
                  )}
                  {item.inspection_badge && (
                    <View style={[s.resultTag, { backgroundColor: COLORS.primary + '22' }]}>
                      <Text style={[s.resultTagText, { color: COLORS.primary }]}>✓ Inspected</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        onEndReached={() => hasNext && !loading && doSearch(false)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ margin: 20 }} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={{ color: COLORS.gray2, fontSize: 15, fontWeight: '600' }}>Start your search</Text>
              <Text style={{ color: COLORS.gray3, fontSize: 13, marginTop: 6 }}>Use filters above or type a make/model</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchBarActive: { borderColor: COLORS.primary },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.bgElevated, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  suggestionBox: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.bgCard,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 8, overflow: 'hidden',
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionText: { color: COLORS.gray2, fontSize: 13 },
  filterRow: { paddingHorizontal: SPACING.lg, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary + '66' },
  chipText: { fontSize: 11, color: COLORS.gray2, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: 8,
  },
  resultCount: { fontSize: 12, color: COLORS.gray3, fontWeight: '600' },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  searchBtnText: { color: '#000', fontSize: 12, fontWeight: '700' },
  resultCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 12,
  },
  resultImg: { width: 88, height: 66, borderRadius: 8, backgroundColor: COLORS.gray4, overflow: 'hidden' },
  resultTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  resultVariant: { fontSize: 11, color: COLORS.gray3, marginBottom: 4 },
  resultPrice: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  resultTag: { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: COLORS.bgElevated, borderRadius: 5 },
  resultTagText: { fontSize: 9, color: COLORS.gray2 },
});
