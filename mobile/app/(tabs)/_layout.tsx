import { Tabs } from 'expo-router';
import { Home, Search, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICON_SIZE = 22;
const ACTIVE_COLOR = '#FFD43B';
const INACTIVE_COLOR = '#112133';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1.5,
          borderTopColor: '#11213318',
          paddingBottom: bottomPadding,
          paddingTop: 6,
          height: 54 + bottomPadding,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <Search size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogs"
        options={{
          title: 'Catalogs',
          tabBarIcon: ({ color }) => <Sparkles size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      {/*
        Saved and Profile are reachable from the header on every screen, so they
        are kept off the tab bar to avoid duplicating the same two destinations.
        `href: null` hides the button while leaving the routes navigable.
      */}
      <Tabs.Screen name="saved" options={{ href: null, title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
    </Tabs>
  );
}
