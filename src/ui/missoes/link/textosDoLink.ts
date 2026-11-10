// Os textos da tela do link que dependem do dado (spec lado-do-paciente, seção 6 da SPEC: "Textos da tela do link").
import { horaNoTexto, type Missao } from '@/domain/missoes.ts'
import type { RefeicaoDaDieta } from '@/domain/dietaDoLink.ts'
import { textoDoPeso, type QuantidadeNaFolha } from '@/domain/quantidadeNaFolha.ts'

const SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })

const lerDia = (dia: string): Date | null => {
  const quando = new Date(`${dia.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(quando.getTime()) ? null : quando
}

/** "terça-feira, 3 de novembro". */
export function dataDeHoje(dia: string): string {
  const quando = lerDia(dia)
  return quando ? `${SEMANA.format(quando)}, ${quando.getUTCDate()} de ${MES.format(quando)}` : ''
}

/** "Atualizado em 3 de novembro."; de outro ano, com o ano. */
export function atualizadoEm(dia: string, hoje: string): string {
  const quando = lerDia(dia)
  if (!quando) return ''
  const ano = dia.slice(0, 4) === hoje.slice(0, 4) ? '' : ` de ${quando.getUTCFullYear()}`
  return `Atualizado em ${quando.getUTCDate() === 1 ? '1º' : quando.getUTCDate()} de ${MES.format(quando)}${ano}.`
}

/** "Juliana Martins, 34 anos" → "Juliana"; sem nome, vazio (CB-1227). */
export const primeiroNomeDoLink = (nome: string): string => nome.trim().split(/[\s,;]+/)[0] ?? ''

/** CB-1227: sem primeiro nome, o título fica sem ele, sem vírgula sobrando. */
export function tituloDeHoje(tudoFeito: boolean, primeiroNome: string): string {
  if (tudoFeito) return primeiroNome ? `Dia completo, ${primeiroNome}.` : 'Dia completo.'
  return primeiroNome ? `Suas missões de hoje, ${primeiroNome}` : 'Suas missões de hoje'
}

/** "Seu plano alimentar, Juliana"; sem nome, "Seu plano alimentar". */
export const tituloDoPlano = (primeiroNome: string): string => (primeiroNome ? `Seu plano alimentar, ${primeiroNome}` : 'Seu plano alimentar')

/** As refeições que se dizem com "a": "a ceia", "a colação". */
const FEMININAS = /^(ceia|colação|merenda|refeição|sobremesa)\b/i

/** CA-2206: "Ver o almoço no plano", "Ver a ceia no plano". */
export function rotuloDoVer(nomeDaRefeicao: string): string {
  const nome = nomeDaRefeicao.trim().toLocaleLowerCase('pt-BR')
  return `Ver ${FEMININAS.test(nome) ? 'a' : 'o'} ${nome} no plano`
}

/**
 * A refeição da dieta que corresponde à missão (D-1205). A missão de refeição (`refeicao-<id>`) foi escrita com o nome
 * e a hora da refeição ("Almoço por volta das 12h30", `missoesDoPlano`); a cópia da dieta não guarda o id, então a
 * ligação é pelo mesmo texto. Sem dieta, ou sem a refeição na cópia, nulo (a missão não tem "Ver").
 */
export function refeicaoDaMissao(missao: Pick<Missao, 'id' | 'texto'>, refeicoes: readonly Pick<RefeicaoDaDieta, 'nome' | 'horario'>[]): number | null {
  if (!missao.id.startsWith('refeicao-')) return null
  const indice = refeicoes.findIndex((r) => `${r.nome} ${horaNoTexto(r.horario)}` === missao.texto)
  return indice < 0 ? null : indice
}

/**
 * Como o Plano desenha a quantidade (D-1206, CA-2209): "Medida e gramas", as gramas à direita e a medida embaixo do nome;
 * "Só medida", a medida à direita; "Só gramas" (ou sem medida conhecida, CB-156), as gramas à direita. A medida que não
 * fecha em meia medida vai "cerca de" embaixo, com o peso à direita (D-434).
 */
export function quantidadeNoPlano(q: QuantidadeNaFolha): { readonly direita: string; readonly embaixo: string | null } {
  const peso = textoDoPeso(q.gramas, q.unidade)
  if (q.medida === null) return { direita: peso, embaixo: null }
  if (q.aproximada) return { direita: peso, embaixo: `cerca de ${q.medida}` }
  return q.comPeso ? { direita: peso, embaixo: q.medida } : { direita: q.medida, embaixo: null }
}
