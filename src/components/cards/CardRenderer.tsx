import type { Card } from '@/content/types';
import type { CardUiState } from '@/components/player/cardState';
import { BinaryChoiceCardView } from './BinaryChoiceCardView';
import { ConceptCardView } from './ConceptCardView';
import { DiagramCardView } from './DiagramCardView';
import { FillBlankCardView } from './FillBlankCardView';
import { KeyInsightCardView } from './KeyInsightCardView';
import { MainIdeaCardView } from './MainIdeaCardView';
import { StickerRevealCardView } from './StickerRevealCardView';

export interface CardRendererProps {
  card: Card;
  state: CardUiState;
  onStateChange: (next: CardUiState) => void;
  onAnswered: (correct: boolean) => void;
  onAdvance: () => void;
  /** Applied to the interactive block when a blocked forward tap shakes it. */
  shakeStyle?: object;
}

/**
 * Dispatches a card to its view.
 *
 * The `never` assignment in the default branch is the point of this file:
 * adding a card type to the schema becomes a compile error here, so the
 * content model and the UI cannot silently drift apart.
 */
export function CardRenderer({
  card,
  state,
  onStateChange,
  onAnswered,
  onAdvance,
  shakeStyle,
}: CardRendererProps) {
  switch (card.type) {
    case 'concept':
      return <ConceptCardView card={card} />;

    case 'diagram':
      return <DiagramCardView card={card} />;

    case 'sticker_reveal':
      return <StickerRevealCardView card={card} state={state} onChange={onStateChange} />;

    case 'binary_choice':
      return (
        <BinaryChoiceCardView
          card={card}
          state={state}
          onChange={onStateChange}
          onAnswered={onAnswered}
          shakeStyle={shakeStyle}
        />
      );

    case 'fill_blank':
      return (
        <FillBlankCardView
          card={card}
          state={state}
          onChange={onStateChange}
          onAnswered={onAnswered}
          shakeStyle={shakeStyle}
        />
      );

    case 'main_idea':
      return <MainIdeaCardView card={card} onContinue={onAdvance} />;

    case 'key_insight':
      return <KeyInsightCardView card={card} />;

    default: {
      const exhaustive: never = card;
      return exhaustive;
    }
  }
}
