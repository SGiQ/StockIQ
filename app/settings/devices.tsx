import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { PillButton, Screen, Text } from '@/components/primitives';
import {
  AppleSignInCancelled,
  isAppleSignInAvailable,
  signInWithApple,
} from '@/lib/appleAuth';
import { pairing } from '@/store';
import { palette, radius, space, type as typeScale } from '@/theme/tokens';

/**
 * Device pairing and revocation.
 *
 * Two honest points are on the screen rather than buried in a doc: a code
 * gives away access to everything in the account, and revoking is how you
 * handle a lost phone.
 */
export default function DevicesSettings() {
  // Captured locally: TypeScript will not carry a narrowing of an imported
  // binding into the callbacks below, and an optional capability is exactly
  // the case where that matters.
  const api = pairing;

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [entry, setEntry] = useState('');
  const [devices, setDevices] = useState<
    Array<{ id: string; label: string | null; lastSeenAt: number }>
  >([]);
  const [thisDevice, setThisDevice] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      const list = await api.listDevices();
      setDevices(list.devices);
      setThisDevice(list.thisDeviceId);
    } catch {
      setStatus('Could not reach sync. Your data is safe on this device.');
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sync is off entirely when no URL is configured. Say so plainly rather
  // than showing controls that cannot work.
  if (!api) {
    return (
      <Screen>
        <View style={styles.note}>
          <Text variant="body" color={palette.inkSoft}>
            Sync is not set up, so this app keeps everything on this device only.
            Nothing is uploaded and there is nothing to pair.
          </Text>
        </View>
      </Screen>
    );
  }

  const showCode = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const link = await api.startLink();
      setCode(link.code);
      setExpiresAt(link.expiresAt);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create a code.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const value = entry.trim();
    if (!value) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.joinAccount(value);
      setEntry('');
      setStatus('Linked. Your progress from both devices has been merged.');
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not link this device.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      await api.revokeDevice(id);
      await refresh();
      setStatus('Device removed. It can no longer read this account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not remove that device.');
    } finally {
      setBusy(false);
    }
  };

  const appleSignIn = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const credential = await signInWithApple();
      await api.signInWithApple(credential.identityToken, credential.nonce);
      setStatus('Signed in. This account can now be recovered on a new device.');
      await refresh();
    } catch (error) {
      // Cancelling is a choice, not a failure — saying "sign-in failed" after
      // someone deliberately backed out is just wrong.
      if (error instanceof AppleSignInCancelled) return;
      setStatus(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const sendEmailCode = async () => {
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.requestEmailCode(value);
      setCodeSent(true);
      // Worded so it is true whether or not that address has an account. The
      // server answers identically either way, and saying "we found your
      // account" here would leak exactly what it withholds.
      setStatus(`If ${value} can receive mail, a code is on its way.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send a code.');
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    const value = emailCode.trim();
    if (!value) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.signInWithEmail(email.trim(), value);
      setEmailCode('');
      setCodeSent(false);
      setStatus('Signed in. This account can now be recovered by email.');
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const minutesLeft = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="label" color={palette.slate} uppercase>
          Recovery
        </Text>
        {appleAvailable ? (
          <>
            <Text variant="body" color={palette.inkSoft}>
              Sign in with Apple so this account can be restored if you lose
              every device. StockIQ asks for no name or email — only the
              anonymous identifier Apple issues for this app.
            </Text>
            <PillButton label="Sign in with Apple" onPress={appleSignIn} disabled={busy} />
            <Text variant="caption" color={palette.slate}>
              Or use email below — it works on any device.
            </Text>
          </>
        ) : (
          <Text variant="body" color={palette.inkSoft}>
            Use email below to secure this account so it can be recovered if you
            lose your devices. Sign in with Apple is not available in Expo Go —
            it needs a development build — and it is an alternative to email
            rather than an addition, so nothing is missing here.
          </Text>
        )}

        <View style={styles.divider} />

        <Text variant="label" color={palette.slate} uppercase>
          Email sign-in
        </Text>
        <Text variant="body" color={palette.inkSoft}>
          We send a six-digit code. There is no password to remember, and you
          can type the code on a different device from the one that received it.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          placeholderTextColor={palette.slateLight}
          style={styles.input}
        />
        <PillButton
          label={codeSent ? 'Send another code' : 'Email me a code'}
          onPress={sendEmailCode}
          disabled={busy || !email.trim()}
        />

        {codeSent ? (
          <>
            <TextInput
              value={emailCode}
              onChangeText={setEmailCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              placeholder="6-digit code"
              placeholderTextColor={palette.slateLight}
              style={styles.input}
              maxLength={6}
            />
            <PillButton
              label="Sign in"
              onPress={verifyEmailCode}
              disabled={busy || emailCode.trim().length !== 6}
            />
          </>
        ) : null}

        <View style={styles.divider} />

        <Text variant="label" color={palette.slate} uppercase>
          Add another device
        </Text>
        <Text variant="body" color={palette.inkSoft}>
          Show a code here, then type it into StockIQ on your other device. Both
          devices keep their progress — nothing is replaced.
        </Text>

        {code ? (
          <View style={styles.codeBox}>
            <Text variant="display" color={palette.ink} align="center">
              {code}
            </Text>
            <Text variant="caption" color={palette.slate} align="center">
              {minutesLeft > 0 ? `Expires in about ${minutesLeft} min` : 'Expired'}
            </Text>
          </View>
        ) : null}

        <PillButton label={code ? 'New code' : 'Show a code'} onPress={showCode} disabled={busy} />

        <Text variant="caption" color={palette.slate}>
          Anyone who types this code can read and change everything in your
          account until it expires. Only share it with your own device.
        </Text>

        <View style={styles.divider} />

        <Text variant="label" color={palette.slate} uppercase>
          Enter a code
        </Text>
        <TextInput
          value={entry}
          onChangeText={setEntry}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="8-character code"
          placeholderTextColor={palette.slateLight}
          style={styles.input}
          maxLength={12}
        />
        <PillButton label="Link this device" onPress={join} disabled={busy || !entry.trim()} />

        {status ? (
          <Text variant="caption" color={palette.inkSoft}>
            {status}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <Text variant="label" color={palette.slate} uppercase>
          Linked devices
        </Text>
        {devices.length === 0 ? (
          <Text variant="caption" color={palette.slate}>
            No devices yet.
          </Text>
        ) : (
          devices.map((device) => (
            <View key={device.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="body" color={palette.ink}>
                  {device.label ?? 'Unnamed device'}
                  {device.id === thisDevice ? ' · this device' : ''}
                </Text>
                <Text variant="caption" color={palette.slate}>
                  Last seen {new Date(device.lastSeenAt).toLocaleDateString()}
                </Text>
              </View>
              {device.id === thisDevice ? null : (
                <PillButton label="Remove" onPress={() => revoke(device.id)} disabled={busy} />
              )}
            </View>
          ))
        )}
        <Text variant="caption" color={palette.slate}>
          Removing a device stops it reading this account. Use it if you lose a
          phone — the other devices are unaffected.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.xxl },
  note: { padding: space.lg },
  codeBox: {
    backgroundColor: palette.paperWarm,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    gap: space.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.slateLight,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typeScale.body.fontSize,
    color: palette.ink,
    letterSpacing: 2,
  },
  divider: { height: 1, backgroundColor: palette.slateLight, opacity: 0.4, marginVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  rowText: { flex: 1, gap: 2 },
});
