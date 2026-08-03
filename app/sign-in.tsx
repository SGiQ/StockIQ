import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PillButton, Screen, Text } from '@/components/primitives';
import { pairing } from '@/store';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, shadow, space, type as typeScale } from '@/theme/tokens';

const RESEND_SECONDS = 30;

/**
 * One passwordless entry point for both new and returning learners.
 *
 * We deliberately do not ask people to choose “sign up” or “sign in”. The
 * email proof is identical, and the server decides whether to restore an
 * existing account or secure the learner's current local profile.
 */
export default function SignIn() {
  const router = useRouter();
  const api = pairing;
  const codeRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  const normalisedEmail = email.trim().toLowerCase();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail);
  const resendSeconds = useMemo(
    () => Math.max(0, Math.ceil((resendAt - now) / 1000)),
    [now, resendAt],
  );

  useEffect(() => {
    if (step !== 'code') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === 'code') setTimeout(() => codeRef.current?.focus(), 150);
  }, [step]);

  const requestCode = async () => {
    if (!api) return;
    if (!emailLooksValid) {
      setStatus('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await api.requestEmailCode(normalisedEmail);
      setStep('code');
      setCode('');
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'We could not send a code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!api || code.trim().length !== 6) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.signInWithEmail(normalisedEmail, code.trim());
      await useAppStore.getState().hydrate();
      const acknowledged = useAppStore.getState().profile?.disclaimerAcknowledgedAt;
      router.replace(acknowledged ? '/(tabs)' : '/(onboarding)/choose-course');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'That code did not work. Try again.');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  if (!api) {
    return (
      <Screen tone="warm">
        <View style={styles.shell}>
          <Text variant="h1">Sign-in is temporarily unavailable.</Text>
          <Text variant="body" color={palette.inkSoft}>You can still learn without an account on this device.</Text>
          <PillButton label="Continue without an account" onPress={() => router.replace('/(onboarding)/welcome')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="warm">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.shell} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/landing'))}
            style={styles.back}
          >
            <Text variant="h2">‹</Text>
          </Pressable>

          <View style={styles.brandMark}><Text variant="h2" color={palette.paper}>S</Text></View>

          {step === 'email' ? (
            <>
              <View style={styles.copy}>
                <Text variant="h1">Continue with email</Text>
                <Text variant="body" color={palette.inkSoft}>
                  No password. We’ll send a six-digit code. New learners create an account; returning learners restore their progress.
                </Text>
              </View>

              <View style={styles.form}>
                <Text variant="label" color={palette.slate} uppercase>Email address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={requestCode}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  placeholder="you@example.com"
                  placeholderTextColor={palette.slateLight}
                  style={styles.input}
                />
                <PillButton label="Email me a code" onPress={requestCode} disabled={busy || !emailLooksValid} />
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text variant="caption" color={palette.slate}>or</Text>
                <View style={styles.divider} />
              </View>
              <PillButton
                label="Continue without an account"
                variant="ghost"
                onPress={() => router.replace('/(onboarding)/choose-course')}
              />
              <Text variant="caption" color={palette.slate} align="center">
                Guest progress stays on this device until you secure it with email.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.copy}>
                <Text variant="h1">Check your email</Text>
                <Text variant="body" color={palette.inkSoft}>
                  Enter the six-digit code sent to {normalisedEmail}.
                </Text>
                <Pressable onPress={() => { setStep('email'); setStatus(null); }} accessibilityRole="button">
                  <Text variant="bodySm" color={palette.forestDeep}>Use a different email</Text>
                </Pressable>
              </View>

              <View style={styles.form}>
                <Text variant="label" color={palette.slate} uppercase>Verification code</Text>
                <TextInput
                  ref={codeRef}
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  onSubmitEditing={verifyCode}
                  autoComplete="one-time-code"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={palette.slateLight}
                  style={[styles.input, styles.codeInput]}
                />
                <PillButton label="Continue" onPress={verifyCode} disabled={busy || code.length !== 6} />
                <PillButton
                  label={resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                  variant="ghost"
                  onPress={requestCode}
                  disabled={busy || resendSeconds > 0}
                />
              </View>
            </>
          )}

          {status ? (
            <View style={styles.status}>
              <Text variant="bodySm" color={palette.danger}>{status}</Text>
            </View>
          ) : null}

          <Text variant="caption" color={palette.slate} align="center">
            By continuing, you agree that StockIQ is educational and does not provide individualized financial advice.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shell: { flexGrow: 1, padding: space.lg, paddingBottom: space.xl, gap: space.lg },
  back: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  brandMark: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: palette.forestDeep, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  copy: { gap: space.sm },
  form: { gap: space.md },
  input: { minHeight: 58, borderWidth: 1.5, borderColor: palette.slateLight, borderRadius: radius.md, backgroundColor: palette.paper, paddingHorizontal: space.md, color: palette.ink, ...typeScale.body },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  divider: { flex: 1, height: 1, backgroundColor: palette.hairline },
  status: { borderRadius: radius.md, backgroundColor: palette.dangerSoft, padding: space.md },
});
