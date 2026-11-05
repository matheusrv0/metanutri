// Spec marca-no-link: o link do paciente com a marca da nutricionista (CA-1965 a CA-1973). As cores de cada tema saem
// do CSS (tokens.css); aqui, a tela confere o que ela põe na página, e o Playwright confere a cor pintada.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { DietaDoLink } from '@/domain/dietaDoLink.ts'
import type { MarcaDoLink } from '@/domain/marca.ts'
import type { AcompanhamentoDoLink, FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { TelaMissoesPaciente } from './TelaMissoesPaciente.tsx'

const HOJE = '2026-10-29'
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const VERDE_FOLHA = '#3f5f2a'
const ALT_DA_LOGO = 'Logo de quem montou seu plano'

const DIETA: DietaDoLink = {
  refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }]] }],
  orientacoes: '',
  receitas: '',
  copiadaEm: '2026-10-28',
}

function link(parcial: Partial<Acompanhamento> = {}, marca?: MarcaDoLink): AcompanhamentoDoLink {
  const base = criarAcompanhamento(
    {
      casoId: 'caso-1',
      pacienteId: 'p1',
      nome: 'Juliana',
      missoes: [
        { id: 'cafe', texto: 'Café da manhã por volta das 7h', origem: 'Refeição do plano' },
        { id: 'agua', texto: 'Beber cerca de 2,2 litros de água', origem: 'Meta de água do plano' },
      ],
    },
    { agora: () => '2026-10-20T10:00:00.000Z', gerarId: () => 'ac-1', aleatorio: (n) => new Uint8Array(n).fill(3) },
  )
  const acompanhamento = { ...base, marcacoes: [{ dia: HOJE, feitas: ['cafe'] }], usoNaoComercial: false, ...parcial }
  return marca ? { ...acompanhamento, marca } : acompanhamento
}

function fonteCom(inicial: AcompanhamentoDoLink) {
  const salvos: unknown[] = []
  const fonte: FonteAcompanhamentos = {
    naNuvem: true,
    porToken: () => Promise.resolve(inicial),
    salvar: (a) => {
      salvos.push(a)
      return Promise.resolve(a)
    },
  }
  return { fonte, salvos }
}

const abrir = async (inicial: AcompanhamentoDoLink) => {
  const { fonte, salvos } = fonteCom(inicial)
  const tela = render(<TelaMissoesPaciente token="tok" fonte={fonte} hoje={HOJE} />)
  await screen.findByRole('heading', { level: 1 })
  return { ...tela, salvos }
}

/** A raiz do link: o elemento que leva a classe e as variáveis da marca. */
const raiz = (container: HTMLElement) => container.firstElementChild as HTMLElement

describe('o link com a marca da nutricionista', () => {
  it('CA-1965 e CA-1971: a logo dela no topo, numa placa branca; a cor na barra do dia e na aba escolhida; o MetaNutri pequeno no rodapé', async () => {
    const { container } = await abrir(link({ dieta: DIETA }, { logo: LOGO, cor: VERDE_FOLHA }))
    const logo = screen.getByRole('img', { name: ALT_DA_LOGO })
    expect(logo).toHaveAttribute('src', LOGO)
    expect(logo.parentElement?.className).toContain('bg-linkplaca')

    expect(raiz(container)).toHaveClass('marca-da-nutricionista')
    expect(raiz(container).style.getPropertyValue('--marca-claro')).toBe(VERDE_FOLHA)
    // D-955: a versão do escuro vai junto (a mesma cor clareada até 7:1); o tema escolhe no CSS.
    expect(raiz(container).style.getPropertyValue('--marca-escuro')).toBe('#7ab455')

    expect(screen.getByRole('tab', { name: 'Missões', selected: true }).className).toContain('data-[state=active]:bg-linkacao')
    expect(screen.getByRole('progressbar').firstElementChild?.className).toContain('bg-linkacao')

    // O MetaNutri desce para o rodapé, depois das missões, em qualquer assinatura (o link nem sabe qual é).
    const metanutri = screen.getAllByRole('img', { name: 'MetaNutri' })
    expect(metanutri).toHaveLength(1)
    expect(logo.compareDocumentPosition(metanutri[0] as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('tabpanel').compareDocumentPosition(metanutri[0] as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-1965: as missões feitas continuam no verde de "feita", não na cor dela', async () => {
    await abrir(link({}, { logo: LOGO, cor: VERDE_FOLHA }))
    const feita = screen.getByRole('button', { name: /Café da manhã/ })
    expect(feita).toHaveAttribute('aria-pressed', 'true')
    expect(feita.className).toContain('bg-lightsuccess')
    expect(feita.className).not.toContain('linkacao')
  })

  it('CA-1972: a logo do topo cabe em 40 × 200 px, sem esticar', async () => {
    await abrir(link({}, { logo: LOGO, cor: null }))
    const classes = screen.getByRole('img', { name: ALT_DA_LOGO }).className
    expect(classes).toContain('max-h-10')
    expect(classes).toContain('max-w-50')
    expect(classes).toContain('object-contain')
  })

  it('CA-1968: conta sem marca: o link de hoje (MetaNutri no topo, sem rodapé repetido, aba em pílula branca)', async () => {
    const { container } = await abrir(link({ dieta: DIETA }, { logo: null, cor: null }))
    expect(raiz(container)).not.toHaveClass('marca-da-nutricionista')
    expect(screen.queryByRole('img', { name: ALT_DA_LOGO })).not.toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'MetaNutri' })).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Missões', selected: true }).className).toContain('data-[state=active]:bg-card')
  })

  it('CA-1968: link lido sem a marca (a função de antes, o modo local) também é o de hoje', async () => {
    const { container } = await abrir(link())
    expect(raiz(container)).not.toHaveClass('marca-da-nutricionista')
    expect(screen.getAllByRole('img', { name: 'MetaNutri' })).toHaveLength(1)
  })

  it('CA-1969: marca só com cor: o MetaNutri no topo, a cor na ação, e o rodapé não repete a logo', async () => {
    const { container } = await abrir(link({}, { logo: null, cor: '#1f4e8c' }))
    expect(raiz(container)).toHaveClass('marca-da-nutricionista')
    expect(raiz(container).style.getPropertyValue('--marca-claro')).toBe('#1f4e8c')
    expect(screen.getAllByRole('img', { name: 'MetaNutri' })).toHaveLength(1)
  })

  it('marca só com logo: a ação fica a do MetaNutri', async () => {
    const { container } = await abrir(link({}, { logo: LOGO, cor: null }))
    expect(raiz(container)).not.toHaveClass('marca-da-nutricionista')
    expect(screen.getByRole('img', { name: ALT_DA_LOGO })).toBeInTheDocument()
  })

  it('CA-1970: no link de conta de estudante, o aviso de estágio vem antes da logo', async () => {
    await abrir(link({ usoNaoComercial: true }, { logo: LOGO, cor: VERDE_FOLHA }))
    const aviso = screen.getByText(/estágio de nutrição/)
    const logo = screen.getByRole('img', { name: ALT_DA_LOGO })
    expect(aviso.compareDocumentPosition(logo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-1973: a logo que não abre volta à logo do MetaNutri no topo, e as missões abrem', async () => {
    await abrir(link({}, { logo: LOGO, cor: VERDE_FOLHA }))
    fireEvent.error(screen.getByRole('img', { name: ALT_DA_LOGO }))
    expect(screen.queryByRole('img', { name: ALT_DA_LOGO })).not.toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'MetaNutri' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /litros de água/ })).toBeInTheDocument()
  })

  it('DP-ML-14: marcar uma missão grava o link sem a marca', async () => {
    const { salvos } = await abrir(link({}, { logo: LOGO, cor: VERDE_FOLHA }))
    await userEvent.setup().click(screen.getByRole('button', { name: /litros de água/ }))
    expect(salvos).toHaveLength(1)
    expect(JSON.stringify(salvos[0])).not.toContain('iVBORw0KGgo')
    expect(salvos[0]).not.toHaveProperty('marca')
    // A marca continua na tela.
    expect(screen.getByRole('img', { name: ALT_DA_LOGO })).toBeInTheDocument()
  })

  it('CA-1966 e CB-958: no escuro vale a versão do escuro com texto carvão; sem o .dark (o papel), a do claro', () => {
    const tokens = readFileSync(join(process.cwd(), 'design-system', 'tokens', 'tokens.css'), 'utf8')
    const regra = (seletor: string) => tokens.split(`\n${seletor} {`)[1]?.split('}')[0] ?? ''
    expect(regra('.marca-da-nutricionista')).toContain('--link-acao: var(--marca-claro);')
    expect(regra('.marca-da-nutricionista')).toContain('--link-acao-texto: var(--gray-0);')
    expect(regra('.dark .marca-da-nutricionista')).toContain('--link-acao: var(--marca-escuro);')
    expect(regra('.dark .marca-da-nutricionista')).toContain('--link-acao-texto: var(--carvao-900);')
  })
})
