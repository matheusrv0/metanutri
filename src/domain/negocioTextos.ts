// Os textos do painel do dono (spec painel-do-dono): dinheiro, datas no horário de
// Brasília e os selos da lista de contas. É aqui que o centavo é arredondado.
import { planoPorId, type Ciclo, type IdPlano } from './conta.ts'
import { FUSO_BRASILIA_MS, PLANOS_PAGOS, ehPaga, type AssinaturaNoPainel, type ContaNoPainel } from './negocio.ts'

export type TomDoSelo = 'sucesso' | 'info' | 'aviso' | 'neutro'

export interface Selo {
  readonly texto: string
  readonly tom: TomDoSelo
}

export interface TextoDoPlano {
  readonly texto: string
  /** Com tom, o texto vira selo (plano pago ativo); sem tom, é texto corrido. */
  readonly tom: TomDoSelo | null
  readonly aviso: Selo | null
}

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const DIA_MS = 86_400_000

/** 123585 → "R$ 1.235,85". O Intl põe um espaço que não quebra depois do "R$". */
export const reais = (centavos: number): string => REAIS.format(Math.round(centavos) / 100)

export const inteiro = (n: number): string => INTEIRO.format(n)

export const porcentagem = (parte: number): string => `${Math.round(parte * 100)}%`

/** CA-346. O sinal de menos é o tipográfico (−), não o hífen. */
export function diferencaEm30Dias(centavos: number): string {
  const arredondado = Math.round(centavos)
  if (arredondado === 0) return 'Igual a 30 dias atrás'
  return `${arredondado > 0 ? '+' : '−'}${reais(Math.abs(arredondado))} em 30 dias`
}

/** CA-347. */
export const parteQuePaga = (parte: number | null): string => (parte === null ? 'Nenhuma conta ainda' : `${porcentagem(parte)} das contas pagam`)

/** Marca do eixo do gráfico, em reais inteiros: 150000 → "1.500". */
export const marcaDoEixo = (centavos: number): string => INTEIRO.format(centavos / 100)

/** CA-352: "mensal · R$ 64,90", com o preço de tabela do plano. */
export function detalheDoPlano(plano: IdPlano, ciclo: Ciclo): string {
  const tabela = planoPorId(plano)
  const preco = ciclo === 'anual' ? (tabela?.anual ?? 0) : (tabela?.mensal ?? 0)
  return `${ciclo} · ${reais(preco * 100)}`
}

/** CB-85: a data como se lê em Brasília. Entrada inválida devolve vazio. */
export function dataEmBrasilia(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? DATA.format(t) : ''
}

/** CA-363: "14:32". */
export const horaEmBrasilia = (d: Date): string => HORA.format(d)

const diaEmBrasilia = (t: number): number => Math.floor((t - FUSO_BRASILIA_MS) / DIA_MS)

/** CA-359: hoje, ontem, há N dias (até 30), a data, ou nunca. */
export function ultimoLogin(iso: string | null, agora: Date): string {
  if (!iso) return 'nunca'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'nunca'
  const dias = diaEmBrasilia(agora.getTime()) - diaEmBrasilia(t)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias <= 30) return `há ${dias} dias`
  return dataEmBrasilia(iso)
}

/** CA-357: as mesmas cores de Aprovações (conferido verde, em conferência azul, não encontrado âmbar). */
export function seloDaSituacao(c: ContaNoPainel): { readonly situacao: string; readonly selo: Selo | null } {
  if (c.situacao === 'nutricionista') {
    if (c.crnStatus === 'conferido') return { situacao: 'Nutricionista', selo: { texto: c.crnRegiao ? `CRN-${c.crnRegiao} conferido` : 'CRN conferido', tom: 'sucesso' } }
    if (c.crnStatus === 'nao_encontrado') return { situacao: 'Nutricionista', selo: { texto: 'CRN não encontrado', tom: 'aviso' } }
    return { situacao: 'Nutricionista', selo: { texto: 'CRN em conferência', tom: 'info' } }
  }
  if (c.situacao === 'estudante') {
    if (c.pedidoStatus === 'aprovado') return { situacao: 'Estudante', selo: { texto: 'Matrícula aprovada', tom: 'sucesso' } }
    if (c.pedidoStatus === 'em_analise') return { situacao: 'Estudante', selo: { texto: 'Comprovante em análise', tom: 'info' } }
    if (c.pedidoStatus === 'recusado') return { situacao: 'Estudante', selo: { texto: 'Comprovante recusado', tom: 'aviso' } }
    return { situacao: 'Estudante', selo: { texto: 'Sem comprovante', tom: 'neutro' } }
  }
  return { situacao: 'Sem situação', selo: null }
}

const nomeComCiclo = (a: AssinaturaNoPainel): string => {
  const nome = planoPorId(a.plano)?.nome ?? 'Free'
  return PLANOS_PAGOS.includes(a.plano) ? `${nome} ${a.ciclo ?? 'mensal'}` : nome
}

/** CA-358. */
export function textoDoPlano(c: ContaNoPainel, agora: Date): TextoDoPlano {
  const a = c.assinatura
  if (!a) return { texto: 'Free', tom: null, aviso: null }
  if (ehPaga(a)) return { texto: nomeComCiclo(a), tom: 'sucesso', aviso: null }
  if (a.status === 'pendente') return { texto: nomeComCiclo(a), tom: null, aviso: { texto: 'Pagamento pendente', tom: 'aviso' } }
  if (a.status === 'pausada') return { texto: nomeComCiclo(a), tom: null, aviso: { texto: 'Pausada', tom: 'aviso' } }
  const estudanteNoPrazo = a.plano === 'estudante' && a.status === 'ativa' && (a.expiraEm === null || Date.parse(a.expiraEm) > agora.getTime())
  return { texto: estudanteNoPrazo ? 'Estudante' : 'Free', tom: null, aviso: null }
}
