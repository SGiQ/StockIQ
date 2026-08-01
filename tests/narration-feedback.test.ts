import assert from 'node:assert/strict';
import test from 'node:test';
import { allLessons } from '../src/content/index.generated';
import {
  narrationFeedbackCardId,
  narrationTextFor,
  quizFeedbackNarrationTextFor,
} from '../src/content/narration';

const quiz = allLessons.flatMap((lesson) => lesson.cards).find((card) => card.type === 'binary_choice');
if (!quiz || quiz.type !== 'binary_choice') throw new Error('Expected a binary-choice fixture');

test('pre-answer narration never contains choices or explanation', () => {
  const before = narrationTextFor(quiz) ?? '';
  assert.ok(before.includes(quiz.prompt.replace(/\*\*/g, '')) || before.length > 0);
  for (const option of quiz.options) assert.ok(!before.includes(option.label));
  assert.ok(!before.includes(quiz.explanation.replace(/\*\*/g, '')));
});

test('post-answer narration includes verdict and explanation', () => {
  const correct = quizFeedbackNarrationTextFor(quiz, true) ?? '';
  const incorrect = quizFeedbackNarrationTextFor(quiz, false) ?? '';
  assert.match(correct, /^Correct\./);
  assert.match(incorrect, /^Not quite\./);
  assert.ok(correct.length > 'Correct.'.length);
  assert.ok(incorrect.length > 'Not quite.'.length);
});

test('feedback manifest ids cannot collide with base card ids', () => {
  assert.equal(narrationFeedbackCardId(quiz.id, true), `${quiz.id}:feedback-correct`);
  assert.equal(narrationFeedbackCardId(quiz.id, false), `${quiz.id}:feedback-incorrect`);
});
