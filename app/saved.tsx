// mobile/app/saved.tsx
import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { COLORS, SPACING, formatPKR, formatRelativeTime } from '../constants/theme';

export default function SavedScreen() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saved-listings'],
    queryFn: () => api.get('/users/me/saved').then(r => r.data),
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (vehicleId: string) => api.post(`/users/me/saved/${vehicleId}`),
    onSuccess: () => qc.invalidateQueries(['saved-listings']),
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
          <Text style={s.title}>Saved Vehicles</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.empty}>
          <Text style={{ fontSize: 48 }}>♥</Text>
          <Text style={s.emptyTitle}>Sign in to see saved vehicles</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const listings = data?.data || [];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.title}>Saved Vehicles ({listings.length})</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
        contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push(`/listing/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={s.cardImg}>
              {item.image && <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
              <View style={s.cardImgOverlay} />
              <TouchableOpacity
                style={s.unsaveBtn}
                onPress={() => {
                  Alert.alert('Remove from saved?', '', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item.id) },
                  ]);
                }}
              >
                <Text style={{ fontSize: 16, color: COLORS.red }}>♥</Text>
              </TouchableOpacity>
              <View style={s.cardPriceRow}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
                <Text style={s.cardPrice}>PKR {formatPKR(item.price)}</Text>
              </View>
            </View>
            <View style={s.cardBody}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[`${Math.round((item.mileage || 0) / 1000)}k km`, item.city, item.transmission].filter(Boolean).map(tag => (
                  <View key={tag} style={s.tag}><Text style={s.tagText}>{tag}</Text></View>
                ))}
              </View>
              <Text style={s.savedDate}>Saved {formatRelativeTime(item.saved_at)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>♡</Text>
              <Text style={s.emptyTitle}>No saved vehicles yet</Text>
              <Text style={{ fontSize: 13, color: COLORS.gray3, marginBottom: 24 }}>Tap ♡ on any listing to save it here</Text>
              <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(tabs)/search')}>
                <Text style={s.loginBtnText}>Browse Listings</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImg: { height: 150, position: 'relative' },
  cardImgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  unsaveBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  cardPriceRow: { position: 'absolute', bottom: 8, left: 10, right: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardPrice: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  cardBody: { padding: 10 },
  tag: { paddingHorizontal: 7, paddingVertical: 3, backgroundColor: COLORS.bgElevated, borderRadius: 6 },
  tagText: { fontSize: 10, color: COLORS.gray2 },
  savedDate: { fontSize: 10, color: COLORS.gray3, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  loginBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
