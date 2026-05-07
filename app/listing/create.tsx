// mobile/app/listing/create.tsx
// Full 5-step sell wizard with real API integration
import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
  FlatList, Switch, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { vehiclesApi, aiApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, RADIUS, formatPKR, calculateEMI } from '../../constants/theme';
import { PAKISTAN_CITIES, VEHICLE_MAKES, FUEL_OPTIONS, TRANSMISSION_OPTIONS, BODY_TYPES } from '../../constants/theme';

const STEPS = [
  { id: 'type',    label: 'Type',    icon: '🚗' },
  { id: 'details', label: 'Details', icon: '📋' },
  { id: 'photos',  label: 'Photos',  icon: '📸' },
  { id: 'price',   label: 'Price',   icon: '💰' },
  { id: 'review',  label: 'Review',  icon: '✅' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

const VEHICLE_TYPES = [
  { id: 'car',         icon: '🚗', label: 'Car',         sub: 'Sedan, SUV, Hatchback...' },
  { id: 'bike',        icon: '🏍️', label: 'Bike',        sub: 'Motorcycle, Scooter' },
  { id: 'auto_part',   icon: '⚙️', label: 'Auto Part',   sub: 'OEM & Aftermarket' },
  { id: 'number_plate',icon: '🏷️', label: 'Number Plate',sub: 'Custom & Fancy' },
];

const BOOST_PACKAGES = [
  { id: '3day',  label: '3 Days',  price: 500,  popular: false },
  { id: '7day',  label: '7 Days',  price: 999,  popular: true  },
  { id: '30day', label: '30 Days', price: 2999, popular: false },
];

const COLORS_LIST = ['White', 'Silver', 'Black', 'Red', 'Blue', 'Grey', 'Maroon', 'Golden', 'Green', 'Brown', 'Other'];

interface FormData {
  vehicle_type: string;
  make: string; model: string; variant: string;
  year: number; color: string; body_type: string;
  fuel_type: string; transmission: string; assembly: string;
  engine_capacity: string; mileage: string;
  registered_city: string; city: string;
  features: string[]; description: string;
  price: string; price_negotiable: boolean;
  photos: Array<{ uri: string; base64?: string }>;
  boost_package: string | null;
}

export default function CreateListingScreen() {
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    vehicle_type: 'car', make: '', model: '', variant: '',
    year: CURRENT_YEAR - 1, color: 'White', body_type: '',
    fuel_type: 'petrol', transmission: 'automatic', assembly: 'local',
    engine_capacity: '', mileage: '', registered_city: '', city: '',
    features: [], description: '',
    price: '', price_negotiable: true,
    photos: [], boost_package: null,
  });
  const [aiPrice, setAiPrice] = useState<any>(null);
  const [aiTitle, setAiTitle] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const update = useCallback((key: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [key]: value })), []);

  const toggleFeature = (f: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f)
        ? prev.features.filter(x => x !== f)
        : [...prev.features, f],
    }));
  };

  // ── AI Price Estimate ────────────────────────────────────
  const fetchAiPrice = async () => {
    if (!form.make || !form.model) {
      Alert.alert('', 'Enter make and model first'); return;
    }
    setAiLoading(true);
    try {
      const { data } = await aiApi.estimatePrice({
        make: form.make, model: form.model, variant: form.variant,
        year: form.year, mileage: parseInt(form.mileage) || 0,
        city: form.city || 'Lahore', condition: 'used',
      });
      setAiPrice(data);
    } catch { Alert.alert('AI Error', 'Could not estimate price. Please try manually.'); }
    finally { setAiLoading(false); }
  };

  // ── AI Description ────────────────────────────────────────
  const fetchAiDescription = async () => {
    setAiLoading(true);
    try {
      const { data } = await aiApi.generateDescription({
        make: form.make, model: form.model, variant: form.variant,
        year: form.year, mileage: parseInt(form.mileage) || 0,
        color: form.color, features: form.features,
        condition: 'used', city: form.city, language: 'en',
      });
      update('description', data);
    } catch { Alert.alert('AI Error', 'Could not generate description.'); }
    finally { setAiLoading(false); }
  };

  // ── Pick Photos ──────────────────────────────────────────
  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload vehicle images'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 20 - form.photos.length,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map(a => ({ uri: a.uri }));
      update('photos', [...form.photos, ...newPhotos].slice(0, 20));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled) {
      update('photos', [...form.photos, { uri: result.assets[0].uri }].slice(0, 20));
    }
  };

  // ── Submit Listing ────────────────────────────────────────
  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        vehicle_type: form.vehicle_type,
        title: `${form.year} ${form.make} ${form.model}${form.variant ? ' ' + form.variant : ''}`,
        make: form.make, model: form.model, variant: form.variant || undefined,
        year: form.year, color: form.color,
        body_type: form.body_type || undefined,
        fuel_type: form.fuel_type, transmission: form.transmission,
        assembly: form.assembly, condition_type: 'used',
        engine_capacity: form.engine_capacity ? parseInt(form.engine_capacity) : undefined,
        mileage: form.mileage ? parseInt(form.mileage) : undefined,
        registered_city: form.registered_city || form.city,
        price: parseFloat(form.price),
        price_negotiable: form.price_negotiable,
        city: form.city,
        features: form.features,
        description: form.description || undefined,
      };

      const { data: vehicle } = await vehiclesApi.create(payload);
      setCreatedId(vehicle.id);

      // Upload photos if any
      if (form.photos.length > 0) {
        const formData = new FormData();
        form.photos.forEach((photo, i) => {
          formData.append('images', {
            uri: photo.uri,
            name: `photo_${i}.jpg`,
            type: 'image/jpeg',
          } as any);
        });
        await vehiclesApi.uploadImages(vehicle.id, formData);
      }

      // Go to success
      Alert.alert(
        '🎉 Listing Submitted!',
        'Your listing is under review and will go live within 1 hour.',
        [{ text: 'View Listing', onPress: () => router.replace(`/listing/${vehicle.id}`) },
         { text: 'Go Home', onPress: () => router.replace('/(tabs)/') }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!form.vehicle_type;
    if (step === 1) return !!(form.make && form.model && form.city);
    if (step === 2) return true; // photos optional but encouraged
    if (step === 3) return !!(form.price && parseFloat(form.price) > 0);
    return true;
  };

  const stepProgress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => step === 0 ? router.back() : setStep(s2 => s2 - 1)}>
            <Text style={s.headerBack}>{step === 0 ? '✕' : '←'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Post Vehicle</Text>
          <Text style={s.headerStep}>{step + 1}/{STEPS.length}</Text>
        </View>

        {/* Progress */}
        <View style={s.progressRow}>
          {STEPS.map((st, i) => (
            <View key={st.id} style={s.progressItem}>
              <View style={[s.progressDot,
                i < step && s.progressDotDone,
                i === step && s.progressDotActive,
              ]}>
                {i < step
                  ? <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>✓</Text>
                  : <Text style={{ fontSize: 10 }}>{st.icon}</Text>}
              </View>
              <Text style={[s.progressLabel, i === step && { color: COLORS.primary }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.body}>

            {/* ── STEP 0: Vehicle Type ── */}
            {step === 0 && (
              <>
                <Text style={s.stepTitle}>What are you selling?</Text>
                <Text style={s.stepSub}>Select the type of vehicle to continue</Text>
                <View style={s.typeGrid}>
                  {VEHICLE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[s.typeCard, form.vehicle_type === t.id && s.typeCardActive]}
                      onPress={() => update('vehicle_type', t.id)}
                    >
                      <Text style={s.typeIcon}>{t.icon}</Text>
                      <Text style={[s.typeLabel, form.vehicle_type === t.id && { color: COLORS.primary }]}>{t.label}</Text>
                      <Text style={s.typeSub}>{t.sub}</Text>
                      {form.vehicle_type === t.id && <View style={s.typeCheck}><Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>✓</Text></View>}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── STEP 1: Vehicle Details ── */}
            {step === 1 && (
              <>
                <Text style={s.stepTitle}>Vehicle Details</Text>

                {/* AI OCR Autofill */}
                <TouchableOpacity style={s.aiAutofill}>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>📷</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>AI Auto-Fill</Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray2 }}>Scan registration book to fill details</Text>
                  </View>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Scan →</Text>
                </TouchableOpacity>

                {/* Make */}
                <Text style={s.fieldLabel}>Make *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                    {VEHICLE_MAKES.popular.map(m => (
                      <TouchableOpacity
                        key={m.name}
                        style={[s.makeChip, form.make === m.name && s.makeChipActive]}
                        onPress={() => { update('make', m.name); update('model', ''); }}
                      >
                        <Text style={[s.makeChipText, form.make === m.name && { color: COLORS.primary }]}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={s.input}
                  value={form.make}
                  onChangeText={v => update('make', v)}
                  placeholder="Or type make name..."
                  placeholderTextColor={COLORS.gray3}
                />

                {/* Model - shows popular models for selected make */}
                <Text style={s.fieldLabel}>Model *</Text>
                {form.make && VEHICLE_MAKES.popular.find(m => m.name === form.make) && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                      {VEHICLE_MAKES.popular.find(m => m.name === form.make)?.models.map(model => (
                        <TouchableOpacity
                          key={model}
                          style={[s.makeChip, form.model === model && s.makeChipActive]}
                          onPress={() => update('model', model)}
                        >
                          <Text style={[s.makeChipText, form.model === model && { color: COLORS.primary }]}>{model}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                <TextInput
                  style={s.input}
                  value={form.model}
                  onChangeText={v => update('model', v)}
                  placeholder="Corolla, Civic, Alto..."
                  placeholderTextColor={COLORS.gray3}
                />

                {/* Variant */}
                <Text style={s.fieldLabel}>Variant</Text>
                <TextInput style={s.input} value={form.variant} onChangeText={v => update('variant', v)} placeholder="GLI, Altis, 1.8L..." placeholderTextColor={COLORS.gray3} />

                {/* Year + Mileage in a row */}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>Year *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {YEARS.slice(0, 8).map(y => (
                          <TouchableOpacity key={y} style={[s.yearChip, form.year === y && s.yearChipActive]} onPress={() => update('year', y)}>
                            <Text style={[s.yearChipText, form.year === y && { color: COLORS.primary }]}>{y}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>Mileage (km)</Text>
                    <TextInput style={s.input} value={form.mileage} onChangeText={v => update('mileage', v)} placeholder="e.g. 45000" placeholderTextColor={COLORS.gray3} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>Engine CC</Text>
                    <TextInput style={s.input} value={form.engine_capacity} onChangeText={v => update('engine_capacity', v)} placeholder="1300, 1800..." placeholderTextColor={COLORS.gray3} keyboardType="numeric" />
                  </View>
                </View>

                {/* Transmission */}
                <Text style={s.fieldLabel}>Transmission</Text>
                <View style={s.chipRow}>
                  {TRANSMISSION_OPTIONS.map(t => (
                    <TouchableOpacity key={t.value} style={[s.selectChip, form.transmission === t.value && s.selectChipActive]} onPress={() => update('transmission', t.value)}>
                      <Text style={[s.selectChipText, form.transmission === t.value && { color: COLORS.primary }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Fuel */}
                <Text style={s.fieldLabel}>Fuel Type</Text>
                <View style={s.chipRow}>
                  {FUEL_OPTIONS.map(f => (
                    <TouchableOpacity key={f.value} style={[s.selectChip, form.fuel_type === f.value && s.selectChipActive]} onPress={() => update('fuel_type', f.value)}>
                      <Text style={[s.selectChipText, form.fuel_type === f.value && { color: COLORS.primary }]}>{f.icon} {f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Assembly */}
                <Text style={s.fieldLabel}>Assembly</Text>
                <View style={s.chipRow}>
                  {[{ value: 'local', label: '🇵🇰 Local' }, { value: 'imported', label: '🌍 Imported' }].map(a => (
                    <TouchableOpacity key={a.value} style={[s.selectChip, form.assembly === a.value && s.selectChipActive]} onPress={() => update('assembly', a.value)}>
                      <Text style={[s.selectChipText, form.assembly === a.value && { color: COLORS.primary }]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Color */}
                <Text style={s.fieldLabel}>Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {COLORS_LIST.map(c => (
                      <TouchableOpacity key={c} style={[s.makeChip, form.color === c && s.makeChipActive]} onPress={() => update('color', c)}>
                        <Text style={[s.makeChipText, form.color === c && { color: COLORS.primary }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* City */}
                <Text style={s.fieldLabel}>City *</Text>
                <View style={s.chipRow}>
                  {PAKISTAN_CITIES.filter(c => c.major).map(c => (
                    <TouchableOpacity key={c.name} style={[s.selectChip, form.city === c.name && s.selectChipActive]} onPress={() => update('city', c.name)}>
                      <Text style={[s.selectChipText, form.city === c.name && { color: COLORS.primary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Features */}
                <Text style={s.fieldLabel}>Features</Text>
                <View style={s.chipRow}>
                  {['Sunroof', 'Leather Seats', 'Android Auto', 'Reverse Camera', 'Push Start',
                    'Alloy Wheels', 'Keyless Entry', 'Cruise Control', 'Heated Seats', 'Parking Sensors'].map(f => (
                    <TouchableOpacity key={f} style={[s.selectChip, form.features.includes(f) && s.selectChipActive]} onPress={() => toggleFeature(f)}>
                      <Text style={[s.selectChipText, form.features.includes(f) && { color: COLORS.primary }]}>
                        {form.features.includes(f) ? '✓ ' : ''}{f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── STEP 2: Photos ── */}
            {step === 2 && (
              <>
                <Text style={s.stepTitle}>Add Photos</Text>
                <Text style={s.stepSub}>Up to 20 photos · First photo is cover · Listings with 8+ photos sell 3× faster</Text>

                <View style={s.photoGrid}>
                  {/* Upload buttons */}
                  <TouchableOpacity style={[s.photoSlot, s.photoSlotAdd]} onPress={pickPhotos}>
                    <Text style={{ fontSize: 28, color: COLORS.primary }}>🖼️</Text>
                    <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 }}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.photoSlot, s.photoSlotAdd]} onPress={takePhoto}>
                    <Text style={{ fontSize: 28, color: COLORS.gray2 }}>📷</Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray2, fontWeight: '600', marginTop: 4 }}>Camera</Text>
                  </TouchableOpacity>

                  {form.photos.map((photo, i) => (
                    <View key={i} style={s.photoSlot}>
                      <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      {i === 0 && (
                        <View style={s.coverBadge}><Text style={{ fontSize: 9, fontWeight: '800', color: '#000' }}>COVER</Text></View>
                      )}
                      <TouchableOpacity
                        style={s.removePhoto}
                        onPress={() => update('photos', form.photos.filter((_, j) => j !== i))}
                      >
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '800' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <Text style={s.photoCount}>{form.photos.length}/20 photos added</Text>

                <View style={s.photoTips}>
                  <Text style={s.photoTipsTitle}>📸 Tips for faster sales</Text>
                  {['Front, rear and both sides in daylight', 'Interior: seats, dashboard, odometer', 'Engine bay and boot space', 'Any damage or scratches (builds trust!)'].map(tip => (
                    <Text key={tip} style={s.photoTip}>✓ {tip}</Text>
                  ))}
                </View>
              </>
            )}

            {/* ── STEP 3: Price ── */}
            {step === 3 && (
              <>
                <Text style={s.stepTitle}>Set Your Price</Text>
                <Text style={s.stepSub}>Competitive pricing gets 5× more contacts</Text>

                <Text style={s.fieldLabel}>Asking Price (PKR) *</Text>
                <View style={s.priceInputWrap}>
                  <View style={s.pricePrefix}><Text style={s.pricePrefixText}>PKR</Text></View>
                  <TextInput
                    style={s.priceInput}
                    value={form.price}
                    onChangeText={v => update('price', v.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 6500000"
                    placeholderTextColor={COLORS.gray3}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                {form.price.length > 4 && (
                  <Text style={s.priceFormatted}>= PKR {formatPKR(parseFloat(form.price))}</Text>
                )}

                <View style={s.negotiableRow}>
                  <View>
                    <Text style={s.fieldLabel}>Price Negotiable</Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray3 }}>Shown as "Negotiable" on listing</Text>
                  </View>
                  <Switch
                    value={form.price_negotiable}
                    onValueChange={v => update('price_negotiable', v)}
                    trackColor={{ true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {/* AI Price Estimate */}
                <View style={s.aiCard}>
                  <View style={s.aiCardHeader}>
                    <Text style={s.aiCardTitle}>✦ AI Price Estimate</Text>
                    {!aiPrice && (
                      <TouchableOpacity
                        style={s.aiEstimateBtn}
                        onPress={fetchAiPrice}
                        disabled={aiLoading}
                      >
                        {aiLoading
                          ? <ActivityIndicator color="#000" size="small" />
                          : <Text style={s.aiEstimateBtnText}>Estimate</Text>}
                      </TouchableOpacity>
                    )}
                  </View>

                  {aiLoading && !aiPrice && (
                    <Text style={{ fontSize: 12, color: COLORS.gray2 }}>Analyzing {form.make} {form.model} listings...</Text>
                  )}

                  {aiPrice && (
                    <>
                      <View style={s.aiPriceRow}>
                        {[
                          { label: 'MIN', value: aiPrice.min, highlight: false },
                          { label: '✦ SUGGESTED', value: aiPrice.suggested, highlight: true },
                          { label: 'MAX', value: aiPrice.max, highlight: false },
                        ].map(p => (
                          <View key={p.label} style={[s.aiPriceBox, p.highlight && s.aiPriceBoxHighlight]}>
                            <Text style={[s.aiPriceBoxLabel, p.highlight && { color: COLORS.primary }]}>{p.label}</Text>
                            <Text style={[s.aiPriceBoxValue, p.highlight && { color: COLORS.primary, fontSize: 15 }]}>
                              {formatPKR(p.value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View style={s.aiConfidence}>
                        <Text style={{ fontSize: 10, color: COLORS.gray3 }}>Confidence: {aiPrice.confidence}%</Text>
                        <TouchableOpacity onPress={() => update('price', String(aiPrice.suggested))}>
                          <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '700' }}>Use suggested →</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>

                {/* Description */}
                <Text style={s.fieldLabel}>Description</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                    value={form.description}
                    onChangeText={v => update('description', v)}
                    placeholder="Describe your vehicle's condition, history, and notable features..."
                    placeholderTextColor={COLORS.gray3}
                    multiline
                    maxLength={1000}
                  />
                  <TouchableOpacity style={s.aiDescBtn} onPress={fetchAiDescription} disabled={aiLoading}>
                    <Text style={{ fontSize: 9, color: COLORS.primary, fontWeight: '700' }}>✦ AI Write</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── STEP 4: Review ── */}
            {step === 4 && (
              <>
                <Text style={s.stepTitle}>Review & Publish</Text>
                <Text style={s.stepSub}>Goes live after moderation — usually under 1 hour</Text>

                {/* Summary */}
                <View style={s.summaryCard}>
                  {[
                    ['Vehicle', `${form.year} ${form.make} ${form.model}${form.variant ? ' ' + form.variant : ''}`],
                    ['Type', form.vehicle_type],
                    ['Mileage', form.mileage ? `${parseInt(form.mileage).toLocaleString()} km` : '—'],
                    ['Transmission', form.transmission],
                    ['Fuel', form.fuel_type],
                    ['Assembly', form.assembly],
                    ['Color', form.color],
                    ['City', form.city || '—'],
                    ['Photos', `${form.photos.length} uploaded`],
                    ['Price', form.price ? `PKR ${formatPKR(parseFloat(form.price))}${form.price_negotiable ? ' (Negotiable)' : ''}` : '—'],
                  ].map(([k, v]) => (
                    <View key={k as string} style={s.summaryRow}>
                      <Text style={s.summaryKey}>{k}</Text>
                      <Text style={s.summaryVal}>{v}</Text>
                    </View>
                  ))}
                </View>

                {/* Boost upsell */}
                <View style={s.boostCard}>
                  <Text style={s.boostTitle}>🚀 Boost Your Listing</Text>
                  <Text style={s.boostSub}>Get up to 10× more views with a featured spot</Text>
                  <View style={s.boostRow}>
                    {BOOST_PACKAGES.map(pkg => (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[s.boostPkg, form.boost_package === pkg.id && s.boostPkgActive, pkg.popular && s.boostPkgPopular]}
                        onPress={() => update('boost_package', form.boost_package === pkg.id ? null : pkg.id)}
                      >
                        {pkg.popular && <Text style={s.boostPopularLabel}>POPULAR</Text>}
                        <Text style={[s.boostPkgDays, form.boost_package === pkg.id && { color: COLORS.white }]}>{pkg.label}</Text>
                        <Text style={[s.boostPkgPrice, form.boost_package === pkg.id && { color: COLORS.primary }]}>PKR {pkg.price.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {form.boost_package && (
                    <Text style={{ fontSize: 11, color: COLORS.gray3, marginTop: 8 }}>
                      Payment via JazzCash / EasyPaisa after listing goes live
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.footerBtn, !canProceed() && s.footerBtnDisabled]}
            disabled={!canProceed() || submitting}
            onPress={step < STEPS.length - 1 ? () => setStep(s2 => s2 + 1) : submit}
          >
            {submitting
              ? <ActivityIndicator color="#000" />
              : <Text style={s.footerBtnText}>
                  {step === STEPS.length - 1 ? '🚀 Publish Listing' : `Continue → ${STEPS[step + 1]?.label}`}
                </Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBack: { color: COLORS.gray2, fontSize: 20, width: 32 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  headerStep: { fontSize: 12, color: COLORS.gray3, width: 32, textAlign: 'right' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  progressItem: { alignItems: 'center', gap: 4, flex: 1 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  progressDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressLabel: { fontSize: 9, color: COLORS.gray3, fontWeight: '600' },
  body: { padding: SPACING.lg },
  stepTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 6, letterSpacing: -0.5 },
  stepSub: { fontSize: 13, color: COLORS.gray2, marginBottom: SPACING.xl, lineHeight: 20 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: { width: '47%', backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, position: 'relative' },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  typeIcon: { fontSize: 32, marginBottom: 8 },
  typeLabel: { fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  typeSub: { fontSize: 11, color: COLORS.gray3 },
  typeCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  aiAutofill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFaint, borderWidth: 1, borderColor: COLORS.primary + '44', borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.lg },
  fieldLabel: { fontSize: 11, color: COLORS.gray2, fontWeight: '700', marginBottom: 6, marginTop: SPACING.md, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.white, fontSize: 14, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  makeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  makeChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  makeChipText: { fontSize: 12, color: COLORS.gray2, fontWeight: '600' },
  yearChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  yearChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  yearChipText: { fontSize: 12, color: COLORS.gray2, fontWeight: '700' },
  selectChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  selectChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  selectChipText: { fontSize: 11, color: COLORS.gray2, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  photoSlot: { width: '31%', aspectRatio: 1.2, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoSlotAdd: { backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  removePhoto: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  photoCount: { fontSize: 12, color: COLORS.gray3, marginBottom: 12 },
  photoTips: { backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  photoTipsTitle: { fontSize: 12, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  photoTip: { fontSize: 11, color: COLORS.gray2, marginBottom: 4 },
  priceInputWrap: { flexDirection: 'row', backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  pricePrefix: { paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: COLORS.border, justifyContent: 'center' },
  pricePrefixText: { fontSize: 13, color: COLORS.gray3, fontWeight: '600' },
  priceInput: { flex: 1, padding: 12, color: COLORS.white, fontSize: 18, fontWeight: '700' },
  priceFormatted: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginBottom: SPACING.md },
  negotiableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginVertical: SPACING.md },
  aiCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginVertical: SPACING.md },
  aiCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  aiEstimateBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  aiEstimateBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },
  aiPriceRow: { flexDirection: 'row', gap: 8 },
  aiPriceBox: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: 8, padding: 8, alignItems: 'center' },
  aiPriceBoxHighlight: { backgroundColor: COLORS.primaryFaint, borderWidth: 1, borderColor: COLORS.primary + '44' },
  aiPriceBoxLabel: { fontSize: 8, color: COLORS.gray3, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  aiPriceBoxValue: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  aiConfidence: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  aiDescBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: COLORS.primaryFaint, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary + '44' },
  summaryCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryKey: { fontSize: 12, color: COLORS.gray3 },
  summaryVal: { fontSize: 12, color: COLORS.white, fontWeight: '600', flex: 1, textAlign: 'right' },
  boostCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.purple + '44', padding: SPACING.md },
  boostTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  boostSub: { fontSize: 11, color: COLORS.gray2, marginBottom: SPACING.md },
  boostRow: { flexDirection: 'row', gap: 8 },
  boostPkg: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 10, alignItems: 'center' },
  boostPkgActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  boostPkgPopular: { borderColor: COLORS.purple },
  boostPopularLabel: { fontSize: 8, color: COLORS.purple, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  boostPkgDays: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  boostPkgPrice: { fontSize: 11, color: COLORS.gray3, fontWeight: '600' },
  footer: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  footerBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, alignItems: 'center' },
  footerBtnDisabled: { opacity: 0.45 },
  footerBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
