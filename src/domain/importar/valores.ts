// A leitura dos valores de cada linha (spec importar-pacientes, D-907): sexo, data de nascimento, nome e telefone, nos
// formatos do Excel e dos sistemas brasileiros. O que não dá para ler vira o problema da linha (D-908), que a
// nutricionista resolve na prévia.
import type { Sexo } from '../tipos.ts'

export type LeituraDoSexo = { readonly tipo: 'ok'; readonly sexo: Sexo } | { readonly tipo: 'vazio' } | { readonly tipo: 'nao-reconhecido' }

const FEMININO = new Set(['f', 'fem', 'feminino', 'mulher', 'female'])
const MASCULINO = new Set(['m', 'masc', 'masculino', 'homem', 'male'])

const semAcento = (texto: string): string => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** CA-1918: F, fem., feminino, mulher e female são F; M, masc., masculino, homem e male são M. */
export function lerSexo(texto: string): LeituraDoSexo {
  const limpo = semAcento(texto).toLowerCase().trim().replace(/\.$/, '')
  if (limpo === '') return { tipo: 'vazio' }
  if (FEMININO.has(limpo)) return { tipo: 'ok', sexo: 'F' }
  if (MASCULINO.has(limpo)) return { tipo: 'ok', sexo: 'M' }
  return { tipo: 'nao-reconhecido' }
}

export type OrdemDasDatas = 'dm' | 'md'

export type LeituraDaData = { readonly tipo: 'vazia' } | { readonly tipo: 'ok'; readonly iso: string } | { readonly tipo: 'invalida' }

/** AAAA-MM-DD (ou AAAA/MM/DD), com ou sem a hora depois. */
const ANO_PRIMEIRO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/
/** D/M/AAAA, D-M-AA, D.M.AAAA…, com ou sem a hora (e o AM/PM) depois. */
const DIA_E_MES = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:[ ,T]+\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?(?:\s*[ap]\.?\s*m\.?)?)?$/i
/** O número de série do Excel, que um CSV exportado de uma coluna de data pode trazer (DP-IP-35). */
const SERIE = /^\d{1,7}(?:[.,]\d+)?$/

const DIA_MS = 86_400_000

/** O dia de hoje no relógio de quem usa (AAAA-MM-DD). */
function diaDeHoje(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

const dois = (n: number): string => String(n).padStart(2, '0')

/** O dia existe no calendário (31/02 não). */
function existe(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
}

/** CB-907: até o ano atual, 20xx; acima dele, 19xx. */
function anoCompleto(ano: string, hoje: string): number {
  if (ano.length === 4) return Number(ano)
  const doisDigitos = Number(ano)
  return doisDigitos <= Number(hoje.slice(2, 4)) ? 2000 + doisDigitos : 1900 + doisDigitos
}

/** A data de nascimento que dá para aceitar: existe, não é futura e não tem mais de 120 anos (D-908). */
function validar(ano: number, mes: number, dia: number, hoje: string): LeituraDaData {
  if (!existe(ano, mes, dia)) return { tipo: 'invalida' }
  const iso = `${String(ano).padStart(4, '0')}-${dois(mes)}-${dois(dia)}`
  const limite = `${String(Number(hoje.slice(0, 4)) - 120).padStart(4, '0')}${hoje.slice(4)}`
  if (iso > hoje || iso < limite) return { tipo: 'invalida' }
  return { tipo: 'ok', iso }
}

/**
 * CA-1919: os formatos do D-907. `hoje` é o dia de calendário (AAAA-MM-DD); `ordem`, como a coluna se lê (CA-1920).
 * Vazia não é problema; texto que não é data, data que não existe, futura ou de mais de 120 anos é "Data inválida".
 */
export function lerData(texto: string, hoje: string, ordem: OrdemDasDatas = 'dm'): LeituraDaData {
  const limpo = texto.trim()
  if (limpo === '') return { tipo: 'vazia' }
  const anoPrimeiro = ANO_PRIMEIRO.exec(limpo)
  if (anoPrimeiro) return validar(Number(anoPrimeiro[1]), Number(anoPrimeiro[2]), Number(anoPrimeiro[3]), hoje)
  const diaEMes = DIA_E_MES.exec(limpo)
  if (diaEMes) {
    const [a, b] = [Number(diaEMes[1]), Number(diaEMes[2])]
    const [dia, mes] = ordem === 'dm' ? [a, b] : [b, a]
    return validar(anoCompleto(diaEMes[3] ?? '', hoje), mes, dia, hoje)
  }
  if (SERIE.test(limpo)) {
    const serie = Math.floor(Number(limpo.replace(',', '.')))
    if (serie < 1) return { tipo: 'invalida' }
    // O Excel conta o 29/02/1900, que não existiu: a partir do dia 60 a base é um dia antes.
    const base = serie > 59 ? Date.UTC(1899, 11, 30) : Date.UTC(1899, 11, 31)
    const data = new Date(base + serie * DIA_MS)
    return validar(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate(), hoje)
  }
  return { tipo: 'invalida' }
}

/**
 * CA-1920: se alguma data da coluna só existe como mês/dia e nenhuma só como dia/mês, a coluna inteira é mês/dia.
 * Todas ambíguas (dia e mês até 12) ficam dia/mês, o padrão do Brasil (CB-906). O ano de dois dígitos é completado antes
 * de conferir o dia, como na leitura (CB-907, CB-931): sem isso, "03/25/90" não existia em nenhuma das duas ordens.
 */
export function ordemDasDatas(textos: readonly string[], hoje: string = diaDeHoje()): OrdemDasDatas {
  let soMesDia = 0
  let soDiaMes = 0
  for (const texto of textos) {
    const partes = DIA_E_MES.exec(texto.trim())
    if (!partes) continue
    const [a, b, ano] = [Number(partes[1]), Number(partes[2]), anoCompleto(partes[3] ?? '', hoje)]
    const comoDiaMes = existe(ano, b, a)
    const comoMesDia = existe(ano, a, b)
    if (comoMesDia && !comoDiaMes) soMesDia += 1
    if (comoDiaMes && !comoMesDia) soDiaMes += 1
  }
  return soMesDia > 0 && soDiaMes === 0 ? 'md' : 'dm'
}

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * D-907: espaços a mais saem; o nome todo em maiúsculas (sistema antigo) vira nome próprio, com de, da, do, das, dos e
 * "e" em minúscula, menos na primeira palavra. Hífen e apóstrofo também começam palavra (DP-IP-33). O resto fica como
 * veio: "juliana Ferreira" foi escrito assim por alguém.
 */
export function arrumarNome(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  const maiusculas = limpo.toLocaleUpperCase('pt-BR')
  const minusculas = limpo.toLocaleLowerCase('pt-BR')
  if (limpo !== maiusculas || limpo === minusculas) return limpo
  return minusculas
    .split(' ')
    .map((palavra, posicao) => (posicao > 0 && PARTICULAS.has(palavra) ? palavra : palavra.replace(/(^|[-'’])(\p{L})/gu, (_, antes: string, letra: string) => `${antes}${letra.toLocaleUpperCase('pt-BR')}`)))
    .join(' ')
}

/** CB-908 e DP-IP-34: o número que o CSV já trouxe em notação científica ("5,51199E+12") se perdeu; o resto vem como veio. */
export function lerTelefone(texto: string): string {
  const limpo = texto.trim()
  return /^\d+(?:[.,]\d+)?e\+?\d+$/i.test(limpo) ? '' : limpo
}
