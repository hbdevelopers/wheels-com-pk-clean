// mobile/app/forum/new-post.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING } from '../../constants/theme';

const CATEGORIES = [
  { id: 'buying',    icon: '🔍', label: 'Buying Advice' },
  { id: 'selling',   icon: '💰', label: 'Selling Tips' },
  { id: 'technical', icon: '🔧', label: 'Technical' },
  { id: 'news',      icon: '📰', label: 'Auto News' },
  { id: 'reviews',   icon: '⭐', label: 'Car Reviews' },
  { id: 'importing', icon: '🛳️', label: 'Importing' },
  { id: 'insurance', icon: '🛡️', label: 'Insurance' },
  { id: 'general',   icon: '💬', label: 'General' },
];

const SUGGESTED_TAGS = ['Toyota', 'Honda', 'Suzuki', 'Hyundai', 'KIA', 'Lahore', 'Karachi',
  'Islamabad', 'Import', 'Review', 'Comparison', 'Budget', 'Luxury', 'Maintenance', 'Fuel'];

export default function NewPostScreen() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/forum/posts', { title: title.trim(), body: body.trim(), category, tags }),
    onSuccess: (res) => {
      qc.invalidateQueries(['forum-posts']);
      router.replace(`/forum/post/${res.data.id}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to post. Please try again.');
    },
  });

  if (!isAuthenticated) {
    router.replace('/(auth)/login');
    return null;
  }

  const addTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean || tags.includes(clean) || tags.length >= 5) return;
    setTags(prev => [...prev, clean]);
    setCustomTag('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const canPost = title.trim().length >= 10 && body.trim().length >= 20 && category;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: COLORS.gray2, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Discussion</Text>
          <TouchableOpacity
            style={[s.postBtn, !canPost && s.postBtnDisabled]}
            onPress={() => mutation.mutate()}
            disabled={!canPost || mutation.isLoading}
          >
            {mutation.isLoading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={[s.postBtnText, !canPost && { color: COLORS.gray3 }]}>Post</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.body}>
            {/* Category */}
            <Text style={s.sectionLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catChip, category === cat.id && s.catChipActive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={[s.catChipText, category === cat.id && { color: COLORS.primary }]}>
                      {cat.icon} {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Title */}
            <Text style={s.sectionLabel}>Title *</Text>
            <TextInput
              style={s.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ask a question or share knowledge..."
              placeholderTextColor={COLORS.gray3}
              maxLength={300}
              multiline
            />
            <Text style={s.charCount}>{title.length}/300</Text>

            {/* Body */}
            <Text style={s.sectionLabel}>Details *</Text>
            <TextInput
              style={s.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="Provide more context, details, photos descriptions, or questions. The more detail, the better answers you'll get..."
              placeholderTextColor={COLORS.gray3}
              maxLength={5000}
              multiline
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{body.length}/5000</Text>

            {/* Tags */}
            <Text style={s.sectionLabel}>Tags (up to 5)</Text>
            {/* Selected tags */}
            {tags.length > 0 && (
              <View style={s.selectedTags}>
                {tags.map(tag => (
                  <TouchableOpacity key={tag} style={s.selectedTag} onPress={() => removeTag(tag)}>
                    <Text style={s.selectedTagText}>#{tag}</Text>
                    <Text style={{ color: COLORS.primary, fontSize: 12, marginLeft: 4 }}>✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* Custom tag input */}
            {tags.length < 5 && (
              <View style={s.tagInputRow}>
                <TextInput
                  style={s.tagInput}
                  value={customTag}
                  onChangeText={setCustomTag}
                  placeholder="Type a tag..."
                  placeholderTextColor={COLORS.gray3}
                  maxLength={30}
                  onSubmitEditing={() => addTag(customTag)}
                />
                <TouchableOpacity
                  style={s.tagAddBtn}
                  onPress={() => addTag(customTag)}
                  disabled={!customTag.trim()}
                >
                  <Text style={{ color: customTag.trim() ? '#000' : COLORS.gray3, fontWeight: '700', fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Suggested tags */}
            <View style={s.suggestedTags}>
              {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 8).map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={s.suggestedTag}
                  onPress={() => addTag(tag)}
                  disabled={tags.length >= 5}
                >
                  <Text style={s.suggestedTagText}>+ {tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Guidelines */}
            <View style={s.guidelines}>
              <Text style={s.guidelinesTitle}>📋 Community Guidelines</Text>
              {[
                'Be respectful — no personal attacks or offensive language',
                'Accurate info only — misinformation harms buyers',
                'No spam or promotional content',
                'Search before posting to avoid duplicates',
              ].map(rule => (
                <Text key={rule} style={s.guidelineRule}>✓ {rule}</Text>
              ))}
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 99,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  postBtnDisabled: { backgroundColor: COLORS.gray4 },
  postBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  body: { padding: SPACING.lg },
  sectionLabel: {
    fontSize: 11, color: COLORS.gray2, fontWeight: '700',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  catChip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99,
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  catChipText: { fontSize: 12, color: COLORS.gray2, fontWeight: '600' },
  titleInput: {
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, color: COLORS.white, fontSize: 16,
    fontWeight: '600', lineHeight: 22,
  },
  bodyInput: {
    backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, color: COLORS.white, fontSize: 14,
    lineHeight: 22, minHeight: 160,
  },
  charCount: { fontSize: 10, color: COLORS.gray3, textAlign: 'right', marginTop: 4, marginBottom: SPACING.lg },
  selectedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  selectedTag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: COLORS.primaryFaint, borderRadius: 99,
    borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  selectedTagText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tagInput: {
    flex: 1, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.white, fontSize: 13,
  },
  tagAddBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  suggestedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.xl },
  suggestedTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  suggestedTagText: { fontSize: 11, color: COLORS.gray2 },
  guidelines: {
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  guidelinesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 10 },
  guidelineRule: { fontSize: 11, color: COLORS.gray2, marginBottom: 5, lineHeight: 16 },
});
