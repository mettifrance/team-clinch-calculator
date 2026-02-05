// core.js
// ========================================================
// LOGICA PURA: calcolo titolo (capolista/inseguitrice), presets, sensitivity, Monte Carlo
// Zero accesso al DOM
// ========================================================

// UTILS
const int = n => Math.round(n);
const clamp = (n, min, max) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : NaN;
const parseLocale = raw => parseFloat(String(raw).trim().replace(/\s+/g, '').replace(',', '.'));

// READ INPUTS (riceve gli elementi DOM da app.js)
function readInputs(elements) {
  return {
    homeName: elements.homeName.value.trim() || 'Capolista',
    awayName: elements.awayName.value.trim() || 'Inseguitrice',
    pointsHome: parseFloat(elements.pointsHome.value),
    pointsAway: parseFloat(elements.pointsAway.value),
    remaining: parseInt(elements.remaining.value, 10),
    ppgHome: parseLocale(elements.ppgHome.value),
    ppgAway: parseLocale(elements.ppgAway.value),
    pointsPerWin: 3
  };
}

// VALIDATE
function validate(scenario) {
  if (!Number.isFinite(scenario.pointsHome) || scenario.pointsHome < 0) return 'Punti capolista non validi';
  if (!Number.isFinite(scenario.pointsAway) || scenario.pointsAway < 0) return 'Punti inseguitrice non validi';
  if (!Number.isInteger(scenario.remaining) || scenario.remaining < 0) return 'Partite rimanenti non valide';
  if (!Number.isFinite(scenario.ppgHome) || scenario.ppgHome < 0 || scenario.ppgHome > 3) return 'Media punti capolista non valida (0–3)';
  if (!Number.isFinite(scenario.ppgAway) || scenario.ppgAway < 0 || scenario.ppgAway > 3) return 'Media punti inseguitrice non valida (0–3)';
  return null;
}

/**
 * computeTitleRace
 * Ritorna:
 * - homeClinchK: prima k in cui la capolista vince matematicamente
 * - awayClinchK: prima k in cui l'inseguitrice vince matematicamente
 * - winner: 'home' | 'away' | null
 * - winnerClinchK: k del vincitore (se esiste)
 * - expectedFinal: proiezione a fine stagione con le medie (non “matematica”, solo proiezione)
 * - rows: righe per tabella (con homeClinched/awayClinched)
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

    const gap = pH - pA;
    const bounty = pointsPerWin * R;

    const homeClinched = gap > bounty;      // capolista irraggiungibile
    const awayClinched = (-gap) > bounty;   // inseguitrice irraggiungibile

    if (homeClinchK === null && homeClinched) homeClinchK = k;
    if (awayClinchK === null && awayClinched) awayClinchK = k;

    let status = 'In corsa';
    if (homeClinched) status = 'Capolista campione (matematico)';
    else if (awayClinched) status = 'Inseguitrice campione (matematico)';

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
      status
    });
  }

  // Determina il “primo verdetto matematico”, se esiste
  let winner = null;
  let winnerClinchK = null;

  if (homeClinchK !== null && awayClinchK !== null) {
    if (homeClinchK < awayClinchK) { winner = 'home'; winnerClinchK = homeClinchK; }
    else if (awayClinchK < homeClinchK) { winner = 'away'; winnerClinchK = awayClinchK; }
    else { winner = 'home'; winnerClinchK = homeClinchK; } // rarissimo (parità), default
  } else if (homeClinchK !== null) {
    winner = 'home'; winnerClinchK = homeClinchK;
  } else if (awayClinchK !== null) {
    winner = 'away'; winnerClinchK = awayClinchK;
  }

  // Proiezione “a medie costanti” (non matematica): chi finisce davanti
  const homeFinal = pointsHome + remaining * ppgHome;
  const awayFinal = pointsAway + remaining * ppgAway;
  const expectedWinner = homeFinal > awayFinal ? 'home' : (awayFinal > homeFinal ? 'away' : 'tie');

  return {
    homeClinchK,
    awayClinchK,
    winner,
    winnerClinchK,
    expectedFinal: { homeFinal, awayFinal, expectedWinner },
    rows
  };
}

// Legacy: mantiene il vecchio nome (capolista-only) se ti serve temporaneamente
function computeClinch(scenario) {
  const res = computeTitleRace(scenario);
  return { clinchK: res.homeClinchK, rows: res.rows.map(r => ({ ...r, clinched: r.homeClinched })) };
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

// SENSITIVITY ANALYSIS
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
        winner: out.winner,                 // 'home' | 'away' | null
        winnerClinchK: out.winnerClinchK,   // numero partite da qui (k)
        fromEnd: out.winnerClinchK !== null ? baseScenario.remaining - out.winnerClinchK : null
      });
    }
  }
  return results;
}

// MONTE CARLO SIMULATION (ora può clinchare anche l'inseguitrice)
function runMonteCarlo(baseScenario, volatility, simulations = 10000) {
  const homeCounts = {};
  const awayCounts = {};
  let noneCount = 0;

  for (let sim = 0; sim < simulations; sim++) {
    let pH = baseScenario.pointsHome;
    let pA = baseScenario.pointsAway;
    let clinched = false;

    for (let k = 1; k <= baseScenario.remaining; k++) {
      const R = baseScenario.remaining - k;

      const ptsH = clamp(baseScenario.ppgHome + (Math.random() - 0.5) * 2 * volatility, 0, 3);
      const ptsA = clamp(baseScenario.ppgAway + (Math.random() - 0.5) * 2 * volatility, 0, 3);

      pH += ptsH;
      pA += ptsA;

      const gap = pH - pA;
      const bounty = 3 * R;

      if (gap > bounty) {
        homeCounts[k] = (homeCounts[k] || 0) + 1;
        clinched = true;
        break;
      }
      if ((-gap) > bounty) {
        awayCounts[k] = (awayCounts[k] || 0) + 1;
        clinched = true;
        break;
      }
    }

    if (!clinched) noneCount++;
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

// Export
if (typeof window !== 'undefined') {
  window.CoreLogic = {
    readInputs,
    validate,
    computeTitleRace,
    computeClinch, // legacy
    presets,
    computeSensitivityGrid,
    runMonteCarlo,
    int,
    clamp,
    parseLocale
  };
}
