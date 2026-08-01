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
    narrationEnabled: false,
    narrationVoice: 'female',
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
    narrationEnabled: true,
    narrationVoice: 'male',
  };

  assert.equal(withProfileDefaults(current).narrationEnabled, true);
  assert.equal(withProfileDefaults(current).narrationVoice, 'male');
});
