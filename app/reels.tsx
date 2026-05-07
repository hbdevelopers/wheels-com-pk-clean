// mobile/app/reels.tsx
// Reels-style vertical swipeable car video feed
import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ViewToken, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { COLORS, SPACING, formatPKR } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// Mock reels data — in production fetched from API with real video URLs
// Using thumbnail images as fallback since real video CDN is not set up
const REELS = [
  {
    id: '1',
    thumbnail: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=80',
    videoUrl: null, // would be R2 CDN URL in production
    title: '2022 Toyota Corolla Altis — Full Walkaround',
    make: 'Toyota', model: 'Corolla', price: 6500000,
    city: 'Lahore', seller: 'Ahmed R.', vehicleId: '1',
    likes: 847, comments: 34, shares: 12,
    caption: 'Pristine condition 2022 Corolla Altis. Full option, one owner, 18k km only 🚗✨ #Toyota #Corolla #CarPakistan',
  },
  {
    id: '2',
    thumbnail: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    videoUrl: null,
    title: 'Mercedes C200 — Import from Germany',
    make: 'Mercedes', model: 'C200', price: 17500000,
    city: 'Karachi', seller: 'CAPS Import', vehicleId: '8',
    likes: 2341, comments: 156, shares: 89,
    caption: 'Direct import from Germany 🇩🇪 Mercedes C200 M-Sport 2020. All documents clear. Karachi only #Mercedes #Import #Luxury',
  },
  {
    id: '3',
    thumbnail: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    videoUrl: null,
    title: 'Hyundai Tucson AWD — Test Drive Vlog',
    make: 'Hyundai', model: 'Tucson', price: 11800000,
    city: 'Islamabad', seller: 'Premier Motors', vehicleId: '4',
    likes: 1203, comments: 67, shares: 45,
    caption: 'Tucson AWD Ultimate on Margalla Hills 🏔️ Best SUV under 1.5 Cr in Pakistan? Watch and decide! #Hyundai #Tucson #SUV',
  },
  {
    id: '4',
    thumbnail: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&q=80',
    videoUrl: null,
    title: 'Honda Civic Oriel — Night Drive Karachi',
    make: 'Honda', model: 'Civic', price: 7200000,
    city: 'Karachi', seller: 'AutoMax KHI', vehicleId: '2',
    likes: 567, comments: 23, shares: 18,
    caption: 'Civic Oriel at night hits different 🌙 CVT smooth as butter. Full option, inspection badge ✅ #Honda #Civic #Karachi',
  },
  {
    id: '5',
    thumbnail: 'https://images.unsplash.com/photo-1574614024272-5b23fe36bafe?w=600&q=80',
    videoUrl: null,
    title: 'Suzuki Swift — Budget Pick 2024',
    make: 'Suzuki', model: 'Swift', price: 3450000,
    city: 'Lahore', seller: 'Bilal H.', vehicleId: '3',
    likes: 412, comments: 28, shares: 31,
    caption: 'Best car under 35 lac? Hear me out 👀 Swift GLX CVT full review. Low km, single owner, Lahore #Suzuki #Swift #Budget',
  },
];

function ReelItem({
  item,
  isActive,
  onLike,
  liked,
}: {
  item: typeof REELS[0];
  isActive: boolean;
  onLike: () => void;
  liked: boolean;
}) {
  return (
    <View style={rs.reel}>
      {/* Background image (thumbnail when no video) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
        {/* In production: use <Video> component with item.videoUrl */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bgCard }]}>
          {/* Thumbnail image */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />
        </View>
        {/* Gradient overlay */}
        <View style={rs.gradient} />
      </View>

      {/* Back button */}
      <SafeAreaView style={rs.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={rs.backBtn}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={rs.topTitle}>wheels reels</Text>
        <TouchableOpacity style={rs.searchTopBtn} onPress={() => router.push('/(tabs)/search')}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Right action buttons */}
      <View style={rs.actions}>
        <TouchableOpacity style={rs.actionBtn} onPress={onLike}>
          <Text style={[rs.actionIcon, liked && { color: COLORS.red }]}>{liked ? '♥' : '♡'}</Text>
          <Text style={rs.actionLabel}>{item.likes + (liked ? 1 : 0)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={rs.actionBtn}>
          <Text style={rs.actionIcon}>💬</Text>
          <Text style={rs.actionLabel}>{item.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={rs.actionBtn}>
          <Text style={rs.actionIcon}>↗</Text>
          <Text style={rs.actionLabel}>{item.shares}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={rs.actionBtn}>
          <Text style={rs.actionIcon}>•••</Text>
          <Text style={rs.actionLabel}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={rs.bottomInfo}>
        {/* Seller */}
        <View style={rs.sellerRow}>
          <View style={rs.sellerAvatar}>
            <Text style={rs.sellerAvatarText}>{item.seller.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={rs.sellerName}>{item.seller}</Text>
          <TouchableOpacity style={rs.followBtn}>
            <Text style={rs.followBtnText}>Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <Text style={rs.caption} numberOfLines={2}>{item.caption}</Text>

        {/* Car info + CTA */}
        <TouchableOpacity
          style={rs.carCard}
          onPress={() => router.push(`/listing/${item.vehicleId}`)}
          activeOpacity={0.9}
        >
          <View style={{ flex: 1 }}>
            <Text style={rs.carName}>{item.make} {item.model}</Text>
            <Text style={rs.carMeta}>📍 {item.city}</Text>
          </View>
          <View style={rs.carPriceWrap}>
            <Text style={rs.carPrice}>PKR {formatPKR(item.price)}</Text>
            <Text style={rs.viewListing}>View →</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Center play button (since no real video in demo) */}
      <View style={rs.playOverlay} pointerEvents="none">
        <View style={rs.playBtn}>
          <Text style={{ fontSize: 28, color: '#fff' }}>▶</Text>
        </View>
        <Text style={rs.videoLabel}>{item.title}</Text>
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIdx(viewableItems[0].index ?? 0);
      }
    },
    [],
  );

  const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        data={REELS}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isActive={index === activeIdx}
            liked={!!liked[item.id]}
            onLike={() => setLiked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        initialNumToRender={2}
      />
    </View>
  );
}

const rs = StyleSheet.create({
  reel: { width: W, height: H, position: 'relative' },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    // Simulated gradient: dark at bottom
    backgroundColor: 'transparent',
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  searchTopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  actions: {
    position: 'absolute', right: 12, bottom: 200,
    alignItems: 'center', gap: 20,
  },
  actionBtn: { alignItems: 'center' },
  actionIcon: { fontSize: 28, color: '#fff' },
  actionLabel: { fontSize: 11, color: '#fff', fontWeight: '600', marginTop: 2 },
  bottomInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 60,
    padding: SPACING.lg, paddingBottom: 32,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sellerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '33', borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  sellerName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#fff' },
  followBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: '#fff' },
  followBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  caption: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, marginBottom: 12 },
  carCard: {
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  carName: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  carMeta: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  carPriceWrap: { alignItems: 'flex-end' },
  carPrice: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  viewListing: { fontSize: 11, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  videoLabel: {
    fontSize: 14, color: '#fff', fontWeight: '700',
    textAlign: 'center', paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4,
  },
});
