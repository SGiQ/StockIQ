import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

/**
 * Owns one short-lived card narrator.
 *
 * The Expo hook releases the native/web player on unmount. This wrapper also
 * pauses and rewinds whenever the source changes, narration is disabled, or
 * the caller exits, so a clip can never continue over the next card/screen.
 */
export function useNarration(source: string | null, enabled: boolean) {
  const player = useAudioPlayer(null, { downloadFirst: true, updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const enabledRef = useRef(enabled);
  const startedFromControl = useRef(false);
  enabledRef.current = enabled;

  const stop = useCallback(() => {
    player.pause();
    void player.seekTo(0).catch(() => {
      // A source that failed to load has nothing to rewind. Narration should
      // degrade silently rather than interrupting the lesson with an error.
    });
  }, [player]);

  const play = useCallback(() => {
    if (!source) return;
    startedFromControl.current = true;
    try {
      player.play();
    } catch {
      // Browser autoplay policy or a failed download can reject playback.
      // The visible card remains completely usable.
    }
  }, [player, source]);

  useEffect(() => {
    player.pause();
    try {
      player.replace(source);
      if (enabledRef.current && source) player.play();
    } catch {
      // A bad/missing remote clip is equivalent to no narration for the card.
    }

    return () => {
      player.pause();
    };
  }, [player, source]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    // Pressing the in-player control starts playback synchronously so web's
    // user-gesture policy can permit it. When the persisted preference lands
    // a moment later, do not restart that same clip from the beginning.
    if (startedFromControl.current) {
      startedFromControl.current = false;
      return;
    }
    if (source) {
      try {
        player.play();
      } catch {
        // See the silent-degradation contract above.
      }
    }
  }, [enabled, player, source, stop]);

  return {
    available: source !== null,
    playing: status.playing,
    error: status.error,
    play,
    stop,
  };
}
