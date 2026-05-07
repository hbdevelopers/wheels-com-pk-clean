// mobile/app/(tabs)/chats.tsx
import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, formatRelativeTime, formatPKR } from '../../constants/theme';

export default function ChatsScreen() {
  const { user, isAuthenticated } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatApi.getChats().then(r => r.data.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.empty}>
          <Text style={{ fontSize: 48 }}>💬</Text>
          <Text style={s.emptyTitle}>Sign in to see messages</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/auction')}>
          <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>🔨 Auctions</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data || []}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.chatRow}
            onPress={() => router.push(`/chat/${item.id}`)}
            activeOpacity={0.8}
          >
            {/* Avatar */}
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(item.other_user_name || '?').slice(0, 2).toUpperCase()}
              </Text>
              <View style={[s.onlineDot, { backgroundColor: COLORS.primary }]} />
            </View>

            {/* Content */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={s.chatName} numberOfLines={1}>{item.other_user_name}</Text>
                <Text style={s.chatTime}>
                  {item.last_message_at ? formatRelativeTime(item.last_message_at) : ''}
                </Text>
              </View>
              {item.vehicle_title && (
                <Text style={s.vehicleRef} numberOfLines={1}>🚗 {item.vehicle_title}</Text>
              )}
              <Text style={s.chatPreview} numberOfLines={1}>
                {item.last_message_preview || 'No messages yet'}
              </Text>
            </View>

            {/* Unread badge */}
            {item.unread_count > 0 && (
              <View style={s.unreadBadge}>
                <Text style={s.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={s.emptyTitle}>No conversations yet</Text>
            <Text style={s.emptySub}>When you contact a seller, your chat will appear here</Text>
            <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(tabs)/search')}>
              <Text style={s.loginBtnText}>Browse Listings</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.blue + '33',
    borderWidth: 2, borderColor: COLORS.blue,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: COLORS.blue, fontSize: 14, fontWeight: '800' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: COLORS.bg },
  chatName: { fontSize: 14, fontWeight: '700', color: COLORS.white, flex: 1, marginRight: 8 },
  chatTime: { fontSize: 10, color: COLORS.gray3 },
  vehicleRef: { fontSize: 10, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  chatPreview: { fontSize: 12, color: COLORS.gray3 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, marginLeft: 8,
  },
  unreadText: { fontSize: 11, fontWeight: '800', color: '#000' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptySub: { fontSize: 13, color: COLORS.gray3, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  loginBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
