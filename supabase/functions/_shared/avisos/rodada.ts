// A função `avisos` (spec lado-do-paciente, D-1228 a D-1232, D-1236, D-1237, DP-LP-10 a DP-LP-13): a rodada que o
// agendamento do banco chama, com a chave do cofre no cabeçalho.
//   - 'n1' (segunda 7h): o resumo da adesão a cada nutricionista (D-1231);
//   - 'manha' (8h): o A1 da noite, o resumo da semana (A2) e o N1 que ficou para depois;
//   - 'tarde' (18h): os lembretes (A3 e A4);
//   - 'a1' (a cada 15 minutos, das 8h às 20h45): só o A1 vencido.
// Na hora de mandar, tudo é conferido de novo (o interruptor, o aceite, a supressão, CB-1209 e CB-1214). Os avisos só
// saem das 8h às 21h (CA-2251), um por dia e três por semana por endereço (D-1232), por prioridade e dentro do teto
// (D-1237). Cada envio tem a chave única por endereço, tipo, dia e link: a chamada repetida não manda nada duas vezes
// (CA-2276). Puro: o banco, o envio e o relógio chegam de fora.
import { diasEntre, estadoDoAcompanhamento, ultimaMarcacao } from '../adesao.ts'
import { nomeDoRemetente, primeiroNomeDoLink, remetenteDoLink, responderPara, urlDaAdesao, urlDaPagina, urlDeUmClique, urlDoLink, type DependenciasComuns } from './comum.ts'
import {
  cabecalhosDeDescadastro,
  emailAdesaoDaSemana,
  emailLembrete,
  emailPlanoAtualizado,
  emailResumoDaSemana,
  emailUltimoLembrete,
  type EmailMontado,
} from './emails.ts'
import type { AceiteDoBanco, AvisoDaChave, DadosDaNutricionista, EmailDoLink, EnvioDoBanco, LinkDoBanco, NovoEnvio, RespostaDaFuncao } from './portas.ts'
import { SAIRAM } from './portas.ts'
import {
  avaliarLembrete,
  avaliarPlanoAtualizado,
  avaliarResumo,
  cabeNoEndereco,
  dentroDaJanela,
  diaDeBrasilia,
  emBrasilia,
  porPrioridade,
  somarDias,
  type EnvioDoEndereco,
  type ResumoAnterior,
} from './regras.ts'
import { motivoDaPausa, JANELA_DA_REPUTACAO_MS } from './reputacao.ts'
import { cortarNoTeto, inicioDoDiaDoTeto, inicioDoMesDoTeto } from './tetos.ts'
import type { TipoDeEmail } from './tipos.ts'

/** O cabeçalho em que o agendamento manda a chave (supabase/017, `pedir_avisos`). */
export const CABECALHO_DA_CHAVE = 'x-chave-dos-avisos'
/** A chave do cofre tem 64 caracteres; outro tamanho é recusado sem perguntar ao banco. */
export const TAMANHO_DA_CHAVE = 64

export type Vez = 'n1' | 'manha' | 'tarde' | 'a1'
const VEZES: readonly Vez[] = ['n1', 'manha', 'tarde', 'a1']

const DIA_MS = 24 * 60 * 60 * 1000
/** Quanto do histórico de cada link as regras olham (o resumo pausado olha 3 semanas). */
const HISTORICO_MS = 60 * DIA_MS

export interface PedidoDaRodada {
  readonly metodo: string
  readonly chave: string | null
  readonly corpo: unknown
}

/** Um e-mail que a rodada quer mandar. */
interface Candidato {
  readonly tipo: TipoDeEmail
  readonly linkId: string | null
  readonly nutricionistaId: string
  readonly email: string
  readonly emailHash: string
  readonly chaveUnica: string
  readonly assunto: string
  readonly extra: Readonly<Record<string, unknown>> | null
  /** O descadastro deste e-mail (D-1235). */
  readonly aviso: AvisoDaChave
  readonly nomeDoRemetente: string
  readonly responderPara: string | null
  readonly montar: (urlSair: string) => EmailMontado
  /** O que muda depois de sair (o A1 que sai do agendamento, o resumo que volta da pausa). */
  readonly depois?: () => Promise<void>
}

const objeto = (valor: unknown): Readonly<Record<string, unknown>> => (typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {})
const saiu = (e: EnvioDoBanco): boolean => SAIRAM.includes(e.estado)

/** Tudo o que as regras de um link precisam, lido uma vez por rodada. */
interface Leitura {
  readonly links: ReadonlyMap<string, LinkDoBanco>
  readonly emails: ReadonlyMap<string, EmailDoLink>
  readonly aceites: readonly AceiteDoBanco[]
  readonly suprimidos: ReadonlyMap<string, 'devolvido' | 'queixa'>
  readonly enviosPorLink: ReadonlyMap<string, readonly EnvioDoBanco[]>
  readonly enviosPorEndereco: ReadonlyMap<string, readonly EnvioDoBanco[]>
  readonly nutris: ReadonlyMap<string, DadosDaNutricionista>
}

function agrupar<T>(itens: readonly T[], chave: (item: T) => string | null): ReadonlyMap<string, readonly T[]> {
  const mapa = new Map<string, T[]>()
  for (const item of itens) {
    const k = chave(item)
    if (k === null) continue
    mapa.set(k, [...(mapa.get(k) ?? []), item])
  }
  return mapa
}

async function ler(deps: DependenciasComuns, agora: Date, linkIdsExtras: readonly string[]): Promise<Leitura> {
  const aceites = await deps.banco.aceitesAtivos()
  const ids = [...new Set([...aceites.map((a) => a.linkId).filter((id): id is string => id !== null), ...linkIdsExtras])]
  const links = new Map((await deps.banco.linksPorIds(ids)).filter((l) => l.substituidoPor === null).map((l) => [l.id, l]))
  const emails = new Map((await deps.banco.emailsDosLinks([...links.keys()])).map((e) => [e.linkId, e]))
  const hashes = [...new Set([...emails.values()].map((e) => e.emailHash).filter((h): h is string => h !== null))]
  const suprimidos = await deps.banco.suprimidos(hashes)
  const desde = new Date(agora.getTime() - HISTORICO_MS)
  const enviosPorLink = agrupar(await deps.banco.enviosDosLinks([...links.keys()], desde), (e) => e.linkId)
  const enviosPorEndereco = agrupar(await deps.banco.enviosDosEnderecos(hashes, new Date(agora.getTime() - 8 * DIA_MS)), (e) => e.emailHash)
  const nutris = new Map<string, DadosDaNutricionista>()
  for (const conta of new Set([...links.values()].map((l) => l.nutricionistaId))) {
    const nutri = await deps.banco.nutricionista(conta)
    if (nutri) nutris.set(conta, nutri)
  }
  return { links, emails, aceites, suprimidos, enviosPorLink, enviosPorEndereco, nutris }
}

/** O link pode receber aviso agora: o e-mail existe, não parou tudo e não está na supressão. */
function enderecoDoLink(l: Leitura, link: LinkDoBanco): EmailDoLink | null {
  const e = l.emails.get(link.id)
  if (!e?.email || !e.emailHash || e.parouTudoEm !== null || l.suprimidos.has(e.emailHash)) return null
  return e
}

/** O aceite ativo deste aviso para o endereço de agora, se a nutricionista oferece (CA-2242, CA-2263). */
function aceiteDe(l: Leitura, link: LinkDoBanco, e: EmailDoLink, tipo: 'plano' | 'semana' | 'lembrete'): AceiteDoBanco | null {
  if (!e.ofertas[tipo]) return null
  return l.aceites.find((a) => a.linkId === link.id && a.tipo === tipo && a.emailHash === e.emailHash && a.saiuEm === null) ?? null
}

export async function rodarAvisos(pedido: PedidoDaRodada, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  if (pedido.metodo !== 'POST') return { status: 405, corpo: { erro: 'Use POST.' } }
  const chave = pedido.chave?.trim() ?? ''
  // CA-2270: sem a chave do cofre, nada é lido nem enviado.
  if (chave.length !== TAMANHO_DA_CHAVE || !(await deps.banco.chaveDaRodadaConfere(chave))) return { status: 401, corpo: { erro: 'Chave dos avisos ausente ou errada.' } }
  const vez = VEZES.find((v) => v === objeto(pedido.corpo)['vez'])
  if (vez === undefined) return { status: 400, corpo: { erro: 'Vez desconhecida.' } }

  const agora = deps.agora()
  const momento = emBrasilia(agora)
  const hoje = momento.dia
  const tetos = deps.tetos()
  await deps.banco.gravarTetos(tetos)

  // D-1239: a reputação decide a pausa também aqui, para o evento que o webhook perdeu.
  let pausado = (await deps.banco.estadoDosAvisos()).pausadoEm !== null
  if (!pausado) {
    const motivo = motivoDaPausa(await deps.banco.taxasDesde(new Date(agora.getTime() - JANELA_DA_REPUTACAO_MS)))
    if (motivo !== null) {
      await deps.banco.pausarAvisos(motivo, agora)
      deps.log('Avisos pausados pela reputação:', motivo)
      pausado = true
    }
  }

  const naJanela = dentroDaJanela(agora)
  const vencidos = naJanela && (vez === 'manha' || vez === 'a1') ? await deps.banco.linksComA1Vencido(agora) : []
  const leitura = vez === 'n1' ? null : await ler(deps, agora, vencidos.map((l) => l.id))
  const candidatos: Candidato[] = []
  const adiadosDeAntemao: Candidato[] = []

  if (leitura !== null && naJanela) {
    if (vez === 'manha' || vez === 'a1') candidatos.push(...(await planosAtualizados(leitura, vencidos, agora, hoje, deps)))
    if (vez === 'manha') {
      const { vao, adiados } = await resumos(leitura, agora, hoje, deps)
      candidatos.push(...vao)
      adiadosDeAntemao.push(...adiados)
    }
    if (vez === 'tarde') candidatos.push(...lembretes(leitura, hoje, deps))
  }
  // A segunda de manhã retoma o N1 que o teto adiou às 7h (D-1237); o que já saiu não sai de novo (a chave única).
  if (vez === 'n1' || (vez === 'manha' && momento.diaDaSemana === 1)) candidatos.push(...(await resumosDaAdesao(hoje, deps)))

  // D-1232 e CA-2250: um aviso por dia e três por semana por endereço, pela prioridade.
  const noEndereco = new Map<string, EnvioDoEndereco[]>()
  const enviosDoEndereco = (hash: string): EnvioDoEndereco[] => {
    const ja = noEndereco.get(hash)
    if (ja) return ja
    const lidos = (leitura?.enviosPorEndereco.get(hash) ?? []).filter(saiu).map((e) => ({ linkId: e.linkId, nutricionistaId: e.nutricionistaId, tipo: e.tipo, dia: e.dia }))
    noEndereco.set(hash, lidos)
    return lidos
  }
  const cabem: Candidato[] = []
  const adiados: Candidato[] = [...adiadosDeAntemao]
  let pulados = 0
  for (const c of porPrioridade(candidatos)) {
    if (c.tipo === 'N1') {
      cabem.push(c)
      continue
    }
    const lista = enviosDoEndereco(c.emailHash)
    if (c.linkId !== null && cabeNoEndereco(lista, { linkId: c.linkId, nutricionistaId: c.nutricionistaId }, hoje)) {
      cabem.push(c)
      lista.push({ linkId: c.linkId, nutricionistaId: c.nutricionistaId, tipo: c.tipo, dia: hoje })
    } else if (c.tipo === 'A3' || c.tipo === 'A4') pulados++
    else adiados.push(c)
  }

  // D-1239: pausados, os avisos ao paciente não saem (o N1 é à nutricionista).
  const daPausa = pausado ? cabem.filter((c) => c.tipo !== 'N1') : []
  const contagem = await deps.banco.contarEnvios(inicioDoDiaDoTeto(agora), inicioDoMesDoTeto(agora))
  const corte = cortarNoTeto(
    cabem.filter((c) => !daPausa.includes(c)),
    contagem,
    tetos,
  )
  pulados += corte.descartados.length

  const registrar = (lista: readonly Candidato[], estado: NovoEnvio['estado']): NovoEnvio[] =>
    lista.map((c) => ({ linkId: c.linkId, nutricionistaId: c.nutricionistaId, tipo: c.tipo, emailHash: c.emailHash, assunto: c.assunto, estado, chaveUnica: c.chaveUnica, dia: hoje, contaNoTeto: true, extra: c.extra }))
  await deps.banco.registrarEnvios([...registrar(daPausa, 'pausado'), ...registrar([...adiados, ...corte.adiados], 'adiado')])

  const enviados = await mandar(corte.vao, vez, registrar, deps)
  const naoSairam = corte.vao.length - enviados
  return { status: 200, corpo: { enviados, adiados: adiados.length + corte.adiados.length + daPausa.length + naoSairam, pulados } }
}

/** Grava, manda em lote e anota o resultado. Devolve quantos saíram. */
async function mandar(
  vao: readonly Candidato[],
  vez: Vez,
  registrar: (lista: readonly Candidato[], estado: NovoEnvio['estado']) => NovoEnvio[],
  deps: DependenciasComuns,
): Promise<number> {
  if (vao.length === 0) return 0
  const ficaram = new Set(await deps.banco.registrarEnvios(registrar(vao, 'enviado')))
  const daVez = vao.filter((c) => ficaram.has(c.chaveUnica))
  if (daVez.length === 0) return 0
  const emails = []
  for (const c of daVez) {
    const sair = (await deps.banco.chaveDeSair(c.linkId, c.nutricionistaId, c.aviso)) ?? ''
    const montado = c.montar(urlDaPagina(deps.ambiente, sair))
    emails.push({
      ...montado,
      nomeDoRemetente: c.nomeDoRemetente,
      para: c.email,
      responderPara: c.responderPara,
      cabecalhos: cabecalhosDeDescadastro(urlDeUmClique(deps.ambiente, sair)),
      tipo: c.tipo,
    })
  }
  const idempotencia = `avisos-${vez}-${(await deps.hash(daVez.map((c) => c.chaveUnica).join('|'))).slice(0, 40)}`
  const resultados = await deps.enviar(emails, idempotencia)
  let enviados = 0
  for (let i = 0; i < daVez.length; i++) {
    const c = daVez[i] as Candidato
    const r = resultados[i]
    if (r?.ok) {
      enviados++
      await deps.banco.marcarEnvio(c.chaveUnica, { estado: 'enviado', resendId: r.id })
      await c.depois?.()
    } else if (c.tipo === 'A3' || c.tipo === 'A4') {
      // D-1237: o lembrete não fica para depois; amanhã a regra roda de novo.
      await deps.banco.apagarEnvios([c.chaveUnica])
    } else {
      // CA-2275 e CB-1216: 429 ou Resend fora: o que não saiu fica adiado, sem repetir o que saiu.
      await deps.banco.marcarEnvio(c.chaveUnica, { estado: 'adiado' })
    }
  }
  return enviados
}

const chaveUnica = (hash: string, tipo: TipoDeEmail, dia: string, dono: string): string => `${hash}:${tipo}:${dia}:${dono}`

/** O comum de um aviso ao paciente. */
function aviso(link: LinkDoBanco, e: EmailDoLink, nutri: DadosDaNutricionista, hoje: string, tipo: 'A1' | 'A2' | 'A3' | 'A4', montado: (urlSair: string) => EmailMontado, extra: Readonly<Record<string, unknown>> | null, depois?: () => Promise<void>): Candidato {
  const avisoDaChave: AvisoDaChave = tipo === 'A1' ? 'plano' : tipo === 'A2' ? 'semana' : 'lembrete'
  return {
    tipo,
    linkId: link.id,
    nutricionistaId: link.nutricionistaId,
    email: e.email ?? '',
    emailHash: e.emailHash ?? '',
    chaveUnica: chaveUnica(e.emailHash ?? '', tipo, hoje, link.id),
    assunto: montado('').assunto,
    extra,
    aviso: avisoDaChave,
    nomeDoRemetente: nomeDoRemetente(nutri),
    responderPara: responderPara(nutri),
    montar: montado,
    ...(depois ? { depois } : {}),
  }
}

/** A1 (D-1230, CA-2249): o vencido sai; o que não vale mais sai do agendamento. */
async function planosAtualizados(l: Leitura, vencidos: readonly LinkDoBanco[], agora: Date, hoje: string, deps: DependenciasComuns): Promise<Candidato[]> {
  const candidatos: Candidato[] = []
  for (const vencido of vencidos) {
    const link = l.links.get(vencido.id)
    const e = link ? enderecoDoLink(l, link) : null
    const nutri = link ? l.nutris.get(link.nutricionistaId) : undefined
    if (!link || !e || !nutri || aceiteDe(l, link, e, 'plano') === null) {
      // CB-1209: o aviso desligado (ou o paciente que saiu) depois do agendamento: o A1 não sai.
      await deps.banco.agendarA1(vencido.id, null)
      continue
    }
    const deHoje = (l.enviosPorLink.get(link.id) ?? []).filter((x) => saiu(x) && x.dia === hoje).map((x) => x.tipo)
    const decisao = avaliarPlanoAtualizado({ agora, a1Para: link.a1Para, enviosDeHoje: deHoje })
    if (decisao === 'cancelar') await deps.banco.agendarA1(link.id, null)
    if (decisao !== 'mandar') continue
    const atualizadoEm = diaDeBrasilia(link.planoEm ?? link.criadoEm)
    candidatos.push(
      aviso(
        link,
        e,
        nutri,
        hoje,
        'A1',
        (urlSair) => emailPlanoAtualizado({ primeiroNome: primeiroNomeDoLink(link), remetente: remetenteDoLink(nutri, link), url: urlDoLink(deps.ambiente, link.token), atualizadoEm, urlSair }),
        null,
        () => deps.banco.agendarA1(link.id, null),
      ),
    )
  }
  return candidatos
}

/** A2 (D-1229): o resumo do dia; com o lembrete previsto para hoje, o resumo fica para amanhã (CA-2250). */
async function resumos(l: Leitura, agora: Date, hoje: string, deps: DependenciasComuns): Promise<{ readonly vao: Candidato[]; readonly adiados: Candidato[] }> {
  const vao: Candidato[] = []
  const adiados: Candidato[] = []
  for (const link of l.links.values()) {
    const e = enderecoDoLink(l, link)
    const nutri = l.nutris.get(link.nutricionistaId)
    if (!e || !nutri) continue
    const aceite = aceiteDe(l, link, e, 'semana')
    if (aceite === null) continue
    const historico = l.enviosPorLink.get(link.id) ?? []
    const anteriores: ResumoAnterior[] = historico.filter((x) => x.tipo === 'A2').map((x) => ({ dia: x.dia, estado: x.estado, dias: typeof x.extra?.['dias'] === 'number' ? x.extra['dias'] : null }))
    const decisao = avaliarResumo({ hoje, marcacoes: link.marcacoes, missoes: link.missoes, aceitoEm: aceite.aceitoEm, diaDaSemana: aceite.diaDaSemana, resumos: anteriores })
    if (decisao === null) continue
    if ('pausado' in decisao) {
      if (aceite.pausadoEm === null) await deps.banco.pausarResumo(aceite.id, agora)
      continue
    }
    const candidato = aviso(
      link,
      e,
      nutri,
      hoje,
      'A2',
      (urlSair) =>
        emailResumoDaSemana({
          primeiroNome: primeiroNomeDoLink(link),
          remetente: remetenteDoLink(nutri, link),
          url: urlDoLink(deps.ambiente, link.token),
          semana: decisao.semana,
          dias: decisao.dias,
          missoes: decisao.missoes,
          diaDaSemana: aceite.diaDaSemana,
          urlSair,
        }),
      { dias: decisao.dias },
      aceite.pausadoEm !== null ? () => deps.banco.pausarResumo(aceite.id, null) : undefined,
    )
    const lembrete = aceiteDe(l, link, e, 'lembrete')
    const lembretesDoLink = historico.filter((x) => (x.tipo === 'A3' || x.tipo === 'A4') && saiu(x)).map((x) => ({ tipo: x.tipo as 'A3' | 'A4', dia: x.dia }))
    const lembreteHoje =
      lembrete !== null &&
      avaliarLembrete({ hoje, marcacoes: link.marcacoes, aceitoEm: lembrete.aceitoEm, planoEm: link.planoEm, ultimoAcesso: link.ultimoAcesso, lembretes: lembretesDoLink }, { ignorarAcesso: true }) !== null
    if (lembreteHoje) adiados.push(candidato)
    else vao.push(candidato)
  }
  return { vao, adiados }
}

/** A3 e A4 (D-1228): às 18h. */
function lembretes(l: Leitura, hoje: string, deps: DependenciasComuns): Candidato[] {
  const candidatos: Candidato[] = []
  for (const link of l.links.values()) {
    const e = enderecoDoLink(l, link)
    const nutri = l.nutris.get(link.nutricionistaId)
    if (!e || !nutri) continue
    const aceite = aceiteDe(l, link, e, 'lembrete')
    if (aceite === null) continue
    const enviados = (l.enviosPorLink.get(link.id) ?? []).filter((x) => (x.tipo === 'A3' || x.tipo === 'A4') && saiu(x)).map((x) => ({ tipo: x.tipo as 'A3' | 'A4', dia: x.dia }))
    const decisao = avaliarLembrete({ hoje, marcacoes: link.marcacoes, aceitoEm: aceite.aceitoEm, planoEm: link.planoEm, ultimoAcesso: link.ultimoAcesso, lembretes: enviados })
    if (decisao === null) continue
    const base = { primeiroNome: primeiroNomeDoLink(link), remetente: remetenteDoLink(nutri, link), url: urlDoLink(deps.ambiente, link.token) }
    candidatos.push(
      aviso(
        link,
        e,
        nutri,
        hoje,
        decisao.tipo,
        (urlSair) => (decisao.tipo === 'A3' ? emailLembrete({ ...base, dias: decisao.dias, urlSair }) : emailUltimoLembrete({ ...base, urlSair })),
        { dias: decisao.dias },
      ),
    )
  }
  return candidatos
}

/** N1 (D-1231, CA-2267, CA-2268): segunda 7h, a cada conta com o resumo ligado e pacientes em acompanhamento. */
async function resumosDaAdesao(hoje: string, deps: DependenciasComuns): Promise<Candidato[]> {
  const candidatos: Candidato[] = []
  for (const conta of await deps.banco.contasComLinks()) {
    const nutri = await deps.banco.nutricionista(conta)
    if (!nutri?.resumoDaAdesao || !nutri.emailDaConta) continue
    const links = await deps.banco.linksDaConta(conta)
    if (links.length === 0) continue
    const emailHash = await deps.hash(nutri.emailDaConta)
    if ((await deps.banco.suprimidos([emailHash])).get(emailHash) === 'devolvido') continue
    const numeros = { emDia: 0, atencao: 0, pararam: 0, naoComecaram: 0 }
    const pararam: { nome: string; dias: number }[] = []
    for (const link of links) {
      const estado = estadoDoAcompanhamento(link, hoje)
      if (estado === 'em-dia') numeros.emDia++
      else if (estado === 'atencao') numeros.atencao++
      else if (estado === 'nao-comecou') numeros.naoComecaram++
      else {
        numeros.pararam++
        const desde = ultimaMarcacao(link) ?? link.criadoEm.slice(0, 10)
        pararam.push({ nome: link.nome, dias: diasEntre(desde, hoje) })
      }
    }
    pararam.sort((a, b) => b.dias - a.dias)
    const inicio = somarDias(hoje, -7)
    const fim = somarDias(hoje, -1)
    const montar = (urlSair: string) => emailAdesaoDaSemana({ inicio, fim, numeros, pararam, urlAdesao: urlDaAdesao(deps.ambiente), urlSair })
    candidatos.push({
      tipo: 'N1',
      linkId: null,
      nutricionistaId: conta,
      email: nutri.emailDaConta,
      emailHash,
      chaveUnica: chaveUnica(emailHash, 'N1', hoje, conta),
      assunto: montar('').assunto,
      extra: { ...numeros },
      aviso: 'n1',
      // D-1225: o N1 sai como "MetaNutri".
      nomeDoRemetente: 'MetaNutri',
      responderPara: null,
      montar,
    })
  }
  return candidatos
}
