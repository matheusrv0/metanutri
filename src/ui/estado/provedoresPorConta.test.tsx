import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { useAcompanhamentos } from './contextoAcompanhamentos.ts'
import { ContextoArmazenamento } from './contextoArmazenamento.ts'
import { useCasos } from './contextoCasos.ts'
import { usePacientes } from './contextoPacientes.ts'
import { ProvedorAcompanhamentos } from './ProvedorAcompanhamentos.tsx'
import { ProvedorCasos } from './ProvedorCasos.tsx'
import { ProvedorPacientes } from './ProvedorPacientes.tsx'

const plano = (id: string, nome: string) =>
  JSON.stringify({
    formato: 1,
    versao: 1,
    atualizadoEm: '2026-10-07T00:00:00.000Z',
    caso: { id, nome },
    plano: { refeicoes: [] },
  })

function Resumo() {
  const { casos, mudouEmOutraAba } = useCasos()
  const { pacientes } = usePacientes()
  const { acompanhamentos } = useAcompanhamentos()
  return (
    <ul>
      <li>planos: {casos.map((c) => c.nome).join(', ') || 'nenhum'}</li>
      <li>pacientes: {pacientes.length}</li>
      <li>acompanhamentos: {acompanhamentos.length}</li>
      <li>{mudouEmOutraAba ? 'mudou em outra aba' : 'sem aviso'}</li>
    </ul>
  )
}

const naConta = (usuarioId: string, filho: ReactNode) => (
  <ContextoArmazenamento.Provider value={armazenamentoDaConta(localStorage, usuarioId)}>
    <ProvedorCasos>
      <ProvedorPacientes>
        <ProvedorAcompanhamentos>{filho}</ProvedorAcompanhamentos>
      </ProvedorPacientes>
    </ProvedorCasos>
  </ContextoArmazenamento.Provider>
)

const outraAbaGravou = (chave: string) => act(() => void window.dispatchEvent(new StorageEvent('storage', { key: chave })))

describe('provedores leem os dados da conta (spec dados-por-conta, D-120)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('metanutri:conta:conta-a:casos', '["x"]')
    localStorage.setItem('metanutri:conta:conta-a:caso:x', plano('x', 'Plano da Ana'))
    localStorage.setItem('metanutri:conta:conta-a:pacientes', JSON.stringify([{ id: 'ana', nome: 'Ana' }]))
    localStorage.setItem('metanutri:conta:conta-b:casos', '["y"]')
    localStorage.setItem('metanutri:conta:conta-b:caso:y', plano('y', 'Plano da Bia'))
    localStorage.setItem('metanutri:casos', '["z"]')
    localStorage.setItem('metanutri:caso:z', plano('z', 'Plano sem conta'))
  })

  it('cada conta vê só os próprios planos e pacientes', () => {
    const { unmount } = render(naConta('conta-a', <Resumo />))
    expect(screen.getByText('planos: Plano da Ana')).toBeInTheDocument()
    unmount()
    render(naConta('conta-b', <Resumo />))
    expect(screen.getByText('planos: Plano da Bia')).toBeInTheDocument()
    expect(screen.getByText('pacientes: 0')).toBeInTheDocument()
  })

  it('o aviso de outra aba entende a chave da conta e ignora a das outras', () => {
    render(naConta('conta-a', <Resumo />))
    outraAbaGravou('metanutri:conta:conta-b:casos')
    outraAbaGravou('metanutri:casos')
    expect(screen.getByText('sem aviso')).toBeInTheDocument()

    localStorage.setItem('metanutri:conta:conta-a:casos', '["x","w"]')
    localStorage.setItem('metanutri:conta:conta-a:caso:w', plano('w', 'Plano novo'))
    outraAbaGravou('metanutri:conta:conta-a:caso:w')
    expect(screen.getByText('mudou em outra aba')).toBeInTheDocument()
    expect(screen.getByText(/Plano novo/)).toBeInTheDocument()
  })

  it('os acompanhamentos são da conta, e a outra aba que grava neles atualiza a lista', () => {
    const arquivo = (id: string) =>
      JSON.stringify({ formato: 1, itens: [{ id, token: `t-${id}`, casoId: 'x', pacienteId: null, nome: 'Ana', criadoEm: '2026-10-07', missoes: [], marcacoes: [], usoNaoComercial: false }] })
    localStorage.setItem('metanutri:acompanhamentos', arquivo('sem-conta'))
    render(naConta('conta-a', <Resumo />))
    expect(screen.getByText('acompanhamentos: 0')).toBeInTheDocument()

    localStorage.setItem('metanutri:conta:conta-a:acompanhamentos', arquivo('da-ana'))
    outraAbaGravou('metanutri:conta:conta-a:acompanhamentos')
    expect(screen.getByText('acompanhamentos: 1')).toBeInTheDocument()
  })
})
