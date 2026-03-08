# Hormuz Index — Spec di Refactoring UX/UI

> Documento da passare a Claude Code per applicare le modifiche alla dashboard GeoRisk Monitor.  
> Generato il 7 marzo 2026 da una sessione di review UX/UI su Claude.ai.

---

## 1. CONTESTO DEL PROGETTO

Il progetto **hormuz-index** è una dashboard di monitoraggio della crisi geopolitica Iran-USA-Israele nel Golfo Persico. La dashboard raccoglie segnali da diverse variabili per calcolare il rischio di escalation, inclusi scenari nucleari.

**Stack attuale:** React + Recharts (o equivalente), dark theme, dati aggiornati in tempo reale.

**Obiettivo di questo refactoring:** migliorare UX/UI senza cambiare la logica di calcolo sottostante.

---

## 2. RENAMING: GeoRisk Monitor → Hormuz Index

### Cosa cambiare
- **Header/Logo:** rinominare da "GeoRisk Monitor" a "Hormuz Index"
- **Favicon/Logo icon:** usare le iniziali "HI" in un quadrato arrotondato con gradient rosso→arancione
- **Repository GitHub:** il repo si chiama già `hormuz-index`, ora allineare il branding interno
- **Footer:** aggiungere "Hormuz Index · Dati aggiornati al [data] · Fonte: analisi multi-sorgente"
- **Titolo pagina HTML:** `<title>Hormuz Index — Crisis Dashboard</title>`

### Motivazione
"GeoRisk Monitor" è generico (potrebbe essere terremoti, cyber risk, qualsiasi cosa). "Hormuz Index" è specifico, evoca lo Stretto di Hormuz (fulcro geopolitico), e suona come un prodotto analitico serio (tipo VIX, Fear & Greed Index).

---

## 3. ALERT BANNER — Da lista ripetitiva a banner collassabile

### Problema attuale
Ci sono 5 notifiche "Gulf Attack Index High" quasi identiche impilate in alto, che occupano ~150px di spazio verticale e sono ridondanti.

### Soluzione
Sostituire con un **singolo banner collassabile**:
- **Stato chiuso (default):** una riga con:
  - Icona ⚠️
  - Badge rosso con conteggio: "5 alert attivi"  
  - Testo dell'alert più recente come preview
  - Freccia ▼ per espandere
- **Stato aperto (on click):** si espande mostrando la lista completa degli alert, ognuno con timestamp a destra
- **Stile:** background con gradient rosso molto leggero, bordo `rgba(239,68,68,0.2)`, border-radius 10px

### Codice di riferimento
```jsx
<div className="alert-banner" onClick={toggle}>
  <div className="alert-top">
    <span>⚠️</span>
    <span className="badge">{alerts.length} alert attivi</span>
    <span className="preview">{alerts[0].msg}</span>
    <span className="arrow">{expanded ? '▲' : '▼'}</span>
  </div>
  {expanded && (
    <div className="alert-list">
      {alerts.map(a => (
        <div className="alert-item">
          <span>{a.msg}</span>
          <span className="time">{a.time}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 4. NUOVO: "What Changed" Summary

### Cosa aggiungere
Un box informativo **subito sotto il banner alert**, che genera automaticamente un riassunto testuale delle variazioni significative nelle ultime 24h.

### Logica
```
1. Filtra gli indici con |delta| > 1.0
2. Per ogni indice filtrato: "{label} {+/-}{delta}"
3. Aggiungi: "Scenario dominante: {scenario con prob più alta} ({prob}%)"
4. Se nessun indice ha delta > 1.0: "Nessuna variazione significativa nelle ultime 24h."
```

### Esempio di output
> "Ultime 24h: Gulf Attack -1.1, Strategic Rhetoric +11.7, Proxy Activation +0.7. Scenario dominante: Guerra Regionale (44.2%)."

### Stile
- Background: `rgba(59,130,246,0.06)` (blu tenue)
- Bordo: `rgba(59,130,246,0.15)`
- Icona 📊 a sinistra
- Font size 13px, colore `rgba(255,255,255,0.65)`

---

## 5. GAUGE SEMICIRCOLARE per Rischio Escalation Nucleare

### Problema attuale
Il "Rischio Escalation Nucleare" (34.9%) usa una barra lineare piatta. È il dato più importante della dashboard ma visivamente non emerge abbastanza.

### Soluzione
Sostituire la barra con un **arco semicircolare (gauge)** tipo tachimetro:
- Arco da -210° a +30° (240° totali)
- Traccia di sfondo: `rgba(255,255,255,0.06)`, strokeWidth 10
- Traccia riempita: colore dinamico basato sul valore:
  - 0-20: verde `#22c55e`
  - 20-40: giallo `#f59e0b`  
  - 40-60: arancione `#f97316`
  - 60-100: rosso `#ef4444`
- Drop shadow sul colore attivo: `drop-shadow(0 0 6px {color}60)`
- Al centro dell'arco: valore in grande (28px, JetBrains Mono, bold)
- Sotto il valore: label "RISCHIO ESCALATION" (10px, opacità 0.4)
- Sotto il gauge: delta con freccia colorata (▲ rosso se positivo, ▼ verde se negativo) + "vs precedente"

### Layout del box
- Flex row: info testuale a sinistra (titolo + descrizione), gauge a destra
- Il box deve essere full-width, background con gradient scuro, border-radius 14px

---

## 6. SPARKLINE nelle Index Card

### Problema attuale
Le 7 card degli indici di rischio (Nuclear Opacity, Gulf Attack, ecc.) mostrano solo il valore corrente e il delta. Per capire il trend bisogna scrollare fino ai grafici sotto.

### Soluzione
Aggiungere una **sparkline SVG** (mini grafico a 7 giorni) in basso a destra di ogni card, accanto al badge del livello di rischio.

### Specifiche sparkline
- Dimensioni: 80×24 px
- Tipo: polyline senza riempimento
- Colore: stesso del livello di rischio della card
- StrokeWidth: 1.5px
- Un punto (circle r=2) sull'ultimo valore
- Nessun asse, nessuna label

### Dati
Ogni indice deve avere un array `history` con 7 valori (uno per giorno degli ultimi 7 giorni).

### Layout card aggiornato
```
┌─────────────────────────┐
│ [Label]                 │  ← 11px, opacity 0.5
│ 87.5  -1.1             │  ← valore grande + delta  
│                         │
│ [CRITICO]    ╱╲╱──╲    │  ← badge livello + sparkline
└─────────────────────────┘
```

Ogni card deve avere un `border-left: 3px solid {colore livello}` per rinforzo visivo.

---

## 7. SCENARI DI ESCALATION — Accordion con dettagli on-demand

### Problema attuale
La sezione "Come leggere questa sezione" è un blocco di testo verboso sempre visibile. Le card degli scenari mostrano sempre la descrizione completa, rendendo la sezione molto alta.

### Soluzione

**a) Rimuovere il blocco "Come leggere questa sezione"**  
Sostituirlo con un'icona info (?) accanto al titolo "Scenari di Escalation". Al hover/click mostra un tooltip con la spiegazione.

**b) Card scenari con accordion**
- **Stato chiuso (default):** mostra solo nome scenario, tag (DOMINANTE/MODERATO/BASSO), probabilità in grande, e label "probabilità stimata"
- **Stato aperto (on click):** espande mostrando la descrizione testuale, con un separatore in alto (`border-top: 1px solid rgba(255,255,255,0.06)`)
- In fondo: testo cliccabile "▼ Dettagli" / "▲ Nascondi"

**c) Stile card**
- Barra verticale colorata a sinistra (3px, colore dello scenario)
- Background con gradient leggerissimo del colore scenario
- Hover: leggero shift verso l'alto (`translateY(-1px)`) e border più visibile

### Colori scenario
| Scenario | Colore |
|----------|--------|
| Conflitto Contenuto | `#22c55e` (verde) |
| Guerra Regionale | `#ef4444` (rosso) |
| Crisi Soglia Nucleare | `#f59e0b` (giallo) |
| Coercizione Nucleare | `#f97316` (arancione) |
| Uso Nucleare Effettivo | `#dc2626` (rosso scuro) |

---

## 8. GRAFICO SCENARI — Da Stacked Area a Line Chart

### Problema attuale
Lo stacked area chart con 5 scenari sovrapposti è difficile da leggere. I colori si confondono e non si capisce l'andamento individuale.

### Soluzione
Sostituire con un **line chart a linee separate**:
- Asse Y: 0-60 (non 0-100, dato che nessuno scenario supera il 50%)
- Ogni scenario ha una linea con colore dedicato (stessi colori della tabella sopra)
- "Uso Nucleare Effettivo" con strokeDasharray "4 4" per differenziarlo visivamente
- StrokeWidth: 2px per i 3 scenari principali, 1.5px per i 2 minori
- Dot: false (solo linee, niente pallini)
- Tooltip con sfondo scuro e font monospace
- Legend in basso con icone 8px

---

## 9. NOI (Nuclear Opacity Index) — Da Bar Chart a Radar Chart

### Problema attuale
Il bar chart orizzontale ha quasi tutte le barre vicine a zero, rendendo il grafico visivamente piatto e poco informativo.

### Soluzione
Sostituire con un **radar/spider chart**:
- 6 assi corrispondenti ai 6 componenti NOI
- Area riempita con `#f59e0b` al 15% di opacità
- Bordo `#f59e0b` strokeWidth 2
- PolarGrid con stroke `rgba(255,255,255,0.06)`
- Labels dei componenti a 9px, opacity 0.4
- Dominio asse radiale: 0-20 (o il massimo logico per i dati)

### Vantaggi
Il radar chart dà una "forma" visiva anche quando i valori sono bassi, e permette di capire immediatamente quali componenti sono più elevati.

---

## 10. MAPPA EVENTI — Miglioramento leggibilità

### Problema attuale  
La stacked bar chart per categoria eventi ha colori sovrapposti difficili da distinguere.

### Soluzione (minima)
Mantenere la stacked bar chart ma:
- Aggiungere `barCategoryGap="20%"` per più spazio tra i giorni
- Ultimo elemento dello stack con `radius={[3,3,0,0]}` per arrotondare
- Legend con icone 8px e font 10px

### Colori categorie eventi
| Categoria | Colore |
|-----------|--------|
| Retorica strategica | `#8b5cf6` (viola) |
| Sanzioni | `#3b82f6` (blu) |
| Attività proxy | `#22c55e` (verde) |
| Missili/Droni | `#f59e0b` (giallo) |
| Attacco militare | `#f97316` (arancione) |
| Infrastrutture Golfo | `#ef4444` (rosso) |
| Diplomazia | `#06b6d4` (cyan) |
| De-escalation | `#10b981` (emerald) |

---

## 11. NUOVE FEATURE DA AGGIUNGERE

### 11a. Bottoni Export/Share
Nell'header della dashboard, accanto al bottone "Refresh", aggiungere:
- **📷 Snapshot** — esporta PNG della dashboard (può usare html2canvas)
- **📄 Report** — genera un PDF snapshot della situazione corrente

### 11b. Tooltip Info (?) sulle sezioni
Ogni sezione principale (Indici di Rischio, Scenari, NOI) deve avere un'icona (?) accanto al titolo. Specifiche:
- Cerchio 16×16px, sfondo `rgba(255,255,255,0.06)`
- Testo "?" al centro, opacity 0.3
- Al hover: mostra il testo esplicativo (usare `title` attribute o tooltip custom)

### 11c. Source Transparency
Nella pagina "Sources" (navigazione in alto), ogni dato deve essere tracciabile alla fonte originale. Ogni indice dovrebbe avere un link alle fonti che lo alimentano.

---

## 12. DESIGN SYSTEM

### Font
- **Titoli e UI:** Space Grotesk (o equivalente sans-serif geometrico)
- **Numeri, dati, timestamp:** JetBrains Mono (monospace)
- **Mai usare:** Arial, Inter, Roboto, system fonts generici

### Colori principali
```css
--bg-primary: #0a0e17;
--bg-card: rgba(15,23,42,0.6);
--border: rgba(255,255,255,0.06);
--border-hover: rgba(255,255,255,0.12);
--text-primary: #e2e8f0;
--text-secondary: rgba(255,255,255,0.45);
--text-muted: rgba(255,255,255,0.3);

--green: #22c55e;
--yellow: #f59e0b;
--orange: #f97316;
--red: #ef4444;
--red-dark: #dc2626;
--blue: #3b82f6;
--cyan: #06b6d4;
--purple: #8b5cf6;
```

### Livelli di rischio
| Livello | Colore | Background |
|---------|--------|------------|
| Basso | `#22c55e` | `rgba(34,197,94,0.08)` |
| Moderato | `#f59e0b` | `rgba(245,158,11,0.08)` |
| Elevato | `#f97316` | `rgba(249,115,22,0.08)` |
| Critico | `#ef4444` | `rgba(239,68,68,0.1)` |

### Border radius
- Card: 10-12px
- Badge/Tag: 8-10px
- Bottoni: 6-8px
- Logo: 8px

### Spacing
- Padding card: 14-18px
- Gap tra card: 10px
- Sezioni: margin-bottom 24px
- Header padding: 12px 24px
- Body max-width: 1280px, centrato

---

## 13. HEADER STICKY

Il header deve essere sticky (`position: sticky; top: 0; z-index: 50`) con:
- `backdrop-filter: blur(12px)`
- Background semi-trasparente con gradient
- Border-bottom sottile

---

## 14. RESPONSIVE

- Grid indici: `grid-template-columns: repeat(auto-fill, minmax(165px, 1fr))`
- Grid scenari: `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`
- Grid grafici: 2 colonne sopra 800px, 1 colonna sotto
- Su mobile il gauge si sposta sotto il testo (flex-wrap)

---

## 15. PRIORITÀ DI IMPLEMENTAZIONE

1. **P0 (critiche):** Renaming → Alert banner collassabile → Gauge semicircolare → Scenari accordion
2. **P1 (importanti):** Sparkline nelle card → Line chart scenari → Radar NOI → What Changed summary
3. **P2 (nice-to-have):** Export PNG/PDF → Tooltip info → Source transparency → Responsive polish

---

## 16. RIFERIMENTO IMPLEMENTAZIONE

Un artifact React completo con tutte queste modifiche implementate è disponibile nel file `hormuz-index-dashboard.jsx` generato nella stessa sessione di questo documento. Può essere usato come riferimento per il codice.
