import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counselorLanguages, getCounselorMatch, sortCounselorMatches } from '../src/utils/counselorMatching.js';

const weekly = (...modes) => ({ daysConfig: modes.map((mode, i) => ({ dayIndex: i + 1, active: true, slots: [{ startHour: '09:00', endHour: '17:00', mode }] })) });
const match = (languages, modes = ['online'], preference = 'English', mode = 'online') => getCounselorMatch({ languages }, weekly(...modes), mode, preference);

test('recommendations require the preferred mode and language together', () => {
  assert.equal(match(['English', 'Hindi']).recommended, true);
  assert.equal(match(['Hindi']).recommended, false);
  assert.equal(match(['English'], ['offline']).recommended, false);
  assert.equal(match(['English'], ['online', 'offline'], 'English', 'offline').recommended, true);
});

test('language matching ignores case and whitespace but does not use partial matches', () => {
  assert.equal(match([' english '], ['online'], ' ENGLISH ').languageMatch, true);
  assert.equal(match(['English'], ['online'], 'Eng').languageMatch, false);
  assert.deepEqual(counselorLanguages('English, Hindi / Marathi'), ['English', 'Hindi', 'Marathi']);
});

test('missing preferences or schedules do not invent matches', () => {
  assert.equal(getCounselorMatch({ languages: ['English'] }, undefined, 'online', 'English').recommended, false);
  assert.equal(getCounselorMatch({ languages: ['English'] }, undefined, 'online', 'English').modeMatch, null);
  assert.equal(match(['English'], ['both']).recommended, false);
  assert.equal(match([], ['online']).recommended, false);
  assert.equal(match(['English'], ['online'], 'English', null).recommended, false);
});

test('when no language is preferred, a mode match is sufficient', () => {
  for (const preference of ['', 'No preference', 'Any language']) {
    assert.equal(match([], ['online'], preference).recommended, true);
    assert.equal(match([], ['online'], preference).languageMatch, null);
  }
});

test('inactive blocks and custom expertise do not affect recommendation eligibility', () => {
  const availability = weekly('online');
  availability.daysConfig[0].active = false;
  assert.equal(getCounselorMatch({ languages: ['English'], specialty: 'Marriage' }, availability, 'online', 'English').recommended, false);
  assert.equal(getCounselorMatch({ languages: ['English'], specialty: 'Unrelated' }, weekly('online'), 'online', 'English').recommended, true);
});

test('sorting surfaces full matches while retaining every counselor and the original list', () => {
  const counselors = [
    { id: '1', name: 'Language only', match: match(['English'], ['offline']) },
    { id: '2', name: 'Mode only', match: match(['Hindi']) },
    { id: '3', name: 'Zara', match: match(['English']) },
    { id: '4', name: 'Anna', match: match(['English']) },
  ];
  assert.deepEqual(sortCounselorMatches(counselors).map(c => c.id), ['4', '3', '2', '1']);
  assert.deepEqual(counselors.map(c => c.id), ['1', '2', '3', '4']);
});
