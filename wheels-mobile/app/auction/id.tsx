// mobile/app/auction/[id].tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Image, Alert, Dimensions, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { auctionsApi } from '../../services/api';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, formatPKR, formatRelativeTime } from '../../constants/theme';

const { width: W } = Dimensions.get('window');

function Countdown({ endsAt }: { endsAt: string }) {
  const [secs, setSecs] = useState(
    Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const urgent = secs < 300 && secs > 0;
  const ended = secs === 0;
  return (
    <View style={[cds.wrap, urgent && cds.wrapUrgent, ended && cds.wrapEnded]}>
      {ended ? (
        <Text style={[cds.label, { color: COLORS.gray3 }]}>Auction Ended</Text>
      ) : (
        <>
          <Text style={[cds.label, urgent && { color: COLORS.red }]}>
            {urgent ? '⚡ Ending Soon' : '⏱ Time Left'}
          </Text>
          <View style={cds.timerRow}>
            {[h, m, s].map((unit, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <View style={[cds.digitBox, urgent && cds.digitBoxUrgent]}>
                  <Text style={[cds.digit, urgent && { color: COLORS.red }]}>{pad(unit)}</Text>
                </View>
                <Text style={cds.unit}>{['HRS', 'MIN', 'SEC'][i]}</Text>
                {i < 2 && <Text style={[cds.colon, urgent && { color: COLORS.red }]}>:</Text>}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const cds = StyleSheet.create({
  wrap: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  wrapUrgent: { borderColor: COLORS.red + '66', backgroundColor: COLORS.red + '11' },
  wrapEnded: { borderColor: COLORS.gray4 },
  label: { fontSize: 11, color: COLORS.gray3, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  timerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  digitBox: { backgroundColor: COLORS.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  digitBoxUrgent: { backgroundColor: COLORS.red + '22' },
  digit: { fontSize: 28, fontWeight: '900', color: COLORS.white, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 8, color: COLORS.gray3, fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
  colon: { fontSize: 22, fontWeight: '900', color: COLORS.gray3, marginBottom: 14, paddingHorizontal: 2 },
});

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [currentBid, setCurrentBid] = useState(0);
  const [totalBids, setTotalBids] = useState(0);
  const [watchers, setWatchers] = useState(0);
  const [bids, setBids] = useState<any[]>([]);
  const [bidInput, setBidInput] = useState('');
  const [placing, setPlacing] = useState(false);
  const [isWinning, setIsWinning] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winner, setWinner] = useState<any>(null);

  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionsApi.getAuction(id!).then(r => r.data),
    enabled: !!id,
    onSuccess: (data: any) => {
      setCurrentBid(data.current_price || data.start_price);
      setTotalBids(data.total_bids || 0);
      setBids(data.bids || []);
      setAuctionEnded(data.status === 'ended');
    },
  });

  // Connect to auction WebSocket
  useEffect(() => {
    if (!id) return;
    let cleanups: (() => void)[] = [];

    socketService.connectAuction().then(() => {
      socketService.watchAuction(id);

      const off1 = socketService.onNewBid(bid => {
        setCurrentBid(bid.amount);
        setTotalBids(bid.total_bids);
        setBids(prev => [bid, ...prev].slice(0, 30));
        setIsWinning(bid.bidder_id === user?.id);
        if (bid.bidder_id !== user?.id) Vibration.vibrate(100);
      });

      const off2 = socketService.onWatcherCount(data => {
        setWatchers(data.count);
      });

      const off3 = socketService.onAuctionEnded(data => {
        setAuctionEnded(true);
        setWinner(data.winner);
        if (data.winner?.id === user?.id) {
          Alert.alert('🏆 You Won!', `Congratulations! You won this auction for PKR ${formatPKR(data.winner.amount)}`);
        } else {
          Alert.alert('Auction Ended', 'This auction has ended.');
        }
      });

      cleanups = [off1, off2, off3];
    });

    return () => {
      cleanups.forEach(fn => fn?.());
      socketService.leaveAuction(id);
    };
  }, [id, user?.id]);

  const minBid = currentBid + (auction?.bid_increment || 100000);

  const placeBid = useCallback(async (amount?: number) => {
    const bidAmount = amount || parseInt(bidInput.replace(/,/g, ''), 10);
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    if (!bidAmount || bidAmount < minBid) {
      Alert.alert('Invalid Bid', `Minimum bid is PKR ${formatPKR(minBid)}`); return;
    }
    setPlacing(true);
    try {
      const result = await socketService.placeBid(id!, bidAmount);
      if (result.error) {
        Alert.alert('Bid Failed', result.error);
      } else {
        setBidInput('');
        setIsWinning(true);
        Vibration.vibrate([0, 50, 50, 50]);
      }
    } finally { setPlacing(false); }
  }, [bidInput, id, minBid, isAuthenticated]);

  if (isLoading || !auction) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}><Text style={{ color: COLORS.primary, fontSize: 32 }}>🔨</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={{ height: 240, position: 'relative' }}>
          <Image source={{ uri: auction.vehicle_image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={s.imgOverlay} />
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          {/* Live badge */}
          {!auctionEnded && (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>LIVE AUCTION</Text>
            </View>
          )}
          <View style={s.watcherBadge}>
            <Text style={s.watcherText}>👁 {watchers} watching</Text>
          </View>
          <View style={s.imgInfo}>
            <Text style={s.imgTitle}>{auction.year} {auction.make} {auction.model}{auction.variant ? ` ${auction.variant}` : ''}</Text>
            <Text style={s.imgMeta}>{auction.city} · {auction.mileage ? `${Math.round(auction.mileage / 1000)}k km` : ''} · {auction.transmission}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Current bid + countdown */}
          <View style={s.bidRow}>
            <View style={s.currentBidBox}>
              <Text style={s.currentBidLabel}>Current Bid</Text>
              <Text style={s.currentBidAmount}>PKR {formatPKR(currentBid)}</Text>
              <Text style={s.currentBidSub}>{totalBids} bids placed</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Countdown endsAt={auction.ends_at} />
            </View>
          </View>

          {/* Winning/losing status */}
          {isAuthenticated && !auctionEnded && bids.length > 0 && (
            <View style={[s.statusBanner, isWinning ? s.statusWinning : s.statusLosing]}>
              <Text style={[s.statusText, { color: isWinning ? COLORS.primary : COLORS.red }]}>
                {isWinning ? '🏆 You are currently winning!' : '⚡ You have been outbid — bid again!'}
              </Text>
            </View>
          )}

          {/* Auction ended */}
          {auctionEnded && (
            <View style={s.endedBanner}>
              <Text style={s.endedTitle}>Auction Ended</Text>
              {winner && (
                <Text style={s.endedSub}>
                  Won by {winner.name} for PKR {formatPKR(winner.amount)}
                </Text>
              )}
            </View>
          )}

          {/* Bid Input */}
          {!auctionEnded && (
            <View style={s.bidCard}>
              <Text style={s.bidCardTitle}>Place Your Bid</Text>
              <Text style={s.bidMinNote}>
                Minimum bid: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>PKR {formatPKR(minBid)}</Text>
              </Text>

              {/* Quick bid amounts */}
              <View style={s.quickBids}>
                {[minBid, minBid + 200000, minBid + 500000, minBid + 1000000].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={s.quickBidChip}
                    onPress={() => placeBid(amt)}
                    disabled={placing}
                  >
                    <Text style={s.quickBidText}>{formatPKR(amt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom bid */}
              <View style={s.customBidRow}>
                <View style={s.customBidInputWrap}>
                  <Text style={s.customBidPrefix}>PKR</Text>
                  <TextInput
                    style={s.customBidInput}
                    value={bidInput}
                    onChangeText={setBidInput}
                    placeholder={formatPKR(minBid)}
                    placeholderTextColor={COLORS.gray3}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={[s.bidBtn, placing && s.bidBtnLoading]}
                  onPress={() => placeBid()}
                  disabled={placing}
                >
                  <Text style={s.bidBtnText}>{placing ? '...' : 'Bid Now'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Vehicle details */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Vehicle Details</Text>
            <View style={s.detailsGrid}>
              {[
                ['Make', auction.make],
                ['Model', auction.model],
                ['Year', auction.year],
                ['Mileage', auction.mileage ? `${Math.round(auction.mileage / 1000)}k km` : '—'],
                ['Fuel', auction.fuel_type],
                ['Transmission', auction.transmission],
                ['City', auction.city],
                ['Assembly', auction.assembly || 'Local'],
              ].map(([k, v]) => (
                <View key={k as string} style={s.detailItem}>
                  <Text style={s.detailKey}>{k}</Text>
                  <Text style={s.detailVal}>{v}</Text>
                </View>
              ))}
            </View>
            {auction.description && (
              <Text style={s.auctionDesc}>{auction.description}</Text>
            )}
          </View>

          {/* Bid history */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Bid History · {totalBids} bids</Text>
            {bids.slice(0, 10).map((bid: any, i: number) => (
              <View key={bid.bid_id || i} style={[s.bidHistoryRow, i < bids.length - 1 && s.bidHistoryRowBorder]}>
                <View style={[s.bidderAvatar, bid.is_mine && s.bidderAvatarMe]}>
                  <Text style={[s.bidderAvatarText, bid.is_mine && { color: '#000' }]}>
                    {(bid.bidder_name || bid.bidder_initials || '??').slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.bidderName, bid.is_mine && { color: COLORS.primary }]}>
                    {bid.is_mine ? 'You' : bid.bidder_name || 'Anonymous'}
                  </Text>
                  <Text style={s.bidTime}>
                    {bid.created_at ? formatRelativeTime(bid.created_at) : bid.timestamp ? formatRelativeTime(bid.timestamp) : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.bidAmount, i === 0 && { color: COLORS.primary }]}>
                    PKR {formatPKR(bid.amount)}
                  </Text>
                  {i === 0 && <Text style={s.winningTag}>WINNING</Text>}
                </View>
              </View>
            ))}
          </View>

          {/* Seller info */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Seller</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <View style={s.sellerAvatar}>
                <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{(auction.seller_name || '??').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>{auction.seller_name}</Text>
                {auction.seller_phone_verified && <Text style={{ color: COLORS.primary, fontSize: 11 }}>✓ Phone verified</Text>}
              </View>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', top: 48, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { position: 'absolute', top: 48, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.red, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  watcherBadge: { position: 'absolute', bottom: 44, right: 12, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  watcherText: { fontSize: 10, color: '#fff' },
  imgInfo: { position: 'absolute', bottom: 12, left: 16, right: 16 },
  imgTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  imgMeta: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  body: { padding: SPACING.lg },
  bidRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  currentBidBox: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  currentBidLabel: { fontSize: 10, color: COLORS.gray3, fontWeight: '700', marginBottom: 4 },
  currentBidAmount: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  currentBidSub: { fontSize: 10, color: COLORS.gray3, marginTop: 4 },
  statusBanner: { borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  statusWinning: { backgroundColor: COLORS.primaryFaint, borderColor: COLORS.primary + '44' },
  statusLosing: { backgroundColor: COLORS.red + '11', borderColor: COLORS.red + '44' },
  statusText: { fontSize: 13, fontWeight: '700' },
  endedBanner: { backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray4, padding: SPACING.md, alignItems: 'center', marginBottom: 12 },
  endedTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  endedSub: { fontSize: 12, color: COLORS.gray2 },
  bidCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: 12 },
  bidCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  bidMinNote: { fontSize: 12, color: COLORS.gray2, marginBottom: 12 },
  quickBids: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  quickBidChip: { flex: 1, minWidth: '22%', paddingVertical: 8, backgroundColor: COLORS.bgElevated, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  quickBidText: { fontSize: 11, color: COLORS.gray1, fontWeight: '700' },
  customBidRow: { flexDirection: 'row', gap: 8 },
  customBidInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, overflow: 'hidden' },
  customBidPrefix: { paddingHorizontal: 10, color: COLORS.gray3, fontSize: 12 },
  customBidInput: { flex: 1, paddingVertical: 12, color: COLORS.white, fontSize: 15, fontWeight: '700' },
  bidBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },
  bidBtnLoading: { opacity: 0.6 },
  bidBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  detailItem: { width: '50%', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailKey: { fontSize: 10, color: COLORS.gray3 },
  detailVal: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 2 },
  auctionDesc: { fontSize: 13, color: COLORS.gray2, marginTop: 12, lineHeight: 20 },
  bidHistoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  bidHistoryRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bidderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  bidderAvatarMe: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bidderAvatarText: { fontSize: 11, fontWeight: '800', color: COLORS.gray2 },
  bidderName: { fontSize: 12, fontWeight: '600', color: COLORS.white },
  bidTime: { fontSize: 10, color: COLORS.gray3, marginTop: 2 },
  bidAmount: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  winningTag: { fontSize: 8, color: COLORS.primary, fontWeight: '800', marginTop: 2 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryFaint, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
