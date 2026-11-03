import { MEDIDAS_CORPORAIS_VAZIAS, completarCasoLido, criarCasoVazio, lerNumero, modoDeQuantidade, validarCaso } from './caso.ts'
import type { Caso } from './tipos.ts'

describe('quantidades para o paciente (spec conduta-da-nutricionista, D-297)', () => {
  it('CA-1120 (spec alimentos-e-gramaturas, D-376): plano novo vem com "Medida e gramas"', () => {
    expect(criarCasoVazio('c1').quantidades).toBe('medida-e-gramas')
    expect(modoDeQuantidade({ quantidades: 'medida-e-gramas' })).toBe('medida-e-gramas')
  })

  it('CB-290 e CB-291: sem o campo, ou com valor estranho, vale "Medida caseira"', () => {
    expect(modoDeQuantidade({ quantidades: 'gramas' })).toBe('gramas')
    expect(modoDeQuantidade({ quantidades: 'medida-caseira' })).toBe('medida-caseira')
    expect(modoDeQuantidade({})).toBe('medida-caseira')
    expect(modoDeQuantidade({ quantidades: 'quilos' })).toBe('medida-caseira')
    expect(modoDeQuantidade({ quantidades: null })).toBe('medida-caseira')
  })
})

const adulta = (parcial: Partial<Caso> = {}): Caso => ({
  ...criarCasoVazio('c1'),
  sexo: 'F',
  idadeAnos: 28,
  pesoKg: 68,
  estaturaCm: 165,
  ...parcial,
})

describe('lerNumero (CB-12)', () => {
  it.each([
    ['68,5', 68.5],
    ['68.5', 68.5],
    [' 70 ', 70],
    ['1.234,5', 1234.5],
    ['0', 0],
  ])('"%s" vira %s', (texto, esperado) => {
    expect(lerNumero(texto)).toBe(esperado)
  })

  it.each(['', '   ', 'abc', '12a', '1,2,3'])('"%s" não é número', (texto) => {
    expect(lerNumero(texto)).toBeNull()
  })
})

describe('validarCaso', () => {
  it('caso completo e plausível pode calcular energia', () => {
    const r = validarCaso(adulta())
    expect(r.erros).toEqual({})
    expect(r.faltando).toEqual([])
    expect(r.podeCalcular).toBe(true)
  })

  it('CB-01: campos vazios aparecem em `faltando` e bloqueiam o cálculo', () => {
    const r = validarCaso(adulta({ pesoKg: null, estaturaCm: null, sexo: null, idadeAnos: null }))
    expect(r.faltando).toEqual(['sexo', 'idadeAnos', 'pesoKg', 'estaturaCm'])
    expect(r.podeCalcular).toBe(false)
  })

  it('CB-02: idade menor que 1 ano é recusada', () => {
    const r = validarCaso(adulta({ idadeAnos: 0, idadeMesesAdicionais: 8, pesoKg: 8, estaturaCm: 70 }))
    expect(r.erros.idadeAnos).toMatch(/a partir de 1 ano/)
    expect(r.podeCalcular).toBe(false)
  })

  it('aceita criança de 1 ano', () => {
    const r = validarCaso(adulta({ idadeAnos: 1, pesoKg: 10, estaturaCm: 76 }))
    expect(r.erros).toEqual({})
    expect(r.podeCalcular).toBe(true)
  })

  it.each([
    [{ pesoKg: 4.9 }, 'pesoKg'],
    [{ pesoKg: 351 }, 'pesoKg'],
    [{ estaturaCm: 44 }, 'estaturaCm'],
    [{ estaturaCm: 251 }, 'estaturaCm'],
    [{ idadeAnos: 121 }, 'idadeAnos'],
    [{ idadeAnos: 30.5 }, 'idadeAnos'],
    [{ idadeMesesAdicionais: 12 }, 'idadeMesesAdicionais'],
    [{ circunferenciaCinturaCm: 10 }, 'circunferenciaCinturaCm'],
    [{ circunferenciaPanturrilhaCm: 100 }, 'circunferenciaPanturrilhaCm'],
  ] as const)('CB-03: %o é inválido em %s', (parcial, campo) => {
    const r = validarCaso(adulta(parcial))
    expect(r.erros[campo]).toBeDefined()
    expect(r.podeCalcular).toBe(false)
  })

  it('CB-02a: gestante do sexo masculino é recusada com motivo', () => {
    const r = validarCaso(adulta({ sexo: 'M', condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))
    expect(r.erros.condicao).toMatch(/sexo feminino/)
    expect(r.podeCalcular).toBe(false)
  })

  it.each([13, 51])('CB-02a: gestante com %i anos está fora das referências (14 a 50)', (idade) => {
    const r = validarCaso(adulta({ idadeAnos: idade, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))
    expect(r.erros.condicao).toMatch(/14 a 50 anos/)
  })

  it('CB-02a: lactante do sexo masculino é recusada', () => {
    const r = validarCaso(adulta({ sexo: 'M', condicao: { tipo: 'lactante', mesesPosParto: 3 } }))
    expect(r.erros.condicao).toMatch(/sexo feminino/)
  })

  it('CB-02b: gestante sem idade gestacional gera aviso, sem bloquear o cálculo básico', () => {
    const r = validarCaso(adulta({ condicao: { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: 60 } }))
    expect(r.avisos).toContain('Informe a idade gestacional para calcular o adicional de energia e o ganho de peso.')
    expect(r.erros).toEqual({})
    expect(r.podeCalcular).toBe(true)
  })

  it.each([0, 43])('semanas de gestação %i são inválidas', (semanas) => {
    const r = validarCaso(adulta({ condicao: { tipo: 'gestante', semanasGestacao: semanas, pesoPreGestacionalKg: 60 } }))
    expect(r.erros.condicao).toMatch(/1 a 42 semanas/)
  })

  it('lactante sem tempo pós-parto gera aviso', () => {
    const r = validarCaso(adulta({ condicao: { tipo: 'lactante', mesesPosParto: null } }))
    expect(r.avisos).toContain('Informe o tempo pós-parto para calcular o adicional de energia da lactação.')
  })
})

describe('criarCasoVazio', () => {
  it('começa sem dados numéricos e sem condição fisiológica', () => {
    const c = criarCasoVazio('abc')
    expect(c.id).toBe('abc')
    expect(c.pesoKg).toBeNull()
    expect(c.condicao).toEqual({ tipo: 'nenhuma' })
    expect(c.idadeMesesAdicionais).toBe(0)
  })
})

describe('medidas da antropometria completa (spec antropometria-completa)', () => {
  const NOVAS: readonly (keyof typeof MEDIDAS_CORPORAIS_VAZIAS)[] = [
    'bracoRelaxadoDireitoCm',
    'bracoRelaxadoEsquerdoCm',
    'bracoContraidoDireitoCm',
    'bracoContraidoEsquerdoCm',
    'antebracoCm',
    'punhoCm',
    'pescocoCm',
    'ombroCm',
    'peitoralCm',
    'pontoDaCintura',
    'abdomenCm',
    'quadrilCm',
    'coxaDireitaCm',
    'coxaEsquerdaCm',
    'coxaProximalDireitaCm',
    'coxaProximalEsquerdaCm',
    'panturrilhaEsquerdaCm',
    'diametroPunhoCm',
    'diametroCotoveloCm',
    'diametroJoelhoCm',
    'alturaDoJoelhoCm',
    'semienvergaduraCm',
  ]

  it('CA-2000: plano novo nasce com cada medida nova vazia, e as de hoje nos campos de hoje', () => {
    const c = criarCasoVazio('novo')
    expect(Object.keys(c.medidasCorporais)).toEqual(NOVAS)
    for (const campo of NOVAS) expect.soft(c.medidasCorporais[campo], campo).toBeNull()
    expect(c.composicao.dobras).toEqual({
      tricipital: null,
      subescapular: null,
      suprailiaca: null,
      abdominal: null,
      peitoral: null,
      coxa: null,
      bicipital: null,
      supraespinal: null,
      axilarMedia: null,
      panturrilhaMedial: null,
      suprailiacaAnt: null,
      suprailiacaMed: null,
    })
    expect(c.circunferenciaCinturaCm).toBeNull()
    expect(c.circunferenciaPanturrilhaCm).toBeNull()
  })

  it('CA-2001: o plano lido sem as medidas novas fica com os valores de antes e as novas vazias', () => {
    // Um plano gravado antes desta versão: sem `medidasCorporais` e com as 6 dobras de sempre.
    const semMedidas = JSON.parse(JSON.stringify(criarCasoVazio('antigo'))) as Record<string, unknown>
    delete semMedidas['medidasCorporais']
    const antigo = {
      ...semMedidas,
      pesoKg: 70,
      circunferenciaCinturaCm: 88,
      circunferenciaPanturrilhaCm: 35,
      composicao: {
        protocolo: 'faulkner-4',
        dobras: { tricipital: 12, subescapular: 15, suprailiaca: 18, abdominal: 22, peitoral: 9, coxa: 20 },
        bioimpedancia: { gorduraPct: 27, massaMagraKg: null, aguaPct: null, aparelho: 'InBody' },
      },
    } as unknown as Caso
    const lido = completarCasoLido(antigo)

    expect(lido.pesoKg).toBe(70)
    expect(lido.circunferenciaCinturaCm).toBe(88)
    expect(lido.circunferenciaPanturrilhaCm).toBe(35)
    expect(lido.composicao.protocolo).toBe('faulkner-4')
    expect(lido.composicao.dobras).toEqual({
      tricipital: 12,
      subescapular: 15,
      suprailiaca: 18,
      abdominal: 22,
      peitoral: 9,
      coxa: 20,
      bicipital: null,
      supraespinal: null,
      axilarMedia: null,
      panturrilhaMedial: null,
      suprailiacaAnt: null,
      suprailiacaMed: null,
    })
    expect(lido.composicao.bioimpedancia).toEqual({ gorduraPct: 27, massaMagraKg: null, aguaPct: null, aparelho: 'InBody' })
    expect(lido.medidasCorporais).toEqual(MEDIDAS_CORPORAIS_VAZIAS)
  })

  it('CA-2001: com só parte das medidas novas, as que vieram ficam e as outras vêm vazias', () => {
    const parcial = { ...criarCasoVazio('p'), medidasCorporais: { quadrilCm: 102, pontoDaCintura: 'ponto-medio' } } as unknown as Caso
    const lido = completarCasoLido(parcial)
    expect(lido.medidasCorporais.quadrilCm).toBe(102)
    expect(lido.medidasCorporais.pontoDaCintura).toBe('ponto-medio')
    expect(lido.medidasCorporais.bracoRelaxadoDireitoCm).toBeNull()
    expect(Object.keys(lido.medidasCorporais)).toHaveLength(NOVAS.length)
  })

  it('CB-1008: o ponto da cintura de uma versão mais nova fica como veio', () => {
    const futuro = { ...criarCasoVazio('f'), medidasCorporais: { ...MEDIDAS_CORPORAIS_VAZIAS, pontoDaCintura: 'umbigo' } } as unknown as Caso
    expect(completarCasoLido(futuro).medidasCorporais.pontoDaCintura).toBe('umbigo')
  })
})
