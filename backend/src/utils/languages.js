// Central list of supported content languages. Add a new language here and it
// becomes available in Settings → Content Language, and both AI Writer and
// Generate SEO automatically use it — no other code changes needed.
//
// `isEnglish: true` uses a simpler, single-language prompt path (no bilingual
// keyword-embedding logic, since that pattern is specifically for sites that
// mix English proper nouns into a native-script language).

const LANGUAGES = {
  kannada:    { key: 'kannada',    label: 'Kannada',    nativeName: 'ಕನ್ನಡ',    isEnglish: false },
  hindi:      { key: 'hindi',      label: 'Hindi',      nativeName: 'हिन्दी',   isEnglish: false },
  tamil:      { key: 'tamil',      label: 'Tamil',      nativeName: 'தமிழ்',    isEnglish: false },
  telugu:     { key: 'telugu',     label: 'Telugu',     nativeName: 'తెలుగు',   isEnglish: false },
  malayalam:  { key: 'malayalam',  label: 'Malayalam',  nativeName: 'മലയാളం',   isEnglish: false },
  marathi:    { key: 'marathi',    label: 'Marathi',    nativeName: 'मराठी',    isEnglish: false },
  bengali:    { key: 'bengali',    label: 'Bengali',    nativeName: 'বাংলা',    isEnglish: false },
  gujarati:   { key: 'gujarati',   label: 'Gujarati',   nativeName: 'ગુજરાતી',  isEnglish: false },
  punjabi:    { key: 'punjabi',    label: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ',   isEnglish: false },
  urdu:       { key: 'urdu',       label: 'Urdu',       nativeName: 'اردو',     isEnglish: false },
  english:    { key: 'english',    label: 'English',    nativeName: 'English',  isEnglish: true },
};

const DEFAULT_LANGUAGE = 'kannada';

function getLanguageConfig(key) {
  return LANGUAGES[key] || LANGUAGES[DEFAULT_LANGUAGE];
}

module.exports = { LANGUAGES, DEFAULT_LANGUAGE, getLanguageConfig };
