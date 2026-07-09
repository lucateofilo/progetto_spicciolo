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

## 2026-07-10 — Fix (campo data e icone emoji)

### Fix
- `#movementForm input, #movementForm select` in `style.css` non avevano `min-width`: il controllo nativo `input[type="date"]` ha una larghezza minima intrinseca (per i segmenti gg/mm/aaaa e l'icona calendario) che `width: 100%` da sola non riesce a comprimere su alcuni browser mobile, facendo uscire il campo Data a destra rispetto agli altri campi del form (es. Importo). Aggiunto `min-width: 0` alla regola. Aggiunto anche `overflow-x: hidden` a `.modal-content` come rete di sicurezza, coerente col pattern già usato in `html, body`.
- Sostituite le icone emoji "Statistiche" (📊, nella bottom-nav) e "Elimina categoria" (🗑, in Gestione categorie) con SVG inline (`currentColor`): le emoji sono glifi a colori fissi e non rispettavano le regole `color` già presenti in CSS (`.nav-btn.active`, `.category-manager .cat-delete`/`:disabled`), quindi l'icona Statistiche non cambiava colore da attiva e il cestino non risultava rosso/attenuato come previsto.

### Modificato
- Bump `CACHE_NAME` a `spicciolo-v4` in `sw.js` per forzare l'aggiornamento della cache offline con gli asset corretti.
