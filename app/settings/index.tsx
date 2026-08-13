import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, Screen, SpeakerIcon, Text } from '@/components/primitives';
import { pairing } from '@/store';
import { openLegal } from '@/lib/legal';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { PLAN_CYCLE, PLAN_LABEL } from '@/features/entitlement';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const enabled = useAppStore((s) => s.profile?.narrationEnabled ?? false);
  const voice = useAppStore((s) => s.profile?.narrationVoice ?? 'female');
  const speed = useAppStore((s) => s.profile?.narrationSpeed ?? 1);
  const entitlement = useEntitlement();
  const setEntitlementOverride = useAppStore((s) => s.setEntitlementOverride);
  const nextPlan = PLAN_CYCLE[(PLAN_CYCLE.indexOf(entitlement.plan) + 1) % PLAN_CYCLE.length];

  return (
    <Screen tone="warm">
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={colors.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h2">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="label" color={colors.slate} uppercase>Learning</Text>
        <SettingsRow
          title="Narration"
          subtitle={`${enabled ? 'Autoplay on' : 'Autoplay off'} · ${voice} · ${speed}×`}
          icon={<SpeakerIcon size={24} color={palette.forestDeep} muted={!enabled} />}
          onPress={() => router.push('/settings/narration' as never)}
        />

        <Text variant="label" color={colors.slate} uppercase>Account</Text>
        <SettingsRow
          title="Email sign-in & sync"
          subtitle={pairing ? 'Recover your account and link devices' : 'Sync is not configured'}
          icon={<AccountIcon />}
          onPress={() => router.push('/settings/devices' as never)}
        />
        <Text variant="caption" color={colors.slate}>
          Sign in by email to keep progress available across your devices. No password required.
        </Text>

        {__DEV__ && (
          <>
            <Text variant="label" color={colors.slate} uppercase>Developer</Text>
            <SettingsRow
              title={`Simulate plan · ${PLAN_LABEL[entitlement.plan]}`}
              subtitle="Dev only — tap to cycle Free → Pro → Elite. Never synced."
              icon={<PlanIcon />}
              onPress={() =>
                void setEntitlementOverride(nextPlan === 'free' ? null : nextPlan)
              }
            />
          </>
        )}

        <Text variant="label" color={colors.slate} uppercase>Legal</Text>
        <SettingsRow
          title="Privacy Policy"
          subtitle="What we collect and how it's handled"
          icon={<DocIcon />}
          onPress={() => openLegal('privacy')}
        />
        <SettingsRow
          title="Terms of Service"
          subtitle="Educational use only — not financial advice"
          icon={<DocIcon />}
          onPress={() => openLegal('terms')}
        />
      </ScrollView>
    </Screen>
  );
}

function SettingsRow({ title, subtitle, icon, onPress }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <CardSurface style={styles.row}>
        <View style={styles.rowIcon}>{icon}</View>
        <View style={styles.rowText}>
          <Text variant="h3">{title}</Text>
          <Text variant="caption" color={colors.slate}>{subtitle}</Text>
        </View>
        <Text variant="h2" color={colors.slateLight}>›</Text>
      </CardSurface>
    </Pressable>
  );
}

function AccountIcon() {
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24">
      <Path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 21a7.5 7.5 0 0115 0" fill="none" stroke={palette.forestDeep} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlanIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z"
        fill="none"
        stroke={palette.forestDeep}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DocIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"
        fill="none"
        stroke={palette.forestDeep}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  body: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: space.xxs },
});
