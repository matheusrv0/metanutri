import { criarCasoVazio } from './caso.ts'
import { resultadoAntropometrico } from './resultadoAntropometrico.ts'
import type { Caso } from './tipos.ts'

const vazio = criarCasoVazio('c')
const completo: Caso = {
  ...vazio,
  sexo: 'M',
  idadeAnos: 65,
  pesoKg: 82,
  estaturaCm: 172,
  circunferenciaCinturaCm: 98,
  circunferenciaPanturrilhaCm: 35,
  medidasCorporais: { ...vazio.medidasCorporais, pontoDaCintura: 'ponto-medio', quadrilCm: 104, pescocoCm: 39, punhoCm: 17.5, bracoRelaxadoDireitoCm: 31 },
  composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, peitoral: 15, abdominal: 28, coxa: 18, tricipital: 14 } },
}

describe('resultado completo (spec antropometria-completa, CA-2056)', () => {
  it('CA-2056: as linhas na ordem da tela', () => {
    expect(resultadoAntropometrico(completo).map((l) => l.id)).toEqual([
      'imc',
      'gordura',
      'massa-gorda',
      'massa-magra',
      'soma-de-dobras',
      'cintura',
      'rcq',
      'rce',
      'pescoco',
      'cb',
      'dct',
      'cmb',
      'amb',
      'agb',
      'adequacao-cb',
      'adequacao-dct',
      'adequacao-cmb',
      'panturrilha',
      'compleicao',
    ])
    for (const l of resultadoAntropometrico(completo)) expect.soft(l.valor, l.id).not.toBeNull()
  })

  it('CA-2056: a linha que não vale para a pessoa não vem (criança: sem cintura, RCQ, RCE, pescoço, panturrilha e compleição)', () => {
    const crianca: Caso = { ...completo, idadeAnos: 10, pesoKg: 32, estaturaCm: 138 }
    const ids = resultadoAntropometrico(crianca).map((l) => l.id)
    for (const fora of ['cintura', 'rcq', 'rce', 'pescoco', 'panturrilha', 'compleicao'] as const) expect.soft(ids, fora).not.toContain(fora)
    expect(ids).toContain('imc')
    expect(ids).toContain('cb')
  })

  it('CA-2056 e CB-1002: gestante, só o IMC pré-gestacional e o braço', () => {
    const gestante: Caso = { ...completo, sexo: 'F', idadeAnos: 30, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 70 } }
    expect(resultadoAntropometrico(gestante).map((l) => l.id)).toEqual(['imc', 'cb', 'dct', 'cmb', 'amb', 'agb', 'adequacao-cb', 'adequacao-dct', 'adequacao-cmb'])
  })

  it('CA-2056: a que vale e não tem dado vem com o que falta', () => {
    const semQuadril: Caso = { ...completo, medidasCorporais: { ...completo.medidasCorporais, quadrilCm: null } }
    const rcq = resultadoAntropometrico(semQuadril).find((l) => l.id === 'rcq')
    expect(rcq?.valor).toBeNull()
    expect(rcq?.falta).toEqual([{ campo: 'medidasCorporais.quadrilCm', nome: 'o quadril' }])
  })

  it('a opção de RCQ por Bray & Gray chega à linha', () => {
    const rcq = resultadoAntropometrico(completo, { rcq: 'bray-gray' }).find((l) => l.id === 'rcq')
    expect(rcq?.fonte?.curta).toBe('Bray e Gray, 1988')
  })
})
