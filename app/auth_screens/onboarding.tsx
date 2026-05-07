// mobile/app/(auth)/onboarding.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { PAKISTAN_CITIES } from '../../constants/theme';

const STEPS = ['name', 'city', 'role'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller' | 'dealer'>('buyer');

  const handleNext = async () => {
    if (step === 'name') {
      if (name.trim().length < 3) {
        Alert.alert('', 'Please enter your full name (at least 3 characters)');
        return;
      }
      setStep('city');
    } else if (step === 'city') {
      if (!city) {
        Alert.alert('', 'Please select your city');
        return;
      }
      setStep('role');
    } else {
      // Final step — save and enter app
      try {
        await updateProfile({ full_name: name.trim(), city, role });
        router.replace('/(tabs)/');
      } catch {
        Alert.alert('Error', 'Could not save profile. Please try again.');
      }
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.logoRow}>
            <Text style={s.logo}>wheels<Text style={{ color: COLORS.primary }}>.com.pk</Text></Text>
          </View>

          {/* Progress bar */}
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressLabel}>Step {stepIndex + 1} of {STEPS.length}</Text>

          {/* Step: Name */}
          {step === 'name' && (
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>What's your name?</Text>
              <Text style={s.stepSub}>This is shown to buyers and sellers you deal with</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ahmed Raza"
                placeholderTextColor={COLORS.gray3}
                autoFocus
                autoCapitalize="words"
                maxLength={60}
              />
            </View>
          )}

          {/* Step: City */}
          {step === 'city' && (
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>Which city are you in?</Text>
              <Text style={s.stepSub}>We'll show you relevant listings near you</Text>
              <View style={s.cityGrid}>
                {PAKISTAN_CITIES.filter(c => c.major).map(c => (
                  <TouchableOpacity
                    key={c.name}
                    style={[s.cityChip, city === c.name && s.cityChipActive]}
                    onPress={() => setCity(c.name)}
                  >
                    <Text style={[s.cityChipText, city === c.name && s.cityChipTextActive]}>
                      {c.name}
                    </Text>
                    {city === c.name && <Text style={s.cityCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step: Role */}
          {step === 'role' && (
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>How will you use wheels.com.pk?</Text>
              <Text style={s.stepSub}>You can always change this later</Text>
              <View style={s.roleGrid}>
                {[
                  { id: 'buyer', icon: '🔍', title: 'Buyer', sub: 'I want to find and buy vehicles' },
                  { id: 'seller', icon: '🚗', title: 'Seller', sub: 'I want to sell my own vehicle(s)' },
                  { id: 'dealer', icon: '🏪', title: 'Dealer', sub: 'I run a car dealership business' },
                ].map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[s.roleCard, role === r.id && s.roleCardActive]}
                    onPress={() => setRole(r.id as typeof role)}
                  >
                    <Text style={s.roleIcon}>{r.icon}</Text>
                    <Text style={[s.roleTitle, role === r.id && { color: COLORS.primary }]}>{r.title}</Text>
                    <Text style={s.roleSub}>{r.sub}</Text>
                    {role === r.id && (
                      <View style={s.roleCheck}><Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>✓</Text></View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[s.btn, isLoading && s.btnDisabled]}
            onPress={handleNext}
            disabled={isLoading}
          >
            <Text style={s.btnText}>
              {step === 'role' ? (isLoading ? 'Saving...' : '🚀 Enter wheels.com.pk') : 'Continue →'}
            </Text>
          </TouchableOpacity>

          {step !== 'name' && (
            <TouchableOpacity onPress={() => setStep(STEPS[stepIndex - 1])}>
              <Text style={s.back}>← Back</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { padding: SPACING.xl, paddingTop: SPACING.xxl },
  logoRow: { alignItems: 'center', marginBottom: SPACING.xxl },
  logo: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: -1 },
  progressBg: { height: 4, backgroundColor: COLORS.gray4, borderRadius: 99, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 99, transition: 'width 0.3s' },
  progressLabel: { fontSize: 11, color: COLORS.gray3, textAlign: 'right', marginBottom: SPACING.xl },
  stepContent: { marginBottom: SPACING.xxl },
  stepTitle: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginBottom: 8, letterSpacing: -0.5 },
  stepSub: { fontSize: 13, color: COLORS.gray2, marginBottom: SPACING.xl, lineHeight: 20 },
  input: {
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, padding: SPACING.md, color: COLORS.white,
    fontSize: 17, fontWeight: '600',
  },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cityChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99,
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  cityChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  cityChipText: { fontSize: 13, color: COLORS.gray2, fontWeight: '600' },
  cityChipTextActive: { color: COLORS.primary },
  cityCheck: { fontSize: 12, color: COLORS.primary, fontWeight: '800' },
  roleGrid: { gap: 12 },
  roleCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.lg, position: 'relative',
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  roleIcon: { fontSize: 28, marginBottom: 8 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  roleSub: { fontSize: 12, color: COLORS.gray3 },
  roleCheck: {
    position: 'absolute', top: 12, right: 12,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  back: { color: COLORS.gray2, fontSize: 13, textAlign: 'center' },
});
