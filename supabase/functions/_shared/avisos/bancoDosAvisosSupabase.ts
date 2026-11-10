// O banco de verdade das funções de e-mail (spec lado-do-paciente): o supabase-js com a chave de serviço, que passa por
// cima do RLS. Aqui só se traduz cada consulta para as tabelas e as funções do supabase/017-lado-do-paciente.sql; a
// decisão mora nos núcleos (meuLink.ts, avisosResposta.ts, enviarLink.ts, webhookResend.ts, rodada.ts), que o Vitest
// executa com um banco de mentira. O comportamento contra o banco de verdade é conferido no Supabase local
// (testes/seguranca).
//
// O supabase-js devolve o erro do banco no resultado, sem lançar: aqui todo erro vira exceção, e o núcleo responde 502
// (ou deixa para a próxima rodada). Importa só o tipo, pelo npm:, na versão das outras funções.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'
import type { MarcacaoDia } from '../adesao.ts'
import { gerarChave } from './comum.ts'
import type {
  AceiteDoBanco,
  AvisoDaChave,
  BancoDosAvisos,
  ChaveDeAviso,
  DadosDaNutricionista,
  Desfazer,
  EmailDoLink,
  EnvioDoBanco,
  EstadoDoEnvio,
  LinkDoBanco,
} from './portas.ts'
import { SAIRAM } from './portas.ts'
import { ehTipoDeAviso, type TipoDeEmail } from './tipos.ts'

/** O PostgREST devolve até 1000 linhas por pedido (max_rows): as leituras longas vêm em páginas. */
const PAGINA = 1000

const COLUNAS_DO_LINK = 'id, nutricionista_id, token, nome, criado_em, plano_em, ultimo_acesso, a1_para, substituido_por, uso_nao_comercial, marcacoes, missoes'
const COLUNAS_DO_EMAIL = 'link_id, nutricionista_id, email, email_hash, origem, email_ficha, confirmado_em, oferta_plano, oferta_semana, oferta_lembrete, parou_tudo_em, convite_em'
const COLUNAS_DO_ACEITE = 'id, link_id, nutricionista_id, tipo, email_hash, aceito_em, dia_da_semana, saiu_em, pausado_em'
const COLUNAS_DO_ENVIO = 'link_id, nutricionista_id, tipo, email_hash, estado, resend_id, chave_unica, dia, extra, criado_em'
const COLUNAS_DA_CHAVE = 'chave, link_id, nutricionista_id, tipo, avisos, email_hash, email, criado_em, vence_em, usado_em, desfazer'

type Linha = Readonly<Record<string, unknown>>

interface Resultado {
  readonly data: unknown
  readonly error: { readonly message: string; readonly code?: string } | null
  readonly count?: number | null
}

function dados(r: Resultado, onde: string): unknown {
  if (r.error) throw new Error(`${onde}: ${r.error.message}`)
  return r.data
}

const linhas = (valor: unknown): readonly Linha[] => (Array.isArray(valor) ? (valor as Linha[]) : [])
const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor !== '' ? valor : null)

function ehMarcacoes(v: unknown): v is readonly MarcacaoDia[] {
  return Array.isArray(v) && v.every((m) => typeof m === 'object' && m !== null && typeof (m as MarcacaoDia).dia === 'string' && Array.isArray((m as MarcacaoDia).feitas))
}

function paraLink(l: Linha): LinkDoBanco {
  return {
    id: String(l['id']),
    nutricionistaId: String(l['nutricionista_id']),
    token: String(l['token']),
    nome: typeof l['nome'] === 'string' ? l['nome'] : '',
    criadoEm: String(l['criado_em']),
    planoEm: texto(l['plano_em']),
    ultimoAcesso: texto(l['ultimo_acesso']),
    a1Para: texto(l['a1_para']),
    substituidoPor: texto(l['substituido_por']),
    usoNaoComercial: l['uso_nao_comercial'] === true,
    marcacoes: ehMarcacoes(l['marcacoes']) ? l['marcacoes'] : [],
    missoes: Array.isArray(l['missoes']) ? l['missoes'].length : 0,
  }
}

function paraEmail(l: Linha): EmailDoLink {
  const origem = l['origem']
  return {
    linkId: String(l['link_id']),
    nutricionistaId: String(l['nutricionista_id']),
    email: texto(l['email']),
    emailHash: texto(l['email_hash']),
    origem: origem === 'ficha' || origem === 'paciente' ? origem : null,
    emailFicha: texto(l['email_ficha']),
    confirmadoEm: texto(l['confirmado_em']),
    ofertas: { plano: l['oferta_plano'] !== false, semana: l['oferta_semana'] !== false, lembrete: l['oferta_lembrete'] !== false },
    parouTudoEm: texto(l['parou_tudo_em']),
    conviteEm: texto(l['convite_em']),
  }
}

function paraAceite(l: Linha): AceiteDoBanco | null {
  const tipo = l['tipo']
  if (!ehTipoDeAviso(tipo)) return null
  return {
    id: Number(l['id']),
    linkId: texto(l['link_id']),
    nutricionistaId: String(l['nutricionista_id']),
    tipo,
    emailHash: String(l['email_hash']),
    aceitoEm: String(l['aceito_em']),
    diaDaSemana: Number(l['dia_da_semana']),
    saiuEm: texto(l['saiu_em']),
    pausadoEm: texto(l['pausado_em']),
  }
}

function paraEnvio(l: Linha): EnvioDoBanco {
  const extra = l['extra']
  return {
    linkId: texto(l['link_id']),
    nutricionistaId: String(l['nutricionista_id']),
    tipo: String(l['tipo']) as TipoDeEmail,
    emailHash: String(l['email_hash']),
    estado: String(l['estado']) as EstadoDoEnvio,
    resendId: texto(l['resend_id']),
    chaveUnica: texto(l['chave_unica']),
    dia: String(l['dia']),
    extra: typeof extra === 'object' && extra !== null && !Array.isArray(extra) ? (extra as Record<string, unknown>) : null,
    criadoEm: String(l['criado_em']),
  }
}

function paraChave(l: Linha): ChaveDeAviso {
  const desfazer = l['desfazer']
  const tipo = l['tipo'] === 'aceite' ? 'aceite' : 'sair'
  return {
    chave: String(l['chave']),
    linkId: texto(l['link_id']),
    nutricionistaId: String(l['nutricionista_id']),
    tipo,
    avisos: Array.isArray(l['avisos']) ? (l['avisos'] as AvisoDaChave[]) : [],
    emailHash: texto(l['email_hash']),
    email: texto(l['email']),
    criadoEm: String(l['criado_em']),
    venceEm: texto(l['vence_em']),
    usadoEm: texto(l['usado_em']),
    desfazer: typeof desfazer === 'object' && desfazer !== null ? (desfazer as Desfazer) : null,
  }
}

/** Lê todas as páginas de uma consulta (a consulta recebe o intervalo). */
async function todas(consulta: (de: number, ate: number) => PromiseLike<Resultado>, onde: string): Promise<readonly Linha[]> {
  const todasAsLinhas: Linha[] = []
  for (let de = 0; ; de += PAGINA) {
    const pagina = linhas(dados(await consulta(de, de + PAGINA - 1), onde))
    todasAsLinhas.push(...pagina)
    if (pagina.length < PAGINA) return todasAsLinhas
  }
}

const numero = (r: Resultado, onde: string): number => {
  if (r.error) throw new Error(`${onde}: ${r.error.message}`)
  if (typeof r.count !== 'number') throw new Error(`${onde}: a contagem veio sem número.`)
  return r.count
}

/** A ligação com o banco. `aleatorio` sorteia as chaves de descadastro que nascem aqui. */
export function criarBancoDosAvisos(cliente: SupabaseClient, aleatorio: (tamanho: number) => Uint8Array): BancoDosAvisos {
  const de = (tabela: string) => cliente.from(tabela)

  // D-1246: o link cortado pela troca do endereço não existe para as funções de e-mail.
  const links = () => de('acompanhamentos').select(COLUNAS_DO_LINK).is('cortado_em', null)

  const linkPorId = async (id: string): Promise<LinkDoBanco | null> => {
    const l = dados(await links().eq('id', id).maybeSingle(), 'link')
    return l ? paraLink(l as Linha) : null
  }

  const contar = async (consulta: PromiseLike<Resultado>, onde: string) => numero(await consulta, onde)

  return {
    async linkPorToken(token) {
      const l = dados(await links().eq('token', token).maybeSingle(), 'link pelo token')
      if (!l) return null
      const link = paraLink(l as Linha)
      if (link.substituidoPor === null) return link
      // DP-LP-5: o token antigo abre o fixo, da mesma conta.
      const fixo = await linkPorId(link.substituidoPor)
      return fixo && fixo.nutricionistaId === link.nutricionistaId ? fixo : link
    },
    async linksPorIds(ids) {
      if (ids.length === 0) return []
      return linhas(dados(await links().in('id', [...ids]), 'links')).map(paraLink)
    },
    async linksDaConta(id) {
      const lidas = await todas((a, b) => links().eq('nutricionista_id', id).is('substituido_por', null).order('id').range(a, b), 'links da conta')
      return lidas.map(paraLink)
    },
    async contasComLinks() {
      const lidas = await todas((a, b) => de('acompanhamentos').select('nutricionista_id').is('substituido_por', null).is('cortado_em', null).order('id').range(a, b), 'contas com links')
      return [...new Set(lidas.map((l) => String(l['nutricionista_id'])))]
    },
    async linksComA1Vencido(ate) {
      const lidas = await todas((a, b) => links().not('a1_para', 'is', null).lte('a1_para', ate.toISOString()).order('id').range(a, b), 'A1 vencidos')
      return lidas.map(paraLink)
    },
    async agendarA1(id, quando) {
      dados(await de('acompanhamentos').update({ a1_para: quando ? quando.toISOString() : null }).eq('id', id), 'agendar o A1')
    },

    async emailDoLink(id) {
      const l = dados(await de('emails_dos_links').select(COLUNAS_DO_EMAIL).eq('link_id', id).maybeSingle(), 'e-mail do link')
      return l ? paraEmail(l as Linha) : null
    },
    async emailsDosLinks(ids) {
      if (ids.length === 0) return []
      return linhas(dados(await de('emails_dos_links').select(COLUNAS_DO_EMAIL).in('link_id', [...ids]), 'e-mails dos links')).map(paraEmail)
    },
    async emailsPorHash(hash) {
      // D-1247: o e-mail que o paciente deu no link só vale confirmado.
      const lidas = linhas(dados(await de('emails_dos_links').select(COLUNAS_DO_EMAIL).eq('email_hash', hash).or('origem.eq.ficha,confirmado_em.not.is.null'), 'e-mails pelo resumo'))
      return lidas.map(paraEmail)
    },
    async gravarEmailDoPaciente(link, email, emailHash, oferece, confirmadoEm) {
      // A linha nasce com as ofertas da conta; existindo, só o endereço muda (as ofertas são da nutricionista).
      dados(
        await de('emails_dos_links').upsert(
          { link_id: link.id, nutricionista_id: link.nutricionistaId, oferta_plano: oferece, oferta_semana: oferece, oferta_lembrete: oferece },
          { onConflict: 'link_id', ignoreDuplicates: true },
        ),
        'criar o e-mail do link',
      )
      dados(
        await de('emails_dos_links')
          .update({ email, email_hash: emailHash, origem: 'paciente', confirmado_em: confirmadoEm.toISOString(), atualizado_em: new Date().toISOString() })
          .eq('link_id', link.id),
        'gravar o e-mail do paciente',
      )
    },
    async marcarConfirmado(id, quando) {
      dados(await de('emails_dos_links').update({ confirmado_em: quando.toISOString() }).eq('link_id', id), 'confirmado')
    },
    async marcarConvite(id, quando) {
      dados(await de('emails_dos_links').update({ convite_em: quando.toISOString() }).eq('link_id', id), 'convite')
    },
    async pararTudo(id, quando) {
      dados(await de('emails_dos_links').update({ parou_tudo_em: quando, atualizado_em: new Date().toISOString() }).eq('link_id', id), 'parar todos')
    },

    async aceitesDoLink(id) {
      return linhas(dados(await de('aceites').select(COLUNAS_DO_ACEITE).eq('link_id', id), 'aceites do link'))
        .map(paraAceite)
        .filter((a): a is AceiteDoBanco => a !== null)
    },
    async aceitesAtivos() {
      const lidas = await todas((a, b) => de('aceites').select(COLUNAS_DO_ACEITE).is('saiu_em', null).not('link_id', 'is', null).order('id').range(a, b), 'aceites ativos')
      return lidas.map(paraAceite).filter((a): a is AceiteDoBanco => a !== null)
    },
    async criarAceite(a) {
      const r = await de('aceites').insert({
        link_id: a.linkId,
        nutricionista_id: a.nutricionistaId,
        tipo: a.tipo,
        email_hash: a.emailHash,
        aceito_em: a.aceitoEm,
        dia_da_semana: a.diaDaSemana,
      })
      // Já havia um ativo igual (o índice único do 017): o aceite continua o mesmo.
      if (r.error && r.error.code !== '23505') throw new Error(`criar o aceite: ${r.error.message}`)
    },
    async sairDosAceites(ids, quando) {
      if (ids.length === 0) return
      dados(await de('aceites').update({ saiu_em: quando.toISOString() }).in('id', [...ids]), 'sair dos aceites')
    },
    async voltarAosAceites(ids) {
      if (ids.length === 0) return
      dados(await de('aceites').update({ saiu_em: null }).in('id', [...ids]), 'voltar aos aceites')
    },
    async pausarResumo(id, quando) {
      dados(await de('aceites').update({ pausado_em: quando ? quando.toISOString() : null }).eq('id', id), 'pausar o resumo')
    },
    async definirResumoDaAdesao(id, ligado) {
      dados(await de('config_de_emails').upsert({ nutricionista_id: id, resumo_da_adesao: ligado, atualizado_em: new Date().toISOString() }, { onConflict: 'nutricionista_id' }), 'resumo da adesão')
    },

    async criarChave(c) {
      dados(
        await de('chaves_de_aviso').insert({
          chave: c.chave,
          link_id: c.linkId,
          nutricionista_id: c.nutricionistaId,
          tipo: c.tipo,
          avisos: [...c.avisos],
          email_hash: c.emailHash,
          email: c.email,
          criado_em: c.criadoEm.toISOString(),
          vence_em: c.venceEm,
        }),
        'criar a chave',
      )
    },
    async chaveDeSair(linkId, nutricionistaId, aviso, emailHash) {
      const consulta = de('chaves_de_aviso').select('chave, avisos').eq('tipo', 'sair').eq('nutricionista_id', nutricionistaId).eq('email_hash', emailHash).contains('avisos', [aviso])
      const achadas = linhas(dados(await (linkId === null ? consulta.is('link_id', null) : consulta.eq('link_id', linkId)), 'chave de descadastro'))
      const achada = achadas.find((l) => Array.isArray(l['avisos']) && l['avisos'].length === 1)
      if (achada) return String(achada['chave'])
      const chave = gerarChave(aleatorio)
      dados(await de('chaves_de_aviso').insert({ chave, link_id: linkId, nutricionista_id: nutricionistaId, tipo: 'sair', avisos: [aviso], email_hash: emailHash }), 'criar a chave de descadastro')
      return chave
    },
    async lerChave(chave) {
      const l = dados(await de('chaves_de_aviso').select(COLUNAS_DA_CHAVE).eq('chave', chave).maybeSingle(), 'ler a chave')
      return l ? paraChave(l as Linha) : null
    },
    async apagarChave(chave) {
      dados(await de('chaves_de_aviso').delete().eq('chave', chave), 'apagar a chave')
    },
    async marcarChave(chave, m) {
      dados(await de('chaves_de_aviso').update({ usado_em: m.usadoEm ? m.usadoEm.toISOString() : null, desfazer: m.desfazer }).eq('chave', chave), 'marcar a chave')
    },

    async enviosDosLinks(ids, desde) {
      if (ids.length === 0) return []
      const lidas = await todas((a, b) => de('envios').select(COLUNAS_DO_ENVIO).in('link_id', [...ids]).gte('criado_em', desde.toISOString()).order('id').range(a, b), 'envios dos links')
      return lidas.map(paraEnvio)
    },
    async enviosDosEnderecos(hashes, desde) {
      if (hashes.length === 0) return []
      const lidas = await todas((a, b) => de('envios').select(COLUNAS_DO_ENVIO).in('email_hash', [...hashes]).gte('criado_em', desde.toISOString()).order('id').range(a, b), 'envios dos endereços')
      return lidas.map(paraEnvio)
    },
    async contarEnvios(dia, mes) {
      const base = (desde: Date) => de('envios').select('id', { count: 'exact', head: true }).eq('conta_no_teto', true).in('estado', [...SAIRAM]).gte('criado_em', desde.toISOString())
      return {
        dia: await contar(base(dia), 'envios do dia'),
        mes: await contar(base(mes), 'envios do mês'),
        avisosDia: await contar(base(dia).in('tipo', ['A1', 'A2', 'A3', 'A4']), 'avisos do dia'),
        avisosMes: await contar(base(mes).in('tipo', ['A1', 'A2', 'A3', 'A4']), 'avisos do mês'),
      }
    },
    async registrarEnvios(novos) {
      if (novos.length === 0) return []
      const paraLinha = (n: (typeof novos)[number]) => ({
        link_id: n.linkId,
        nutricionista_id: n.nutricionistaId,
        tipo: n.tipo,
        email_hash: n.emailHash,
        assunto: n.assunto.slice(0, 200),
        estado: n.estado,
        chave_unica: n.chaveUnica,
        dia: n.dia,
        conta_no_teto: n.contaNoTeto,
        extra: n.extra,
      })
      const inseridas = linhas(dados(await de('envios').upsert(novos.map(paraLinha), { onConflict: 'chave_unica', ignoreDuplicates: true }).select('chave_unica'), 'registrar os envios'))
      const ficaram = new Set(inseridas.map((l) => String(l['chave_unica'])))
      // DP-LP-13: a chave que já existia só volta se estava adiada ou pausada (este envio a retoma).
      for (const n of novos) {
        if (ficaram.has(n.chaveUnica)) continue
        const retomadas = linhas(
          dados(
            await de('envios')
              .update({ ...paraLinha(n), criado_em: new Date().toISOString() })
              .eq('chave_unica', n.chaveUnica)
              .in('estado', ['adiado', 'pausado'])
              .select('chave_unica'),
            'retomar o envio',
          ),
        )
        if (retomadas.length > 0) ficaram.add(n.chaveUnica)
      }
      return novos.map((n) => n.chaveUnica).filter((c) => ficaram.has(c))
    },
    async marcarEnvio(chave, m) {
      dados(await de('envios').update({ estado: m.estado, ...(m.resendId === undefined ? {} : { resend_id: m.resendId }) }).eq('chave_unica', chave), 'marcar o envio')
    },
    async apagarEnvios(chaves) {
      if (chaves.length === 0) return
      dados(await de('envios').delete().in('chave_unica', [...chaves]), 'apagar os envios')
    },
    async envioPorResendId(id) {
      const l = dados(await de('envios').select(COLUNAS_DO_ENVIO).eq('resend_id', id).maybeSingle(), 'envio pelo Resend')
      return l ? paraEnvio(l as Linha) : null
    },
    async mudarEstadoPeloResend(id, estado) {
      dados(await de('envios').update({ estado }).eq('resend_id', id), 'estado do envio')
    },
    async contarDevolucoesTemporarias(hash, desde) {
      return contar(
        de('envios').select('id', { count: 'exact', head: true }).eq('email_hash', hash).eq('estado', 'devolucao-temporaria').gte('criado_em', desde.toISOString()),
        'devoluções temporárias',
      )
    },
    async taxasDesde(desde) {
      const base = () => de('envios').select('id', { count: 'exact', head: true }).gte('criado_em', desde.toISOString())
      return {
        envios: await contar(base().in('estado', [...SAIRAM]), 'envios da semana'),
        devolvidos: await contar(base().eq('estado', 'devolvido'), 'devolvidos da semana'),
        queixas: await contar(base().eq('estado', 'queixa'), 'queixas da semana'),
      }
    },

    async suprimidos(hashes) {
      if (hashes.length === 0) return new Map()
      const lidas = linhas(dados(await de('supressao').select('email_hash, motivo').in('email_hash', [...hashes]), 'supressão'))
      return new Map(lidas.map((l) => [String(l['email_hash']), l['motivo'] === 'queixa' ? 'queixa' : 'devolvido'] as const))
    },
    async suprimir(hash, motivo) {
      dados(await de('supressao').upsert({ email_hash: hash, motivo }, { onConflict: 'email_hash', ignoreDuplicates: true }), 'suprimir')
    },
    async estadoDosAvisos() {
      const l = dados(await de('estado_dos_avisos').select('pausado_em, motivo').eq('id', 1).maybeSingle(), 'estado dos avisos') as Linha | null
      return { pausadoEm: texto(l?.['pausado_em']), motivo: texto(l?.['motivo']) }
    },
    async pausarAvisos(motivo, quando) {
      dados(await de('estado_dos_avisos').upsert({ id: 1, pausado_em: quando.toISOString(), motivo: motivo.slice(0, 200), atualizado_em: quando.toISOString() }, { onConflict: 'id' }), 'pausar os avisos')
    },
    async gravarTetos(tetos) {
      dados(await de('estado_dos_avisos').upsert({ id: 1, teto_dia: tetos.dia, teto_mes: tetos.mes, atualizado_em: new Date().toISOString() }, { onConflict: 'id' }), 'gravar os tetos')
    },

    async anotarLimite(chave, limite, desde) {
      return dados(await cliente.rpc('anotar_limite', { p_chave: chave, p_limite: limite, p_desde: desde.toISOString() }), 'anotar o limite') === true
    },
    async devolverLimite(chave) {
      dados(await cliente.rpc('devolver_limite', { p_chave: chave }), 'devolver o limite')
    },
    async nutricionista(id) {
      const config = dados(await de('config_de_emails').select('nome, responder_para, resumo_da_adesao, oferecer_aos_novos').eq('nutricionista_id', id).maybeSingle(), 'configuração') as Linha | null
      const perfil = dados(await de('perfis').select('nome, situacao, crn_regiao, crn_numero').eq('id', id).maybeSingle(), 'perfil') as Linha | null
      const marca = dados(await de('marcas').select('cor').eq('nutricionista_id', id).maybeSingle(), 'marca') as Linha | null
      const usuario = await cliente.auth.admin.getUserById(id)
      const emailDaConta = usuario.error ? null : (usuario.data.user?.email ?? null)
      if (perfil === null && emailDaConta === null) return null
      const dadosDela: DadosDaNutricionista = {
        id,
        nome: texto(config?.['nome'])?.trim() || texto(perfil?.['nome'])?.trim() || '',
        responderPara: texto(config?.['responder_para']),
        emailDaConta,
        estudante: perfil?.['situacao'] === 'estudante',
        crnRegiao: typeof perfil?.['crn_regiao'] === 'number' ? perfil['crn_regiao'] : null,
        crnNumero: texto(perfil?.['crn_numero']),
        cor: texto(marca?.['cor']),
        resumoDaAdesao: config?.['resumo_da_adesao'] !== false,
        oferecerAosNovos: config?.['oferecer_aos_novos'] !== false,
      }
      return dadosDela
    },
    async chaveDaRodadaConfere(chave) {
      return dados(await cliente.rpc('conferir_chave_dos_avisos', { p_chave: chave }), 'conferir a chave dos avisos') === true
    },
  }
}

/** Quem pede, pelo token da sessão (enviar-link): o id da conta, ou nulo sem sessão válida. */
export async function quemPedeOEnvio(cliente: SupabaseClient, autorizacao: string | null): Promise<string | null> {
  const token = autorizacao?.replace(/^Bearer\s+/i, '').trim() ?? ''
  if (token === '') return null
  const { data, error } = await cliente.auth.getUser(token)
  return error ? null : (data.user?.id ?? null)
}
