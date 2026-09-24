const { Card: QCard, Button: QButton, Input: QInput, CampoNumero: QNum, Tabs: QTabs, Icon: QIcon, Badge: QBadge, Progress: QProgress, MedidorMacro, Alert: QAlert, GrupoOpcoes: QGrupo, Select: QSelect, Separator: QSep } = window.MetaNutriDesignSystem_38356f;
const A = window.MN_ALIMENTOS;

function EntradaRapida({ aoAdicionar }) {
  const [t, setT] = React.useState('');
  const [erro, setErro] = React.useState('');
  const enviar = () => {
    const m = t.trim().toLowerCase().match(/^(\d+[.,]?\d*)\s*g?\s+(.+)$/);
    const key = m ? window.MN_BUSCA[m[2].trim()] : null;
    if (!m || !key) { setErro(m ? 'Nenhum alimento da tabela com esse nome.' : 'Digite gramas e alimento, ex.: 150 arroz integral'); return; }
    aoAdicionar(key, Number(m[1].replace(',', '.'))); setT(''); setErro('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <QInput variant="sunken" icon="search" placeholder="150 arroz integral" aria-label="Adicionar alimento" value={t} error={erro || undefined}
            onChange={(e) => { setT(e.target.value); setErro(''); }} onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} />
        </div>
        <QButton variant="accent" icon="corner-down-left" onClick={enviar} aria-label="Adicionar">{null}</QButton>
      </div>
      {t === '' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {window.MN_FREQUENTES.map(([k, g]) => (
            <button key={k} type="button" onClick={() => aoAdicionar(k, g)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', font: '500 12px/1 var(--font-sans)', color: 'var(--forest-900)' }}>
              <QIcon name="plus" size={12} />{A[k].d.split(',')[0]}<span className="mn-num" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{g} g</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LinhaItem({ it, mobile, aoMudar, aoRemover, principal }) {
  const a = A[it[0]];
  const kcal = a.kcal * it[1] / 100;
  return (
    <li style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ font: '500 14px/1.3 var(--font-sans)', color: 'var(--forest-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.d}</p>
        <p style={{ font: '400 12px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>{window.mnMedida(it[0], it[1])}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 96 }}><QNum rotulo={'Gramas de ' + a.d} rotuloOculto size="sm" valor={it[1]} sufixo="g" aoMudar={(v) => v != null && v >= 0 && aoMudar(v)} /></div>
        <span className="mn-num" style={{ flex: mobile ? 1 : 'none', width: mobile ? 'auto' : 76, textAlign: mobile ? 'left' : 'right', font: '600 13px/1 var(--font-data)', color: 'var(--forest-900)' }}>{window.mnFmt(kcal)} kcal</span>
        {principal ? <QButton variant="ghost" size="sm" icon="arrow-left-right" aria-label={'Substituir ' + a.d} /> : null}
        <QButton variant="ghost" size="sm" icon="x" aria-label={'Remover ' + a.d} onClick={aoRemover} />
      </div>
    </li>
  );
}

function CartaoRefeicao({ r, mobile, mudar }) {
  const [op, setOp] = React.useState('principal');
  const itens = r[op];
  const set = (novo) => mudar(Object.assign({}, r, { [op]: novo }));
  return (
    <QCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 112, flexShrink: 0 }}><QInput icon="clock" defaultValue={r.horario} aria-label={'Horário de ' + r.nome} numeric /></div>
        <div style={{ flex: 1, minWidth: 0 }}><QInput defaultValue={r.nome} aria-label="Nome da refeição" style={{ fontWeight: 600 }} /></div>
        <QButton variant="ghost" icon="trash-2" aria-label={'Remover refeição ' + r.nome} />
      </div>
      <QTabs fill value={op} onChange={setOp} items={[{ value: 'principal', label: 'Principal', count: r.principal.length || null }, { value: 'substituto1', label: mobile ? 'Subst. 1' : 'Substituto 1', count: r.substituto1.length || null }, { value: 'substituto2', label: mobile ? 'Subst. 2' : 'Substituto 2', count: r.substituto2.length || null }]} />
      <EntradaRapida aoAdicionar={(k, g) => set(itens.concat([[k, g]]))} />
      {itens.length === 0 ? <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>Nenhum alimento nesta opção.</p> : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {itens.map((it, i) => <LinhaItem key={i + it[0]} it={it} mobile={mobile} principal={op === 'principal'} aoMudar={(g) => set(itens.map((x, j) => (j === i ? [x[0], g] : x)))} aoRemover={() => set(itens.filter((_, j) => j !== i))} />)}
        </ul>
      )}
      {op !== 'principal' ? <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Os substitutos não entram na soma do dia nem na adequação.</p> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>Total desta opção</span>
        <span className="mn-num" style={{ font: '700 15px/1 var(--font-data)', color: 'var(--forest-900)' }}>{window.mnFmt(window.mnKcal(itens))} kcal</span>
      </div>
    </QCard>
  );
}

function ResumoDoDia({ plano }) {
  const kcal = plano.reduce((s, r) => s + window.mnKcal(r.principal), 0);
  const get = 1850; const pct = Math.round(kcal / get * 100);
  const est = pct < 90 ? ['warning', 'Abaixo de 90%'] : pct > 110 ? ['error', 'Acima de 110%'] : ['success', 'Entre 90% e 110%'];
  return (
    <section aria-label="Resumo do dia" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="mn-stat mn-stat--lime" style={{ gap: 12 }}>
        <div className="mn-stat__top"><span className="mn-stat__label">Energia do plano</span><QButton size="sm" variant="outline" icon="settings-2">Ajustar</QButton></div>
        <div><span className="mn-stat__value">{window.mnFmt(kcal)}</span><span className="mn-stat__unit">kcal</span></div>
        <QProgress value={pct} variant="forest" style={{ background: 'rgba(255,255,255,.6)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '500 13px/1 var(--font-sans)' }}>{pct}% do GET · {window.mnFmt(get)} kcal</span>
          <QBadge variant={est[0]} style={{ background: '#fff' }}>{est[1]}</QBadge>
        </div>
      </div>
      <QCard title="Gasto energético" tight>
        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8, font: 'var(--type-body)' }}>
          {[['TMB', '1.194 kcal'], ['Fator de atividade', '1,55 · moderado'], ['GET calculado', '1.850 kcal']].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-muted)' }}>{k}</dt><dd className="mn-num" style={{ margin: 0, fontWeight: 600, color: 'var(--forest-900)' }}>{v}</dd></div>)}
        </dl>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-subtle)' }}>Fonte: Mifflin-St Jeor, 1990</p>
      </QCard>
      <QCard title="Macronutrientes" tight action={<QButton variant="ghost" size="sm" icon="sliders-horizontal">Metas</QButton>}>
        <MedidorMacro nome="Proteína" valores="84,2 g · 19,3%" faixaInicio={20} faixaFim={70} posicao={38} estado="dentro" frase="Dentro da faixa" meta="Meta: 10 a 35%" />
        <QSep />
        <MedidorMacro nome="Carboidrato" valores="206 g · 47,2%" faixaInicio={45} faixaFim={65} posicao={50} estado="dentro" frase="Quase no meio da faixa" meta="Meta: 45 a 65%" />
        <QSep />
        <MedidorMacro nome="Gordura" valores="64,1 g · 33,1%" faixaInicio={20} faixaFim={35} posicao={31} estado="dentro" frase="Quase lá do limite" meta="Meta: 20 a 35%" />
      </QCard>
    </section>
  );
}

function TelaPlano({ mobile, plano, setPlano }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px', gap: mobile ? 16 : 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, order: mobile ? 2 : 1 }}>
        {plano.map((r) => <CartaoRefeicao key={r.id} r={r} mobile={mobile} mudar={(nr) => setPlano(plano.map((x) => (x.id === r.id ? nr : x)))} />)}
        <QButton variant="outline" icon="plus" block>Adicionar refeição</QButton>
      </div>
      <div style={{ order: mobile ? 1 : 2, position: mobile ? 'static' : 'sticky', top: 96 }}><ResumoDoDia plano={plano} /></div>
    </div>
  );
}

function TelaCaso({ mobile }) {
  const [sexo, setSexo] = React.useState('F');
  const [form, setForm] = React.useState('mifflin');
  const g2 = { display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 14 };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px', gap: mobile ? 16 : 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <QCard title="Identificação" description="O plano nasce já sabendo o que a ficha do paciente sabe.">
          <div style={g2}>
            <QInput label="Nome" defaultValue="Ana Souza" />
            <QNum rotulo="Idade" valor={24} sufixo="anos" />
            <QGrupo rotulo="Sexo" valor={sexo} aoEscolher={setSexo} opcoes={[{ valor: 'F', rotulo: 'Feminino' }, { valor: 'M', rotulo: 'Masculino' }]} />
            <QSelect label="Condição" options={['Nenhuma', 'Gestante', 'Lactante']} />
          </div>
        </QCard>
        <QCard title="Antropometria">
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: 14 }}>
            <QNum rotulo="Peso" valor={62.5} sufixo="kg" /><QNum rotulo="Altura" valor={165} sufixo="cm" /><QNum rotulo="Cintura" valor={72} sufixo="cm" /><QNum rotulo="Panturrilha" valor={null} sufixo="cm" dica="Opcional" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: 'var(--surface-sunken)', borderRadius: 12 }}>
            <span style={{ font: 'var(--type-body)' }}>IMC <b className="mn-num" style={{ color: 'var(--forest-900)' }}>22,96 kg/m²</b></span>
            <QBadge variant="success">Eutrofia</QBadge>
          </div>
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-subtle)' }}>Classificação: Ministério da Saúde. SISVAN, 2011</p>
        </QCard>
      </div>
      <QCard title="Gasto energético" description="A fórmula fica à mostra para conferir.">
        <QGrupo rotulo="Fórmula" block valor={form} aoEscolher={setForm} opcoes={[{ valor: 'mifflin', rotulo: 'Mifflin-St Jeor' }, { valor: 'harris', rotulo: 'Harris-Benedict' }]} />
        <QSelect label="Fator de atividade" options={['1,2 · sedentário', '1,375 · leve', '1,55 · moderado', '1,725 · intenso']} defaultValue="1,55 · moderado" />
        <div style={{ background: 'var(--forest-900)', color: '#fff', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ font: '500 13px/1 var(--font-sans)', opacity: .75 }}>GET calculado</span>
          <span style={{ font: '600 32px/1 var(--font-display)', letterSpacing: '-.02em' }}>{form === 'mifflin' ? '1.850' : '2.117'}<span style={{ font: '500 13px var(--font-sans)', verticalAlign: 'super', marginLeft: 6, color: 'var(--lime-400)' }}>kcal</span></span>
          <span className="mn-num" style={{ font: '400 12px/1.4 var(--font-data)', opacity: .75 }}>TMB {form === 'mifflin' ? '1.194' : '1.366'} × 1,55</span>
        </div>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-subtle)' }}>Fonte: {form === 'mifflin' ? 'Mifflin-St Jeor, 1990' : 'Harris-Benedict, 1918'}</p>
      </QCard>
    </div>
  );
}

Object.assign(window, { TelaPlano, TelaCaso });
