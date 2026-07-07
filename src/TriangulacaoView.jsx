function fmt(v) {
  return 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR')
}

export default function TriangulacaoView({ tri, setTri }) {
  const v = tri.valorProduto || 0

  function setValorProduto(val) {
    setTri(prev => ({ ...prev, valorProduto: val }))
  }
  function setOptField(opt, field, val) {
    setTri(prev => ({ ...prev, [opt]: { ...prev[opt], [field]: val } }))
  }

  // Option A
  const aPago = v * (tri.a.percParceiro || 0) / 100
  const aRepasse = aPago * (tri.a.percRepasse || 0) / 100
  // Option B
  const bSeller = v * (tri.b.percSeller || 0) / 100
  const bTaxa = v * (tri.b.percTaxa || 0) / 100
  // Option C
  const cCompra = v * (tri.c.percCompra || 0) / 100
  const cRevenda = v * (tri.c.percRevenda || 0) / 100
  // Option D
  const dPago = v * (tri.d.percParceiro || 0) / 100
  const dCredito = dPago > 0 ? v * (tri.d.percCredito || 0) / 100 : v * (tri.d.percCredito || 0) / 100

  return (
    <div>
      <p className="subtitle" style={{ marginTop: 18 }}>
        Quatro formas possíveis de estruturar o pagamento quando um parceiro de coleta assume a retirada do produto e um valor reduzido é repassado ao seller. Ajuste o valor do produto e os percentuais para comparar os números lado a lado.
      </p>

      <div className="tri-disclaimer">
        ⚠️ Isto é um comparativo operacional para apoiar a discussão interna — não é um parecer jurídico ou tributário. As observações fiscais abaixo são considerações gerais (tipo de nota fiscal, incidência sobre valor cheio vs. margem, custódia de valor de terceiro) que costumam variar por regime tributário e enquadramento contratual. Antes de decidir, vale validar com o jurídico/fiscal da Madeira.
      </div>

      <div className="tri-calc-bar">
        <label>Valor do produto (R$)</label>
        <input type="number" min="0" step="10" value={tri.valorProduto}
          onChange={e => setValorProduto(parseFloat(e.target.value) || 0)} />
        <span className="example-tag">exemplo: sofá de R$ 1.000</span>
      </div>

      <div className="tri-grid">

        {/* OPTION A */}
        <div className="tri-option">
          <div className="tri-tag">Opção A</div>
          <h3>Repasse com retenção</h3>
          <p className="tri-desc">A Madeira recebe o pagamento do parceiro, retém uma parte e repassa um valor reduzido ao seller. É a forma inicialmente proposta.</p>
          <div className="tri-flow">
            <div className="tri-flow-row">
              <div className="tri-node parceiro">Parceiro</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(aPago)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node madeira">Madeira</div>
            </div>
            <div className="tri-flow-row">
              <div className="tri-node madeira hidden">Madeira</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(aRepasse)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node seller">Seller</div>
            </div>
            <div className="tri-retain-note">Madeira retém: <b>{fmt(aPago - aRepasse)}</b></div>
            <div className="tri-perc-row">
              <span>% do produto pago pelo parceiro: <input type="number" min="0" max="100" value={tri.a.percParceiro}
                onChange={e => setOptField('a', 'percParceiro', parseFloat(e.target.value) || 0)} />%</span>
              <span>% repassado ao seller: <input type="number" min="0" max="100" value={tri.a.percRepasse}
                onChange={e => setOptField('a', 'percRepasse', parseFloat(e.target.value) || 0)} />%</span>
            </div>
          </div>
          <div className="tri-cols">
            <div className="tri-col pos">
              <h4>Vantagens</h4>
              <ul>
                <li>Madeira controla toda a negociação e o timing do repasse.</li>
                <li>Um único fluxo de caixa a conciliar por caso.</li>
                <li>Seller não precisa negociar com o parceiro.</li>
              </ul>
            </div>
            <div className="tri-col neg">
              <h4>Considerações fiscais</h4>
              <ul>
                <li>Madeira fica com custódia de valor de terceiro antes de repassar — exige conciliação rastreável.</li>
                <li>Se não for tratado como intermediação/comissão, o valor total recebido pode ser interpretado como receita própria (incidência sobre o valor cheio, não só a margem retida).</li>
                <li>Provavelmente exige nota fiscal de intermediação bem definida contratualmente.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* OPTION B */}
        <div className="tri-option">
          <div className="tri-tag">Opção B</div>
          <h3>Fluxos desacoplados</h3>
          <p className="tri-desc">O parceiro paga o seller diretamente e paga a Madeira separadamente, por uma taxa de coordenação do serviço.</p>
          <div className="tri-flow">
            <div className="tri-flow-row">
              <div className="tri-node parceiro">Parceiro</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(bSeller)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node seller">Seller</div>
            </div>
            <div className="tri-flow-row">
              <div className="tri-node parceiro hidden">Parceiro</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(bTaxa)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node madeira">Madeira</div>
            </div>
            <div className="tri-retain-note">Madeira só fatura a própria taxa: <b>{fmt(bTaxa)}</b></div>
            <div className="tri-perc-row">
              <span>% pago direto ao seller: <input type="number" min="0" max="100" value={tri.b.percSeller}
                onChange={e => setOptField('b', 'percSeller', parseFloat(e.target.value) || 0)} />%</span>
              <span>% taxa de coordenação p/ Madeira: <input type="number" min="0" max="100" value={tri.b.percTaxa}
                onChange={e => setOptField('b', 'percTaxa', parseFloat(e.target.value) || 0)} />%</span>
            </div>
          </div>
          <div className="tri-cols">
            <div className="tri-col pos">
              <h4>Vantagens</h4>
              <ul>
                <li>Madeira nunca tem custódia de valor de terceiro — só fatura o próprio serviço.</li>
                <li>Cada nota fiscal fica clara: venda do seller ao parceiro e serviço de coordenação da Madeira.</li>
                <li>Reaproveita a lógica de faturamento de parceiro já existente (Protheus/CSC Financeiro).</li>
              </ul>
            </div>
            <div className="tri-col neg">
              <h4>Considerações fiscais</h4>
              <ul>
                <li>Depende de dois pagamentos distintos acontecerem — risco de o parceiro pagar um lado e não o outro.</li>
                <li>Mais difícil garantir SLA de recebimento do seller, já que a Madeira não controla esse pagamento.</li>
                <li>Reconciliação mais dispersa, com mais partes envolvidas por caso.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* OPTION C */}
        <div className="tri-option">
          <div className="tri-tag">Opção C</div>
          <h3>Buyback fixo pela Madeira</h3>
          <p className="tri-desc">A Madeira compra o produto do seller por um valor fixo e reduzido, e revende/repassa ao parceiro por conta própria — assumindo o resultado da negociação.</p>
          <div className="tri-flow">
            <div className="tri-flow-row">
              <div className="tri-node madeira">Madeira</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(cCompra)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node seller">Seller</div>
            </div>
            <div className="tri-flow-row">
              <div className="tri-node parceiro">Parceiro</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(cRevenda)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node madeira">Madeira</div>
            </div>
            <div className="tri-retain-note">Margem da Madeira na revenda: <b>{fmt(cRevenda - cCompra)}</b></div>
            <div className="tri-perc-row">
              <span>% pago ao seller (compra): <input type="number" min="0" max="100" value={tri.c.percCompra}
                onChange={e => setOptField('c', 'percCompra', parseFloat(e.target.value) || 0)} />%</span>
              <span>% cobrado do parceiro (revenda): <input type="number" min="0" max="100" value={tri.c.percRevenda}
                onChange={e => setOptField('c', 'percRevenda', parseFloat(e.target.value) || 0)} />%</span>
            </div>
          </div>
          <div className="tri-cols">
            <div className="tri-col pos">
              <h4>Vantagens</h4>
              <ul>
                <li>Seller tem previsibilidade e recebe rápido, sem depender da negociação com o parceiro.</li>
                <li>Reaproveita o canal já em construção de lojas de salvados / prospecção de parceiros.</li>
                <li>Madeira pode buscar melhores condições de revenda sem o seller no meio da negociação.</li>
              </ul>
            </div>
            <div className="tri-col neg">
              <h4>Considerações fiscais</h4>
              <ul>
                <li>A Madeira passa a ser efetivamente compradora e revendedora da mercadoria — normalmente exige nota de compra e nota de venda, não apenas de comissão.</li>
                <li>Tributação (ex.: ICMS) pode incidir sobre o valor cheio de revenda, não só sobre a margem — dependendo do regime, mais oneroso que um modelo de comissão.</li>
                <li>Madeira assume responsabilidade/risco sobre a mercadoria entre a compra e a revenda.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* OPTION D */}
        <div className="tri-option">
          <div className="tri-tag">Opção D</div>
          <h3>Crédito em fatura</h3>
          <p className="tri-desc">Em vez de transferir dinheiro, a Madeira credita o valor reduzido como abatimento na próxima fatura/repasse normal do seller.</p>
          <div className="tri-flow">
            <div className="tri-flow-row">
              <div className="tri-node parceiro">Parceiro</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(dPago)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node madeira">Madeira</div>
            </div>
            <div className="tri-flow-row">
              <div className="tri-node madeira hidden">Madeira</div>
              <div className="tri-arrow-lbl"><span className="tri-val">{fmt(dCredito)}</span><span className="tri-arrow-end">→</span></div>
              <div className="tri-node seller">Seller <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(crédito na fatura)</span></div>
            </div>
            <div className="tri-retain-note">Madeira retém: <b>{fmt(dPago - dCredito)}</b></div>
            <div className="tri-perc-row">
              <span>% do produto pago pelo parceiro: <input type="number" min="0" max="100" value={tri.d.percParceiro}
                onChange={e => setOptField('d', 'percParceiro', parseFloat(e.target.value) || 0)} />%</span>
              <span>% creditado ao seller: <input type="number" min="0" max="100" value={tri.d.percCredito}
                onChange={e => setOptField('d', 'percCredito', parseFloat(e.target.value) || 0)} />%</span>
            </div>
          </div>
          <div className="tri-cols">
            <div className="tri-col pos">
              <h4>Vantagens</h4>
              <ul>
                <li>Reaproveita a esteira de faturamento/repasse que já existe com o seller.</li>
                <li>Não cria uma nova rota de pagamento (sem TED/Pix avulso).</li>
                <li>Simples de operacionalizar no curto prazo.</li>
              </ul>
            </div>
            <div className="tri-col neg">
              <h4>Considerações fiscais</h4>
              <ul>
                <li>Precisa estar claro em contrato se é desconto, indenização ou compensação de dívida — classificações diferentes têm tratamento contábil distinto.</li>
                <li>Se o seller não tiver faturas futuras suficientes, gera passivo em aberto para a Madeira.</li>
                <li>Risco de o seller contestar o valor por não ver o dinheiro "de fato" entrar, apenas abatido.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      <footer className="hint">
        ↳ os percentuais são apenas ilustrativos para comparação — ajuste-os para refletir os números reais em negociação.<br />
        ↳ nenhuma das opções está fechada; o ponto central é decidir se a Madeira quer ter custódia do dinheiro (recebe do parceiro, decide quanto repassa) ou só intermediar cobrando uma taxa pelo serviço.
      </footer>
    </div>
  )
}
