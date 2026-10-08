// O motor que mantém os dados da conta na nuvem (spec dados-na-nuvem, D-128 a D-133).
//
// A linha da conta em `copias` é a fonte da verdade; o espaço da conta no navegador é a cópia de
// trabalho. Ao entrar, o motor traz a cópia da nuvem (e junta com o que já estava aqui, D-133). Toda
// mudança passa pelo observador (`observarMudancas`), que marca o item e avisa o motor; 2 s depois
// da última, a cópia inteira vai para a nuvem com conferência de versão. Se outro aparelho salvou
// antes, o motor lê, junta item por item, grava aqui e manda de novo (D-132). Sem internet, trava
// (D-130); quando ela volta, o que faltava sobe e destrava.
//
// Não sabe nada de React: a árvore liga, desliga e escuta o estado (`ProvedorNuvem`).
import type { ArmazenamentoDaConta } from './armazenamentoDaConta.ts'
import { aplicarCopia, copiaSemItens, copiasIguais, ehChaveDaNuvem, itensDaCopia, juntarCopias, momentoDaCopia, montarCopia, registrarMudanca, semPendencias } from './copiaDaConta.ts'
import { gravarCopia, lerCopia, lerVersao, prazoParaTamanho, type ClienteDaCopia } from './copiaNaNuvem.ts'
import type { Backup } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'

/** Só do navegador, nunca na cópia: a versão da nuvem que ele conhece e os contadores de mudanças (DP-2). */
export const CHAVE_NUVEM = 'metanutri:nuvem'

/** D-129: salva esta espera depois da última mudança (DP-7). */
export const ESPERA_PARA_SALVAR_MS = 2000
/** DP-8: travado, tenta de novo a cada tanto, mesmo sem o evento `online`. */
export const INTERVALO_DE_TENTATIVA_MS = 15_000
/** DP-20: sem nada pendente, de quanto em quanto tempo a aba confere se outro aparelho salvou. */
export const CONFERIR_A_CADA_MS = 60_000
/** DP-5: voltas de "outro aparelho salvou antes" numa gravação, antes de deixar para a próxima mudança. */
const VOLTAS = 5

export type FaseDaNuvem = 'abrindo' | 'sem-conexao' | 'formato-desconhecido' | 'pronta'
/** D-130 (rede), CB-123 (tamanho) e DP-23 (o navegador não tem espaço para a cópia de trabalho). */
export type TravaDaNuvem = 'sem-internet' | 'grande-demais' | 'sem-espaco'

/** Uma cópia a caminho da nuvem, até qual mudança daqui ela leva e se levava uma mudança só lembrada em memória. */
interface Envio {
  readonly copia: Backup
  readonly ate: number
  readonly lembrada: boolean
  /** A versão contra a qual mandar, quando não é a guardada (a cópia juntada com a cópia daqui parcial, DP-29). */
  readonly versao?: string | null
}

export interface EstadoDaNuvem {
  /** `pronta` depois de a cópia da nuvem chegar; antes, a área de trabalho espera (CA-484). */
  readonly fase: FaseDaNuvem
  /** Há mudança daqui que ainda não está na nuvem. */
  readonly pendente: boolean
  readonly salvando: boolean
  /** D-130 e CB-123: a área de trabalho fica coberta. */
  readonly trava: TravaDaNuvem | null
  /** CB-123: a pessoa tirou a capa da trava de tamanho para reduzir os dados (DP-9). */
  readonly reduzindo: boolean
  /** Sobe quando a nuvem trouxe mudança para a cópia de trabalho: a área de trabalho remonta (DP-18). */
  readonly geracao: number
  /** CB-127: conferindo a nuvem ao voltar para a aba; a área espera, coberta por "Atualizando…" (DP-20). */
  readonly conferindo: boolean
}

/** O que fica no navegador sobre a nuvem (DP-2). As abas da mesma conta dividem. */
export interface Situacao {
  readonly versao: string | null
  /** Quantas mudanças daqui já houve; `salvas`, até qual delas a nuvem tem. */
  readonly mudancas: number
  readonly salvas: number
  /** Quantos itens a cópia da nuvem tinha da última vez (DP-11). */
  readonly itens: number
  /** A conta saiu nesta aba: as outras param antes de o espaço sumir (DP-11). */
  readonly saiu?: true
  /** DP-29: a cópia de trabalho deste navegador ficou parcial (não coube); nenhuma aba manda nada dela. */
  readonly parcial?: true
}

const SITUACAO_INICIAL: Situacao = { versao: null, mudancas: 0, salvas: 0, itens: 0 }

export function lerSituacao(armazenamento: Armazenamento): Situacao | null {
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE_NUVEM) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null) return null
    const o = bruto as Record<string, unknown>
    const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return {
      versao: typeof o['versao'] === 'string' ? o['versao'] : null,
      mudancas: numero(o['mudancas']),
      salvas: numero(o['salvas']),
      itens: numero(o['itens']),
      ...(o['saiu'] === true ? { saiu: true as const } : {}),
      ...(o['parcial'] === true ? { parcial: true as const } : {}),
    }
  } catch {
    return null
  }
}

/** O valor novo da chave da nuvem, vindo do evento `storage` de outra aba: a conta saiu lá? */
export function saiuDaConta(valor: string | null): boolean {
  if (valor === null) return true
  try {
    const bruto: unknown = JSON.parse(valor)
    return typeof bruto === 'object' && bruto !== null && (bruto as Record<string, unknown>)['saiu'] === true
  } catch {
    return false
  }
}

/** O valor novo da chave da nuvem, vindo do evento `storage` de outra aba: a cópia daqui ficou parcial (DP-29)? */
export function ficouParcial(valor: string | null): boolean {
  if (valor === null) return false
  try {
    const bruto: unknown = JSON.parse(valor)
    return typeof bruto === 'object' && bruto !== null && (bruto as Record<string, unknown>)['parcial'] === true
  } catch {
    return false
  }
}

/** Soma uma mudança no contador do navegador (DP-2). */
export function contarMudanca(armazenamento: Armazenamento): void {
  const atual = lerSituacao(armazenamento) ?? SITUACAO_INICIAL
  armazenamento.setItem(CHAVE_NUVEM, JSON.stringify({ ...atual, mudancas: atual.mudancas + 1 }))
}

/**
 * O ponto único por onde passa toda gravação de dado da conta (DP-2): conta a mudança, grava, marca o
 * item que mudou (ou a lápide do que saiu) e avisa. A conta vem antes do dado (DP-23): com o navegador
 * cheio, a pendência fica guardada mesmo que a marca não caiba. `contou` é falso quando nem a conta
 * coube: o motor lembra da mudança em memória.
 */
export function observarMudancas(conta: ArmazenamentoDaConta, aoMudar: (contou: boolean) => void, agora: () => string = () => new Date().toISOString()): ArmazenamentoDaConta {
  const ler = (chave: string): string | null => {
    try {
      return conta.getItem(chave)
    } catch {
      return null
    }
  }
  const gravar = (chave: string, depois: string | null, fazer: () => void) => {
    const antes = ler(chave)
    if (antes === depois || !ehChaveDaNuvem(chave)) {
      fazer()
      return
    }
    let contou = true
    try {
      contarMudanca(conta)
    } catch {
      contou = false
    }
    fazer()
    try {
      registrarMudanca(conta, chave, antes, depois, agora())
    } catch {
      // sem espaço para a marca: a mudança já está contada e sobe; só a hora dela fica de fora
    }
    aoMudar(contou)
  }
  return {
    usuarioId: conta.usuarioId,
    getItem: (chave) => conta.getItem(chave),
    setItem: (chave, valor) => gravar(chave, valor, () => conta.setItem(chave, valor)),
    removeItem: (chave) => gravar(chave, null, () => conta.removeItem(chave)),
    get length() {
      return conta.length
    },
    key: (indice) => conta.key(indice),
    clear: () => conta.clear(),
    chaveOriginal: (chave) => conta.chaveOriginal(chave),
  }
}

/** A versão da nuvem (`+00:00`) no mesmo formato das datas do aparelho (`Z`), para comparar. */
const comoDataDoAparelho = (data: string | null): string => (data === null || Number.isNaN(Date.parse(data)) ? '' : new Date(data).toISOString())

/** Esperar e desistir de esperar. Nos testes, o relógio falso do Vitest. */
export interface Relogio {
  depois(ms: number, fazer: () => void): () => void
}

const relogioDoNavegador: Relogio = {
  depois(ms, fazer) {
    const id = setTimeout(fazer, ms)
    return () => clearTimeout(id)
  },
}

export interface OpcoesSincronia {
  readonly cliente: ClienteDaCopia
  /** O espaço da conta, sem o observador: o que o motor grava não conta como mudança da pessoa. */
  readonly armazenamento: Armazenamento
  readonly usuarioId: string
  /** O nome curto do aparelho, gravado na linha. */
  readonly aparelho: string
  /** Dados de antes chegaram agora ao espaço da conta (a migração da spec dados-por-conta): junta ao abrir. */
  readonly sujo?: boolean
  readonly agora?: () => string
  readonly relogio?: Relogio
  /** O navegador diz que tem internet (`navigator.onLine`). */
  readonly conectado?: () => boolean
  readonly prazoMs?: number
  /** A nuvem mudou a cópia de trabalho (o que fica em memória troca junto, DP-18). */
  readonly aoTrazer?: () => void
  /** DP-27: a trava entre abas da mesma conta (`navigator.locks`), para uma aba ir à nuvem por vez. */
  readonly trancar?: <T>(fazer: (comTrava: boolean) => Promise<T>) => Promise<T>
}

export interface Sincronia {
  readonly estado: EstadoDaNuvem
  assinar(ouvinte: () => void): () => void
  /** Começa (abre a cópia, se ainda não abriu). A árvore liga ao montar. */
  ligar(): void
  /** Para os relógios e ignora o que estava a caminho. Ligar de novo continua de onde estava. */
  desligar(): void
  /** Uma mudança na cópia de trabalho (daqui ou de outra aba). */
  mudou(contou?: boolean): void
  /** Manda agora o que falta. Verdadeiro quando, no fim, a nuvem tem tudo. */
  salvarAgora(): Promise<boolean>
  /** O navegador voltou a ter internet. */
  conectou(): void
  /** O navegador perdeu a internet: trava (CA-477). */
  desconectou(): void
  /**
   * CB-127: confere se outro aparelho salvou desde a última vez e, se sim, traz (DP-20). `prender` cobre a
   * área enquanto confere (ao voltar para a aba); sem ele, confere sem cobrir (a cada 60 s).
   */
  conferir(prender: boolean): Promise<void>
  /** CB-123: tira a capa da trava de tamanho para a pessoa reduzir os dados (DP-9). */
  reduzir(): void
  /** A conta vai sair: nada mais vai para a nuvem, e as outras abas ficam sabendo (DP-11). */
  parar(): void
  /** A conta saiu em outra aba: para sem mandar mais nada. */
  saiuEmOutraAba(): void
}

export function criarSincronia(opcoes: OpcoesSincronia): Sincronia {
  const { cliente, armazenamento, usuarioId, aparelho } = opcoes
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const relogio = opcoes.relogio ?? relogioDoNavegador
  const conectado = opcoes.conectado ?? (() => true)
  const prazoMs = opcoes.prazoMs

  const ouvintes = new Set<() => void>()
  // Sobe a cada desligar: o que estava a caminho confere e, se mudou, não grava nem envia nada.
  let epoca = 0
  let ligada = false
  let parada = false
  let sujo = opcoes.sujo === true
  // Mudança que não coube no contador do navegador (armazenamento cheio): fica lembrada aqui.
  let semRegistro = false
  let cancelarSalvar: (() => void) | null = null
  let cancelarTentativa: (() => void) | null = null
  let cancelarConferencia: (() => void) | null = null
  // Uma ida à nuvem por vez nesta aba: abrir, salvar e conferir não se cruzam.
  let fila: Promise<unknown> = Promise.resolve()
  // CB-123: o tamanho da última cópia recusada; maior que ela, trava de novo (DP-9).
  let ultimaRecusada: number | null = null
  // DP-24: uma gravação falhou no caminho; antes da próxima, confere se ela chegou.
  let conferirAntes = false
  // DP-24: o tamanho da última cópia vista, para o prazo da leitura.
  let ultimoTamanho = 0
  const prazoDeLeitura = (): number => prazoMs ?? prazoParaTamanho(ultimoTamanho)

  const situacao = (): Situacao => lerSituacao(armazenamento) ?? SITUACAO_INICIAL
  const gravarSituacao = (nova: Situacao): void => {
    try {
      armazenamento.setItem(CHAVE_NUVEM, JSON.stringify(nova))
    } catch {
      // sem espaço: a versão fica em memória até a próxima gravação que couber
    }
  }
  // DP-22: dado que nunca chegou à nuvem (sem histórico neste navegador, ou trazido agora pela migração)
  // conta como pendente desde o começo, até a abertura juntar e subir.
  let naoConfirmado = sujo || (lerSituacao(armazenamento) === null && temDadosAqui())
  function temDadosAqui(): boolean {
    try {
      return Object.keys(montarCopia(armazenamento, agora()).dados).length > 0
    } catch {
      return false
    }
  }
  const temPendencia = (): boolean => {
    const s = situacao()
    return semRegistro || naoConfirmado || s.mudancas > s.salvas
  }

  let estado: EstadoDaNuvem = { fase: 'abrindo', pendente: temPendencia(), salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }
  const definir = (mudanca: Partial<EstadoDaNuvem>): void => {
    const novo = { ...estado, ...mudanca }
    if ((Object.keys(novo) as (keyof EstadoDaNuvem)[]).every((campo) => novo[campo] === estado[campo])) return
    estado = novo
    for (const ouvir of [...ouvintes]) ouvir()
  }

  const pararDeEsperar = (): void => {
    cancelarSalvar?.()
    cancelarSalvar = null
  }
  const pararDeTentar = (): void => {
    cancelarTentativa?.()
    cancelarTentativa = null
  }
  const pararDeConferir = (): void => {
    cancelarConferencia?.()
    cancelarConferencia = null
  }

  /** Põe a ida à nuvem na fila desta aba (e na trava entre abas, quando há): espera a anterior terminar. */
  const trancar = opcoes.trancar ?? (<T,>(fazer: (comTrava: boolean) => Promise<T>): Promise<T> => fazer(true))
  const exclusivo = <T,>(fazer: () => Promise<T>): Promise<T> => {
    // DP-28: a trava entre abas não veio a tempo e a ida segue sem ela: confere a versão antes de mandar.
    const naVez = () =>
      trancar((comTrava) => {
        if (!comTrava) conferirAntes = true
        return fazer()
      })
    const vez = fila.then(naVez, naVez)
    fila = vez.catch(() => undefined)
    return vez
  }

  // DP-23: a cópia que veio da nuvem não coube no navegador. A cópia daqui deixou de ser completa: nada
  // que saia dela vai para a nuvem até a página ser recarregada, e ela nunca é dada como em dia.
  let localParcial = false

  const semEspaco = (): void => {
    localParcial = true
    pararDeEsperar()
    const s = situacao()
    // DP-29: a marca vale para todas as abas deste navegador, que dividem a cópia de trabalho.
    gravarSituacao({ ...s, mudancas: Math.max(s.mudancas, s.salvas + 1), parcial: true })
    definir({ trava: 'sem-espaco', reduzindo: false, pendente: true, conferindo: false })
  }
  /** A cópia de trabalho está parcial, aqui ou em outra aba deste navegador (DP-29). */
  const temParcial = (): boolean => localParcial || situacao().parcial === true
  /** Outra aba achou a cópia parcial: esta trava também (DP-29). */
  const conferirParcial = (): boolean => {
    if (!temParcial()) return false
    if (!localParcial) semEspaco()
    return true
  }

  /** Escreve na cópia de trabalho o que veio da nuvem; se algo mudou, a área remonta. Falso quando não coube. */
  const aplicar = (copia: Backup): boolean => {
    let mudou: boolean
    let coube = true
    try {
      mudou = aplicarCopia(armazenamento, copia)
    } catch {
      mudou = true
      coube = false
    }
    if (mudou) {
      opcoes.aoTrazer?.()
      definir({ geracao: estado.geracao + 1 })
    }
    if (!coube) semEspaco()
    return coube
  }

  const agendarSalvar = (): void => {
    pararDeEsperar()
    cancelarSalvar = relogio.depois(ESPERA_PARA_SALVAR_MS, () => {
      cancelarSalvar = null
      void salvarAgora()
    })
  }

  const agendarTentativa = (): void => {
    pararDeTentar()
    cancelarTentativa = relogio.depois(INTERVALO_DE_TENTATIVA_MS, () => {
      cancelarTentativa = null
      tentarDeNovo()
    })
  }

  const agendarConferencia = (): void => {
    pararDeConferir()
    if (parada || !ligada) return
    cancelarConferencia = relogio.depois(CONFERIR_A_CADA_MS, () => {
      cancelarConferencia = null
      void conferir(false)
    })
  }

  const tentarDeNovo = (): void => {
    if (parada || !ligada) return
    if (estado.fase !== 'pronta') {
      void abrir()
      return
    }
    if (estado.trava !== 'sem-internet') return
    if (temPendencia()) void salvarAgora()
    else if (conectado()) destravarConferindo()
    else agendarTentativa()
  }

  // DP-25: uma abertura por vez; pedir de novo no meio devolve a mesma.
  let abrindo: Promise<void> | null = null
  const abrir = (): Promise<void> => {
    if (abrindo !== null) return abrindo
    const esta = exclusivo(abrirProtegido).finally(() => {
      if (abrindo === esta) abrindo = null
    })
    abrindo = esta
    return esta
  }

  /** DP-25: um erro qualquer na abertura vira "sem conexão", com nova tentativa. */
  async function abrirProtegido(): Promise<void> {
    const minha = epoca
    try {
      await abrirAgora()
    } catch {
      if (minha !== epoca || parada || estado.fase === 'pronta') return
      definir({ fase: 'sem-conexao' })
      agendarTentativa()
    }
  }

  async function abrirAgora(): Promise<void> {
    if (parada || estado.fase === 'pronta') return
    const minha = epoca
    pararDeTentar()
    ultimoTamanho = Math.max(ultimoTamanho, JSON.stringify(montarCopia(armazenamento, agora())).length)
    const leitura = await lerCopia(cliente, usuarioId, prazoDeLeitura())
    if (minha !== epoca || parada) return
    if (leitura.tipo === 'lida' && leitura.copia !== null) ultimoTamanho = JSON.stringify(leitura.copia).length
    if (leitura.tipo === 'falhou') {
      definir({ fase: leitura.motivo === 'formato' ? 'formato-desconhecido' : 'sem-conexao' })
      agendarTentativa()
      return
    }

    const anterior = lerSituacao(armazenamento)
    const local = montarCopia(armazenamento, agora())
    // Sem mudança pendente, a cópia daqui é a da última vez que esteve em dia: vale a da nuvem (DP-6).
    const emDia = anterior !== null && !sujo && !semRegistro && anterior.mudancas <= anterior.salvas
    // A cópia que sobe sai da memória: se a juntada não couber aqui, a daqui fica parcial (DP-23).
    let subir: Backup | null = null
    if (leitura.copia === null) {
      // D-133: sem cópia na nuvem, o que está aqui sobe como está; parcial, não sobe e trava (DP-31).
      if (anterior?.parcial === true) semEspaco()
      else if (Object.keys(local.dados).length > 0) subir = local
    } else if (emDia) {
      if (anterior.versao !== leitura.versao) aplicar(semPendencias(leitura.copia))
    } else {
      // D-133 e CB-125: o que ficou aqui sem subir é juntado ao que está na nuvem, item por item. Sem
      // marca nem data que decida (configurações de antes), fica o lado usado por último (DP-3).
      const daNuvemDesde = [momentoDaCopia(leitura.copia), comoDataDoAparelho(leitura.versao)].sort().at(-1) ?? ''
      const desempate = momentoDaCopia(local) > daNuvemDesde ? 'daqui' : 'nuvem'
      const junta = juntarCopias(local, semPendencias(leitura.copia), agora(), desempate)
      aplicar(junta)
      if (!copiasIguais(junta, leitura.copia)) subir = junta
    }
    sujo = false
    naoConfirmado = false
    const atual = situacao()
    const itens = leitura.copia === null ? 0 : itensDaCopia(leitura.copia)
    const mudancas = Math.max(atual.mudancas, atual.salvas + 1)
    // Cada ramo grava a situação inteira de novo: a marca de saída de uma sessão anterior não fica (DP-27), e a
    // de cópia parcial só sai depois de uma abertura que coube inteira (DP-29). Parcial, a versão guardada não
    // anda: um envio perdido de outra aba recebe "mudou" e junta, em vez de passar por cima.
    if (localParcial) gravarSituacao({ versao: atual.versao, itens: atual.itens, mudancas: Math.max(atual.mudancas, atual.salvas + 1), salvas: atual.salvas, parcial: true })
    else if (subir !== null) gravarSituacao({ versao: leitura.versao, itens, mudancas, salvas: atual.salvas })
    else {
      semRegistro = false
      gravarSituacao({ versao: leitura.versao, itens, mudancas: atual.mudancas, salvas: atual.mudancas })
    }
    definir({ fase: 'pronta', pendente: temPendencia() })
    agendarConferencia()
    if (subir !== null) await rodadaDeSalvar({ copia: subir, ate: mudancas, lembrada: false, versao: leitura.versao })
    else if (temPendencia() && !localParcial) await rodadaDeSalvar()
  }

  /** CB-123 e D-130: a cópia não foi. Grande demais trava a área; rede, também, e tenta de novo. */
  const naoFoi = (motivo: 'rede' | 'grande', tamanho: number): false => {
    // Sem espaço aqui, a capa continua a do espaço: não há o que tentar de novo desta cópia (DP-23).
    if (localParcial) {
      definir({ salvando: false, pendente: true, trava: 'sem-espaco' })
      return false
    }
    if (motivo === 'grande') {
      const cresceu = ultimaRecusada === null || tamanho > ultimaRecusada
      ultimaRecusada = tamanho
      definir({ salvando: false, pendente: true, trava: 'grande-demais', reduzindo: estado.trava === 'grande-demais' && estado.reduzindo && !cresceu })
      return false
    }
    definir({ salvando: false, pendente: true, trava: 'sem-internet', reduzindo: false })
    agendarTentativa()
    return false
  }

  /**
   * Manda uma cópia. Sem `inicial`, monta a daqui; com ele (a cópia juntada ao abrir), manda a que está
   * em memória. Quando outro aparelho salvou antes, junta e manda a juntada, da memória (DP-23).
   */
  const rodadaDeSalvar = async (inicial?: Envio): Promise<boolean> => {
    const minha = epoca
    definir({ salvando: true, pendente: true })
    let envio: Envio | null = inicial ?? null
    for (let volta = 0; volta < VOLTAS; volta += 1) {
      const antes = situacao()
      // DP-27: a conta saiu em outra aba (a marca chegou antes do aviso): nada daqui sobe.
      if (antes.saiu === true) {
        parada = true
        definir({ salvando: false })
        return false
      }
      if (envio === null) {
        // Da cópia daqui, parcial (nesta aba ou em outra deste navegador), nada sai (DP-23, DP-29).
        if (conferirParcial()) {
          definir({ salvando: false })
          return false
        }
        const lembrada = semRegistro
        semRegistro = false
        envio = { copia: montarCopia(armazenamento, agora()), ate: antes.mudancas, lembrada }
      }
      const { copia } = envio
      // DP-11: cópia sem item e sem lápide, quando a nuvem tinha itens, é o espaço apagado por fora. Em vez
      // de ficar em "Salvando…", abre de novo: a cópia da nuvem volta para cá (DP-27).
      if (antes.itens > 0 && copiaSemItens(copia)) {
        semRegistro ||= envio.lembrada
        definir({ salvando: false, fase: 'abrindo' })
        void abrir()
        return false
      }
      const tamanho = JSON.stringify(copia).length
      // DP-27: com a trava de tamanho, só vale mandar de novo quando a cópia diminui; crescer trava de novo.
      if (estado.trava === 'grande-demais' && ultimaRecusada !== null && tamanho >= ultimaRecusada) {
        semRegistro ||= envio.lembrada
        const cresceu = tamanho > ultimaRecusada
        ultimaRecusada = tamanho
        definir({ salvando: false, pendente: true, reduzindo: estado.reduzindo && !cresceu })
        return false
      }

      // DP-24: depois de uma falha no meio do caminho, a gravação pode ter chegado. Antes de mandar de
      // novo, confere a versão; se mudou, junta em vez de mandar por cima.
      let outroSalvou = false
      if (conferirAntes) {
        const versao = await lerVersao(cliente, usuarioId, prazoMs)
        if (minha !== epoca || parada) return false
        if (versao.tipo === 'falhou') {
          semRegistro ||= envio.lembrada
          return naoFoi('rede', tamanho)
        }
        conferirAntes = false
        outroSalvou = versao.versao !== antes.versao
      }

      if (!outroSalvou) {
        const versaoDoEnvio = envio.versao === undefined ? antes.versao : envio.versao
        const resultado = await gravarCopia(cliente, { copia, versao: versaoDoEnvio, aparelho, esperado: usuarioId, agora: agora() }, prazoMs)
        if (minha !== epoca || parada) return false

        if (resultado.tipo === 'gravada') {
          const depois = situacao()
          // Parcial, a versão guardada não anda (DP-29): a cópia daqui não é a que está na nuvem.
          if (!temParcial()) gravarSituacao({ ...depois, versao: resultado.versao, salvas: Math.max(depois.salvas, envio.ate), itens: itensDaCopia(copia) })
          ultimoTamanho = tamanho
          return terminou()
        }

        semRegistro ||= envio.lembrada
        if (resultado.tipo === 'falhou') {
          conferirAntes = resultado.motivo === 'rede'
          return naoFoi(resultado.motivo, tamanho)
        }
      } else semRegistro ||= envio.lembrada

      // D-132: outro aparelho salvou antes. Lê, junta item por item, grava aqui e manda a juntada.
      const leitura = await lerCopia(cliente, usuarioId, prazoDeLeitura())
      if (minha !== epoca || parada) return false
      if (leitura.tipo === 'falhou') return naoFoi('rede', tamanho)
      if (leitura.copia === null) {
        gravarSituacao({ ...situacao(), versao: null })
        continue
      }
      ultimoTamanho = JSON.stringify(leitura.copia).length
      // A daqui completa é relida (pode ter mudado durante a ida); a parcial, nunca (DP-23).
      const ate = localParcial ? envio.ate : situacao().mudancas
      const lembrada = semRegistro
      semRegistro = false
      const junta = juntarCopias(localParcial ? copia : montarCopia(armazenamento, agora()), semPendencias(leitura.copia), agora())
      if (!localParcial) aplicar(junta)
      if (!temParcial()) gravarSituacao({ ...situacao(), versao: leitura.versao, itens: itensDaCopia(leitura.copia) })
      // A juntada é igual à da nuvem: nada a mandar (o que parecia perdido tinha chegado).
      if (copiasIguais(junta, leitura.copia)) {
        if (!temParcial()) gravarSituacao({ ...situacao(), salvas: Math.max(situacao().salvas, ate) })
        return terminou()
      }
      envio = { copia: junta, ate, lembrada, versao: leitura.versao }
    }
    definir({ salvando: false })
    agendarSalvar()
    return false
  }

  /** A nuvem tem a cópia: destrava; se mudou algo aqui no meio, manda de novo daqui a pouco. */
  const terminou = (): boolean => {
    ultimaRecusada = null
    pararDeTentar()
    if (localParcial) {
      definir({ salvando: false, pendente: true, trava: 'sem-espaco' })
      return false
    }
    const resta = temPendencia()
    definir({ salvando: false, pendente: resta, trava: null, reduzindo: false })
    if (resta) agendarSalvar()
    // DP-28: a pessoa voltou para a aba com a área travada; a conferência que ficou para depois vem agora.
    else if (conferirAoDestravar) {
      conferirAoDestravar = false
      void conferir(true)
    }
    return !resta
  }

  function salvarAgora(): Promise<boolean> {
    pararDeEsperar()
    return exclusivo(async () => {
      if (parada || estado.fase !== 'pronta' || conferirParcial()) return false
      if (!temPendencia()) {
        definir({ pendente: false })
        return true
      }
      const salvou = await rodadaDeSalvar()
      agendarConferencia()
      return salvou
    })
  }

  /** DP-20: outro aparelho salvou desde a última vez? Lê só a versão; se mudou, traz a cópia da nuvem. */
  const conferirAgora = async (): Promise<void> => {
    try {
      await conferirSemProteger()
    } catch {
      // uma conferência que falha não trava nada: a próxima (ou o salvar) tenta de novo
    }
  }

  const conferirSemProteger = async (): Promise<void> => {
    const minha = epoca
    if (parada || estado.fase !== 'pronta' || estado.trava !== null || temPendencia() || temParcial()) return
    // A versão é um pedido pequeno: prazo fixo, sem crescer com o tamanho da cópia (DP-28).
    const versao = await lerVersao(cliente, usuarioId, prazoMs)
    if (minha !== epoca || parada || versao.tipo === 'falhou' || versao.versao === situacao().versao) return
    const leitura = await lerCopia(cliente, usuarioId, prazoDeLeitura())
    // Mudou algo aqui enquanto lia: quem junta é o salvar, com a conferência de versão.
    if (minha !== epoca || parada || leitura.tipo === 'falhou' || temPendencia()) return
    if (leitura.copia === null) {
      gravarSituacao({ ...situacao(), versao: null })
      return
    }
    if (!aplicar(semPendencias(leitura.copia))) return
    const atual = situacao()
    gravarSituacao({ ...atual, versao: leitura.versao, itens: itensDaCopia(leitura.copia), salvas: atual.mudancas })
  }

  // DP-28: a conferência em curso (foco e visibilidade juntos fazem uma só) e a que ficou para quando a
  // área destravar. DP-31: a com capa não aproveita uma de 60 s já a caminho, que pode ter lido a versão antes.
  let conferencia: { readonly promessa: Promise<void>; readonly comCapa: boolean } | null = null
  let conferirAoDestravar = false

  function conferir(prender: boolean): Promise<void> {
    if (parada || !ligada || estado.fase !== 'pronta') return Promise.resolve()
    if (estado.trava !== null) {
      // Travada, não confere agora: a de 60 s continua marcada, e a de quem voltou para a aba fica para depois.
      if (prender) conferirAoDestravar = true
      agendarConferencia()
      return Promise.resolve()
    }
    // Com mudança daqui, o salvar confere a versão e junta (D-132).
    if (temPendencia()) {
      void salvarAgora()
      return Promise.resolve()
    }
    if (prender && !estado.conferindo) definir({ conferindo: true })
    if (conferencia !== null && (conferencia.comCapa || !prender)) return conferencia.promessa
    pararDeConferir()
    // Com uma de 60 s a caminho, esta entra na fila depois dela e lê a versão de novo (DP-31).
    const esta = exclusivo(conferirAgora).finally(() => {
      // Só a última tira a capa: a de 60 s que termina antes não a derruba.
      if (conferencia?.promessa === esta) {
        conferencia = null
        definir({ conferindo: false })
      }
      agendarConferencia()
    })
    conferencia = { promessa: esta, comCapa: prender }
    return esta
  }

  /** DP-28: a trava saiu sem nada pendente: a capa "Atualizando…" entra no mesmo instante, e a aba confere. */
  const destravarConferindo = (): void => {
    conferirAoDestravar = false
    definir({ trava: null, conferindo: true })
    void conferir(true)
  }

  const desligar = (): void => {
    ligada = false
    epoca += 1
    pararDeEsperar()
    pararDeTentar()
    pararDeConferir()
    definir({ salvando: false, conferindo: false })
  }

  return {
    get estado() {
      return estado
    },

    assinar(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },

    ligar() {
      if (parada || ligada) return
      ligada = true
      if (estado.fase !== 'pronta') void abrir()
      else if (estado.trava === 'sem-internet') agendarTentativa()
      else if (temPendencia()) agendarSalvar()
      else agendarConferencia()
    },

    desligar,

    mudou(contou = true) {
      if (parada) return
      if (!contou) semRegistro = true
      definir({ pendente: true })
      if (!ligada || estado.fase !== 'pronta' || estado.trava === 'sem-internet' || conferirParcial()) return
      agendarSalvar()
    },

    salvarAgora,

    conferir,

    conectou() {
      if (parada || !ligada) return
      if (estado.fase !== 'pronta') {
        void abrir()
        return
      }
      if (estado.trava !== 'sem-internet') return
      if (temPendencia()) void salvarAgora()
      else destravarConferindo()
    },

    desconectou() {
      if (parada || !ligada || estado.fase !== 'pronta') return
      pararDeEsperar()
      definir({ trava: 'sem-internet', reduzindo: false })
      agendarTentativa()
    },

    reduzir() {
      if (estado.trava === 'grande-demais') definir({ reduzindo: true })
    },

    parar() {
      gravarSituacao({ ...situacao(), saiu: true })
      parada = true
      desligar()
    },

    saiuEmOutraAba() {
      parada = true
      desligar()
    },
  }
}
