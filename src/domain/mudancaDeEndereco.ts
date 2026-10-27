// A mudança do que só existe no endereço antigo para o app (spec separacao-site-app, D-512, D-513 e DP-SA-38).
//
// O site (metanutri.com.br) monta o pacote da conta que o app pediu e, quando o app confirma, apaga o que entregou. O
// app (app.metanutri.com.br) decide como receber e grava. As mensagens entre as duas abas passam por aqui para serem
// lidas com desconfiança: o que não tem a forma certa é ignorado (CA-1438, CB-502).
// Puro, sem React e sem o cliente do Supabase: o site também usa.
import { armazenamentoDaConta, prefixoDaConta } from './armazenamentoDaConta.ts'
import { contaEmDia } from './contaEmDia.ts'
import { CHAVE_DONO, chavesSemConta, OUTRAS_CHAVES_DA_PESSOA } from './donoDosDados.ts'
import { CHAVES_DE_DADOS } from './perfil.ts'
import { ehQuotaExcedida, type ArmazenamentoListavel } from './persistencia.ts'
import { CHAVE_NUVEM, lerSituacao } from './sincronia.ts'

/** O tema escolhido no app: vai junto (D-512). A mesma chave de `CHAVE_TEMA` (`src/ui/tema/contextoTema.ts`). */
export const CHAVE_DO_TEMA = 'metanutri:tema'

/** As chaves do navegador com o nome de lá, cada uma com o valor guardado (DP-SA-38). */
export type Pacote = Readonly<Record<string, string>>

/** DP-SA-12: o que as duas abas trocam. Toda mensagem leva o código da mudança e a conta. */
export type Mensagem =
  | { readonly tipo: 'pedir'; readonly codigo: string; readonly usuarioId: string }
  | { readonly tipo: 'dados'; readonly codigo: string; readonly usuarioId: string; readonly chaves: Pacote }
  | { readonly tipo: 'nada'; readonly codigo: string; readonly usuarioId: string }
  | { readonly tipo: 'recebido'; readonly codigo: string; readonly usuarioId: string }

/** D-513: espaço vazio grava como veio; em dia troca pelo que veio; com algo só aqui, fica para depois. */
export type ComoReceber = 'gravar' | 'trocar' | 'depois'

export type ResultadoDaGravacao = 'gravado' | 'sem-espaco' | 'falhou'

const PREFIXO_DO_PLANO = 'metanutri:caso:'
const FORMATO_DO_CODIGO = /^[0-9a-f]{32}$/
/** Um id de conta do Supabase tem 36 letras; o limite só barra lixo. */
const MAIOR_ID = 200

/** DP-SA-12: 128 bits aleatórios, em hexadecimal; só na memória da aba do site. */
export function novoCodigo(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Dado de antes das contas (D-123): os planos, as chaves do backup e as outras da pessoa. O dono não entra (DP-SA-38). */
function ehDeAntesDasContas(chave: string): boolean {
  if (chave.startsWith(PREFIXO_DO_PLANO)) return chave.length > PREFIXO_DO_PLANO.length
  return (CHAVES_DE_DADOS as readonly string[]).includes(chave) || (OUTRAS_CHAVES_DA_PESSOA as readonly string[]).includes(chave)
}

/** A chave pode estar no pacote dessa conta: do espaço dela, de antes das contas ou o tema. */
function cabeNoPacote(chave: string, usuarioId: string): boolean {
  const prefixo = prefixoDaConta(usuarioId)
  if (chave.startsWith(prefixo)) return chave.length > prefixo.length
  return chave === CHAVE_DO_TEMA || ehDeAntesDasContas(chave)
}

/** O nome no navegador de uma chave da conta (`metanutri:nuvem` vira `metanutri:conta:<id>:nuvem`). */
const noEspaco = (usuarioId: string, chave: string): string => `${prefixoDaConta(usuarioId)}${chave.slice('metanutri:'.length)}`

/** As chaves do espaço da conta, com o nome do navegador. */
function chavesDoEspaco(base: ArmazenamentoListavel, usuarioId: string): string[] {
  const prefixo = prefixoDaConta(usuarioId)
  const chaves: string[] = []
  for (let i = 0; i < base.length; i += 1) {
    const chave = base.key(i)
    if (chave?.startsWith(prefixo)) chaves.push(chave)
  }
  return chaves
}

/**
 * CA-1432 (o lado do site): o espaço da conta pedida, o dado de antes das contas quando o dono é ela ou ninguém, e o
 * tema. Nada de outra conta nem da sessão. Sem espaço e sem dado de antes, não há pacote (CB-504): só o tema não conta.
 */
export function pacoteDaConta(base: ArmazenamentoListavel, usuarioId: string): Pacote | null {
  try {
    const pacote: Record<string, string> = {}
    const guardar = (chave: string) => {
      const valor = base.getItem(chave)
      if (valor !== null) pacote[chave] = valor
    }
    for (const chave of chavesDoEspaco(base, usuarioId)) guardar(chave)
    const dono = base.getItem(CHAVE_DONO) || null
    if (dono === null || dono === usuarioId) for (const chave of chavesSemConta(base)) guardar(chave)
    if (Object.keys(pacote).length === 0) return null
    guardar(CHAVE_DO_TEMA)
    return pacote
  } catch {
    // sem armazenamento: não há o que mandar (CB-500)
    return null
  }
}

/**
 * CA-1436 (o lado do site): o app confirmou que a nuvem tem tudo. Sai o que foi entregue, do espaço da conta e de antes
 * das contas, e só se ainda for o que foi (DP-SA-60): o que mudou ou apareceu depois fica para a próxima visita. Sem mais
 * nada de antes, o dono também sai. O tema e o resto ficam. Repetir não faz nada (CB-507).
 */
export function apagarEntregue(base: ArmazenamentoListavel, usuarioId: string, entregue: Pacote): void {
  try {
    const prefixo = prefixoDaConta(usuarioId)
    for (const [chave, valor] of Object.entries(entregue)) {
      const daEntrega = (chave.startsWith(prefixo) && chave.length > prefixo.length) || ehDeAntesDasContas(chave)
      if (daEntrega && base.getItem(chave) === valor) base.removeItem(chave)
    }
    const dono = base.getItem(CHAVE_DONO)
    if (dono !== null && (dono === '' || dono === usuarioId) && chavesSemConta(base).length === 0) base.removeItem(CHAVE_DONO)
  } catch {
    // sem armazenamento: nada a apagar
  }
}

function lerChaves(valor: unknown, usuarioId: string): Pacote | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null
  const pares = Object.entries(valor)
  if (pares.length === 0) return null
  for (const [chave, texto] of pares) if (typeof texto !== 'string' || !cabeNoPacote(chave, usuarioId)) return null
  return Object.fromEntries(pares) as Record<string, string>
}

/**
 * DP-SA-12, CA-1438 e CB-502: a mensagem que chegou, se tiver a forma certa; senão, nula, e quem recebeu a ignora. Quem
 * recebe ainda confere a origem, a janela, o código e a conta.
 */
export function lerMensagem(dados: unknown): Mensagem | null {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) return null
  const o = dados as Record<string, unknown>
  const { tipo, codigo, usuarioId } = o
  if (typeof codigo !== 'string' || !FORMATO_DO_CODIGO.test(codigo)) return null
  if (typeof usuarioId !== 'string' || usuarioId === '' || usuarioId.length > MAIOR_ID) return null
  if (tipo === 'pedir' || tipo === 'nada' || tipo === 'recebido') return { tipo, codigo, usuarioId }
  if (tipo !== 'dados') return null
  const chaves = lerChaves(o['chaves'], usuarioId)
  return chaves === null ? null : { tipo, codigo, usuarioId, chaves }
}

/**
 * D-513 (o lado do app). DP-SA-38: com dado de antes das contas no app (só no modo local), também fica para depois. Sem
 * conseguir ler o navegador, fica para depois: nada é apagado no site.
 */
export function comoReceber(base: ArmazenamentoListavel, usuarioId: string): ComoReceber {
  try {
    if (chavesSemConta(base).length > 0) return 'depois'
    if (chavesDoEspaco(base, usuarioId).length === 0) return 'gravar'
    // O valor retido do app é algo que só existe ali (D-173): trocar o perderia.
    return contaEmDia(base, usuarioId, { contarRetidos: true }) ? 'trocar' : 'depois'
  } catch {
    return 'depois'
  }
}

/**
 * Grava o pacote no app (D-513). Ao trocar, sai do espaço em dia o que o pacote não traz; o que ele traz é regravado no
 * lugar (DP-SA-57). O dado de antes das contas fica com ela como dona (a migração de sempre o leva ao espaço dela,
 * D-123); o tema só entra se o app não tiver um. Se não couber (CB-501), o que chegou a ser gravado sai e o que havia
 * volta.
 */
export function gravarPacote(base: ArmazenamentoListavel, usuarioId: string, chaves: Pacote, modo: Exclude<ComoReceber, 'depois'>): ResultadoDaGravacao {
  const antes = new Map<string, string | null>()
  const lembrar = (chave: string) => {
    if (!antes.has(chave)) antes.set(chave, base.getItem(chave))
  }
  const situacao = noEspaco(usuarioId, CHAVE_NUVEM)
  try {
    if (modo === 'trocar') {
      // DP-SA-57: a situação da nuvem nunca fica vazia, nem por um instante: outra aba do app na mesma conta leria "a
      // conta saiu aqui" e pararia de sincronizar (DP-11). Sem ela no pacote, a do app fica sem a versão e com uma
      // mudança a mais: todo envio, de qualquer aba, vira cópia nova, a nuvem diz que já existe uma, e o motor lê e junta
      // o que veio com ela antes de subir. Com a versão guardada, outra aba salvaria por cima da nuvem só o que veio.
      const doApp = lerSituacao(armazenamentoDaConta(base, usuarioId))
      if (!Object.hasOwn(chaves, situacao) && doApp !== null) {
        lembrar(situacao)
        base.setItem(situacao, JSON.stringify({ ...doApp, versao: null, mudancas: doApp.mudancas + 1 }))
      }
      for (const chave of chavesDoEspaco(base, usuarioId)) {
        if (chave === situacao || Object.hasOwn(chaves, chave)) continue
        lembrar(chave)
        base.removeItem(chave)
      }
    }
    let deAntesDasContas = false
    // A situação que veio vai antes dos dados: a conta nunca parece em dia com o dado novo ainda não enviado.
    const emOrdem = Object.entries(chaves).sort(([a], [b]) => Number(b === situacao) - Number(a === situacao))
    for (const [chave, valor] of emOrdem) {
      if (!cabeNoPacote(chave, usuarioId)) continue
      if (chave === CHAVE_DO_TEMA && base.getItem(chave) !== null) continue
      if (ehDeAntesDasContas(chave)) deAntesDasContas = true
      lembrar(chave)
      base.setItem(chave, valor)
    }
    if (deAntesDasContas) {
      lembrar(CHAVE_DONO)
      base.setItem(CHAVE_DONO, usuarioId)
    }
    return 'gravado'
  } catch (erro) {
    // Desfaz: primeiro tira o que é novo (libera espaço), depois põe de volta o que havia.
    try {
      for (const [chave, valor] of antes) if (valor === null) base.removeItem(chave)
      for (const [chave, valor] of antes) if (valor !== null) base.setItem(chave, valor)
    } catch {
      // o espaço em dia que não voltou está na nuvem
    }
    return ehQuotaExcedida(erro) ? 'sem-espaco' : 'falhou'
  }
}
