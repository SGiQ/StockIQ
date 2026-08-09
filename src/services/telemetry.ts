import { Platform } from 'react-native';
import { SYNC_URL } from '@/config';
import { getDeviceId } from '@/lib/deviceId';

export type TelemetryEvent =
  | 'lesson_started'
  | 'lesson_completed'
  | 'quiz_answered'
  | 'narration_played'
  | 'heart_lost'
  | 'out_of_hearts'
  | 'hearts_upsell_viewed'
  | 'client_error'
  | 'page_view'
  | 'web_vital';

/**
 * Fire-and-forget, first-party telemetry with a deliberately tiny vocabulary.
 * Arbitrary text is not accepted by this API or by the Railway endpoint.
 */
export async function trackTelemetry(
  event: TelemetryEvent,
  route?: string,
  detail?: string,
  value?: number,
): Promise<void> {
  if (!SYNC_URL) return;
  try {
    await fetch(`${SYNC_URL}/v1/telemetry`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-device-id': await getDeviceId(),
        'x-device-label': `${Platform.OS} telemetry`,
      },
      body: JSON.stringify({ event, route, detail, value }),
    });
  } catch {
    // Monitoring must never interrupt a lesson or become an offline error.
  }
}
