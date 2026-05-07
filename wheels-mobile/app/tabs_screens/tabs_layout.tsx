// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';
import { router } from 'expo-router';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
      <Text style={{ fontSize: 9, fontWeight: '600', color: focused ? COLORS.primary : COLORS.gray3 }}>
        {label}
      </Text>
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary }} />}
    </View>
  );
}

function SellButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/listing/create')}
      style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        shadowColor: COLORS.primary, shadowOpacity: 0.5,
        shadowRadius: 12, elevation: 8,
      }}
    >
      <Text style={{ fontSize: 24, color: '#000', fontWeight: '900' }}>+</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 8,
        },
        tabBarBackground: () => null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />, tabBarLabel: () => null }}
      />
      <Tabs.Screen
        name="search"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Search" focused={focused} />, tabBarLabel: () => null }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          tabBarIcon: () => <SellButton />,
          tabBarLabel: () => null,
          href: null, // handled by SellButton direct navigation
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Chats" focused={focused} />, tabBarLabel: () => null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />, tabBarLabel: () => null }}
      />
    </Tabs>
  );
}
