import assert from 'node:assert/strict';
import test from 'node:test';
import { withProfileDefaults, type UserProfile } from '../src/store/repository';

test('older profiles receive safe narration defaults on read', () => {
  const legacy = {
    id: 'profile',
    updatedAt: 1,
    deletedAt: null,
    totalXp: 20,
    selectedCourseId: 'market-foundations',
    hasSeenPlayerTutorial: true,
    disclaimerAcknowledgedAt: 123,
  } as UserProfile;

  assert.deepEqual(withProfileDefaults(legacy), {
    ...legacy,
    experienceLevel: null,
    primaryGoal: null,
    learningGoals: [],
    dailyGoalMinutes: null,
    questClaims: [],
    lastSeenWeeklyNoteDate: null,
    assessmentBestScore: null,
    assessmentLastTakenAt: null,
    assessmentAttempts: 0,
    narrationEnabled: false,
    narrationVoice: 'female',
    narrationSpeed: 1,
    maleVoiceVote: null,
  });
});

test('stored narration preferences win over defaults', () => {
  const current: UserProfile = {
    id: 'profile',
    updatedAt: 1,
    deletedAt: null,
    totalXp: 20,
    selectedCourseId: null,
    hasSeenPlayerTutorial: true,
    disclaimerAcknowledgedAt: 123,
    experienceLevel: 'some',
    primaryGoal: 'invest',
    learningGoals: ['invest'],
    dailyGoalMinutes: 5,
    questClaims: [],
    lastSeenWeeklyNoteDate: null,
    assessmentBestScore: 0.9,
    assessmentLastTakenAt: 456,
    assessmentAttempts: 2,
    narrationEnabled: true,
    narrationVoice: 'male',
    narrationSpeed: 1.25,
    maleVoiceVote: 'cedar',
  };

  assert.equal(withProfileDefaults(current).narrationEnabled, true);
  assert.equal(withProfileDefaults(current).narrationVoice, 'male');
  assert.equal(withProfileDefaults(current).narrationSpeed, 1.25);
  assert.equal(withProfileDefaults(current).maleVoiceVote, 'cedar');
});
