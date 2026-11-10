// Divergência 2 da revisão do motor (spec antropometria-telas, D-1422 a D-1424): as sugestões dizem de onde veio o % de
// gordura e repassam os avisos dele.
import { criarCasoVazio } from './caso.ts'
import type { OpcoesDaGordura } from './indicadoresDeGordura.ts'
import { metaDePerda } from './metaDePerda.ts'
import { pesoDeReferencia } from './pesoDeReferencia.ts'
import { gastoDeRepouso, proteinaPorObjetivo } from './pontoDePartida.ts'
import type { Caso, ComposicaoCorporal } from './tipos.ts'

const vazio = criarCasoVazio('c')
const caso = (p: Partial<Caso> = {}, dobras: Partial<ComposicaoCorporal['dobras']> = {}, bio: Partial<ComposicaoCorporal['bioimpedancia']> = {}): Caso => ({
  ...vazio,
  sexo: 'F',
  idadeAnos: 30,
  pesoKg: 60,
  estaturaCm: 165,
  ...p,
  composicao: {
    ...vazio.composicao,
    dobras: { ...vazio.composicao.dobras, ...dobras },
    bioimpedancia: { ...vazio.composicao.bioimpedancia, ...bio },
  },
})

/** Jackson & Pollock 7 dobras numa mulher magra: ~14% de gordura. */
const SETE_DOBRAS = { peitoral: 6, axilarMedia: 7, tricipital: 10, subescapular: 8, abdominal: 10, suprailiacaAnt: 7, coxa: 12 } as const
const JP7: OpcoesDaGordura = { protocolo: 'jackson-pollock-7' }
const PETROSKI: OpcoesDaGordura = { protocolo: 'petroski' }
const PICO = 'Petroski só vale até 115,5 mm de soma, o pico da equação'
const AVISO_DA_RECUSA = `As dobras não calcularam (${PICO}): usado o % da bioimpedância.`
const AVISO_DAS_DOBRAS = 'Proposta do app (sem diretriz): a faixa soma o erro das dobras ao da equação.'
const AVISO_DA_BIOIMPEDANCIA = 'Proposta do app (sem diretriz): a faixa usa o erro típico das dobras (3,5 pontos de %); o erro da bioimpedância depende do aparelho e não foi conferido.'

describe('a origem do % nas sugestões (spec antropometria-telas, CA-2446 a CA-2448)', () => {
  it('CA-2446: pelas dobras, o gasto, a proteína de Helms e a meta com gordura alvo dizem o protocolo', () => {
    const atleta = caso({ objetivo: 'emagrecer' }, SETE_DOBRAS)
    const origem = { origem: 'dobras', metodo: 'Jackson & Pollock, 7 dobras' }
    const gasto = gastoDeRepouso(atleta, 'atleta', JP7)
    expect(gasto?.calculou && gasto.origemDoPercentual).toEqual(origem)
    const proteina = proteinaPorObjetivo(atleta, { perfil: 'atleta', gordura: JP7 })
    expect(proteina?.calculou && proteina.origemDoPercentual).toEqual(origem)
    const meta = metaDePerda(atleta, { gorduraAlvoPct: 12, gordura: JP7 })
    expect(meta?.mostra && meta.origemDoPercentual).toEqual(origem)
  })

  it('CA-2446: pela bioimpedância, a origem diz o aparelho; sem % usado, a origem é nula', () => {
    const comBio = caso({ objetivo: 'emagrecer', pesoKg: 90, estaturaCm: 160 }, {}, { gorduraPct: 40, aparelho: 'InBody' })
    const origem = { origem: 'bioimpedancia', metodo: 'Bioimpedância (InBody)' }
    const gasto = gastoDeRepouso(comBio, 'sedentario')
    expect(gasto?.calculou && gasto.origemDoPercentual).toEqual(origem)
    expect(pesoDeReferencia(comBio)?.origemDoPercentual).toEqual(origem)
    // Mantendo e ativo, a ISSN usa só o peso: nenhum % entra na conta.
    const manter = proteinaPorObjetivo(caso({ objetivo: 'manter' }, {}, { gorduraPct: 25 }), { perfil: 'ativo' })
    expect(manter?.calculou && manter.origemDoPercentual).toBeNull()
    // Sem gordura alvo, a meta não usa o %.
    const semAlvo = metaDePerda(comBio)
    expect(semAlvo?.mostra && semAlvo.origemDoPercentual).toBeNull()
    // Abaixo de IMC 30, o peso de referência é o atual.
    expect(pesoDeReferencia(caso())?.origemDoPercentual).toBeNull()
  })

  it('CA-2447: com as dobras recusadas e a bioimpedância no lugar, as quatro repassam o aviso da D-1042', () => {
    const recusada = caso({ objetivo: 'emagrecer', pesoKg: 90, estaturaCm: 160 }, { subescapular: 45, suprailiacaMed: 45, coxa: 50 }, { gorduraPct: 35 })
    const gasto = gastoDeRepouso(recusada, 'sedentario', PETROSKI)
    expect(gasto?.calculou && gasto.avisos).toContain(AVISO_DA_RECUSA)
    const proteina = proteinaPorObjetivo(recusada, { perfil: 'sedentario', base: 'massa-magra', gordura: PETROSKI })
    expect(proteina?.calculou && proteina.avisos).toContain(AVISO_DA_RECUSA)
    const meta = metaDePerda(recusada, { gorduraAlvoPct: 30, gordura: PETROSKI })
    expect(meta?.mostra && meta.avisos).toContain(AVISO_DA_RECUSA)
    expect(pesoDeReferencia(recusada, { gordura: PETROSKI })?.avisos).toContain(AVISO_DA_RECUSA)
  })

  it('CA-2448: com a origem na bioimpedância, o aviso da faixa troca e o número da faixa não muda', () => {
    const pelasDobras = gastoDeRepouso(caso({}, SETE_DOBRAS), 'sedentario', JP7)
    if (!pelasDobras?.calculou) throw new Error('não calculou')
    expect(pelasDobras.avisos).toContain(AVISO_DAS_DOBRAS)
    expect(pelasDobras.avisos).not.toContain(AVISO_DA_BIOIMPEDANCIA)

    // O mesmo % pela bioimpedância: a mesma faixa, o outro aviso.
    const pelaBio = gastoDeRepouso(caso({}, {}, { gorduraPct: 100 - (pelasDobras.massaMagraKg / 60) * 100 }), 'sedentario')
    if (!pelaBio?.calculou) throw new Error('não calculou')
    expect(pelaBio.avisos).toContain(AVISO_DA_BIOIMPEDANCIA)
    expect(pelaBio.avisos).not.toContain(AVISO_DAS_DOBRAS)
    expect(pelaBio.faixa.min).toBeCloseTo(pelasDobras.faixa.min, 6)
    expect(pelaBio.faixa.max).toBeCloseTo(pelasDobras.faixa.max, 6)
    expect(pelaBio.evidencia).toBe('limitada')
  })
})
