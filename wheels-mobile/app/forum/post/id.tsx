// mobile/app/forum/post/id.tsx  (maps to /forum/post/[id])
import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, FlatList,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/auth.store';
import { COLORS, SPACING, formatRelativeTime } from '../../../constants/theme';

export default function ForumPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const qc = useQueryClient();
  const inputRef = useRef<TextInput>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['forum-post', id],
    queryFn: () => api.get(`/forum/posts/${id}`).then(r => r.data),
    enabled: !!id,
    onSuccess: (d: any) => setLiked(d.liked_by_me),
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/forum/posts/${id}/like`),
    onSuccess: (res: any) => setLiked(res.data.liked),
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) => api.post(`/forum/posts/${id}/replies`, { body }),
    onSuccess: () => {
      setReplyText('');
      qc.invalidateQueries(['forum-post', id]);
    },
  });

  const handleReply = () => {
    if (replyText.trim().length < 2) return;
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    replyMutation.mutate(replyText.trim());
  };

  if (isLoading || !data) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}><ActivityIndicator color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const post = data;
  const replies = data.replies || [];

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{post.title}</Text>
          <TouchableOpacity onPress={() => router.push(`/report?vehicle_id=${post.id}`)}>
            <Text style={{ color: COLORS.gray3, fontSize: 14 }}>⚑</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Post */}
          <View style={s.postWrap}>
            {/* Author */}
            <View style={s.authorRow}>
              <View style={[s.authorAvatar, post.is_official && { backgroundColor: COLORS.primary + '33', borderColor: COLORS.primary }]}>
                <Text style={[s.authorAvatarText, post.is_official && { color: COLORS.primary }]}>
                  {(post.author_name || '??').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={s.authorName}>{post.author_name}</Text>
                  {post.is_official && <View style={s.officialBadge}><Text style={s.officialBadgeText}>OFFICIAL</Text></View>}
                  {post.author_verified && <Text style={{ fontSize: 13 }}>✅</Text>}
                </View>
                <Text style={s.authorMeta}>{post.author_city} · {formatRelativeTime(post.created_at)}</Text>
              </View>
            </View>

            <Text style={s.postTitle}>{post.title}</Text>
            <Text style={s.postBody}>{post.body}</Text>

            {/* Tags */}
            {post.tags?.length > 0 && (
              <View style={s.tagRow}>
                {(post.tags as string[]).map(tag => (
                  <View key={tag} style={s.tag}><Text style={s.tagText}>#{tag}</Text></View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={s.postActions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => { if (isAuthenticated) likeMutation.mutate(); else router.push('/(auth)/login'); }}>
                <Text style={{ fontSize: 16, color: liked ? COLORS.red : COLORS.gray3 }}>{liked ? '♥' : '♡'}</Text>
                <Text style={[s.actionText, liked && { color: COLORS.red }]}>{post.likes_count + (liked ? 1 : 0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => inputRef.current?.focus()}>
                <Text style={{ fontSize: 14 }}>💬</Text>
                <Text style={s.actionText}>{post.replies_count} replies</Text>
              </TouchableOpacity>
              <View style={s.actionBtn}>
                <Text style={{ fontSize: 14 }}>👁</Text>
                <Text style={s.actionText}>{post.view_count} views</Text>
              </View>
            </View>
          </View>

          {/* Replies */}
          <View style={s.repliesSection}>
            <Text style={s.repliesTitle}>{replies.length} Replies</Text>
            {replies.map((reply: any, i: number) => (
              <View key={reply.id} style={[s.replyCard, i < replies.length - 1 && s.replyCardBorder]}>
                <View style={s.authorRow}>
                  <View style={s.replyAvatar}>
                    <Text style={s.replyAvatarText}>{(reply.author_name || '??').slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Text style={[s.authorName, { fontSize: 12 }]}>{reply.author_name}</Text>
                      {reply.author_verified && <Text style={{ fontSize: 11 }}>✅</Text>}
                    </View>
                    <Text style={s.authorMeta}>{formatRelativeTime(reply.created_at)}</Text>
                  </View>
                </View>
                <Text style={s.replyBody}>{reply.body}</Text>
              </View>
            ))}
            {replies.length === 0 && (
              <Text style={{ color: COLORS.gray3, fontSize: 13, padding: SPACING.lg, textAlign: 'center' }}>
                Be the first to reply!
              </Text>
            )}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Reply input */}
        <View style={s.replyBar}>
          <TextInput
            ref={inputRef}
            style={s.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={isAuthenticated ? 'Write a reply...' : 'Login to reply...'}
            placeholderTextColor={COLORS.gray3}
            multiline
            maxLength={2000}
            onFocus={() => !isAuthenticated && router.push('/(auth)/login')}
          />
          <TouchableOpacity
            style={[s.replyBtn, (!replyText.trim() || replyMutation.isLoading) && s.replyBtnDisabled]}
            onPress={handleReply}
            disabled={!replyText.trim() || replyMutation.isLoading}
          >
            {replyMutation.isLoading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={s.replyBtnText}>Send</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.white },
  postWrap: { padding: SPACING.lg, borderBottomWidth: 8, borderBottomColor: COLORS.bgElevated },
  authorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { fontSize: 13, fontWeight: '800', color: COLORS.gray2 },
  authorName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  authorMeta: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  officialBadge: { backgroundColor: COLORS.primary, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  officialBadgeText: { fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  postTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginBottom: 12, lineHeight: 24 },
  postBody: { fontSize: 14, color: COLORS.gray1, lineHeight: 22, marginBottom: 14 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, backgroundColor: COLORS.bgElevated, borderRadius: 8 },
  tagText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  postActions: { flexDirection: 'row', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, color: COLORS.gray3 },
  repliesSection: { padding: SPACING.lg },
  repliesTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 16 },
  replyCard: { paddingVertical: 14 },
  replyCardBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  replyAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  replyAvatarText: { fontSize: 11, fontWeight: '800', color: COLORS.gray2 },
  replyBody: { fontSize: 13, color: COLORS.gray1, lineHeight: 20, marginTop: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.sm, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bgCard },
  replyInput: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontSize: 14, maxHeight: 90 },
  replyBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  replyBtnDisabled: { opacity: 0.4 },
  replyBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
