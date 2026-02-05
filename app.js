// app.js
console.log('📦 app.js caricato!');

// STATE
window.AppState = {
  currentScenario: null
};

// UTILITY DOM (rinominato per evitare conflitti)
const getEl = id => {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Elemento #${id} non trovato`);
  return el;
};

// RENDER
function render() {
  console.log('🎨 render() chiamato');

  if (!window.CoreLogic) {
    console.error('❌ CoreLogic non disponibile!');
    alert('Errore: CoreLogic non caricato. Verifica che core.js sia presente.');
    return;
  }

  if (!window.CoreLogic.computeTitleRace) {
    console.error('❌ CoreLogic.computeTitleRace non disponibile!');
    alert('Errore: core.js non è aggiornato (manca computeTitleRace).');
    return;
  }

  const elements = {
    homeName: getEl('homeName'),
    awayName: getEl('awayName'),
    pointsHome: getEl('pointsHome'),
    pointsAway: getEl('pointsAway'),
    remaining: getEl('remaining'),
    ppgHome: getEl('ppgHome'),
    ppgAway: getEl('ppgAway')
  };

  console.log('📝 Elementi trovati:', elements);

  const scenario = window.CoreLogic.readInputs(elements);
  console.log('📊 Scenario letto:', scenario);

  const err = window.CoreLogic.validate(scenario);

  if (err) {
    console.warn('⚠️ Validazione fallita:', err);
    getEl('fromEnd').textContent = '—';
    getEl('afterGames').textContent = '—';
    getEl('detail').textContent = '⚠️ ' + err;
    getEl('tbody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:22px;color:var(--danger)">${err}</td></tr>`;
    return;
  }

  window.AppState.currentScenario = scenario;

  const out = window.CoreLogic.computeTitleRace(scenario);
  console.log('✅ Calcolo completato:', {
    homeClinchK: out.homeClinchK,
    awayClinchK: out.awayClinchK,
    winner: out.winner,
    winnerClinchK: out.winnerClinchK,
    rows: out.rows.length
  });

  // ---- TABELLA ----
  const tbody = getEl('tbody');
  tbody.innerHTML = '';

  const isPro = window.PaywallLogic ? window.PaywallLogic.isPro() : false;
  const rows = out.rows;
  const limit = isPro ? rows.length : Math.min(4, rows.length);

  rows.slice(0, limit).forEach(r => {
    const tr = document.createElement('tr');

    const badge =
      r.homeClinched
        ? '<span class="badge badge-success">Capolista campione</span>'
        : r.awayClinched
          ? '<span class="badge badge-success">Inseguitrice campione</span>'
          : '<span class="badge badge-pending">In corsa</span>';

    tr.innerHTML = `
      <td>${r.step}</td>
      <td>${r.k}</td>
      <td>${r.R}</td>
      <td><strong>${window.CoreLogic.int(r.pH)}</strong></td>
      <td>${window.CoreLogic.int(r.pA)}</td>
      <td>${window.CoreLogic.int(r.gap)}</td>
      <td>${window.CoreLogic.int(r.bounty)}</td>
      <td>${badge}</td>
    `;
    tbody.appendChild(tr);
  });

  if (!isPro && rows.length > 4) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8" style="text-align:center;padding:16px;color:var(--warning)">🔒 Sblocca PRO per vedere tutte le righe</td>';
    tbody.appendChild(tr);
  }

  // ---- KPI + DETTAGLIO ----
  const k = out.winnerClinchK;

  if (k === null) {
    getEl('fromEnd').textContent = '—';
    getEl('afterGames').textContent = '—';
    getEl('detail').textContent = `Nessun verdetto matematico entro ${scenario.remaining} partite (si può decidere all’ultima).`;
    console.log('✅ Render completato (nessun verdetto matematico).');
    return;
  }

  const fromEnd = scenario.remaining - k;
  getEl('fromEnd').textContent = String(fromEnd);
  getEl('afterGames').textContent = String(k);

  const winnerName =
    out.winner === 'home' ? scenario.homeName :
    out.winner === 'away' ? scenario.awayName :
    '—';

  const pH = scenario.pointsHome + k * scenario.ppgHome;
  const pA = scenario.pointsAway + k * scenario.ppgAway;
  const gap = pH - pA;
  const bounty = 3 * (scenario.remaining - k);

  // Messaggio più naturale se è già deciso “adesso”
  const whenText = (k === 0)
    ? 'È già matematico adesso.'
    : `Succede tra ${k} partite.`;

  const perspective =
    out.winner === 'home'
      ? `${scenario.homeName} ${window.CoreLogic.int(pH)}pt, ${scenario.awayName} ${window.CoreLogic.int(pA)}pt`
      : `${scenario.awayName} ${window.CoreLogic.int(pA)}pt, ${scenario.homeName} ${window.CoreLogic.int(pH)}pt`;

  getEl('detail').textContent =
    `🏆 ${winnerName} campione con ${fromEnd} partite dalla fine. ${whenText} ` +
    `${perspective}. Gap ${window.CoreLogic.int(gap)}, bottino max ${window.CoreLogic.int(bounty)}.`;

  console.log('✅ Render completato!');
}

// INIT
function init() {
  console.log('🚀 init() chiamato');
  console.log('📦 CoreLogic disponibile?', !!window.CoreLogic);
  console.log('📦 PaywallLogic disponibile?', !!window.PaywallLogic);
  console.log('📦 ExportLogic disponibile?', !!window.ExportLogic);

  // Check PRO status
  if (window.PaywallLogic) {
    window.PaywallLogic.checkProStatus();
  }

  // Event listeners
  const form = getEl('calcForm');
  console.log('🔍 Form trovato?', !!form);

  if (form) {
    form.addEventListener('submit', e => {
      console.log('✅ Submit evento catturato!');
      e.preventDefault();
      console.log('✅ preventDefault() eseguito');
      render();
    });
    console.log('✅ Listener submit aggiunto al form');
  } else {
    console.error('❌ Form #calcForm non trovato!');
  }

  const unlockBtn = getEl('unlockBtn');
  if (unlockBtn && window.PaywallLogic) {
    unlockBtn.addEventListener('click', () => {
      console.log('🔓 Unlock button cliccato');
      window.PaywallLogic.showPaywall();
    });
  }

  const shareBtn = getEl('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      console.log('📤 Share button cliccato');

      const params = new URLSearchParams({
        home: getEl('homeName').value,
        away: getEl('awayName').value,
        ph: getEl('pointsHome').value,
        pa: getEl('pointsAway').value,
        r: getEl('remaining').value,
        ppgh: getEl('ppgHome').value,
        ppga: getEl('ppgAway').value
      });

      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          alert('✅ Link copiato negli appunti!\n\n' + url);
        }).catch(() => {
          prompt('Copia questo link:', url);
        });
      } else {
        prompt('Copia questo link:', url);
      }
    });
  }

  // Modal handlers
  const closeModalBtn = getEl('closeModalBtn');
  if (closeModalBtn && window.PaywallLogic) {
    closeModalBtn.addEventListener('click', window.PaywallLogic.closePaywall);
  }

  const proceedPaymentBtn = getEl('proceedPaymentBtn');
  if (proceedPaymentBtn && window.PaywallLogic) {
    proceedPaymentBtn.addEventListener('click', () => {
      const email = getEl('emailInput').value;
      if (!email || !email.includes('@')) {
        alert('⚠️ Inserisci un indirizzo email valido');
        return;
      }
      window.PaywallLogic.createCheckoutSession(email);
    });
  }

  // Load from URL se presenti parametri
  const params = new URLSearchParams(window.location.search);
  if (params.has('home')) getEl('homeName').value = params.get('home');
  if (params.has('away')) getEl('awayName').value = params.get('away');
  if (params.has('ph')) getEl('pointsHome').value = params.get('ph');
  if (params.has('pa')) getEl('pointsAway').value = params.get('pa');
  if (params.has('r')) getEl('remaining').value = params.get('r');
  if (params.has('ppgh')) getEl('ppgHome').value = params.get('ppgh');
  if (params.has('ppga')) getEl('ppgAway').value = params.get('ppga');

  // Primo render
  console.log('🎨 Eseguo primo render...');
  render();

  console.log('✅ init() completato!');
}

// Esponi globalmente per onclick in HTML
window.showPaywall = () => {
  console.log('🔓 showPaywall() chiamato da HTML');
  if (window.PaywallLogic) {
    window.PaywallLogic.showPaywall();
  } else {
    console.error('❌ PaywallLogic non disponibile');
  }
};

// Avvia
console.log('📌 document.readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('⏳ DOM ancora in caricamento, aspetto DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired!');
    init();
  });
} else {
  console.log('✅ DOM già pronto, avvio init() subito');
  init();
}
