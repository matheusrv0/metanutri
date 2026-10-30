// O leitor de zip mínimo do XLSX (spec importar-pacientes, D-902): o XLSX é um zip com XML dentro, e o navegador já
// sabe descomprimir (`DecompressionStream('deflate-raw')`). Lê o diretório central do fim do arquivo e abre só as
// entradas pedidas. Sem ZIP64 nem criptografia, que o Excel não usa numa planilha de pacientes (DP-IP-3).

const FIM_DO_DIRETORIO = 0x06054b50
const ENTRADA_DO_DIRETORIO = 0x02014b50
const CABECALHO_LOCAL = 0x04034b50

/** DP-IP-3: o quanto uma entrada e todas juntas podem ter depois de abertas. */
const TETO_POR_ENTRADA = 64 * 1024 * 1024
const TETO_TOTAL = 128 * 1024 * 1024

interface Entrada {
  readonly metodo: number
  readonly criptografada: boolean
  readonly comprimido: number
  readonly tamanho: number
  readonly deslocamento: number
}

export interface Zip {
  /** Os nomes das entradas, na ordem do diretório. */
  readonly nomes: readonly string[]
  /** O conteúdo aberto da entrada; `null` quando ela não existe. Recusa (lança) o que não sabe ou não deve abrir. */
  ler(nome: string): Promise<Uint8Array | null>
}

export interface OpcoesDoZip {
  readonly tetoPorEntrada?: number
  readonly tetoTotal?: number
}

/** O fim do diretório central: procura de trás para a frente, por causa do comentário que pode vir depois. */
function acharFim(visao: DataView): number {
  const menor = Math.max(0, visao.byteLength - 22 - 0xffff)
  for (let i = visao.byteLength - 22; i >= menor; i -= 1) if (visao.getUint32(i, true) === FIM_DO_DIRETORIO) return i
  throw new Error('Não é um zip.')
}

async function inflar(dados: Uint8Array, teto: number): Promise<Uint8Array> {
  const fluxo = new ReadableStream<BufferSource>({
    start(controle) {
      controle.enqueue(dados.slice())
      controle.close()
    },
  }).pipeThrough(new DecompressionStream('deflate-raw'))
  const leitor = fluxo.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.length
    if (total > teto) {
      await leitor.cancel()
      throw new Error('Entrada grande demais.')
    }
    partes.push(value)
  }
  const saida = new Uint8Array(total)
  let posicao = 0
  for (const parte of partes) {
    saida.set(parte, posicao)
    posicao += parte.length
  }
  return saida
}

/** Lê o diretório do zip. Lança quando os bytes não são um zip. */
export async function abrirZip(bytes: Uint8Array, opcoes: OpcoesDoZip = {}): Promise<Zip> {
  const tetoPorEntrada = opcoes.tetoPorEntrada ?? TETO_POR_ENTRADA
  const tetoTotal = opcoes.tetoTotal ?? TETO_TOTAL
  if (bytes.length < 22) throw new Error('Não é um zip.')
  const visao = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fim = acharFim(visao)
  const quantas = visao.getUint16(fim + 10, true)
  let posicao = visao.getUint32(fim + 16, true)
  if (posicao === 0xffffffff || quantas === 0xffff) throw new Error('ZIP64 não é aceito.')

  const nomes: string[] = []
  const entradas = new Map<string, Entrada>()
  const decodificador = new TextDecoder()
  for (let n = 0; n < quantas; n += 1) {
    if (posicao + 46 > bytes.length || visao.getUint32(posicao, true) !== ENTRADA_DO_DIRETORIO) throw new Error('Diretório estragado.')
    const bandeiras = visao.getUint16(posicao + 8, true)
    const metodo = visao.getUint16(posicao + 10, true)
    const comprimido = visao.getUint32(posicao + 20, true)
    const tamanho = visao.getUint32(posicao + 24, true)
    const tamanhoDoNome = visao.getUint16(posicao + 28, true)
    const extra = visao.getUint16(posicao + 30, true)
    const comentario = visao.getUint16(posicao + 32, true)
    const deslocamento = visao.getUint32(posicao + 42, true)
    const nome = decodificador.decode(bytes.subarray(posicao + 46, posicao + 46 + tamanhoDoNome))
    nomes.push(nome)
    entradas.set(nome, { metodo, criptografada: (bandeiras & 1) === 1, comprimido, tamanho, deslocamento })
    posicao += 46 + tamanhoDoNome + extra + comentario
  }

  let aberto = 0
  return {
    nomes,
    async ler(nome) {
      const entrada = entradas.get(nome)
      if (entrada === undefined) return null
      if (entrada.criptografada) throw new Error('Entrada criptografada.')
      if (entrada.comprimido === 0xffffffff || entrada.tamanho === 0xffffffff) throw new Error('ZIP64 não é aceito.')
      const local = entrada.deslocamento
      if (local + 30 > bytes.length || visao.getUint32(local, true) !== CABECALHO_LOCAL) throw new Error('Entrada estragada.')
      const inicio = local + 30 + visao.getUint16(local + 26, true) + visao.getUint16(local + 28, true)
      const guardado = bytes.subarray(inicio, inicio + entrada.comprimido)
      if (guardado.length !== entrada.comprimido) throw new Error('Entrada cortada.')
      const restante = tetoTotal - aberto
      const teto = Math.min(tetoPorEntrada, restante)
      let conteudo: Uint8Array
      if (entrada.metodo === 0) {
        if (guardado.length > teto) throw new Error('Entrada grande demais.')
        conteudo = guardado
      } else if (entrada.metodo === 8) conteudo = await inflar(guardado, teto)
      else throw new Error('Compressão desconhecida.')
      aberto += conteudo.length
      return conteudo
    },
  }
}
