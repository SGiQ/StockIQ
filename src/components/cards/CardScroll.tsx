import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { TapZones } from '@/components/player/TapZones';

export interface CardNavigation {
  onBack: () => void;
  onForward: () => void;
}

/**
 * The deck's navigation, provided by the player so a card that has to scroll
 * can keep tap-to-navigate working on its own surface (see below). Absent
 * outside the player — the saved-card viewer — where there is nothing to
 * navigate to.
 */
export const CardNavigationContext = createContext<CardNavigation | null>(null);

export interface CardScrollProps {
  children: ReactNode;
  /**
   * True when nothing inside is a touch target. A fitting inert card is then
   * wholly pointer-transparent, exactly as its plain View was; a quiz card
   * is `box-none` instead so its options stay tappable.
   */
  inert?: boolean;
  /** Defaults to filling the card slot. */
  style?: StyleProp<ViewStyle>;
  /** Defaults to growing to the slot, so a card's wash still covers it. */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * A card body that fits when it can and scrolls when it must.
 *
 * Every card was laid out for the native deck, where the stage is ~620pt
 * tall. A phone *browser* is a different shape: Safari's address bar and
 * toolbar take ~200pt off an iPhone 14, and at that height a four-bullet
 * recap, a diagram's caption, the poster's text panel and a quiz's
 * explanation all ran past the bottom of the stage, which clips. A plain
 * ScrollView would fix the clipping but break the deck's tap model — the
 * navigation zones sit *beneath* the deck and rely on inert card content
 * letting taps fall through, and a scroll container would swallow them.
 *
 * So this measures. While the content fits, the region is pointer-
 * transparent (`none`, or `box-none` for a card with buttons) and the card
 * behaves exactly as before. Once the content is measured taller than its
 * room, scrolling switches on, the region starts owning touches, and a
 * second set of tap zones is laid under the scrolled content so a tap on it
 * still navigates: a drag scrolls, a tap on inert content steps, a tap on a
 * button presses it.
 */
export function CardScroll({
  children,
  inert = false,
  style,
  contentContainerStyle,
}: CardScrollProps) {
  const navigation = useContext(CardNavigationContext);

  // Measured, not assumed: the room a card gets depends on the viewport, and
  // its height on its author.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const overflows = viewportHeight > 0 && contentHeight > viewportHeight + 1;

  return (
    <ScrollView
      style={[styles.scroll, style]}
      // box-none on the content container is load-bearing on web: it is what
      // lets a tap on inert content pass through to the zones beneath (or,
      // when scrolling, to the zones laid under the content here) instead of
      // being swallowed by the container itself.
      contentContainerStyle={[styles.content, contentContainerStyle]}
      pointerEvents={overflows ? 'auto' : inert ? 'none' : 'box-none'}
      scrollEnabled={overflows}
      showsVerticalScrollIndicator={overflows}
      onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      onContentSizeChange={(_w, h) => setContentHeight(h)}
    >
      {overflows && navigation ? (
        <TapZones onBack={navigation.onBack} onForward={navigation.onForward} />
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    pointerEvents: 'box-none',
  },
});
