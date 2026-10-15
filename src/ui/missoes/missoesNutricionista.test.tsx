import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarAcompanhamento, marcarMissao, missoesDoDia, progressoDoDia, type Acompanhamento } from '@/domain/acompanhamento.ts'
import { copiarDieta, type DietaDoLink, type DietaDoPlano } from '@/domain/dietaDoLink.ts'
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

describe('Conta de estudante: uso não comercial', () => {
  const gerar = async (usuario: ReturnType<typeof userEvent.setup>) => {
    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    await usuario.click(screen.getByRole('button', { name: /Já tenho a autorização/ }))
  }

  it('avisa que a conta de estágio é de uso não comercial', () => {
    render(
      <Anfitriao repositorio={criarRepositorioAcompanhamentos(memoria())}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="estudante" hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByText(/até 3 links, de uso não comercial/i)).toBeInTheDocument()
  })

  it('o link gerado por estudante fica marcado como não comercial', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="estudante" hoje={HOJE} />
      </Anfitriao>,
    )

    await gerar(usuario)
    expect(repo.porCaso('c1')?.usoNaoComercial).toBe(true)
  })

  it('CA-421: conta de estudante ainda no Free gera o link com o aviso e diz isso antes', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="free" situacao="estudante" hoje={HOJE} />
      </Anfitriao>,
    )

    expect(screen.getByText(/até 2 links, de uso não comercial/i)).toBeInTheDocument()
    await gerar(usuario)
    expect(repo.porCaso('c1')?.usoNaoComercial).toBe(true)
  })

  it('CA-421: gerar de novo o link antigo de uma conta de estudante põe o aviso', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    expect(repo.porCaso('c1')?.usoNaoComercial).toBe(false)
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="free" situacao="estudante" hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    expect(repo.porCaso('c1')?.usoNaoComercial).toBe(true)
  })

  it('CA-421: conta de nutricionista no Free não sai marcada', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="free" situacao="nutricionista" hoje={HOJE} />
      </Anfitriao>,
    )

    expect(screen.queryByText(/uso não comercial/i)).not.toBeInTheDocument()
    await gerar(usuario)
    expect(repo.porCaso('c1')?.usoNaoComercial).toBe(false)
  })

  it('link de conta paga não sai marcado', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="solo" hoje={HOJE} />
      </Anfitriao>,
    )

    await gerar(usuario)
    expect(repo.porCaso('c1')?.usoNaoComercial).toBe(false)
  })

  it('no quarto paciente, o estudante não consegue mais gerar', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    for (const caso of ['a', 'b', 'c']) repo.salvar(acompanhamentoDe(caso, `Paciente ${caso}`))

    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c4" pacienteId={null} nome="Quarto" missoes={MISSOES} plano="estudante" hoje={HOJE} />
      </Anfitriao>,
    )

    expect(screen.queryByRole('button', { name: /Gerar link das missões/ })).not.toBeInTheDocument()
    expect(screen.getByText(/links de missões do seu plano/i)).toBeInTheDocument()
  })

  it('com três links, o plano Pro continua gerando', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    for (const caso of ['a', 'b', 'c']) repo.salvar(acompanhamentoDe(caso, `Paciente ${caso}`))

    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c4" pacienteId={null} nome="Quarto" missoes={MISSOES} plano="pro" hoje={HOJE} />
      </Anfitriao>,
    )

    expect(screen.getByRole('button', { name: /Gerar link das missões/ })).toBeInTheDocument()
  })

  it('regerar o link de um paciente que já tem não esbarra no limite', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    for (const caso of ['a', 'b']) repo.salvar(acompanhamentoDe(caso, `Paciente ${caso}`))
    repo.salvar(acompanhamentoDe('c3', 'Terceiro'))

    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c3" pacienteId={null} nome="Terceiro" missoes={MISSOES} plano="estudante" hoje={HOJE} />
      </Anfitriao>,
    )

    expect(screen.getByRole('button', { name: /Gerar link novo/ })).toBeInTheDocument()
  })
})

describe('A dieta no link, pelo cartão (spec dieta-no-link)', () => {
  const DIETA: DietaDoPlano = {
    refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: '6 colheres de sopa', gramas: 150, alimento: 'Arroz, tipo 1, cozido' }]] }],
    orientacoes: 'Beber água.',
    receitas: '',
  }
  const ANTIGA: DietaDoLink = { ...copiarDieta(DIETA, '2026-09-01'), orientacoes: 'Orientação de antes.' }
  const MUDOU = 'O plano mudou. O paciente ainda vê a dieta anterior.'

  function cartaoComDieta(repo: RepositorioAcompanhamentos) {
    return render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} dieta={DIETA} hoje={HOJE} />
      </Anfitriao>,
    )
  }

  const caixa = () => screen.getByRole('checkbox', { name: 'Mostrar a dieta no link' })

  async function gerar(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    await usuario.click(screen.getByRole('button', { name: /Já tenho a autorização/ }))
  }

  it('CA-539: sem link, a caixa "Mostrar a dieta no link" aparece marcada, acima do botão de gerar', () => {
    cartaoComDieta(criarRepositorioAcompanhamentos(memoria()))
    expect(caixa()).toBeChecked()
    const botao = screen.getByRole('button', { name: /Gerar link das missões/ })
    expect(caixa().compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-553: a caixa diz o mesmo conteúdo que a Política: refeições, substitutos, orientações e receitas, sem kcal', () => {
    cartaoComDieta(criarRepositorioAcompanhamentos(memoria()))
    expect(caixa()).toHaveAccessibleDescription('Refeições em medida caseira, substitutos, orientações e receitas. Sem kcal.')
  })

  it('CA-540: com a caixa marcada, o link nasce com a cópia da dieta de agora', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    cartaoComDieta(repo)
    await gerar(usuario)
    expect(repo.porCaso('c1')?.dieta).toEqual(copiarDieta(DIETA, HOJE))
  })

  it('CA-541: com a caixa desmarcada, o link nasce sem a dieta', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    cartaoComDieta(repo)
    await usuario.click(caixa())
    await gerar(usuario)
    expect(repo.porCaso('c1')?.dieta).toBeNull()
    expect(caixa()).not.toBeChecked()
  })

  it('CA-542: a pergunta de autorização diz que o link mostra o plano alimentar só quando a dieta vai junto', async () => {
    const usuario = userEvent.setup()
    cartaoComDieta(criarRepositorioAcompanhamentos(memoria()))
    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    expect(screen.getByText('Com a dieta, o link também mostra o plano alimentar a quem tiver o endereço.')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Agora não' }))
    await usuario.click(caixa())
    await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
    expect(screen.queryByText(/plano alimentar a quem tiver o endereço/)).not.toBeInTheDocument()
  })

  it('CA-543: desmarcar tira a dieta do link, com o mesmo endereço e as mesmas marcações', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antes = repo.salvar({ ...acompanhamentoDe('c1', 'Ana', [{ dia: HOJE, feitas: ['agua'] }]), dieta: copiarDieta(DIETA, HOJE) })
    cartaoComDieta(repo)

    expect(caixa()).toBeChecked()
    await usuario.click(caixa())

    const depois = repo.porCaso('c1')
    expect(depois?.dieta).toBeNull()
    expect(depois?.token).toBe(antes.token)
    expect(depois?.marcacoes).toEqual(antes.marcacoes)
    expect(caixa()).not.toBeChecked()
  })

  it('CA-544: marcar a caixa num link sem dieta pede a autorização numa linha, e nada é gravado antes de confirmar', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antes = repo.salvar(acompanhamentoDe('c1', 'Ana'))
    cartaoComDieta(repo)

    expect(caixa()).not.toBeChecked()
    await usuario.click(caixa())

    expect(screen.getByText('Com a dieta, o link também mostra o plano alimentar a quem tiver o endereço. O paciente autorizou?')).toBeInTheDocument()
    expect(repo.porCaso('c1')?.dieta).toBeNull()
    expect(caixa()).not.toBeChecked()

    await usuario.click(screen.getByRole('button', { name: 'Já tenho a autorização, mostrar a dieta' }))

    expect(repo.porCaso('c1')?.dieta).toEqual(copiarDieta(DIETA, HOJE))
    expect(repo.porCaso('c1')?.token).toBe(antes.token)
    expect(caixa()).toBeChecked()
    expect(screen.queryByText(/O paciente autorizou\?/)).not.toBeInTheDocument()
  })

  it('CA-544: "Agora não" deixa o link sem dieta', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    cartaoComDieta(repo)

    await usuario.click(caixa())
    await usuario.click(screen.getByRole('button', { name: 'Agora não' }))

    expect(repo.porCaso('c1')?.dieta).toBeNull()
    expect(caixa()).not.toBeChecked()
    expect(screen.queryByText(/O paciente autorizou\?/)).not.toBeInTheDocument()
  })

  it('CA-555: "Atualizar a dieta no link" também traz as missões de agora; as marcadas continuam marcadas e o endereço não muda', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antes = repo.salvar({ ...acompanhamentoDe('c1', 'Ana', [{ dia: HOJE, feitas: ['refeicao-1', 'agua'] }]), dieta: ANTIGA })
    const agora: readonly Missao[] = [...MISSOES, { id: 'refeicao-2', texto: 'Almoço por volta das 12:00', origem: 'Refeição do plano' }]
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={agora} dieta={DIETA} hoje={HOJE} />
      </Anfitriao>,
    )

    await usuario.click(screen.getByRole('button', { name: 'Atualizar a dieta no link' }))

    const depois = repo.porCaso('c1')
    if (!depois) throw new Error('o link sumiu')
    expect(depois.token).toBe(antes.token)
    expect(depois.missoes).toEqual(agora)
    expect(depois.marcacoes).toEqual(antes.marcacoes)
    expect(missoesDoDia(depois, HOJE).filter((m) => m.feita).map((m) => m.id)).toEqual(['refeicao-1', 'agua'])
    expect(progressoDoDia(depois, HOJE)).toEqual({ feitas: 2, total: 3, pct: 67 })
  })

  it('CA-545: plano mudado: o cartão avisa e "Atualizar a dieta no link" copia a de agora, sem trocar o endereço', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antes = repo.salvar({ ...acompanhamentoDe('c1', 'Ana'), dieta: ANTIGA })
    cartaoComDieta(repo)

    expect(screen.getByText(MUDOU)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Atualizar a dieta no link' }))

    const depois = repo.porCaso('c1')
    expect(depois?.dieta).toEqual(copiarDieta(DIETA, HOJE))
    expect(depois?.token).toBe(antes.token)
    expect(depois?.missoes).toEqual(antes.missoes)
    expect(screen.queryByText(MUDOU)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Atualizar a dieta no link' })).not.toBeInTheDocument()
  })

  it('CA-546: plano igual no que o paciente vê (só a cópia é de outro dia): sem aviso e sem botão', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar({ ...acompanhamentoDe('c1', 'Ana'), dieta: copiarDieta(DIETA, '2026-09-01') })
    cartaoComDieta(repo)
    expect(screen.queryByText(MUDOU)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Atualizar a dieta no link' })).not.toBeInTheDocument()
  })

  it('CA-545: link sem dieta não avisa que o plano mudou', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    cartaoComDieta(repo)
    expect(screen.queryByText(MUDOU)).not.toBeInTheDocument()
  })

  it('CA-547: "Gerar link novo" leva a dieta de agora; com a dieta desligada, continua sem ela', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const comDieta = repo.salvar({ ...acompanhamentoDe('c1', 'Ana'), dieta: ANTIGA })
    const { unmount } = cartaoComDieta(repo)
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    expect(repo.porCaso('c1')?.token).not.toBe(comDieta.token)
    expect(repo.porCaso('c1')?.dieta).toEqual(copiarDieta(DIETA, HOJE))
    expect(screen.getByText('Gerar de novo atualiza as missões e a dieta com o plano atual. O link antigo para de valer.')).toBeInTheDocument()
    unmount()

    const outro = criarRepositorioAcompanhamentos(memoria())
    outro.salvar(acompanhamentoDe('c1', 'Ana'))
    cartaoComDieta(outro)
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    expect(outro.porCaso('c1')?.dieta).toBeNull()
  })

  it('DP-152: sem a dieta do plano (cartão antigo), não há caixa e o link nasce sem dieta', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await gerar(usuario)
    expect(repo.porCaso('c1')?.dieta).toBeNull()
  })
})
