'use client';

export default function MethodologyPage() {
  return (
    <div className="max-w-[860px] mx-auto space-y-8 text-white/80 leading-relaxed">

      {/* Title */}
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl font-bold text-white">Metodologia statistica — Hormuz Index</h1>
        <p className="text-sm text-white/40 mt-1">Documento tecnico per revisione accademica e peer review</p>
        <p className="text-xs text-white/25 mt-2 font-mono">Versione 1.1 — Marzo 2026</p>
      </div>

      {/* Abstract */}
      <Section title="0. Abstract">
        <p>
          Hormuz Index è un sistema di early warning geopolitico che monitora la crisi Iran-USA-Israele
          attraverso l&apos;analisi automatizzata di flussi informativi da 30+ fonti pubbliche. Il sistema produce
          7 indici compositi di rischio (0-100) e 5 probabilità di scenario (somma = 100%), con bande
          di incertezza al 90%.
        </p>
        <p className="mt-2">
          Questo documento descrive nel dettaglio ogni componente matematica e statistica del modello,
          i riferimenti accademici su cui si basa, e i limiti noti. <strong>Il modello è sperimentale
          e indicativo, non predittivo.</strong> Le probabilità rappresentano plausibilità relativa
          condizionata ai dati e alle assunzioni del modello.
        </p>
      </Section>

      {/* 1. Data Pipeline */}
      <Section title="1. Pipeline dati e costruzione degli eventi">
        <p>Il sistema raccoglie notizie da fonti eterogenee, le normalizza, deduplica e classifica.</p>

        <SubSection title="1.1 Fonti e affidabilità">
          <p>
            Ogni fonte ha un punteggio di affidabilità fisso (<code>source_reliability</code>, 0-1).
            Il sistema di grading è ispirato al NATO Admiralty Code (STANAG 2511 / AJP-2.1),
            che usa lettere A-F per l&apos;affidabilità della fonte e numeri 1-6 per la credibilità
            dell&apos;informazione. <strong>La conversione in scala numerica 0-1 è un adattamento
            proprio degli autori</strong>, non una procedura standard NATO. La mappatura è:
            A=0.95, B=0.85, C=0.75, D=0.65, E=0.50, F=non usata.
          </p>
          <Table headers={['Livello', 'Fonti', 'Punteggio']} rows={[
            ['Tier 1 — Agenzie di stampa', 'Reuters, AP, AFP', '0.92 - 0.97'],
            ['Tier 2 — Testate internazionali', 'BBC, Al Jazeera, Guardian, Haaretz', '0.85 - 0.90'],
            ['Tier 3 — Aggregatori', 'GDELT, NewsData, GNews', '0.70 - 0.85'],
            ['Tier 4 — Think tank', 'Carnegie, Brookings, IISS', '0.80 - 0.88'],
            ['Escluse', 'Social media, fonti anonime', 'Non ingerite'],
          ]} />
          <p className="text-xs text-white/40 mt-2">
            Riferimento: NATO STANAG 2511 / AJP-2.1, &quot;Evaluation of intelligence sources and information&quot;,
            Rating A-F per affidabilità della fonte.
          </p>
        </SubSection>

        <SubSection title="1.2 Deduplicazione">
          <p>
            Gli articoli vengono raggruppati per similarità testuale usando RapidFuzz (algoritmo Levenshtein normalizzato)
            con soglia di similarità all&apos;88%. Questo produce cluster di articoli sullo stesso evento.
            Solo l&apos;evento rappresentativo del cluster viene ingerito.
          </p>
          <Formula>
            similarity(a, b) = 1 - levenshtein_distance(a, b) / max(len(a), len(b))
            <br />
            cluster se similarity &ge; 0.88
          </Formula>
        </SubSection>

        <SubSection title="1.3 Classificazione eventi">
          <p>
            Ogni evento viene classificato in una di 17 categorie tramite pattern matching regex
            contro il testo (titolo + sommario). La classificazione assegna:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>category</strong>: tipo di evento (es. military_strike, enrichment_signal)</li>
            <li><strong>signal_keys</strong>: quali indici alimenta (es. GAI, BSI)</li>
            <li><strong>base_severity</strong>: gravità base della categoria (0-1)</li>
            <li><strong>confidence</strong>: quanti pattern hanno matchato / totale pattern della regola</li>
          </ul>
          <p className="mt-2">
            La classificazione è rule-based (non LLM) per riproducibilità e trasparenza.
            Ogni categoria ha un filtro di rilevanza geografica: gli eventi non relativi all&apos;area
            Iran/Golfo/Medio Oriente vengono esclusi per le categorie che lo richiedono.
          </p>
        </SubSection>
      </Section>

      {/* 2. Event Impact */}
      <Section title="2. Impatto evento (Event Impact)">
        <p>Ogni evento classificato produce un punteggio di impatto composito:</p>
        <Formula>
          impact<sub>i</sub> = source_reliability<sub>i</sub> &times; confidence<sub>i</sub> &times; severity<sub>i</sub> &times; novelty<sub>i</sub>
        </Formula>
        <Table headers={['Fattore', 'Range', 'Significato', 'Fonte calibrazione']} rows={[
          ['source_reliability', '0-1', 'Credibilità della fonte (fisso per fonte)', 'Adattamento proprio da NATO Admiralty Code (STANAG 2511)'],
          ['confidence', '0-1', 'Confidenza del classificatore', 'Proporzione pattern matchati'],
          ['severity', '0-1', 'Gravità base della categoria evento', 'Scala Goldstein (1992) adattata'],
          ['novelty', '0-1', 'Quanto l\'evento è nuovo (fattore deduplicazione)', 'Rapporto cluster/duplicati'],
        ]} />
        <p className="text-xs text-white/40 mt-2">
          <strong>Riferimento severità:</strong> Goldstein, J.S. (1992). &quot;A Conflict-Cooperation Scale for WEIS
          International Events Data.&quot; <em>Journal of Conflict Resolution</em>, 36(2), 369-385.
          La scala originale va da -10 (massimo conflitto) a +10 (massima cooperazione).
          <strong>Il sistema usa solo la dimensione conflittuale</strong> (valori negativi della scala),
          normalizzata a (0, 1). Gli eventi cooperativi (positivi nella scala originale) non sono
          catturati dal fattore severity — la componente cooperativa è gestita separatamente
          dall&apos;indice DCI (Diplomatic Channels Index). Questa scelta di design produce una
          asimmetria intenzionale: il modello è più sensibile ai segnali conflittuali.
        </p>
      </Section>

      {/* 3. Subindex */}
      <Section title="3. Calcolo sotto-indici (Subindex)">
        <p>
          Ogni indice aggrega i segnali degli eventi classificati tramite media pesata per impatto.
          Questo è lo standard per la costruzione di indici compositi
          (OECD/JRC Handbook on Constructing Composite Indicators, 2008, Cap. 4 &quot;Weighting&quot;).
        </p>
        <Formula>
          subindex<sub>k</sub> = &Sigma;<sub>i</sub> (impact<sub>i</sub> &times; signal_value<sub>i,k</sub>) / &Sigma;<sub>i</sub> impact<sub>i</sub>
        </Formula>
        <p>
          Dove <code>signal_value<sub>i,k</sub></code> è il valore del segnale k nell&apos;evento i
          (es. BSI=95 per un evento di arricchimento). Se nessun evento ha il segnale k, il sotto-indice vale 0.
        </p>
        <p className="text-xs text-white/40 mt-2">
          <strong>Riferimento:</strong> OECD/JRC (2008). <em>Handbook on Constructing Composite Indicators: Methodology and User Guide.</em>
          Paris: OECD Publishing. Sezione 4.2: &quot;Weights based on statistical methods.&quot;
        </p>
      </Section>

      {/* 4. Rolling Window */}
      <Section title="4. Finestra temporale mobile (Rolling Window)">
        <p>
          Ogni indice finale è una combinazione pesata di tre finestre temporali discrete.
          Questa è una <strong>scelta euristica di design</strong>, non una derivazione formale
          da un modello statistico specifico:
        </p>
        <Formula>
          Index<sub>t</sub> = 0.50 &times; score<sub>24h</sub> + 0.30 &times; score<sub>7d</sub> + 0.20 &times; score<sub>30d</sub>
        </Formula>
        <Table headers={['Finestra', 'Peso', 'Razionale']} rows={[
          ['Ultime 24 ore', '0.50 (50%)', 'Massima reattività ai segnali recenti'],
          ['Ultimi 7 giorni', '0.30 (30%)', 'Trend a breve termine'],
          ['Ultimi 30 giorni', '0.20 (20%)', 'Baseline e contesto storico'],
        ]} />
        <p className="mt-2 text-sm">
          <strong>Razionale:</strong> I pesi 50/30/20 danno priorità decrescente alle osservazioni
          più recenti, coerentemente con la velocità di evoluzione delle crisi geopolitiche.
          Questa è una <strong>discretizzazione a 3 bucket</strong>, non un EWMA (Exponentially
          Weighted Moving Average) formale su serie continua. L&apos;analogia con schemi a
          decadimento esponenziale è pedagogica, non matematica: un EWMA classico ha formula
          S<sub>t</sub> = &alpha; &times; X<sub>t</sub> + (1-&alpha;) &times; S<sub>t-1</sub>
          con half-life = ln(2)/ln(1/(1-&alpha;)), che non è direttamente equiparabile a 3 finestre
          discrete con pesi fissi.
        </p>
      </Section>

      {/* 5. NOI */}
      <Section title="5. Nuclear Opacity Index (NOI) — Indice composito a 6 componenti">
        <p>
          Il NOI misura quanto il programma nucleare iraniano sia opaco alla verifica internazionale.
          È un indice composito con 6 sotto-componenti pesate, ispirato alla struttura
          del NTI Nuclear Security Index (Nuclear Threat Initiative, 2020-2024).
          <strong>L&apos;allocazione dei pesi (A+B = 50%, C+D+E+F = 50%) riflette un giudizio
          di esperti</strong> (expert elicitation) secondo cui la verifica fisica (accesso ai siti +
          conoscenza dei materiali) è la dimensione più critica dell&apos;opacità nucleare.
          Questa scelta non è derivata da una formula NTI specifica ma dalla valutazione
          degli autori sulle priorità dell&apos;IAEA safeguards.
        </p>
        <Formula>
          NOI = 0.25&times;A + 0.25&times;B + 0.20&times;C + 0.10&times;D + 0.10&times;E + 0.10&times;F
        </Formula>
        <Table headers={['Comp.', 'Nome', 'Peso', 'Cosa misura', 'Rif. NTI']} rows={[
          ['A', 'Site Access Loss', '25%', 'Perdita di accesso fisico IAEA ai siti dichiarati', 'Security & Control Measures'],
          ['B', 'Material Knowledge Loss', '25%', 'Perdita di conoscenza su quantità/localizzazione materiali', 'Quantities and Sites'],
          ['C', 'Enrichment Verification Gap', '20%', 'Gap nella verifica dei livelli di arricchimento', 'IAEA Safeguards Reports'],
          ['D', 'Underground Activity Signal', '10%', 'Attività in siti sotterranei/bunkerizzati (Fordow)', 'IAEA reports su Fordow'],
          ['E', 'Technical Diplomatic Breakdown', '10%', 'Rottura della cooperazione tecnica con IAEA', 'NTI Global Norms'],
          ['F', 'Conflicting Narratives', '10%', 'Narrazioni contrastanti sullo stato del programma', 'Intelligence analysis metric'],
        ]} />

        <SubSection title="5.1 Hard Rules (effetti soglia)">
          <p>Il NOI include regole non-lineari per catturare effetti soglia documentati storicamente:</p>
          <Table headers={['Regola', 'Condizione', 'Effetto', 'Precedente storico']} rows={[
            ['HR-1', 'A >= 75 AND B >= 90', 'NOI = max(NOI, 80)', 'Corea del Nord pre-test 2006: perdita totale accesso + materiali'],
            ['HR-2', 'C >= 75 AND D >= 50', 'NOI += 5', 'Iran 2012: gap arricchimento + attività Fordow = rischio composto'],
            ['HR-3', 'E >= 80 AND F >= 70', 'NOI += 3', 'Iraq 2002: rottura diplomatica + narrative contrastanti = incertezza'],
          ]} />
        </SubSection>

        <SubSection title="5.2 Soglie interpretative">
          <p>Allineate alle categorie di conclusione IAEA Safeguards:</p>
          <Table headers={['Range', 'Livello', 'Significato IAEA equivalente']} rows={[
            ['0-24', 'Verde', 'Broader Conclusion: tutto il materiale è contabilizzato'],
            ['25-49', 'Giallo', 'Gap di verifica parziali'],
            ['50-69', 'Arancione', 'Gap di verifica significativi'],
            ['70-84', 'Rosso', 'Impossibile verificare la natura pacifica'],
            ['85-100', 'Rosso scuro', 'Opacità quasi totale'],
          ]} />
        </SubSection>

        <p className="text-xs text-white/40 mt-2">
          <strong>Riferimenti:</strong> NTI Nuclear Security Index (ntiindex.org); IAEA Safeguards Implementation
          Reports (serie GOV/); Albright, D. &amp; Burkhard, S. (2021). &quot;Iran&apos;s Nuclear Program: Status
          and Uncertainties.&quot; Institute for Science and International Security.
        </p>
      </Section>

      {/* 6. Scenario Model */}
      <Section title="6. Modello scenari — Weighted additive scoring model">
        <p>
          Il modello produce 5 probabilità mutuamente esclusive (somma = 100%) che rappresentano
          la <em>plausibilità relativa</em> di ciascuno scenario condizionata ai valori correnti degli indici.
        </p>
        <SubSection title="6.1 Baseline scores (valori base informati dalla letteratura)">
          <p>
            Ogni scenario parte da un valore base (baseline score) informato dalla letteratura.
            Sono valori iniziali di un modello additivo lineare, calibrati su tassi base storici
            per dare al modello un punto di partenza ragionevole.
          </p>
          <Table headers={['Scenario', 'Baseline', 'Fonte calibrazione']} rows={[
            ['Conflitto Contenuto', '50.0', 'ICG CrisisWatch 2003-2024: ~70% delle crisi monitorate restano contenute. Ridotto a 50 per scelta soggettiva degli autori: i pesi positivi degli indici di rischio spostano la distribuzione verso scenari di escalation, quindi il baseline di "contenuto" deve partire più basso per compensare. Questa riduzione NON è una procedura formale documentata.'],
            ['Guerra Regionale', '25.0', 'ICG: spillover regionale in ~20-30% delle crisi serie storicamente.'],
            ['Soglia Nucleare', '15.0', 'Crisi con dimensione nucleare: pochissimi casi post-1945 (Cuba 1962, Kargil 1999).'],
            ['Coercizione Nucleare', '7.0', 'Segnalazione nucleare coercitiva: ~5-7 casi dal 1945 (Berlino 1948, Corea 1953, Taiwan 1954/58, Cuba 1962, Kargil 1999).'],
            ['Uso Nucleare Effettivo', '2.0', 'Zero casi dal 1945. Sondaggi esperti GCR Institute 2020: probabilità annualizzata 0.3-1.5%. Metaculus community forecast.'],
          ]} />
          <p className="text-xs text-white/40 mt-2">
            <strong>Riferimenti:</strong> International Crisis Group, CrisisWatch Database (2003-2024);
            GCR Institute (2020), &quot;Expert Survey on Global Catastrophic Risks&quot;;
            Metaculus, &quot;Nuclear weapon detonation by 2030&quot; community forecast.
          </p>
        </SubSection>

        <SubSection title="6.2 Matrice dei pesi (Weight Matrix)">
          <p>
            La matrice dei pesi codifica i percorsi causali da ogni indice a ogni scenario.
            Il design è <strong>ispirato</strong> al framework GCRI (Global Conflict Risk Index)
            del Joint Research Centre della Commissione Europea (2014), ma con una differenza
            strutturale importante: il GCRI deriva i suoi pesi empiricamente tramite regressione
            logistica su dati storici di conflitto, mentre <strong>i nostri pesi sono assegnati
            manualmente</strong> attraverso ragionamento causale e giudizio di esperti. Non esiste
            un dataset storico di &quot;crisi Iran-Golfo con esiti noti&quot; sufficientemente ampio per
            fare regressione. I pesi riflettono la logica causale della letteratura, non una
            calibrazione statistica.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse mt-2">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 px-2 text-white/60">Indice</th>
                  <th className="text-center py-2 px-1 text-green-400">Contenuto</th>
                  <th className="text-center py-2 px-1 text-yellow-400">Regionale</th>
                  <th className="text-center py-2 px-1 text-orange-400">Soglia</th>
                  <th className="text-center py-2 px-1 text-red-400">Coercizione</th>
                  <th className="text-center py-2 px-1 text-red-800">Uso Nucl.</th>
                  <th className="text-left py-2 px-2 text-white/40">Razionale</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[
                  { idx: 'NOI', vals: [-0.15, 0.06, 0.25, 0.15, 0.00], reason: "Opacità nucleare iraniana: guida 'soglia' (avvicinamento a capacità). Peso ZERO su 'uso effettivo' perché l'Iran non possiede armi nucleari." },
                  { idx: 'GAI', vals: [-0.12, 0.30, 0.04, 0.03, 0.01], reason: 'Attacchi convenzionali: driver primario di guerra regionale. Non causa direttamente escalation nucleare.' },
                  { idx: 'HDI', vals: [-0.10, 0.25, 0.06, 0.04, 0.02], reason: 'Disruption Hormuz: amplifica guerra regionale. Effetto indiretto limitato su scenari nucleari.' },
                  { idx: 'PAI', vals: [-0.08, 0.20, 0.03, 0.02, 0.01], reason: 'Proxy: alimentano guerra regionale ma non causano escalation nucleare direttamente.' },
                  { idx: 'SRI', vals: [-0.08, 0.08, 0.15, 0.25, 0.10], reason: "Retorica strategica: driver primario di 'coercizione' (minacce nucleari da stati armati). Più forte driver di 'uso effettivo' — la retorica precede l'azione." },
                  { idx: 'BSI', vals: [-0.12, 0.04, 0.30, 0.22, 0.08], reason: "Breakout/postura nucleare: driver primario di 'soglia'. Secondo driver di 'uso effettivo' — postura nucleare attiva da USA/Israele." },
                  { idx: 'DCI', vals: [0.25, -0.15, -0.20, -0.18, -0.12], reason: "Diplomazia: unico driver positivo per 'contenuto'. Frena tutti gli scenari di escalation." },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1.5 px-2 font-semibold text-white/70">{row.idx}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} className="text-center py-1.5 px-1" style={{
                        color: v > 0 ? '#ef4444' : v < 0 ? '#22c55e' : '#555',
                      }}>
                        {v > 0 ? '+' : ''}{v.toFixed(2)}
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-[10px] text-white/35 font-sans max-w-[280px]">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="text-sm font-semibold text-white/60 mt-4 mb-2">Principi di design della matrice:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-white/60">
            <li>GAI e HDI sono i driver primari della guerra convenzionale regionale (+0.30, +0.25).</li>
            <li>NOI traccia l&apos;opacità del programma iraniano. Poiché l&apos;Iran NON ha armi nucleari, NOI guida solo &quot;soglia&quot; (avvicinamento alla capacità). NOI ha peso ZERO su &quot;uso effettivo&quot;.</li>
            <li>BSI traccia sia il percorso iraniano verso un dispositivo SIA i segnali di postura nucleare da stati già armati (USA, Israele). BSI guida &quot;soglia&quot; (+0.30) ed è il secondo driver di &quot;uso effettivo&quot; (+0.08).</li>
            <li>SRI cattura la retorica escalatoria da stati con armi nucleari. È il driver più forte di &quot;uso effettivo&quot; (+0.10) perché la retorica precede l&apos;azione.</li>
            <li>DCI (diplomazia) è l&apos;unico freno. È l&apos;unico indice con peso positivo su &quot;contenuto&quot; (+0.25) e negativo su tutti gli altri scenari.</li>
            <li>L&apos;uso nucleare effettivo può provenire SOLO da USA/Israele (che possiedono armi nucleari) o da un trasferimento Russia/Cina all&apos;Iran (monitorato ma estremamente improbabile).</li>
          </ol>

          <p className="text-xs text-white/40 mt-3">
            <strong>Riferimento:</strong> EU Joint Research Centre (2014). &quot;Global Conflict Risk Index (GCRI):
            A quantitative model — Concept and methodology.&quot; JRC Technical Reports. Il GCRI usa
            regressione logistica su dati storici per derivare i pesi empiricamente.
            <strong>I nostri pesi NON sono derivati allo stesso modo</strong> — sono assegnati
            manualmente tramite analisi causale del teatro Iran-Golfo. Il GCRI è citato come
            ispirazione concettuale per l&apos;approccio a matrice indici→scenari, non come
            metodologia replicata.
          </p>
        </SubSection>

        <SubSection title="6.3 Calcolo dello score grezzo">
          <p>Per ogni scenario s:</p>
          <Formula>
            score<sub>s</sub> = baseline<sub>s</sub> + &Sigma;<sub>k</sub> (W<sub>k,s</sub> &times; Index<sub>k</sub>)
          </Formula>
          <p>
            Dove baseline<sub>s</sub> è il valore base dello scenario s (Sezione 6.1),
            W<sub>k,s</sub> è il peso dell&apos;indice k sullo scenario s (Sezione 6.2),
            e Index<sub>k</sub> è il valore corrente dell&apos;indice (0-100).
            Questa è un&apos;aggregazione lineare additiva, non un aggiornamento bayesiano.
          </p>
        </SubSection>

        <SubSection title="6.4 Regole trigger (effetti non-lineari)">
          <p>
            La matrice di pesi è lineare e non cattura le dinamiche non-lineari dell&apos;escalation.
            Le regole trigger aggiungono boost additivi o fattori moltiplicativi quando più indici
            superano simultaneamente soglie critiche.
          </p>
          <Table headers={['Regola', 'Condizione', 'Effetto', 'Razionale']} rows={[
            ['TR-1', 'NOI >= 75 AND BSI >= 65', 'threshold += 5', 'Opacità nucleare + breakout signals = crisi soglia nucleare più probabile'],
            ['TR-2', 'SRI >= 75 AND BSI >= 70', 'coercive += 4', 'Retorica estrema da stati armati + postura attiva = coercizione nucleare'],
            ['TR-3', 'SRI >= 85 AND BSI >= 80 AND GAI >= 80', 'actual += 3', 'Convergenza estrema: retorica + postura + conflitto convenzionale intenso. Unico path verso uso effettivo.'],
            ['TR-4', 'DCI >= 65', 'regional, threshold, coercive, actual x 0.90', 'Diplomazia attiva riduce del 10% tutti gli scenari escalatori'],
          ]} />
        </SubSection>

        <SubSection title="6.5 Normalizzazione">
          <p>Gli score grezzi vengono clampati a &ge; 0 e normalizzati a somma 100:</p>
          <Formula>
            score<sub>s</sub> = max(0, score<sub>s</sub>)
            <br /><br />
            P(s) = score<sub>s</sub> / &Sigma;<sub>j</sub> score<sub>j</sub> &times; 100
          </Formula>
          <p>
            Le probabilità risultanti sono <strong>plausibilità relative</strong>, non probabilità
            calibrate nel senso di Brier score. Rappresentano la distribuzione della plausibilità
            tra gli scenari dato lo stato corrente degli indici.
          </p>
        </SubSection>
      </Section>

      {/* 7. Monte Carlo */}
      <Section title="7. Intervalli di confidenza — Monte Carlo Bootstrap">
        <SubSection title="7.1 Monte Carlo per gli scenari">
          <p>
            Per quantificare l&apos;incertezza delle probabilità di scenario, il modello esegue
            una simulazione Monte Carlo con N=500 iterazioni, seguendo il framework di analisi
            di sensibilità globale di Saltelli et al. (2004).
          </p>
          <p className="mt-2">Ad ogni iterazione:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-white/60">
            <li><strong>Perturbazione indici:</strong> ogni valore di indice viene moltiplicato per un fattore
              casuale uniforme U(0.85, 1.15), cioè &plusmn;15%, poi clampato a [0, 100].</li>
            <li><strong>Perturbazione pesi:</strong> ogni peso della matrice viene moltiplicato per un fattore
              casuale normale N(1.0, 0.20), clippato a [0.6, 1.4], cioè &plusmn;20% con max &plusmn;40%.</li>
            <li>Le probabilità vengono ricalcolate con i valori perturbati.</li>
          </ol>
          <Formula>
            Index<sub>k</sub>&apos; = clamp(Index<sub>k</sub> &times; U(0.85, 1.15), 0, 100)
            <br />
            W<sub>k,s</sub>&apos; = W<sub>k,s</sub> &times; clip(N(1.0, 0.20), 0.6, 1.4)
            <br /><br />
            CI<sub>90%</sub> = [percentile<sub>5</sub>, percentile<sub>95</sub>] su 500 iterazioni
          </Formula>
          <p className="mt-2 text-sm text-white/60">
            Il seed è fissato (seed=42) per riproducibilità all&apos;interno dello stesso snapshot.
            La perturbazione simultanea di input e parametri del modello segue il principio della
            &quot;global sensitivity analysis&quot; — superiore alla perturbazione one-at-a-time (OAT) perché
            cattura le interazioni tra parametri.
          </p>
          <p className="text-xs text-white/40 mt-2">
            <strong>Riferimento:</strong> Saltelli, A., Tarantola, S., Campolongo, F. &amp; Ratto, M. (2004).
            <em> Sensitivity Analysis in Practice: A Guide to Assessing Scientific Models.</em> Wiley.
            Cap. 2: &quot;Why should one perform sensitivity analysis?&quot; e Cap. 5: &quot;Global sensitivity analysis.&quot;
          </p>
        </SubSection>

        <SubSection title="7.2 Bootstrap per gli indici">
          <p>
            I singoli indici hanno bande di incertezza calcolate con bootstrap non-parametrico
            (Efron &amp; Tibshirani, 1993). Con N=200 iterazioni, gli eventi nella finestra 24h vengono
            ricampionati con sostituzione e il sotto-indice viene ricalcolato.
          </p>
          <Formula>
            Per ogni iterazione b = 1, ..., 200:
            <br />
            &nbsp;&nbsp;events<sub>b</sub> = campione con sostituzione da events<sub>24h</sub>
            <br />
            &nbsp;&nbsp;subindex<sub>b</sub> = compute_subindex(events<sub>b</sub>, signal_key)
            <br /><br />
            CI<sub>90%</sub> = [subindex<sub>(10)</sub>, subindex<sub>(190)</sub>]
            <br />
            (5&deg; e 95&deg; percentile: posizione 0.05&times;200=10 e 0.95&times;200=190)
          </Formula>
          <p className="mt-2 text-sm text-white/60">
            Per indici con meno di 5 eventi, il CI viene allargato analiticamente (&plusmn;40% del valore
            o &plusmn;10 punti, il maggiore) per riflettere l&apos;elevata incertezza da campione piccolo.
          </p>
          <p className="text-xs text-white/40 mt-2">
            <strong>Riferimento:</strong> Efron, B. &amp; Tibshirani, R. (1993). <em>An Introduction to the
            Bootstrap.</em> Chapman &amp; Hall/CRC. Cap. 13: &quot;Bootstrap confidence intervals.&quot;
          </p>
        </SubSection>
      </Section>

      {/* 8. Asymmetry */}
      <Section title="8. Asimmetria nucleare — Iran non possiede armi nucleari">
        <p>
          Un aspetto critico del modello è la corretta modellazione dell&apos;asimmetria nucleare
          in questa crisi. L&apos;Iran <strong>non possiede armi nucleari</strong> e il suo programma
          è lontano dal produrne. Le uniche potenze nucleari nel teatro sono USA e Israele.
        </p>
        <p className="mt-2">Questo si riflette nel modello in tre modi:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-white/60 mt-2">
          <li>
            <strong>NOI ha peso ZERO su &quot;Uso Nucleare Effettivo&quot;</strong>: l&apos;opacità del programma
            iraniano non può causare uso nucleare perché l&apos;Iran non ha armi da usare.
          </li>
          <li>
            <strong>SRI è il driver primario di &quot;Uso Effettivo&quot;</strong> (+0.10): cattura la
            retorica nucleare da USA/Israele — gli unici attori che possono effettivamente usare armi nucleari.
          </li>
          <li>
            <strong>Categoria &quot;nuclear_transfer_signal&quot;</strong>: il classificatore monitora segnali
            di trasferimento nucleare da Russia/Cina all&apos;Iran (l&apos;unico path attraverso cui l&apos;Iran
            potrebbe ottenere un dispositivo nucleare a breve termine). Severità 0.98 — la più alta
            del sistema.
          </li>
        </ol>
        <p className="text-xs text-white/40 mt-3">
          <strong>Fonti sulla capacità nucleare iraniana:</strong> IAEA Director General Reports (GOV/2024 series);
          Albright, D. (2024), ISIS Reports; Bulletin of the Atomic Scientists;
          U.S. Intelligence Community Annual Threat Assessment 2024-2025.
        </p>
      </Section>

      {/* 9. Limitations */}
      <Section title="9. Limiti noti e caveat">
        <div className="space-y-3">
          <LimitItem n={1} title="Pesi non validati empiricamente">
            La matrice dei pesi segue la logica causale della letteratura (GCRI, NTI) ma
            <strong> non è stata calibrata con back-testing</strong> su crisi storiche.
            Non esiste un dataset di &quot;crisi Iran-Golfo passate con esiti noti&quot; sufficientemente
            ampio per fare regressione. I pesi sono informati dalla teoria, non dai dati.
          </LimitItem>
          <LimitItem n={2} title="Classificatore rule-based">
            Il classificatore usa pattern matching regex, non NLP avanzato. Questo garantisce
            trasparenza e riproducibilità ma può generare falsi positivi (eventi irrilevanti
            classificati come rilevanti) e falsi negativi (eventi rilevanti non catturati).
          </LimitItem>
          <LimitItem n={3} title="Bias delle fonti">
            Il sistema ingesta solo fonti pubbliche in lingua inglese. Questo introduce bias:
            la copertura mediatica anglofona sovra-rappresenta la prospettiva occidentale e può
            sotto-rappresentare sviluppi interni iraniani o posizioni della Cina/Russia.
          </LimitItem>
          <LimitItem n={4} title="Probabilità non calibrate">
            Le probabilità prodotte sono <em>plausibilità relative</em>, non forecast calibrati.
            Non hanno superato test di calibrazione (Brier score, reliability diagram).
            Un modello calibrato richiederebbe dati storici di risoluzione che non esistono
            per eventi di questa natura.
          </LimitItem>
          <LimitItem n={5} title="Monte Carlo su modello, non su realtà">
            Le bande di incertezza Monte Carlo quantificano l&apos;incertezza <em>del modello</em>
            (sensibilità a perturbazioni degli input e dei pesi), non l&apos;incertezza <em>della realtà</em>.
            Un evento imprevedibile (cigno nero) può far saltare qualsiasi banda di confidenza.
          </LimitItem>
          <LimitItem n={6} title="Indipendenza degli indici">
            Gli indici sono trattati come indipendenti nella matrice dei pesi, ma nella realtà
            sono correlati (es. un attacco militare GAI può causare retorica escalatoria SRI).
            Le regole trigger catturano parzialmente queste interazioni ma non completamente.
          </LimitItem>
          <LimitItem n={7} title="Latenza dati">
            Il sistema aggiorna gli indici ad ogni ciclo Celery (default: ogni 15 minuti per RSS,
            30 min per API). Eventi che si sviluppano rapidamente possono non essere catturati
            in tempo reale.
          </LimitItem>
        </div>
      </Section>

      {/* 10. Interpretation */}
      <Section title="10. Guida all'interpretazione">
        <div className="space-y-3 text-sm text-white/60">
          <p>
            <strong>I trend sono più informativi dei valori assoluti.</strong> Un indice che sale
            da 30 a 50 in 24 ore è un segnale più forte di un indice stabile a 60.
          </p>
          <p>
            <strong>Le bande di incertezza sono essenziali.</strong> Una probabilità di &quot;Soglia Nucleare&quot;
            al 25% con CI [15%-35%] è molto diversa da 25% con CI [24%-26%]. Bande larghe
            indicano alta sensibilità del modello a piccole variazioni.
          </p>
          <p>
            <strong>Lo scenario dominante è relativo, non assoluto.</strong> Se &quot;Guerra Regionale&quot;
            è al 45%, non significa che c&apos;è il 45% di probabilità di guerra. Significa che,
            tra i 5 scenari del modello, la guerra regionale è il più plausibile date le
            informazioni correnti.
          </p>
          <p>
            <strong>Confrontare sempre con analisi esperte.</strong> Questo sistema è un complemento,
            non un sostituto, dell&apos;analisi umana. Le fonti primarie (rapporti IAEA, dichiarazioni
            ufficiali, analisi ICG) restano il gold standard.
          </p>
        </div>
      </Section>

      {/* References */}
      <Section title="11. Riferimenti bibliografici">
        <ol className="list-decimal list-inside space-y-2 text-sm text-white/50">
          <li>Albright, D. &amp; Burkhard, S. (2021). &quot;Iran&apos;s Nuclear Program: Status and Uncertainties.&quot; <em>Institute for Science and International Security.</em></li>
          <li>Efron, B. &amp; Tibshirani, R. (1993). <em>An Introduction to the Bootstrap.</em> Chapman &amp; Hall/CRC.</li>
          <li>EU Joint Research Centre (2014). &quot;Global Conflict Risk Index (GCRI): A quantitative model.&quot; <em>JRC Technical Reports.</em></li>
          <li>GCR Institute (2020). &quot;Expert Survey on Global Catastrophic Risks.&quot;</li>
          <li>Goldstein, J.S. (1992). &quot;A Conflict-Cooperation Scale for WEIS International Events Data.&quot; <em>Journal of Conflict Resolution</em>, 36(2), 369-385.</li>
          <li>International Crisis Group. <em>CrisisWatch Database</em> (2003-2024). crisisgroup.org</li>
          <li>NATO. <em>STANAG 2511 / AJP-2.1: Evaluation of Intelligence Sources and Information.</em></li>
          <li>NTI (Nuclear Threat Initiative). <em>Nuclear Security Index</em> (2020-2024). ntiindex.org</li>
          <li>OECD/JRC (2008). <em>Handbook on Constructing Composite Indicators: Methodology and User Guide.</em> Paris: OECD Publishing.</li>
          <li>Saltelli, A., Tarantola, S., Campolongo, F. &amp; Ratto, M. (2004). <em>Sensitivity Analysis in Practice.</em> Wiley.</li>
          <li>IAEA. <em>Safeguards Implementation Reports</em> (GOV/ series, annual).</li>
          <li>Metaculus. &quot;Nuclear weapon detonation by 2030.&quot; Community forecast.</li>
        </ol>
      </Section>

      <div className="border-t border-white/10 pt-4 pb-8 text-center text-xs text-white/20 font-mono">
        Hormuz Index — Documento metodologico v1.1 — Marzo 2026
        <br />
        Questo documento è parte integrante del sistema e viene aggiornato ad ogni revisione del modello.
      </div>
    </div>
  );
}


/* ---------- Reusable components ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-3 border-b border-white/10 pb-1">{title}</h2>
      <div className="text-sm text-white/65 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-[13px] font-semibold text-white/70 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 px-4 py-3 rounded-lg font-mono text-[12px] text-blue-300 leading-relaxed" style={{
      background: 'rgba(59,130,246,0.06)',
      border: '1px solid rgba(59,130,246,0.15)',
    }}>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse mt-2">
        <thead>
          <tr className="border-b border-white/15">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1.5 px-2 text-white/50 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 px-2 text-white/50">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LimitItem({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
      <div className="text-[12px] font-semibold text-white/60 mb-1">Limite {n}: {title}</div>
      <p className="text-[11px] text-white/45 leading-relaxed">{children}</p>
    </div>
  );
}
