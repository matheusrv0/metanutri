import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { useAcompanhamentos } from './contextoAcompanhamentos.ts'
import { ContextoArmazenamento } from './contextoArmazenamento.ts'
import { ProvedorAcompanhamentos } from './ProvedorAcompanhamentos.tsx'

type Resposta = { readonly data: unknown; readonly error: null }

const nuvem = vi.hoisted(() => ({
  /** De quem é a sessão agora. */
  usuario: 'conta-a',
  /** As linhas enviadas à nuvem (upsert), com o dono que foi junto. */
  enviadas: [] as Record<string, unknown>[],
  /** Responde a leitura dos links, que fica esperando. */
  responderLeitura: null as ((resposta: Resposta) => void) | null,
}))

vi.mock('./supabase.ts', () => ({
  supabaseConfigurado: () => true,
  obterSupabase: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: nuvem.usuario } } }, error: null }) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: () => ({
      select: () => ({
        eq: () =>
          new Promise<Resposta>((resolver) => {
            nuvem.responderLeitura = resolver
          }),
      }),
      upsert: (linha: Record<string, unknown>) => {
        nuvem.enviadas.push(linha)
        const resposta = Promise.resolve({ data: [{ id: linha['id'] }], error: null })
        return Object.assign(resposta, { select: () => resposta })
      },
      update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  }),
}))

const link = (id: string) => ({ id, token: `t-${id}`, casoId: 'x', pacienteId: null, nome: 'Ana', criadoEm: '2026-10-07', missoes: [], marcacoes: [], usoNaoComercial: false })
const linha = (id: string) => ({ id, token: `t-${id}`, caso_id: 'x', paciente_id: null, nome: 'Ana', criado_em: '2026-10-07', missoes: [], marcacoes: [] })

function Atualizar() {
  const { lerDaNuvem } = useAcompanhamentos()
  return (
    <button type="button" onClick={() => void lerDaNuvem()}>
      Atualizar
    </button>
  )
}

describe('leitura da nuvem e troca de conta (spec dados-por-conta)', () => {
  beforeEach(() => {
    localStorage.clear()
    nuvem.usuario = 'conta-a'
    nuvem.enviadas = []
    // A conta A tem um link que só existe neste aparelho: a leitura vai querer subi-lo.
    localStorage.setItem('metanutri:conta:conta-a:acompanhamentos', JSON.stringify({ formato: 1, itens: [link('so-aqui')], naNuvem: [], pendentes: [] }))
  })

  it('CA-474: a leitura começa como A, a conta vira B no meio: nada é enviado como B e nada é gravado no espaço de A', async () => {
    const antes = localStorage.getItem('metanutri:conta:conta-a:acompanhamentos')
    const { unmount } = render(
      <ContextoArmazenamento.Provider value={armazenamentoDaConta(localStorage, 'conta-a')}>
        <ProvedorAcompanhamentos usuarioId="conta-a">
          <Atualizar />
        </ProvedorAcompanhamentos>
      </ContextoArmazenamento.Provider>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))

    // A sessão troca para B, e a área de dados de A sai da tela (o App a remonta para B).
    nuvem.usuario = 'conta-b'
    unmount()
    await act(async () => nuvem.responderLeitura?.({ data: [linha('da-nuvem')], error: null }))

    expect(nuvem.enviadas).toEqual([])
    expect(localStorage.getItem('metanutri:conta:conta-a:acompanhamentos')).toBe(antes)
  })

  it('CA-474: ainda montado, com a sessão já de B, o link de A não sobe para a conta B', async () => {
    render(
      <ContextoArmazenamento.Provider value={armazenamentoDaConta(localStorage, 'conta-a')}>
        <ProvedorAcompanhamentos usuarioId="conta-a">
          <Atualizar />
        </ProvedorAcompanhamentos>
      </ContextoArmazenamento.Provider>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))
    nuvem.usuario = 'conta-b'
    await act(async () => nuvem.responderLeitura?.({ data: [], error: null }))
    expect(nuvem.enviadas.filter((l) => l['nutricionista_id'] === 'conta-b')).toEqual([])
  })
})
