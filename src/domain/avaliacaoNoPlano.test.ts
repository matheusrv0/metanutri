// O grupo `avaliacao` e o protocolo ampliado no plano gravado (spec antropometria-telas, D-1434 e D-1435).
import { AVALIACAO_VAZIA, completarCasoLido, criarCasoVazio } from './caso.ts'
import { criarRepositorio, type Armazenamento } from './persistencia.ts'
import { PROTOCOLOS_DE_DOBRAS, type IdProtocolo } from './protocolosDeDobras.ts'
import { resultadoAntropometrico } from './resultadoAntropometrico.ts'
import type { Caso, DadosDaAvaliacao } from './tipos.ts'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const CAMPOS_DA_AVALIACAO: readonly (keyof DadosDaAvaliacao)[] = [
  'origemPesoEstatura',
  'modalidade',
  'adipometro',
  'maturacao',
  'grupoDoEstudo',
  'perfil',
  'imcAlvo',
  'gorduraAlvoPct',
  'baseDaProteina',
  'doencaRenalGrave',
  'diagnostico',
  'observacoesDaMedida',
  'fotosAutorizadasEm',
  'fotos',
  'anexos',
]

/** O plano como uma versão anterior gravou: sem o grupo `avaliacao`. */
function gravadoAntes(): Caso {
  const bruto = JSON.parse(JSON.stringify(criarCasoVazio('antigo'))) as Record<string, unknown>
  delete bruto['avaliacao']
  return { ...bruto, pesoKg: 71.5, estaturaCm: 164, circunferenciaCinturaCm: 84 } as unknown as Caso
}

describe('o grupo da avaliação no plano (spec antropometria-telas, CA-2464)', () => {
  it('CA-2464: plano novo nasce com a avaliação vazia, campo por campo', () => {
    const novo = criarCasoVazio('n')
    expect(Object.keys(novo.avaliacao).sort()).toEqual([...CAMPOS_DA_AVALIACAO].sort())
    for (const campo of CAMPOS_DA_AVALIACAO) expect.soft(novo.avaliacao[campo], campo).toBeNull()
    expect(novo.avaliacao).toEqual(AVALIACAO_VAZIA)
  })

  it('CA-2464: plano gravado antes abre com o mesmo valor em tudo e a avaliação vazia', () => {
    const lido = completarCasoLido(gravadoAntes())
    expect(lido.pesoKg).toBe(71.5)
    expect(lido.estaturaCm).toBe(164)
    expect(lido.circunferenciaCinturaCm).toBe(84)
    expect(lido.avaliacao).toEqual(AVALIACAO_VAZIA)
  })

  it('CA-2464: com só parte da avaliação, o que veio fica e o resto vem vazio; valor desconhecido fica como veio', () => {
    const parcial = { ...criarCasoVazio('p'), avaliacao: { adipometro: 'harpenden', modalidade: 'holograma' } } as unknown as Caso
    const lido = completarCasoLido(parcial)
    expect(lido.avaliacao.adipometro).toBe('harpenden')
    expect(lido.avaliacao.modalidade).toBe('holograma')
    expect(lido.avaliacao.perfil).toBeNull()
    expect(Object.keys(lido.avaliacao)).toHaveLength(CAMPOS_DA_AVALIACAO.length)
  })
})

describe('o protocolo gravado (spec antropometria-telas, CA-2465)', () => {
  it('CA-2465: cada um dos 8 protocolos do motor grava e relê igual', () => {
    const memoria = new MemoriaFalsa()
    const repo = criarRepositorio(memoria)
    for (const { id } of PROTOCOLOS_DE_DOBRAS) {
      const criado = repo.criar('')
      repo.salvar({ ...criado, caso: { ...criado.caso, composicao: { ...criado.caso.composicao, protocolo: id } } })
      expect.soft(criarRepositorio(memoria).obter(criado.caso.id)?.caso.composicao.protocolo, id).toBe(id)
    }
    expect(PROTOCOLOS_DE_DOBRAS).toHaveLength(8)
  })

  it('CA-2465: um id de versão mais nova relê igual e o resultado mostra a recusa', () => {
    const memoria = new MemoriaFalsa()
    const repo = criarRepositorio(memoria)
    const criado = repo.criar('')
    const futuro = 'protocolo-do-futuro' as IdProtocolo
    const caso: Caso = { ...criado.caso, sexo: 'M', idadeAnos: 30, pesoKg: 80, estaturaCm: 178, composicao: { ...criado.caso.composicao, protocolo: futuro } }
    repo.salvar({ ...criado, caso })
    const relido = criarRepositorio(memoria).obter(criado.caso.id)?.caso
    expect(relido?.composicao.protocolo).toBe(futuro)
    const gordura = relido ? resultadoAntropometrico(relido).find((l) => l.id === 'gordura') : undefined
    expect(gordura?.valor).toBeNull()
    expect(gordura?.avisos.join(' ')).toMatch(/^Protocolo desconhecido/)
  })
})

describe('plano antigo (spec antropometria-telas, CB-1400)', () => {
  it('CB-1400: o plano gravado antes desta tela abre igual, com os campos novos vazios', () => {
    const antigo = gravadoAntes()
    const lido = completarCasoLido(antigo) as unknown as Readonly<Record<string, unknown>>
    for (const [chave, valor] of Object.entries(antigo)) expect.soft(lido[chave], chave).toEqual(valor)
    expect(lido['avaliacao']).toEqual(AVALIACAO_VAZIA)
  })

  it('CB-1400: o protocolo, o ponto da cintura e a origem de um plano antigo ficam como eram', () => {
    const lido = completarCasoLido(gravadoAntes())
    expect(lido.composicao.protocolo).toBe('jackson-pollock-3')
    expect(lido.medidasCorporais.pontoDaCintura).toBeNull()
    expect(lido.avaliacao.origemPesoEstatura).toBeNull()
  })
})
