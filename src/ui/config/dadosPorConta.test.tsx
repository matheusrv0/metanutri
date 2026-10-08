import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import type { Backup } from '@/domain/perfil.ts'
import { AvisoPrimeiroAcesso } from '../casos/AvisoPrimeiroAcesso.tsx'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import { TelaConfiguracoes } from './TelaConfiguracoes.tsx'

const nuvem = vi.hoisted(() => ({ baixado: null as Blob | null }))

vi.mock('../exportar/baixar.ts', () => ({
  baixarBlob: (blob: Blob) => {
    nuvem.baixado = blob
  },
}))

const naConta = (usuarioId: string, filho: ReactNode) => (
  <ContextoArmazenamento.Provider value={armazenamentoDaConta(localStorage, usuarioId)}>{filho}</ContextoArmazenamento.Provider>
)

/** A no aparelho com um paciente e um plano; B com outro paciente. */
function doisNoAparelho() {
  localStorage.setItem('metanutri:conta:conta-a:pacientes', '[{"id":"ana"}]')
  localStorage.setItem('metanutri:conta:conta-a:casos', '["x"]')
  localStorage.setItem('metanutri:conta:conta-a:caso:x', '{"nome":"Plano da Ana"}')
  localStorage.setItem('metanutri:conta:conta-b:pacientes', '[{"id":"bia"}]')
  localStorage.setItem('metanutri:tema', 'escuro')
}

const backup = (dados: Record<string, string>): Backup => ({ formato: 1, geradoEm: '2026-10-07T00:00:00.000Z', dados })

describe('backup só da conta que está dentro (spec dados-por-conta, D-125)', () => {
  beforeEach(() => {
    localStorage.clear()
    nuvem.baixado = null
    doisNoAparelho()
  })

  it('CA-470: baixar o backup leva só os dados da conta, com os nomes originais', async () => {
    render(naConta('conta-a', <TelaConfiguracoes />))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Baixar backup' }))
    const lido = JSON.parse((await nuvem.baixado?.text()) ?? '{}') as Backup
    expect(lido.dados).toEqual({
      'metanutri:pacientes': '[{"id":"ana"}]',
      'metanutri:casos': '["x"]',
      'metanutri:caso:x': '{"nome":"Plano da Ana"}',
    })
  })

  it('CA-470: restaurar o backup grava só na conta que está dentro', async () => {
    const { container } = render(naConta('conta-b', <TelaConfiguracoes />))
    const arquivo = new File([JSON.stringify(backup({ 'metanutri:modelos': '[{"id":"m1"}]' }))], 'backup.json', { type: 'application/json' })
    const entrada = container.querySelector<HTMLInputElement>('input[accept="application/json"]')
    if (!entrada) throw new Error('campo do arquivo ausente')
    await userEvent.setup().upload(entrada, arquivo)
    await screen.findByText(/1 conjunto restaurado/)
    expect(localStorage.getItem('metanutri:conta:conta-b:modelos')).toBe('[{"id":"m1"}]')
    expect(localStorage.getItem('metanutri:conta:conta-a:modelos')).toBeNull()
    expect(localStorage.getItem('metanutri:modelos')).toBeNull()
  })

  it('DP-27 (spec dados-na-nuvem): com a nuvem, restaurar diz que vale para todos os aparelhos da conta', async () => {
    const nuvem: ValorNuvem = {
      estado: { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false },
      salvarAgora: async () => true,
      reduzir: () => undefined,
      parar: () => undefined,
    }
    const { container } = render(<ContextoNuvem.Provider value={nuvem}>{naConta('conta-b', <TelaConfiguracoes />)}</ContextoNuvem.Provider>)
    const arquivo = new File([JSON.stringify(backup({ 'metanutri:modelos': '[{"id":"m1"}]' }))], 'backup.json', { type: 'application/json' })
    const entrada = container.querySelector<HTMLInputElement>('input[accept="application/json"]')
    if (!entrada) throw new Error('campo do arquivo ausente')
    await userEvent.setup().upload(entrada, arquivo)
    expect(await screen.findByText('1 conjunto restaurado. Vale para todos os aparelhos da sua conta. Recarregue a página para ver.')).toBeInTheDocument()
  })

  it('o perfil digitado em Configurações fica na conta', async () => {
    render(naConta('conta-a', <TelaConfiguracoes />))
    await userEvent.setup().type(screen.getByLabelText('Seu nome'), 'Ana')
    expect(JSON.parse(localStorage.getItem('metanutri:conta:conta-a:perfil') ?? '{}').nome).toBe('Ana')
    expect(localStorage.getItem('metanutri:perfil')).toBeNull()
  })
})

describe('aviso de primeiro acesso por conta (spec dados-por-conta)', () => {
  beforeEach(() => localStorage.clear())

  it('CB-122: a conta que nunca usou o aparelho vê o aviso, mesmo que outra já tenha visto', async () => {
    localStorage.setItem('metanutri:conta:conta-a:aviso-inicial-visto', '1')
    const { unmount } = render(naConta('conta-a', <AvisoPrimeiroAcesso />))
    expect(screen.queryByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })).not.toBeInTheDocument()
    unmount()

    render(naConta('conta-b', <AvisoPrimeiroAcesso />))
    expect(screen.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Entendi' }))
    expect(localStorage.getItem('metanutri:conta:conta-b:aviso-inicial-visto')).toBe('1')
    expect(localStorage.getItem('metanutri:aviso-inicial-visto')).toBeNull()
  })
})
