/**
 * Turns a rendered key-insight poster into a shareable image.
 *
 * The poster is captured from the live view rather than redrawn for export,
 * which is precisely why `key_insight` has fixed geometry (square art panel
 * over a black text panel) and why `insight` is plain text — one layout
 * captures cleanly at any size, with no separate export renderer to keep in
 * sync with the on-screen one.
 */
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export type ShareResult = 'shared' | 'unavailable' | 'failed';

export async function shareViewAsImage(
  ref: React.RefObject<unknown>,
  fileName = 'stockiq-insight',
): Promise<ShareResult> {
  if (!ref.current) return 'failed';

  // Sharing is a native module; on web there is nothing to hand the file to.
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }

  try {
    const uri = await captureRef(ref as never, {
      format: 'png',
      quality: 1,
      // 2x so the poster stays crisp when it lands in a messaging app.
      result: 'tmpfile',
      fileName,
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share this insight',
      UTI: 'public.png',
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}
