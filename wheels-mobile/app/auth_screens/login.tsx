// mobile/app/(auth)/login.tsx
import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countdown, setCountdown] = useState(0);
  const { sendOtp, verifyOtp, isLoading, error, clearError } = useAuthStore();
  const otpRef = useRef<TextInput>(null);

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    return digits.slice(0, 11);
  };

  const handleSendOtp = async () => {
    if (phone.length < 10) return Alert.alert('Error', 'Enter a valid Pakistani mobile number');
    clearError();
    try {
      await sendOtp(phone);
      setStep('otp');
      startCountdown();
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch { /* error shown from store */ }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return Alert.alert('Error', 'Enter the 6-digit OTP');
    clearError();
    try {
      const { isNewUser } = await verifyOtp(phone, otp);
      router.replace(isNewUser ? '/(auth)/onboarding' : '/(tabs)/');
    } catch { /* error shown from store */ }
  };

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
        <View style={s.inner}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={s.logo}>wheels<Text style={s.logoDot}>.com.pk</Text></Text>
            <Text style={s.tagline}>Pakistan's Smartest Auto Marketplace</Text>
          </View>

          {step === 'phone' ? (
            <>
              <Text style={s.title}>Welcome Back</Text>
              <Text style={s.subtitle}>Enter your Pakistan mobile number to continue</Text>

              <View style={s.inputWrap}>
                <View style={s.prefix}>
                  <Text style={s.prefixText}>🇵🇰 +92</Text>
                </View>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={t => setPhone(formatPhone(t))}
                  placeholder="3001234567"
                  placeholderTextColor={COLORS.gray3}
                  keyboardType="phone-pad"
                  maxLength={11}
                  autoFocus
                />
              </View>

              {error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity
                style={[s.btn, (isLoading || phone.length < 10) && s.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading || phone.length < 10}
              >
                {isLoading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={s.btnText}>Send OTP →</Text>}
              </TouchableOpacity>

              <Text style={s.terms}>
                By continuing, you agree to our{' '}
                <Text style={s.link} onPress={() => router.push('/terms')}>Terms</Text>
                {' & '}
                <Text style={s.link} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={s.title}>Enter OTP</Text>
              <Text style={s.subtitle}>We sent a 6-digit code to{'\n'}+92{phone.replace(/^0/, '')}</Text>

              <TextInput
                ref={otpRef}
                style={[s.otpInput]}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                placeholderTextColor={COLORS.gray3}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                letterSpacing={16}
              />

              {error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity
                style={[s.btn, (isLoading || otp.length !== 6) && s.btnDisabled]}
                onPress={handleVerify}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={s.btnText}>Verify & Login</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.resend}
                onPress={countdown === 0 ? handleSendOtp : undefined}
                disabled={countdown > 0}
              >
                <Text style={[s.resendText, countdown > 0 && { color: COLORS.gray3 }]}>
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); clearError(); }}>
                <Text style={s.changeNum}>← Wrong number?</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  kav: { flex: 1 },
  inner: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 32, fontWeight: '900', color: COLORS.white, letterSpacing: -1 },
  logoDot: { color: COLORS.primary },
  tagline: { fontSize: 13, color: COLORS.gray3, marginTop: 6 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.gray2, marginBottom: 28, lineHeight: 22 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    marginBottom: 16,
  },
  prefix: { paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: COLORS.border },
  prefixText: { color: COLORS.gray2, fontSize: 14 },
  input: {
    flex: 1, padding: 14, color: COLORS.white,
    fontSize: 16, fontWeight: '600', letterSpacing: 1,
  },
  otpInput: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: 16,
    color: COLORS.white, fontSize: 28,
    fontWeight: '800', marginBottom: 24,
  },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  resend: { alignItems: 'center', marginBottom: 16 },
  resendText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  changeNum: { color: COLORS.gray2, fontSize: 13, textAlign: 'center' },
  terms: { fontSize: 11, color: COLORS.gray3, textAlign: 'center', lineHeight: 18 },
  link: { color: COLORS.primary },
});
