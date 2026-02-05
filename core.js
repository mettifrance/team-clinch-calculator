// core.js
// ========================================================
// LOGICA PURA: titolo (capolista/inseguitrice), presets, sensitivity, Monte Carlo
// Zero accesso al DOM
// ========================================================

// UTILS
const int = n => Math.round(n);
const clamp = (n, min, max) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : NaN;
const parseLocale = raw => parseFloat(String(raw).trim().replace(/\s+/g, '').replace(',', '.'));

const EPS = 1e-9;

// READ INPUTS (riceve gli elementi DOM da app.js)
function readInputs(elements) {
  return {
    homeName: (elements.homeName?.value || '').trim() || 'Capolista',
    awayName: (elements.awayName?.value || '').trim() || 'Inseguitrice',
    pointsHome: parseFloat(elements.pointsHome?.value),
    pointsAway: parseFloat(elements.pointsAway?.value),
    remaining: parseInt(elements.remaining?.value, 10),
    ppgHome: parseLocale(elements.ppgHome?.value),
    ppgAway: parseLocale(elements.ppgAway?.value),
    pointsPerWin: 3
  };
}

// VALIDATE
function validate(s) {
  if (!Number.isFinite(s.pointsHome) || s.pointsHome < 0) return 'Punti capolista non validi';
  if (!Number.isFinite(s.pointsAway) || s.pointsAway < 0) return 'Punti inseguitrice non validi';
  if (!Number.isInteger(s.remaining) || s.remaining < 0) return 'Partite rimanenti non valide';
  if (!Number.isFinite(s.ppgHome) || s.ppgHome < 0 || s.ppgHome > 3) return 'Media punti capolista non valida (0–3)';
  if (!Number.isFinite(s.ppgAway) || s.ppgAway < 0 || s.ppgAway > 3) return 'Media punti inseguitrice non valida (0–3)';
  return null;
}

/**
 * computeTitleRace
 * - La squadra X clincha quando: punti_X > punti_Y + (pointsPerWin * partite_rimanenti)
 * - Gestisce anche l'eventuale clinch dell'inseguitrice
 * - Evidenzia il caso "parità all'ultima" (R=0 e gap=0)
 */
function computeTitleRace(scenario) {
  const rows = [];
  const { pointsHome, pointsAway, remaining, ppgHome, ppgAway, pointsPerWin } = scenario;

  let homeClinchK = null;
  let awayClinchK = null;

  for (let k = 0; k <= remaining; k++) {
    const R = remaining - k;

    const pH = pointsHome + k * ppgHome;
    const pA = pointsAway + k * ppgAway;

    const bounty = pointsPerWin * R;

    // Regola richiesta: il vincitore deve avere punti > (punti avversario + bottino max)
    const homeClinched = pH > (pA + bounty + EPS);
    const awayClinched = pA > (pH + bounty + EPS);

    if (homeClinchK === null && homeClinched) homeClinchK = k;
    if (awayClinchK === null && awayClinched) awayClinchK = k;

    const gap = pH - pA;
    const isFinalTie = (R === 0) && (Math.abs(gap) < EPS);

    let status = 'In corsa';
    if (homeClinched) status = 'Capolista campione (matematico)';
    else if (awayClinched) status = 'Inseguitrice campione (matematico)';
    else if (isFinalTie) status = 'Parità finale (decide il regolamento)';

    rows.push({
      step: k + 1,
      k,
      R,
      pH,
      pA,
      gap,
      bounty,
      homeClinched,
      awayClinched,
      isFinalTie,
      status
    });
  }

  // Primo verdetto matematico (se esiste)
  let winner = null;        // 'home' | 'away' | null
  let winnerClinchK = null; // number | null

  if (homeClinchK !== null && awayClinchK !== null) {
    if (homeClinchK < awayClinchK) { winner = 'home'; winnerClinchK = homeClinchK; }
    else if (awayClinchK < homeClinchK) { winner = 'away'; winnerClinchK = awayClinchK; }
    else { winner = 'home'; winnerClinchK = homeClinchK; }
  } else if (homeClinchK !== null) {
    winner = 'home'; winnerClinchK = homeClinchK;
  } else if (awayClinchK !== null) {
    winner = 'away'; winnerClinchK = awayClinchK;
  }

  const lastRow = rows[rows.length - 1];
  const finalTie = !!lastRow?.isFinalTie;

  // Proiezione a fine stagione (solo informativa, non matematica)
  const homeFinal = pointsHome + remaining * ppgHome;
  const awayFinal = pointsAway + remaining * ppgAway;
  const expectedWinner = homeFinal > awayFinal + EPS ? 'home' : (awayFinal > homeFinal + EPS ? 'away' : 'tie');

  return {
    homeClinchK,
    awayClinchK,
    winner,
    winnerClinchK,
    finalTie,
    expectedFinal: { homeFinal, awayFinal, expectedWinner },
    rows
  };
}

// PRESETS (10 scenari what-if)
const presets = [
  { label: 'Base', deltaH: 0, deltaA: 0 },
  { label: 'Capolista +0.20', deltaH: 0.20, deltaA: 0 },
  { label: 'Capolista −0.20', deltaH: -0.20, deltaA: 0 },
  { label: 'Inseguitrice +0.20', deltaH: 0, deltaA: 0.20 },
  { label: 'Inseguitrice −0.20', deltaH: 0, deltaA: -0.20 },
  { label: 'Entrambe +0.10', deltaH: 0.10, deltaA: 0.10 },
  { label: 'Entrambe −0.10', deltaH: -0.10, deltaA: -0.10 },
  { label: 'Ritmo alto', deltaH: 0.15, deltaA: 0.15 },
  { label: 'Crollo inseguitrice', deltaH: 0.25, deltaA: 0 },
  { label: 'Derby swing', deltaH: -0.30, deltaA: 0.30 }
];

// SENSITIVITY GRID (ritorna winner/winnerClinchK)
function computeSensitivityGrid(baseScenario) {
  const results = [];
  const step = 0.1;
  const range = 4; // ±0.4

  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      const ppgH = clamp(baseScenario.ppgHome + i * step, 0, 3);
      const ppgA = clamp(baseScenario.ppgAway + j * step, 0, 3);

      const scenario = { ...baseScenario, ppgHome: ppgH, ppgAway: ppgA };
      const out = computeTitleRace(scenario);

      results.push({
        ppgHome: ppgH,
        ppgAway: ppgA,
        winner: out.winner,
        winnerClinchK: out.winnerClinchK,
        fromEnd: out.winnerClinchK !== null ? baseScenario.remaining - out.winnerClinchK : null,
        finalTie: out.finalTie
      });
    }
  }

  return results;
}

// MONTE CARLO (uniforme ±volatility, clamp 0..3)
function runMonteCarlo(baseScenario, volatility, simulations = 10000) {
  const homeCounts = {};
  const awayCounts = {};
  let noneCount = 0;

  for (let sim = 0; sim < simulations; sim++) {
    let pH = baseScenario.pointsHome;
    let pA = baseScenario.pointsAway;
    let decided = false;

    for (let k = 1; k <= baseScenario.remaining; k++) {
      const R = baseScenario.remaining - k;
      const bounty = 3 * R;

      const ptsH = clamp(baseScenario.ppgHome + (Math.random() - 0.5) * 2 * volatility, 0, 3);
      const ptsA = clamp(baseScenario.ppgAway + (Math.random() - 0.5) * 2 * volatility, 0, 3);

      pH += ptsH;
      pA += ptsA;

      if (pH > (pA + bounty + EPS)) {
        homeCounts[k] = (homeCounts[k] || 0) + 1;
        decided = true;
        break;
      }
      if (pA > (pH + bounty + EPS)) {
        awayCounts[k] = (awayCounts[k] || 0) + 1;
        decided = true;
        break;
      }
    }

    if (!decided) noneCount++;
  }

  const home = [];
  const away = [];
  let cumH = 0;
  let cumA = 0;

  for (let k = 1; k <= baseScenario.remaining; k++) {
    const cH = homeCounts[k] || 0;
    const cA = awayCounts[k] || 0;
    cumH += cH;
    cumA += cA;

    home.push({ k, count: cH, cumulative: cumH, probability: (cumH / simulations * 100) });
    away.push({ k, count: cA, cumulative: cumA, probability: (cumA / simulations * 100) });
  }

  return { simulations, noneCount, home, away };
}

// EXPORT
if (typeof window !== 'undefined') {
  window.CoreLogic = {
    // core
    readInputs,
    validate,
    computeTitleRace,
    // features
    presets,
    computeSensitivityGrid,
    runMonteCarlo,
    // utils
    int,
    clamp,
    parseLocale
  };
}
