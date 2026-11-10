// A função `avisos-resposta` (spec lado-do-paciente, D-1226, D-1235, DP-LP-20): as páginas `/avisos/<chave>` (o aceite e
// o descadastro) e o descadastro de um clique do Gmail e do Apple Mail (RFC 8058).
//
// Abrir o endereço nunca muda nada (o antivírus do Microsoft 365 abre todo link, D-89): a página lê a chave ('ler') e só
// o botão age, por POST ('confirmar', 'sair', 'parar-todos', 'desfazer'). O POST de um clique chega com `?c=<chave>` e o
// corpo `List-Unsubscribe=One-Click`, e sai daquele aviso sem página (CA-2252). Cada chave mexe só no link dela
// (CA-2255); a chave mexida à mão não existe e responde "Este endereço não vale." (404). Puro: o banco chega de fora.
import { CHAVE_QUE_NAO_VALE, ehChave, enviarServico, erro, hashDoToken, itemDoLinkDoPlano, PEDIDO_INVALIDO, type DependenciasComuns } from './comum.ts'
import { mascararEmail } from './email.ts'
import type { AceiteDoBanco, ChaveDeAviso, DadosDaNutricionista, Desfazer, EmailDoLink, LinkDoBanco, RespostaDaFuncao } from './portas.ts'
import { emBrasilia } from './regras.ts'
import { TIPOS_DE_AVISO, ehTipoDeAviso, type TipoDeAviso } from './tipos.ts'

export interface PedidoDaResposta {
  readonly metodo: string
  /** A chave do endereço (`?c=`), no descadastro de um clique. */
  readonly chaveDaUrl: string | null
  /** O corpo em JSON (a página); nulo no de um clique. */
  readonly corpo: unknown
  /** O corpo era `List-Unsubscribe=One-Click` (RFC 8058). */
  readonly umClique: boolean
}

type Acao = 'ler' | 'confirmar' | 'sair' | 'parar-todos' | 'desfazer'
const ACOES: readonly Acao[] = ['ler', 'confirmar', 'sair', 'parar-todos', 'desfazer']

const NAO_VALE = erro(CHAVE_QUE_NAO_VALE, 404)

const objeto = (valor: unknown): Readonly<Record<string, unknown>> => (typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {})

interface Contexto {
  readonly chave: ChaveDeAviso
  readonly link: LinkDoBanco | null
  readonly email: EmailDoLink | null
  readonly aceites: readonly AceiteDoBanco[]
  /** A conta da chave (o S1 do "Confirmar", D-1258). */
  readonly conta: DadosDaNutricionista
  readonly nutricionista: string
  readonly resumoDaAdesao: boolean
  /** As ofertas de quem ainda não tem a linha do e-mail (D-1227). */
  readonly oferecerAosNovos: boolean
}

/** A chave e o que ela alcança. Nula: não vale (não existe, venceu ou o link saiu, CB-1214). */
async function carregar(chave: string, deps: DependenciasComuns): Promise<Contexto | null> {
  const lida = await deps.banco.lerChave(chave)
  if (lida === null) return null
  if (lida.tipo === 'aceite' && lida.usadoEm === null && lida.venceEm !== null && Date.parse(lida.venceEm) < deps.agora().getTime()) return null
  const nutri = await deps.banco.nutricionista(lida.nutricionistaId)
  if (nutri === null) return null
  if (lida.linkId === null) {
    // Só o descadastro do N1 é da conta, sem link.
    return lida.avisos[0] === 'n1'
      ? { chave: lida, link: null, email: null, aceites: [], conta: nutri, nutricionista: 'MetaNutri', resumoDaAdesao: nutri.resumoDaAdesao, oferecerAosNovos: nutri.oferecerAosNovos }
      : null
  }
  const [link] = await deps.banco.linksPorIds([lida.linkId])
  if (!link) return null
  // D-1256 e CA-2300: a confirmação ainda aberta só vale com o endereço de agora do link (a pedida antes de uma troca,
  // ou sem o resumo do endereço, não vale).
  if (lida.tipo === 'aceite' && lida.usadoEm === null && (lida.tokenHash === null || lida.tokenHash !== (await hashDoToken(link.token)))) return null
  const email = await deps.banco.emailDoLink(link.id)
  // D-1252 e CA-2297: a chave de descadastro só vale para o endereço de agora do link (a ficha corrigida invalida a do
  // endereço errado, que não descadastra nem desfaz nada).
  if (lida.tipo === 'sair' && (lida.emailHash === null || lida.emailHash !== email?.emailHash)) return null
  return {
    chave: lida,
    link,
    email,
    aceites: await deps.banco.aceitesDoLink(link.id),
    conta: nutri,
    nutricionista: nutri.nome.trim() || 'Sua nutricionista',
    resumoDaAdesao: nutri.resumoDaAdesao,
    oferecerAosNovos: nutri.oferecerAosNovos,
  }
}

/** Os avisos que a nutricionista oferece, na ordem da página (CA-2243). */
const oferecidos = (c: Contexto): readonly TipoDeAviso[] => TIPOS_DE_AVISO.filter((t) => c.email?.ofertas[t] ?? c.oferecerAosNovos)

/** Os aceites ativos do endereço de agora do link. */
const ativos = (c: Contexto): readonly AceiteDoBanco[] => c.aceites.filter((a) => a.saiuEm === null && a.emailHash === c.email?.emailHash)

/** O que a página mostra (src/domain/emailsDoLink.ts, `PaginaDoAviso`). */
function pagina(c: Contexto, sobre: { readonly escolhidos?: readonly TipoDeAviso[]; readonly feito?: boolean; readonly aviso?: string | null } = {}): RespostaDaFuncao {
  const { chave } = c
  const pedidos = chave.avisos.filter(ehTipoDeAviso)
  const feito = sobre.feito ?? chave.usadoEm !== null
  const escolhidos =
    sobre.escolhidos ?? (chave.tipo === 'aceite' && feito ? ativos(c).map((a) => a.tipo) : pedidos.filter((t) => oferecidos(c).includes(t)))
  return {
    status: 200,
    corpo: {
      tipo: chave.tipo,
      nutricionista: c.nutricionista,
      avisos: chave.tipo === 'aceite' ? oferecidos(c) : [],
      escolhidos: TIPOS_DE_AVISO.filter((t) => escolhidos.includes(t)),
      aviso: sobre.aviso === undefined ? (chave.tipo === 'sair' ? (chave.avisos[0] ?? null) : null) : sobre.aviso,
      // D-1247: a página "Confirmar o seu e-mail" mostra o endereço digitado, mascarado.
      emailNovo: chave.tipo === 'aceite' && chave.email !== null ? mascararEmail(chave.email) : null,
      feito,
    },
  }
}

export async function responderAosAvisos(pedido: PedidoDaResposta, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  // CA-2241 e CA-2253: só o POST age; abrir o endereço não aceita nem descadastra nada.
  if (pedido.metodo !== 'POST') return erro('Use POST.', 405)

  if (pedido.umClique) {
    if (!ehChave(pedido.chaveDaUrl)) return NAO_VALE
    const c = await carregar(pedido.chaveDaUrl, deps)
    if (c === null || c.chave.tipo !== 'sair') return NAO_VALE
    await sair(c, deps)
    return { status: 200, corpo: { ok: true } }
  }

  const corpo = objeto(pedido.corpo)
  const acao = ACOES.find((a) => a === corpo['acao'])
  if (acao === undefined) return erro(PEDIDO_INVALIDO, 400)
  if (!ehChave(corpo['chave'])) return NAO_VALE
  const c = await carregar(corpo['chave'], deps)
  if (c === null) return NAO_VALE

  if (acao === 'ler') return pagina(c)
  if (acao === 'confirmar') return c.chave.tipo === 'aceite' ? confirmar(c, corpo['avisos'], deps) : NAO_VALE
  if (c.chave.tipo !== 'sair') return NAO_VALE
  if (acao === 'sair') return sair(c, deps)
  if (acao === 'parar-todos') return pararTodos(c, deps)
  return desfazer(c, deps)
}

/**
 * D-1226 e CA-2241: o aceite vale só aqui, no botão "Confirmar" da página. Guarda o tipo, o dia e a hora e a versão. Na
 * chave do e-mail digitado no link (D-1247, CA-2291), o "Confirmar" também leva o endereço ao link, com a data da
 * confirmação, mesmo sem nenhum aviso marcado, e manda o link do plano para ele (D-1258, CA-2303).
 */
async function confirmar(c: Contexto, pedidos: unknown, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  if (c.link === null) return NAO_VALE
  // Usada: a mesma resposta de antes, sem aceitar de novo.
  if (c.chave.usadoEm !== null) return pagina(c)
  const emailHash = c.chave.emailHash
  const novo = c.chave.email
  if (emailHash === null) return NAO_VALE
  if (novo !== null) {
    // A chave guarda o endereço e o resumo dele: os dois têm que bater.
    if ((await deps.hash(novo)) !== emailHash) return NAO_VALE
  } else if (c.email === null || c.email.emailHash !== emailHash) {
    // CA-2257: o endereço do link mudou depois do S3: a chave do antigo não aceita para o novo.
    return NAO_VALE
  }
  const marcados = Array.isArray(pedidos) ? TIPOS_DE_AVISO.filter((t) => pedidos.includes(t)) : c.chave.avisos.filter(ehTipoDeAviso)
  // CA-2242: só o que a nutricionista oferece.
  const escolhidos = marcados.filter((t) => oferecidos(c).includes(t))
  const agora = deps.agora()
  // D-1261 e CB-1232: o banco confere de novo a chave e o endereço de agora do link, segurando o link, e só então grava o
  // e-mail (CB-1229: vale o último confirmado; o mesmo endereço só ganha a data), os aceites, o "parar todos" desfeito e
  // a chave usada. A troca que caiu depois da leitura acima recusa aqui; a que vier depois devolve o link à ficha.
  const feito = await deps.banco.gravarEmailDoPaciente({
    chave: c.chave.chave,
    avisos: escolhidos,
    diaDaSemana: emBrasilia(new Date(c.chave.criadoEm)).diaDaSemana,
    ofertasPadrao: c.oferecerAosNovos,
    agora,
  })
  if (feito === 'nao-vale') return NAO_VALE
  if (feito === 'usada') {
    // Outro "Confirmar" da mesma chave chegou antes: a resposta dele, sem aceitar nem mandar de novo (CB-1222).
    const depoisDoOutro = await carregar(c.chave.chave, deps)
    return depoisDoOutro === null ? NAO_VALE : pagina(depoisDoOutro)
  }
  if (novo !== null) await mandarOLink(c.link, c.conta, novo, emailHash, deps)
  const email = await deps.banco.emailDoLink(c.link.id)
  const depois = await deps.banco.aceitesDoLink(c.link.id)
  return pagina({ ...c, email, aceites: depois, chave: { ...c.chave, usadoEm: agora.toISOString() } }, { feito: true })
}

/**
 * D-1258: o S1 para o e-mail que acabou de ser confirmado. O que não sai (o Resend fora, o teto, o banco) não desfaz a
 * confirmação (CB-1233): fica no registro, e o paciente pede de novo pelo "Receber" ou por "Recuperar meu link".
 * D-1265 e CA-2312: o e-mail que volta (devolvido) não recebe nada; o marcado como spam recebe, porque foi ele que pediu.
 */
async function mandarOLink(link: LinkDoBanco, nutri: DadosDaNutricionista, email: string, emailHash: string, deps: DependenciasComuns): Promise<void> {
  try {
    if ((await deps.banco.suprimidos([emailHash])).get(emailHash) === 'devolvido') {
      deps.log('O link do "Confirmar" não sai: o e-mail voltou.')
      return
    }
    if ((await enviarServico([itemDoLinkDoPlano(link, nutri, email, emailHash, deps)], deps)) !== 'enviado') deps.log('O link do "Confirmar" não saiu agora.')
  } catch {
    deps.log('O link do "Confirmar" falhou no meio.')
  }
}

/** D-1235 e CA-2253: "Não quero mais receber". A chave usada responde como feita, sem mexer de novo. */
async function sair(c: Contexto, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  if (c.chave.usadoEm !== null) return pagina(c, { feito: true })
  const agora = deps.agora()
  const aviso = c.chave.avisos[0]
  let desfazer: Desfazer
  if (aviso === 'n1') {
    await deps.banco.definirResumoDaAdesao(c.chave.nutricionistaId, false)
    desfazer = { aceites: [], parouTudoAntes: null, resumoAntes: c.resumoDaAdesao }
  } else if (c.link === null) {
    return NAO_VALE
  } else if (aviso === 's2' || aviso === 'todos') {
    // CA-2254: o S2 tira o plano inteiro ("Não quero receber e-mails deste plano").
    desfazer = await pararNoLink(c, agora, deps)
  } else if (ehTipoDeAviso(aviso)) {
    const ids = c.aceites.filter((a) => a.saiuEm === null && a.tipo === aviso).map((a) => a.id)
    await deps.banco.sairDosAceites(ids, agora)
    desfazer = { aceites: ids, parouTudoAntes: c.email?.parouTudoEm ?? null }
  } else {
    return NAO_VALE
  }
  await deps.banco.marcarChave(c.chave.chave, { usadoEm: agora, desfazer })
  return pagina({ ...c, chave: { ...c.chave, usadoEm: agora.toISOString(), desfazer } }, { feito: true })
}

/** Para tudo no link: os avisos e o S2 (CA-2254). Devolve o que desfazer. */
async function pararNoLink(c: Contexto, agora: Date, deps: DependenciasComuns, antes: Desfazer | null = null): Promise<Desfazer> {
  if (c.link === null) return { aceites: [], parouTudoAntes: null }
  const ids = c.aceites.filter((a) => a.saiuEm === null).map((a) => a.id)
  await deps.banco.sairDosAceites(ids, agora)
  if (!c.email?.parouTudoEm) await deps.banco.pararTudo(c.link.id, agora.toISOString())
  return { aceites: [...(antes?.aceites ?? []), ...ids], parouTudoAntes: antes ? antes.parouTudoAntes : (c.email?.parouTudoEm ?? null) }
}

/** "Parar todos os e-mails deste plano", depois de sair de um aviso (CA-2254). */
async function pararTodos(c: Contexto, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  if (c.link === null) return NAO_VALE
  const agora = deps.agora()
  const desfazer = await pararNoLink(c, agora, deps, c.chave.usadoEm !== null ? c.chave.desfazer : null)
  await deps.banco.marcarChave(c.chave.chave, { usadoEm: agora, desfazer })
  return pagina({ ...c, chave: { ...c.chave, usadoEm: agora.toISOString(), desfazer } }, { feito: true, aviso: 'todos' })
}

/** "Desfazer" (CA-2253): tudo volta como estava, sem novo S3. */
async function desfazer(c: Contexto, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  const guardado = c.chave.desfazer
  if (c.chave.usadoEm === null || guardado === null) return pagina(c, { feito: false })
  if (c.chave.avisos[0] === 'n1') await deps.banco.definirResumoDaAdesao(c.chave.nutricionistaId, guardado.resumoAntes ?? true)
  if (c.link !== null) {
    await deps.banco.voltarAosAceites(guardado.aceites)
    await deps.banco.pararTudo(c.link.id, guardado.parouTudoAntes)
  }
  await deps.banco.marcarChave(c.chave.chave, { usadoEm: null, desfazer: null })
  return pagina({ ...c, chave: { ...c.chave, usadoEm: null, desfazer: null } }, { feito: false })
}
