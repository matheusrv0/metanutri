// "Resultado": a tabela Real | Recomendação | Situação com o selo (spec antropometria-telas, D-1416 e D-1417).
import { screen, within } from '@testing-library/react'
import { abrirAvaliacao, casoDe } from './apoioDaVista.test-utils.tsx'

/** A paciente de exemplo do protótipo (CA-2430). */
const RENATA = casoDe({
  sexo: 'F',
  idadeAnos: 34,
  pesoKg: 71.5,
  estaturaCm: 164,
  circunferenciaCinturaCm: 84,
  circunferenciaPanturrilhaCm: 37,
  medidasCorporais: { pontoDaCintura: 'ponto-medio', quadrilCm: 104, pescocoCm: 33.8, bracoRelaxadoDireitoCm: 31, punhoCm: 15.4 },
  composicao: { protocolo: 'jackson-pollock-7' },
  dobras: { tricipital: 24, subescapular: 20.5, peitoral: 12, axilarMedia: 16, suprailiacaAnt: 21, abdominal: 30, coxa: 34.5 },
})

const tabela = () => within(screen.getByRole('table', { name: 'Resultado da avaliação' }))
/** A linha da tabela pelo nome do indicador (o começo do cabeçalho da linha). */
const linhaDe = (nome: string) => {
  const cabeca = tabela()
    .getAllByRole('rowheader')
    .find((c) => c.firstElementChild?.firstElementChild?.textContent === nome)
  const linha = cabeca?.closest('[role="row"]')
  if (!(linha instanceof HTMLElement)) throw new Error(`sem a linha ${nome}`)
  return linha
}
const celulas = (nome: string) => within(linhaDe(nome)).getAllByRole('cell').map((c) => c.textContent)

describe('o resultado (spec antropometria-telas, CA-2430 a CA-2435)', () => {
  it('CA-2430: os quatro grupos e as linhas da paciente de exemplo, nas casas e com os rótulos do motor', () => {
    abrirAvaliacao(RENATA)
    const grupos = tabela()
      .getAllByRole('rowgroup')
      .slice(1)
      .map((g) => within(g).getAllByRole('cell')[0]?.textContent)
    expect(grupos).toEqual(['Peso e composição', 'Gordura central', 'Braço · Frisancho', 'Outras'])
    expect(celulas('IMC')).toEqual(['26,58 kg/m²', '18,50 – 24,99 kg/m²', 'Sobrepeso'])
    expect(celulas('Gordura corporal')[0]).toBe('29,5%')
    expect(celulas('Gordura corporal')[2]).toBe('Saudável')
    expect(within(linhaDe('Cintura')).getByText('Ponto médio (OMS)')).toBeInTheDocument()
  })

  it('CA-2431: o selo leva o tom do nível', () => {
    abrirAvaliacao(RENATA)
    expect(within(linhaDe('IMC')).getByText('Sobrepeso')).toHaveAttribute('data-tom', 'baixo')
    expect(within(linhaDe('Gordura corporal')).getByText('Saudável')).toHaveAttribute('data-tom', 'ok')
    expect(within(linhaDe('Compleição')).getByText('Média')).toHaveAttribute('data-tom', 'neutro')
  })

  it('CA-2432: sem a cintura, "—" e "Falta a cintura" no lugar do selo', () => {
    abrirAvaliacao({ ...RENATA, circunferenciaCinturaCm: null })
    expect(celulas('Cintura')).toEqual(['—', '—', 'Falta a cintura'])
    expect(within(linhaDe('Cintura')).queryByText('Falta a cintura')?.getAttribute('data-tom')).toBeFalsy()
  })

  it('CA-2433: o "ⓘ" da gordura abre a citação completa, os avisos e a densidade; tocado de novo, fecha', async () => {
    const { usuario } = abrirAvaliacao(RENATA)
    const info = within(linhaDe('Gordura corporal')).getByRole('button', { name: 'Fonte: Gordura corporal' })
    await usuario.click(info)
    expect(info).toHaveAttribute('aria-expanded', 'true')
    const painel = document.getElementById(info.getAttribute('aria-controls') ?? '')
    expect(painel?.textContent).toMatch(/^Fonte: Gallagher D/)
    expect(painel?.textContent).toMatch(/Densidade corporal: 1,0\d{4} g\/ml/)
    await usuario.click(info)
    expect(info).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/^Fonte: Gallagher D/)).not.toBeInTheDocument()
  })

  it('CA-2434: o cabeçalho diz de onde vem a gordura, e o detalhe da linha o método e a conversão', () => {
    abrirAvaliacao(RENATA)
    const cartao = within(screen.getByRole('region', { name: 'Resultado' }))
    expect(cartao.getByText('Gordura por Jackson & Pollock, 7 dobras')).toBeInTheDocument()
    expect(within(linhaDe('Gordura corporal')).getByText('Jackson & Pollock, 7 dobras · Siri')).toBeInTheDocument()
  })

  it('CA-2434: pela bioimpedância, "Gordura pela bioimpedância"', () => {
    abrirAvaliacao(
      casoDe({ sexo: 'F', idadeAnos: 34, pesoKg: 71.5, estaturaCm: 164, composicao: { protocolo: 'jackson-pollock-7', bioimpedancia: { gorduraPct: 31, massaMagraKg: null, aguaPct: null, aparelho: 'InBody' } } }),
    )
    expect(within(screen.getByRole('region', { name: 'Resultado' })).getByText('Gordura pela bioimpedância')).toBeInTheDocument()
    expect(celulas('Gordura corporal')[0]).toBe('31,0%')
  })

  it('CA-2435: no adolescente de 15 anos, o IMC é o escore-z e o grupo "Gordura central" some', () => {
    abrirAvaliacao({ ...RENATA, idadeAnos: 15 })
    expect(celulas('IMC para a idade')[0]).toMatch(/^escore-z [+−]\d,\d{2}$/)
    expect(tabela().queryByText('Gordura central')).not.toBeInTheDocument()
    expect(tabela().queryByText('Compleição')).not.toBeInTheDocument()
  })

  it('CA-2410: peso e estatura digitados atualizam o resultado', async () => {
    const { usuario } = abrirAvaliacao({ ...RENATA, pesoKg: null, estaturaCm: null })
    expect(celulas('IMC')).toEqual(['—', '—', 'Faltam o peso e a estatura'])
    await usuario.type(screen.getByRole('textbox', { name: 'Peso' }), '71,5')
    await usuario.type(screen.getByRole('textbox', { name: 'Estatura' }), '164')
    expect(celulas('IMC')[0]).toBe('26,58 kg/m²')
  })

  it('CA-2424: o menino de 12 anos com Slaughter calcula com "Púbere" e "Branco": 15,8%', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ sexo: 'M', idadeAnos: 12, pesoKg: 40, estaturaCm: 150, composicao: { protocolo: 'slaughter-triceps-subescapular' }, dobras: { tricipital: 10, subescapular: 8 } }))
    expect(celulas('Gordura corporal')[2]).toMatch(/^Faltam a maturação sexual \(estágio de Tanner\) e o grupo do estudo \(branco ou negro\)\./)
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Maturação sexual' }), 'pubere')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Grupo do estudo' }), 'branco')
    expect(celulas('Gordura corporal')[0]).toBe('15,8%')
  })
})

describe('os casos de borda do resultado (spec antropometria-telas, CB-1402 a CB-1406 e CB-1411)', () => {
  it('CB-1402: a criança de 6 anos com JP 7 mostra a recusa de Lohman; sem cintura nem compleição', () => {
    abrirAvaliacao({ ...RENATA, idadeAnos: 6, pesoKg: 22, estaturaCm: 118 })
    expect(celulas('Gordura corporal')[2]).toMatch(/^A conversão de Lohman começa aos 7 anos/)
    expect(tabela().queryByText('Gordura central')).not.toBeInTheDocument()
  })

  it('CB-1403: o idoso de 85 anos tem o IMC do SISVAN', () => {
    abrirAvaliacao({ ...RENATA, idadeAnos: 85 })
    expect(celulas('IMC')[1]).toBe('> 22,0 e < 27,0 kg/m²')
  })

  it('CB-1404: na gestante, só o IMC pré-gestacional; nenhuma linha de dobras', () => {
    abrirAvaliacao({ ...RENATA, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 65 } })
    expect(linhaDe('IMC pré-gestacional')).toBeInTheDocument()
    expect(tabela().queryByText('Gordura corporal')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Gordura por/)).not.toBeInTheDocument()
  })

  it('CB-1406: a soma acima do pico, com a bioimpedância, mostra o valor do aparelho e o aviso no "ⓘ"', async () => {
    const recusada = casoDe({
      ...RENATA,
      medidasCorporais: RENATA.medidasCorporais ?? {},
      composicao: { protocolo: 'petroski', bioimpedancia: { gorduraPct: 35, massaMagraKg: null, aguaPct: null, aparelho: '' } },
      dobras: { subescapular: 45, suprailiacaMed: 45, coxa: 50 },
    })
    const { usuario } = abrirAvaliacao(recusada)
    expect(celulas('Gordura corporal')[0]).toBe('35,0%')
    await usuario.click(within(linhaDe('Gordura corporal')).getByRole('button', { name: 'Fonte: Gordura corporal' }))
    expect(screen.getByText(/^As dobras não calcularam \(Petroski só vale até 115,5 mm/)).toBeInTheDocument()
  })

  it('CB-1411: sem sexo, as linhas por sexo dizem que falta o sexo', () => {
    abrirAvaliacao({ ...RENATA, sexo: null })
    expect(celulas('Gordura corporal')[2]).toMatch(/^Falta o sexo/)
    expect(celulas('Cintura')[2]).toMatch(/o sexo/)
  })
})
