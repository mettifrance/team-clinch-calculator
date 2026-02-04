// core.js
// ========================================================
// LOGICA PURA: calcolo clinch, presets, sensitivity, Monte Carlo
// Zero accesso al DOM (nessun document.getElementById qui)
// ========================================================

// UTILS
const int = n => Math.round(n);
const clamp = (n, min, max) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : NaN;
const parseLocale = raw => parseFloat(String(raw).trim().replace(/\s+/g, '').replace(',', '.'));

// READ INPUTS (riceve gli elementi DOM da app.js)
function readInputs(elements) {
  return {
    homeName: elements.homeName.value.trim() || 'Leader',
    awayName: elements.awayName.value.trim() || 'Avversario',
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
  if (!Number.isFinite(scenario.pointsHome) || scenario.pointsHome < 0) 
    return 'Punti leader non validi';
  if (!Number.isFinite(scenario.pointsAway) || scenario.pointsAway < 0) 
    return 'Punti avversario non validi';
  if (!Number.isInteger(scenario.remaining) || scenario.remaining < 0) 
    return 'Partite rimanenti non valide';
  if (!Number.isFinite(scenario.ppgHome) || scenario.ppgHome < 0 || scenario.ppgHome > 3) 
    return 'Media punti leader non valida (0–3)';
  if (!Number.isFinite(scenario.ppgAway) || scenario.ppgAway < 0 || scenario.ppgAway > 3) 
    return 'Media punti avversario non valida (0–3)';
  return null;
}

// COMPUTE CLINCH (algoritmo principale)
function computeClinch(scenario) {
  const rows = [];
  let clinchK = null;
  const { pointsHome, pointsAway, remaining, ppgHome, ppgAway, pointsPerWin } = scenario;

  for (let k = 0; k <= remaining; k++) {
    const R = remaining - k;
    const pH = pointsHome + k * ppgHome;
    const pA = pointsAway + k * ppgAway;
    const gap = pH - pA;
    const bounty = pointsPerWin * R;
    const clinched = gap > bounty;
    
    if (clinchK === null && clinched) clinchK = k;
    
    rows.push({ step: k + 1, k, R, pH, pA, gap, bounty, clinched });
  }
  
  return { clinchK, rows };
}

// PRESETS (10 scenari what-if)
const presets = [
  { label: 'Base', deltaH: 0, deltaA: 0 },
  { label: 'Leader +0.20', deltaH: 0.20, deltaA: 0 },
  { label: 'Leader −0.20', deltaH: -0.20, deltaA: 0 },
  { label: 'Avversario +0.20', deltaH: 0, deltaA: 0.20 },
  { label: 'Avversario −0.20', deltaH: 0, deltaA: -0.20 },
  { label: 'Entrambe +0.10', deltaH: 0.10, deltaA: 0.10 },
  { label: 'Entrambe −0.10', deltaH: -0.10, deltaA: -0.10 },
  { label: 'Ritmo alto', deltaH: 0.15, deltaA: 0.15 },
  { label: 'Crollo avversario', deltaH: 0.25, deltaA: 0 },
  { label: 'Derby swing', deltaH: -0.30, deltaA: 0.30 }
];

// SENSITIVITY ANALYSIS (ritorna dati per griglia)
function computeSensitivityGrid(baseScenario) {
  const results = [];
  const step = 0.1;
  const range = 4; // ±0.4
  
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      const ppgH = clamp(baseScenario.ppgHome + i * step, 0, 3);
      const ppgA = clamp(baseScenario.ppgAway + j * step, 0, 3);
      const scenario = { ...baseScenario, ppgHome: ppgH, ppgAway: ppgA };
      const { clinchK } = computeClinch(scenario);
      
      results.push({
        ppgHome: ppgH,
        ppgAway: ppgA,
        clinchK,
        fromEnd: clinchK !== null ? baseScenario.remaining - clinchK : null
      });
    }
  }
  
  return results;
}

// MONTE CARLO SIMULATION
function runMonteCarlo(baseScenario, volatility, simulations = 10000) {
  const clinchCounts = {};
  
  for (let sim = 0; sim < simulations; sim++) {
    let pH = baseScenario.pointsHome;
    let pA = baseScenario.pointsAway;
    
    for (let k = 1; k <= baseScenario.remaining; k++) {
      const R = baseScenario.remaining - k;
      
      // Simula punti con volatilità (distribuzione uniforme ±volatility)
      const ptsH = clamp(
        baseScenario.ppgHome + (Math.random() - 0.5) * 2 * volatility, 
        0, 
        3
      );
      const ptsA = clamp(
        baseScenario.ppgAway + (Math.random() - 0.5) * 2 * volatility, 
        0, 
        3
      );
      
      pH += ptsH;
      pA += ptsA;
      
      const gap = pH - pA;
      const bounty = 3 * R;
      
      if (gap > bounty) {
        clinchCounts[k] = (clinchCounts[k] || 0) + 1;
        break; // clinch trovato in questa simulazione
      }
    }
  }
  
  // Calcola probabilità cumulative
  const probabilities = [];
  let cumulative = 0;
  
  for (let k = 1; k <= baseScenario.remaining; k++) {
    const count = clinchCounts[k] || 0;
    cumulative += count;
    const prob = (cumulative / simulations * 100);
    
    probabilities.push({
      k,
      count,
      cumulative,
      probability: prob
    });
  }
  
  return probabilities;
}

// Esporta per uso in altri script
if (typeof window !== 'undefined') {
  window.CoreLogic = {
    readInputs,
    validate,
    computeClinch,
    presets,
    computeSensitivityGrid,
    runMonteCarlo,
    // utility
    int,
    clamp,
    parseLocale
  };
}
