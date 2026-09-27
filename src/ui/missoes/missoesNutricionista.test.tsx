import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarAcompanhamento, marcarMissao, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { Missao } from '@/domain/missoes.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { CartaoLinkMissoes } from './CartaoLinkMissoes.tsx'
import { TelaAdesao } from './TelaAdesao.tsx'

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 07:00', origem: 'Refeição do plano' },
  { id: 'agua', texto: 'Beber cerca de 2 litros de água', origem: '35 ml por quilo' },
]

const HOJE = '2026-09-26'

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

function Anfitriao({ repositorio, children }: { readonly repositorio: RepositorioAcompanhamentos; readonly children: ReactNode }) {
  return <ProvedorAcompanhamentos repositorio={repositorio}>{children}</ProvedorAcompanhamentos>
}

let n = 0
function acompanhamentoDe(casoId: string, nome: string, marcacoes: readonly { dia: string; feitas: readonly string[] }[] = []): Acompanhamento {
  n += 1
  const base = criarAcompanhamento(
    { casoId, pacienteId: null, nome, missoes: MISSOES },
    { agora: () => '2026-09-01T10:00:00.000Z', gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
  return { ...base, marcacoes }
}

describe('Cartão do link de missões', () => {
  it('sem plano montado, explica que as missões saem do plano', () => {
    render(
      <Anfitriao repositorio={criarRepositorioAcompanhamentos(memoria())}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={[]} hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByText(/Monte o plano primeiro/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gerar link/ })).not.toBeInTheDocument()
  })

  it('com plano montado e sem link, diz quantas missões saem dali', () => {
    render(
      <Anfitriao repositorio={criarRepositorioAcompanhamentos(memoria())}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByText('2 missões saem deste plano.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar link das missões/ })).toBeInTheDocument()
  })

  it('gerar o link mostra o endereço do paciente e o estado inicial', async () => {
    const usuario = userEvent.setup()
    render(
      <Anfitriao repositorio={criarRepositorioAcompanhamentos(memoria())}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    await usuario.click(screen.getByRole('button', { name: /Já tenho a autorização/ }))

    const campo = screen.getByLabelText('Link do paciente') as HTMLInputElement
    expect(campo.value).toContain('#/missoes/')
    expect(screen.getByText('Ainda não começou')).toBeInTheDocument()
  })

  it('pergunta pela autorização do paciente antes de gerar o primeiro link', async () => {
    const usuario = userEvent.setup()
    render(
      <Anfitriao repositorio={criarRepositorioAcompanhamentos(memoria())}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))

    expect(screen.getByText(/o paciente autorizou\?/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Link do paciente')).not.toBeInTheDocument()
  })

  it('desistir da autorização não gera link nenhum', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    await usuario.click(screen.getByRole('button', { name: 'Agora não' }))

    expect(repo.listar()).toEqual([])
    expect(screen.getByRole('button', { name: /Gerar link das missões/ })).toBeInTheDocument()
  })

  it('gerar link novo troca o token: o antigo para de valer', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    await usuario.click(screen.getByRole('button', { name: /Já tenho a autorização/ }))
    const primeiro = (screen.getByLabelText('Link do paciente') as HTMLInputElement).value

    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    const segundo = (screen.getByLabelText('Link do paciente') as HTMLInputElement).value

    expect(segundo).not.toBe(primeiro)
  })

  it('mostra o que o paciente já marcou', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana', [{ dia: HOJE, feitas: ['agua'] }]))
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )

    const hoje = screen.getByText('Hoje').closest('div')
    expect(hoje).not.toBeNull()
    expect(within(hoje as HTMLElement).getByText('1/2')).toBeInTheDocument()
  })

  it('copiar põe o endereço na área de transferência', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined)
    // O userEvent instala a própria área de transferência no setup; a nossa entra depois dele.
    const usuario = userEvent.setup()
    vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: { writeText: escrever } })
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))

    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: 'Copiar' }))

    expect(escrever).toHaveBeenCalledWith(expect.stringContaining('#/missoes/'))
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('Tela de adesão', () => {
  it('sem ninguém acompanhando, ensina o próximo passo', () => {
    render(
      <Anfitriao repositorio={criarRepositorioAcompanhamentos(memoria())}>
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByText('Nenhum paciente acompanhando ainda')).toBeInTheDocument()
  })

  it('põe quem sumiu no topo da lista', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const emDia = ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'].map((dia) => ({ dia, feitas: ['agua'] }))
    repo.salvar(acompanhamentoDe('c1', 'Bia', emDia))
    repo.salvar(acompanhamentoDe('c2', 'Ana', [{ dia: '2026-09-20', feitas: ['agua'] }]))

    render(
      <Anfitriao repositorio={repo}>
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} />
      </Anfitriao>,
    )

    const itens = screen.getAllByRole('listitem')
    expect(itens.map((li) => within(li).getByText(/Ana|Bia/).textContent)).toEqual(['Ana', 'Bia'])
    expect(within(itens[0] as HTMLElement).getByText('Sumindo')).toBeInTheDocument()
    expect(within(itens[1] as HTMLElement).getByText('Em dia')).toBeInTheDocument()
  })

  it('conta quantos estão sumindo', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana', [{ dia: '2026-09-15', feitas: ['agua'] }]))
    repo.salvar(acompanhamentoDe('c2', 'Bia', [{ dia: '2026-09-16', feitas: ['agua'] }]))

    render(
      <Anfitriao repositorio={repo}>
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} />
      </Anfitriao>,
    )

    const cartao = screen.getByText('Sumindo', { selector: 'p' }).closest('div')
    expect(within(cartao as HTMLElement).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Vale uma mensagem hoje.')).toBeInTheDocument()
  })

  it('compara os pacientes ativos com o limite do plano', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(marcarMissao(acompanhamentoDe('c1', 'Ana'), '2026-09-25', 'agua', true))

    render(
      <Anfitriao repositorio={repo}>
        <TelaAdesao aoAbrirPlano={vi.fn()} plano="free" hoje={HOJE} />
      </Anfitriao>,
    )

    expect(screen.getByText('/2')).toBeInTheDocument()
    expect(screen.getByText('Cabem mais 1.')).toBeInTheDocument()
  })

  it('abre o plano do paciente', async () => {
    const abrir = vi.fn()
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('caso-42', 'Ana'))

    render(
      <Anfitriao repositorio={repo}>
        <TelaAdesao aoAbrirPlano={abrir} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: 'Abrir plano' }))
    expect(abrir).toHaveBeenCalledWith('caso-42')
  })
})
