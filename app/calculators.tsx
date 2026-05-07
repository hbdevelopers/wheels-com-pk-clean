// mobile/app/calculators.tsx
// Pakistan Car Import Duty Calculator + Token Tax Calculator
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, SPACING, formatPKR } from '../constants/theme';

// ── Duty Rates (Pakistan FBR 2024) ───────────────────────────
const DUTY_SLABS = [
  { maxCC: 800,  customsDuty: 0.05, salesTax: 0.17, additionalCustomsDuty: 0.07, wit: 0.01 },
  { maxCC: 1000, customsDuty: 0.10, salesTax: 0.17, additionalCustomsDuty: 0.07, wit: 0.01 },
  { maxCC: 1300, customsDuty: 0.25, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 1500, customsDuty: 0.30, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 1600, customsDuty: 0.50, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 1800, customsDuty: 0.55, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 2000, customsDuty: 0.60, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 2500, customsDuty: 0.80, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 3000, customsDuty: 0.90, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
  { maxCC: 9999, customsDuty: 1.00, salesTax: 0.17, additionalCustomsDuty: 0.10, wit: 0.01 },
];

// Age-based depreciation (Pakistan Customs)
const AGE_DEPRECIATION: Record<number, number> = {
  0: 0, 1: 0.10, 2: 0.20, 3: 0.30, 4: 0.40, 5: 0.50,
};

// USD/PKR rate (update with live rate in production)
const USD_PKR = 278;

// Token tax rates by province/city
const TOKEN_TAX_RATES: Record<string, { rate: number; fixed?: number }> = {
  'Punjab (Lahore, Faisalabad, etc.)': { rate: 0.001 },        // 0.1% of value
  'Sindh (Karachi)':                    { rate: 0.0015 },       // 0.15% of value
  'KPK (Peshawar)':                     { rate: 0.001 },
  'Islamabad (Federal)':                { rate: 0.001 },
  'Balochistan (Quetta)':               { rate: 0.001 },
};

function formatRate(r: number) { return `${(r * 100).toFixed(0)}%`; }

// ── Import Duty Calculator ────────────────────────────────────
function ImportDutyCalculator() {
  const [fobUSD, setFobUSD] = useState('');
  const [cc, setCc] = useState('1300');
  const [ageYears, setAgeYears] = useState(0);
  const [isHybrid, setIsHybrid] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const ccNum = parseInt(cc) || 0;
  const fob = parseFloat(fobUSD) || 0;

  const slab = DUTY_SLABS.find(s => ccNum <= s.maxCC) || DUTY_SLABS[DUTY_SLABS.length - 1];
  const depreciation = AGE_DEPRECIATION[Math.min(ageYears, 5)] || 0.50;
  const assessedValueUSD = fob * (1 - depreciation);
  const assessedValuePKR = assessedValueUSD * USD_PKR;
  const cif = assessedValuePKR * 1.02; // add 2% freight/insurance estimate

  let customsDutyRate = slab.customsDuty;
  if (isHybrid && ccNum <= 1800) customsDutyRate = Math.max(0, customsDutyRate - 0.10);

  const customsDuty = cif * customsDutyRate;
  const additionalCustomsDuty = cif * slab.additionalCustomsDuty;
  const regulatoryDuty = ccNum > 1800 ? cif * 0.05 : 0;
  const salesTaxBase = cif + customsDuty + additionalCustomsDuty + regulatoryDuty;
  const salesTax = salesTaxBase * slab.salesTax;
  const wit = salesTaxBase * slab.wit;
  const totalDuty = customsDuty + additionalCustomsDuty + regulatoryDuty + salesTax + wit;
  const totalLandedCost = assessedValuePKR + totalDuty;

  const breakdown = [
    { label: 'FOB Value (USD)', value: `$${fob.toLocaleString()}` },
    { label: 'Exchange Rate', value: `PKR ${USD_PKR}/USD` },
    { label: `Age Depreciation (${depreciation * 100}%)`, value: `-PKR ${formatPKR(assessedValuePKR * depreciation)}` },
    { label: 'Assessed Value (PKR)', value: `PKR ${formatPKR(assessedValuePKR)}`, highlight: true },
    { label: `Customs Duty (${formatRate(customsDutyRate)})`, value: `PKR ${formatPKR(customsDuty)}` },
    { label: `Additional Customs (${formatRate(slab.additionalCustomsDuty)})`, value: `PKR ${formatPKR(additionalCustomsDuty)}` },
    ...(regulatoryDuty > 0 ? [{ label: 'Regulatory Duty (5%)', value: `PKR ${formatPKR(regulatoryDuty)}` }] : []),
    { label: `Sales Tax (${formatRate(slab.salesTax)})`, value: `PKR ${formatPKR(salesTax)}` },
    { label: `WHT (${formatRate(slab.wit)})`, value: `PKR ${formatPKR(wit)}` },
    { label: 'Total Duty & Taxes', value: `PKR ${formatPKR(totalDuty)}`, highlight: true },
    { label: '🏁 Total Landed Cost', value: `PKR ${formatPKR(totalLandedCost)}`, accent: true },
  ];

  return (
    <View>
      <Text style={s.sectionTitle}>🛳️ Import Duty Calculator</Text>
      <Text style={s.sectionSub}>Estimate customs duty for importing a car to Pakistan (FBR rates 2024)</Text>

      <Text style={s.fieldLabel}>FOB Price (USD)</Text>
      <View style={s.inputRow}>
        <Text style={s.inputPrefix}>$</Text>
        <TextInput
          style={s.input}
          value={fobUSD}
          onChangeText={v => setFobUSD(v.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 15000"
          placeholderTextColor={COLORS.gray3}
          keyboardType="numeric"
        />
      </View>
      {fobUSD ? <Text style={s.formatted}>≈ PKR {formatPKR(parseFloat(fobUSD) * USD_PKR)}</Text> : null}

      <Text style={s.fieldLabel}>Engine Capacity (cc)</Text>
      <View style={s.chipRow}>
        {['660', '800', '1000', '1300', '1500', '1800', '2000', '2500', '3000'].map(v => (
          <TouchableOpacity key={v} style={[s.chip, cc === v && s.chipActive]} onPress={() => setCc(v)}>
            <Text style={[s.chipText, cc === v && { color: COLORS.primary }]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={s.input} value={cc} onChangeText={v => setCc(v.replace(/[^0-9]/g, ''))} placeholder="Custom cc" placeholderTextColor={COLORS.gray3} keyboardType="numeric" />

      <Text style={s.fieldLabel}>Age of Vehicle</Text>
      <View style={s.chipRow}>
        {[0, 1, 2, 3, 4, 5].map(y => (
          <TouchableOpacity key={y} style={[s.chip, ageYears === y && s.chipActive]} onPress={() => setAgeYears(y)}>
            <Text style={[s.chipText, ageYears === y && { color: COLORS.primary }]}>{y === 0 ? 'New' : `${y}yr`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.toggleRow}>
        <View>
          <Text style={s.fieldLabel}>Hybrid Vehicle</Text>
          <Text style={{ fontSize: 10, color: COLORS.gray3 }}>10% duty reduction on hybrids ≤1800cc</Text>
        </View>
        <Switch value={isHybrid} onValueChange={setIsHybrid} trackColor={{ true: COLORS.primary }} thumbColor="#fff" />
      </View>

      {fob > 0 && ccNum > 0 && (
        <>
          <View style={s.resultCard}>
            <Text style={s.resultLabel}>Total Duty & Taxes</Text>
            <Text style={s.resultMain}>PKR {formatPKR(totalDuty)}</Text>
            <View style={s.divider} />
            <Text style={s.resultLabel}>Total Landed Cost</Text>
            <Text style={[s.resultMain, { color: COLORS.primary, fontSize: 24 }]}>PKR {formatPKR(totalLandedCost)}</Text>
          </View>

          <TouchableOpacity style={s.breakdownToggle} onPress={() => setShowBreakdown(!showBreakdown)}>
            <Text style={s.breakdownToggleText}>{showBreakdown ? '▲ Hide' : '▼ Show'} full breakdown</Text>
          </TouchableOpacity>

          {showBreakdown && (
            <View style={s.breakdownCard}>
              {breakdown.map((row, i) => (
                <View key={i} style={[s.breakdownRow, (row as any).highlight && { backgroundColor: COLORS.bgElevated }]}>
                  <Text style={[s.breakdownKey, (row as any).accent && { color: COLORS.primary, fontWeight: '700' }]}>{row.label}</Text>
                  <Text style={[s.breakdownVal, (row as any).accent && { color: COLORS.primary, fontWeight: '800' }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.disclaimer}>
            ⚠️ These are estimates based on standard FBR rates. Actual duty may vary. Consult a licensed customs agent before importing.
          </Text>
        </>
      )}
    </View>
  );
}

// ── Token Tax Calculator ──────────────────────────────────────
function TokenTaxCalculator() {
  const [price, setPrice] = useState('');
  const [cc, setCc] = useState('1300');
  const [province, setProvince] = useState('Punjab (Lahore, Faisalabad, etc.)');
  const [regYear, setRegYear] = useState(new Date().getFullYear());
  const [showBreakdown, setShowBreakdown] = useState(false);

  const vehicleValue = parseFloat(price) || 0;
  const ccNum = parseInt(cc) || 0;
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - regYear;

  const rateInfo = TOKEN_TAX_RATES[province] || TOKEN_TAX_RATES['Punjab (Lahore, Faisalabad, etc.)'];
  const annualTokenTax = vehicleValue * rateInfo.rate;

  // Registration fee (one-time, rough estimate)
  const ccSlab = ccNum <= 1000 ? 1 : ccNum <= 1300 ? 2 : ccNum <= 1600 ? 3 : ccNum <= 2000 ? 4 : 5;
  const regFees = [0, 8000, 12000, 18000, 25000, 35000][ccSlab];
  const numberPlateFee = 3000;
  const totalFirstYear = annualTokenTax + regFees + numberPlateFee;

  const breakdown = [
    { label: 'Vehicle Value', value: `PKR ${formatPKR(vehicleValue)}` },
    { label: `Token Tax Rate (${province.split(' ')[0]})`, value: `${(rateInfo.rate * 100).toFixed(2)}% per year` },
    { label: 'Annual Token Tax', value: `PKR ${formatPKR(annualTokenTax)}`, highlight: true },
    { label: 'Registration Fee (one-time)', value: `PKR ${formatPKR(regFees)}` },
    { label: 'Number Plate Fee (one-time)', value: `PKR ${formatPKR(numberPlateFee)}` },
    { label: 'Total First-Year Cost', value: `PKR ${formatPKR(totalFirstYear)}`, accent: true },
    { label: 'Ongoing Annual Cost', value: `PKR ${formatPKR(annualTokenTax)}/year` },
  ];

  const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <View style={{ marginTop: SPACING.xxl }}>
      <Text style={s.sectionTitle}>🏷️ Token Tax Calculator</Text>
      <Text style={s.sectionSub}>Estimate annual token tax and registration costs in Pakistan</Text>

      <Text style={s.fieldLabel}>Vehicle Value (PKR)</Text>
      <View style={s.inputRow}>
        <Text style={s.inputPrefix}>PKR</Text>
        <TextInput
          style={s.input}
          value={price}
          onChangeText={v => setPrice(v.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 6500000"
          placeholderTextColor={COLORS.gray3}
          keyboardType="numeric"
        />
      </View>
      {price ? <Text style={s.formatted}>= {formatPKR(parseFloat(price))}</Text> : null}

      <Text style={s.fieldLabel}>Engine CC</Text>
      <View style={s.chipRow}>
        {['660', '1000', '1300', '1500', '1800', '2000'].map(v => (
          <TouchableOpacity key={v} style={[s.chip, cc === v && s.chipActive]} onPress={() => setCc(v)}>
            <Text style={[s.chipText, cc === v && { color: COLORS.primary }]}>{v}cc</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.fieldLabel}>Province / Registration City</Text>
      {Object.keys(TOKEN_TAX_RATES).map(prov => (
        <TouchableOpacity
          key={prov}
          style={[s.provinceRow, province === prov && s.provinceRowActive]}
          onPress={() => setProvince(prov)}
        >
          <Text style={[s.provinceText, province === prov && { color: COLORS.primary }]}>{prov}</Text>
          {province === prov && <Text style={{ color: COLORS.primary, fontSize: 12 }}>✓</Text>}
        </TouchableOpacity>
      ))}

      <Text style={s.fieldLabel}>Registration Year</Text>
      <View style={s.chipRow}>
        {YEARS.slice(0, 6).map(y => (
          <TouchableOpacity key={y} style={[s.chip, regYear === y && s.chipActive]} onPress={() => setRegYear(y)}>
            <Text style={[s.chipText, regYear === y && { color: COLORS.primary }]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {vehicleValue > 0 && (
        <>
          <View style={s.resultCard}>
            <Text style={s.resultLabel}>Annual Token Tax</Text>
            <Text style={s.resultMain}>PKR {formatPKR(annualTokenTax)}/year</Text>
            <View style={s.divider} />
            <Text style={s.resultLabel}>First Year Total (incl. registration)</Text>
            <Text style={[s.resultMain, { color: COLORS.primary, fontSize: 22 }]}>PKR {formatPKR(totalFirstYear)}</Text>
          </View>

          <TouchableOpacity style={s.breakdownToggle} onPress={() => setShowBreakdown(!showBreakdown)}>
            <Text style={s.breakdownToggleText}>{showBreakdown ? '▲ Hide' : '▼ Show'} breakdown</Text>
          </TouchableOpacity>

          {showBreakdown && (
            <View style={s.breakdownCard}>
              {breakdown.map((row, i) => (
                <View key={i} style={[s.breakdownRow, (row as any).highlight && { backgroundColor: COLORS.bgElevated }]}>
                  <Text style={[s.breakdownKey, (row as any).accent && { color: COLORS.primary, fontWeight: '700' }]}>{row.label}</Text>
                  <Text style={[s.breakdownVal, (row as any).accent && { color: COLORS.primary, fontWeight: '800' }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.disclaimer}>
            ⚠️ Rates are approximate based on provincial schedules. Always verify with your local Excise & Taxation office.
          </Text>
        </>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function CalculatorsScreen() {
  const [activeTab, setActiveTab] = useState<'import' | 'token'>('import');

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Pakistan Car Calculators</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabs}>
        {([['import', '🛳️ Import Duty'], ['token', '🏷️ Token Tax']] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[s.tab, activeTab === id && s.tabActive]}
            onPress={() => setActiveTab(id)}
          >
            <Text style={[s.tabText, activeTab === id && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}>
        {activeTab === 'import' ? <ImportDutyCalculator /> : <TokenTaxCalculator />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray3 },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: COLORS.gray3, marginBottom: SPACING.lg, lineHeight: 18 },
  fieldLabel: { fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 8, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  inputPrefix: { paddingHorizontal: 12, paddingVertical: 13, color: COLORS.gray3, fontSize: 13, borderRightWidth: 1, borderRightColor: COLORS.border, justifyContent: 'center' },
  input: { flex: 1, padding: 12, color: COLORS.white, fontSize: 16, fontWeight: '700' },
  formatted: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  chipText: { fontSize: 11, color: COLORS.gray2, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginTop: SPACING.md },
  provinceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: COLORS.bgElevated, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6 },
  provinceRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  provinceText: { fontSize: 12, color: COLORS.gray2, fontWeight: '600' },
  resultCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.xl },
  resultLabel: { fontSize: 12, color: COLORS.gray2, marginBottom: 4 },
  resultMain: { fontSize: 26, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  breakdownToggle: { marginTop: 10, alignItems: 'center' },
  breakdownToggleText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  breakdownCard: { backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 8, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  breakdownKey: { fontSize: 11, color: COLORS.gray2, flex: 1, marginRight: 8 },
  breakdownVal: { fontSize: 11, color: COLORS.white, fontWeight: '600', textAlign: 'right' },
  disclaimer: { fontSize: 10, color: COLORS.gray3, marginTop: 12, lineHeight: 16, textAlign: 'center' },
});
