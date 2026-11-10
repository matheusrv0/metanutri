// A gaveta da IA, sem tela (spec assistente-ia, D-1303, D-1309, D-1351 e seção 6): as perguntas de "Falta na ficha" e
// onde cada resposta fica, o que "A ficha tem", as refeições do pedido, as caixas de "O que ajustar", a frase de cada
// erro da função e a resposta da função conferida de novo no navegador (o mesmo `conferirResposta` da função).
import {
  conferirResposta,
  IA_DEMOROU,
  IA_INDISPONIVEL,
  IA_VAZIA,
  LIMITE_DE_SUGESTOES_IA,
  MUITAS_SUGESTOES,
  RECUSA_DA_IA,
  SEM_SESSAO_IA,
  textoDoLimite,
  type ContextoDaResposta,
  type LacunasIa,
  type RefeicaoIa,
  type RespostaDaIa,
  type UsoDoMes,
} from '../../supabase/functions/_shared/iaContrato.ts'
import { responder, ROTEIRO_PADRAO, type IdBloco } from './anamnese.ts'
import { MENSAGEM_ERRO } from './conta.ts'
import { DOENCAS } from './doencas.ts'
import { categoriaDoFator } from './energia.ts'
import { atividadeDoFator } from './iaPedido.ts'
import type { MudancaConferida } from './iaMudancas.ts'
import { unidadeDo } from './liquido.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import type { Paciente } from './pacientes.ts'
import { REFEICOES_PADRAO } from './plano.ts'
import type { RestricoesDoPaciente } from './restricoes.ts'
import type { BuscarAlimento, Caso, Plano } from './tipos.ts'

/** Os dois modos da gaveta (D-1300) e o título de cada um, que é o nome do botão que a abre (D-1302). */
export type ModoDaGaveta = 'gerar' | 'ajustar'
export const TITULO_DA_GAVETA: Readonly<Record<ModoDaGaveta, string>> = { gerar: 'Sugerir plano com IA', ajustar: 'Adequar com IA' }

/** AAAA-MM-DD em DD/MM/AAAA. */
export const diaNaTela = (dia: string): string => dia.split('-').reverse().join('/')

/** CB-1315: a frase de sem conexão do app (a mesma da conta). */
export const SEM_CONEXAO_IA = MENSAGEM_ERRO['falha-rede']

// ---------- "Falta na ficha" (seção 6, D-1351) ----------

export type IdPerguntaDaGaveta =
  | 'gosta'
  | 'nao-gosta'
  | 'rotina-trabalho'
  | 'refeicoes-onde'
  | 'outros-nao-come'
  | 'sono-horario'
  | 'orcamento'
  | 'atividade-horario'

export interface PerguntaDaGaveta {
  readonly id: IdPerguntaDaGaveta
  readonly rotulo: string
  readonly exemplo: string
  /** O jeito de responder: texto, os dois horários ou a escolha de três. */
  readonly tipo: 'texto' | 'sono' | 'orcamento'
}

const PERGUNTAS: readonly PerguntaDaGaveta[] = [
  { id: 'gosta', rotulo: 'Alimentos de que gosta', exemplo: 'Ex.: cuscuz, frango, frutas', tipo: 'texto' },
  { id: 'nao-gosta', rotulo: 'Alimentos de que não gosta', exemplo: 'Ex.: fígado, jiló, ou "Nenhum"', tipo: 'texto' },
  { id: 'rotina-trabalho', rotulo: 'Rotina de trabalho ou estudo', exemplo: 'Ex.: escritório, das 8h às 17h', tipo: 'texto' },
  { id: 'refeicoes-onde', rotulo: 'Quem prepara as refeições e onde come', exemplo: 'Ex.: ela mesma; marmita no almoço', tipo: 'texto' },
  { id: 'outros-nao-come', rotulo: 'Outros alimentos que não come', exemplo: 'Ex.: coentro, ou "Nenhum"', tipo: 'texto' },
  { id: 'sono-horario', rotulo: 'Horário de acordar e de dormir', exemplo: '', tipo: 'sono' },
  { id: 'orcamento', rotulo: 'Orçamento', exemplo: '', tipo: 'orcamento' },
  { id: 'atividade-horario', rotulo: 'Horário do exercício', exemplo: 'Ex.: 18h30, três vezes por semana', tipo: 'texto' },
]

/** As três escolhas do orçamento (CA-2379), as mesmas do roteiro. */
export const ORCAMENTOS_DA_GAVETA = ['Econômico', 'Intermediário', 'Sem restrição'] as const

const respostaDe = (paciente: Paciente, id: string): string => paciente.respostasAnamnese.find((r) => r.perguntaId === id)?.resposta.trim() ?? ''

/** Com atividade: a anamnese diz que pratica exercício, ou o nível do plano é ativo ou muito ativo. */
function temAtividade(paciente: Paciente, caso: Caso): boolean {
  const categoria = categoriaDoFator(caso.energia.fator)
  return respostaDe(paciente, 'atividade-pratica') === 'Sim' || categoria === 'ativo' || categoria === 'muito-ativo'
}

/**
 * Seção 6: só as perguntas ainda sem resposta, na ordem da tabela. "Outros alimentos que não come" só sem restrição
 * marcada; o horário do exercício só com atividade. Quem chama escolhe uma vez, ao abrir a gaveta (D-1351).
 */
export function perguntasQueFaltam(paciente: Paciente, caso: Caso): readonly PerguntaDaGaveta[] {
  return PERGUNTAS.filter((p) => {
    if (p.id === 'outros-nao-come') return paciente.restricoes.trim() === '' && paciente.restricoesMarcadas.length === 0
    if (p.id === 'atividade-horario') return temAtividade(paciente, caso) && respostaDe(paciente, p.id) === ''
    return respostaDe(paciente, p.id) === ''
  })
}

/** D-1351: "Acorda às 06:30, dorme às 23:00", com o que houver. */
export function textoDoSono(acorda: string, dorme: string): string {
  const partes = [acorda ? `Acorda às ${acorda}` : '', dorme ? `${acorda ? 'dorme' : 'Dorme'} às ${dorme}` : ''].filter(Boolean)
  return partes.join(', ')
}

/** A pergunta do roteiro padrão e o bloco dela (o texto gravado é o do roteiro, como na ficha). */
function perguntaDoRoteiro(id: string): { readonly bloco: IdBloco; readonly texto: string } | null {
  for (const [bloco, perguntas] of Object.entries(ROTEIRO_PADRAO.perguntas) as [IdBloco, readonly { readonly id: string; readonly texto: string }[]][]) {
    const achada = perguntas.find((q) => q.id === id)
    if (achada) return { bloco, texto: achada.texto }
  }
  return null
}

/**
 * CA-2362 e D-1351: a resposta na ficha. A anamnese pelo `responder`, com o texto da pergunta e o dia; "Outros alimentos
 * que não come" no campo da ficha.
 */
export function responderNaFicha(paciente: Paciente, id: IdPerguntaDaGaveta, resposta: string, dia: string): Paciente {
  if (id === 'outros-nao-come') return { ...paciente, restricoes: resposta }
  const roteiro = perguntaDoRoteiro(id)
  if (!roteiro) return paciente
  return { ...paciente, respostasAnamnese: responder(paciente.respostasAnamnese, { id, texto: roteiro.texto }, roteiro.bloco, resposta, dia) }
}

// ---------- "A ficha tem" (D-1303) ----------

export interface LinhaDaFicha {
  readonly rotulo: string
  readonly valor: string
}

const numero = (v: number, casas = 0): string => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const OBJETIVOS: Readonly<Record<string, string>> = { emagrecer: 'Emagrecer', manter: 'Manter o peso', ganhar: 'Ganhar peso' }

function faseDaVida(caso: Caso): string {
  const c = caso.condicao
  if (c.tipo === 'gestante') return c.semanasGestacao === null ? 'Gestante' : `Gestante, ${c.semanasGestacao} semanas`
  if (c.tipo === 'lactante') return c.mesesPosParto === null ? 'Lactante' : `Lactante, ${c.mesesPosParto} ${c.mesesPosParto === 1 ? 'mês' : 'meses'} pós-parto`
  const idade = caso.idadeAnos
  if (idade === null) return 'Não informada'
  if (idade < 12) return `Criança, ${idade} anos`
  if (idade < 18) return `Adolescente, ${idade} anos`
  if (idade >= 60) return `Idoso, ${idade} anos`
  return `Adulto, ${idade} anos`
}

/** D-1303 (1): o que a ficha tem, só leitura; o que falta fica com "Não informado". */
export function fichaNaGaveta(caso: Caso, paciente: Paciente, restricoes: RestricoesDoPaciente): readonly LinhaDaFicha[] {
  const ou = (texto: string, vazio = 'Não informado') => (texto.trim() === '' ? vazio : texto.trim())
  const medidas = [caso.pesoKg === null ? '' : `${numero(caso.pesoKg, 1)} kg`, caso.estaturaCm === null ? '' : `${numero(caso.estaturaCm)} cm`].filter(Boolean).join(' · ')
  const saude = [...DOENCAS.filter((d) => paciente.doencas.includes(d.id)).map((d) => d.rotulo), paciente.condicoesClinicas.trim(), paciente.medicamentos.trim()].filter(Boolean).join(' · ')
  const objetivo = [caso.objetivo ? (OBJETIVOS[caso.objetivo] ?? '') : '', paciente.objetivo.trim() ? `“${paciente.objetivo.trim()}”` : ''].filter(Boolean).join(' · ')
  return [
    { rotulo: 'Fase da vida', valor: faseDaVida(caso) },
    { rotulo: 'Medidas', valor: ou(medidas, 'Não informadas') },
    { rotulo: 'Saúde', valor: ou(saude, 'Nada marcado') },
    { rotulo: 'Restrições', valor: ou([...restricoes.grupos.map((g) => g.aviso), ...restricoes.textos].join(' · '), 'Nenhuma') },
    { rotulo: 'Não gosta', valor: ou(respostaDe(paciente, 'nao-gosta')) },
    { rotulo: 'Objetivo', valor: ou(objetivo) },
    { rotulo: 'Atividade', valor: atividadeDoFator(caso.energia.fator) },
  ]
}

/** D-1303 (4): as refeições do plano, com nome e horário; sem nenhuma, as 6 padrão. */
export function refeicoesDaGaveta(plano: Plano): readonly RefeicaoIa[] {
  const doPlano = plano.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario }))
  return doPlano.length > 0 ? doPlano : REFEICOES_PADRAO.map((r) => ({ nome: r.nome, horario: r.horario }))
}

/** CA-2363: a linha embaixo da meta de energia. */
export function textoDaMeta(meta: number, calculada: number | null): string {
  if (calculada === null) return ''
  if (Math.round(meta) === Math.round(calculada)) return 'Calculada pela ficha. A sugestão segue esta meta.'
  return `Calculada pela ficha: ${numero(Math.round(calculada))} kcal. A sugestão segue a sua.`
}

// ---------- "O que ajustar" (D-1309, CA-2370) ----------

export interface ItemDoQueAjustar {
  readonly id: string
  readonly nome: string
  readonly valor: string
}

/** A energia fora de 90% a 110% da meta, cada macro fora da faixa, cada nutriente abaixo da meta e cada um acima. */
export function itensDoQueAjustar(lacunas: LacunasIa): readonly ItemDoQueAjustar[] {
  const itens: ItemDoQueAjustar[] = []
  if (lacunas.energiaPct !== null && (lacunas.energiaPct < 90 || lacunas.energiaPct > 110)) itens.push({ id: 'energia', nome: 'Energia', valor: `${numero(lacunas.energiaPct)}% da meta` })
  for (const frase of lacunas.macros) {
    const [nome = frase, ...resto] = frase.split(' ')
    itens.push({ id: `macro:${frase}`, nome, valor: resto.join(' ') })
  }
  for (const a of lacunas.abaixo) itens.push({ id: `abaixo:${a.nutriente}`, nome: a.nutriente, valor: `${numero(a.pct)}%` })
  for (const nome of lacunas.acima) itens.push({ id: `acima:${nome}`, nome, valor: 'acima do limite' })
  return itens
}

/** O pedido leva só o que ficou marcado; a energia desmarcada vai como nula (a IA não mexe nela). */
export function lacunasMarcadas(lacunas: LacunasIa, desmarcadas: ReadonlySet<string>): LacunasIa {
  return {
    energiaPct: desmarcadas.has('energia') ? null : lacunas.energiaPct,
    macros: lacunas.macros.filter((m) => !desmarcadas.has(`macro:${m}`)),
    abaixo: lacunas.abaixo.filter((a) => !desmarcadas.has(`abaixo:${a.nutriente}`)),
    acima: lacunas.acima.filter((a) => !desmarcadas.has(`acima:${a}`)),
  }
}

// ---------- Os erros (CA-2374) ----------

export interface FalhaDaIa {
  /** Nulo: sem resposta (sem internet). Zero: o app sem servidor configurado. */
  readonly status: number | null
  readonly codigo: string | null
  readonly erro: string | null
}

export type AcaoDoErro = 'ver-planos' | 'voltar' | 'tentar' | 'fechar'

export interface ErroDaIa {
  readonly frase: string
  readonly acao: AcaoDoErro
}

/** CA-2374: uma frase só por erro, e o que a gaveta oferece em seguida. */
export function erroDaIa(falha: FalhaDaIa, uso: UsoDoMes | null, agora: Date): ErroDaIa {
  const { status, codigo } = falha
  if (status === null) return { frase: SEM_CONEXAO_IA, acao: 'tentar' }
  if (status === 429 && codigo === 'limite-mes') return { frase: textoDoLimite(uso?.limite ?? LIMITE_DE_SUGESTOES_IA.free, agora), acao: 'ver-planos' }
  if (status === 429) return { frase: MUITAS_SUGESTOES, acao: 'fechar' }
  if (status === 422) return { frase: RECUSA_DA_IA, acao: 'voltar' }
  if (status === 504) return { frase: IA_DEMOROU, acao: 'tentar' }
  if (status === 502 && codigo === 'vazia') return { frase: IA_VAZIA, acao: 'tentar' }
  if (status === 401) return { frase: SEM_SESSAO_IA, acao: 'fechar' }
  // 403: a frase da função (sem autorização, sem perfil, CRN, estudante), que o botão também diz.
  if (status === 403 && falha.erro) return { frase: falha.erro, acao: 'voltar' }
  return { frase: IA_INDISPONIVEL, acao: 'fechar' }
}

// ---------- A resposta da função ----------

export interface RespostaDaFuncao {
  readonly resposta: RespostaDaIa
  readonly uso: UsoDoMes
  /** Quantos itens saíram por estar fora da base, na função e aqui. */
  readonly foraDaBase: number
  /** O modelo que respondeu (D-1352). */
  readonly modelo: string
}

const ehObjeto = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** O contador que a função devolve; fora da forma, nulo. */
export function lerUso(valor: unknown): UsoDoMes | null {
  if (!ehObjeto(valor)) return null
  const { usados, limite, renovaEm } = valor
  if (!Number.isInteger(usados) || !Number.isInteger(limite) || typeof renovaEm !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(renovaEm)) return null
  return { usados: usados as number, limite: limite as number, renovaEm }
}

/**
 * A resposta 200 da função (D-1320), conferida de novo pelo mesmo código da função: o navegador não confia na rede.
 * O que sai aqui por estar fora da base soma no `foraDaBase`.
 */
export function lerRespostaDaFuncao(dados: unknown, contexto: ContextoDaResposta): RespostaDaFuncao | null {
  if (!ehObjeto(dados)) return null
  const uso = lerUso(dados['uso'])
  const modelo = typeof dados['modelo'] === 'string' ? dados['modelo'].slice(0, 64) : ''
  const fora = typeof dados['foraDaBase'] === 'number' && Number.isInteger(dados['foraDaBase']) ? dados['foraDaBase'] : 0
  if (!uso || !ehObjeto(dados['resposta'])) return null
  const conferida = conferirResposta(JSON.stringify(dados['resposta']), contexto)
  if (!conferida.ok) return null
  return { resposta: conferida.resposta, uso, foraDaBase: fora + conferida.foraDaBase, modelo }
}

// ---------- "Vai para …" (D-1309, CA-2371) ----------

/** A chave do item do plano: refeição, opção e número do item, como no pedido. */
export const chaveDoItem = (refeicao: number, opcao: 'principal' | 'opcao2', item: number): string => `${refeicao}:${opcao}:${item}`

/**
 * No plano à esquerda, o item que muda mostra para onde vai: "Vai para 50 g", "Vai para Mamão Papaia, 170 g" ou "Sai do
 * plano". Só as mudanças aceitas e não barradas; a adição não tem item.
 */
export function textosDoVaiPara(mudancas: readonly MudancaConferida[], recusadas: ReadonlySet<number>, buscar: BuscarAlimento): ReadonlyMap<string, string> {
  const textos = new Map<string, string>()
  mudancas.forEach((c, i) => {
    const m = c.mudanca
    if (recusadas.has(i) || c.barrada !== null || m.item === null || m.tipo === 'adicionar') return
    const unidade = (id: number) => unidadeDo(buscar(id))
    const texto =
      m.tipo === 'remover'
        ? 'Sai do plano'
        : c.para === null
          ? null
          : m.tipo === 'gramas'
            ? `Vai para ${numero(c.para.gramas)} ${unidade(c.para.alimentoId)}`
            : `Vai para ${nomeParaPaciente(buscar(c.para.alimentoId))}, ${numero(c.para.gramas)} ${unidade(c.para.alimentoId)}`
    if (texto) textos.set(chaveDoItem(m.refeicao, m.opcao, m.item), texto)
  })
  return textos
}
