# Reel immobiliari — standard di lavoro

Quando Enzo (Vincenzo Carnicelli) invia dei video/clip di un immobile e chiede di
montarli in un Reel, questo è il flusso da seguire senza richiedere di nuovo le
istruzioni:

## 1. Clip grezze → AI Producer (facoltativo, solo su richiesta esplicita)

Se chiede di "montare" le singole clip con grafica/motion graphics prima di
unirle (es. per provare l'editing AI), usa AI Producer (plugin `aip`), un
progetto per clip (non supporta multi-video in questa integrazione). Risultato:
un link di preview per clip, non un file scaricabile.

## 2. Reel finale → Remotion (`RealEstateReelMulti`)

Questo è il passo che produce il video consegnabile. Scarica le clip/foto
grezze (es. dai progetti AI Producer via `get_workspace_file` su
`render-engine/public/source_full.mp4`, con URL firmato GCS), portale in
`public/` del repo Remotion **solo per la durata del render**: non vanno
committate (sono specifiche del singolo immobile, non asset di brand), vanno
rimosse a fine lavoro insieme a qualunque modifica temporanea di `Root.tsx`.

Struttura del Reel (in quest'ordine):

1. **Copertina**: una foto reale dell'immobile (non una clip) + indirizzo +
   prezzo — fa da "miniatura" tipo YouTube.
2. **Clip video in sequenza** (`ClipSlide`): le clip che manda, nell'ordine in
   cui le manda (o nell'ordine che specifica lui per nome file). Ogni clip ha
   *solo* il logo agenzia in overlay — **mai** testo/prezzo/contatti ripetuti
   su ogni clip. Le clip hanno già di default: zoom lento continuo (alternato
   per indice) + una linea d'accento dorata animata, come motion graphic
   leggero.
3. **Scheda dati** (`tipo`/`stato`/`mq`/`locali`/`bagni`/`classeEnergetica`),
   una sola volta — solo i campi che si conoscono per davvero, mai inventati:
   se manca un dato si omette quella card.
4. **Finale/contatti** (`OutroSlide`): foto di Vincenzo + "Ti interessa?" +
   stack contatti (telefono, email, Instagram, Facebook) + logo agenzia.

## 3. Dati standard (sempre gli stessi, salvo diversa indicazione)

- agencyName: `Frimm Capital Casa Paestum`
- agentName: `Enzo Carnicelli` — agentRole: `Consulente immobiliare`
- phone: `393.2970082`
- email: `immobiliare.agropoli@gmail.com`
- instagramHandle: `lecasedallaaalloz.io`
- facebookPage: `Immobiliare.Agropoli`
- agentPhotoUrl: `staticFile("agente-vincenzo.png")`
- agencyLogoUrl: `staticFile("logo-capitalcasa.png")`
- musicUrl: `staticFile("music-ambient2.mp3")` ("Vivace" — più mossa della
  elegante di default). Le altre tracce disponibili: `music-ambient.mp3`
  (Elegante), `music-ambient3.mp3` (Calda), `music-ambient4.mp3` (Minimale).

Questi valori sono già i `defaultProps` di `RealEstateReelMulti` in
`src/Root.tsx`: per un nuovo immobile basta cambiare `photos`, `address`,
`comune`, `price` e i campi della scheda dati (`tipo`/`stato`/`mq`/...).

## 4. Render

```bash
npx remotion render RealEstateReelMulti out/<nome>.mp4 \
  --browser-executable=/opt/pw-browsers/chromium
```

Nota: il binario "headless shell" di Remotion non è scaricabile da questa rete
(host bloccato) e quello pre-scaricato ha un problema di certificati con i
Google Fonts del progetto — usare invece il Chromium completo già installato
in `/opt/pw-browsers/chromium`, che funziona senza problemi.

Per verificare un singolo frame prima del render completo:
`npx remotion still RealEstateReelMulti out/check.png --frame=N --browser-executable=/opt/pw-browsers/chromium`

**Attenzione**: un asset passato solo tramite `--props` (non referenziato da
nessun `staticFile(...)` nel codice sorgente) non viene incluso dal bundler e
dà 404 — per una prova veloce con un file nuovo, referenzialo temporaneamente
in `Root.tsx` (poi rimuovi la modifica), non solo nel JSON di props.

## 5. Consegna

Il file va mandato a Enzo con `SendUserFile` — il repo resta pulito (niente
clip/foto del singolo immobile, niente modifiche di `Root.tsx` lasciate a metà).
