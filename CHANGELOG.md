# Changelog — Spicciolo

Tutte le modifiche significative al progetto sono documentate in questo file.
Formato: `## YYYY-MM-DD — Tipo` seguito da sezioni Aggiunto / Modificato / Fix.

## 2026-07-12 — Feature (tag sui movimenti, periodo personalizzato)

### Aggiunto
- **Tag multipli sui movimenti**: campo opzionale nel form movimento, tag separati da virgola (normalizzati minuscolo, deduplicati). Suggeriti via `<datalist>` nativa con i tag già usati, nessuna UI custom di autocomplete. Mostrati come chip sotto la nota nella lista movimenti; toccare un chip filtra subito la lista per quel tag riusando la ricerca testuale già esistente (che ora include anche i tag nell'haystack). Colonna "Tag" aggiunta all'export CSV; copiati anche da "Duplica movimento".
- **Filtro periodo personalizzato**: nuova opzione "Personalizzato" nel select periodo, con due campi data (inizio/fine) al posto delle frecce avanti/indietro. "Andamento" e "Confronto con il periodo precedente" si nascondono per questo periodo (nessun "periodo precedente" o sequenza di periodi ha senso per un intervallo libero); media uscite calcolata sui giorni effettivi dell'intervallo.

## 2026-07-10 — Feature (scontrini, filtro categoria, avvisi budget, duplica, backup)

### Aggiunto
- **Foto scontrino sui movimenti**: nel modale movimento, campo opzionale "Aggiungi foto" (input nativo con `capture="environment"`, apre la fotocamera su mobile). Le foto sono salvate in **IndexedDB** (`assets/js/photos.js`, wrapper nativo senza librerie) tenute separate dal JSON in `localStorage` per non appesantire ogni lettura/scrittura dei dati con blob binari. Un'icona a graffetta compare accanto al movimento in Home quando ha uno scontrino allegato.
- **Scontrino veloce**: nuovo FAB secondario (icona fotocamera) sopra il "+" principale — scatta/scegli una foto e crea subito un movimento **incompleto** (senza importo/categoria), evidenziato in Home con un bordo ambra e l'etichetta "Da completare". Basta toccarlo più tardi per finire di inserire i dati; salvando dal modale con tutti i campi richiesti l'etichetta sparisce. I movimenti incompleti non entrano nei totali per categoria (Statistiche) né nell'export CSV.
- **Duplica movimento**: bottone "Duplica" nel modale di modifica — crea una copia del movimento con data odierna, utile per spese ricorrenti troppo irregolari da gestire come "ricorrente" vero.
- **Filtro categoria in Home**: select accanto alla ricerca testuale per filtrare la lista movimenti per categoria. Il filtro per tipo (entrata/uscita) non è stato aggiunto: già leggibile a colpo d'occhio dal colore/segno di ogni riga, sarebbe stato ridondante.
- **Avvisi budget**: quando il periodo è "Mese" e una categoria di uscita supera l'80% del proprio budget, in Home compare un chip di avviso (ambra sotto l'80-99%, rosso da 100% in su).
- **Backup dati**: in Gestione, "Esporta backup" / "Ripristina backup" per salvare/ripristinare l'intero stato (categorie, movimenti, ricorrenti, budget) in un file JSON. Il ripristino **sostituisce** tutti i dati correnti (conferma richiesta) — a differenza dell'export CSV, non è un merge. Le foto degli scontrini (IndexedDB) non sono incluse nel backup.
- Bump `CACHE_NAME` a `spicciolo-v9` in `sw.js`, aggiunto `assets/js/photos.js` all'app shell cacheata offline.

### Modificato
- Schema movimento esteso con `incomplete` e `hasPhoto` (booleani, default `false`): i dati esistenti restano validi, i campi mancanti vengono aggiunti in lettura senza migrazione distruttiva (stesso pattern già usato per `recurringId`/`budget`).

## 2026-07-10 — Feature (donut categorie)

### Aggiunto
- **Donut categorie**: in Statistiche, sopra la lista "Totale per categoria", un grafico a ciambella con `conic-gradient` CSS nativo (nessuna libreria di grafici) mostra la ripartizione percentuale delle categorie per il tipo selezionato (Uscite/Entrate), con il totale del periodo al centro.

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

## 2026-07-10 — Feature (gestione, statistiche avanzate, ricorrenti)

### Aggiunto
- Nuova terza tab "Gestione" nella bottom-nav (icona ingranaggio SVG), per non affollare ulteriormente Statistiche.
- **Modifica categoria**: nome e colore di una categoria esistente sono ora modificabili (icona matita in Gestione), oltre alla creazione ed eliminazione già presenti.
- **Budget mensile per categoria**: campo opzionale (si applica sia a categorie di Entrata che di Uscita); in Statistiche, quando il periodo è "Mese", sotto ogni categoria con budget impostato compare una seconda barra di avanzamento (colore neutro/arancio/rosso per le uscite oltre l'80%/100% del budget, verde per le entrate al raggiungimento dell'obiettivo).
- **Riordino categorie**: frecce su/giù in Gestione per riordinare manualmente la lista delle categorie (l'ordine è quello mostrato ovunque nell'app).
- **Movimenti ricorrenti**: nuova sezione in Gestione per definire movimenti che si ripetono ogni mese (es. affitto, stipendio, abbonamenti) con importo, categoria, giorno del mese e stato attivo/in pausa. All'apertura dell'app, i movimenti dovuti vengono generati automaticamente e silenziosamente (anche recuperando i mesi mancati se l'app non viene aperta per un po').
- **Esporta CSV**: in Gestione, bottone per scaricare tutti i movimenti in un file CSV (data, tipo, categoria, importo, nota), apribile in Excel/Fogli Google.
- **Andamento**: nuovo grafico a barre in Statistiche con il saldo netto degli ultimi 6 periodi (in base al filtro Giorno/Settimana/Mese/Anno selezionato).
- **Confronto con il periodo precedente**: nuova card in Statistiche con entrate/uscite/saldo del periodo corrente a confronto con quello precedente, con variazione percentuale.
- **Ricerca movimenti**: campo di ricerca in Home per filtrare i movimenti del periodo per nota o nome categoria.
- **Media periodo**: sotto i totali in Home, media giornaliera (Settimana/Mese) o mensile (Anno) delle uscite del periodo selezionato.

### Modificato
- Schema dati (`storage.js`) esteso a `version: 2`: categorie con `budget` opzionale, movimenti con `recurringId` (per collegarli al ricorrente che li ha generati), nuova collezione `recurring`. I dati esistenti restano validi, i campi mancanti vengono aggiunti in lettura senza migrazione distruttiva.
- Bump `CACHE_NAME` a `spicciolo-v5` in `sw.js` per forzare l'aggiornamento della cache offline con gli asset corretti.

## 2026-07-10 — Fix (campo data ancora sovradimensionato su iOS)

### Fix
- Il fix precedente (`min-width: 0` su `.modal-form input`) non era sufficiente su iOS Safari: il controllo nativo `input[type="date"]` mantiene una larghezza intrinseca propria che ignora `width: 100%` anche con `min-width: 0`, per cui l'intero box (sfondo e bordi arrotondati inclusi, non solo il testo) risultava più largo degli altri campi e veniva tagliato dal bordo destro dello schermo. Aggiunta la regola dedicata `.modal-form input[type="date"] { width: 1px; min-width: 100%; }`: forzando un `width` esplicito più piccolo del `min-width`, il browser è costretto a usare `min-width: 100%` come larghezza effettiva, bypassando la larghezza intrinseca del controllo.
- Bump `CACHE_NAME` a `spicciolo-v6` in `sw.js` per forzare l'aggiornamento della cache offline con gli asset corretti.

## 2026-07-10 — Refactor (pulizia ponytail)

### Modificato
- `genId()` in `storage.js` usava `Date.now().toString(36) + Math.random().toString(36)` per generare ID: sostituito con `crypto.randomUUID()`, nativo nei browser moderni (l'app richiede già HTTPS/localhost per la PWA).
- `toISODate()` in `app.js` costruiva la stringa `YYYY-MM-DD` a mano: sostituito con `date.toLocaleDateString("en-CA")`, che restituisce lo stesso formato nativamente in ora locale.
- `updateCategory`, `updateMovement`, `updateRecurring` in `storage.js` ripetevano lo stesso pattern find-by-id + `Object.assign` + save: estratto in un helper condiviso `updateEntity()`.
- `populateCategorySelect` e `populateRecurringCategorySelect` in `app.js` duplicavano lo stesso loop di costruzione delle `<option>`: unificate in `fillCategorySelect()` con un flag per l'opzione "+ Nuova categoria".
- Rimosso il campo `version` da `loadData()`/`saveData()`: veniva scritto a ogni salvataggio ma non era mai letto per ramificare una migrazione, quindi era morto.
- Bump `CACHE_NAME` a `spicciolo-v7` in `sw.js` per forzare l'aggiornamento della cache offline con gli asset corretti.
