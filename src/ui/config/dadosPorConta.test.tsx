import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import type { Backup } from '@/domain/perfil.ts'
import { AvisoPrimeiroAcesso } from '../casos/AvisoPrimeiroAcesso.tsx'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { TelaConfiguracoes } from './TelaConfiguracoes.tsx'

const nuvem = vi.hoisted(() => ({
  enviada: null as unknown,
  guardada: null as unknown,
  baixado: null as Blob | null,
  /** De quem é a sessão. */
  usuario: 'conta-a',
  /** Quantos pedidos de apagar chegaram à nuvem. */
  apagados: 0,
}))

vi.mock('../exportar/baixar.ts', () => ({
  baixarBlob: (blob: Blob) => {
    nuvem.baixado = blob
  },
}))

vi.mock('../estado/supabase.ts', () => ({
  obterSupabase: () => ({
    from: () => ({
      upsert: (linha: { readonly dados: unknown }) => {
        nuvem.enviada = linha.dados
        return Promise.resolve({ data: null, error: null })
      },
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: { dados: nuvem.guardada, aparelho: 'Windows', atualizado_em: '2026-10-07' }, error: null }) }),
      }),
      delete: () => ({
        eq: () => {
          nuvem.apagados += 1
          return Promise.resolve({ data: null, error: null })
        },
      }),
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: nuvem.usuario } } }, error: null }) },
  }),
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

describe('backup e cópia na nuvem só da conta que está dentro (spec dados-por-conta, D-125)', () => {
  beforeEach(() => {
    localStorage.clear()
    nuvem.enviada = null
    nuvem.guardada = null
    nuvem.baixado = null
    nuvem.usuario = 'conta-a'
    nuvem.apagados = 0
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

  it('CA-470: enviar para a nuvem leva só a conta; trazer da nuvem escreve só nela', async () => {
    render(naConta('conta-a', <TelaConfiguracoes />))
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Enviar deste aparelho' }))
    await screen.findByText(/Cópia enviada/)
    expect(Object.keys((nuvem.enviada as Backup).dados).sort()).toEqual(['metanutri:caso:x', 'metanutri:casos', 'metanutri:pacientes'])

    nuvem.guardada = backup({ 'metanutri:produtos': '[]', 'metanutri:pacientes': '[{"id":"ana"},{"id":"caio"}]' })
    await usuario.click(screen.getByRole('button', { name: 'Trazer para este aparelho' }))
    await screen.findByText(/vieram da nuvem/)
    expect(localStorage.getItem('metanutri:conta:conta-a:pacientes')).toBe('[{"id":"ana"},{"id":"caio"}]')
    expect(localStorage.getItem('metanutri:conta:conta-b:pacientes')).toBe('[{"id":"bia"}]')
    expect(localStorage.getItem('metanutri:pacientes')).toBeNull()
  })

  it('DP-14: "Apagar tudo" leva o espaço inteiro da conta que está dentro, e só ele', async () => {
    // Plano fora do índice, aviso de primeiro acesso e a chave antiga dos frequentes também são da conta.
    localStorage.setItem('metanutri:conta:conta-a:caso:solto', '{"nome":"Plano fora do índice"}')
    localStorage.setItem('metanutri:conta:conta-a:aviso-inicial-visto', '1')
    localStorage.setItem('metanutri:conta:conta-a:frequentes', '{}')
    render(naConta('conta-a', <TelaConfiguracoes />))
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Apagar todos os seus dados deste aparelho' }))
    await usuario.click(screen.getByRole('button', { name: 'Apagar tudo mesmo' }))
    await waitFor(() => expect(localStorage.getItem('metanutri:conta:conta-a:pacientes')).toBeNull())
    expect(Object.keys(localStorage).filter((c) => c.startsWith('metanutri:conta:conta-a:'))).toEqual([])
    expect(localStorage.getItem('metanutri:conta:conta-b:pacientes')).toBe('[{"id":"bia"}]')
    expect(localStorage.getItem('metanutri:tema')).toBe('escuro')
  })

  it('DP-19 e CA-474: com a sessão já de outra conta, Configurações não envia, não traz e não apaga nada na nuvem', async () => {
    nuvem.usuario = 'conta-b'
    nuvem.guardada = backup({ 'metanutri:pacientes': '[{"id":"de-b"}]' })
    render(naConta('conta-a', <TelaConfiguracoes />))
    const usuario = userEvent.setup()
    const falha = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'

    await usuario.click(screen.getByRole('button', { name: 'Enviar deste aparelho' }))
    expect(await screen.findByText(falha)).toBeInTheDocument()
    expect(nuvem.enviada).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Trazer para este aparelho' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trazer para este aparelho' })).toBeEnabled())
    expect(localStorage.getItem('metanutri:conta:conta-a:pacientes')).toBe('[{"id":"ana"}]')

    await usuario.click(screen.getByRole('button', { name: 'Apagar todos os seus dados deste aparelho' }))
    await usuario.click(screen.getByRole('button', { name: 'Apagar tudo mesmo' }))
    expect(await screen.findByText(/Apagado só deste aparelho/)).toBeInTheDocument()
    expect(nuvem.apagados).toBe(0)
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
