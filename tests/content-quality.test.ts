import assert from 'node:assert/strict';
import test from 'node:test';
import { allLessons, allStrategies } from '../src/content/index.generated';
import { initialStateFor } from '../src/components/player/cardState';

test('every lesson and strategy exposes authoritative HTTPS sources', () => {
  for (const item of [...allLessons, ...allStrategies]) {
    assert.ok(item.sources.length > 0, `${item.id} has no sources`);
    for (const source of item.sources) {
      assert.equal(new URL(source.url).protocol, 'https:', `${item.id}: ${source.url}`);
      assert.ok(source.publisher.length >= 5, `${item.id} has an unclear publisher`);
    }
  }
});

test('strategy paths include prerequisites, risk rules, quizzes, and sources', () => {
  for (const strategy of allStrategies) {
    assert.ok(strategy.prerequisiteLessons.length > 0, `${strategy.id}: no prerequisites`);
    assert.ok(strategy.riskManagement.length >= 2, `${strategy.id}: thin risk section`);
    assert.ok(strategy.sources.length > 0, `${strategy.id}: no sources`);
    assert.ok(
      strategy.guideCards?.some((card) => card.type === 'binary_choice' || card.type === 'fill_blank'),
      `${strategy.id}: guide has no retrieval practice`,
    );
  }
});

test('mobile-facing controls and labels stay within bounded content limits', () => {
  for (const lesson of allLessons) {
    assert.ok(lesson.title.length <= 70, `${lesson.id}: title too long`);
    for (const card of lesson.cards) {
      if (card.type === 'binary_choice') {
        assert.equal(new Set(card.options.map((option) => option.label)).size, 2);
        for (const option of card.options) {
          assert.ok(option.label.length <= 48, `${lesson.id}/${card.id}: option too long`);
        }
      }
      if ('art' in card && card.art?.kind === 'image') {
        assert.ok(card.art.alt.trim().length >= 8, `${lesson.id}/${card.id}: weak image alt`);
      }
    }
  }
});

test('Market Foundations uses editorial openings and explanatory scenes, not generic glyphs', () => {
  const marketLessons = allLessons.filter((lesson) => lesson.courseId === 'market-foundations');
  const concepts = marketLessons.flatMap((lesson) =>
    lesson.cards
      .filter((card) => card.type === 'concept')
      .map((card) => ({ lessonId: lesson.id, card })),
  );

  assert.equal(concepts.length, 35);
  for (const { lessonId, card } of concepts) {
    assert.ok(
      card.art?.kind === 'scene' || card.art?.kind === 'illustration',
      `${lessonId}/${card.id}: expected bespoke scene or editorial illustration`,
    );
    if (card.art?.kind === 'scene') {
      assert.ok(card.art.alt.length >= 24, `${lessonId}/${card.id}: scene needs useful alt text`);
    }
  }

  for (const lesson of marketLessons) {
    const opening = lesson.cards.find((card) => card.id === 'c1');
    assert.equal(opening && 'art' in opening ? opening.art?.kind : undefined, 'illustration', `${lesson.id}: opening is not editorial`);
    const insight = lesson.cards.find((card) => card.type === 'key_insight');
    assert.equal(insight?.art.kind, 'illustration', `${lesson.id}: insight poster is still generic`);
  }
});

test('fill-blank cards begin without exposing their word bank', () => {
  const blank = allLessons
    .flatMap((lesson) => lesson.cards)
    .find((card) => card.type === 'fill_blank');
  assert.ok(blank && blank.type === 'fill_blank');
  assert.deepEqual(initialStateFor(blank), {
    kind: 'blank',
    choicesOpen: false,
    checked: false,
  });
});
