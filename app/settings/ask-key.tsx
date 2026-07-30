import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Glyph } from '@/components/art/Glyph';
import { PillButton, Screen, Text } from '@/components/primitives';
import { askService } from '@/services/ask';
import { palette, radius, space, type as typeScale } from '@/theme/tokens';

/**
 * Bring-your-own-key entry.
 *
 * The honest framing is on the screen, not buried: this is the learner's own
 * key, on their own device, spending their own credits. It never leaves the
 * phone except to api.anthropic.com, and it is stored in the OS keychain
 * rather than in app storage.
 */
export default function AskKeySettings() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setConfigured(await askService.isConfigured());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await askService.saveKey(trimmed);
      setDraft('');
      setStatus('Saved to your device keychain.');
      await refresh();
    } catch {
      setStatus('Could not save the key on this device.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await askService.clearKey();
      setStatus('Key removed.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

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
              stroke={palette.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3" color={palette.ink}>
          ASK
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Glyph name="lightbulb" size={28} color={palette.paper} />
          </View>
          <Text variant="h2" color={palette.ink}>
            Ask Claude about any card.
          </Text>
          <Text variant="body" color={palette.slate}>
            ASK answers questions about the card you are looking at, using Claude. It runs on
            your own Anthropic API key.
          </Text>
        </View>

        <View style={[styles.statusPill, configured ? styles.statusOn : styles.statusOff]}>
          <Text
            variant="label"
            color={configured ? palette.forestDeep : palette.slate}
            uppercase
          >
            {configured === null ? 'Checking…' : configured ? 'Key saved' : 'Not set up'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text variant="label" color={palette.slate} uppercase>
            {configured ? 'Replace key' : 'Anthropic API key'}
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="sk-ant-…"
            placeholderTextColor={palette.slateLight}
            autoCapitalize="none"
            autoCorrect={false}
            // The key is a credential: mask it, keep it out of the keyboard's
            // learned-word store, and never log it.
            secureTextEntry
            style={styles.input}
            accessibilityLabel="Anthropic API key"
          />
          <PillButton
            label={busy ? 'Saving…' : 'Save key'}
            variant="dark"
            disabled={busy || draft.trim().length === 0}
            onPress={save}
          />
          {configured && (
            <PillButton label="Remove key" variant="ghost" disabled={busy} onPress={clear} />
          )}
          {status && (
            <Text variant="caption" color={palette.slate} align="center">
              {status}
            </Text>
          )}
        </View>

        <View style={styles.notice}>
          <Text variant="label" color={palette.slate} uppercase>
            Where the key goes
          </Text>
          <Text variant="bodySm" color={palette.inkSoft}>
            It is stored in this device&apos;s keychain and sent only to api.anthropic.com. It
            is never uploaded to StockIQ, and StockIQ has no server. Requests are billed to your
            own Anthropic account.
          </Text>
          <Text variant="bodySm" color={palette.inkSoft}>
            This bring-your-own-key setup is for personal use. An app distributed to other
            people would need a small server holding the key instead — an API key inside a
            shipped app can always be extracted from it.
          </Text>
          <Pressable onPress={() => void Linking.openURL('https://console.anthropic.com/settings/keys')}>
            <Text variant="bodySm" color={palette.azure}>
              Create a key in the Anthropic Console →
            </Text>
          </Pressable>
        </View>

        <Text variant="caption" color={palette.slateLight} align="center">
          ASK is educational only. It will not recommend investments.
        </Text>
      </ScrollView>
    </Screen>
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
  body: {
    padding: space.lg,
    gap: space.xl,
    paddingBottom: space.xxl,
  },
  hero: {
    gap: space.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.askFrom,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  statusOn: {
    backgroundColor: palette.mint,
  },
  statusOff: {
    backgroundColor: palette.hairline,
  },
  field: {
    gap: space.sm,
  },
  input: {
    ...typeScale.body,
    color: palette.ink,
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  notice: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
});
