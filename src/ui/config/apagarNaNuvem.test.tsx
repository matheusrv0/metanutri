import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FALHA_DE_REDE } from '../estado/mensagemDoBanco.ts'
import { TelaConfiguracoes } from './TelaConfiguracoes.tsx'

type Erro = { readonly message: string; readonly code: string } | null

const nuvem = vi.hoisted(() => ({
  erros: {} as Record<string, { readonly message: string; readonly code: string } | null>,
  apagados: [] as string[],
  semSessao: false,
}))

vi.mock('../estado/supabase.ts', () => ({
  obterSupabase: () => ({
    from: (tabela: string) => ({
      delete: () => ({
        eq: (coluna: string, valor: string) => {
          nuvem.apagados.push(`${tabela}:${coluna}=${valor}`)
          return Promise.resolve({ data: null, error: nuvem.erros[tabela] ?? null })
        },
      }),
      upsert: () => Promise.resolve({ data: null, error: nuvem.erros[tabela] ?? null }),
    }),
    auth: {
      getSession: () =>
        Promise.resolve(
          nuvem.semSessao
            ? { data: { session: null }, error: { message: 'Invalid Refresh Token: Refresh Token Not Found' } }
            : { data: { session: { user: { id: 'u1' } } }, error: null },
        ),
    },
  }),
}))

const RLS: Erro = { code: '42501', message: 'new row violates row-level security policy for table "copias"' }

async function apagarTudo() {
  localStorage.setItem('metanutri:casos', '["a"]')
  render(<TelaConfiguracoes />)
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole('button', { name: 'Apagar todos os dados deste aparelho' }))
  await usuario.click(screen.getByRole('button', { name: 'Apagar tudo mesmo' }))
}

describe('Apagar tudo com a nuvem ligada (D-94)', () => {
  beforeEach(() => {
    localStorage.clear()
    nuvem.erros = {}
    nuvem.apagados = []
    nuvem.semSessao = false
  })

  it('CA-420: sessão vencida sem internet: diz que a nuvem não foi apagada, em vez de "tudo apagado"', async () => {
    nuvem.semSessao = true
    await apagarTudo()
    const aviso = await screen.findByText(/Apagado só deste aparelho/)
    expect(aviso).toHaveTextContent(`Apagado só deste aparelho. Os acompanhamentos e a cópia completa não foram apagados da nuvem. ${FALHA_DE_REDE}`)
    expect(nuvem.apagados).toEqual([])
  })

  it('CA-420: apaga os acompanhamentos e a cópia completa da conta, e só então diz "na nuvem"', async () => {
    await apagarTudo()
    expect(await screen.findByText('Tudo apagado, aqui e na nuvem. Recarregue a página.')).toBeInTheDocument()
    expect(nuvem.apagados.sort()).toEqual(['acompanhamentos:nutricionista_id=u1', 'copias:nutricionista_id=u1'])
    expect(localStorage.getItem('metanutri:casos')).toBeNull()
  })

  it('CA-420: se a cópia não sai, a mensagem diz que ela ficou e não diz "tudo apagado"', async () => {
    nuvem.erros = { copias: RLS }
    await apagarTudo()
    const aviso = await screen.findByText(/A cópia completa não foi apagada/)
    expect(aviso).toHaveTextContent(`Apagado deste aparelho e os acompanhamentos da nuvem. A cópia completa não foi apagada. ${FALHA_DE_REDE}`)
    expect(aviso).not.toHaveTextContent(/tudo apagado|na nuvem/i)
  })

  it('CA-420: se os acompanhamentos não saem, a mensagem diz que eles ficaram', async () => {
    nuvem.erros = { acompanhamentos: RLS }
    await apagarTudo()
    const aviso = await screen.findByText(/Os acompanhamentos não foram apagados/)
    expect(aviso).toHaveTextContent(`Apagado deste aparelho e a cópia completa da nuvem. Os acompanhamentos não foram apagados. ${FALHA_DE_REDE}`)
    expect(aviso).not.toHaveTextContent(/tudo apagado|na nuvem/i)
  })

  it('CA-420: se as duas falham, a mensagem diz que só este aparelho foi apagado', async () => {
    nuvem.erros = { acompanhamentos: RLS, copias: RLS }
    await apagarTudo()
    const aviso = await screen.findByText(/Apagado só deste aparelho/)
    expect(aviso).toHaveTextContent(`Apagado só deste aparelho. Os acompanhamentos e a cópia completa não foram apagados da nuvem. ${FALHA_DE_REDE}`)
    expect(aviso).not.toHaveTextContent(/tudo apagado|na nuvem/i)
  })

  it('CA-430: o texto técnico do banco não aparece na tela', async () => {
    nuvem.erros = { acompanhamentos: RLS, copias: RLS }
    await apagarTudo()
    await screen.findByText(/Apagado só deste aparelho/)
    expect(screen.queryByText(/row-level security/)).not.toBeInTheDocument()
  })

  it('CA-430: falha ao enviar a cópia mostra a mensagem traduzida', async () => {
    nuvem.erros = { copias: RLS }
    render(<TelaConfiguracoes />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar deste aparelho' }))
    expect(await screen.findByText(FALHA_DE_REDE)).toBeInTheDocument()
    expect(screen.queryByText(/row-level security/)).not.toBeInTheDocument()
  })
})
