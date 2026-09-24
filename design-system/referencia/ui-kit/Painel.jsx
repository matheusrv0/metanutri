const { Card: PCard, CartaoDestaque, Button: PButton, Icon: PIcon, Tabs: PTabs } = window.MetaNutriDesignSystem_38356f;

function GraficoAtividade({ dias }) {
  const maior = Math.max.apply(null, dias.concat([1]));
  const rot = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', 'Hoje'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, paddingTop: 8 }}>
      {dias.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <span className="mn-num" style={{ fontSize: 11, color: 'var(--text-muted)', opacity: d ? 1 : 0 }}>{d}</span>
          <div title={d + ' planos'} style={{ width: '100%', maxWidth: 22, height: Math.max(6, (d / maior) * 100) + 'px', borderRadius: 7, background: d === 0 ? 'var(--gray-150)' : i === dias.length - 1 ? 'var(--lime-400)' : 'var(--forest-900)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{rot[i]}</span>
        </div>
      ))}
    </div>
  );
}

function TelaPainel({ mobile, abrirPlano, aoNovo, ir }) {
  const casos = window.MN_CASOS;
  const [periodo, setPeriodo] = React.useState('14');
  const pend = [{ t: '1 plano sem nome', a: 'Ver' }, { t: '2 planos sem paciente vinculado', a: 'Ver' }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 16 : 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: mobile ? 12 : 16 }}>
        <CartaoDestaque tom="lime" rotulo="Planos" valor="4" apoio="13 mexidos em 14 dias" icone="folder-open" aoClicar={() => ir('casos')} />
        <CartaoDestaque rotulo="Pacientes" valor="3" apoio="Fichas com restrições e histórico" icone="user-round" aoClicar={() => ir('pacientes')} />
        <CartaoDestaque rotulo="Dias trabalhados" valor="9" apoio="De 14 dias corridos" icone="clipboard-list" />
        <CartaoDestaque tom="ocre" rotulo="Precisa de atenção" valor="2" apoio="Coisas que atrapalham na entrega" icone="triangle-alert" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px', gap: mobile ? 16 : 24 }}>
        <PCard title="Começar agora" description="Escolha o caminho conforme o atendimento. Dá para trocar de rápido para completo depois." action={mobile ? null : <PButton icon="plus" onClick={aoNovo}>Novo plano</PButton>}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {mobile ? <PButton icon="plus" onClick={aoNovo}>Novo plano</PButton> : null}
            <PButton variant="outline" icon="user-round" onClick={() => ir('pacientes')}>Pacientes</PButton>
            <PButton variant="outline" icon="barcode" onClick={() => ir('produtos')}>Cadastrar produto</PButton>
          </div>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--forest-900)' }}>Planos mexidos por dia</p>
              <PTabs variant="pill" value={periodo} onChange={setPeriodo} items={[{ value: '7', label: '7 dias' }, { value: '14', label: '14 dias' }]} />
            </div>
            <GraficoAtividade dias={periodo === '7' ? window.MN_ATIVIDADE.slice(7) : window.MN_ATIVIDADE} />
          </div>
        </PCard>
        <PCard title="Onde você parou" description="Os últimos planos abertos neste aparelho.">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {casos.map((c, i) => (
              <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < casos.length - 1 ? '1px solid var(--border-subtle)' : 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? 'var(--lime-100)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest-900)', flexShrink: 0 }}><PIcon name="clipboard-list" size={16} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ font: '600 14px/1.25 var(--font-sans)', color: c.nome ? 'var(--forest-900)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome || 'Plano sem nome'}</p>
                  <p style={{ font: '400 12px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>{c.modo} · {c.quando}</p>
                </div>
                <PButton size="sm" variant="ghost" onClick={() => abrirPlano(c)}>Abrir</PButton>
              </li>
            ))}
          </ul>
        </PCard>
      </div>
      <PCard title="Precisa de atenção" description="Coisas pequenas que atrapalham depois, na hora de entregar.">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pend.map((p) => (
            <li key={p.t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: 'var(--surface-sunken)', borderRadius: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, font: 'var(--type-body)', color: 'var(--text-body)' }}><PIcon name="triangle-alert" size={16} color="var(--state-low)" />{p.t}</span>
              <PButton size="sm" variant="outline" onClick={() => ir('casos')}>{p.a}</PButton>
            </li>
          ))}
        </ul>
      </PCard>
    </div>
  );
}

window.TelaPainel = TelaPainel;
