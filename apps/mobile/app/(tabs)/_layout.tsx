import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as IoniconsName)}
        size={22}
        color={focused ? colors.brand.green : colors.gray[400]}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.green,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarBackground: () => null,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          marginHorizontal: 20,
          borderRadius: 32,
          height: 68,
          backgroundColor: colors.white,
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          ...shadows.float,
        },
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Tina',
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubble-ellipses" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ focused }) => <TabIcon name="basket" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ focused }) => <TabIcon name="restaurant" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping',
          tabBarIcon: ({ focused }) => <TabIcon name="cart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
