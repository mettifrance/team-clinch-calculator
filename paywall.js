// paywall.js
// ========================================================
// GESTIONE PRO: gating, checkout Stripe, unlock
// ========================================================

// CONFIG (sostituisci con i tuoi valori reali da Supabase)
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL'; // es: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const IS_PRO_KEY = 'clinch_calc_pro';
const PRO_EMAIL_KEY = 'clinch_calc_email';

// STATE
let isPro = localStorage.getItem(IS_PRO_KEY) === 'true';

// UTILITY DOM
const $ = id => document.getElementById(id);

// UPDATE PRO STATUS (chiamato all'init e dopo unlock)
function updateProStatus() {
  isPro = localStorage.getItem(IS_PRO_KEY) === 'true';
  
  // Aggiorna pill status
  const pill = $('statusPill');
  pill.textContent = isPro ? '✅ PRO attivato' : '🆓 Demo gratuita';
  pill.style.background = isPro ? 'var(--success-bg)' : 'rgba(0,217,255,0.15)';
  pill.style.borderColor = isPro ? 'rgba(0,255,136,0.3)' : 'rgba(0,217,255,0.28)';
  pill.style.color = isPro ? 'var(--success)' : 'var(--accent)';
  
  // Nascondi/mostra elementi free
  const freeLimitBadge = $('freeLimitBadge');
  const unlockBtn = $('unlockBtn');
  const proBanner = $('proBanner');
  
  if (freeLimitBadge) freeLimitBadge.classList.toggle('hidden', isPro);
  if (unlockBtn) unlockBtn.classList.toggle('hidden', isPro);
  if (proBanner) proBanner.classList.toggle('hidden', isPro);
  
  // Sblocca inputs ppg
  ['ppgHome', 'ppgAway'].forEach(id => {
    const input = $(id);
    if (!input) return;
    
    if (isPro) {
      input.removeAttribute('readonly');
      input.classList.remove('input-locked');
    } else {
      input.setAttribute('readonly', 'true');
      input.classList.add('input-locked');
    }
  });
  
  // Sblocca sezioni PRO
  document.querySelectorAll('.pro-section').forEach(el => {
    if (isPro) {
      el.classList.add('unlocked');
      // Riabilita tutti i controlli disabilitati
      el.querySelectorAll('button[disabled], input[disabled]').forEach(elem => {
        elem.removeAttribute('disabled');
      });
    }
  });
}

// SHOW PAYWALL MODAL
function showPaywall() {
  const modal = $('paywallModal');
  if (modal) modal.classList.add('active');
}

// CLOSE PAYWALL MODAL
function closePaywall() {
  const modal = $('paywallModal');
  if (modal) modal.classList.remove('active');
}

// CREATE STRIPE CHECKOUT SESSION
async function createCheckoutSession(email) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email,
        success_url: `${window.location.origin}${window.location.pathname}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}${window.location.pathname}?canceled=true`
      })
    });
    
    const data = await response.json();
    
    if (data.url) {
      // Salva email temporaneamente (per dopo il redirect)
      localStorage.setItem(PRO_EMAIL_KEY, email);
      window.location.href = data.url;
    } else {
      alert('❌ Errore creazione checkout: ' + (data.error || 'unknown'));
    }
  } catch (e) {
    alert('❌ Errore di connessione: ' + e.message);
  }
}

// REDEEM SESSION (verifica pagamento e attiva PRO)
async function redeemSession(sessionId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ session_id: sessionId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Attiva PRO localmente
      localStorage.setItem(IS_PRO_KEY, 'true');
      
      // Se c'è email salvata, mantienila
      const email = localStorage.getItem(PRO_EMAIL_KEY);
      if (email) {
        localStorage.setItem(PRO_EMAIL_KEY, email);
      }
      
      updateProStatus();
      
      alert('✅ PRO sbloccato! Tutte le feature sono ora disponibili.');
      
      // Ricarica la pagina per applicare i cambiamenti
      window.location.href = window.location.pathname;
    } else {
      alert('⚠️ Errore nel riscatto: ' + (data.error || 'Pagamento non confermato'));
    }
  } catch (e) {
    alert('❌ Errore: ' + e.message);
  }
}

// SHOW PAYWALL POPUP (per input lockati)
function showPaywallPopup() {
  const confirmed = confirm(
    '⚡ Vuoi modificare le medie punti e fare simulazioni avanzate?\n\n' +
    'Sblocca la versione PRO (5€) per:\n' +
    '✅ Modificare medie punti\n' +
    '✅ 10 scenari what-if\n' +
    '✅ Sensitivity analysis\n' +
    '✅ Simulazione Monte Carlo\n' +
    '✅ Export PDF/CSV/Social Card\n\n' +
    'Vuoi sbloccare ora?'
  );
  
  if (confirmed) {
    showPaywall();
  }
}

// CHECK PRO STATUS (chiamato all'init)
function checkProStatus() {
  updateProStatus();
  
  // Check se siamo tornati da Stripe con successo
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('success') === 'true' && params.get('session_id')) {
    const sessionId = params.get('session_id');
    redeemSession(sessionId);
    // Pulisci URL (evita di ritentare al refresh)
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  if (params.get('canceled') === 'true') {
    alert('❌ Pagamento annullato. Puoi riprovare in qualsiasi momento.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Esporta per uso globale
if (typeof window !== 'undefined') {
  window.PaywallLogic = {
    isPro: () => isPro,
    updateProStatus,
    showPaywall,
    closePaywall,
    createCheckoutSession,
    redeemSession,
    showPaywallPopup,
    checkProStatus
  };
}
