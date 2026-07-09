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

## 2026-07-09 — Fix (modale sempre visibile)

### Fix
- `[hidden] { display: none !important; }` in `style.css`: `.modal` e `.new-category-fields` impostavano `display: flex` con la stessa specificità dell'attributo `hidden`, che quindi veniva ignorato — il modale di aggiunta movimento restava sempre aperto e bloccava l'app, "Salva" sembrava non funzionare (il campo data non era inizializzato e la validazione nativa bloccava l'invio) e "Annulla" (X) non chiudeva nulla.
- Bump `CACHE_NAME` a `spicciolo-v2` in `sw.js` per forzare l'aggiornamento della cache offline con gli asset corretti.

## 2026-07-09 — Fix (layout mobile)

### Fix
- `#app` usava `min-height: 100vh`, che su iOS (sia in Safari con toolbar dinamica sia nella PWA installata in standalone) non corrisponde in modo affidabile al viewport visivo reale: rendeva la pagina scrollabile più del dovuto e spostava gli elementi `position: fixed` (bottom-nav, FAB) rispetto al viewport reale, tagliando la bottom-nav sul bordo inferiore e causando un effetto di rimbalzo orizzontale che tagliava titolo e card in alto a sinistra. Aggiunto `min-height: 100dvh` (con fallback `100vh`) e `overflow-x: hidden` su `html, body` in `style.css`.
- Bump `CACHE_NAME` a `spicciolo-v3` in `sw.js` per forzare l'aggiornamento della cache offline con gli asset corretti.
