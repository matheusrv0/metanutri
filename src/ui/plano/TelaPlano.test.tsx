import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { registrarMedidasProprias } from '@/domain/busca.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import { produtoComoAlimento, type Produto } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { itemDeReceita, PANQUECA } from '@/domain/receitas.test-utils.ts'
import type { ModoQuantidade, Plano } from '@/domain/tipos.ts'
import { TelaPlano } from './TelaPlano.tsx'

let n = 0
const ids = () => `id${++n}`

function Anfitriao({ inicial }: { readonly inicial?: Plano }) {
  const [plano, setPlano] = useState<Plano>(inicial ?? criarPlanoPadrao(ids))
  return <TelaPlano plano={plano} aoAlterarPlano={setPlano} gerarId={ids} />
}

const montar = (inicial?: Plano) => {
  render(<Anfitriao {...(inicial ? { inicial } : {})} />)
  return userEvent.setup()
}

const entradaDoAlmoco = () => screen.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
const opcoesVisiveis = () => screen.queryAllByRole('option')
const almoco = () => within(screen.getByRole('tabpanel', { name: 'Principal de Almoço' }))
const painel = (nome: string) => within(screen.getByRole('tabpanel', { name: `Principal de ${nome}` }))

beforeEach(() => localStorage.clear())

describe('Produto apagado no cabeçalho da refeição (spec revisao-geral-trabalho, CA-789)', () => {
  it('as kcal da opção levam a †', () => {
    const plano = criarPlanoPadrao(ids)
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    montar({ ...plano, refeicoes: [{ ...desjejum, opcoes: { ...desjejum.opcoes, principal: [{ id: 'x', alimentoId: 900_001, gramas: 40 }] } }, ...plano.refeicoes.slice(1)] })
    const cartao = (nome: string) => within(screen.getByRole('textbox', { name: `Nome da refeição ${nome}` }).closest('[data-slot="card"]') as HTMLElement)
    expect(cartao('Café da manhã').getByText('0 kcal').parentElement).toHaveTextContent('†')
    expect(cartao('Almoço').getByText('0 kcal').parentElement).not.toHaveTextContent('†')
  })
})

describe('Receita com ingrediente apagado no cabeçalho da refeição (spec integracao-rodada-1910, CA-985)', () => {
  it('as kcal da opção levam a †', () => {
    const plano = criarPlanoPadrao(ids)
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    const comApagado = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 900_001, gramas: 20 }] }
    montar({ ...plano, refeicoes: [{ ...desjejum, opcoes: { ...desjejum.opcoes, principal: [itemDeReceita('x', 120, comApagado)] } }, ...plano.refeicoes.slice(1)] })
    const cartao = within(screen.getByRole('textbox', { name: 'Nome da refeição Café da manhã' }).closest('[data-slot="card"]') as HTMLElement)
    // O primeiro "N kcal" do cartão é o do cabeçalho da opção; o segundo, o da linha da receita.
    const [cabecalho] = cartao.getAllByText(/^\d+ kcal$/)
    expect(cabecalho?.parentElement).toHaveTextContent('†')
  })
})

describe('Etapa 2: plano alimentar', () => {
  it('CA-12: começa com as seis refeições padrão, com horário', () => {
    montar()
    for (const nome of ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia']) {
      expect(screen.getByRole('textbox', { name: `Nome da refeição ${nome}` })).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Horário de Almoço')).toHaveValue('12:00')
  })

  it('CA-13: renomear, mudar horário, adicionar e remover refeição', async () => {
    const usuario = montar()
    const nome = screen.getByRole('textbox', { name: 'Nome da refeição Ceia' })
    await usuario.clear(nome)
    await usuario.type(nome, 'Lanche da noite')
    expect(screen.getByRole('textbox', { name: 'Nome da refeição Lanche da noite' })).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText('Horário de Almoço'))
    await usuario.type(screen.getByLabelText('Horário de Almoço'), '13:30')
    expect(screen.getByLabelText('Horário de Almoço')).toHaveValue('13:30')

    await usuario.click(screen.getByRole('button', { name: 'Adicionar refeição' }))
    expect(screen.getByRole('textbox', { name: 'Nome da refeição Nova refeição' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Mais ações de Nova refeição' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Remover refeição' }))
    expect(screen.queryByRole('textbox', { name: 'Nome da refeição Nova refeição' })).not.toBeInTheDocument()
  })

  it('CA-334: o topo da refeição traz as kcal da opção aberta, e a linha de total some', () => {
    montar()
    expect(screen.queryByText('Total desta opção')).not.toBeInTheDocument()
    const almoco = screen.getByRole('tablist', { name: 'Opções de Almoço' }).closest('[data-slot="card"]')
    expect(almoco).not.toBeNull()
    expect(within(almoco as HTMLElement).getByText('0 kcal')).toBeInTheDocument()
    expect(within(almoco as HTMLElement).queryByRole('button', { name: /^Remover refeição/ })).not.toBeInTheDocument()
  })

  it('CA-336: as sugestões ficam numa linha só, com Editar no fim', () => {
    montar()
    const sugestoes = screen.getAllByRole('region', { name: /^Sugestões para / })[0] as HTMLElement
    const botoes = within(sugestoes).getAllByRole('button')
    expect(botoes.at(-1)).toHaveAccessibleName(/^Editar sugestões para /)
    const faixa = within(sugestoes).getAllByRole('button', { name: /^Adicionar / })[0]?.parentElement
    expect(faixa?.className).toContain('overflow-x-auto')
    expect(faixa?.className).not.toContain('flex-wrap')
  })

  it('CA-14: cada refeição tem Principal, Substituto 1 e Substituto 2', async () => {
    const usuario = montar()
    const abas = within(screen.getByRole('tablist', { name: 'Opções de Almoço' }))
    expect(abas.getByRole('tab', { name: 'Principal' })).toHaveAttribute('aria-selected', 'true')
    await usuario.click(abas.getByRole('tab', { name: 'Substituto 1' }))
    expect(screen.getByRole('combobox', { name: 'Adicionar alimento em Substituto 1 de Almoço' })).toBeInTheDocument()
  })

  it('CA-335: as três abas ficam no tablist e a aba Principal conta os alimentos', async () => {
    const usuario = montar()
    const abas = within(screen.getByRole('tablist', { name: 'Opções de Almoço' }))
    expect(abas.getAllByRole('tab')).toHaveLength(3)
    expect(abas.getByRole('tab', { name: 'Principal' })).toBeInTheDocument()
    await usuario.type(entradaDoAlmoco(), 'arroz integral{Enter}')
    expect(abas.getByRole('tab', { name: 'Principal (1)' })).toBeInTheDocument()
    expect(abas.getByRole('tab', { name: 'Substituto 1' })).toBeInTheDocument()
    expect(abas.getByRole('tab', { name: 'Substituto 2' })).toBeInTheDocument()
  })

  it('CA-15 e CA-16: busca por partes do nome e Enter adiciona o primeiro resultado', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), '150 arroz int')
    expect(opcoesVisiveis().length).toBeGreaterThan(0)
    expect(opcoesVisiveis().length).toBeLessThanOrEqual(5)

    await usuario.keyboard('{Enter}')
    const lista = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    expect(lista.getAllByText(/Arroz, integral/).length).toBeGreaterThan(0)
    expect(lista.getByLabelText(/^Gramas de Arroz, integral/)).toHaveValue('150')
    expect(entradaDoAlmoco()).toHaveValue('')
  })

  it('CA-16: as setas mudam a escolha antes do Enter', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'arroz')
    const segundo = opcoesVisiveis()[1]?.textContent ?? ''
    await usuario.keyboard('{ArrowDown}{Enter}')
    const lista = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    expect(lista.getAllByRole('listitem')).toHaveLength(1)
    expect(segundo).toContain(lista.getAllByRole('listitem')[0]?.textContent?.split('\n')[0]?.slice(0, 10) ?? '')
  })

  it('CA-17: sem quantidade, entra com 100 g editáveis', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'banana prata{Enter}')
    const campo = screen.getByLabelText(/^Gramas de Banana/)
    expect(campo).toHaveValue('100')
    await usuario.clear(campo)
    await usuario.type(campo, '75')
    expect(screen.getByLabelText(/^Gramas de Banana/)).toHaveValue('75')
  })

  it('CA-18 e CA-19: medida caseira vira gramas e a linha mostra a equivalência e as kcal', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), '2 colher de sopa arroz, tipo 1, cozido{Enter}')
    const lista = within(screen.getByRole('list', { name: 'Alimentos em Principal de Almoço' }))
    // G1 e G2 (spec alimentos-e-gramaturas): quantidade + medida = gramas, ligados, e o que o paciente lê.
    expect(lista.getByLabelText('Quantidade de Arroz, tipo 1, cozido')).toHaveValue('2')
    expect(lista.getByRole('combobox', { name: 'Medida de Arroz, tipo 1, cozido' })).toHaveValue('colher de sopa')
    expect(lista.getByLabelText('Gramas de Arroz, tipo 1, cozido')).toHaveValue('50')
    expect(lista.getByText(/O paciente lê:/)).toHaveTextContent('2 colheres de sopa')
    expect(lista.getByText(/kcal$/)).toBeInTheDocument()
  })

  it('CA-20: texto sem correspondência avisa e não adiciona nada', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'xyzabc{Enter}')
    expect(screen.getByText(/Nenhum alimento encontrado/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Alimentos em Principal de Almoço' })).not.toBeInTheDocument()
  })

  it('CB-04: gramas negativas são ignoradas e zero é aceito', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'banana prata{Enter}')
    const campo = screen.getByLabelText(/^Gramas de Banana/)
    await usuario.clear(campo)
    await usuario.type(campo, '0')
    expect(almoco().getAllByText('0 kcal').length).toBe(1)

    await usuario.clear(campo)
    await usuario.type(campo, '-5')
    expect(almoco().getAllByText('0 kcal').length).toBe(1)
  })

  it('CA-19: remover um alimento tira a linha', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'banana prata{Enter}')
    await usuario.click(screen.getByRole('button', { name: /^Remover Banana/ }))
    expect(almoco().getByText('Nenhum alimento nesta opção.')).toBeInTheDocument()
  })
})

describe('Sugestões por refeição (US-A3)', () => {
  it('CA-237: cada refeição mostra as sugestões do seu tipo, com nome e gramas', () => {
    montar()
    expect(painel('Almoço').getByRole('region', { name: 'Sugestões para o almoço' })).toBeInTheDocument()
    expect(painel('Almoço').getByRole('button', { name: 'Adicionar Arroz, tipo 1, cozido, 100 g' })).toBeInTheDocument()
    expect(painel('Café da manhã').getByRole('button', { name: 'Adicionar Cuscuz, de milho, cozido com sal, 135 g' })).toBeInTheDocument()
    expect(painel('Lanche da manhã').getByRole('region', { name: 'Sugestões para o lanche' })).toBeInTheDocument()
    expect(painel('Ceia').getByRole('region', { name: 'Sugestões para a ceia' })).toBeInTheDocument()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })

  it('CA-238: clicar na sugestão põe o alimento na porção mostrada, na opção aberta', async () => {
    const usuario = montar()
    await usuario.click(painel('Almoço').getByRole('button', { name: 'Adicionar Feijão, carioca, cozido, 140 g' }))
    expect(painel('Almoço').getByLabelText(/^Gramas de Feijão, carioca/)).toHaveValue('140')

    await usuario.click(within(screen.getByRole('tablist', { name: 'Opções de Almoço' })).getByRole('tab', { name: 'Substituto 1' }))
    const substituto = within(screen.getByRole('tabpanel', { name: 'Substituto 1 de Almoço' }))
    await usuario.click(substituto.getByRole('button', { name: 'Adicionar Arroz, tipo 1, cozido, 100 g' }))
    expect(substituto.getByLabelText(/^Gramas de Arroz, tipo 1/)).toHaveValue('100')
  })

  it('CA-307: digitar no campo esconde as sugestões', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'arr')
    expect(painel('Almoço').queryByRole('region', { name: 'Sugestões para o almoço' })).not.toBeInTheDocument()
  })

  it('CA-306: lista vazia não mostra o rótulo nem as sugestões', () => {
    localStorage.setItem('metanutri:sugestoes-por-refeicao', JSON.stringify({ almoco: [] }))
    montar()
    expect(painel('Almoço').queryByRole('region', { name: 'Sugestões para o almoço' })).not.toBeInTheDocument()
    expect(painel('Almoço').queryByRole('button', { name: /^Adicionar / })).not.toBeInTheDocument()
    expect(entradaDoAlmoco()).toBeInTheDocument()
  })

  it('CB-55: o histórico do antigo "Você usa muito" não volta', () => {
    localStorage.setItem('metanutri:frequentes', JSON.stringify({ 3: { vezes: 9, ultimoUso: '2026-09-01T00:00:00.000Z', gramas: 150 } }))
    montar()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
    expect(painel('Almoço').queryByRole('button', { name: /, 150 g$/ })).not.toBeInTheDocument()
  })

  it('Foco de revisão 2: renomear ou mudar o horário troca as sugestões na hora', async () => {
    const usuario = montar()
    const nome = screen.getByRole('textbox', { name: 'Nome da refeição Lanche da tarde' })
    await usuario.clear(nome)
    await usuario.type(nome, 'Jantar cedo')
    expect(painel('Jantar cedo').getByRole('region', { name: 'Sugestões para o jantar' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Adicionar refeição' }))
    expect(painel('Nova refeição').getByRole('region', { name: 'Sugestões para o lanche' })).toBeInTheDocument() // 10:00
    const horario = screen.getByLabelText('Horário de Nova refeição')
    await usuario.clear(horario)
    await usuario.type(horario, '19:30')
    expect(painel('Nova refeição').getByRole('region', { name: 'Sugestões para o jantar' })).toBeInTheDocument()
  })

  it('CA-243: salvar vale para todas as refeições do tipo e fica no aparelho', async () => {
    const usuario = montar()
    await usuario.click(painel('Lanche da manhã').getByRole('button', { name: 'Editar sugestões para o lanche' }))
    const dialogo = within(screen.getByRole('dialog', { name: 'Sugestões para o lanche' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Tirar Banana, prata, crua' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Salvar' }))

    expect(painel('Lanche da manhã').queryByRole('button', { name: 'Adicionar Banana, prata, crua, 75 g' })).not.toBeInTheDocument()
    expect(painel('Lanche da tarde').queryByRole('button', { name: 'Adicionar Banana, prata, crua, 75 g' })).not.toBeInTheDocument()
    expect(painel('Ceia').getByRole('button', { name: 'Adicionar Banana, prata, crua, 75 g' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('metanutri:sugestoes-por-refeicao') ?? '{}').lanche).toHaveLength(5)
  })

  it('CA-306: com a lista vazia, sobra o link para montar a lista de novo', async () => {
    localStorage.setItem('metanutri:sugestoes-por-refeicao', JSON.stringify({ almoco: [] }))
    const usuario = montar()
    expect(painel('Almoço').queryByText('Sugestões para o almoço')).not.toBeInTheDocument()
    await usuario.click(painel('Almoço').getByRole('button', { name: 'Editar sugestões para o almoço' }))
    expect(screen.getByRole('dialog', { name: 'Sugestões para o almoço' })).toBeInTheDocument()
  })
})

describe('Quantidades para o paciente no topo da etapa (spec alimentos-e-gramaturas, D-376)', () => {
  function ComModo() {
    const [plano, setPlano] = useState<Plano>(criarPlanoPadrao(ids))
    const [modo, setModo] = useState<ModoQuantidade>('medida-e-gramas')
    return <TelaPlano plano={plano} aoAlterarPlano={setPlano} gerarId={ids} modo={modo} aoMudarModo={setModo} />
  }

  it('CA-1121 e CA-1119: a escolha fica no topo, e "O paciente lê" segue o modo', async () => {
    render(<ComModo />)
    const usuario = userEvent.setup()
    await usuario.type(entradaDoAlmoco(), '1 concha e meia de feijão{Enter}')
    expect(almoco().getByText(/O paciente lê:/)).toHaveTextContent('1 concha e meia (210 g)')
    const escolha = screen.getByRole('radiogroup', { name: 'Quantidades para o paciente' })
    await usuario.click(within(escolha).getByRole('radio', { name: 'Só medida' }))
    expect(almoco().getByText(/O paciente lê:/)).toHaveTextContent('O paciente lê: 1 concha e meia')
    await usuario.click(within(escolha).getByRole('radio', { name: 'Só gramas' }))
    expect(almoco().getByText(/O paciente lê:/)).toHaveTextContent('O paciente lê: 210 g')
  })

  it('CA-1101: "1 banana" entra como 1 unidade, com a medida guardada', async () => {
    render(<ComModo />)
    await userEvent.setup().type(entradaDoAlmoco(), '1 banana{Enter}')
    expect(almoco().getByLabelText('Gramas de Banana, prata, crua')).toHaveValue('75')
    expect(almoco().getByRole('combobox', { name: 'Medida de Banana, prata, crua' })).toHaveValue('unidade')
  })
})

describe('"+ Nova medida…" na linha do plano (spec alimentos-e-gramaturas, D-387)', () => {
  it('CA-1159: cria a medida ali, e ela fica escolhida no item', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), '100 feijao carioca cozido{Enter}')
    await usuario.selectOptions(almoco().getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' }), '+ Nova medida…')
    const janela = within(screen.getByRole('dialog', { name: 'Nova medida' }))
    await usuario.type(janela.getByLabelText('Nome da medida'), 'cumbuca da casa')
    await usuario.type(janela.getByLabelText('Peso'), '180')
    await usuario.click(janela.getByRole('button', { name: 'Salvar medida' }))
    expect(screen.queryByRole('dialog', { name: 'Nova medida' })).not.toBeInTheDocument()
    expect(almoco().getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' })).toHaveValue('cumbuca da casa')
    expect(almoco().getByText(/cumbuca da casa · 180 g · sua/)).toBeInTheDocument()
    registrarMedidasProprias([])
  })

  it('CA-1230: na entrada rápida, "meia xícara de aveia" sem a xícara abre "Nova medida" com o nome escrito e põe a aveia nela', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'meia xícara de aveia')
    await usuario.click(almoco().getByRole('button', { name: 'Nova medida “xícara de chá” para Aveia, flocos, crua' }))
    const janela = within(screen.getByRole('dialog', { name: 'Nova medida' }))
    expect(janela.getByLabelText('Nome da medida')).toHaveValue('xícara de chá')
    await usuario.type(janela.getByLabelText('Peso'), '80')
    await usuario.click(janela.getByRole('button', { name: 'Salvar medida' }))
    expect(almoco().getByLabelText('Gramas de Aveia, flocos, crua')).toHaveValue('40')
    expect(almoco().getByRole('combobox', { name: 'Medida de Aveia, flocos, crua' })).toHaveValue('xícara de chá')
    expect(entradaDoAlmoco()).toHaveValue('')
    registrarMedidasProprias([])
  })

  it('CA-1234: o alimento próprio também ganha "+ Nova medida…", gravada no cadastro dele (publicação 2)', async () => {
    const granola: Produto = {
      id: 900_001,
      codigoBarras: '',
      nome: 'Granola',
      marca: '',
      porcaoG: 40,
      medidaCaseira: '',
      porPorcao: { energia_kcal: 170, carboidrato_g: 26, proteina_g: 4, lipideos_g: 5.6 },
      criadoEm: '2026-10-22T10:00:00.000Z',
    }
    localStorage.setItem('metanutri:produtos', JSON.stringify([granola]))
    registrarProdutos([produtoComoAlimento(granola)])
    const plano = criarPlanoPadrao(ids)
    const almocoPadrao = plano.refeicoes[2]
    if (!almocoPadrao) throw new Error('sem almoço')
    const usuario = montar({
      ...plano,
      refeicoes: plano.refeicoes.map((r) => (r.id === almocoPadrao.id ? { ...r, opcoes: { ...r.opcoes, principal: [{ id: 'g', alimentoId: 900_001, gramas: 40 }] } } : r)),
    })
    expect(almoco().getByText(/^Sem medida caseira cadastrada\. Crie a sua\.$/)).toBeInTheDocument()
    await usuario.selectOptions(almoco().getByRole('combobox', { name: 'Medida de Granola' }), '+ Nova medida…')
    const janela = within(screen.getByRole('dialog', { name: 'Nova medida' }))
    await usuario.type(janela.getByLabelText('Nome da medida'), 'xícara de chá')
    await usuario.type(janela.getByLabelText('Peso'), '80')
    await usuario.click(janela.getByRole('button', { name: 'Salvar medida' }))
    expect(almoco().getByRole('combobox', { name: 'Medida de Granola' })).toHaveValue('xícara de chá')
    // Publicação 2 (D-383): todo aparelho já preserva os campos novos, então a medida mora no cadastro do alimento.
    expect(JSON.parse(localStorage.getItem('metanutri:produtos') ?? '[]')).toMatchObject([{ id: 900_001, medidas: [{ nome: 'xícara de chá', gramas: 80 }] }])
    expect(localStorage.getItem('metanutri:medidas-proprias')).toBeNull()
    registrarMedidasProprias([])
    registrarProdutos([])
  })
})
