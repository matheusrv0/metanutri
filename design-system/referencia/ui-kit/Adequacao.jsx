const { Card: ACard, Button: AButton, Badge: ABadge, Progress: AProgress, Table: ATable, Tooltip: ATip, Sheet: ASheet, GrupoOpcoes: AGrupo, Switch: ASwitch, CampoNumero: ANum, Select: ASelect, BarraAdequacao, Alert: AAlert } = window.MetaNutriDesignSystem_38356f;

const VAR = { adequado: 'success', abaixo: 'warning', 'acima-limite': 'error' };
const ROT = { adequado: 'Adequado', abaixo: 'Abaixo da meta', 'acima-limite': 'Acima do limite superior' };
const PROG = { adequado: 'lime', abaixo: 'warning', 'acima-limite': 'error' };

function Marcas({ l }) {
  return (
    <React.Fragment>
      {l.semDado ? <ATip content={l.semDado + (l.semDado === 1 ? ' alimento do plano não tem' : ' alimentos do plano não têm') + ' este nutriente na tabela: total possivelmente subestimado.'}><abbr className="mn-mark mn-mark--warn" style={{ textDecoration: 'none' }}>†</abbr></ATip> : null}
    </React.Fragment>
  );
}

function GavetaCobrir({ chave, rotulo, mobile, aoFechar, aoAdicionar, plano }) {
  const [refeicao, setRefeicao] = React.useState(plano[0].id);
  const [cru, setCru] = React.useState(false);
  const [ocultos, setOcultos] = React.useState([]);
  const d = chave ? window.MN_COBRIR[chave] : null;
  return (
    <ASheet open={!!chave} side={mobile ? 'bottom' : 'right'} onClose={aoFechar} title={'Cobrir ' + rotulo} description={d ? 'Faltam ' + d.falta + ' para a meta. Cabem ' + d.kcal + ' kcal até o gasto energético.' : ''}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, background: 'var(--surface-sunken)', borderRadius: 14 }}>
        <ANum rotulo="Porção máxima por sugestão" valor={200} sufixo="g" size="sm" />
        <ASwitch label="Incluir ingredientes e alimentos crus" checked={cru} onChange={setCru} />
      </div>
      <ASelect label="Adicionar em" value={refeicao} onChange={(e) => setRefeicao(e.target.value)} options={plano.map((r) => ({ value: r.id, label: r.horario + ' ' + r.nome }))} />
      <ul aria-label="Sugestões para cobrir" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(d ? d.s : []).filter((s) => ocultos.indexOf(s[0]) < 0).map(([k, g, cob]) => {
          const a = window.MN_ALIMENTOS[k];
          return (
            <li key={k} style={{ border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--forest-900)' }}>{a.d}</p>
                  <p className="mn-num" style={{ font: '400 12px/1.4 var(--font-data)', color: 'var(--text-muted)', marginTop: 2 }}>{window.mnMedida(k, g)} · +{window.mnFmt(a.kcal * g / 100)} kcal</p>
                </div>
                <ABadge variant="accent">cobre {cob}%</ABadge>
              </div>
              <AProgress value={cob} variant="lime" height={6} label={'Cobre ' + cob + '% da falta'} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <AButton size="sm" icon="plus" onClick={() => aoAdicionar(refeicao, k, g)}>Adicionar</AButton>
                <AButton size="sm" variant="ghost" icon="eye-off" onClick={() => setOcultos(ocultos.concat([k]))}>Nunca sugerir</AButton>
              </div>
            </li>
          );
        })}
      </ul>
    </ASheet>
  );
}

function TelaAdequacao({ mobile, plano, aoAdicionar }) {
  const [preset, setPreset] = React.useState('individual');
  const [cobrindo, setCobrindo] = React.useState(null);
  const linhas = window.MN_ADEQUACAO;
  const abaixo = linhas.filter((l) => l.estado === 'abaixo').length;
  const cobrir = (l) => setCobrindo(l);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 16 : 24 }}>
      <ACard title="Referência da adequação" description="Individual usa a RDA; coletivo usa a EAR. Nutrientes sem esses valores usam a AI.">
        <AGrupo rotulo="Tipo de referência" rotuloOculto block={mobile} valor={preset} aoEscolher={setPreset} opcoes={[{ valor: 'individual', rotulo: mobile ? 'Individual' : 'Individual (RDA, 90%)' }, { valor: 'coletivo', rotulo: mobile ? 'Coletivo' : 'Coletivo (EAR, 50%)' }, { valor: 'personalizado', rotulo: 'Personalizado' }]} />
      </ACard>
      <ACard title="Micronutrientes" description="Estágio de vida: mulheres de 19 a 30 anos" action={<ABadge variant="warning">{abaixo} abaixo da meta</ABadge>}>
        {mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {linhas.map((l) => (
              <div key={l.k} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
                <BarraAdequacao nome={l.n} pct={l.pct} marca={l.semDado ? '†' : undefined} temLimite={l.estado === 'acima-limite'} estado={l.estado === 'adequado' ? 'dentro' : l.estado === 'abaixo' ? 'abaixo' : 'acima'} detalhe={l.v + ' de ' + l.ref} fonte={l.tipo} />
                {l.estado === 'abaixo' && window.MN_COBRIR[l.k] ? <AButton size="sm" variant="soft" icon="sparkles" onClick={() => cobrir(l)} style={{ alignSelf: 'flex-start' }}>Cobrir {l.n.toLowerCase()}</AButton> : null}
              </div>
            ))}
            <BarraAdequacao nome="Vitamina D" pct={null} fonte="Não existe na TACO" />
          </div>
        ) : (
          <ATable
            columns={[{ key: 'n', label: 'Nutriente' }, { key: 'v', label: 'No plano', numeric: true, nowrap: true }, { key: 'r', label: 'Referência', numeric: true, nowrap: true }, { key: 'a', label: 'Adequação', width: 180 }, { key: 'e', label: 'Estado' }, { key: 'x', label: '', align: 'right' }]}
            rows={linhas.map((l) => ({
              n: <span style={{ fontWeight: 600, color: 'var(--forest-900)' }}>{l.n}{l.limite ? <abbr className="mn-mark mn-mark--muted" title="O limite superior não vale para a forma do nutriente presente nos alimentos." style={{ textDecoration: 'none' }}>‡</abbr> : null}</span>,
              v: <span>{l.v}<Marcas l={l} /></span>,
              r: <span>{l.ref}<span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{l.tipo}</span></span>,
              a: <div><AProgress value={l.pct} variant={PROG[l.estado]} /><span className="mn-num" style={{ display: 'block', marginTop: 5, fontSize: 12, color: 'var(--text-muted)' }}>{l.pct}% (meta {preset === 'coletivo' ? 50 : 90}%)</span></div>,
              e: <ABadge variant={VAR[l.estado]}>{ROT[l.estado]}</ABadge>,
              x: l.estado === 'abaixo' && window.MN_COBRIR[l.k] ? <AButton size="sm" variant="soft" icon="sparkles" onClick={() => cobrir(l)}>Cobrir</AButton> : null,
            }))}
            footnotes={<React.Fragment>
              <p><span className="mn-mark mn-mark--warn">†</span> Total possivelmente subestimado: algum alimento do plano não tem esse nutriente na tabela de composição. Falta de dado nunca entra como zero.</p>
              <p><span className="mn-mark mn-mark--muted">‡</span> O limite superior da tabela não vale para a forma do nutriente presente nos alimentos.</p>
              <p>Composição: NEPA/UNICAMP. TACO, 4ª edição, 2011 · Referências de ingestão: NASEM. DRI, 2019</p>
            </React.Fragment>} />
        )}
      </ACard>
      <GavetaCobrir chave={cobrindo ? cobrindo.k : null} rotulo={cobrindo ? cobrindo.n.toLowerCase() : ''} mobile={mobile} plano={plano} aoFechar={() => setCobrindo(null)} aoAdicionar={(rid, k, g) => { aoAdicionar(rid, k, g); setCobrindo(null); }} />
    </div>
  );
}

window.TelaAdequacao = TelaAdequacao;
