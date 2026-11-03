// O arquivo escolhido vira a planilha lida (spec importar-pacientes, D-901 a D-903): decide pelo nome se é CSV ou XLSX,
// recusa o que não é (com a frase de como salvar), recusa acima de 5 MB sem ler, lê em partes dando a vez ao navegador
// e para no "Cancelar" (CB-911). Tudo na memória da aba (D-914): nada é gravado, registrado ou mandado.
import { analisarAba, LIMITE_DE_LINHAS, type AnaliseDaAba } from './colunas.ts'
import { decodificar, detectarSeparador, lerRegistros, registroComTexto, type Registro, type Separador } from './lerTexto.ts'
import { lerXlsx } from './lerXlsx.ts'
import type { Recusa } from './textos.ts'

/** DP-IP-4: 5 MB, como o comprovante de matrícula. */
export const LIMITE_DE_BYTES = 5 * 1024 * 1024

/**
 * Quantas linhas com texto juntar de cada aba: as 2.000 de paciente, o cabeçalho e até 10 linhas de título. Passou
 * disso, passou do limite qualquer que seja o cabeçalho (CA-1910: nada é lido além do necessário para contar).
 */
const LINHAS_A_JUNTAR = LIMITE_DE_LINHAS + 11

/** O CSV dá a vez ao navegador a cada tantos registros (DP-IP-32). O XLSX, a cada 250 linhas (`lerXlsx`). */
const REGISTROS_POR_VEZ = 500

/** O arquivo, sem depender do `File` do navegador: a tela passa o `File`, o teste passa bytes. */
export interface ArquivoParaLer {
  readonly nome: string
  readonly tamanho: number
  bytes(): Promise<ArrayBuffer>
}

export interface AbaDaPlanilha {
  readonly nome: string
  readonly analise: AnaliseDaAba
}

export interface PlanilhaLida {
  readonly tipo: 'csv' | 'xlsx'
  /** O separador do CSV, que o arquivo das que ficaram de fora repete; no XLSX, ponto e vírgula (DP-IP-22). */
  readonly separador: Separador
  readonly abas: readonly AbaDaPlanilha[]
  /** A aba que abre escolhida: a primeira com pacientes. */
  readonly abaInicial: number
}

export type ResultadoDaLeitura = { readonly tipo: 'lida'; readonly planilha: PlanilhaLida } | { readonly tipo: 'recusada'; readonly recusa: Recusa } | { readonly tipo: 'cancelada' }

export interface OpcoesDaLeitura {
  readonly sinal?: AbortSignal | undefined
  readonly darAVez?: (() => Promise<void>) | undefined
}

const darAVezAoNavegador = (): Promise<void> => new Promise((resolver) => setTimeout(resolver, 0))

const extensao = (nome: string): string => {
  const ponto = nome.lastIndexOf('.')
  return ponto < 0 ? '' : nome.slice(ponto + 1).toLowerCase()
}

const ehCancelamento = (erro: unknown): boolean => erro instanceof DOMException && erro.name === 'AbortError'

/** O texto não é texto: tem caractere nulo ou muito caractere de controle (um binário renomeado, CB-910). */
function pareceBinario(texto: string): boolean {
  const amostra = texto.slice(0, 64 * 1024)
  if (amostra.includes('\u0000')) return true
  let controles = 0
  for (let i = 0; i < amostra.length; i += 1) {
    const codigo = amostra.charCodeAt(i)
    if ((codigo >= 1 && codigo <= 8) || (codigo >= 14 && codigo <= 31)) controles += 1
  }
  // Um ou outro controle num texto (o Ctrl-Z do fim, CB-922) é limpo na leitura (D-918); binário tem muitos.
  return controles > Math.max(8, amostra.length / 20)
}

async function lerCsv(bytes: Uint8Array, tsv: boolean, sinal: AbortSignal | undefined, darAVez: () => Promise<void>): Promise<{ separador: Separador; registros: Registro[]; cortada: boolean } | null> {
  // Um zip (o XLSX chamado de .csv) começa com "PK".
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return null
  const { texto } = decodificar(bytes)
  if (pareceBinario(texto)) return null
  const separador: Separador = tsv ? '\t' : detectarSeparador(texto)
  const registros: Registro[] = []
  let cortada = false
  let lidos = 0
  for (const registro of lerRegistros(texto, separador)) {
    lidos += 1
    if (lidos % REGISTROS_POR_VEZ === 0) {
      await darAVez()
      if (sinal?.aborted) throw new DOMException('Leitura cancelada.', 'AbortError')
    }
    if (!registroComTexto(registro.celulas)) continue
    if (registros.length === LINHAS_A_JUNTAR) {
      cortada = true
      break
    }
    registros.push(registro)
  }
  return { separador, registros, cortada }
}

/** Lê o arquivo. Nunca lança: o que dá errado vira recusa; o "Cancelar", `cancelada`. */
export async function lerPlanilha(arquivo: ArquivoParaLer, { sinal, darAVez = darAVezAoNavegador }: OpcoesDaLeitura = {}): Promise<ResultadoDaLeitura> {
  const tipo = extensao(arquivo.nome)
  if (tipo === 'xls' || tipo === 'ods' || tipo === 'numbers') return { tipo: 'recusada', recusa: { tipo } }
  if (!['csv', 'txt', 'tsv', 'xlsx'].includes(tipo)) return { tipo: 'recusada', recusa: { tipo: 'nao-e-planilha', nome: arquivo.nome } }
  if (arquivo.tamanho > LIMITE_DE_BYTES) return { tipo: 'recusada', recusa: { tipo: 'grande' } }

  try {
    const bytes = new Uint8Array(await arquivo.bytes())
    if (sinal?.aborted) return { tipo: 'cancelada' }

    let planilha: Omit<PlanilhaLida, 'abaInicial'>
    if (tipo === 'xlsx') {
      const abas = await lerXlsx(bytes, { limiteDeLinhas: LINHAS_A_JUNTAR, sinal, darAVez })
      planilha = { tipo: 'xlsx', separador: ';', abas: abas.map((aba) => ({ nome: aba.nome, analise: analisarAba(aba.registros, aba.cortada) })) }
    } else {
      const csv = await lerCsv(bytes, tipo === 'tsv', sinal, darAVez)
      if (csv === null) return { tipo: 'recusada', recusa: { tipo: 'ilegivel' } }
      planilha = { tipo: 'csv', separador: csv.separador, abas: [{ nome: arquivo.nome, analise: analisarAba(csv.registros, csv.cortada) }] }
    }
    if (sinal?.aborted) return { tipo: 'cancelada' }

    const abaInicial = planilha.abas.findIndex((aba) => aba.analise.linhas.length > 0)
    const escolhida = planilha.abas[abaInicial]
    if (escolhida === undefined) return { tipo: 'recusada', recusa: { tipo: 'vazia' } }
    if (escolhida.analise.excede) return { tipo: 'recusada', recusa: { tipo: 'linhas' } }
    return { tipo: 'lida', planilha: { ...planilha, abaInicial } }
  } catch (erro) {
    if (ehCancelamento(erro) || sinal?.aborted) return { tipo: 'cancelada' }
    return { tipo: 'recusada', recusa: { tipo: 'ilegivel' } }
  }
}
