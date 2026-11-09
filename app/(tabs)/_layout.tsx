import { Tabs, usePathname } from 'expo-router';
import { Bump } from '@/components/primitives';
import { TabIcon, type TabIconName } from '@/components/primitives/TabIcon';
import { fontFamily } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const TABS: Array<{ name: string; title: string; icon: TabIconName }> = [
  { name: 'index', title: 'Learn', icon: 'home' },
  { name: 'explore', title: 'Explore', icon: 'globe' },
  { name: 'saved', title: 'Saved', icon: 'bookmark' },
  { name: 'liked', title: 'Liked', icon: 'heart' },
  { name: 'me', title: 'Me', icon: 'user' },
];

export default function TabsLayout() {
  const colors = useColors();
  // The tab bar renders each icon twice (active and inactive tints, cross-
  // faded), so a per-icon `focused` prop never changes inside one instance.
  // The bounce is keyed off the route instead: it fires in both copies, and
  // only the visible one is seen.
  const pathname = usePathname();
  const activeTab = pathname === '/' ? 'index' : pathname.replace(/^\//, '').split('/')[0];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.slateLight,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.hairline,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.bodySemi,
          fontSize: 10,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // The icon bounces once as its tab becomes active.
            tabBarIcon: ({ color, focused }) => (
              <Bump value={activeTab === tab.name} playWhen={activeTab === tab.name} peak={1.16}>
                <TabIcon name={tab.icon} color={color} filled={focused} />
              </Bump>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
