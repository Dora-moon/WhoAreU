/**
 * @file ScoringEngine.js
 * @description Modular 3-Stage Scoring Engine for candidate matching.
 * Stage 1: Hard Constraints (Country, Gender, Ethnicity, Era, Religion)
 * Stage 2: Weighted Similarity with HOBBY_SEMANTIC_MAP
 * Stage 3: Cutoff & Rarity tier mapping
 */

import { HOBBY_SEMANTIC_MAP, hobbyKeywordsFor } from './UserProfileModel.js';

/**
 * Semantic map for hobby/trait keyword expansion (VI & EN).
 * Each key maps to an array of lowercase keyword tokens.
 * Used by Stage 2 weighted similarity for hobby & customTrait matching.
 */
export const HOBBY_SEMANTIC_MAP_EXPORT = HOBBY_SEMANTIC_MAP;

/**
 * Evaluates a candidate against user inputs using the 3-stage engine.
 *
 * @param {Object} candidate - Parsed candidate card with metadata (countryId, gender, ethnicity, religion, birth, death, text, summary, etc.)
 * @param {Object} userInputs - Filter inputs from UserProfileModel.getInputs()
 * @returns {Object} { pass: boolean, score: number (0-100), matchedCriteria: Object, hobbyMatch: number }
 */
export function evaluateCandidateMatch(candidate, userInputs) {
  // ---------- STAGE 1: HARD CONSTRAINTS ----------
  // Immediately reject if metadata explicitly contradicts active filters (not 'any')

  // Country constraint
  if (userInputs.country && userInputs.country !== 'any') {
    if (candidate.countryId && candidate.countryId !== userInputs.country) {
      // Check if text contains the target country as alternative match
      const cItem = candidate.text?.toLowerCase() || '';
      const countryKeywords = getCountryKeywords(userInputs.country);
      if (!countryKeywords.some(kw => cItem.includes(kw.toLowerCase()))) {
        return { pass: false, score: 0, reason: 'country mismatch' };
      }
    }
  }

  // Gender constraint
  if (userInputs.tgender && userInputs.tgender !== 'any') {
    if (candidate.gender && candidate.gender !== userInputs.tgender) {
      return { pass: false, score: 0, reason: 'gender mismatch' };
    }
  }

  // Ethnicity constraint
  if (userInputs.ethnicity && userInputs.ethnicity !== 'any' && userInputs.ethnicity !== 'custom') {
    if (candidate.ethnicity && candidate.ethnicity !== userInputs.ethnicity) {
      // Check regex match in text
      const ethRegex = getEthnicityRegex(userInputs.ethnicity);
      if (ethRegex && !ethRegex.test(candidate.text || '')) {
        return { pass: false, score: 0, reason: 'ethnicity mismatch' };
      }
    }
  }

  // Religion constraint
  if (userInputs.religion && userInputs.religion !== 'any') {
    if (candidate.religion && candidate.religion !== userInputs.religion) {
      const relRegex = getReligionRegex(userInputs.religion);
      if (relRegex && !relRegex.test(candidate.text || '')) {
        return { pass: false, score: 0, reason: 'religion mismatch' };
      }
    }
  }

  // Era constraint (1900-2026)
  const minYear = Number(userInputs.selectedMinYear || userInputs.eraYear || userInputs.year || userInputs.era || 1900);
  if (minYear > 500 && candidate.birth != null) {
    if (!isFigureInTimeframe(candidate, minYear, 2026)) {
      return { pass: false, score: 0, reason: 'era mismatch' };
    }
  }

  // ---------- STAGE 2: WEIGHTED SIMILARITY ----------
  // Weights summing to 100
  const WT = {
    country: 25,
    ethnicity: 20,
    gender: 20,
    era: 15,
    religion: 15,
    hobby: 25  // includes customTrait
  };

  const scores = {};
  let totalWeighted = 0;

  // Country match
  if (userInputs.country === 'any' || candidate.universe === 'fictional') {
    scores.country = 0.85;
  } else if (candidate.countryId === userInputs.country) {
    scores.country = 1.0;
  } else {
    const cItem = candidate.text?.toLowerCase() || '';
    const countryKeywords = getCountryKeywords(userInputs.country);
    scores.country = countryKeywords.some(kw => cItem.includes(kw.toLowerCase())) ? 0.9 : 0.15;
  }

  // Ethnicity match
  if (userInputs.ethnicity === 'any' || candidate.universe === 'fictional') {
    scores.ethnicity = 0.85;
  } else if (userInputs.ethnicity === 'custom' && userInputs.ethnicityCustom) {
    scores.ethnicity = (candidate.text || '').toLowerCase().includes(userInputs.ethnicityCustom.toLowerCase()) ? 1.0 : 0.2;
  } else if (candidate.ethnicity === userInputs.ethnicity) {
    scores.ethnicity = 1.0;
  } else {
    const ethRegex = getEthnicityRegex(userInputs.ethnicity);
    scores.ethnicity = (ethRegex && ethRegex.test(candidate.text || '')) ? 0.9 : 0.15;
  }

  // Gender match
  if (userInputs.tgender === 'any' || !userInputs.tgender) {
    scores.gender = 0.7;
  } else if (candidate.gender) {
    scores.gender = candidate.gender === userInputs.tgender ? 1.0 : 0.05;
  } else {
    scores.gender = 0.4;
  }

  // Era match
  if (candidate.universe === 'fictional' || minYear <= 500) {
    scores.era = 1.0;
  } else if (candidate.birth != null && candidate.birth >= minYear && candidate.birth <= 2026) {
    scores.era = 1.0;
  } else if (candidate.death != null && candidate.death >= minYear && (candidate.birth == null || candidate.birth <= 2026)) {
    scores.era = 0.95;
  } else if (isFigureInTimeframe(candidate, minYear, 2026)) {
    scores.era = 0.9;
  } else if (candidate.birth != null) {
    const dist = candidate.birth < minYear ? minYear - candidate.birth : candidate.birth - 2026;
    scores.era = Math.min(1, Math.max(0.05, 1 - dist / 60));
  } else {
    scores.era = 0.4;
  }

  // Religion match
  if (userInputs.religion === 'any' || candidate.universe === 'fictional') {
    scores.religion = 0.85;
  } else if (candidate.religion === userInputs.religion) {
    scores.religion = 1.0;
  } else {
    const relRegex = getReligionRegex(userInputs.religion);
    scores.religion = (relRegex && relRegex.test(candidate.text || '')) ? 0.9 : 0.15;
  }

  // Hobby & customTrait match (using HOBBY_SEMANTIC_MAP)
  const hobbyInput = (userInputs.hobbies || '') + ' ' + (userInputs.trait || '');
  const hobbyKeywords = hobbyKeywordsFor(userInputs.hobbies, userInputs.trait);

  if (hobbyKeywords.length === 0) {
    scores.hobby = 0.15;
  } else {
    const text = (candidate.text || '').toLowerCase();
    let hits = 0;
    for (const kw of hobbyKeywords) {
      if (text.includes(kw.toLowerCase())) hits++;
    }
    scores.hobby = Math.min(1, 0.15 + hits * 0.35);
  }

  // Compute weighted total
  for (const key of Object.keys(WT)) {
    totalWeighted += (scores[key] || 0) * WT[key];
  }

  const rawScore = Math.min(100, Math.round(totalWeighted));

  // Apply universe multiplier
  const targetUniverse = userInputs.universe || 'historical';
  const cardUniverse = candidate.universe || 'historical';
  let universeMultiplier = 1.0;
  if (targetUniverse === 'multiverse') {
    universeMultiplier = 1.0;
  } else if (targetUniverse !== cardUniverse) {
    universeMultiplier = 0.35;
  }

  const finalScore = Math.min(100, Math.round(rawScore * universeMultiplier));

  // ---------- STAGE 3: CUTOFF & RARITY ----------
  // Count active filters (not 'any')
  let activeFilters = 0;
  if (userInputs.country && userInputs.country !== 'any') activeFilters++;
  if (userInputs.ethnicity && userInputs.ethnicity !== 'any' && userInputs.ethnicity !== 'custom') activeFilters++;
  if (userInputs.religion && userInputs.religion !== 'any') activeFilters++;
  if (userInputs.tgender && userInputs.tgender !== 'any') activeFilters++;
  if (minYear > 500) activeFilters++; // era filter active

  // Apply cutoff
  let cutoff = 30; // fallback
  if (activeFilters >= 2) {
    cutoff = 45;
  }

  if (finalScore < cutoff) {
    // If fewer than 10 candidates would survive, relax to 30%
    // (handled by caller based on pool size)
    return {
      pass: false,
      score: finalScore,
      matchedCriteria: scores,
      hobbyMatch: scores.hobby,
      cutoff,
      activeFilters,
      reason: 'below cutoff'
    };
  }

  // Map score to rarity tier
  let rarity;
  if (finalScore >= 85) rarity = 'rare';
  else if (finalScore >= 65) rarity = 'mid';
  else if (finalScore >= 45) rarity = 'common';
  else rarity = null;

  return {
    pass: true,
    score: finalScore,
    tier: rarity,
    matchedCriteria: scores,
    hobbyMatch: scores.hobby,
    cutoff,
    activeFilters
  };
}

/**
 * Helper: Get country search keywords from UserProfileModel constants
 * (Import would cause circular dependency, so we inline the logic)
 */
function getCountryKeywords(countryId) {
  const countryMap = {
    'VN': ['vietnam', 'vietnamese', 'việt nam'],
    'US': ['american', 'united states', 'usa', 'hòa kỳ'],
    'CN': ['chinese', 'china', 'trung quốc'],
    'JP': ['japanese', 'japan', 'nhật bản'],
    'KR': ['korean', 'korea', 'south korea', 'hàn quốc'],
    'FR': ['french', 'france', 'pháp'],
    'DE': ['german', 'germany', 'đức'],
    'GB': ['british', 'uk', 'united kingdom', 'england', 'anh'],
    'RU': ['russian', 'russia', 'soviet', 'nga'],
    'IN': ['indian', 'india', 'ấn độ'],
    'IT': ['italian', 'italy', 'ý'],
    'ES': ['spanish', 'spain', 'tây ban nha'],
    'BR': ['brazilian', 'brazil', 'brazil', 'brazil'],
    'MX': ['mexican', 'mexico', 'mexico'],
    'AR': ['argentine', 'argentina', 'argentina'],
    'CA': ['canadian', 'canada', 'canada'],
    'AU': ['australian', 'australia', 'ú'],
    'VN': ['vietnamese', 'vietnam', 'việt nam'],
    // Add more as needed - this is a subset for common cases
  };
  return countryMap[countryId] || [countryId.toLowerCase()];
}

/**
 * Helper: Get ethnicity regex from ETHNICITIES constant
 */
function getEthnicityRegex(ethnicityId) {
  const ethnicityPatterns = {
    'jewish': /jewish|jew|judaism|hebrew|do thái/i,
    'austrian': /austrian|austria|áo/i,
    'german': /german|germanic|germany|đức/i,
    'han': /han|chinese|china|hán|trung quốc/i,
    'slavic': /slav|slavic|russian|polish|ukrainian|czech|slavơ|nga|ba lan/i,
    'anglo_saxon': /anglo-saxon|english|british|anh/i,
    'roman_italic': /roman|italic|italian|italy|la mã|ý/i
  };
  return ethnicityPatterns[ethnicityId];
}

/**
 * Helper: Get religion regex from RELIGIONS constant
 */
function getReligionRegex(religionId) {
  const religionPatterns = {
    'christianity': /christian|christianity|catholic|protestant|orthodox|công giáo|thiên chúa giáo|cơ đốc/i,
    'islam': /islam|muslim|sunni|shia|hồi giáo|đạo hồi/i,
    'buddhism': /buddhism|buddhist|phật giáo|đạo phật/i,
    'judaism': /judaism|jewish|do thái giáo/i,
    'atheist': /atheist|atheism|secular|philosophical|agnostic|vô thần|triết học/i,
    'polytheism': /polytheism|pagan|mythology|greek mythology|norse mythology|pantheon|đa thần|thần thoại/i
  };
  return religionPatterns[religionId];
}

/**
 * Timeframe check for historical figures
 */
function isFigureInTimeframe(card, minYear, maxYear) {
  if (!card) return false;
  if (card.universe === 'fictional') return true;

  const b = card.birth;
  const d = card.death;

  // 1. Born in range
  if (b != null && b >= minYear && b <= maxYear) return true;

  // 2. Died in range (active during range)
  if (d != null && d >= minYear && (b == null || b <= maxYear)) {
    if (b == null || (d - b <= 125)) return true;
  }

  // 3. Living contemporary
  if (d == null && b != null && b <= maxYear && (maxYear - b <= 115) && b >= minYear - 100) {
    return true;
  }

  // 4. Major events in text
  const textToScan = [
    card.summary, card.summaryEn, card.summaryVi,
    card.desc, card.descEn, card.descVi
  ].filter(Boolean).join(' ');

  const yearMatches = textToScan.match(/\b(1\d{3}|20[0-2]\d)\b/g);
  if (yearMatches) {
    for (const ym of yearMatches) {
      const yr = Number(ym);
      if (yr >= minYear && yr <= maxYear) return true;
    }
  }

  return false;
}

/**
 * Batch score multiple candidates efficiently
 */
export function scoreCandidatesBatch(candidates, userInputs) {
  const results = candidates.map(c => {
    const evalResult = evaluateCandidateMatch(c, userInputs);
    return {
      ...c,
      _eval: evalResult,
      score: evalResult.score,
      tier: evalResult.tier,
      matchedCriteria: evalResult.matchedCriteria,
      hobbyMatch: evalResult.hobbyMatch
    };
  });
  return results;
}

/**
 * Filter and sort candidates by score (highest first)
 */
export function filterAndRankCandidates(candidates, userInputs, minSurvivors = 10) {
  const scored = scoreCandidatesBatch(candidates, userInputs);
  const passing = scored.filter(c => c._eval?.pass && c._eval.score >= 30);

  // If too few pass with strict cutoff, relax to 30%
  if (passing.length < minSurvivors) {
    const relaxed = scored.filter(c => c._eval && c._eval.score >= 30);
    return relaxed.sort((a, b) => (b._eval?.score || 0) - (a._eval?.score || 0));
  }

  return passing.sort((a, b) => (b._eval?.score || 0) - (a._eval?.score || 0));
}