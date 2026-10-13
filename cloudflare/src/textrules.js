// Rules for text that other players read: titles, notes, comments and reviews. It is plain text, always: it is stored as
// typed (after control and direction marks are removed), sent as JSON, and drawn by the game with textContent, so no
// markup in it can ever run. On top of the contact and link rules of `cleanText`, public text may not carry markup-like
// tags, a long run of one character, or wording the market does not allow.
import { ApiError, cleanText } from './util.js';

// A short, blunt list of words that are never part of a friendly trade. Letters are compared after common
// look-alike digits and symbols are folded back, and with separators removed, so "f.u.c.k" and "sh1t" are caught.
// This is a speed bump, not moderation: reports and the operator's tools are the real answer.
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'whore', 'slut', 'nigg', 'faggot', 'retard', 'dickhead', 'kys', 'killyourself', 'rape'];
const FOLD = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
const SEPARATORS = /[\s._\-*+~|\\/,;:'"`^]+/g;

function folded(token) {
  return token.toLowerCase().replace(/[013457@$!]/g, (c) => FOLD[c]).replace(SEPARATORS, '').replace(/(.)\1{2,}/g, '$1$1');
}
// Word by word, so a longer, innocent word that merely contains a short one ("grape", "skyscraper") is not caught.
// A blocked word matches whole or as the start of a longer form ("shitty"); "kys" and "rape" only whole.
export function hasBlockedWording(text) {
  return String(text).split(/\s+/).some((token) => {
    const t = folded(token);
    return t && BLOCKED.some((w) => t === w || (w.length >= 4 && w !== 'rape' && t.startsWith(w)));
  });
}

export function cleanPublicText(raw, max, what) {
  const text = cleanText(raw, max, what);
  if (!text) return text;
  if (/<\s*\/?\s*[a-z!][^>]*>/i.test(text) || /&#?[a-z0-9]{2,8};/i.test(text)) throw new ApiError(422, 'markup', 'The ' + what + ' is plain text. Take out anything that looks like a tag or a code.');
  if (/(.)\1{9,}/.test(text)) throw new ApiError(422, 'spam', 'The ' + what + ' repeats the same character too many times.');
  if (hasBlockedWording(text)) throw new ApiError(422, 'wording', 'Please keep the ' + what + ' friendly. That wording is not allowed here.');
  return text;
}

// The same text, for comparing a repeat: case, spacing and punctuation do not make a comment a new one.
export function sameness(text) { return String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
