// app.js
console.log('📦 app.js caricato!');

// STATE
window.AppState = { currentScenario: null };

// DOM helper
const getEl = id => {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Elemento #${id} non trovato`);
  return el;
};

function getIsPro() {
  return window.PaywallLogic ? window.PaywallLogic.isPro() : false;
}

function setText(id, value) {
  const el = getEl(id);
  if (el) el.textContent = value;
}

function render() {
  if (!window.CoreLogic || !window.CoreLogic.computeTitleRace) {
    console.error('❌ CoreLogic non disponibile o non aggiornato');
    alert('Errore: core.js non caricato o non aggiornato.');
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

  const scenario = window.CoreLogic.readInputs(elements);
  const err = window.CoreLogic.validate(scenario);

  if (err) {
    setText('fromEnd', '—');
    setText('afterGames', '—');
    setText('detail', '⚠️ ' + err);

    const tbody = getEl('tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:22px;color:var(--danger)">${err}</td></tr>`;

    const winnerHeadlineEl = getEl('winnerHeadline');
    if (winnerHeadlineEl) winnerHeadlineEl.textContent = '— vincerà il campionato';

    return;
  }

  window.AppState.currentScenario = scenario;

  const out = window.CoreLogic.computeTitleRace(scenario);
  const rows = out.rows;
  const lastRow = rows[rows.length - 1];
  const isFinalTie = !!out.finalTie;

  // Winner name (solo se matematico)
  const winnerName =
    out.winner === 'home' ? scenario.homeName :
    out.winner === 'away' ? scenario.awayName :
    null;

  // Headline vincitore
  const winnerHeadlineEl = getEl('winnerHeadline');
  if (winnerHeadlineEl) {
    if (winnerName) winnerHeadlineEl.textContent = `${winnerName} vincerà il campionato`;
    else if (isFinalTie) winnerHeadlineEl.textContent = 'Parità: decide il regolamento';
    else winnerHeadlineEl.textContent = 'Campionato ancora aperto';
  }

  // ---- TABLE ----
  const tbody = getEl('tbody');
  if (tbody) {
    tbody.innerHTML = '';

    const isPro = getIsPro();
    const limit = isPro ? rows.length : Math.min(4, rows.length);

    rows.slice(0, limit).forEach(r => {
      const tr = document.createElement('tr');

      const badge =
        r.homeClinched
          ? '<span class="badge badge-success">Capolista campione</span>'
          : r.awayClinched
            ? '<span class="badge badge-success">Inseguitrice campione</span>'
            : r.isFinalTie
              ? '<span class="badge badge-pending">Parità finale</span>'
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
  }

  // ---- KPI + DETAIL ----
  const k = out.winnerClinchK;

  if (k === null) {
    setText('fromEnd', '—');
    setText('afterGames', '—');

    if (isFinalTie) {
      setText(
        'detail',
        'A pari punti all’ultima giornata: si contano gli scontri diretti e differenza reti in base alle regole del campionato.'
      );
    } else {
      setText('detail', `Nessun verdetto matematico entro ${scenario.remaining} partite (si può decidere all’ultima).`);
    }
    return;
  }

  const fromEnd = scenario.remaining - k;
  setText('fromEnd', String(fromEnd));
  setText('afterGames', String(k));

  // Ricostruisco i numeri al momento del clinch (k)
  const pH = scenario.pointsHome + k * scenario.ppgHome;
  const pA = scenario.pointsAway + k * scenario.ppgAway;
  const gap = pH - pA;
  const bounty = 3 * (scenario.remaining - k);

  const whenText = (k === 0) ? 'È già matematico adesso.' : `Succede tra ${k} partite.`;

  const detail =
    `🏆 ${winnerName} campione con ${fromEnd} partite dalla fine. ${whenText} ` +
    `${scenario.homeName} ${window.CoreLogic.int(pH)}pt, ${scenario.awayName} ${window.CoreLogic.int(pA)}pt, ` +
    `gap ${window.CoreLogic.int(gap)}, bottino max ${window.CoreLogic.int(bounty)}.`;

  setText('detail', detail);
}

function init() {
  // PRO status
  if (window.PaywallLogic) window.PaywallLogic.checkProStatus();

  // Form submit
  const form = getEl('calcForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      render();
    });
  }

  // Unlock button
  const unlockBtn = getEl('unlockBtn');
  if (unlockBtn && window.PaywallLogic) {
    unlockBtn.addEventListener('click', () => window.PaywallLogic.showPaywall());
  }

  // Share
  const shareBtn = getEl('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const params = new URLSearchParams({
        home: getEl('homeName')?.value || '',
        away: getEl('awayName')?.value || '',
        ph: getEl('pointsHome')?.value || '',
        pa: getEl('pointsAway')?.value || '',
        r: getEl('remaining')?.value || '',
        ppgh: getEl('ppgHome')?.value || '',
        ppga: getEl('ppgAway')?.value || ''
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

  // Paywall modal controls
  const closeModalBtn = getEl('closeModalBtn');
  if (closeModalBtn && window.PaywallLogic) {
    closeModalBtn.addEventListener('click', window.PaywallLogic.closePaywall);
  }

  const proceedPaymentBtn = getEl('proceedPaymentBtn');
  if (proceedPaymentBtn && window.PaywallLogic) {
    proceedPaymentBtn.addEventListener('click', () => {
      const email = getEl('emailInput')?.value || '';
      if (!email.includes('@')) {
        alert('⚠️ Inserisci un indirizzo email valido');
        return;
      }
      window.PaywallLogic.createCheckoutSession(email);
    });
  }

  // Load state from URL
  const params = new URLSearchParams(window.location.search);
  if (params.has('home')) getEl('homeName').value = params.get('home');
  if (params.has('away')) getEl('awayName').value = params.get('away');
  if (params.has('ph')) getEl('pointsHome').value = params.get('ph');
  if (params.has('pa')) getEl('pointsAway').value = params.get('pa');
  if (params.has('r')) getEl('remaining').value = params.get('r');
  if (params.has('ppgh')) getEl('ppgHome').value = params.get('ppgh');
  if (params.has('ppga')) getEl('ppgAway').value = params.get('ppga');

  // First render
  render();
}

// onclick helper (HTML)
window.showPaywall = () => {
  if (window.PaywallLogic) window.PaywallLogic.showPaywall();
};

// boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
