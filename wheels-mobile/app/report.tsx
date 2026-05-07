// mobile/app/report.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const REPORT_TYPES = [
  { value: 'fraud',        label: '🚨 Fraud / Scam',           desc: 'Fake listing, stolen vehicle, advance payment scam' },
  { value: 'misleading',   label: '⚠️ Misleading Info',         desc: 'Wrong specs, edited photos, hidden damage' },
  { value: 'spam',         label: '📢 Spam',                    desc: 'Duplicate listing, irrelevant content' },
  { value: 'inappropriate',label: '🚫 Inappropriate',           desc: 'Offensive content or language' },
  { value: 'other',        label: '💬 Other',                   desc: 'Something else not listed above' },
];

export default function ReportScreen() {
  const { vehicle_id, user_id } = useLocalSearchParams<{ vehicle_id?: string; user_id?: string }>();
  const { isAuthenticated } = useAuthStore();
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isAuthenticated) {
    router.replace('/(auth)/login');
    return null;
  }

  const handleSubmit = async () => {
    if (!reportType) { Alert.alert('', 'Please select a report type'); return; }
    if (description.trim().length < 10) { Alert.alert('', 'Please provide more detail (at least 10 characters)'); return; }
    setLoading(true);
    try {
      await api.post('/reports', {
        reported_vehicle_id: vehicle_id || undefined,
        reported_user_id: user_id || undefined,
        report_type: reportType,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch { Alert.alert('Error', 'Failed to submit report. Please try again.'); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>✅</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 8 }}>Report Submitted</Text>
          <Text style={{ fontSize: 13, color: COLORS.gray3, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
            Thank you for helping keep wheels.com.pk safe. Our team will review this report within 24 hours.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
          <Text style={s.title}>Report {vehicle_id ? 'Listing' : 'User'}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}>
          <Text style={s.sectionLabel}>Why are you reporting this?</Text>
          {REPORT_TYPES.map(rt => (
            <TouchableOpacity
              key={rt.value}
              style={[s.typeCard, reportType === rt.value && s.typeCardActive]}
              onPress={() => setReportType(rt.value)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.typeLabel, reportType === rt.value && { color: COLORS.primary }]}>{rt.label}</Text>
                <Text style={s.typeDesc}>{rt.desc}</Text>
              </View>
              {reportType === rt.value && <Text style={{ color: COLORS.primary, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}

          <Text style={[s.sectionLabel, { marginTop: SPACING.xl }]}>Additional details *</Text>
          <TextInput
            style={s.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail. Include any evidence or specific concerns..."
            placeholderTextColor={COLORS.gray3}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{description.length}/500</Text>

          <View style={s.warningBox}>
            <Text style={s.warningText}>⚠️ False reports may result in your account being restricted. Only report genuine issues.</Text>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, (!reportType || description.length < 10 || loading) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!reportType || description.length < 10 || loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={s.submitBtnText}>Submit Report</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  typeCard: { backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  typeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  typeDesc: { fontSize: 11, color: COLORS.gray3 },
  textArea: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, color: COLORS.white, fontSize: 14, minHeight: 110 },
  charCount: { fontSize: 10, color: COLORS.gray3, textAlign: 'right', marginTop: 4, marginBottom: SPACING.md },
  warningBox: { backgroundColor: COLORS.amber + '11', borderWidth: 1, borderColor: COLORS.amber + '44', borderRadius: 10, padding: 12, marginBottom: SPACING.xl },
  warningText: { fontSize: 11, color: COLORS.amber, lineHeight: 16 },
  submitBtn: { backgroundColor: COLORS.red, borderRadius: 14, padding: 15, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
