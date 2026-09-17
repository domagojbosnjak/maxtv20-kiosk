# MAXtv 20 godina zajedno - kiosk aplikacija

Nagradna igra za Hrvatski Telekom (MAXtv), prijava putem tableta na
prodajnim mjestima. Vanilla HTML/CSS/JS PWA (bez frameworka), jedna
stranica s više "ekrana" koji se prebacuju JS-om.

- **Live:** https://domagojbosnjak.github.io/maxtv20-kiosk/
- **Git repo:** https://github.com/domagojbosnjak/maxtv20-kiosk (public,
  grana `main`, GitHub Pages se deploya automatski preko GitHub Actionsa
  na svaki push na `main`)

Repo je javan (public) pa se svatko može klonirati bez dozvole; za
**pisanje** (push) treba vlasnik računa (domagojbosnjak) dodati kolegu kao
collaboratora u GitHub repo settingsima.

## Kako pokrenuti lokalno

Nema build koraka - čisti statični fajlovi. Iz ovog foldera:

```bash
python3 -m http.server 8877
```

pa otvoriti `http://localhost:8877/index.html`. Prvi put će tražiti naziv
lokacije (setup ekran) - to se sprema u `localStorage`, pa za brzo
testiranje može se postaviti ručno iz konzole:

```js
localStorage.setItem('maxtv20_location', 'TEST');
location.reload();
```

## KRITIČNO: cache-busting workflow pri svakoj izmjeni

Service worker (`sw.js`) cache-a sve agresivno (cache-first) da app radi i
bez interneta. Da se izmjena stvarno pojavi kod korisnika, kod SVAKE
izmjene `app.js`, `style.css` ili `supabase-config.js` treba:

1. Podignuti broj u `CACHE_NAME` u `sw.js` (npr. `'maxtv20-v29'` →
   `'maxtv20-v30'`)
2. Podignuti isti broj u query stringovima u `index.html` (`?v=29` →
   `?v=30`, na sve tri `<script>`/`<link>` reference) i u `sw.js`-ovom
   `ASSETS` popisu (isti `?v=` sufiksi tamo)

Bez ovoga stari service worker zna nastaviti servirati staru verziju
zauvijek.

### Poznati gotcha: GitHub Pagesov vlastiti HTTP cache

Osim service workera, **sam GitHub Pages** servira `index.html` (i sve
ostalo) s `Cache-Control: max-age=600` (10 min). To znači da čak i običan
reload preglednika zna povući staru verziju iz HTTP cachea unutar tih 10
minuta - potpuno neovisno o gornjem cache-bustingu. Kad testirate odmah
nakon pusha:

- dodajte bilo koji query parametar na link kad testirate (npr.
  `?t=123`) da zaobiđete taj cache, ili
- pričekajte do 10 minuta, ili
- napravite pravi hard-refresh (ne obični reload).

## Deploy

```bash
git add -A
git commit -m "opis izmjene"
git push origin main
```

GitHub Actions automatski builda i deploya na Pages (obično ~30-60s).
Provjera statusa: `gh api repos/domagojbosnjak/maxtv20-kiosk/actions/runs
--jq '.workflow_runs[0]'`.

## Arhitektura / bitni dijelovi

- **`index.html`** - svi ekrani su `<div class="screen">` unutar jednog
  `#app` canvasa fiksne veličine (1920x1200 landscape / 1200x1920
  portrait). `fitCanvas()` (inline script na dnu) skalira/centrira taj
  canvas u stvarni viewport i prebacuje `orientation-portrait` /
  `orientation-landscape` klasu na `<html>` ovisno o rotaciji tableta.
- **`app.js`** - state machine (`showScreen()`), custom on-screen
  tipkovnica (nema native tipkovnice jer su inputi `readonly`), auto-veliko
  slovo za ime/prezime, timeri (30s neaktivnost, 8s auto-return nakon
  zahvale), triple-tap admin/exit overlay (gornji desni kut, 3 dodira u
  1.5s), i "ANTI-BURN-IN" sustav: JEDAN `setInterval` na 6s koji
  koordinirano mijenja TV sliku, zamjenjuje mjesta CTA gumbima, i
  ponavlja "fly-in" animaciju na HL/SHL - sve namjerno na istom ritmu da
  se ne čini kaotično. Ekran zahvale ima svoj zaseban 3s tajmer koji
  ponavlja ISTU fly-in animaciju kao HL (vidi `startThankyouAnim`).
- **`style.css`** - sve "magnetic motion" animacije su CSS `@keyframes`
  (`fly-in-settle`, `tv-bounce-in`) s elastičnom `cubic-bezier(0.34, 1.56,
  0.64, 1)` krivuljom (overshoot pa settle - to je taj "magnetski" osjećaj).
  Portrait layout je pod `.orientation-portrait` prefiksom.
- **`supabase-config.js`** - Supabase backend (tablica
  `maxtv20_prijave`), offline-first: ako nema neta, prijava ide u
  `localStorage` red (`maxtv20_pending_entries`) i šalje se automatski čim
  se veza vrati (`online` event / vidljivost taba / svakih 60s kao safety
  net).
- **`nagrada-tv.webp` / `nagrada-tv-2.webp`** - TV product foto, WebP radi
  veličine (bitno za webintoapp.com 2MB limit ako se ikad opet radi APK
  preko njih). Rub je ručno očišćen (hard-threshold cutout, ne soft
  anti-alias) da nema bijeli halo oko silhouette-a.

## Sadržajne/pravne napomene

- Datumi nagradne igre (21.9.2026-31.10.2026, izvlačenje 4.11.2026) su
  hardkodirani i u `index.html` (ekran pravila) i u zaglavlju ovog appa -
  ako se termin promijeni, treba ažurirati na oba mjesta.
- Puna, službena pravila su vanjski dokument (linkano tekstom "Potpuna,
  službena Pravila... dostupna su na www.hrvatskitelekom.hr/obavijesti") -
  ekran unutar appa je sažetak.

## APK (opcionalno, ako se ide preko webintoapp.com)

Vidi `UPUTE-APK.txt` - kratke upute za zip/upload na webintoapp.com i
zašto Package Name mora ostati `com.hanger.maxtv20godina`. Napomena iz
ranije analize: webintoapp.com free plan ubacuje svoje reklame u APK -
ako se ide tim putem za produkciju, razmisliti o plaćenom planu ili
Capacitor buildu. Trenutni pristup (hosted PWA + Fully Kiosk Browser) tu
nema ograničenja i preporučen je za produkciju.
