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
      const btn = document.createElement('div');
      btn.className = 'preset-btn';
      btn.textContent = preset.label;
      btn.onclick = () => applyPreset(preset);
      grid.appendChild(btn);
    });
  }
  
  // APPLY PRESET
  function applyPreset(preset) {
    if (!window.AppState.currentScenario) {
      alert('⚠️ Esegui prima un calcolo con i dati base');
      return;
    }
    
    const scenario = window.AppState.currentScenario;
    const newPpgH = window.CoreLogic.clamp(scenario.ppgHome + preset.deltaH, 0, 3);
    const newPpgA = window.CoreLogic.clamp(scenario.ppgAway + preset.deltaA, 0, 3);
    
    $('ppgHome').value = newPpgH.toFixed(2);
    $('ppgAway').value = newPpgA.toFixed(2);
    
    render();
  }
  
  // RENDER SENSITIVITY GRID
  function renderSensitivity() {
    if (!window.AppState.currentScenario) return;
    
    const grid = $('sensitivityGrid');
    if (!grid) return;
    
    const results = window.CoreLogic.computeSensitivityGrid(window.AppState.currentScenario);
    grid.innerHTML = '';
    
    results.forEach(r => {
      const cell = document.createElement('div');
      cell.className = 'sensitivity-cell';
      
      if (r.fromEnd === null) {
        cell.textContent = '—';
        cell.style.background = 'rgba(255,71,87,0.2)';
        cell.style.color = 'var(--danger)';
      } else {
        cell.textContent = r.fromEnd;
        const ratio = r.fromEnd / window.AppState.currentScenario.remaining;
        const hue = 120 * ratio; // verde=presto, rosso=tardi
        cell.style.background = `hsl(${hue}, 70%, 35%)`;
        cell.style.color = '#fff';
      }
      
      grid.appendChild(cell);
    });
  }
  
  // RUN MONTE CARLO
  function runMonteCarloSimulation() {
    if (!window.AppState.currentScenario) {
      alert('⚠️ Esegui prima un calcolo');
      return;
    }
    
    const volatility = parseFloat($('volatilitySlider').value);
    const probabilities = window.CoreLogic.runMonteCarlo(
      window.AppState.currentScenario, 
      volatility, 
      10000
    );
    
    // Formatta risultati
    let html = '<p style="margin-bottom:12px"><strong>Probabilità clinch entro k partite:</strong></p><ul style="line-height:1.8">';
    
    probabilities.forEach(p => {
      if (p.count > 0 || p.k <= 5) {
        html += `<li>Entro k=${p.k}: <strong>${p.probability.toFixed(1)}%</strong></li>`;
      }
    });
    
    html += '</ul>';
    
    $('probabilityResult').innerHTML = html;
  }
  
  // SHARE (genera URL con params)
  function shareCalculation() {
    const url = new URL(window.location.href);
    const s = window.AppState.currentScenario || window.CoreLogic.readInputs({
      homeName: $('homeName'),
      awayName: $('awayName'),
      pointsHome: $('pointsHome'),
      pointsAway: $('pointsAway'),
      remaining: $('remaining'),
      ppgHome: $('ppgHome'),
      ppgAway: $('ppgAway')
    });
    
    url.searchParams.set('h', s.homeName);
    url.searchParams.set('a', s.awayName);
    url.searchParams.set('ph', window.CoreLogic.int(s.pointsHome));
    url.searchParams.set('pa', window.CoreLogic.int(s.pointsAway));
    url.searchParams.set('r', s.remaining);
    url.searchParams.set('mh', s.ppgHome.toFixed(2));
    url.searchParams.set('ma', s.ppgAway.toFixed(2));
    
    if (navigator.share) {
      navigator.share({ 
        title: document.title, 
        url: url.toString() 
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString())
        .then(() => alert('✅ Link copiato negli appunti!'))
        .catch(() => alert(url.toString()));
    } else {
      alert(url.toString());
    }
  }
  
  // INIT (chiamato all'avvio)
  function init() {
    // 1. Check PRO status (paywall.js)
    window.PaywallLogic.checkProStatus();
    
    // 2. Load URL params (se condiviso)
    const params = new URLSearchParams(window.location.search);
    if (params.get('h')) $('homeName').value = params.get('h');
    if (params.get('a')) $('awayName').value = params.get('a');
    if (params.get('ph')) $('pointsHome').value = params.get('ph');
    if (params.get('pa')) $('pointsAway').value = params.get('pa');
    if (params.get('r')) $('remaining').value = params.get('r');
    if (params.get('mh')) $('ppgHome').value = params.get('mh');
    if (params.get('ma')) $('ppgAway').value = params.get('ma');
    
    // 3. Init presets (se PRO)
    if (window.PaywallLogic.isPro()) {
      initPresets();
    }
    
    // 4. Event listeners
    
    // Form submit
    $('calcForm').addEventListener('submit', e => {
      e.preventDefault();
      render();
    });
    
    // Auto-recalculate su input change
    ['pointsHome', 'pointsAway', 'remaining'].forEach(id => {
      $(id).addEventListener('input', render);
    });
    
    // Locked inputs → paywall popup
    ['ppgHome', 'ppgAway'].forEach(id => {
      const input = $(id);
      input.addEventListener('click', e => {
        if (!window.PaywallLogic.isPro()) {
          e.preventDefault();
          window.PaywallLogic.showPaywallPopup();
        }
      });
      input.addEventListener('focus', e => {
        if (!window.PaywallLogic.isPro()) {
          e.target.blur();
          window.PaywallLogic.showPaywallPopup();
        }
      });
    });
    
    // Paywall buttons
    const unlockBtn = $('unlockBtn');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', window.PaywallLogic.showPaywall);
    }
    
    const closeModalBtn = $('closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', window.PaywallLogic.closePaywall);
    }
    
    const proceedPaymentBtn = $('proceedPaymentBtn');
    if (proceedPaymentBtn) {
      proceedPaymentBtn.addEventListener('click', () => {
        const email = $('emailInput').value.trim();
        if (!email || !email.includes('@')) {
          alert('⚠️ Inserisci una email valida');
          return;
        }
        window.PaywallLogic.createCheckoutSession(email);
      });
    }
    
    // Share button
    const shareBtn = $('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', shareCalculation);
    }
    
    // Monte Carlo
    const volatilitySlider = $('volatilitySlider');
    if (volatilitySlider) {
      volatilitySlider.addEventListener('input', e => {
        $('volValue').textContent = parseFloat(e.target.value).toFixed(2);
      });
    }
    
    const runMonteCarloBtn = $('runMonteCarloBtn');
    if (runMonteCarloBtn) {
      runMonteCarloBtn.addEventListener('click', runMonteCarloSimulation);
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
    
    // 5. Primo render (con valori default)
    render();
  }
  
  // Avvia app quando DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  