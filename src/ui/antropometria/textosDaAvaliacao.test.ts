// Os textos da vista Avaliação, puros (spec antropometria-telas, D-1407 a D-1421).
import { comUnidade, faixaEmKg, fraseDoImcAlvo, opcoesDaOrigem, textoDaFalta, textoDoErro, textoDosLados } from './textosDaAvaliacao.ts'

describe('os textos de peso e estatura (spec antropometria-telas, D-1407 a D-1409)', () => {
  it('comUnidade: as casas do motor, a unidade e "—" sem valor (nunca 0)', () => {
    expect(comUnidade(26.584, 2, 'kg/m²')).toBe('26,58 kg/m²')
    expect(comUnidade(29.49, 1, '%')).toBe('29,5%')
    expect(comUnidade(10.12, 1, '')).toBe('10,1')
    expect(comUnidade(null, 1, 'kg')).toBe('—')
  })

  it('CA-2432: a frase do que falta', () => {
    expect(textoDaFalta([{ campo: 'circunferenciaCinturaCm', nome: 'a cintura' }])).toBe('Falta a cintura')
    expect(textoDaFalta([{ campo: 'pesoKg', nome: 'o peso' }, { campo: 'estaturaCm', nome: 'a estatura' }])).toBe('Faltam o peso e a estatura')
    expect(
      textoDaFalta([
        { campo: 'composicao.dobras.coxa', nome: 'a dobra coxa' },
        { campo: 'composicao.dobras.peitoral', nome: 'a dobra peitoral' },
        { campo: 'composicao.dobras.abdominal', nome: 'a dobra abdominal' },
      ]),
    ).toBe('Faltam 3 dobras')
    expect(textoDaFalta([])).toBe('')
  })

  it('D-1407 e CB-1411: a origem com o sexo da ficha; sem sexo, "pela pessoa"', () => {
    expect(opcoesDaOrigem('F').map((o) => o.rotulo)).toEqual(['Aferidos na consulta', 'Informados pela paciente', 'Estimados'])
    expect(opcoesDaOrigem('M')[1]?.rotulo).toBe('Informados pelo paciente')
    expect(opcoesDaOrigem(null)[1]?.rotulo).toBe('Informados pela pessoa')
  })

  it('D-1408: o erro e o lado de cada estimativa', () => {
    expect(textoDoErro({ valor: 6, unidade: 'cm', descricao: '' })).toBe('± 6 cm')
    expect(textoDoErro({ valor: 2.2, unidade: '%', descricao: '' })).toBe('erro médio de 2,2%')
    expect(textoDoErro({ valor: 6, unidade: '%', descricao: '' })).toBe('erro médio de 6%')
    expect(textoDoErro(null)).toBeNull()
    expect(textoDosLados([{ medida: 'braço', lado: 'esquerdo' }, { medida: 'panturrilha', lado: 'esquerdo' }])).toBe('lado esquerdo')
    expect(textoDosLados([{ medida: 'braço', lado: 'direito' }, { medida: 'panturrilha', lado: 'esquerdo' }])).toBe('braço direito, panturrilha esquerda')
    expect(textoDosLados([])).toBeNull()
  })

  it('D-1409 e D-1463: de onde vem o IMC-alvo, e a faixa em kg', () => {
    expect(fraseDoImcAlvo('compleicao', 'media')).toBe('Padrão da compleição média. Edite se quiser.')
    expect(fraseDoImcAlvo('compleicao', null)).toBe('Padrão da compleição média. Edite se quiser.')
    expect(fraseDoImcAlvo('compleicao', 'grande')).toBe('Padrão da compleição grande. Edite se quiser.')
    expect(fraseDoImcAlvo('padrao-do-idoso', null)).toBe('Padrão do idoso. Edite se quiser.')
    expect(fraseDoImcAlvo('digitado', 'media')).toBe('Definido por você.')
    expect(faixaEmKg(53.465, 72.2211)).toBe('53,5 a 72,2 kg')
  })
})
