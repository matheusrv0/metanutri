// O banco e o Resend de mentira das funções de e-mail (spec lado-do-paciente): guardam tudo em memória, com as mesmas
// regras do supabase/017 (a chave única do envio, um aceite ativo por link, tipo e endereço). Nada sai da máquina.
import { hashDoEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import type { DependenciasComuns } from '../../supabase/functions/_shared/avisos/comum.ts'
import type {
  AceiteDoBanco,
  BancoDosAvisos,
  ChaveDeAviso,
  DadosDaNutricionista,
  EmailDoLink,
  EnvioDoBanco,
  EstadoDoEnvio,
  LinkDoBanco,
  NovoEnvio,
} from '../../supabase/functions/_shared/avisos/portas.ts'
import { SAIRAM } from '../../supabase/functions/_shared/avisos/portas.ts'
import type { EmailParaEnviar, ResultadoDoEnvio } from '../../supabase/functions/_shared/avisos/resend.ts'
import { TETOS_PADRAO, type Tetos } from '../../supabase/functions/_shared/avisos/tetos.ts'
import { CORES_PRONTAS } from '../domain/corDaMarca.ts'

export const ANA: DadosDaNutricionista = {
  id: 'nutri-ana',
  nome: 'Ana Lima',
  responderPara: 'ana@nutricaoclinica.com.br',
  emailDaConta: 'ana.conta@gmail.com',
  estudante: false,
  crnRegiao: 3,
  crnNumero: '12345',
  // Uma cor pronta de "Sua marca", que passa no contraste com o branco (D-954).
  cor: CORES_PRONTAS.find((c) => c.nome === 'Verde-folha')?.valor ?? null,
  resumoDaAdesao: true,
  oferecerAosNovos: true,
}

export const linkDe = (sobre: Partial<LinkDoBanco> = {}): LinkDoBanco => ({
  id: 'link-juliana',
  nutricionistaId: ANA.id,
  token: 'k7q2mx9pla3r',
  nome: 'Juliana Martins, 34 anos',
  criadoEm: '2026-10-01T12:00:00.000Z',
  planoEm: '2026-10-01T12:00:00.000Z',
  ultimoAcesso: null,
  a1Para: null,
  substituidoPor: null,
  usoNaoComercial: false,
  marcacoes: [],
  missoes: 4,
  ...sobre,
})

export interface EnvioFalso extends EnvioDoBanco {
  readonly assunto: string
  readonly contaNoTeto: boolean
}

export interface EstadoFalso {
  readonly links: Map<string, LinkDoBanco>
  readonly emails: Map<string, EmailDoLink>
  aceites: AceiteDoBanco[]
  readonly chaves: Map<string, ChaveDeAviso>
  envios: EnvioFalso[]
  readonly supressao: Map<string, 'devolvido' | 'queixa'>
  readonly nutris: Map<string, DadosDaNutricionista>
  readonly limites: { readonly chave: string; readonly quando: number }[]
  estado: { pausadoEm: string | null; motivo: string | null }
  tetosGravados: Tetos | null
  chaveDaRodada: string
  /** Falha do banco em todas as consultas (rejeitam). */
  falhar: boolean
}

let proximoAceite = 1

export function bancoFalso(inicio: Partial<Pick<EstadoFalso, 'chaveDaRodada'>> = {}): { readonly banco: BancoDosAvisos; readonly estado: EstadoFalso } {
  const estado: EstadoFalso = {
    links: new Map(),
    emails: new Map(),
    aceites: [],
    chaves: new Map(),
    envios: [],
    supressao: new Map(),
    nutris: new Map([[ANA.id, ANA]]),
    limites: [],
    estado: { pausadoEm: null, motivo: null },
    tetosGravados: null,
    chaveDaRodada: inicio.chaveDaRodada ?? 'c'.repeat(64),
    falhar: false,
  }
  const ok = async <T>(valor: () => T): Promise<T> => {
    if (estado.falhar) throw new Error('banco fora')
    return valor()
  }
  const contam = (l: LinkDoBanco) => l.substituidoPor === null
  const banco: BancoDosAvisos = {
    linkPorToken: (token) =>
      ok(() => {
        const achado = [...estado.links.values()].find((l) => l.token === token) ?? null
        if (achado?.substituidoPor) return estado.links.get(achado.substituidoPor) ?? achado
        return achado
      }),
    linksPorIds: (ids) => ok(() => ids.map((id) => estado.links.get(id)).filter((l): l is LinkDoBanco => l !== undefined)),
    linksDaConta: (id) => ok(() => [...estado.links.values()].filter((l) => l.nutricionistaId === id && contam(l))),
    contasComLinks: () => ok(() => [...new Set([...estado.links.values()].filter(contam).map((l) => l.nutricionistaId))]),
    linksComA1Vencido: (ate) => ok(() => [...estado.links.values()].filter((l) => l.a1Para !== null && Date.parse(l.a1Para) <= ate.getTime())),
    agendarA1: (id, quando) =>
      ok(() => {
        const l = estado.links.get(id)
        if (l) estado.links.set(id, { ...l, a1Para: quando ? quando.toISOString() : null })
      }),
    emailDoLink: (id) => ok(() => estado.emails.get(id) ?? null),
    emailsDosLinks: (ids) => ok(() => ids.map((id) => estado.emails.get(id)).filter((e): e is EmailDoLink => e !== undefined)),
    emailsPorHash: (hash) =>
      ok(() =>
        [...estado.emails.values()].filter(
          (e) => e.emailHash === hash && (e.origem === 'ficha' || e.confirmadoEm !== null) && (estado.links.get(e.linkId)?.substituidoPor ?? null) === null,
        ),
      ),
    gravarEmailDoPaciente: (link, email, emailHash, oferece, confirmadoEm) =>
      ok(() => {
        const atual = estado.emails.get(link.id)
        estado.emails.set(link.id, {
          linkId: link.id,
          nutricionistaId: link.nutricionistaId,
          email,
          emailHash,
          origem: 'paciente',
          emailFicha: atual?.emailFicha ?? null,
          confirmadoEm: confirmadoEm.toISOString(),
          ofertas: atual?.ofertas ?? { plano: oferece, semana: oferece, lembrete: oferece },
          parouTudoEm: atual?.parouTudoEm ?? null,
          conviteEm: atual?.conviteEm ?? null,
        })
      }),
    marcarConfirmado: (id, quando) =>
      ok(() => {
        const e = estado.emails.get(id)
        if (e) estado.emails.set(id, { ...e, confirmadoEm: quando.toISOString() })
      }),
    marcarConvite: (id, quando) =>
      ok(() => {
        const e = estado.emails.get(id)
        if (e) estado.emails.set(id, { ...e, conviteEm: quando.toISOString() })
      }),
    pararTudo: (id, quando) =>
      ok(() => {
        const e = estado.emails.get(id)
        if (e) estado.emails.set(id, { ...e, parouTudoEm: quando })
      }),
    aceitesDoLink: (id) => ok(() => estado.aceites.filter((a) => a.linkId === id)),
    aceitesAtivos: () => ok(() => estado.aceites.filter((a) => a.saiuEm === null && a.linkId !== null)),
    criarAceite: (a) =>
      ok(() => {
        if (estado.aceites.some((x) => x.saiuEm === null && x.linkId === a.linkId && x.tipo === a.tipo && x.emailHash === a.emailHash)) return
        estado.aceites.push({ ...a, id: proximoAceite++, saiuEm: null, pausadoEm: null })
      }),
    sairDosAceites: (ids, quando) => ok(() => void (estado.aceites = estado.aceites.map((a) => (ids.includes(a.id) ? { ...a, saiuEm: quando.toISOString() } : a)))),
    voltarAosAceites: (ids) => ok(() => void (estado.aceites = estado.aceites.map((a) => (ids.includes(a.id) ? { ...a, saiuEm: null } : a)))),
    pausarResumo: (id, quando) => ok(() => void (estado.aceites = estado.aceites.map((a) => (a.id === id ? { ...a, pausadoEm: quando ? quando.toISOString() : null } : a)))),
    definirResumoDaAdesao: (id, ligado) =>
      ok(() => {
        const n = estado.nutris.get(id)
        if (n) estado.nutris.set(id, { ...n, resumoDaAdesao: ligado })
      }),
    criarChave: (c) => ok(() => void estado.chaves.set(c.chave, { ...c, criadoEm: c.criadoEm.toISOString(), usadoEm: null, desfazer: null })),
    chaveDeSair: (linkId, nutricionistaId, aviso, emailHash) =>
      ok(() => {
        const achada = [...estado.chaves.values()].find(
          (c) => c.tipo === 'sair' && c.linkId === linkId && c.nutricionistaId === nutricionistaId && c.avisos[0] === aviso && c.emailHash === emailHash,
        )
        if (achada) return achada.chave
        const chave = `sair${aviso}${linkId ?? nutricionistaId}${emailHash}`.replace(/[^A-Za-z0-9]/g, '').padEnd(32, 'x').slice(0, 32)
        estado.chaves.set(chave, { chave, linkId, nutricionistaId, tipo: 'sair', avisos: [aviso], emailHash, email: null, criadoEm: new Date().toISOString(), venceEm: null, usadoEm: null, desfazer: null })
        return chave
      }),
    lerChave: (chave) => ok(() => estado.chaves.get(chave) ?? null),
    apagarChave: (chave) => ok(() => void estado.chaves.delete(chave)),
    marcarChave: (chave, m) =>
      ok(() => {
        const c = estado.chaves.get(chave)
        if (c) estado.chaves.set(chave, { ...c, usadoEm: m.usadoEm ? m.usadoEm.toISOString() : null, desfazer: m.desfazer })
      }),
    enviosDosLinks: (ids, desde) => ok(() => estado.envios.filter((e) => e.linkId !== null && ids.includes(e.linkId) && Date.parse(e.criadoEm) >= desde.getTime())),
    enviosDosEnderecos: (hashes, desde) => ok(() => estado.envios.filter((e) => hashes.includes(e.emailHash) && Date.parse(e.criadoEm) >= desde.getTime())),
    contarEnvios: (dia, mes) =>
      ok(() => {
        const saiu = estado.envios.filter((e) => e.contaNoTeto && SAIRAM.includes(e.estado))
        const desde = (d: Date) => saiu.filter((e) => Date.parse(e.criadoEm) >= d.getTime())
        const aviso = (e: EnvioFalso) => e.tipo.startsWith('A')
        const porConta = new Map<string, number>()
        for (const e of desde(dia)) porConta.set(e.nutricionistaId, (porConta.get(e.nutricionistaId) ?? 0) + 1)
        return { dia: desde(dia).length, mes: desde(mes).length, avisosDia: desde(dia).filter(aviso).length, avisosMes: desde(mes).filter(aviso).length, porConta }
      }),
    registrarEnvios: (novos) =>
      ok(() => {
        const ficaram: string[] = []
        for (const n of novos) {
          const i = estado.envios.findIndex((e) => e.chaveUnica === n.chaveUnica)
          const linha: EnvioFalso = { ...n, resendId: null, criadoEm: agoraDoFalso().toISOString() }
          if (i === -1) {
            estado.envios.push(linha)
            ficaram.push(n.chaveUnica)
          } else if (estado.envios[i]?.estado === 'adiado' || estado.envios[i]?.estado === 'pausado') {
            estado.envios[i] = linha
            ficaram.push(n.chaveUnica)
          }
        }
        return ficaram
      }),
    marcarEnvio: (chave, m) => ok(() => void (estado.envios = estado.envios.map((e) => (e.chaveUnica === chave ? { ...e, estado: m.estado, resendId: m.resendId ?? e.resendId } : e)))),
    apagarEnvios: (chaves) => ok(() => void (estado.envios = estado.envios.filter((e) => e.chaveUnica === null || !chaves.includes(e.chaveUnica)))),
    envioPorResendId: (id) => ok(() => estado.envios.find((e) => e.resendId === id) ?? null),
    mudarEstadoPeloResend: (id, novo) => ok(() => void (estado.envios = estado.envios.map((e) => (e.resendId === id ? { ...e, estado: novo } : e)))),
    contarDevolucoesTemporarias: (hash, desde) =>
      ok(() => estado.envios.filter((e) => e.emailHash === hash && e.estado === 'devolucao-temporaria' && Date.parse(e.criadoEm) >= desde.getTime()).length),
    taxasDesde: (desde) =>
      ok(() => {
        const recentes = estado.envios.filter((e) => Date.parse(e.criadoEm) >= desde.getTime() && SAIRAM.includes(e.estado))
        return { envios: recentes.length, devolvidos: recentes.filter((e) => e.estado === 'devolvido').length, queixas: recentes.filter((e) => e.estado === 'queixa').length }
      }),
    suprimidos: (hashes) => ok(() => new Map([...estado.supressao].filter(([h]) => hashes.includes(h)))),
    suprimir: (hash, motivo) => ok(() => void estado.supressao.set(hash, motivo)),
    estadoDosAvisos: () => ok(() => ({ ...estado.estado })),
    pausarAvisos: (motivo, quando) => ok(() => void (estado.estado = { pausadoEm: quando.toISOString(), motivo })),
    gravarTetos: (tetos) => ok(() => void (estado.tetosGravados = tetos)),
    anotarLimite: (chave, limite, desde) =>
      ok(() => {
        const n = estado.limites.filter((l) => l.chave === chave && l.quando > desde.getTime()).length
        if (n >= limite) return false
        estado.limites.push({ chave, quando: agoraDoFalso().getTime() })
        return true
      }),
    devolverLimite: (chave) =>
      ok(() => {
        const i = estado.limites.map((l) => l.chave).lastIndexOf(chave)
        if (i >= 0) estado.limites.splice(i, 1)
      }),
    nutricionista: (id) => ok(() => estado.nutris.get(id) ?? null),
    chaveDaRodadaConfere: (chave) => ok(() => chave === estado.chaveDaRodada),
  }
  return { banco, estado }
}

/** O relógio dos falsos (os testes o mudam). */
let relogio = new Date('2026-11-03T13:15:00.000Z')
export const agoraDoFalso = (): Date => relogio
export const acertarRelogio = (quando: Date): void => {
  relogio = quando
}

export interface ResendFalso {
  readonly lotes: { readonly emails: readonly EmailParaEnviar[]; readonly idempotencia: string }[]
  /** O que o próximo envio responde: tudo certo, o 429 ou fora do ar. */
  modo: 'ok' | 'limite' | 'fora'
  readonly enviar: DependenciasComuns['enviar']
}

let proximoId = 1

export function resendFalso(): ResendFalso {
  const falso: ResendFalso = {
    lotes: [],
    modo: 'ok',
    enviar: async (emails, idempotencia) => {
      falso.lotes.push({ emails, idempotencia })
      return emails.map((): ResultadoDoEnvio => (falso.modo === 'ok' ? { ok: true, id: `re_${proximoId++}` } : { ok: false, motivo: falso.modo === 'limite' ? 'limite' : 'fora' }))
    },
  }
  return falso
}

let semente = 0

/** As dependências comuns, com o banco e o Resend de mentira. */
export function dependencias(banco: BancoDosAvisos, resend: ResendFalso, sobre: Partial<DependenciasComuns> = {}): DependenciasComuns {
  return {
    banco,
    enviar: resend.enviar,
    agora: agoraDoFalso,
    log: () => undefined,
    ambiente: { app: 'https://app.metanutri.com.br', funcoes: 'https://projeto.supabase.co/functions/v1' },
    tetos: () => TETOS_PADRAO,
    hash: hashDoEmail,
    aleatorio: (n) => Uint8Array.from({ length: n }, () => semente++ % 248),
    ...sobre,
  }
}

/** Põe um link com e-mail (e, se dito, aceites) no banco falso. */
export async function comLink(
  estado: EstadoFalso,
  sobre: { readonly link?: Partial<LinkDoBanco>; readonly email?: string | null; readonly aceites?: readonly AceiteDoBanco['tipo'][]; readonly ofertas?: Partial<EmailDoLink['ofertas']>; readonly aceitoEm?: string } = {},
): Promise<{ readonly link: LinkDoBanco; readonly emailHash: string | null }> {
  const link = linkDe(sobre.link)
  estado.links.set(link.id, link)
  const email = sobre.email === undefined ? 'juliana.martins@gmail.com' : sobre.email
  const emailHash = email === null ? null : await hashDoEmail(email)
  estado.emails.set(link.id, {
    linkId: link.id,
    nutricionistaId: link.nutricionistaId,
    email,
    emailHash,
    origem: email === null ? null : 'ficha',
    emailFicha: email,
    confirmadoEm: null,
    ofertas: { plano: true, semana: true, lembrete: true, ...sobre.ofertas },
    parouTudoEm: null,
    conviteEm: null,
  })
  for (const tipo of sobre.aceites ?? []) {
    if (emailHash === null) continue
    estado.aceites.push({ id: proximoAceite++, linkId: link.id, nutricionistaId: link.nutricionistaId, tipo, emailHash, aceitoEm: sobre.aceitoEm ?? '2026-10-22T12:43:00.000Z', diaDaSemana: 4, saiuEm: null, pausadoEm: null })
  }
  return { link, emailHash }
}

/** Um envio que já saiu (para as regras olharem). */
export function envioAntigo(sobre: Partial<EnvioFalso> & Pick<EnvioFalso, 'tipo' | 'emailHash' | 'dia'>): EnvioFalso {
  return {
    linkId: 'link-juliana',
    nutricionistaId: ANA.id,
    estado: 'entregue' as EstadoDoEnvio,
    resendId: null,
    chaveUnica: `${sobre.emailHash}:${sobre.tipo}:${sobre.dia}:antigo${Math.random()}`,
    extra: null,
    criadoEm: `${sobre.dia}T12:00:00.000Z`,
    assunto: 'antigo',
    contaNoTeto: true,
    ...sobre,
  }
}

export type { NovoEnvio }
