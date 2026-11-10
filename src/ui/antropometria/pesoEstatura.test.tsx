// "Peso e estatura", as estimativas e o peso ideal (spec antropometria-telas, D-1407 a D-1409, D-1462 e D-1463).
import { screen, within } from '@testing-library/react'
import { abrirAvaliacao, casoDe } from './apoioDaVista.test-utils.tsx'
import { RENATA } from './apoioDosTestes.test-utils.tsx'

const regiao = (nome: string) => screen.getByRole('region', { name: nome })
/** A linha de um resultado do painel: o nome, o valor e o detalhe embaixo. */
const linha = (painel: HTMLElement, nome: string) => {
  const rotulo = within(painel).getByText(nome)
  const caixa = rotulo.parentElement
  if (!caixa) throw new Error(nome)
  return caixa
}

describe('peso e estatura (spec antropometria-telas, CA-2410)', () => {
  it('CA-2410: peso e estatura digitados vão para o plano, nos campos da etapa 1', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ pacienteId: 'renata' }), [RENATA])
    await usuario.type(screen.getByRole('textbox', { name: 'Peso' }), '71,5')
    await usuario.type(screen.getByRole('textbox', { name: 'Estatura' }), '164')
    expect(gravado().pesoKg).toBe(71.5)
    expect(gravado().estaturaCm).toBe(164)
  })

  it('CA-2410: o plano antigo mostra "Origem não informada"; a origem escolhida fica gravada, pelo sexo da ficha', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ pacienteId: 'renata' }), [RENATA])
    const origem = screen.getByRole('combobox', { name: 'Origem do peso e da estatura' })
    expect(origem).toHaveDisplayValue('Origem não informada')
    expect(within(origem).getByRole('option', { name: 'Informados pela paciente' })).toBeInTheDocument()
    await usuario.selectOptions(origem, 'Aferidos na consulta')
    expect(gravado().avaliacao.origemPesoEstatura).toBe('aferidas')
  })

  it('CB-1411: sem sexo, a origem diz "pela pessoa"', () => {
    abrirAvaliacao(casoDe({}))
    expect(screen.getByRole('option', { name: 'Informados pela pessoa' })).toBeInTheDocument()
  })

  it('CB-1409: "71.5" vale 71,5; texto que não é número fica no campo e não vira dado', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({}))
    const peso = screen.getByRole('textbox', { name: 'Peso' })
    await usuario.type(peso, '71.5')
    expect(gravado().pesoKg).toBe(71.5)
    await usuario.clear(peso)
    await usuario.type(peso, 'abc')
    expect(peso).toHaveValue('abc')
    expect(peso).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Use só números, com vírgula.')).toBeInTheDocument()
    expect(gravado().pesoKg).toBeNull()
  })
})

describe('as faixas da etapa 1 na tela nova (spec antropometria-telas, D-1522 a D-1525; revisão r1, M2 e B3)', () => {
  const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ')

  it('CB-1483: peso 9999 e estatura 1,65 ficam no campo com a frase da etapa 1 e não viram dado; o IMC diz o que falta', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ pacienteId: 'renata', pesoKg: 70, estaturaCm: 165 }), [RENATA])
    const peso = screen.getByRole('textbox', { name: 'Peso' })
    await usuario.clear(peso)
    await usuario.type(peso, '9999')
    expect(peso).toHaveValue('9999')
    expect(peso).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Peso deve estar entre 5 e 350 kg.')).toBeInTheDocument()
    expect(gravado().pesoKg).toBeNull()
    const estatura = screen.getByRole('textbox', { name: 'Estatura' })
    await usuario.clear(estatura)
    await usuario.type(estatura, '1,65')
    expect(estatura).toHaveValue('1,65')
    expect(screen.getByText('Estatura deve estar entre 45 e 250 cm.')).toBeInTheDocument()
    expect(gravado().estaturaCm).toBeNull()
    expect(texto()).not.toMatch(/3\.672|257\.116|Obesidade grau III/)
    expect(texto()).toContain('Faltam o peso e a estatura')
    // De volta à faixa, o número vira dado e a frase sai.
    await usuario.clear(peso)
    await usuario.type(peso, '70')
    expect(gravado().pesoKg).toBe(70)
    expect(screen.queryByText('Peso deve estar entre 5 e 350 kg.')).not.toBeInTheDocument()
  })

  it('CB-1484: peso 9999 gravado pela etapa 1: o campo mostra o número com a frase; resultado e gasto ficam sem peso', () => {
    abrirAvaliacao(casoDe({ pacienteId: 'renata', pesoKg: 9999, estaturaCm: 165, avaliacao: { perfil: 'sedentario' } }), [RENATA])
    const peso = screen.getByRole('textbox', { name: 'Peso' })
    expect(peso).toHaveValue('9999')
    expect(peso).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Peso deve estar entre 5 e 350 kg.')).toBeInTheDocument()
    expect(texto()).not.toMatch(/3\.672|Obesidade grau III/)
    expect(texto()).toContain('Falta o peso')
  })

  it('CB-1485: "0" e "-5" no peso dão a frase da faixa; numa dobra, "Use um número maior que zero."; nada vira dado', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ pacienteId: 'renata', composicao: { protocolo: 'jackson-pollock-3' } }), [RENATA])
    const peso = screen.getByRole('textbox', { name: 'Peso' })
    await usuario.type(peso, '0')
    expect(screen.getByText('Peso deve estar entre 5 e 350 kg.')).toBeInTheDocument()
    expect(gravado().pesoKg).toBeNull()
    await usuario.clear(peso)
    await usuario.type(peso, '-5')
    expect(peso).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Peso deve estar entre 5 e 350 kg.')).toBeInTheDocument()
    expect(gravado().pesoKg).toBeNull()
    const triceps = screen.getByRole('textbox', { name: /^Tríceps/ })
    await usuario.type(triceps, '0')
    expect(triceps).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Use um número maior que zero.')).toBeInTheDocument()
    expect(gravado().composicao.dobras.tricipital).toBeNull()
    await usuario.clear(triceps)
    await usuario.type(triceps, '20,5')
    expect(gravado().composicao.dobras.tricipital).toBe(20.5)
    expect(screen.queryByText('Use um número maior que zero.')).not.toBeInTheDocument()
  })
})

describe('estimar altura e peso atual (spec antropometria-telas, CA-2411 a CA-2413)', () => {
  const IDOSO = casoDe({
    sexo: 'M',
    idadeAnos: 70,
    pesoKg: 80,
    estaturaCm: 170,
    circunferenciaPanturrilhaCm: 33,
    medidasCorporais: { alturaDoJoelhoCm: 52, bracoRelaxadoDireitoCm: 28, abdomenCm: 95 },
    dobras: { subescapular: 15 },
  })

  it('CA-2411: no homem de 70 anos, Chumlea 1985 e 1988, com a fonte e o lado, e o "Medidos hoje"', async () => {
    const { usuario } = abrirAvaliacao(IDOSO)
    const botao = screen.getByRole('button', { name: 'Estimar altura e peso atual' })
    await usuario.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const painel = regiao('Estimar altura e peso atual')
    const altura = linha(painel, 'Altura estimada')
    expect(within(altura).getByText('166,4 cm')).toBeInTheDocument()
    expect(within(altura).getByText(/± 6 cm · Chumlea et al\., 1985/)).toBeInTheDocument()
    const peso = linha(painel, 'Peso estimado')
    expect(within(peso).getByText('65,0 kg')).toBeInTheDocument()
    expect(within(peso).getByText('Chumlea et al., 1988 · lado direito')).toBeInTheDocument()
    expect(within(linha(painel, 'Medidos hoje')).getByText('170,0 cm · 80,0 kg')).toBeInTheDocument()
    // D-1462: no idoso, o painel pede a altura do joelho e o lado direito.
    expect(within(painel).getByRole('textbox', { name: 'Altura do joelho' })).toHaveValue('52')
    expect(within(painel).getByRole('textbox', { name: 'Braço relaxado direito' })).toHaveValue('28')
  })

  it('CA-2412: no adulto, Rabito VII e V pelo lado esquerdo; "Usar os estimados" grava os dois e a origem', async () => {
    const { usuario, gravado } = abrirAvaliacao(
      casoDe({ sexo: 'M', idadeAnos: 40, medidasCorporais: { semienvergaduraCm: 85, bracoRelaxadoEsquerdoCm: 30, panturrilhaEsquerdaCm: 36, abdomenCm: 95 } }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Estimar altura e peso atual' }))
    const painel = regiao('Estimar altura e peso atual')
    expect(within(painel).queryByRole('textbox', { name: 'Altura do joelho' })).not.toBeInTheDocument()
    expect(within(linha(painel, 'Altura estimada')).getByText('167,4 cm')).toBeInTheDocument()
    expect(within(linha(painel, 'Altura estimada')).getByText(/Rabito et al\., 2006/)).toBeInTheDocument()
    expect(within(linha(painel, 'Peso estimado')).getByText('74,3 kg')).toBeInTheDocument()
    expect(within(linha(painel, 'Peso estimado')).getByText(/lado esquerdo/)).toBeInTheDocument()
    await usuario.click(within(painel).getByRole('button', { name: 'Usar os estimados' }))
    expect(gravado().estaturaCm).toBe(167.4)
    expect(gravado().pesoKg).toBe(74.3)
    expect(gravado().avaliacao.origemPesoEstatura).toBe('estimadas')
    expect(screen.getByRole('combobox', { name: 'Origem do peso e da estatura' })).toHaveDisplayValue('Estimados')
    expect(screen.queryByRole('region', { name: 'Estimar altura e peso atual' })).not.toBeInTheDocument()
  })

  it('CA-2413: sem semienvergadura, a altura diz o que falta e "Usar os estimados" fica desligado', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 40, medidasCorporais: { bracoRelaxadoEsquerdoCm: 30, panturrilhaEsquerdaCm: 36, abdomenCm: 95 } }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar altura e peso atual' }))
    const painel = regiao('Estimar altura e peso atual')
    expect(within(linha(painel, 'Altura estimada')).getByText('Falta a semienvergadura')).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Usar os estimados' })).toBeDisabled()
  })

  it('o campo do painel grava no campo do plano que as circunferências usam', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 40 }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar altura e peso atual' }))
    await usuario.type(within(regiao('Estimar altura e peso atual')).getByRole('textbox', { name: 'Panturrilha esquerda' }), '36')
    expect(gravado().medidasCorporais.panturrilhaEsquerdaCm).toBe(36)
  })

  it('D-1408: abaixo de 18 anos ou na gestação, o painel diz para quem as estimativas valem', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 15 }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar altura e peso atual' }))
    expect(within(regiao('Estimar altura e peso atual')).getByText('As estimativas valem de 18 anos em diante, fora da gestação.')).toBeInTheDocument()
  })
})

describe('estimar peso ideal (spec antropometria-telas, CA-2414 e CA-2415)', () => {
  it('CA-2414: compleição média, IMC-alvo padrão de 21,75, peso ideal e faixa; o IMC-alvo trocado fica gravado', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 30, estaturaCm: 170, medidasCorporais: { punhoCm: 16.8 } }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar peso ideal' }))
    const painel = regiao('Estimar peso ideal')
    expect(within(painel).getByText('Média')).toBeInTheDocument()
    const alvo = within(painel).getByRole('textbox', { name: 'IMC-alvo' })
    expect(alvo).toHaveAttribute('placeholder', '21,75')
    expect(within(painel).getByText('Padrão da compleição média. Edite se quiser.')).toBeInTheDocument()
    expect(within(linha(painel, 'Peso ideal')).getByText('62,9 kg')).toBeInTheDocument()
    expect(within(linha(painel, 'Faixa de eutrofia')).getByText('53,5 a 72,2 kg')).toBeInTheDocument()
    await usuario.type(alvo, '23')
    expect(within(linha(painel, 'Peso ideal')).getByText('66,5 kg')).toBeInTheDocument()
    expect(within(painel).getByText('Definido por você.')).toBeInTheDocument()
    expect(gravado().avaliacao.imcAlvo).toBe(23)
    // D-1463: apagado, volta ao padrão.
    await usuario.clear(alvo)
    expect(gravado().avaliacao.imcAlvo).toBeNull()
    expect(within(linha(painel, 'Peso ideal')).getByText('62,9 kg')).toBeInTheDocument()
  })

  it('CA-2415: com 100 kg, o peso ajustado é 79,2 kg; com 70 kg, não se aplica e diz o IMC', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 30, estaturaCm: 170, pesoKg: 100 }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar peso ideal' }))
    expect(within(linha(regiao('Estimar peso ideal'), 'Peso ajustado')).getByText('79,2 kg')).toBeInTheDocument()
    const peso = screen.getByRole('textbox', { name: 'Peso' })
    await usuario.clear(peso)
    await usuario.type(peso, '70')
    const ajustado = linha(regiao('Estimar peso ideal'), 'Peso ajustado')
    expect(within(ajustado).getByText('Não se aplica')).toBeInTheDocument()
    expect(within(ajustado).getByText('Só com IMC de 30 ou mais. O IMC é 24,22.')).toBeInTheDocument()
  })

  it('D-1409: abaixo de 20 anos, o painel diz para quem o peso ideal vale; os dois painéis não abrem juntos', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 19, estaturaCm: 160 }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar altura e peso atual' }))
    await usuario.click(screen.getByRole('button', { name: 'Estimar peso ideal' }))
    expect(screen.queryByRole('region', { name: 'Estimar altura e peso atual' })).not.toBeInTheDocument()
    expect(within(regiao('Estimar peso ideal')).getByText('O peso ideal vale de 20 anos em diante, fora da gestação.')).toBeInTheDocument()
  })
})
