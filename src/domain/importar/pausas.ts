// A leitura em partes (spec importar-pacientes, CB-911 e DP-IP-32): a cada fatia de 12 ms de leitura, a vez volta ao
// navegador, que desenha "Lendo a planilha…" e atende o "Cancelar". Pela fatia de tempo, e não por número de registros:
// o arquivo de linhas curtas não para à toa, e o de linhas compridas não segura a aba.

/** O tempo de leitura seguida antes de dar a vez ao navegador (um quadro a 60 Hz tem 16 ms). */
export const FATIA_MS = 12

/** De quantos em quantos registros olhar o relógio: olhar a cada um custaria mais que a leitura. */
const OLHAR_A_CADA = 32

export interface OpcoesDaPausa {
  readonly darAVez?: (() => Promise<void>) | undefined
  readonly sinal?: AbortSignal | undefined
  /** Em milissegundos; o teste passa um relógio que anda como quer. */
  readonly relogio?: (() => number) | undefined
}

const darAVezAoNavegador = (): Promise<void> => new Promise((resolver) => setTimeout(resolver, 0))

/** Chamada a cada registro lido: dá a vez quando a fatia acabou e lança `AbortError` se a leitura foi cancelada. */
export function criarPausa({ darAVez = darAVezAoNavegador, sinal, relogio = () => performance.now() }: OpcoesDaPausa = {}): () => Promise<void> {
  let ultima = relogio()
  let lidos = 0
  return async () => {
    lidos += 1
    if (lidos % OLHAR_A_CADA !== 0 || relogio() - ultima < FATIA_MS) return
    await darAVez()
    if (sinal?.aborted) throw new DOMException('Leitura cancelada.', 'AbortError')
    ultima = relogio()
  }
}
