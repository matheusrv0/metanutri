// O pedido à IA, montado no navegador (spec assistente-ia, D-1303, D-1305, D-1313 e D-1314): só a lista branca, com os
// textos sem contato; o que a ficha proíbe em `naoUsar`; os "Meus alimentos" que podem ser sugeridos; as metas e os
// nutrientes em foco; e, no modo ajustar, o plano só com ids e gramas e as lacunas que o app calculou. A função limpa de
// novo (supabase/functions/_shared/iaContrato.ts): os tipos e a limpeza são os de lá.
import {
  ESTUDANTE_SEM_APROVACAO,
  SEM_CONSENTIMENTO,
  SEM_CRN_IA,
  SEM_PERFIL_IA,
  textoCurto,
  textoDoLimite,
  type CandidatoIa,
  type CorpoDoPedidoIa,
  type FaixaIa,
  type ItemDoPlanoIa,
  type LacunasIa,
  type MetasIa,
  type MeuAlimentoIa,
  type Orcamento,
  type PacienteIa,
  type RefeicaoIa,
  type RestricoesIa,
  type RotinaIa,
  type UsoDoMes,
} from '../../supabase/functions/_shared/iaContrato.ts'
import { calcularAdequacao, type ResultadoAdequacao } from './adequacao.ts'
import { oQueFalta, validarCaso } from './caso.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { DOENCAS } from './doencas.ts'
import { calcularEnergia, categoriaDoFator, NIVEIS_ATIVIDADE, percentualDoGasto, rotuloDaCategoria } from './energia.ts'
import { calcularMacros, faixaAmdr, type ResultadoMacro } from './macros.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import type { Paciente } from './pacientes.ts'
import { ehItemDeReceita } from './receitaNoPlano.ts'
import { restricaoDoAlimento, semAcento, type RestricoesDoPaciente } from './restricoes.ts'
import type { PerfilConta } from './situacao.ts'
import { ehPrescritivelParaSugerir } from './sugestaoDoProprio.ts'
import { proprioPodeSerSugerido } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { Alimento, BuscarAlimento, Caso, Plano } from './tipos.ts'

/** D-1305: a IA a partir de 2 anos. */
export const IDADE_MINIMA_DA_IA = 2
export const SEM_PACIENTE_IA = 'Vincule o plano a um paciente para usar a IA.'
export const MENOR_DE_2_ANOS = 'Sugestão com IA a partir de 2 anos.'

// ---------- Quem pode (CA-2335) ----------

export interface SituacaoParaIa {
  readonly comPaciente: boolean
  readonly perfil: PerfilConta | null
  /** Estudante: o pedido de estudante foi aprovado. */
  readonly estudanteAprovado: boolean
  /** O caso como vale (casoComFicha). */
  readonly caso: Caso
  /** A ficha tem a autorização do paciente para o uso de IA (D-1304). */
  readonly consentimento: boolean
  /** O contador do mês, quando já lido; no limite, o motivo é o do limite. */
  readonly uso: UsoDoMes | null
  readonly agora: Date
}

/**
 * CA-2335: o motivo do botão desligado, na ordem da spec; nulo quando pode. O CRN não encontrado bloqueia na hora
 * (DP-IA-8). Sem perfil lido (modo local, ou a conta sem situação) a IA não abre: ela depende do servidor.
 * `restricoes` de quem chama já vem com os cuidados da fase (comCuidadosDaFase) para o `naoUsar`.
 */
export function motivoParaNaoUsarIa(s: SituacaoParaIa): string | null {
  if (!s.comPaciente) return SEM_PACIENTE_IA
  if (s.perfil === null) return SEM_PERFIL_IA
  if (s.perfil.situacao === 'nutricionista' && s.perfil.statusCrn !== 'em_conferencia' && s.perfil.statusCrn !== 'conferido') return SEM_CRN_IA
  if (s.perfil.situacao === 'estudante' && !s.estudanteAprovado) return ESTUDANTE_SEM_APROVACAO
  if (s.caso.idadeAnos !== null && s.caso.idadeAnos < IDADE_MINIMA_DA_IA) return MENOR_DE_2_ANOS
  const { faltando } = validarCaso(s.caso)
  if (faltando.length > 0) return `Informe ${oQueFalta(faltando)} para sugerir o plano.`
  if (!s.consentimento) return SEM_CONSENTIMENTO
  if (s.uso !== null && s.uso.usados >= s.uso.limite) return textoDoLimite(s.uso.limite, s.agora)
  return null
}

// ---------- O paciente (CA-2330 e CA-2331) ----------

const resposta = (paciente: Paciente, id: string): string => paciente.respostasAnamnese.find((r) => r.perguntaId === id)?.resposta ?? ''

/** O nível de atividade pelo nome da tela: o do fator exato, ou o da categoria do fator. */
export function atividadeDoFator(fator: number): string {
  return NIVEIS_ATIVIDADE.find((n) => n.fator === fator)?.rotulo ?? rotuloDaCategoria(categoriaDoFator(fator))
}

/** CA-2331: só os campos da lista branca, com os textos limpos (D-1314). */
export function pacienteParaIa(caso: Caso, paciente: Paciente): PacienteIa {
  const condicao = caso.condicao
  return {
    idadeAnos: caso.idadeAnos ?? 0,
    idadeMeses: caso.idadeMesesAdicionais,
    sexo: caso.sexo ?? 'F',
    pesoKg: caso.pesoKg === null ? null : Math.round(caso.pesoKg * 2) / 2,
    estaturaCm: caso.estaturaCm,
    fase:
      condicao.tipo === 'gestante'
        ? { tipo: 'gestante', semanas: condicao.semanasGestacao }
        : condicao.tipo === 'lactante'
          ? { tipo: 'lactante', meses: condicao.mesesPosParto, amamentacao: condicao.amamentacao === 'mista' ? 'mista' : 'exclusiva' }
          : { tipo: 'nenhuma' },
    atividade: atividadeDoFator(caso.energia.fator),
    objetivo: caso.objetivo,
    objetivoTexto: textoCurto(paciente.objetivo, 200),
    doencas: DOENCAS.filter((d) => paciente.doencas.includes(d.id)).map((d) => d.rotulo),
    outrosDiagnosticos: textoCurto(paciente.condicoesClinicas, 200),
    medicamentos: textoCurto(paciente.medicamentos, 200),
  }
}

/** As restrições e os cuidados da fase, pelo aviso de cada um (o que a IA lê). */
export function restricoesParaIa(r: RestricoesDoPaciente): RestricoesIa {
  return {
    avisos: r.grupos.map((g) => g.aviso),
    textos: r.textos.map((t) => textoCurto(t, 60)).filter((t) => t !== ''),
    naoGosta: [...r.naoGosta],
    cuidados: (r.cuidados ?? []).map((c) => c.aviso),
  }
}

const ORCAMENTOS: Readonly<Record<string, Orcamento>> = { economico: 'economico', intermediario: 'intermediario', 'sem restricao': 'sem-restricao' }

/** A rotina, das respostas da anamnese (D-1303), e o "Algo mais" deste pedido. */
export function rotinaParaIa(paciente: Paciente, algoMais: string): RotinaIa {
  return {
    sono: textoCurto(resposta(paciente, 'sono-horario'), 200),
    trabalho: textoCurto(resposta(paciente, 'rotina-trabalho'), 200),
    ondeCome: textoCurto(resposta(paciente, 'refeicoes-onde'), 200),
    orcamento: ORCAMENTOS[semAcento(resposta(paciente, 'orcamento'))] ?? '',
    gosta: textoCurto(resposta(paciente, 'gosta'), 200),
    exercicio: textoCurto(resposta(paciente, 'atividade-horario'), 200),
    extra: textoCurto(algoMais, 300),
  }
}

// ---------- Metas e foco (CA-2334, D-1313) ----------

const NUTRIENTES_DA_FASE = {
  gestante: ['ferro', 'folato', 'cálcio'],
  crianca: ['cálcio', 'ferro', 'vitamina A'],
  idoso: ['cálcio', 'vitamina D', 'B12'],
  vegetariano: ['ferro', 'zinco', 'cálcio', 'B12'],
  anemia: ['ferro', 'vitamina C', 'folato'],
  adulto: ['fibra', 'cálcio', 'potássio', 'magnésio'],
} as const

/** D-1313: os nutrientes em foco da fase, juntos e sem repetir, até 5. Nenhuma regra: os do adulto. */
export function focoDaFase(caso: Caso, paciente: Paciente, restricoes: RestricoesDoPaciente): readonly string[] {
  const idade = caso.idadeAnos ?? 30
  const listas: (readonly string[])[] = []
  if (caso.condicao.tipo === 'gestante') listas.push(NUTRIENTES_DA_FASE.gestante)
  if (idade >= IDADE_MINIMA_DA_IA && idade <= 12) listas.push(NUTRIENTES_DA_FASE.crianca)
  if (idade >= 60) listas.push(NUTRIENTES_DA_FASE.idoso)
  if (restricoes.grupos.some((g) => g.id === 'vegetariano' || g.id === 'vegano')) listas.push(NUTRIENTES_DA_FASE.vegetariano)
  if (paciente.doencas.includes('anemia')) listas.push(NUTRIENTES_DA_FASE.anemia)
  if (listas.length === 0) listas.push(NUTRIENTES_DA_FASE.adulto)
  return [...new Set(listas.flat())].slice(0, 5)
}

const faixa = (f: { readonly tipo: 'pct' | 'g_kg'; readonly min: number; readonly max: number } | undefined, padrao: { readonly min: number; readonly max: number } | undefined): FaixaIa | null =>
  f ? { tipo: f.tipo, min: f.min, max: f.max } : padrao ? { tipo: 'pct', min: padrao.min, max: padrao.max } : null

/** CA-2334: a meta de energia, as faixas do caso (ou a AMDR da idade) e o foco. */
export function metasParaIa(caso: Caso, metaKcal: number, foco: readonly string[]): MetasIa {
  const amdr = faixaAmdr(caso.idadeAnos)
  return {
    kcal: Math.round(metaKcal),
    proteina: faixa(caso.metasMacros.proteina, amdr?.proteina_pct),
    carboidrato: faixa(caso.metasMacros.carboidrato, amdr?.carboidrato_pct),
    gordura: faixa(caso.metasMacros.gordura, amdr?.gordura_pct),
    foco: [...foco],
  }
}

/** A meta de energia do caso: a digitada (modo rápido ou GET manual) ou a calculada. Nula sem cálculo. */
export function metaDeEnergia(caso: Caso): number | null {
  return calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }).get
}

/** O gasto calculado pela ficha, sem a meta digitada (D-1312): o das conferências 12 e 13. */
export function gastoCalculado(caso: Caso): number | null {
  return calcularEnergia({ ...caso, modo: 'completo', metaEnergiaKcal: null }, { fator: caso.energia.fator, formula: caso.energia.formula }).get
}

// ---------- Alimentos (CA-2332 e CA-2333) ----------

/** CA-2332: os ids do catálogo que pegam restrição ou cuidado da fase, e os ocultos do caso, sem repetir e em ordem. */
export function naoUsarParaIa(catalogo: readonly number[], buscar: BuscarAlimento, restricoes: RestricoesDoPaciente, ocultos: readonly number[]): readonly number[] {
  const proibidos = new Set(ocultos.filter((id) => Number.isInteger(id) && id > 0))
  for (const id of catalogo) {
    const alimento = buscar(id)
    if (alimento && restricaoDoAlimento(alimento, restricoes) !== null) proibidos.add(id)
  }
  return [...proibidos].sort((a, b) => a - b)
}

export const MAXIMO_DE_MEUS_ALIMENTOS = 150

const umaCasa = (v: number | null): number => Math.round((v ?? 0) * 10) / 10

/** CA-2333: os próprios que podem ser sugeridos (D-386) e passam na regra prescritível, com os valores do cadastro. */
export function meusAlimentosParaIa(proprios: readonly Alimento[]): readonly MeuAlimentoIa[] {
  return proprios
    .filter((a) => proprioPodeSerSugerido(a) && ehPrescritivelParaSugerir(a))
    .slice(0, MAXIMO_DE_MEUS_ALIMENTOS)
    .map((a) => ({
      id: a.id,
      nome: textoCurto(nomeParaPaciente(a), 80),
      grupo: textoCurto(a.categoria, 60),
      unidade: a.unidade === 'ml' ? 'ml' : 'g',
      kcal: umaCasa(a.nutrientes.energia_kcal),
      p: umaCasa(a.nutrientes.proteina_g),
      c: umaCasa(a.nutrientes.carboidrato_g),
      g: umaCasa(a.nutrientes.lipideos_g),
    }))
}

// ---------- O modo ajustar (CA-2352) ----------

/** O plano só com ids e gramas. O item de receita não vai (CB-1309), e os números de item são os do plano. */
export function planoParaIa(plano: Plano): readonly ItemDoPlanoIa[] {
  return plano.refeicoes.flatMap((r, refeicao) =>
    (['principal', 'substituto1'] as const).flatMap((opcao) =>
      r.opcoes[opcao].flatMap((i, item) =>
        ehItemDeReceita(i) || !(i.gramas > 0) ? [] : [{ refeicao, opcao: opcao === 'principal' ? ('principal' as const) : ('opcao2' as const), item, alimentoId: i.alimentoId, gramas: i.gramas }],
      ),
    ),
  )
}

const pct = (v: number): string => `${Math.round(v)}%`
const gKg = (v: number): string => `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')} g/kg`

/** "Carboidrato 68% (meta até 65%)", "Proteína 1,8 g/kg (meta até 1,5)", "Gordura 15% (meta a partir de 20%)"; nulo dentro. */
export function fraseDoMacro(nome: string, r: ResultadoMacro): string | null {
  if (r.meta === null || (r.estado !== 'abaixo' && r.estado !== 'acima')) return null
  const valor = r.meta.tipo === 'g_kg' ? r.gPorKg : r.pctKcal
  if (valor === null) return null
  const mostrar = r.meta.tipo === 'g_kg' ? gKg : pct
  const limite = r.estado === 'acima' ? `meta até ${mostrar(r.meta.max).replace(' g/kg', '')}` : `meta a partir de ${mostrar(r.meta.min).replace(' g/kg', '')}`
  return `${nome} ${mostrar(valor)} (${limite})`
}

export interface OpcoesDasLacunas {
  readonly caso: Caso
  readonly metaKcal: number
  readonly buscar: BuscarAlimento
  /** Os alimentos que o Cobrir pode sugerir (alimentosParaSugerir). */
  readonly alimentosParaSugerir: readonly Alimento[]
  readonly restricoes: RestricoesDoPaciente
}

/** Os nutrientes que o Cobrir não cobre (o sódio sobe com o sal da cozinha, D-199d). */
const FORA_DAS_LACUNAS = new Set(['sodio_mg'])

/**
 * CA-2352: o que o app calculou do plano: a energia em % da meta, os macros fora da faixa, os nutrientes abaixo da meta
 * com até 3 candidatos do Cobrir e os acima do limite.
 */
export function lacunasDoPlano(plano: Plano, o: OpcoesDasLacunas): LacunasIa & { readonly adequacao: ResultadoAdequacao } {
  const totais = totaisDoPlano(plano, o.buscar)
  const energia = percentualDoGasto(totais.nutrientes.energia_kcal.total, o.metaKcal)
  const macros = calcularMacros(totais, o.caso, o.caso.metasMacros)
  const adequacao = calcularAdequacao(totais, o.caso, o.caso.adequacao.preset)
  const abaixo = adequacao.linhas
    .filter((l) => l.estado === 'abaixo' && !FORA_DAS_LACUNAS.has(l.chave))
    .map((l) => {
      const cobrir = sugerirParaCobrir(l.chave, totais, adequacao, {
        alimentos: o.alimentosParaSugerir,
        incluirIngredientes: o.caso.adequacao.incluirIngredientes,
        gastoEnergetico: o.metaKcal,
        ocultos: new Set(o.caso.adequacao.ocultos),
        restricoes: o.restricoes,
        idadeAnos: o.caso.idadeAnos,
      })
      const candidatos: CandidatoIa[] = cobrir.sugestoes.slice(0, 3).map((s) => ({ alimentoId: s.alimentoId, gramas: s.gramas, coberturaPct: Math.round(s.coberturaPct) }))
      return { nutriente: l.rotulo, pct: Math.round(l.adequacaoPct), candidatos }
    })
  return {
    energiaPct: energia === null ? null : Math.round(energia.pct),
    macros: [fraseDoMacro('Proteína', macros.proteina), fraseDoMacro('Carboidrato', macros.carboidrato), fraseDoMacro('Gordura', macros.gordura)].filter((f): f is string => f !== null),
    abaixo,
    acima: adequacao.linhas.filter((l) => l.estado === 'acima-limite').map((l) => l.rotulo),
    adequacao,
  }
}

// ---------- O pedido inteiro ----------

export interface EntradaDoPedido {
  readonly modo: 'gerar' | 'ajustar'
  /** O caso como vale (casoComFicha). */
  readonly caso: Caso
  readonly paciente: Paciente
  readonly restricoes: RestricoesDoPaciente
  readonly refeicoes: readonly RefeicaoIa[]
  readonly metaKcal: number
  readonly algoMais: string
  readonly outroPedido: string
  /** Os ids do catálogo da IA (IDS_DO_CATALOGO_IA). */
  readonly catalogo: readonly number[]
  readonly buscar: BuscarAlimento
  /** Os alimentos próprios da conta. */
  readonly proprios: readonly Alimento[]
  /** Só no modo ajustar. */
  readonly plano?: Plano
  readonly lacunas?: LacunasIa
}

/**
 * O corpo do pedido à função (D-1314): só a lista branca. A autorização é conferida antes (CA-2335) e de novo na função,
 * pela ficha: por isso vai o id dela, em `pacienteId`, que a função não passa à IA (D-1347).
 */
export function montarPedidoIa(e: EntradaDoPedido): CorpoDoPedidoIa {
  return {
    pacienteId: e.paciente.id,
    versao: 1,
    modo: e.modo,
    consentimento: true,
    paciente: pacienteParaIa(e.caso, e.paciente),
    restricoes: restricoesParaIa(e.restricoes),
    rotina: rotinaParaIa(e.paciente, e.algoMais),
    metas: metasParaIa(e.caso, e.metaKcal, focoDaFase(e.caso, e.paciente, e.restricoes)),
    refeicoes: e.refeicoes.map((r) => ({ nome: textoCurto(r.nome, 40), horario: r.horario })),
    naoUsar: naoUsarParaIa(e.catalogo, e.buscar, e.restricoes, e.caso.adequacao.ocultos),
    meusAlimentos: meusAlimentosParaIa(e.proprios),
    plano: e.modo === 'ajustar' && e.plano ? planoParaIa(e.plano) : null,
    // Só os quatro campos do contrato: a adequação inteira, que `lacunasDoPlano` também devolve, não vai.
    lacunas: e.modo === 'ajustar' && e.lacunas ? { energiaPct: e.lacunas.energiaPct, macros: e.lacunas.macros, abaixo: e.lacunas.abaixo, acima: e.lacunas.acima } : null,
    pedido: textoCurto(e.outroPedido, 300),
  }
}
