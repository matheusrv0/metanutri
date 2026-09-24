const MN = window.MetaNutriDesignSystem_38356f;
const { Button, Input, Icon, ItemMenu, Sheet, DropdownMenu, Tooltip } = MN;

function Marca({ inverse }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="../../assets/logo/icone.svg" width="30" height="30" alt="" />
      <span style={{ font: '700 20px/1 var(--font-display)', letterSpacing: '-0.02em', color: inverse ? '#fff' : 'var(--forest-900)' }}>MetaNutri</span>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <p style={{ font: '500 11px/1 var(--font-sans)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 12px 8px' }}>{titulo}</p>
      {children}
    </div>
  );
}

function MenuLateral({ rota, ir, casoAtual, aoNovo }) {
  return (
    <nav aria-label="Menu principal" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--gray-100)', borderRight: '1px solid var(--border-subtle)' }}>
      <div style={{ padding: '22px 20px 16px' }}><Marca /></div>
      <div style={{ padding: '0 12px' }}>
        <button type="button" onClick={() => ir('conta')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--lime-400)', color: 'var(--forest-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px/1 var(--font-sans)' }}>BL</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', font: '600 14px/1.2 var(--font-sans)', color: 'var(--forest-900)' }}>Beatriz Lima</span>
            <span style={{ display: 'block', font: '400 12px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>Estudante · grátis</span>
          </span>
          <Icon name="chevrons-up-down" size={14} color="var(--text-subtle)" />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Button icon="plus" block onClick={aoNovo}>Novo plano</Button>
        <Secao titulo="Trabalho">
          <ItemMenu icone="layout-dashboard" rotulo="Painel" ativo={rota === 'painel'} aoClicar={() => ir('painel')} />
          <ItemMenu icone="user-round" rotulo="Pacientes" ativo={rota === 'pacientes'} aoClicar={() => ir('pacientes')} />
          <ItemMenu icone="folder-open" rotulo="Planos" extra={4} ativo={rota === 'casos'} aoClicar={() => ir('casos')} />
          {casoAtual ? <ItemMenu icone="clipboard-list" rotulo={rota === 'planejador' ? 'Plano aberto' : 'Continuar plano'} detalhe={casoAtual} ativo={rota === 'planejador'} aoClicar={() => ir('planejador')} /> : null}
        </Secao>
        <Secao titulo="Alimentos">
          <ItemMenu icone="book-open" rotulo="Tabela de alimentos" ativo={rota === 'alimentos'} aoClicar={() => ir('alimentos')} />
          <ItemMenu icone="barcode" rotulo="Meus produtos" ativo={rota === 'produtos'} aoClicar={() => ir('produtos')} />
        </Secao>
        <Secao titulo="Sistema">
          <ItemMenu icone="user-circle" rotulo="Conta e plano" ativo={rota === 'conta'} aoClicar={() => ir('conta')} />
          <ItemMenu icone="settings" rotulo="Configurações" ativo={rota === 'config'} aoClicar={() => ir('config')} />
          <ItemMenu icone="circle-help" rotulo="Ajuda" ativo={rota === 'ajuda'} aoClicar={() => ir('ajuda')} />
        </Secao>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest-900)' }}><Icon name="hard-drive" size={18} /></span>
          <p style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--forest-900)' }}>Planos salvos só neste aparelho</p>
          <p style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>Faça backup antes de trocar de aparelho.</p>
          <Button size="sm" block icon="download" onClick={() => ir('config')}>Fazer backup</Button>
        </div>
      </div>
    </nav>
  );
}

function Cabecalho({ titulo, subtitulo, trilha, acoes, mobile, aoAbrirMenu }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(241,241,241,.86)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', minHeight: mobile ? 60 : 72, display: 'flex', alignItems: 'center', gap: 12, padding: mobile ? '8px 12px' : '10px 24px' }}>
        {mobile ? <Button variant="ghost" icon="menu" aria-label="Abrir menu" onClick={aoAbrirMenu} /> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          {trilha ? (
            <nav aria-label="Você está em" style={{ display: 'flex', alignItems: 'center', gap: 4, font: '500 12px/1.2 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 2 }}>
              {trilha.map((p) => <span key={p.rotulo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><button type="button" onClick={p.aoClicar} style={{ border: 0, background: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>{p.rotulo}</button><Icon name="chevron-right" size={12} /></span>)}
            </nav>
          ) : null}
          <h1 style={{ font: (mobile ? '600 18px' : '600 20px') + '/1.2 var(--font-display)', color: 'var(--forest-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</h1>
          {subtitulo && !mobile ? <p style={{ font: '400 13px/1.3 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{subtitulo}</p> : null}
        </div>
        {!mobile ? (
          <div style={{ width: 260 }}>
            <div style={{ position: 'relative' }}>
              <Input variant="sunken" icon="search" placeholder="Buscar paciente ou alimento" aria-label="Buscar" style={{ gap: 0 }} />
              <span style={{ position: 'absolute', right: 10, top: 10, display: 'flex', gap: 3 }}>{['⌘', 'K'].map((k) => <kbd key={k} style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--text-muted)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 5, padding: '3px 5px' }}>{k}</kbd>)}</span>
            </div>
          </div>
        ) : null}
        {acoes ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{acoes}</div> : null}
        {!mobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip content="Ajuda e fontes" side="bottom"><Button variant="ghost" icon="circle-help" aria-label="Ajuda" /></Tooltip>
            <Tooltip content="Configurações" side="bottom"><Button variant="ghost" icon="settings" aria-label="Configurações" /></Tooltip>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--forest-900)', color: 'var(--lime-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px/1 var(--font-sans)', marginLeft: 4 }}>BL</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function MenuExportar({ mobile }) {
  return (
    <DropdownMenu trigger={mobile ? <Button variant="outline" icon="download" aria-label="Exportar" /> : <Button variant="outline" icon="download" iconRight="chevron-down">Exportar</Button>}
      items={[{ heading: 'Para o paciente' }, { icon: 'printer', label: 'Dieta para imprimir', hint: 'PDF' }, { heading: 'Para o estágio' }, { icon: 'file-text', label: 'Aconselhamento', hint: '.docx' }, { icon: 'calculator', label: 'Memorial de cálculo', hint: '.docx' }, { separator: true }, { icon: 'copy', label: 'Copiar tabela de adequação' }]} />
  );
}

function TelaVazia({ titulo }) {
  return (
    <div className="mn-card" style={{ alignItems: 'center', textAlign: 'center', padding: 48 }}>
      <Icon name="layout-template" size={24} color="var(--text-subtle)" />
      <p style={{ font: 'var(--type-card-title)', color: 'var(--forest-900)' }}>{titulo}</p>
      <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', maxWidth: 380 }}>Esta tela existe no produto mas não foi recriada neste kit. Veja o Painel e o Plano aberto.</p>
    </div>
  );
}

Object.assign(window, { MenuLateral, Cabecalho, MenuExportar, TelaVazia, Marca });
