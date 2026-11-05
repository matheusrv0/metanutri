// Dobras cutâneas (spec antropometria-telas, D-1412 a D-1414, D-1464 a D-1466).
import { screen, within } from '@testing-library/react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { PROTOCOLOS_DE_DOBRAS } from '@/domain/protocolosDeDobras.ts'
import { abrirAvaliacao, casoDe } from './apoioDaVista.test-utils.tsx'
import { dobrasNaTela, fraseDasDobras, sobreOProtocolo } from './textosDaAvaliacao.ts'

const vazias = criarCasoVazio('x').composicao.dobras
const cartao = () => within(screen.getByRole('region', { name: 'Dobras cutâneas' }))
const rotuloDe = (campo: HTMLElement) => (campo instanceof HTMLInputElement ? (campo.labels?.[0]?.textContent ?? '') : '')
const marcadas = () =>
  cartao()
    .getAllByRole('textbox')
    .map(rotuloDe)
    .filter((r) => r.includes('(usada no protocolo)'))
    .map((r) => r.replace(' (usada no protocolo)', ''))

describe('as dobras na tela (spec antropometria-telas, CA-2420 a CA-2426)', () => {
  it('CA-2420: os 8 protocolos do motor, na ordem e com o nome do motor; Slaughter desligado aos 34 anos', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 34 }))
    const opcoes = within(cartao().getByRole('combobox', { name: 'Protocolo' })).getAllByRole('option') as HTMLOptionElement[]
    expect(opcoes.map((o) => o.textContent)).toEqual(PROTOCOLOS_DE_DOBRAS.map((p) => p.nome))
    expect(opcoes.filter((o) => o.disabled).map((o) => o.value)).toEqual(['slaughter-triceps-subescapular', 'slaughter-triceps-panturrilha'])
  })

  it('CA-2420: aos 12 anos, Slaughter ligado; sem idade também (CB-1401)', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 12 }))
    expect((within(cartao().getByRole('combobox', { name: 'Protocolo' })).getAllByRole('option') as HTMLOptionElement[]).some((o) => o.disabled)).toBe(false)
  })

  it('CA-2421: Jackson & Pollock 7 dobras na mulher: as 7 marcadas, a linha do protocolo e quantas faltam', async () => {
    const { usuario } = abrirAvaliacao(
      casoDe({ sexo: 'F', idadeAnos: 34, composicao: { protocolo: 'jackson-pollock-7' }, dobras: { peitoral: 12, axilarMedia: 16, tricipital: 24, subescapular: 20.5, abdominal: 30 } }),
    )
    expect(marcadas()).toEqual(['Tríceps', 'Subescapular', 'Peitoral', 'Axilar média', 'Suprailíaca · axilar anterior', 'Abdominal', 'Coxa'])
    expect(cartao().getByRole('textbox', { name: 'Bíceps' }).className).toMatch(/text-muted-foreground/)
    expect(cartao().getByText('Jackson, Pollock e Ward, 1980 · mulheres dos EUA, de 18 a 55 anos · conversão de Siri')).toBeInTheDocument()
    expect(cartao().getByText('Faltam 2 das 7 dobras marcadas para calcular a gordura.')).toBeInTheDocument()
    await usuario.type(cartao().getByRole('textbox', { name: /^Suprailíaca · axilar anterior/ }), '21')
    expect(cartao().getByText('Falta 1 das 7 dobras marcadas para calcular a gordura.')).toBeInTheDocument()
    await usuario.type(cartao().getByRole('textbox', { name: /^Coxa/ }), '34,5')
    expect(cartao().getByText('As 7 dobras marcadas entram no protocolo. As outras ficam guardadas.')).toBeInTheDocument()
  })

  it('CA-2422: Petroski e Guedes na mulher marcam a suprailíaca da axilar média; a de antes, quando tem valor, vale em Guedes', () => {
    const petroski = dobrasNaTela('petroski', 'F', vazias).filter((d) => d.marcada).map((d) => d.chave)
    expect(petroski).toEqual(['subescapular', 'suprailiacaMed', 'coxa'])
    expect(dobrasNaTela('guedes', 'F', vazias).filter((d) => d.marcada).map((d) => d.chave)).toEqual(['subescapular', 'suprailiacaMed', 'coxa'])
    const antiga = dobrasNaTela('guedes', 'F', { ...vazias, suprailiaca: 18 })
    expect(antiga.filter((d) => d.marcada).map((d) => d.chave)).toEqual(['subescapular', 'suprailiaca', 'coxa'])
    expect(dobrasNaTela('guedes', 'F', vazias).some((d) => d.chave === 'suprailiaca')).toBe(false)
  })

  it('CA-2422: na tela, a suprailíaca de antes aparece só por ter valor, e marcada em Guedes', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 25, composicao: { protocolo: 'guedes' }, dobras: { suprailiaca: 18 } }))
    expect(marcadas()).toEqual(['Subescapular', 'Suprailíaca · linha não informada', 'Coxa'])
    expect(cartao().queryByRole('textbox', { name: 'Supraespinal' })).not.toBeInTheDocument()
  })

  it('CB-1481 (D-1521): JP 3 num plano de antes marca a suprailíaca de linha não informada, a que entra na conta', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 34, pesoKg: 70, estaturaCm: 165, composicao: { protocolo: 'jackson-pollock-3' }, dobras: { tricipital: 20, suprailiaca: 18, coxa: 25 } }))
    expect(marcadas()).toEqual(['Tríceps', 'Suprailíaca · linha não informada', 'Coxa'])
    expect(cartao().getByRole('textbox', { name: 'Suprailíaca · axilar anterior' }).className).toMatch(/text-muted-foreground/)
    expect(cartao().getByText('As 3 dobras marcadas entram no protocolo. As outras ficam guardadas.')).toBeInTheDocument()
  })

  it('D-1521: a marcada é a que entra na conta; sem nenhuma com valor, a da linha do protocolo', () => {
    const marcadasDe = (d: Partial<typeof vazias>) => dobrasNaTela('jackson-pollock-3', 'F', { ...vazias, ...d }).filter((x) => x.marcada).map((x) => x.chave)
    expect(marcadasDe({})).toEqual(['tricipital', 'suprailiacaAnt', 'coxa'])
    expect(marcadasDe({ suprailiaca: 18, suprailiacaAnt: 19 })).toEqual(['tricipital', 'suprailiacaAnt', 'coxa'])
    expect(marcadasDe({ suprailiacaMed: 17 })).toEqual(['tricipital', 'suprailiacaMed', 'coxa'])
  })

  it('CA-2423: homem de 65 anos com Jackson & Pollock 3, fora da população de origem', () => {
    abrirAvaliacao(casoDe({ sexo: 'M', idadeAnos: 65, composicao: { protocolo: 'jackson-pollock-3' } }))
    expect(cartao().getByText('Fora da população de origem: homens dos EUA, de 18 a 61 anos.')).toBeInTheDocument()
  })

  it('CA-2424: menino de 12 anos com Slaughter pede a maturação e o grupo; as escolhas ficam gravadas', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'M', idadeAnos: 12, composicao: { protocolo: 'slaughter-triceps-subescapular' }, dobras: { tricipital: 10, subescapular: 8 } }))
    expect(cartao().getByText('Pedidos quando a soma é de até 35 mm. O grupo é a classificação do estudo e não foi validado para a população brasileira.')).toBeInTheDocument()
    expect(cartao().getByText(/Faltam a maturação sexual e o grupo do estudo para calcular a gordura\.$/)).toBeInTheDocument()
    await usuario.selectOptions(cartao().getByRole('combobox', { name: 'Maturação sexual' }), 'pubere')
    await usuario.selectOptions(cartao().getByRole('combobox', { name: 'Grupo do estudo' }), 'branco')
    expect(gravado().avaliacao).toMatchObject({ maturacao: 'pubere', grupoDoEstudo: 'branco' })
    expect(cartao().getByText('As 2 dobras marcadas entram no protocolo. As outras ficam guardadas.')).toBeInTheDocument()
  })

  it('CA-2424: na menina, com outro protocolo, não pede a maturação', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 12, composicao: { protocolo: 'slaughter-triceps-subescapular' } }))
    expect(cartao().queryByRole('combobox', { name: 'Maturação sexual' })).not.toBeInTheDocument()
  })

  it('CA-2425: o adipômetro fica gravado', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 34 }))
    await usuario.selectOptions(cartao().getByRole('combobox', { name: 'Adipômetro' }), 'Harpenden')
    expect(gravado().avaliacao.adipometro).toBe('harpenden')
  })

  it('CA-2426: a dobra digitada grava no plano; trocar de protocolo não apaga nenhuma', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 34, composicao: { protocolo: 'jackson-pollock-7' } }))
    await usuario.type(cartao().getByRole('textbox', { name: 'Bíceps' }), '10,5')
    await usuario.type(cartao().getByRole('textbox', { name: /^Panturrilha medial/ }), '19')
    expect(gravado().composicao.dobras).toMatchObject({ bicipital: 10.5, panturrilhaMedial: 19 })
    await usuario.selectOptions(cartao().getByRole('combobox', { name: 'Protocolo' }), 'durnin-womersley')
    expect(gravado().composicao.protocolo).toBe('durnin-womersley')
    expect(gravado().composicao.dobras).toMatchObject({ bicipital: 10.5, panturrilhaMedial: 19 })
    expect(marcadas()).toEqual(['Tríceps', 'Bíceps', 'Subescapular', 'Suprailíaca · axilar média'])
  })

  it('D-1465 e D-1464: a ajuda do bíceps segue o protocolo; a da peitoral, o sexo', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ sexo: 'M', idadeAnos: 34, composicao: { protocolo: 'durnin-womersley' } }))
    await usuario.click(cartao().getByRole('button', { name: 'Como medir: Bíceps' }))
    expect(within(screen.getByRole('dialog')).getByText('Bíceps · Durnin & Womersley')).toBeInTheDocument()
    await usuario.click(cartao().getByRole('button', { name: 'Como medir: Peitoral' }))
    expect(within(screen.getByRole('dialog')).getByText('Diagonal, na metade da distância entre a linha axilar anterior e o mamilo.')).toBeInTheDocument()
  })
})

describe('os textos das dobras (spec antropometria-telas, D-1412 e D-1466)', () => {
  it('a linha do protocolo: a conversão pela idade, e a gordura direta', () => {
    expect(sobreOProtocolo('jackson-pollock-7', 'F', 15)?.linha).toMatch(/· conversão de Lohman$/)
    expect(sobreOProtocolo('jackson-pollock-7', 'F', null)?.linha).toMatch(/· conversão de Lohman até 19 anos e de Siri depois$/)
    expect(sobreOProtocolo('jackson-pollock-3', 'F', 15)?.linha).toMatch(/· conversão de Siri$/)
    expect(sobreOProtocolo('faulkner-4', 'M', 30)).toEqual({
      linha: 'Faulkner, 1968 (Yuhasz) · amostra de origem desconhecida · dá a gordura direto',
      nota: 'Amostra de origem desconhecida; só há indicação para homens jovens treinados. A 4ª dobra é a abdominal ("umbilical" no original).',
      fora: null,
    })
    expect(sobreOProtocolo('petroski', 'F', 34)?.nota).toBe('Usa também o peso e a estatura.')
    expect(sobreOProtocolo('jackson-pollock-7', 'F', 45)?.nota).toBe('Os autores pedem cautela acima de 40 anos.')
    expect(sobreOProtocolo('jackson-pollock-7', null, 30)).toBeNull()
  })

  it('a frase das dobras marcadas', () => {
    expect(fraseDasDobras(7, 0)).toBe('As 7 dobras marcadas entram no protocolo. As outras ficam guardadas.')
    expect(fraseDasDobras(7, 1)).toBe('Falta 1 das 7 dobras marcadas para calcular a gordura.')
    expect(fraseDasDobras(3, 2)).toBe('Faltam 2 das 3 dobras marcadas para calcular a gordura.')
  })
})
