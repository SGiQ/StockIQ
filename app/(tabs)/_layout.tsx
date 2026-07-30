import { Tabs } from 'expo-router';
import { TabIcon, type TabIconName } from '@/components/primitives/TabIcon';
import { fontFamily, palette } from '@/theme/tokens';

const TABS: Array<{ name: string; title: string; icon: TabIconName }> = [
  { name: 'index', title: 'Learn', icon: 'home' },
  { name: 'explore', title: 'Explore', icon: 'globe' },
  { name: 'saved', title: 'Saved', icon: 'bookmark' },
  { name: 'liked', title: 'Liked', icon: 'heart' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.slateLight,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.hairline,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.bodySemi,
          fontSize: 11,
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
