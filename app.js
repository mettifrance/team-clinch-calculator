// app.js
// ========================================================
// UI BINDING: event listeners, render, init
// ========================================================

// STATE (globale per condividere con export)
window.AppState = {
  currentScenario: null
};

// UTILITY DOM
const $ = id => document.getElementById(id);

// RENDER (aggiorna UI con risultati)
function render() {
  // Leggi inputs (passa elementi DOM a core.js)
  const elements = {
    homeName: $('homeName'),
    awayName: $('awayName'),
    pointsHome: $('pointsHome'),
    pointsAway: $('pointsAway'),
    remaining: $('remaining'),
    ppgHome: $('ppgHome'),
    ppgAway: $('ppgAway')
  };
  
  const scenario = window.CoreLogic.readInputs(elements);
  const err = window.CoreLogic.validate(scenario);
  
  if (err) {
    $('fromEnd').textContent = '—';
    $('afterGames').textContent = '—';
    $('detail').textContent = '⚠️ ' + err;
    $('tbody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:22px;color:var(--danger)">${err}</td></tr>`;
    return;
  }
  
  // Salva scenario corrente (per export)
  window.AppState.currentScenario = scenario;
  
  // Calcola clinch
  const { clinchK, rows } = window.CoreLogic.computeClinch(scenario);
  
  // Aggiorna tabella
  const tbody = $('tbody');
  tbody.innerHTML = '';
  
  const isPro = window.PaywallLogic.isPro();
  const limit = isPro ? rows.length : Math.min(4, rows.length);
  
  rows.slice(0, limit).forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.step}</td>
      <td>${r.k}</td>
      <td>${r.R}</td>
      <td><strong>${window.CoreLogic.int(r.pH)}</strong></td>
      <td>${window.CoreLogic.int(r.pA)}</td>
      <td>${window.CoreLogic.int(r.gap)}</td>
      <td>${window.CoreLogic.int(r.bounty)}</td>
      <td>${r.clinched ? '<span class="badge badge-success">Campione</span>' : '<span class="badge badge-pending">In corso</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
  
  if (!isPro && rows.length > 4) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8" style="text-align:center;padding:16px;color:var(--warning)">🔒 Sblocca PRO per vedere tutte le righe</td>';
    tbody.appendChild(tr);
  }
  
  // Aggiorna KPI
  if (clinchK === null) {
    $('fromEnd').textContent = '—';
    $('afterGames').textContent = '—';
    $('detail').textContent = `${scenario.homeName} non clincha in anticipo entro ${scenario.remaining} partite.`;
    return;
  }
  
  const fromEnd = scenario.remaining - clinchK;
  $('fromEnd').textContent = String(fromEnd);
  $('afterGames').textContent = String(clinchK);
  
  const pH = scenario.pointsHome + clinchK * scenario.ppgHome;
  const pA = scenario.pointsAway + clinchK * scenario.ppgAway;
  const gap = pH - pA;
  const bounty = 3 * fromEnd;
  
  $('detail').textContent = `🏆 ${scenario.homeName} campione con ${fromEnd} partite dalla fine (tra ${clinchK} partite). ${scenario.homeName} ${window.CoreLogic.int(pH)}pt, ${scenario.awayName} ${window.CoreLogic.int(pA)}pt, gap ${window.CoreLogic.int(gap)}, bottino max ${window.CoreLogic.int(bounty)}.`;
}

// INIT PRESETS (popola griglia scenari)
function initPresets() {
  const grid = $('presetGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  window.CoreLogic.presets.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => applyPreset(preset));
    grid.appendChild(btn);
  });
}

// APPLY PRESET (modifica ppg e ricalcola)
function applyPreset(preset) {
  if (!window.PaywallLogic.isPro()) {
    window.PaywallLogic.showPaywall();
    return;
  }
  
  const ppgHome = $('ppgHome');
  const ppgAway = $('ppgAway');
  
  const baseH = 2.60;
  const baseA = 2.30;
  
  const newH = window.CoreLogic.clamp(baseH + preset.deltaH, 0, 3);
  const newA = window.CoreLogic.clamp(baseA + preset.deltaA, 0, 3);
  
  ppgHome.value = newH.toFixed(2);
  ppgAway.value = newA.toFixed(2);
  
  render();
}

// INIT SENSITIVITY GRID
function initSensitivityGrid() {
  const grid = $('sensitivityGrid');
  if (!grid) return;
  
  // Placeholder (popola quando PRO sbloccato e calcolo eseguito)
  grid.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt-muted)">Esegui un calcolo per vedere la sensitivity analysis</div>';
}

// RENDER SENSITIVITY (chiamato dopo render se PRO)
function renderSensitivity() {
  if (!window.PaywallLogic.isPro() || !window.AppState.currentScenario) return;
  
  const grid = $('sensitivityGrid');
  if (!grid) return;
  
  const results = window.CoreLogic.computeSensitivityGrid(window.AppState.currentScenario);
  
  grid.innerHTML = '';
  
  results.forEach(r => {
    const cell = document.createElement('div');
    cell.className = 'sensitivity-cell';
    cell.style.background = r.fromEnd !== null 
      ? `rgba(0, 255, 136, ${Math.min(r.fromEnd / 10, 1) * 0.3})` 
      : 'rgba(255, 71, 87, 0.2)';
    cell.textContent = r.fromEnd !== null ? r.fromEnd : '—';
    cell.title = `ppgH: ${r.ppgHome.toFixed(2)}, ppgA: ${r.ppgAway.toFixed(2)}`;
    grid.appendChild(cell);
  });
}

// SHARE (genera URL con parametri)
function share() {
  const elements = {
    homeName: $('homeName'),
    awayName: $('awayName'),
    pointsHome: $('pointsHome'),
    pointsAway: $('pointsAway'),
    remaining: $('remaining'),
    ppgHome: $('ppgHome'),
    ppgAway: $('ppgAway')
  };
  
  const params = new URLSearchParams({
    home: elements.homeName.value,
    away: elements.awayName.value,
    ph: elements.pointsHome.value,
    pa: elements.pointsAway.value,
    r: elements.remaining.value,
    ppgh: elements.ppgHome.value,
    ppga: elements.ppgAway.value
  });
  
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Link copiato negli appunti!\n\n' + url);
  }).catch(() => {
    prompt('Copia questo link:', url);
  });
}

// LOAD FROM URL (se ci sono parametri)
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('home')) $('homeName').value = params.get('home');
  if (params.has('away')) $('awayName').value = params.get('away');
  if (params.has('ph')) $('pointsHome').value = params.get('ph');
  if (params.has('pa')) $('pointsAway').value = params.get('pa');
  if (params.has('r')) $('remaining').value = params.get('r');
  if (params.has('ppgh')) $('ppgHome').value = params.get('ppgh');
  if (params.has('ppga')) $('ppgAway').value = params.get('ppga');
}

// MONTE CARLO
function runMonteCarlo() {
  if (!window.PaywallLogic.isPro() || !window.AppState.currentScenario) {
    window.PaywallLogic.showPaywall();
    return;
  }
  
  const volatility = parseFloat($('volatilitySlider').value);
  const resultDiv = $('probabilityResult');
  
  resultDiv.innerHTML = '<p style="text-align:center;color:var(--txt-muted)">⏳ Simulando 10.000 stagioni...</p>';
  
  // Simula in modo asincrono per non bloccare UI
  setTimeout(() => {
    const probabilities = window.CoreLogic.runMonteCarlo(
      window.AppState.currentScenario,
      volatility,
      10000
    );
    
    let html = '<table style="width:100%;font-size:12px"><thead><tr><th>Partite</th><th>Probabilità</th></tr></thead><tbody>';
    
    probabilities.filter(p => p.probability > 1).forEach(p => {
      html += `<tr><td>Tra ${p.k} partite</td><td><strong>${p.probability.toFixed(1)}%</strong></td></tr>`;
    });
    
    html += '</tbody></table>';
    resultDiv.innerHTML = html;
  }, 100);
}

// INIT (chiamato all'avvio)
function init() {
  // Check PRO status
  window.PaywallLogic.checkProStatus();
  
  // Load from URL se presenti parametri
  loadFromURL();
  
  // Event listeners
  const form = $('calcForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      render();
      renderSensitivity();
    });
  }
  
  const unlockBtn = $('unlockBtn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', window.PaywallLogic.showPaywall);
  }
  
  const shareBtn = $('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', share);
  }
  
  // Modal handlers
  const closeModalBtn = $('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', window.PaywallLogic.closePaywall);
  }
  
  const proceedPaymentBtn = $('proceedPaymentBtn');
  if (proceedPaymentBtn) {
    proceedPaymentBtn.addEventListener('click', () => {
      const email = $('emailInput').value;
      if (!email || !email.includes('@')) {
        alert('⚠️ Inserisci un indirizzo email valido');
        return;
      }
      window.PaywallLogic.createCheckoutSession(email);
    });
  }
  
  // Lock inputs PRO (click mostra paywall)
  ['ppgHome', 'ppgAway'].forEach(id => {
    const input = $(id);
    if (input) {
      input.addEventListener('click', () => {
        if (!window.PaywallLogic.isPro()) {
          window.PaywallLogic.showPaywallPopup();
        }
      });
    }
  });
  
  // Monte Carlo
  const monteCarloBtn = $('runMonteCarloBtn');
  if (monteCarloBtn) {
    monteCarloBtn.addEventListener('click', runMonteCarlo);
  }
  
  // Volatility slider
  const volSlider = $('volatilitySlider');
  const volValue = $('volValue');
  if (volSlider && volValue) {
    volSlider.addEventListener('input', () => {
      volValue.textContent = volSlider.value;
    });
  }
  
  // Export buttons
  const exportPdfBtn = $('exportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', window.ExportLogic.exportPDF);
  }
  
  const exportCsvBtn = $('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', window.ExportLogic.exportCSV);
  }
  
  const socialCardBtn = $('socialCardBtn');
  if (socialCardBtn) {
    socialCardBtn.addEventListener('click', window.ExportLogic.createSocialCard);
  }
  
  // Init presets e sensitivity
  initPresets();
  initSensitivityGrid();
  
  // Primo render con valori di default
  render();
}

// Avvia tutto quando DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Esponi funzioni globali per onclick in HTML
window.showPaywall = window.PaywallLogic.showPaywall;
window.applyPreset = applyPreset;
