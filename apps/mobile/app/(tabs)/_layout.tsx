import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ── Colors (inline — avoids circular import risk) ─────────────────────────────
const VIVID_GREEN = '#48A111';  // Tina button, active states
const INACTIVE    = '#5A5A52';  // Inactive tabs
const BAR_BG      = '#FFFFFF';
const BAR_BORDER  = '#EAE4E4';

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { name: 'index',    label: 'Home',     icon: 'home'       },
  { name: 'shopping', label: 'Shopping', icon: 'cart'       },
  { name: 'chat',     label: 'Tina',     icon: null         }, // centre — custom
  { name: 'recipes',  label: 'Recipes',  icon: 'restaurant' },
  { name: 'profile',  label: 'Profile',  icon: 'person'     },
] as const;

type TabName = typeof TABS[number]['name'];
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ── Custom floating pill tab bar ──────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  function isFocused(tabName: TabName): boolean {
    const route = state.routes[state.index];
    if (tabName === 'index') return route.name === 'index';
    return route.name === tabName;
  }

  function onPress(tabName: TabName) {
    const route = state.routes.find((r) => r.name === tabName);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(tabName);
    }
  }

  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={[S.container, { bottom: bottomPad + 12 }]}>
      {/* Tina elevated button — absolutely centred above bar */}
      <View style={S.tinaAnchor} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => onPress('chat')}
          style={S.tinaBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={26} color="#FFFFFF" />
          <Text style={S.tinaLabel}>Tina</Text>
        </TouchableOpacity>
      </View>

      {/* Bar */}
      <View style={S.bar}>
        {TABS.map((tab) => {
          if (tab.name === 'chat') {
            // Spacer so other tabs are evenly distributed around centre
            return <View key="tina-space" style={S.tabSpacer} />;
          }

          const focused = isFocused(tab.name as TabName);
          const color = focused ? VIVID_GREEN : INACTIVE;
          const baseIcon = tab.icon as string;
          const iconName = (focused ? baseIcon : `${baseIcon}-outline`) as IoniconsName;

          return (
            <TouchableOpacity
              key={tab.name}
              style={S.tab}
              onPress={() => onPress(tab.name as TabName)}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName} size={22} color={color} />
              <Text style={[S.tabLabel, { color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Home' }} />
      <Tabs.Screen name="shopping"  options={{ title: 'Shopping' }} />
      <Tabs.Screen name="chat"      options={{ title: 'Tina' }} />
      <Tabs.Screen name="recipes"   options={{ title: 'Recipes' }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile' }} />
      {/* Hidden screens — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="inventory"  options={{ href: null }} />
      <Tabs.Screen name="analytics"  options={{ href: null }} />
    </Tabs>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const BAR_HEIGHT  = 64;
const TINA_SIZE   = 62;
const TINA_LIFT   = 14; // how far above the bar the button floats

const S = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: BAR_HEIGHT + TINA_LIFT,
    // No overflow clip — let Tina button float above
  },

  // Tina button — centred, elevated above bar
  tinaAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  tinaBtn: {
    width: TINA_SIZE,
    height: TINA_SIZE,
    borderRadius: TINA_SIZE / 2,
    backgroundColor: VIVID_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    shadowColor: VIVID_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  tinaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
  },

  // The pill bar — sits below Tina button
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: BAR_BG,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: BAR_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  tabSpacer: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
