# Changelog — Spicciolo

Tutte le modifiche significative al progetto sono documentate in questo file.
Formato: `## YYYY-MM-DD — Tipo` seguito da sezioni Aggiunto / Modificato / Fix.

## 2026-07-09 — Init

### Aggiunto
- Prima versione dell'app: aggiunta movimenti (entrata/uscita) con importo, data, nota.
- Categorie personalizzate create al volo con nome e colore a scelta.
- Filtro periodo globale (Giorno/Settimana/Mese/Anno) con navigazione avanti/indietro.
- Home con lista movimenti del periodo e totali entrate/uscite/saldo.
- Statistiche: barra 100% entrate vs uscite e lista "Totale per categoria" (con toggle Entrate/Uscite) con barre proporzionali per categoria.
- Gestione categorie: eliminazione consentita solo se la categoria non ha movimenti collegati.
- PWA installabile (`manifest.json` + `sw.js`, cache offline dell'app shell).
- Storage 100% locale (`localStorage`), nessun backend.
