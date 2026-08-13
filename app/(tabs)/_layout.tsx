import { Tabs } from 'expo-router';
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={tab.icon} color={color} filled={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
