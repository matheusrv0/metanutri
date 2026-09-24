const { Sheet: RSheet, EtapasDoCaso, Alert: RAlert, Button: RButton } = window.MetaNutriDesignSystem_38356f;

function useLargura(ref) {
  const [w, setW] = React.useState(1440);
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return w;
}

const TITULOS = { painel: ['Painel', 'O que precisa de atenção, onde você parou e o que fazer agora.'], pacientes: ['Pacientes'], casos: ['Planos'], alimentos: ['Tabela de alimentos'], produtos: ['Meus produtos'], conta: ['Conta e plano'], config: ['Configurações'], ajuda: ['Ajuda'] };

function App({ inicial }) {
  const ref = React.useRef(null);
  const largura = useLargura(ref);
  const mobile = largura < 1024;
  const salvo = inicial ? null : (() => { try { return JSON.parse(localStorage.getItem('mn-kit-rota') || 'null'); } catch (e) { return null; } })();
  const [rota, setRota] = React.useState((salvo && salvo.rota) || inicial || 'painel');
  const [aba, setAba] = React.useState((salvo && salvo.aba) || 'plano');
  const [menu, setMenu] = React.useState(false);
  const [plano, setPlano] = React.useState(window.MN_PLANO_INICIAL);
  const [aviso, setAviso] = React.useState(null);
  React.useEffect(() => { if (!inicial) localStorage.setItem('mn-kit-rota', JSON.stringify({ rota, aba })); }, [rota, aba]);

  const ir = (r) => { setRota(r); setMenu(false); if (ref.current) ref.current.scrollTop = 0; };
  const abrirPlano = () => { setAba('plano'); ir('planejador'); };
  const adicionar = (rid, k, g) => {
    setPlano(plano.map((r) => (r.id === rid ? Object.assign({}, r, { principal: r.principal.concat([[k, g]]) }) : r)));
    setAviso(window.MN_ALIMENTOS[k].d + ' entrou em ' + plano.find((r) => r.id === rid).nome + '.');
  };

  let titulo, subtitulo, trilha, acoes, corpo;
  if (rota === 'planejador') {
    titulo = 'Ana Souza — retorno'; subtitulo = 'Atendimento completo · salvo agora';
    trilha = [{ rotulo: 'Planos', aoClicar: () => ir('casos') }];
    acoes = <MenuExportar mobile={mobile} />;
    corpo = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 16 : 24 }}>
        <EtapasDoCaso abaAtual={aba} aoEscolher={setAba} compact={largura < 640} />
        {aviso ? <RAlert variant="success" title="Adicionado">{aviso} <button type="button" onClick={() => { setAba('plano'); setAviso(null); }} style={{ border: 0, background: 'none', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Ver no plano</button></RAlert> : null}
        {aba === 'caso' ? <TelaCaso mobile={mobile} /> : aba === 'plano' ? <TelaPlano mobile={mobile} plano={plano} setPlano={setPlano} /> : <TelaAdequacao mobile={mobile} plano={plano} aoAdicionar={adicionar} />}
      </div>
    );
  } else {
    const t = TITULOS[rota] || ['MetaNutri'];
    titulo = t[0]; subtitulo = t[1];
    corpo = rota === 'painel' ? <TelaPainel mobile={mobile} abrirPlano={abrirPlano} aoNovo={abrirPlano} ir={ir} /> : <TelaVazia titulo={titulo} />;
  }

  const menuEl = <MenuLateral rota={rota} ir={ir} casoAtual="Ana Souza — retorno" aoNovo={abrirPlano} />;
  return (
    <div ref={ref} data-screen-label={rota === 'planejador' ? 'Plano · ' + aba : rota} style={{ position: 'relative', height: '100%', overflowY: 'auto', background: 'var(--bg-page)', display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : '264px minmax(0,1fr)' }}>
      {!mobile ? <aside style={{ position: 'sticky', top: 0, height: '100vh', maxHeight: '100%' }}>{menuEl}</aside> : null}
      <div style={{ minWidth: 0 }}>
        <Cabecalho titulo={titulo} subtitulo={subtitulo} trilha={trilha} acoes={acoes} mobile={mobile} aoAbrirMenu={() => setMenu(true)} />
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: mobile ? '16px 16px 32px' : '24px 24px 48px' }}>{corpo}</main>
      </div>
      {mobile ? <RSheet open={menu} side="left" onClose={() => setMenu(false)}>{menuEl}</RSheet> : null}
    </div>
  );
}

window.App = App;
