import { useState, useEffect, useRef, useCallback } from 'react'
import TriangulacaoView from './TriangulacaoView.jsx'

const STORAGE_KEY = 'mm-mapeamento-cancelamento-parca-v1'

const PALETTE = [
  { color: '#64748B', bg: '#EEF0F2' },
  { color: '#F97316', bg: '#FFF1E4' },
  { color: '#2563EB', bg: '#E9EFFE' },
  { color: '#16A34A', bg: '#E9F7EF' },
  { color: '#7C3AED', bg: '#F1E9FE' },
  { color: '#0EA5E9', bg: '#E5F6FE' },
  { color: '#DB2777', bg: '#FCE4EF' },
]

const DEFAULT_LANES = [
  { id: 'cliente', label: 'Cliente', colorIdx: 0 },
  { id: 'seller', label: 'Seller', colorIdx: 1 },
  { id: 'ops', label: 'Madeira (Ops)', colorIdx: 2 },
  { id: 'financeiro', label: 'Financeiro', colorIdx: 3 },
]

// Metadata that stays fixed (badge text, whether it's a decision/end point).
// laneId, col, title and desc live in editable state so the flow can be reshaped.
const CARD_META = {
  s1: { badge: 'DIA 0', border: true },
  s2: { badge: 'DIA 0', border: true },
  s3: { badge: 'DECISÃO · DIA 0–X', decision: true },
  s4: { badge: 'SIM', border: true, end: true },
  s5: { badge: 'NÃO · DIA X', border: true },
  s6: { badge: 'DECISÃO · DIA X+', decision: true },
  s7: { badge: 'COLETA', border: true },
  s8: { badge: 'SALDO', border: true },
  s9: { badge: 'FIM', border: true, end: true },
  s10: { badge: 'FIM', border: true, end: true },
}

const DEFAULT_CARD_STATE = {
  s1: { laneId: 'cliente', col: 2, title: 'Solicita cancelamento', desc: 'Cliente cancela o pedido após já ter recebido o produto.' },
  s2: { laneId: 'seller', col: 3, title: 'Seller é notificado', desc: 'Prazo de X dias começa a contar para agendar e realizar a coleta.' },
  s3: { laneId: 'seller', col: 4, title: 'Seller coleta dentro do prazo?', desc: 'Verifica se a retirada foi agendada e concluída até o dia X.' },
  s4: { laneId: 'seller', col: 5, title: 'Coleta concluída', desc: 'Produto retorna ao seller. Caso encerrado sem intervenção.' },
  s5: { laneId: 'ops', col: 5, title: 'Madeira intervém', desc: 'Prazo estourado sem coleta pelo seller. Caso escala para a Ops.' },
  s6: { laneId: 'ops', col: 6, title: 'Coleta ou libera saldo?', desc: 'Critério de escolha entre acionar coleta ou estornar o cliente — a validar.' },
  s7: { laneId: 'ops', col: 7, title: 'Madeira aciona a coleta', desc: 'Transportadora/parceiro Parça é acionado para retirar o produto.' },
  s8: { laneId: 'financeiro', col: 7, title: 'Libera saldo ao cliente', desc: 'Financeiro processa o estorno sem aguardar a devolução física.' },
  s9: { laneId: 'ops', col: 8, title: 'Produto retorna', desc: 'Item volta ao estoque do seller ou é descartado, conforme condição.' },
  s10: { laneId: 'cliente', col: 8, title: 'Estorno recebido', desc: 'Cliente recebe o saldo. Caso encerrado.' },
}

const CARD_IDS_ORDER = Object.keys(CARD_META)

const CONNECTIONS = [
  { from: 's1', to: 's2' },
  { from: 's2', to: 's3' },
  { from: 's3', to: 's4', label: 'Sim' },
  { from: 's3', to: 's5', label: 'Não' },
  { from: 's5', to: 's6' },
  { from: 's6', to: 's7', label: 'Coleta' },
  { from: 's6', to: 's8', label: 'Saldo' },
  { from: 's7', to: 's9' },
  { from: 's8', to: 's10' },
]

const DEFAULT_DOCS = {
  etapas: [
    { t: '1. Cliente solicita cancelamento', d: 'Ocorre após a entrega já ter sido confirmada — diferente de um cancelamento pré-envio.' },
    { t: '2. Seller é notificado e o prazo inicia', d: 'Confirmar hoje: a notificação é automática (marketplace) ou depende de checagem manual?' },
    { t: '3. Seller agenda e executa a coleta', d: 'Mapear qual ferramenta o seller usa para agendar (própria transportadora, painel Madeira, etc).' },
    { t: '4. Verificação no dia X', d: 'Definir se essa checagem é automática (sistema fecha o caso) ou manual (analista verifica).' },
    { t: '5. Intervenção da Madeira', d: 'Time responsável por assumir o caso quando o prazo estoura — Gestão Parça, Gestão RCA ou outro?' },
    { t: '6. Decisão: coleta própria ou estorno', d: 'Mapear o critério real de decisão (custo, tipo de produto, disponibilidade de transportadora, escolha do cliente).' },
    { t: '7. Execução (coleta ou saldo)', d: 'Coleta aciona transportadora/parceiro Parça; saldo aciona o financeiro para estorno.' },
    { t: '8. Encerramento do caso', d: 'Confirmar onde esse encerramento fica registrado (Zendesk, planilha, sistema interno) para virar indicador.' },
  ],
  regras: [
    { t: 'Seller coletou dentro do prazo?', d: 'Sim → caso encerra, produto retorna ao seller. Não → escalona para intervenção da Madeira no dia X.' },
    { t: 'Na intervenção, coleta ou libera saldo?', d: 'Critério ainda a validar com o time: pode depender de valor do produto, tipo de produto, custo estimado da coleta, ou preferência do cliente.' },
  ],
  excecoes: [
    { t: 'Produto com avaria', d: 'Fluxo pode mudar dependendo de quem constata o dano (cliente, transportadora ou seller).' },
    { t: 'Seller alega não ter recebido a notificação', d: 'Definir se há prova de envio (log, e-mail, push) para contestar essa alegação.' },
    { t: 'Cliente pede o saldo antes do prazo X', d: 'Definir se isso é possível e sob quais condições.' },
    { t: 'Seller reincidente em não coletar', d: 'Avaliar se isso já entra em algum score de performance do parceiro (ex.: pilar SLA de Coleta).' },
  ],
  indicadores: [
    { t: '% de coletas feitas pelo seller dentro do prazo', d: '' },
    { t: 'Tempo médio até a intervenção da Madeira', d: '' },
    { t: '% de intervenções resolvidas via coleta vs. via estorno', d: '' },
    { t: 'Custo médio da intervenção (frete + operação)', d: '' },
  ],
}

const DEFAULT_TRI = {
  valorProduto: 1000,
  a: { percParceiro: 30, percRepasse: 65 },
  b: { percTaxaColeta: 6 },
  c: { percCompra: 15, percRevenda: 30 },
  d: { percParceiro: 30, percCredito: 20 },
}

function defaultCards() {
  return JSON.parse(JSON.stringify(DEFAULT_CARD_STATE))
}

// Merges saved data (possibly from an older version of the tool, missing
// fields like laneId/col, or with a different shape for tri.b) with the
// current defaults, so old localStorage/exported JSON never breaks the layout.
function mergeCards(savedCards) {
  const merged = {}
  Object.keys(DEFAULT_CARD_STATE).forEach(id => {
    merged[id] = { ...DEFAULT_CARD_STATE[id], ...(savedCards?.[id] || {}) }
  })
  return merged
}

function mergeTri(savedTri) {
  return {
    valorProduto: savedTri?.valorProduto ?? DEFAULT_TRI.valorProduto,
    a: { ...DEFAULT_TRI.a, ...(savedTri?.a || {}) },
    b: { ...DEFAULT_TRI.b, ...(savedTri?.b || {}) },
    c: { ...DEFAULT_TRI.c, ...(savedTri?.c || {}) },
    d: { ...DEFAULT_TRI.d, ...(savedTri?.d || {}) },
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return null
}

function autoGrow(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export default function App() {
  const [view, setView] = useState('fluxo')
  const [cards, setCards] = useState(defaultCards())
  const [docs, setDocs] = useState(DEFAULT_DOCS)
  const [tri, setTriState] = useState(DEFAULT_TRI)
  const [lanes, setLanes] = useState(DEFAULT_LANES)
  const [saveNote, setSaveNote] = useState('tudo salvo')
  const wrapRef = useRef(null)
  const cardRefs = useRef({})
  const fileInputRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    const saved = loadState()
    if (saved) {
      if (saved.cards) setCards(mergeCards(saved.cards))
      if (saved.docs) setDocs(saved.docs)
      if (saved.tri) setTriState(mergeTri(saved.tri))
      if (saved.lanes) setLanes(saved.lanes)
    }
  }, [])

  const scheduleSave = useCallback((nextCards, nextDocs, nextTri, nextLanes) => {
    setSaveNote('editando…')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards: nextCards, docs: nextDocs, tri: nextTri, lanes: nextLanes }))
      setSaveNote('salvo ' + new Date().toLocaleTimeString('pt-BR'))
    }, 500)
  }, [])

  function updateCard(id, field, value) {
    setCards(prev => {
      const next = { ...prev, [id]: { ...prev[id], [field]: value } }
      scheduleSave(next, docs, tri, lanes)
      return next
    })
  }

  function renameLane(id, label) {
    setLanes(prev => {
      const next = prev.map(l => l.id === id ? { ...l, label } : l)
      scheduleSave(cards, docs, tri, next)
      return next
    })
  }

  function addLane() {
    setLanes(prev => {
      const newLane = { id: 'lane_' + Date.now(), label: 'Nova raia', colorIdx: prev.length % PALETTE.length }
      const next = [...prev, newLane]
      scheduleSave(cards, docs, tri, next)
      return next
    })
  }

  function removeLane(id) {
    if (lanes.length <= 1) return
    if (!window.confirm('Remover esta raia? Os cards nela serão movidos para a primeira raia da lista.')) return
    const remaining = lanes.filter(l => l.id !== id)
    const fallbackId = remaining[0].id
    setCards(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        if (next[k].laneId === id) next[k] = { ...next[k], laneId: fallbackId }
      })
      scheduleSave(next, docs, tri, remaining)
      return next
    })
    setLanes(remaining)
  }

  function updateDocItem(section, idx, field, value) {
    setDocs(prev => {
      const list = prev[section].map((item, i) => i === idx ? { ...item, [field]: value } : item)
      const next = { ...prev, [section]: list }
      scheduleSave(cards, next, tri, lanes)
      return next
    })
  }

  function addItem(section) {
    setDocs(prev => {
      const next = { ...prev, [section]: [...prev[section], { t: 'Novo item', d: 'Descrição...' }] }
      scheduleSave(cards, next, tri, lanes)
      return next
    })
  }

  function deleteItem(section, idx) {
    setDocs(prev => {
      const next = { ...prev, [section]: prev[section].filter((_, i) => i !== idx) }
      scheduleSave(cards, next, tri, lanes)
      return next
    })
  }

  function setTri(updater) {
    setTriState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      scheduleSave(cards, docs, next, lanes)
      return next
    })
  }

  function exportJSON() {
    const data = { cards, docs, tri, lanes }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mapeamento-cancelamento-parca.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJSON(evt) {
    const file = evt.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.cards) setCards(mergeCards(data.cards))
        if (data.docs) setDocs(data.docs)
        if (data.tri) setTriState(mergeTri(data.tri))
        if (data.lanes) setLanes(data.lanes)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        setSaveNote('importado ' + new Date().toLocaleTimeString('pt-BR'))
      } catch (err) {
        alert('Arquivo inválido.')
      }
    }
    reader.readAsText(file)
    evt.target.value = ''
  }

  function resetAll() {
    if (!window.confirm('Restaurar o conteúdo padrão? As edições feitas serão perdidas.')) return
    localStorage.removeItem(STORAGE_KEY)
    setCards(defaultCards())
    setDocs(DEFAULT_DOCS)
    setTriState(DEFAULT_TRI)
    setLanes(DEFAULT_LANES)
  }

  // Draw connectors
  const drawConnectors = useCallback(() => {
    const svg = document.getElementById('connectors-svg')
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const wrapRect = wrap.getBoundingClientRect()

    while (svg.lastChild) svg.removeChild(svg.lastChild)

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    defs.innerHTML = `<marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="#8A97A3"></path></marker>`
    svg.appendChild(defs)

    CONNECTIONS.forEach(conn => {
      const fromEl = cardRefs.current[conn.from]
      const toEl = cardRefs.current[conn.to]
      if (!fromEl || !toEl) return
      const fr = fromEl.getBoundingClientRect()
      const tr = toEl.getBoundingClientRect()
      const x1 = fr.right - wrapRect.left
      const y1 = fr.top - wrapRect.top + fr.height / 2
      const x2 = tr.left - wrapRect.left
      const y2 = tr.top - wrapRect.top + tr.height / 2

      let path
      if (Math.abs(y1 - y2) < 2) {
        path = `M${x1},${y1} L${x2 - 6},${y2}`
      } else {
        const midX = x1 + (x2 - x1) / 2
        path = `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2 - 6},${y2}`
      }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', path)
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke', '#8A97A3')
      p.setAttribute('stroke-width', '1.5')
      p.setAttribute('marker-end', 'url(#arrow)')
      svg.appendChild(p)

      if (conn.label) {
        const lx = x1 + (x2 - x1) / 2
        const ly = y1 + (y2 - y1) / 2 - 6
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', lx)
        text.setAttribute('y', ly)
        text.setAttribute('font-family', 'IBM Plex Mono, monospace')
        text.setAttribute('font-size', '10.5')
        text.setAttribute('fill', '#5B6B7A')
        text.setAttribute('text-anchor', 'middle')
        text.textContent = conn.label
        svg.appendChild(text)
      }
    })
  }, [])

  useEffect(() => {
    if (view !== 'fluxo') return
    drawConnectors()
    window.addEventListener('resize', drawConnectors)
    return () => window.removeEventListener('resize', drawConnectors)
  }, [drawConnectors, cards, lanes, view])

  return (
    <div className="page">
      <header className="top">
        <p className="eyebrow">Excelência Operacional · Gestão Parça</p>
        <h1>Cancelamento pós-entrega — coleta pelo seller</h1>
        <p className="subtitle">Mapeamento do fluxo to-be e as opções em aberto para a triangulação financeira com o parceiro de coleta. Clique em qualquer texto para editar — tudo é salvo automaticamente neste navegador.</p>
        <div className="toolbar">
          <button className="btn primary" onClick={exportJSON}>Exportar dados (.json)</button>
          <button className="btn" onClick={() => fileInputRef.current.click()}>Importar dados</button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={importJSON} />
          <button className="btn" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="btn" onClick={resetAll}>Restaurar padrão</button>
          <span className="save-note">{saveNote}</span>
        </div>

        <div className="tabs">
          <button className={'tab-btn' + (view === 'fluxo' ? ' active' : '')} onClick={() => setView('fluxo')}>
            Fluxo To Be
          </button>
          <button className={'tab-btn' + (view === 'triangulacao' ? ' active' : '')} onClick={() => setView('triangulacao')}>
            Triangulação financeira <span className="pending-dot" title="decisão pendente"></span>
          </button>
        </div>
      </header>

      {view === 'fluxo' && (
        <>
          <div className="legend">
            {lanes.map(l => (
              <span key={l.id}><span className="dot" style={{ background: PALETTE[l.colorIdx % PALETTE.length].color }}></span>{l.label}</span>
            ))}
            <span><span className="dot" style={{ background: 'var(--decision)', borderRadius: '2px' }}></span>Ponto de decisão</span>
          </div>

          <div className="flow-card">
            <div className="flow-wrap" ref={wrapRef}>
              <svg id="connectors-svg" className="connectors"></svg>
              <div className="flow-grid" style={{ gridTemplateRows: `repeat(${lanes.length}, minmax(150px,auto))` }}>
                {lanes.map((l, idx) => (
                  <div key={l.id} className="lane-label" style={{ gridRow: idx + 1 }}>
                    <span className="chip" style={{ background: PALETTE[l.colorIdx % PALETTE.length].color }}></span>
                    <input
                      className="lane-name-input"
                      value={l.label}
                      onChange={e => renameLane(l.id, e.target.value)}
                    />
                    {lanes.length > 1 && (
                      <button className="lane-del" title="Remover raia" onClick={() => removeLane(l.id)}>×</button>
                    )}
                  </div>
                ))}
                {lanes.map((l, idx) => (
                  <div key={'band-' + l.id} className="lane-band" style={{ gridRow: idx + 1, background: PALETTE[l.colorIdx % PALETTE.length].bg }}></div>
                ))}

                {CARD_IDS_ORDER.map(id => {
                  const meta = CARD_META[id]
                  const card = cards[id]
                  if (!card) return null
                  const laneIdx = Math.max(0, lanes.findIndex(l => l.id === card.laneId))
                  const laneColor = PALETTE[lanes[laneIdx]?.colorIdx % PALETTE.length]?.color || '#94A3B8'
                  return (
                    <div
                      key={id}
                      ref={el => { cardRefs.current[id] = el }}
                      className={['card', meta.decision ? 'decision' : '', meta.end ? 'end' : ''].filter(Boolean).join(' ')}
                      style={{
                        gridColumn: card.col,
                        gridRow: laneIdx + 1,
                        borderTop: (meta.border && !meta.decision) ? `3px solid ${laneColor}` : undefined
                      }}
                    >
                      <span className="badge">{meta.badge}</span>
                      <input
                        className="title-input"
                        value={card.title ?? ''}
                        onChange={e => updateCard(id, 'title', e.target.value)}
                        onBlur={drawConnectors}
                      />
                      <textarea
                        className="desc-input"
                        rows={2}
                        ref={el => autoGrow(el)}
                        value={card.desc ?? ''}
                        onChange={e => { updateCard(id, 'desc', e.target.value); autoGrow(e.target) }}
                        onBlur={drawConnectors}
                      />
                      {meta.end && <span className="end-tag">✓ fim do caso</span>}

                      <div className="card-controls">
                        <select
                          value={card.laneId}
                          onChange={e => updateCard(id, 'laneId', e.target.value)}
                          title="Mover para outra raia"
                        >
                          {lanes.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                        <button title="Mover para a esquerda" onClick={() => updateCard(id, 'col', Math.max(2, (card.col || 2) - 1))}>◀</button>
                        <button title="Mover para a direita" onClick={() => updateCard(id, 'col', (card.col || 2) + 1)}>▶</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lane-add-row">
            <button className="add-row" onClick={addLane}>+ adicionar raia</button>
          </div>

          <footer className="hint">↳ use o seletor no card para mover entre raias, e as setas ◀ ▶ para reordenar · clique no nome da raia para renomear</footer>

          <div className="docs">
            <h2>Documentação do processo</h2>
            <p className="docs-sub">Detalhamento por seção. Clique para editar, use "+ adicionar" para incluir novos itens.</p>

            <DocSection title="Etapas detalhadas" sectionKey="etapas" docs={docs} updateDocItem={updateDocItem} addItem={addItem} deleteItem={deleteItem} defaultOpen />
            <DocSection title="Regras de decisão" sectionKey="regras" docs={docs} updateDocItem={updateDocItem} addItem={addItem} deleteItem={deleteItem} />
            <DocSection title="Exceções" sectionKey="excecoes" docs={docs} updateDocItem={updateDocItem} addItem={addItem} deleteItem={deleteItem} />
            <DocSection title="Indicadores sugeridos" sectionKey="indicadores" docs={docs} updateDocItem={updateDocItem} addItem={addItem} deleteItem={deleteItem} />
          </div>
        </>
      )}

      {view === 'triangulacao' && (
        <TriangulacaoView tri={tri} setTri={setTri} />
      )}
    </div>
  )
}

function DocSection({ title, sectionKey, docs, updateDocItem, addItem, deleteItem, defaultOpen }) {
  const items = docs[sectionKey]
  return (
    <details className="section" open={defaultOpen}>
      <summary>
        {title}
        <span className="count">{items.length}</span>
        <span className="arrow">›</span>
      </summary>
      <div className="section-body">
        <div className="doc-list">
          {items.map((item, idx) => (
            <div className="doc-item" key={idx}>
              <div className="num">{String(idx + 1).padStart(2, '0')}</div>
              <div className="content">
                <input
                  className="t-input"
                  value={item.t}
                  onChange={e => updateDocItem(sectionKey, idx, 't', e.target.value)}
                />
                <textarea
                  className="d-input"
                  rows={2}
                  ref={el => autoGrow(el)}
                  value={item.d}
                  onChange={e => { updateDocItem(sectionKey, idx, 'd', e.target.value); autoGrow(e.target) }}
                />
              </div>
              <button className="del" title="Remover" onClick={() => deleteItem(sectionKey, idx)}>×</button>
            </div>
          ))}
        </div>
        <button className="add-row" onClick={() => addItem(sectionKey)}>+ adicionar item</button>
      </div>
    </details>
  )
}
