// mobile/app/forum.tsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, formatRelativeTime } from '../constants/theme';
import api from '../services/api';

// Forum categories
const CATEGORIES = [
  { id: 'all',       icon: '🏠', label: 'All' },
  { id: 'buying',    icon: '🔍', label: 'Buying Advice' },
  { id: 'selling',   icon: '💰', label: 'Selling Tips' },
  { id: 'technical', icon: '🔧', label: 'Technical' },
  { id: 'news',      icon: '📰', label: 'Auto News' },
  { id: 'reviews',   icon: '⭐', label: 'Reviews' },
  { id: 'importing', icon: '🛳️', label: 'Importing' },
  { id: 'insurance', icon: '🛡️', label: 'Insurance' },
];

// Mock posts — in production fetched from GET /api/v1/forum/posts
const MOCK_POSTS = [
  {
    id: '1', category: 'buying', title: 'Toyota Corolla vs Honda Civic 2024 — Which to Buy?',
    body: 'I\'m deciding between a 2022 Corolla Altis and 2021 Civic Oriel. Both are around PKR 70 lac in Lahore. I drive 80km daily. Need advice from actual owners please!',
    author: { name: 'Ahmed Raza', city: 'Lahore', avatar: 'AR' },
    replies: 47, likes: 134, views: 2341, pinned: true,
    tags: ['Toyota', 'Honda', 'Comparison'],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '2', category: 'technical', title: 'Suzuki Alto VXR AGS jerking at low speed — Normal?',
    body: 'My 2023 Alto AGS jerks when I release the accelerator under 30km/h. Dealer says it\'s normal for AGS system. Anyone else experiencing this?',
    author: { name: 'Sara K.', city: 'Islamabad', avatar: 'SK' },
    replies: 23, likes: 67, views: 891, pinned: false,
    tags: ['Suzuki', 'Alto', 'AGS', 'Technical'],
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: '3', category: 'news', title: 'Hyundai Ioniq 5 Coming to Pakistan — Official Confirmation',
    body: 'Hyundai Nishat has officially announced the Ioniq 5 EV will launch in Pakistan Q3 2025. Expected price: PKR 1.8-2.2 Crore. Pre-bookings opening soon.',
    author: { name: 'wheels.com.pk', city: 'Pakistan', avatar: 'WP' },
    replies: 89, likes: 312, views: 15234, pinned: false,
    tags: ['Hyundai', 'EV', 'Pakistan', 'Ioniq5'],
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    official: true,
  },
  {
    id: '4', category: 'importing', title: 'Importing Prius 2020 from Japan — Complete Guide & Costs',
    body: 'I recently imported a Prius 2020 from Japan. Total cost breakdown: FOB $14,500 + Import Duty PKR 8.2 Lac + Freight PKR 85k + Clearing PKR 45k. Happy to answer questions.',
    author: { name: 'Imran J.', city: 'Karachi', avatar: 'IJ' },
    replies: 156, likes: 445, views: 28900, pinned: false,
    tags: ['Import', 'Prius', 'Japan', 'Duty'],
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: '5', category: 'reviews', title: 'KIA Sportage 2023 — 1 Year Ownership Review',
    body: '12 months, 18,000km in Lahore city traffic. Pros: amazing infotainment, solid build, great AC. Cons: fuel average only 8km/l in city, service centers need improvement.',
    author: { name: 'Usman B.', city: 'Lahore', avatar: 'UB' },
    replies: 34, likes: 198, views: 7823, pinned: false,
    tags: ['KIA', 'Sportage', 'Review'],
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: '6', category: 'selling', title: 'How I sold my Civic in 3 days — Tips that actually work',
    body: 'Listed my 2020 Civic Oriel at PKR 68 Lac. Got 40+ inquiries in 3 days and sold it. Key things: 12 photos, honest description, quick WhatsApp replies, morning listing time.',
    author: { name: 'Bilal H.', city: 'Rawalpindi', avatar: 'BH' },
    replies: 28, likes: 276, views: 9012, pinned: false,
    tags: ['Selling', 'Tips', 'Honda', 'Civic'],
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
];

function PostCard({ post, onPress }: { post: typeof MOCK_POSTS[0]; onPress: () => void }) {
  const [liked, setLiked] = useState(false);
  return (
    <TouchableOpacity style={s.postCard} onPress={onPress} activeOpacity={0.85}>
      {/* Author row */}
      <View style={s.postAuthorRow}>
        <View style={[s.authorAvatar, post.official && { backgroundColor: COLORS.primary + '33', borderColor: COLORS.primary }]}>
          <Text style={[s.authorAvatarText, post.official && { color: COLORS.primary }]}>{post.author.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.authorName}>{post.author.name}</Text>
            {post.official && <View style={s.officialBadge}><Text style={s.officialBadgeText}>OFFICIAL</Text></View>}
          </View>
          <Text style={s.authorMeta}>{post.author.city} · {formatRelativeTime(post.created_at)}</Text>
        </View>
        <View style={[s.categoryBadge, { backgroundColor: COLORS.bgElevated }]}>
          <Text style={s.categoryBadgeText}>{CATEGORIES.find(c => c.id === post.category)?.icon} {CATEGORIES.find(c => c.id === post.category)?.label}</Text>
        </View>
      </View>

      {/* Title + body */}
      {post.pinned && (
        <View style={s.pinnedBadge}><Text style={s.pinnedText}>📌 Pinned</Text></View>
      )}
      <Text style={s.postTitle}>{post.title}</Text>
      <Text style={s.postBody} numberOfLines={2}>{post.body}</Text>

      {/* Tags */}
      <View style={s.tagRow}>
        {post.tags.slice(0, 3).map(tag => (
          <View key={tag} style={s.tag}><Text style={s.tagText}>#{tag}</Text></View>
        ))}
      </View>

      {/* Footer stats */}
      <View style={s.postFooter}>
        <TouchableOpacity style={s.statBtn} onPress={() => setLiked(!liked)}>
          <Text style={{ fontSize: 14, color: liked ? COLORS.red : COLORS.gray3 }}>{liked ? '♥' : '♡'}</Text>
          <Text style={[s.statText, liked && { color: COLORS.red }]}>{post.likes + (liked ? 1 : 0)}</Text>
        </TouchableOpacity>
        <View style={s.statBtn}>
          <Text style={{ fontSize: 12 }}>💬</Text>
          <Text style={s.statText}>{post.replies} replies</Text>
        </View>
        <View style={s.statBtn}>
          <Text style={{ fontSize: 12 }}>👁</Text>
          <Text style={s.statText}>{post.views > 1000 ? `${(post.views / 1000).toFixed(1)}k` : post.views} views</Text>
        </View>
        <Text style={s.readMore}>Read more →</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ForumScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = MOCK_POSTS.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(searchQ.toLowerCase()));
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>🚗 Community Forum</Text>
        <TouchableOpacity style={s.newPostBtn} onPress={() => router.push('/forum/new-post')}>
          <Text style={s.newPostBtnText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder="Search discussions..."
            placeholderTextColor={COLORS.gray3}
          />
          {searchQ ? <TouchableOpacity onPress={() => setSearchQ('')}><Text style={{ color: COLORS.gray3 }}>✕</Text></TouchableOpacity> : null}
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoriesRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.catChip, activeCategory === cat.id && s.catChipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[s.catChipText, activeCategory === cat.id && { color: COLORS.primary }]}>
              {cat.icon} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Post count */}
      <View style={s.countRow}>
        <Text style={s.countText}>{filtered.length} discussions</Text>
        <TouchableOpacity><Text style={{ fontSize: 12, color: COLORS.primary }}>🔥 Popular</Text></TouchableOpacity>
      </View>

      {/* Posts list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => router.push(`/forum/post/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 6 }}>No discussions found</Text>
            <Text style={{ fontSize: 12, color: COLORS.gray3 }}>Try a different category or search term</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  newPostBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  newPostBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },
  searchRow: { padding: SPACING.md, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14 },
  categoriesRow: { paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary },
  catChipText: { fontSize: 12, color: COLORS.gray2, fontWeight: '600' },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: 8 },
  countText: { fontSize: 11, color: COLORS.gray3, fontWeight: '600' },
  postCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  postAuthorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { fontSize: 12, fontWeight: '800', color: COLORS.gray2 },
  authorName: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  authorMeta: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  officialBadge: { backgroundColor: COLORS.primary, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  officialBadgeText: { fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, color: COLORS.gray2, fontWeight: '600' },
  pinnedBadge: { marginBottom: 4 },
  pinnedText: { fontSize: 10, color: COLORS.amber, fontWeight: '700' },
  postTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginBottom: 6, lineHeight: 20 },
  postBody: { fontSize: 12, color: COLORS.gray2, lineHeight: 18, marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.bgElevated, borderRadius: 6 },
  tagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  statBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: COLORS.gray3 },
  readMore: { marginLeft: 'auto', fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
});
