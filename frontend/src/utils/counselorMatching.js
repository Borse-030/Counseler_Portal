import { sessionMode, sessionTypesForAvailability } from './sessionMode.js';

const normalize = value => String(value || '').trim().toLocaleLowerCase();
export const counselorLanguages = languages => (Array.isArray(languages) ? languages : String(languages || '').split(/[,;/]/))
  .map(value => String(value).trim()).filter(Boolean);

export const getCounselorMatch = (counselor, availability, preferredMode, preferredLanguage) => {
  const languages = counselorLanguages(counselor.languages);
  const language = normalize(preferredLanguage);
  const hasLanguagePreference = Boolean(language && !['any', 'any language', 'no preference', 'not specified'].includes(language));
  const languageMatch = hasLanguagePreference ? languages.some(value => normalize(value) === language) : null;
  const supportedModes = availability ? [...new Set(sessionTypesForAvailability(availability).map(type => sessionMode(type.name)))] : [];
  const modeMatch = availability && preferredMode ? supportedModes.includes(preferredMode) : null;
  return {
    languages, supportedModes, modeMatch, languageMatch,
    recommended: modeMatch === true && languageMatch !== false,
    score: (modeMatch === true ? 2 : 0) + (languageMatch === true ? 1 : 0),
  };
};

export const sortCounselorMatches = counselors => [...counselors].sort((a, b) =>
  Number(b.match.recommended) - Number(a.match.recommended)
  || b.match.score - a.match.score || (a.name || '').localeCompare(b.name || ''));
