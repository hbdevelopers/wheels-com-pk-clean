// mobile/app/chat/[id].tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../services/api';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, formatPKR } from '../../constants/theme';

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [offerVisible, setOfferVisible] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const qc = useQueryClient();

  const { data: chatData, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatApi.getMessages(chatId!).then(r => r.data),
    enabled: !!chatId,
    onSuccess: (data: any[]) => setMessages(data),
  });

  useEffect(() => {
    let cleanup: (() => void)[] = [];

    socketService.connectChat().then(socket => {
      // Listen for new messages
      const off1 = socketService.onNewMessage(msg => {
        if (msg.chat_id === chatId) {
          setMessages(prev => [...prev, msg]);
          flatRef.current?.scrollToEnd({ animated: true });
          // Mark read
          socketService.markRead(chatId!, [msg.id]);
        }
      });

      // Typing indicator
      const off2 = socketService.onTyping(data => {
        if (data.chat_id === chatId && data.user_id !== user?.id) {
          setTyping(true);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTyping(false), 3000);
        }
      });

      // New offer
      const off3 = socketService.onNewOffer(offer => {
        if (offer.chat_id === chatId) {
          setMessages(prev => [...prev, { ...offer, message_type: 'offer' }]);
        }
      });

      cleanup = [off1, off2, off3];
    });

    return () => {
      cleanup.forEach(fn => fn?.());
      clearTimeout(typingTimer.current);
    };
  }, [chatId, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      socketService.sendMessage(chatId!, text);
      socketService.sendTypingStop(chatId!);
    } finally {
      setSending(false);
    }
  }, [input, chatId, sending]);

  const sendOffer = useCallback(() => {
    const amount = parseInt(offerAmount.replace(/,/g, ''), 10);
    if (!amount || amount < 100000) {
      Alert.alert('Invalid', 'Enter a valid offer amount (min PKR 1 Lac)');
      return;
    }
    // Get vehicle_id from chat data
    if (chatData?.vehicle_id) {
      socketService.makeOffer(chatId!, chatData.vehicle_id, amount);
    }
    setOfferAmount('');
    setOfferVisible(false);
  }, [offerAmount, chatId, chatData]);

  const handleTyping = (text: string) => {
    setInput(text);
    if (text.length > 0) {
      socketService.sendTypingStart(chatId!);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socketService.sendTypingStop(chatId!), 1500);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    if (item.message_type === 'offer') {
      return (
        <View style={s.offerBubble}>
          <Text style={s.offerLabel}>💰 {isMe ? 'Offer Sent' : 'Offer Received'}</Text>
          <Text style={s.offerAmount}>PKR {formatPKR(item.offered_price || item.amount)}</Text>
          {!isMe && item.status === 'pending' && (
            <View style={s.offerActions}>
              <TouchableOpacity
                style={s.offerAccept}
                onPress={() => chatApi.respondToOffer(item.id, 'accept').then(() => qc.invalidateQueries(['chat', chatId]))}
              >
                <Text style={s.offerAcceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.offerReject}
                onPress={() => chatApi.respondToOffer(item.id, 'reject')}
              >
                <Text style={s.offerRejectText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.status === 'accepted' && <Text style={{ color: COLORS.primary, fontSize: 11, marginTop: 4 }}>✓ Accepted</Text>}
          {item.status === 'rejected' && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 4 }}>✗ Declined</Text>}
        </View>
      );
    }
    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
          <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.content}</Text>
        </View>
        <Text style={[s.msgTime, isMe && { textAlign: 'right' }]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMe && (item.is_read ? '  ✓✓' : '  ✓')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Text style={{ color: COLORS.gray2, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>
            {(chatData?.other_user_name || '?').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{chatData?.other_user_name || 'Loading...'}</Text>
          <Text style={[s.headerStatus, { color: otherOnline ? COLORS.primary : COLORS.gray3 }]}>
            {otherOnline ? '● Online' : '● Offline'}
            {chatData?.vehicle_title ? ` · ${chatData.vehicle_title}` : ''}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading
          ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
          : (
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={s.messageList}
              onContentSizeChange={() => flatRef.current?.scrollToEnd()}
              ListFooterComponent={typing
                ? (
                  <View style={[s.bubble, s.bubbleOther, { alignSelf: 'flex-start', marginLeft: SPACING.lg }]}>
                    <Text style={{ color: COLORS.gray3, letterSpacing: 4 }}>•••</Text>
                  </View>
                ) : null}
            />
          )}

        {/* Offer input */}
        {offerVisible && (
          <View style={s.offerPanel}>
            <Text style={s.offerPanelTitle}>💰 Make an Offer</Text>
            <View style={s.offerInputRow}>
              <TextInput
                style={s.offerInput}
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="Amount in PKR..."
                placeholderTextColor={COLORS.gray3}
                keyboardType="numeric"
              />
              <TouchableOpacity style={s.offerSendBtn} onPress={sendOffer}>
                <Text style={s.offerSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TouchableOpacity style={s.offerBtn} onPress={() => setOfferVisible(!offerVisible)}>
            <Text style={{ fontSize: 16 }}>💰</Text>
          </TouchableOpacity>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={handleTyping}
              onSubmitEditing={sendMessage}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.gray3}
              returnKeyType="send"
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[s.sendBtn, input.trim() && s.sendBtnActive]}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Text style={{ fontSize: 16, color: input.trim() ? '#000' : COLORS.gray3 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.blue + '33', borderWidth: 2, borderColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerAvatarText: { color: COLORS.blue, fontWeight: '800', fontSize: 13 },
  headerName: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  headerStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  messageList: { padding: SPACING.lg, gap: 10 },
  msgRow: { alignItems: 'flex-start' },
  msgRowMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, marginBottom: 2 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: COLORS.white },
  bubbleTextMe: { color: '#000', fontWeight: '600' },
  msgTime: { fontSize: 10, color: COLORS.gray3 },
  offerBubble: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.amber + '44', borderRadius: 14, padding: 14, maxWidth: '78%', alignSelf: 'center' },
  offerLabel: { fontSize: 11, color: COLORS.amber, fontWeight: '700', marginBottom: 4 },
  offerAmount: { fontSize: 22, fontWeight: '900', color: COLORS.white, marginBottom: 10 },
  offerActions: { flexDirection: 'row', gap: 8 },
  offerAccept: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, padding: 8, alignItems: 'center' },
  offerAcceptText: { color: '#000', fontWeight: '700', fontSize: 12 },
  offerReject: { flex: 1, backgroundColor: COLORS.red + '22', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.red + '44' },
  offerRejectText: { color: COLORS.red, fontWeight: '700', fontSize: 12 },
  offerPanel: { backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.amber + '44', padding: SPACING.md },
  offerPanelTitle: { fontSize: 12, color: COLORS.amber, fontWeight: '700', marginBottom: 8 },
  offerInputRow: { flexDirection: 'row', gap: 8 },
  offerInput: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.white, fontSize: 13 },
  offerSendBtn: { backgroundColor: COLORS.amber, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  offerSendText: { color: '#000', fontWeight: '700', fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.sm, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bgCard },
  offerBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.amber + '22', borderWidth: 1, borderColor: COLORS.amber + '44', alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, maxHeight: 100 },
  input: { paddingVertical: 10, color: COLORS.white, fontSize: 14, maxHeight: 80 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.gray4, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: COLORS.primary },
});
