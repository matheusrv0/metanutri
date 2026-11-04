import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import arquivo from '@/data/base-ampliada.json'
import type { ArquivoBaseAmpliada } from '@/domain/baseAmpliada.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import { montarRestricoes, type RestricoesDoPaciente } from '@/domain/restricoes.ts'
import { buscarAlimento, registrarBaseAmpliada } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Plano } from '@/domain/tipos.ts'
import { ContextoRestricoes } from '../estado/contextoRestricoes.ts'
import { prepararBaseAmpliadaParaTeste } from '../estado/baseAmpliada.ts'
import { TelaPlano } from './TelaPlano.tsx'

// Spec busca-substitutos: o painel de substitutos no plano (D-1100 a D-1117). Sem `matchMedia` (jsdom), o painel é a
// gaveta; os testes da tela larga ligam a consulta de 1280 px.

let n = 0
const ids = () => `id${++n}`

function Anfitriao({ aoMudar, restricoes }: { readonly aoMudar?: (p: Plano) => void; readonly restricoes?: RestricoesDoPaciente }) {
  const [plano, setPlano] = useState<Plano>(() => criarPlanoPadrao(ids))
  const tela = (
    <TelaPlano
      plano={plano}
      gerarId={ids}
      aoAlterarPlano={(p) => {
        setPlano(p)
        aoMudar?.(p)
      }}
    />
  )
  return restricoes ? <ContextoRestricoes.Provider value={restricoes}>{tela}</ContextoRestricoes.Provider> : tela
}

const entradaDoAlmoco = () => screen.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
const ARROZ = 'Arroz, tipo 1, cozido'
const gaveta = () => within(screen.getByRole('dialog', { name: `Substitutos de ${ARROZ}` }))
const kcalDoDia = (p: Plano | null) => (p ? totaisDoPlano(p, buscarAlimento).nutrientes.energia_kcal.total : -1)

async function almocoComArroz(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(entradaDoAlmoco(), '150 arroz tipo 1 cozido{Enter}')
}

function telaLarga(larga: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => ({
      matches: larga && consulta === '(min-width: 1280px)',
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('o botão e o painel (D-1100, D-1116)', () => {
  it('CA-2100: o alimento do Principal tem "Buscar substitutos"; o da aba Substituto 1, não', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    expect(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` })).toBeInTheDocument()
    await usuario.click(within(screen.getByRole('tablist', { name: 'Opções de Almoço' })).getByRole('tab', { name: 'Substituto 1' }))
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento em Substituto 1 de Almoço' }), '150 arroz tipo 1 cozido{Enter}')
    expect(screen.queryByRole('button', { name: `Buscar substitutos para ${ARROZ}` })).not.toBeInTheDocument()
  })

  it('CA-2101 e CA-2102: abre como gaveta, com a porção e a refeição, o macro dominante marcado e a lista pronta', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const painel = gaveta()
    expect(painel.getByText(/150 g · almoço$/)).toBeInTheDocument()
    expect(painel.getByRole('button', { name: /^Carboidratos/ })).toHaveAttribute('aria-pressed', 'true')
    expect(painel.getByRole('button', { name: /^Proteínas/ })).toHaveAttribute('aria-pressed', 'false')
    expect(within(painel.getByRole('list', { name: 'Candidatos' })).getAllByRole('listitem').length).toBe(6)
    expect(painel.getByText('Só do mesmo grupo: cereais, tubérculos e raízes')).toBeInTheDocument()
  })

  it('CA-2101 (tela larga): ao lado, com o botão pressionado; clicar de novo fecha', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    const botao = screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` })
    await usuario.click(botao)
    const lado = screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` })
    expect(lado).toBeInTheDocument()
    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await usuario.click(botao)
    expect(screen.queryByRole('complementary', { name: `Substitutos de ${ARROZ}` })).not.toBeInTheDocument()
  })

  it('CA-2101 (tela larga): o botão de outro item troca o painel para ele; "Fechar substitutos" fecha', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.type(entradaDoAlmoco(), '140 feijao carioca cozido{Enter}')
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(screen.getByRole('button', { name: 'Buscar substitutos para Feijão, carioca, cozido' }))
    expect(screen.getByRole('complementary', { name: 'Substitutos de Feijão, carioca, cozido' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` })).toHaveAttribute('aria-pressed', 'false')
    await usuario.click(screen.getByRole('button', { name: 'Fechar substitutos' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('CA-2101 (tela larga): o foco vai ao título; Esc fecha, menos dentro de um campo', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    expect(lado.getByRole('heading', { name: `Substitutos de ${ARROZ}` })).toHaveFocus()
    await usuario.click(lado.getByRole('radio', { name: 'Adicionar manualmente' }))
    await usuario.type(lado.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata{Escape}')
    expect(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` })).toBeInTheDocument()
    lado.getByRole('heading', { name: `Substitutos de ${ARROZ}` }).focus()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('CB-1104: o item removido com o painel aberto fecha o painel', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(screen.getByRole('button', { name: `Remover ${ARROZ}` }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})

describe('a busca (D-1103 a D-1111)', () => {
  it('CA-2103: o candidato com a porção e a diferença', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const polenta = gaveta()
      .getByText('Polenta, pré-cozida')
      .closest('li')
    if (!polenta) throw new Error('sem polenta')
    expect(polenta).toHaveTextContent('3 colheres de servir · 180 g')
    expect(polenta).toHaveTextContent('0,1 g de carboidrato a menos')
    expect(gaveta().getByText('Mesma quantidade de carboidrato que 150 g · mesmo grupo')).toBeInTheDocument()
  })

  it('CA-2114: 6 de cara e "Mostrar mais"', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const painel = gaveta()
    const mais = painel.getByRole('button', { name: /^Mostrar mais \d+$/ })
    await usuario.click(mais)
    expect(within(painel.getByRole('list', { name: 'Candidatos' })).getAllByRole('listitem').length).toBeGreaterThan(6)
    expect(painel.getByRole('button', { name: 'Mostrar menos' })).toBeInTheDocument()
  })

  it('CA-2115: outro nutriente, tirar, alternar, desligar a busca e o aviso de lista velha', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const painel = gaveta()
    await usuario.selectOptions(painel.getByRole('combobox', { name: 'Outro nutriente' }), 'calcio_mg')
    await usuario.click(painel.getByRole('button', { name: 'Adicionar' }))
    const selecionados = within(painel.getByRole('list', { name: 'Nutrientes selecionados' }))
    expect(selecionados.getByText('Cálcio')).toBeInTheDocument()
    expect(painel.getByText('Os nutrientes mudaram. Busque de novo para atualizar a lista.')).toBeInTheDocument()
    await usuario.click(painel.getByRole('button', { name: 'Tirar Cálcio' }))
    expect(painel.queryByText('Os nutrientes mudaram. Busque de novo para atualizar a lista.')).not.toBeInTheDocument()
    await usuario.click(painel.getByRole('button', { name: /^Carboidratos/ }))
    expect(painel.getByRole('button', { name: 'Buscar alimentos' })).toBeDisabled()
    await usuario.click(painel.getByRole('button', { name: /^Proteínas/ }))
    await usuario.click(painel.getByRole('button', { name: 'Buscar alimentos' }))
    expect(painel.getByText(/^Mesma quantidade de proteína que 150 g/)).toBeInTheDocument()
  })

  it('CA-2138 (D-1126): a lista "Outro nutriente" guarda o valor; só "Adicionar" ou o Enter acrescentam', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const painel = gaveta()
    const lista = painel.getByRole('combobox', { name: 'Outro nutriente' })
    const adicionar = painel.getByRole('button', { name: 'Adicionar' })
    const nomes = () => within(painel.getByRole('list', { name: 'Nutrientes selecionados' })).getAllByRole('listitem').map((li) => li.textContent)
    expect(adicionar).toBeDisabled()
    // A seta, no Chromium do Windows, muda o valor da lista fechada e dispara "change" a cada tecla.
    for (const valor of ['energia_kcal', 'fibra_g', 'calcio_mg']) fireEvent.change(lista, { target: { value: valor } })
    expect(nomes()).toEqual(['Carboidratos'])
    expect(lista).toHaveValue('calcio_mg')
    expect(adicionar).toBeEnabled()
    // O Enter na lista acrescenta o escolhido; a lista volta ao começo, com o foco nela.
    lista.focus()
    await usuario.keyboard('{Enter}')
    expect(nomes()).toEqual(['Carboidratos', 'Cálcio'])
    expect(lista).toHaveValue('')
    expect(lista).toHaveFocus()
    expect(adicionar).toBeDisabled()
    // O botão faz o mesmo, e o foco volta à lista (o botão desliga, e o foco não cai no corpo da página).
    await usuario.selectOptions(lista, 'ferro_mg')
    await usuario.click(adicionar)
    expect(nomes()).toEqual(['Carboidratos', 'Cálcio', 'Ferro'])
    expect(lista).toHaveFocus()
    expect(within(lista).queryByRole('option', { name: 'Ferro' })).not.toBeInTheDocument()
  })

  it('CA-2116: o alimento sem o nutriente na tabela', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const painel = gaveta()
    await usuario.selectOptions(painel.getByRole('combobox', { name: 'Outro nutriente' }), 'vitamina_c_mg')
    await usuario.click(painel.getByRole('button', { name: 'Adicionar' }))
    await usuario.click(painel.getByRole('button', { name: /^Carboidratos/ }))
    await usuario.click(painel.getByRole('button', { name: 'Buscar alimentos' }))
    expect(painel.getByText(`${ARROZ} não tem vitamina C na tabela. Escolha outro nutriente.`)).toBeInTheDocument()
  })

  it('CA-2111: desligar "Só do mesmo grupo" e buscar traz todos os grupos', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const painel = gaveta()
    await usuario.click(painel.getByRole('switch', { name: 'Só do mesmo grupo: cereais, tubérculos e raízes' }))
    await usuario.click(painel.getByRole('button', { name: 'Buscar alimentos' }))
    expect(painel.getByText('Mesma quantidade de carboidrato que 150 g · todos os grupos')).toBeInTheDocument()
  })

  it('CA-2110: a restrição que tira todos diz isso', async () => {
    const restricoes = montarRestricoes({ marcadas: ['leite', 'ovo'], texto: '', doencas: [], naoGosta: '' })
    render(<Anfitriao restricoes={restricoes} />)
    const usuario = userEvent.setup()
    await usuario.type(entradaDoAlmoco(), '50 ricota{Enter}')
    await usuario.click(screen.getByRole('button', { name: 'Buscar substitutos para Queijo, ricota' }))
    expect(within(screen.getByRole('dialog', { name: 'Substitutos de Queijo, ricota' })).getByText(/dentro das restrições do paciente/)).toBeInTheDocument()
  })
})

describe('Comparar, Substituir e opção (D-1112 a D-1114)', () => {
  it('CA-2117: a janela lado a lado', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(gaveta().getByRole('button', { name: 'Comparar Batata, inglesa, cozida' }))
    const janela = within(screen.getByRole('dialog', { name: 'Comparar alimentos' }))
    expect(janela.getByRole('columnheader', { name: /Batata, inglesa, cozida/ })).toHaveTextContent('2 unidades e meia · 350 g')
    const carboidrato = janela.getByRole('rowheader', { name: /^Carboidrato/ }).closest('tr')
    expect(carboidrato).toHaveTextContent('escolhido')
    expect(carboidrato).toHaveTextContent('−0,3 g')
    expect(janela.getByRole('rowheader', { name: 'Vitamina C' }).closest('tr')).toHaveTextContent('não analisado')
    expect(janela.getByRole('button', { name: 'Adicionar como opção' })).toBeEnabled()
    // O "Fechar" do rodapé (o X do canto tem o mesmo nome).
    const [fechar] = janela.getAllByRole('button', { name: 'Fechar' })
    if (!fechar) throw new Error('sem Fechar')
    await usuario.click(fechar)
    expect(screen.queryByRole('dialog', { name: 'Comparar alimentos' })).not.toBeInTheDocument()
    expect(gaveta().getByRole('button', { name: /^Carboidratos/ })).toBeInTheDocument()
  })

  it('CA-2118 e CA-2119: substituir, o aviso com a refeição, e desfazer reabre o painel', async () => {
    let ultimo: Plano | null = null
    render(<Anfitriao aoMudar={(p) => (ultimo = p)} />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    const kcalAntes = kcalDoDia(ultimo)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(gaveta().getByRole('button', { name: 'Substituir por Batata, inglesa, cozida' }))

    expect(screen.queryByRole('dialog', { name: `Substitutos de ${ARROZ}` })).not.toBeInTheDocument()
    const itens = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    expect(itens.getByText('Batata, inglesa, cozida')).toBeInTheDocument()
    expect(itens.queryByText(ARROZ)).not.toBeInTheDocument()
    expect(screen.getByText(/^Arroz, tipo 1, cozido trocado por Batata, inglesa, cozida, 2 unidades e meia · 350 g\. Almoço passou a somar \d+ kcal\./)).toBeInTheDocument()
    expect(kcalDoDia(ultimo)).not.toBeCloseTo(kcalAntes, 0)

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    // A gaveta reabre no arroz; o plano, atrás dela, fica fora do leitor de tela enquanto ela está aberta.
    expect(screen.getByRole('dialog', { name: `Substitutos de ${ARROZ}` })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço', hidden: true })).getByText(ARROZ)).toBeInTheDocument()
    expect(screen.queryByText(/trocado por/)).not.toBeInTheDocument()
    expect(kcalDoDia(ultimo)).toBeCloseTo(kcalAntes, 5)
  })

  it('CA-2120: adicionar como opção, até 2, sem mudar o total; "Tirar" remove', async () => {
    telaLarga(true)
    let ultimo: Plano | null = null
    render(<Anfitriao aoMudar={(p) => (ultimo = p)} />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    const kcalAntes = kcalDoDia(ultimo)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    await usuario.click(lado.getByRole('button', { name: 'Adicionar como opção: Batata, inglesa, cozida' }))

    const opcoes = within(screen.getByRole('list', { name: `Opções de ${ARROZ}` }))
    expect(opcoes.getByRole('listitem')).toHaveTextContent(/^Opção 1Batata, inglesa, cozida2 unidades e meia · 350 g/)
    expect(lado.getByText('Batata, inglesa, cozida').closest('li')).toHaveTextContent('Já é opção')
    expect(kcalDoDia(ultimo)).toBe(kcalAntes)

    await usuario.click(lado.getByRole('button', { name: 'Adicionar como opção: Polenta, pré-cozida' }))
    expect(within(screen.getByRole('list', { name: `Opções de ${ARROZ}` })).getAllByRole('listitem')).toHaveLength(2)
    expect(lado.getAllByRole('button', { name: 'Já tem 2 opções' }).length).toBeGreaterThan(0)

    await usuario.click(screen.getByRole('button', { name: 'Tirar a opção Batata, inglesa, cozida' }))
    expect(within(screen.getByRole('list', { name: `Opções de ${ARROZ}` })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('CA-2125: a opção que bate com a restrição avisa na linha do plano', async () => {
    telaLarga(true)
    const restricoes = montarRestricoes({ marcadas: [], texto: 'polenta', doencas: [], naoGosta: '' })
    render(<Anfitriao restricoes={restricoes} />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    // A polenta não aparece na busca (D-1107); posta à mão, a linha avisa.
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    expect(lado.queryByText('Polenta, pré-cozida')).not.toBeInTheDocument()
    await usuario.click(lado.getByRole('radio', { name: 'Adicionar manualmente' }))
    await usuario.type(lado.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'polenta{Enter}')
    await usuario.click(lado.getByRole('button', { name: 'Adicionar como opção' }))
    expect(within(screen.getByRole('list', { name: `Opções de ${ARROZ}` })).getByText('Não come: polenta')).toBeInTheDocument()
  })
})

describe('Adicionar manualmente: a calculadora de hoje (D-1101)', () => {
  const abrirManual = async (usuario: ReturnType<typeof userEvent.setup>, gramas = 100) => {
    await usuario.type(entradaDoAlmoco(), `${gramas} arroz tipo 1 cozido{Enter}`)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(gaveta().getByRole('radio', { name: 'Adicionar manualmente' }))
    return gaveta()
  }

  it('CA-1336 (D-486): cada resultado mostra a porção que vai entrar, não os 100 g padrão', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    const painel = await abrirManual(usuario, 150)
    await usuario.type(painel.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida')
    const opcao = painel.getAllByRole('option')[0]
    if (!opcao) throw new Error('sem opção')
    expect(opcao.textContent).not.toMatch(/(^|[^\d])100 g/)
    await usuario.keyboard('{Enter}')
    const escolhido = painel.getByText(/^(\d+ g|.+ · \d+ g)$/).textContent ?? ''
    const gramas = /(\d+) g$/.exec(escolhido)?.[1]
    expect(opcao.textContent).toContain(`${gramas} g`)
  })

  it('CA-41, CA-42 e CA-2121: a porção equivalente por energia, as diferenças e as ações da busca', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    const painel = await abrirManual(usuario)
    expect(painel.getByRole('radio', { name: 'Energia (kcal)' })).toHaveAttribute('aria-checked', 'true')
    await usuario.type(painel.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida{Enter}')
    expect(painel.getByText(/^(\d+ g|.+ · \d+ g)$/)).toBeInTheDocument()
    expect(painel.getAllByRole('term').map((d) => d.textContent)).toEqual(['Energia', 'Proteína', 'Carboidrato', 'Gordura'])
    expect(painel.getByText(/Diferença em relação ao alimento original/)).toBeInTheDocument()
    expect(painel.getByRole('button', { name: 'Comparar' })).toBeInTheDocument()
    expect(painel.getByRole('button', { name: 'Adicionar como opção' })).toBeInTheDocument()
    expect(painel.getByRole('button', { name: 'Substituir' })).toBeInTheDocument()
  })

  it('CA-41: trocar o critério para proteína muda a porção', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    const painel = await abrirManual(usuario)
    await usuario.type(painel.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida{Enter}')
    const porEnergia = painel.getByText(/^(\d+ g|.+ · \d+ g)$/).textContent
    await usuario.click(painel.getByRole('radio', { name: 'Proteína' }))
    expect(painel.getByText(/^(\d+ g|.+ · \d+ g)$/).textContent).not.toBe(porEnergia)
  })

  it('CA-43: a opção do item não entra na soma do dia', async () => {
    let ultimo: Plano | null = null
    render(<Anfitriao aoMudar={(p) => (ultimo = p)} />)
    const usuario = userEvent.setup()
    const painel = await abrirManual(usuario)
    const kcalSo = kcalDoDia(ultimo)
    await usuario.type(painel.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata inglesa cozida{Enter}')
    await usuario.click(painel.getByRole('button', { name: 'Adicionar como opção' }))
    // A gaveta continua aberta; a opção já está embaixo do item, atrás dela.
    expect(within(screen.getByRole('list', { name: `Opções de ${ARROZ}`, hidden: true })).getByText('Batata, inglesa, cozida')).toBeInTheDocument()
    expect(kcalDoDia(ultimo)).toBe(kcalSo)
  })
})

describe('D-1117: a base ampliada chegando', () => {
  afterEach(() => {
    prepararBaseAmpliadaParaTeste({ automatico: false })
    registrarBaseAmpliada([])
  })

  it('CA-2127: avisa enquanto carrega e refaz a lista quando chega', async () => {
    let liberar: (a: ArquivoBaseAmpliada) => void = () => {}
    prepararBaseAmpliadaParaTeste({ automatico: true, carregar: () => new Promise((resolve) => (liberar = resolve)) })
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(gaveta().getByRole('button', { name: /^Mostrar mais/ }))
    expect(gaveta().getByText('Parte da base ainda está carregando; a lista pode crescer.')).toBeInTheDocument()
    expect(gaveta().queryByText('Macarrão, trigo, cozido')).not.toBeInTheDocument()
    liberar(arquivo as unknown as ArquivoBaseAmpliada)
    await waitFor(() => expect(gaveta().queryByText('Parte da base ainda está carregando; a lista pode crescer.')).not.toBeInTheDocument())
    expect(gaveta().getByText('Macarrão, trigo, cozido')).toBeInTheDocument()
  })
})

describe('correções da revisão independente (03/11/2026)', () => {
  it('CA-2133: na gaveta, o Esc no campo da calculadora não fecha a gaveta', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(gaveta().getByRole('radio', { name: 'Adicionar manualmente' }))
    await usuario.type(gaveta().getByRole('combobox', { name: 'Escolher alimento substituto' }), 'batata{Escape}')
    expect(screen.getByRole('dialog', { name: `Substitutos de ${ARROZ}` })).toBeInTheDocument()
  })

  it('CA-2133 (tela larga): o foco volta ao "⇄" do item depois de Fechar, de Substituir e de Substituir pela janela Comparar', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(screen.getByRole('button', { name: 'Fechar substitutos' }))
    expect(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` })).toHaveFocus()

    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    await usuario.click(screen.getByRole('button', { name: 'Substituir por Batata, inglesa, cozida' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Buscar substitutos para Batata, inglesa, cozida' })).toHaveFocus())

    await usuario.click(screen.getByRole('button', { name: 'Buscar substitutos para Batata, inglesa, cozida' }))
    const lado = within(screen.getByRole('complementary', { name: 'Substitutos de Batata, inglesa, cozida' }))
    const [comparar] = lado.getAllByRole('button', { name: /^Comparar / })
    if (!comparar) throw new Error('sem candidato')
    await usuario.click(comparar)
    await usuario.click(within(screen.getByRole('dialog', { name: 'Comparar alimentos' })).getByRole('button', { name: 'Substituir' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^Buscar substitutos para / })).toHaveFocus())
  })

  it('CA-2132: depois de "Adicionar como opção", o foco continua no botão, que vira "Já é opção"', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    await usuario.click(lado.getByRole('button', { name: 'Adicionar como opção: Batata, inglesa, cozida' }))
    expect(document.activeElement).toHaveTextContent('Já é opção')
    expect(document.activeElement).toHaveAttribute('aria-disabled', 'true')
    // Desligado, o clique não faz nada.
    await usuario.click(document.activeElement as HTMLElement)
    expect(within(screen.getByRole('list', { name: `Opções de ${ARROZ}` })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('CA-2141 (D-1128): "Tirar {nutriente}" leva o foco ao "Tirar" que ficou; sem nenhum, à lista "Outro nutriente"', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    await usuario.click(lado.getByRole('button', { name: /^Proteínas/ }))
    await usuario.click(lado.getByRole('button', { name: /^Lipídeos/ }))
    // O do meio: o foco vai ao que ficou no lugar dele.
    await usuario.click(lado.getByRole('button', { name: 'Tirar Proteínas' }))
    expect(lado.getByRole('button', { name: 'Tirar Lipídeos' })).toHaveFocus()
    // O último: o foco vai ao anterior.
    await usuario.click(lado.getByRole('button', { name: 'Tirar Lipídeos' }))
    expect(lado.getByRole('button', { name: 'Tirar Carboidratos' })).toHaveFocus()
    await usuario.click(lado.getByRole('button', { name: 'Tirar Carboidratos' }))
    expect(lado.getByRole('combobox', { name: 'Outro nutriente' })).toHaveFocus()
  })

  it('CA-2141 (D-1128): "Tirar" a opção leva o foco à opção que ficou; sem nenhuma, ao "⇄" do item', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    await usuario.click(lado.getByRole('button', { name: 'Adicionar como opção: Batata, inglesa, cozida' }))
    await usuario.click(lado.getByRole('button', { name: 'Adicionar como opção: Polenta, pré-cozida' }))
    await usuario.click(screen.getByRole('button', { name: 'Tirar a opção Batata, inglesa, cozida' }))
    expect(screen.getByRole('button', { name: 'Tirar a opção Polenta, pré-cozida' })).toHaveFocus()
    await usuario.click(screen.getByRole('button', { name: 'Tirar a opção Polenta, pré-cozida' }))
    expect(screen.queryByRole('list', { name: `Opções de ${ARROZ}` })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` })).toHaveFocus()
  })

  it('CA-2134: o próprio alimento na calculadora: "É o mesmo alimento" e "Substituir" desligado, também no Comparar', async () => {
    telaLarga(true)
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    await almocoComArroz(usuario)
    await usuario.click(screen.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }))
    const lado = within(screen.getByRole('complementary', { name: `Substitutos de ${ARROZ}` }))
    await usuario.click(lado.getByRole('radio', { name: 'Adicionar manualmente' }))
    await usuario.type(lado.getByRole('combobox', { name: 'Escolher alimento substituto' }), 'arroz tipo 1 cozido{Enter}')
    expect(lado.getByRole('button', { name: 'É o mesmo alimento' })).toHaveAttribute('aria-disabled', 'true')
    expect(lado.getByRole('button', { name: 'Substituir' })).toBeDisabled()
    await usuario.click(lado.getByRole('button', { name: 'Comparar' }))
    const janela = within(screen.getByRole('dialog', { name: 'Comparar alimentos' }))
    expect(janela.getByRole('button', { name: 'Substituir' })).toBeDisabled()
    expect(janela.getByRole('button', { name: 'É o mesmo alimento' })).toBeDisabled()
  })
})
