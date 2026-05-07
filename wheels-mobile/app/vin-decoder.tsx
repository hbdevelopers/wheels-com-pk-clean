// mobile/app/vin-decoder.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';

// WMI (World Manufacturer Identifier) — first 3 chars of VIN
const WMI_DB: Record<string, { make: string; country: string; flag: string }> = {
  'JT0': { make: 'Toyota', country: 'Japan', flag: '🇯🇵' },
  'JTD': { make: 'Toyota', country: 'Japan', flag: '🇯🇵' },
  'JTJ': { make: 'Toyota', country: 'Japan', flag: '🇯🇵' },
  'JHM': { make: 'Honda', country: 'Japan', flag: '🇯🇵' },
  'JS1': { make: 'Suzuki', country: 'Japan', flag: '🇯🇵' },
  'JS3': { make: 'Suzuki', country: 'Japan', flag: '🇯🇵' },
  'KMH': { make: 'Hyundai', country: 'South Korea', flag: '🇰🇷' },
  'KNA': { make: 'KIA', country: 'South Korea', flag: '🇰🇷' },
  'KNB': { make: 'KIA', country: 'South Korea', flag: '🇰🇷' },
  'WBA': { make: 'BMW', country: 'Germany', flag: '🇩🇪' },
  'WBS': { make: 'BMW', country: 'Germany', flag: '🇩🇪' },
  'WDB': { make: 'Mercedes-Benz', country: 'Germany', flag: '🇩🇪' },
  'WAU': { make: 'Audi', country: 'Germany', flag: '🇩🇪' },
  '1HG': { make: 'Honda', country: 'USA', flag: '🇺🇸' },
  '1G1': { make: 'Chevrolet', country: 'USA', flag: '🇺🇸' },
  'SAL': { make: 'Land Rover', country: 'UK', flag: '🇬🇧' },
  'SAJ': { make: 'Jaguar', country: 'UK', flag: '🇬🇧' },
  'VF1': { make: 'Renault', country: 'France', flag: '🇫🇷' },
  'ZFF': { make: 'Ferrari', country: 'Italy', flag: '🇮🇹' },
  'LSVB': { make: 'Volvo (China)', country: 'China', flag: '🇨🇳' },
  'LSV': { make: 'Volkswagen (China)', country: 'China', flag: '🇨🇳' },
};

// Model year decoding (position 10 of VIN)
const YEAR_MAP: Record<string, number> = {
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
  'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
  'S': 2025, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
  '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
};

// Assembly plant (position 11 of VIN, make-specific for popular models)
const PLANT_MAP: Record<string, Record<string, string>> = {
  Toyota: {
    'J': 'Motoyama, Japan', 'A': 'Tahara, Japan',
    'T': 'Turkey', 'E': 'South Africa',
  },
  Honda: {
    'A': 'Sayama, Japan', 'M': 'Marysville, USA',
    'S': 'Suginami, Japan',
  },
};

// Validate VIN checksum (position 9 is check digit)
function validateVin(vin: string): boolean {
  if (vin.length !== 17) return false;
  const TRANSLITERATION: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9,
  };
  const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = vin.split('').reduce((acc, char, i) => acc + (TRANSLITERATION[char] || 0) * WEIGHTS[i], 0);
  const checkDigit = sum % 11;
  const expected = checkDigit === 10 ? 'X' : String(checkDigit);
  return vin[8] === expected;
}

function decodeVin(vin: string) {
  const v = vin.toUpperCase().trim();
  if (v.length < 11) return null;

  // Try WMI lookup (3 chars, then 4 chars for some)
  const wmi3 = v.slice(0, 3);
  const wmi4 = v.slice(0, 4);
  const manufacturer = WMI_DB[wmi3] || WMI_DB[wmi4] || null;

  const modelYearChar = v.length === 17 ? v[9] : null;
  const modelYear = modelYearChar ? YEAR_MAP[modelYearChar] : null;

  const plantChar = v.length === 17 ? v[10] : null;
  const plantName = manufacturer && plantChar
    ? PLANT_MAP[manufacturer.make]?.[plantChar] || null
    : null;

  const serialNumber = v.length === 17 ? v.slice(11) : null;
  const isValid = v.length === 17 ? validateVin(v) : null;

  // VIN structure breakdown
  const breakdown = v.length >= 3 ? [
    { pos: '1-3',  label: 'World Manufacturer ID', value: v.slice(0, 3), info: manufacturer ? `${manufacturer.make} · ${manufacturer.country}` : 'Unknown manufacturer' },
    { pos: '4-8',  label: 'Vehicle Descriptor',    value: v.slice(3, 8), info: 'Model, body type, engine type, restraint system' },
    { pos: '9',    label: 'Check Digit',            value: v[8] || '—',  info: isValid === true ? '✓ Valid' : isValid === false ? '✗ Invalid' : 'N/A (requires 17 digits)' },
    { pos: '10',   label: 'Model Year',             value: modelYearChar || '—', info: modelYear ? String(modelYear) : 'Unknown year code' },
    { pos: '11',   label: 'Plant Code',             value: plantChar || '—', info: plantName || 'Assembly plant identifier' },
    { pos: '12-17',label: 'Serial Number',          value: serialNumber || '—', info: 'Sequential production number' },
  ] : [];

  return { manufacturer, modelYear, plantName, serialNumber, isValid, breakdown };
}

// Pakistani registration number plate format detection
function detectPlateType(plate: string) {
  const p = plate.toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z]{3}\d{3}$/.test(p)) return { type: 'Old Format', city: 'Legacy registration', example: 'ABC123' };
  if (/^[A-Z]{2,3}-\d{1,4}$/.test(p)) return { type: 'Province Code', city: 'Province-based', example: 'LHR-1234' };
  if (/^\d{4}$/.test(p)) return { type: 'Custom Plate', city: 'Government/Special', example: '0001' };
  return { type: 'Unknown', city: '', example: '' };
}

export default function VinDecoderScreen() {
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [result, setResult] = useState<ReturnType<typeof decodeVin> | null>(null);
  const [plateResult, setPlateResult] = useState<ReturnType<typeof detectPlateType> | null>(null);
  const [activeTab, setActiveTab] = useState<'vin' | 'plate'>('vin');

  const handleDecode = () => {
    const r = decodeVin(vin);
    setResult(r);
  };

  const handlePlateLookup = () => {
    const r = detectPlateType(plate);
    setPlateResult(r);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>🔍 VIN Decoder</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabs}>
        {([['vin', '🔢 VIN / Chassis'], ['plate', '🏷️ Number Plate']] as const).map(([id, label]) => (
          <TouchableOpacity key={id} style={[s.tab, activeTab === id && s.tabActive]} onPress={() => setActiveTab(id)}>
            <Text style={[s.tabText, activeTab === id && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}>
        {activeTab === 'vin' ? (
          <>
            <Text style={s.sectionTitle}>Decode VIN or Chassis Number</Text>
            <Text style={s.sectionSub}>
              Enter the 17-character VIN or chassis number from your registration book or dashboard sticker
            </Text>

            <TextInput
              style={s.vinInput}
              value={vin}
              onChangeText={v => { setVin(v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '')); setResult(null); }}
              placeholder="e.g. JTDBZ3EU8A3012345"
              placeholderTextColor={COLORS.gray3}
              maxLength={17}
              autoCapitalize="characters"
              autoCorrect={false}
              letterSpacing={4}
            />

            {/* Character counter */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md }}>
              <Text style={{ fontSize: 10, color: vin.length === 17 ? COLORS.primary : COLORS.gray3 }}>
                {vin.length}/17 characters
              </Text>
              {vin.length === 17 && (
                <Text style={{ fontSize: 10, color: validateVin(vin) ? COLORS.primary : COLORS.amber, fontWeight: '700' }}>
                  {validateVin(vin) ? '✓ Valid checksum' : '⚠ Checksum mismatch'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[s.decodeBtn, vin.length < 3 && s.decodeBtnDisabled]}
              onPress={handleDecode}
              disabled={vin.length < 3}
            >
              <Text style={s.decodeBtnText}>Decode VIN →</Text>
            </TouchableOpacity>

            {result && (
              <View style={{ marginTop: SPACING.xl }}>
                {/* Manufacturer card */}
                {result.manufacturer && (
                  <View style={s.resultCard}>
                    <Text style={s.resultCardTitle}>Manufacturer</Text>
                    <View style={s.manufacturerRow}>
                      <Text style={s.manufacturerFlag}>{result.manufacturer.flag}</Text>
                      <View>
                        <Text style={s.manufacturerName}>{result.manufacturer.make}</Text>
                        <Text style={s.manufacturerCountry}>{result.manufacturer.country}</Text>
                      </View>
                    </View>
                    {result.modelYear && (
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Model Year</Text>
                        <Text style={s.infoValue}>{result.modelYear}</Text>
                      </View>
                    )}
                    {result.plantName && (
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Assembly Plant</Text>
                        <Text style={s.infoValue}>{result.plantName}</Text>
                      </View>
                    )}
                    {result.serialNumber && (
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Serial Number</Text>
                        <Text style={s.infoValue}>{result.serialNumber}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Breakdown */}
                {result.breakdown.length > 0 && (
                  <View style={s.resultCard}>
                    <Text style={s.resultCardTitle}>VIN Structure Breakdown</Text>
                    {result.breakdown.map(row => (
                      <View key={row.pos} style={s.breakdownRow}>
                        <View style={s.breakdownPos}><Text style={s.breakdownPosText}>{row.pos}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.breakdownLabel}>{row.label}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                            <View style={s.breakdownValChip}><Text style={s.breakdownValText}>{row.value}</Text></View>
                            <Text style={s.breakdownInfo}>{row.info}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {!result.manufacturer && (
                  <View style={s.unknownCard}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🤷</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 4 }}>Manufacturer not recognized</Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray3, textAlign: 'center', lineHeight: 18 }}>
                      This VIN is not in our database. It may be a locally assembled vehicle or have a non-standard format.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Sample VINs */}
            <Text style={[s.sectionTitle, { marginTop: SPACING.xxl }]}>Sample VINs to test</Text>
            {[
              { label: 'Toyota Corolla 2017', vin: 'JTDBZ3EU8A3012345' },
              { label: 'Honda Civic 2019', vin: 'JHMFC1F30KX000001' },
              { label: 'BMW 3 Series 2020', vin: 'WBA5R1C01LFH00001' },
            ].map(sample => (
              <TouchableOpacity
                key={sample.vin}
                style={s.sampleRow}
                onPress={() => { setVin(sample.vin); setResult(null); }}
              >
                <View>
                  <Text style={s.sampleLabel}>{sample.label}</Text>
                  <Text style={s.sampleVin}>{sample.vin}</Text>
                </View>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Try →</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={s.sectionTitle}>Number Plate Lookup</Text>
            <Text style={s.sectionSub}>Enter a Pakistan vehicle registration number plate to check its format and details</Text>

            <TextInput
              style={s.vinInput}
              value={plate}
              onChangeText={v => { setPlate(v.toUpperCase()); setPlateResult(null); }}
              placeholder="e.g. ABC-1234 or LHR-123"
              placeholderTextColor={COLORS.gray3}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity style={[s.decodeBtn, !plate && s.decodeBtnDisabled]} onPress={handlePlateLookup} disabled={!plate}>
              <Text style={s.decodeBtnText}>Lookup Plate →</Text>
            </TouchableOpacity>

            {plateResult && (
              <View style={[s.resultCard, { marginTop: SPACING.xl }]}>
                <Text style={s.resultCardTitle}>Plate Analysis</Text>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Format Type</Text>
                  <Text style={s.infoValue}>{plateResult.type}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Registration</Text>
                  <Text style={s.infoValue}>{plateResult.city || 'N/A'}</Text>
                </View>
              </View>
            )}

            <View style={[s.resultCard, { marginTop: SPACING.xl }]}>
              <Text style={s.resultCardTitle}>Pakistan Plate Formats</Text>
              {[
                { format: 'ABC-1234', desc: 'Standard current format (city code + numbers)' },
                { format: 'LHR-123', desc: 'Lahore registration' },
                { format: 'KHI-456', desc: 'Karachi registration' },
                { format: 'ISB-789', desc: 'Islamabad registration' },
                { format: 'RWP-999', desc: 'Rawalpindi registration' },
                { format: '0001', desc: 'Government / Special number plates' },
              ].map(item => (
                <View key={item.format} style={s.breakdownRow}>
                  <View style={s.breakdownValChip}><Text style={s.breakdownValText}>{item.format}</Text></View>
                  <Text style={[s.breakdownInfo, { flex: 1 }]}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray3 },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 6 },
  sectionSub: { fontSize: 12, color: COLORS.gray3, marginBottom: SPACING.lg, lineHeight: 18 },
  vinInput: {
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, color: COLORS.white, fontSize: 15,
    fontWeight: '700', fontFamily: 'monospace', letterSpacing: 2,
  },
  decodeBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  decodeBtnDisabled: { opacity: 0.4 },
  decodeBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  resultCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: 12 },
  resultCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  manufacturerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  manufacturerFlag: { fontSize: 40 },
  manufacturerName: { fontSize: 22, fontWeight: '900', color: COLORS.white },
  manufacturerCountry: { fontSize: 12, color: COLORS.gray3, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  infoLabel: { fontSize: 12, color: COLORS.gray3 },
  infoValue: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  breakdownPos: { backgroundColor: COLORS.bgElevated, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, minWidth: 32, alignItems: 'center' },
  breakdownPosText: { fontSize: 9, color: COLORS.gray2, fontWeight: '700', fontFamily: 'monospace' },
  breakdownLabel: { fontSize: 11, color: COLORS.gray2, fontWeight: '600' },
  breakdownValChip: { backgroundColor: COLORS.primaryFaint, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  breakdownValText: { fontSize: 11, color: COLORS.primary, fontWeight: '800', fontFamily: 'monospace' },
  breakdownInfo: { fontSize: 10, color: COLORS.gray3 },
  unknownCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 24, alignItems: 'center' },
  sampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  sampleLabel: { fontSize: 12, fontWeight: '600', color: COLORS.white },
  sampleVin: { fontSize: 10, color: COLORS.gray3, fontFamily: 'monospace', marginTop: 2 },
});
