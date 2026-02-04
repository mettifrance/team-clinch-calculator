// export.js
// ========================================================
// EXPORT: PDF, CSV, Social Card
// (placeholder per ora, da implementare con jsPDF + html2canvas)
// ========================================================

// EXPORT PDF (placeholder)
function exportPDF() {
    // TODO: implementare con jsPDF
    // 1. Raccogliere dati da currentScenario
    // 2. Formattare con jsPDF
    // 3. Includere tabella + risultati
    
    alert('📄 Export PDF: da implementare con jsPDF\n\nInserisci nel progetto:\nnpm install jspdf\n\nPoi sostituisci questa funzione con la generazione PDF reale.');
    
    // Esempio base (da implementare):
    // const { jsPDF } = window.jspdf;
    // const doc = new jsPDF();
    // doc.text('Team Clinch Calculator - Report PRO', 10, 10);
    // ... aggiungi contenuti ...
    // doc.save('clinch-report.pdf');
  }
  
  // EXPORT CSV (implementazione base)
  function exportCSV() {
    // Recupera scenario corrente da app.js
    if (!window.AppState || !window.AppState.currentScenario) {
      alert('⚠️ Esegui prima un calcolo');
      return;
    }
    
    const scenario = window.AppState.currentScenario;
    const { clinchK, rows } = window.CoreLogic.computeClinch(scenario);
    
    // Costruisci CSV
    let csv = 'Step,k,R,Pt Leader,Pt Avversario,Gap,Bottino max,Stato\n';
    
    rows.forEach(r => {
      csv += `${r.step},${r.k},${r.R},${window.CoreLogic.int(r.pH)},${window.CoreLogic.int(r.pA)},${window.CoreLogic.int(r.gap)},${window.CoreLogic.int(r.bounty)},${r.clinched ? 'Campione' : 'In corso'}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clinch-table-${scenario.homeName.toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // CREATE SOCIAL CARD (placeholder)
  function createSocialCard() {
    // TODO: implementare con html2canvas
    // 1. Creare un div nascosto con design social card
    // 2. Popolare con dati (team, risultato, logo)
    // 3. Convertire in immagine con html2canvas
    // 4. Download PNG
    
    alert('📸 Social Card: da implementare con html2canvas\n\nInserisci nel progetto:\nnpm install html2canvas\n\nPoi sostituisci questa funzione con la generazione immagine reale.');
    
    // Esempio base (da implementare):
    // html2canvas(document.querySelector('#social-card')).then(canvas => {
    //   const link = document.createElement('a');
    //   link.download = 'clinch-social-card.png';
    //   link.href = canvas.toDataURL();
    //   link.click();
    // });
  }
  
  // Esporta per uso globale
  if (typeof window !== 'undefined') {
    window.ExportLogic = {
      exportPDF,
      exportCSV,
      createSocialCard
    };
  }
  