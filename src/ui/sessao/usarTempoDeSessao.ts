// O vigia da sessão (spec separacao-site-app, D-514 a D-517).
//
// Mede o uso nesta aba (tecla, clique, toque, rolagem; mexer o mouse não conta, D-515), divide a marca com as outras
// abas, avisa aos 28 minutos sem uso, mostra a faixa 10 minutos antes do limite total e, na hora, faz a saída na ordem
// do D-517, com uma aba só (DP-SA-6). O vigia é um objeto fora do React, como o motor da nuvem: a árvore cria um por
// conta, liga, desliga e lê o estado (DP-SA-21 e DP-SA-27).
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { contaEmDia } from '@/domain/contaEmDia.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { situacaoDaSessao } from '@/domain/tempoDeSessao.ts'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { useNuvem } from '../estado/contextoNuvem.ts'
import { PRAZO_DA_TRAVA_MS } from '../estado/travaEntreAbas.ts'
import type { ValorConta } from '../estado/usarConta.ts'
import { criarEnvios, type RegistroDeEnvios } from './contextoEnvios.ts'
import { CHAVE_MARCA_DA_SESSAO, deveGravarUso, gravarMarca, lerMarca, ultimoUso } from './marcaDeUso.ts'

/** D-517, passo 2: o que falta tem até este tempo para chegar à nuvem antes da saída. */
export const PRAZO_DOS_ENVIOS_MS = 10_000
/** DP-SA-27: sem nada mudando antes, o vigia confere de novo depois deste tempo. */
export const CONFERIR_NO_MAXIMO_A_CADA_MS = 60_000

/** D-515: o que conta como uso. Mexer o mouse (`pointermove`, `mousemove`) não conta. */
const EVENTOS_DE_USO = ['keydown', 'pointerdown', 'touchstart', 'wheel', 'scroll'] as const
const OUVIR_USO: AddEventListenerOptions = { capture: true, passive: true }

export interface EstadoDoTempo {
  /** "Você ainda está aí?" (CA-1442). */
  readonly aviso: boolean
  /** A hora do fim da sessão, no relógio deste computador, quando a faixa aparece (CA-1444); senão nula. */
  readonly faixa: number | null
  /** "Encerrando a sessão…" cobre a tela (D-517, passo 1). */
  readonly capa: boolean
}

const SEM_TEMPO: EstadoDoTempo = { aviso: false, faixa: null, capa: false }

/** D-517, passos 2 a 5: manda o que falta, confere se a nuvem tem tudo, sai e vai para Entrar. `ate` é o último uso. */
type Sair = (ate: number) => Promise<void>

interface OpcoesDoVigia {
  readonly conta: string
  readonly armazenamento: Armazenamento | null
}

interface Vigia {
  readonly estado: EstadoDoTempo
  assinar(ouvinte: () => void): () => void
  ligar(): void
  desligar(): void
  /** "Continuar" do aviso: conta como uso. */
  continuar(): void
  /** O perfil disse se a conta é de administrador (CB-526): os limites mudam na hora, e a marca guarda. */
  definirAdmin(admin: boolean): void
  /** Como sair, com o que a árvore tem agora (a nuvem, a conta); vem antes de ligar. */
  definirSaida(sair: Sair): void
}

function criarVigia({ conta, armazenamento }: OpcoesDoVigia): Vigia {
  const ouvintes = new Set<() => void>()
  let sair: Sair | null = null
  let ligado = false
  let saindo = false
  let admin = false
  // O uso desta aba vale exato em memória; no navegador, no máximo a cada 60 s (DP-SA-5).
  let usoEmMemoria: number | null = null
  let ultimaGravacao: number | null = null
  let relogio: ReturnType<typeof setTimeout> | null = null
  // Sem a hora da entrada na marca (navegador bloqueado), vale a hora em que o vigia começou.
  const marcaInicial = lerMarca(armazenamento, conta)
  const entradaDeReserva = marcaInicial?.entrada ?? Date.now() + (marcaInicial?.desvio ?? 0)

  /** As horas pela hora do servidor (DP-SA-4), e o último uso entre esta aba e as outras (DP-SA-18). */
  const horas = () => {
    const marca = lerMarca(armazenamento, conta)
    const desvio = marca?.desvio ?? 0
    const agora = Date.now() + desvio
    const entrada = marca?.entrada ?? entradaDeReserva
    return { marca, desvio, agora, entrada, uso: ultimoUso(marca, usoEmMemoria, entrada), admin: admin || marca?.admin === true }
  }

  const calcular = (): { readonly estado: EstadoDoTempo; readonly saida: boolean; readonly espera: number; readonly ate: number } => {
    const h = horas()
    const situacao = situacaoDaSessao(h)
    const estado: EstadoDoTempo =
      situacao.saida !== null ? { aviso: false, faixa: null, capa: true } : { aviso: situacao.aviso, faixa: situacao.faixa ? situacao.fimDoLimite - h.desvio : null, capa: false }
    return { estado, saida: situacao.saida !== null, espera: situacao.proximaMudanca - h.agora, ate: h.uso - h.desvio }
  }

  // D-518: já vencida ao criar, a capa vem no primeiro desenho; a saída começa ao ligar.
  let estado: EstadoDoTempo = calcular().estado

  const definir = (novo: EstadoDoTempo): void => {
    if (novo.aviso === estado.aviso && novo.faixa === estado.faixa && novo.capa === estado.capa) return
    estado = novo
    for (const ouvir of [...ouvintes]) ouvir()
  }

  const pararRelogio = (): void => {
    if (relogio !== null) clearTimeout(relogio)
    relogio = null
  }

  /** DP-SA-6: com `navigator.locks`, só a aba que pega a trava sai; sem ele, a marca diz quem está saindo, por 20 s. */
  const umaAbaSo = async (fazer: () => Promise<void>): Promise<boolean> => {
    const travas = globalThis.navigator?.locks
    try {
      if (travas !== undefined && typeof travas.request === 'function') {
        return await travas.request('metanutri:saida', { ifAvailable: true }, async (trava) => {
          if (trava === null) return false
          await fazer()
          return true
        })
      }
      const marca = lerMarca(armazenamento, conta)
      if (marca?.saindo !== undefined && marca.saindo > Date.now()) return false
      if (marca !== null) gravarMarca(armazenamento, { ...marca, saindo: Date.now() + PRAZO_DA_TRAVA_MS })
      await fazer()
      return true
    } catch {
      // a saída falhou no meio: tenta de novo daqui a pouco
      return false
    }
  }

  const iniciarSaida = async (ate: number): Promise<void> => {
    saindo = true
    pararRelogio()
    definir({ aviso: false, faixa: null, capa: true })
    const fez = sair === null ? false : await umaAbaSo(sair.bind(null, ate))
    // DP-SA-26: outra aba está saindo. Quando a sessão cair, esta desliga; se a outra sumir no meio, tenta de novo.
    if (!fez && ligado) {
      relogio = setTimeout(() => {
        relogio = null
        saindo = false
        conferir()
      }, PRAZO_DA_TRAVA_MS)
    }
  }

  /**
   * Revisão R2: o uso desta aba que ficou só na memória (os eventos gravam no máximo a cada 60 s) vai para a marca. Sem
   * isso, a outra aba, parada, lia a marca atrasada e saía até 1 minuto antes da hora.
   */
  const gravarUsoEmMemoria = (): void => {
    if (!ligado || saindo || usoEmMemoria === null) return
    const h = horas()
    if (h.marca !== null && h.marca.uso >= usoEmMemoria) return
    gravarMarca(armazenamento, { conta, entrada: h.entrada, admin: h.admin, desvio: h.desvio, ...(h.marca ?? {}), uso: usoEmMemoria })
  }

  function conferir(): void {
    if (!ligado || saindo) return
    pararRelogio()
    gravarUsoEmMemoria()
    const agora = calcular()
    if (agora.saida) {
      void iniciarSaida(agora.ate)
      return
    }
    definir(agora.estado)
    relogio = setTimeout(
      () => {
        relogio = null
        conferir()
      },
      Math.max(0, Math.min(agora.espera, CONFERIR_NO_MAXIMO_A_CADA_MS)),
    )
  }

  /** Tecla, clique, toque ou rolagem nesta aba (D-515). */
  const usar = (): void => {
    if (!ligado || saindo) return
    const h = horas()
    usoEmMemoria = h.agora
    if (deveGravarUso(ultimaGravacao, h.agora)) {
      gravarMarca(armazenamento, { conta, entrada: h.entrada, admin: h.admin, desvio: h.desvio, ...(h.marca ?? {}), uso: h.agora })
      ultimaGravacao = h.agora
    }
    // CA-1442: o uso fecha o aviso na hora.
    if (estado.aviso) conferir()
  }

  const aoMudarMarca = (evento: StorageEvent): void => {
    if (evento.key === CHAVE_MARCA_DA_SESSAO || evento.key === null) conferir()
  }
  const aoVoltar = (): void => {
    if (globalThis.document?.visibilityState !== 'hidden') conferir()
    // R2: a aba ficou oculta; o uso dela vai para a marca antes de o navegador atrasar os relógios dela (CB-522).
    else gravarUsoEmMemoria()
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
      if (ligado) return
      ligado = true
      for (const tipo of EVENTOS_DE_USO) globalThis.addEventListener(tipo, usar, OUVIR_USO)
      globalThis.addEventListener('storage', aoMudarMarca)
      // CA-1458: o computador acordou ou a aba voltou; confere antes de deixar editar.
      globalThis.addEventListener('focus', aoVoltar)
      globalThis.document?.addEventListener('visibilitychange', aoVoltar)
      globalThis.addEventListener('pagehide', gravarUsoEmMemoria)
      conferir()
    },
    desligar() {
      ligado = false
      pararRelogio()
      for (const tipo of EVENTOS_DE_USO) globalThis.removeEventListener(tipo, usar, OUVIR_USO)
      globalThis.removeEventListener('storage', aoMudarMarca)
      globalThis.removeEventListener('focus', aoVoltar)
      globalThis.document?.removeEventListener('visibilitychange', aoVoltar)
      globalThis.removeEventListener('pagehide', gravarUsoEmMemoria)
    },
    continuar() {
      usar()
      conferir()
    },
    definirAdmin(novo) {
      if (novo === admin) return
      admin = novo
      const marca = lerMarca(armazenamento, conta)
      if (novo && marca !== null && !marca.admin) gravarMarca(armazenamento, { ...marca, admin: true })
      conferir()
    },
    definirSaida(nova) {
      sair = nova
    },
  }
}

/** Espera a promessa, no máximo pelo prazo. */
async function esperarNoMaximo(promessa: Promise<unknown>, prazoMs: number): Promise<void> {
  let relogio: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      promessa,
      new Promise<void>((seguir) => {
        relogio = setTimeout(seguir, prazoMs)
      }),
    ])
  } finally {
    clearTimeout(relogio)
  }
}

interface OpcoesDoTempo {
  /** Com servidor de conta e sessão, fora do link do paciente (CA-1455, CA-1456). */
  readonly ativo: boolean
  readonly usuarioId: string | null
  /** Administrador, com ou sem o código do app (CB-526). */
  readonly admin: boolean
  readonly sairPorTempo: ValorConta['sairPorTempo']
  /** D-517, passo 5: a página vai para Entrar. */
  readonly aoSair: () => void
}

export interface ValorTempoDeSessao extends EstadoDoTempo {
  readonly continuar: () => void
  /** Onde o que precisa ir para a nuvem antes da saída se registra (DP-SA-8). */
  readonly envios: RegistroDeEnvios
}

const semAssinatura = () => () => undefined
const nada = (): void => undefined

export function useTempoDeSessao({ ativo, usuarioId, admin, sairPorTempo, aoSair }: OpcoesDoTempo): ValorTempoDeSessao {
  const nuvem = useNuvem()
  const [envios] = useState(criarEnvios)

  const vigia = useMemo(() => (ativo && usuarioId !== null ? criarVigia({ conta: usuarioId, armazenamento: armazenamentoLocal() }) : null), [ativo, usuarioId])

  const sair = useCallback(
    async (ate: number) => {
      if (usuarioId === null) return
      // D-517, passo 2: a cópia de trabalho e os links pendentes vão juntos, com até 10 s. Sem motor (sem cliente da
      // nuvem), não há o que a memória dele saiba: vale só o navegador.
      let salvou = nuvem === null
      const copia = nuvem?.salvarAgora().then((foi) => {
        salvou = foi
      })
      await esperarNoMaximo(Promise.allSettled([copia, envios.enviarTodos()]), PRAZO_DOS_ENVIOS_MS)
      // Passo 3. Revisão R1: decide antes de parar o motor. O pendente da migração (D-123) pode estar só na memória
      // dele, e o parar() regrava a situação: depois dele, o navegador pareceria em dia.
      const base = armazenamentoLocal()
      const apagar = salvou && base !== null && contaEmDia(base, usuarioId, { contarRetidos: false })
      // O motor para (as outras abas ficam sabendo, DP-11) antes de o espaço ser apagado ou guardado.
      nuvem?.parar()
      await sairPorTempo({ apagar, ate })
      aoSair()
    },
    [usuarioId, nuvem, envios, sairPorTempo, aoSair],
  )

  const estado = useSyncExternalStore(vigia?.assinar ?? semAssinatura, () => vigia?.estado ?? SEM_TEMPO)

  // Antes de ligar: o vigia já vencido ao ligar sai na hora (D-518).
  useEffect(() => {
    vigia?.definirSaida(sair)
  }, [vigia, sair])

  useEffect(() => {
    if (vigia === null) return
    vigia.ligar()
    return () => vigia.desligar()
  }, [vigia])

  useEffect(() => {
    vigia?.definirAdmin(admin)
  }, [vigia, admin])

  return { ...estado, continuar: vigia?.continuar ?? nada, envios }
}
