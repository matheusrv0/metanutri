// O cenário dos ataques (spec seguranca-lote-4, D-136): uma vítima, um atacante e um administrador num
// Supabase LOCAL. Cada arquivo de teste monta o seu, com e-mails novos, e o compara com a chave de serviço
// antes e depois dos ataques.
//
// CB-129: a URL é conferida aqui de novo, antes de qualquer pedido. Fora de 127.0.0.1 e localhost, nada roda.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { expect } from 'vitest'
import { ambienteLocal, type Ambiente } from './local.ts'

export { ambienteLocal, type Ambiente }

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

/**
 * Repete o pedido que voltou com "JWT issued at future" (PGRST303): o relógio do Docker pode ficar um pouco
 * atrás da hora em que o login assinou o token. Recusado assim, o ataque nem chegou à regra do banco, e a
 * recusa não provaria nada; repetido, ele é de fato avaliado. Qualquer outra resposta volta como veio.
 */
const fetchQueEsperaORelogio: typeof fetch = async (entrada, opcoes) => {
  for (let tentativa = 1; ; tentativa++) {
    const resposta = await fetch(entrada, opcoes)
    if (resposta.ok || tentativa >= 40) return resposta
    const corpo = await resposta.clone().text()
    if (!/PGRST303|issued at future/i.test(corpo)) return resposta
    await esperar(250)
  }
}

const OPCOES = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchQueEsperaORelogio },
}

export const BALDE = 'comprovantes'
const PDF = new TextEncoder().encode('%PDF-1.4\n% comprovante de teste\n%%EOF\n')
export const arquivoPdf = (texto = 'comprovante'): Blob => new Blob([PDF, new TextEncoder().encode(texto)], { type: 'application/pdf' })

const aleatorio = (bytes = 8): string => randomBytes(bytes).toString('hex')

export interface Conta {
  readonly id: string
  readonly email: string
  readonly senha: string
  readonly cliente: SupabaseClient
}

export interface Vitima extends Conta {
  readonly token: string
  readonly linkId: string
  /** O pedido em análise, com o comprovante no balde. */
  readonly pedidoId: string
  /** Um pedido já aprovado, com o aviso ainda aberto. */
  readonly pedidoAprovadoId: string
  readonly arquivo: string
  readonly segundoArquivo: string
}

export interface Atacante extends Conta {
  readonly token: string
  readonly linkId: string
  readonly arquivo: string
}

export interface Cenario {
  readonly ambiente: Ambiente
  readonly servico: SupabaseClient
  readonly anonimo: SupabaseClient
  readonly vitima: Vitima
  readonly atacante: Atacante
  readonly admin: Conta
  /** Texto que só existe no dado da vítima: se aparecer numa resposta ao atacante, vazou. */
  readonly marcador: string
}

function falhou(contexto: string, erro: { readonly message: string } | null): void {
  if (erro) throw new Error(`Preparo do cenário: ${contexto}: ${erro.message}`)
}

async function criarConta(
  ambiente: Ambiente,
  servico: SupabaseClient,
  email: string,
  metadados: Readonly<Record<string, unknown>>,
): Promise<Conta> {
  const senha = `Senha-${aleatorio(12)}`
  const criada = await servico.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: metadados })
  falhou(`criar ${email}`, criada.error)
  const id = criada.data.user?.id
  if (!id) throw new Error(`Preparo do cenário: ${email} sem id`)
  const cliente = createClient(ambiente.url, ambiente.anon, OPCOES)
  const entrou = await cliente.auth.signInWithPassword({ email, password: senha })
  falhou(`entrar com ${email}`, entrou.error)
  return { id, email, senha, cliente }
}

/** Um cliente novo com uma conta que já existe (para entrar de novo depois de mudar algo). */
export function clienteSemSessao(ambiente: Ambiente): SupabaseClient {
  return createClient(ambiente.url, ambiente.anon, OPCOES)
}

async function criarLink(conta: Conta, token: string, nome: string): Promise<string> {
  const linkId = randomUUID()
  const r = await conta.cliente.from('acompanhamentos').insert({
    id: linkId,
    nutricionista_id: conta.id,
    token,
    caso_id: 'caso-1',
    paciente_id: 'paciente-1',
    nome,
    missoes: [{ id: 'm1', texto: nome }],
    marcacoes: [],
  })
  falhou('criar o link do paciente', r.error)
  return linkId
}

async function enviarArquivo(conta: Conta, caminho: string): Promise<void> {
  const r = await conta.cliente.storage.from(BALDE).upload(caminho, arquivoPdf(caminho), { contentType: 'application/pdf', upsert: false })
  falhou(`enviar ${caminho}`, r.error)
}

export async function prepararCenario(): Promise<Cenario> {
  const ambiente = ambienteLocal()
  const servico = createClient(ambiente.url, ambiente.servico, OPCOES)
  const anonimo = createClient(ambiente.url, ambiente.anon, OPCOES)
  const sufixo = aleatorio(4)
  const marcador = `segredo-da-vitima-${aleatorio(6)}`

  // Estudantes com e-mail de faculdade confirmado: os dois podem enviar comprovante. O que separa um do
  // outro é só a regra de dono, que é o que está sendo atacado.
  const contaVitima = await criarConta(ambiente, servico, `vitima.${sufixo}@usp.br`, { situacao: 'estudante', nome: `Vitima ${marcador}` })
  const contaAtacante = await criarConta(ambiente, servico, `atacante.${sufixo}@usp.br`, { situacao: 'estudante', nome: 'Atacante' })
  const admin = await criarConta(ambiente, servico, `admin.${sufixo}@exemplo.com`, {
    situacao: 'nutricionista',
    nome: 'Administrador de teste',
    crn_regiao: 6,
    crn_numero: '12345',
  })
  falhou('cadastrar o administrador', (await servico.from('administradores').insert({ usuario: admin.id })).error)

  // O que a vítima grava pelo próprio login, como no app.
  const tokenVitima = `vit${aleatorio(8)}`
  const linkVitima = await criarLink(contaVitima, tokenVitima, `Paciente ${marcador}`)
  falhou(
    'gravar a cópia da vítima',
    (await contaVitima.cliente.from('copias').insert({ nutricionista_id: contaVitima.id, dados: { segredo: marcador }, aparelho: `aparelho ${marcador}` })).error,
  )
  const arquivo = `${contaVitima.id}/comprovante.pdf`
  const segundoArquivo = `${contaVitima.id}/comprovante-2.pdf`
  await enviarArquivo(contaVitima, arquivo)
  await enviarArquivo(contaVitima, segundoArquivo)
  const pedido = await contaVitima.cliente.rpc('enviar_pedido_estudante', {
    p_instituicao: `Universidade ${marcador}`,
    p_matricula: '1234567',
    p_periodo: 5,
    p_formatura: '2030-12-01',
    p_arquivo: arquivo,
  })
  falhou('enviar o pedido da vítima', pedido.error)
  const pedidoId = typeof pedido.data === 'string' ? pedido.data : ''
  if (!pedidoId) throw new Error('Preparo do cenário: o pedido da vítima veio sem id')

  // O que só o servidor grava (service_role), como as funções de cobrança e o administrador.
  const aprovado = await servico
    .from('pedidos_estudante')
    .insert({
      usuario: contaVitima.id,
      instituicao: `Faculdade ${marcador}`,
      matricula: '7654321',
      periodo: 3,
      formatura: '2030-12-01',
      status: 'aprovado',
      decidido_em: new Date().toISOString(),
    })
    .select('id')
    .single()
  falhou('gravar o pedido aprovado da vítima', aprovado.error)
  const pedidoAprovadoId = typeof aprovado.data?.id === 'string' ? aprovado.data.id : ''
  falhou(
    'gravar a assinatura da vítima',
    (
      await servico.from('assinaturas').insert({
        nutricionista_id: contaVitima.id,
        plano: 'solo',
        status: 'ativa',
        valor_centavos: 2990,
        ciclo: 'mensal',
        preapproval_id: `pre-${marcador}`,
        cartao_bandeira: 'Visa',
        cartao_final: '4242',
      })
    ).error,
  )
  falhou('gravar a reserva da vítima', (await servico.from('assinando_agora').insert({ nutricionista_id: contaVitima.id })).error)
  falhou('gravar a tentativa da vítima', (await servico.from('tentativas_de_cartao').insert({ nutricionista_id: contaVitima.id, recusada: false })).error)
  falhou('gravar a chamada da vítima', (await servico.from('chamadas_da_cobranca').insert({ nutricionista_id: contaVitima.id, tipo: 'cartao' })).error)
  falhou('gravar um aviso da operadora', (await servico.from('avisos_da_operadora').insert({ topico: 'teste', recurso_id: marcador, resultado: 'anotado' })).error)

  // O atacante tem as mesmas coisas, na conta dele.
  const tokenAtacante = `atk${aleatorio(8)}`
  const linkAtacante = await criarLink(contaAtacante, tokenAtacante, 'Paciente do atacante')
  falhou('gravar a cópia do atacante', (await contaAtacante.cliente.from('copias').insert({ nutricionista_id: contaAtacante.id, dados: { meu: true } })).error)
  const arquivoAtacante = `${contaAtacante.id}/meu.pdf`
  await enviarArquivo(contaAtacante, arquivoAtacante)

  return {
    ambiente,
    servico,
    anonimo,
    marcador,
    vitima: {
      ...contaVitima,
      token: tokenVitima,
      linkId: linkVitima,
      pedidoId,
      pedidoAprovadoId,
      arquivo,
      segundoArquivo,
    },
    atacante: { ...contaAtacante, token: tokenAtacante, linkId: linkAtacante, arquivo: arquivoAtacante },
    admin,
  }
}

/** As tabelas com dado de uma conta e a coluna que diz de quem é. */
export const TABELAS_DA_CONTA: readonly { readonly tabela: string; readonly dono: string }[] = [
  { tabela: 'acompanhamentos', dono: 'nutricionista_id' },
  { tabela: 'copias', dono: 'nutricionista_id' },
  { tabela: 'assinaturas', dono: 'nutricionista_id' },
  { tabela: 'perfis', dono: 'id' },
  { tabela: 'pedidos_estudante', dono: 'usuario' },
  { tabela: 'assinaturas_historico', dono: 'nutricionista_id' },
  { tabela: 'assinando_agora', dono: 'nutricionista_id' },
  { tabela: 'tentativas_de_cartao', dono: 'nutricionista_id' },
  { tabela: 'chamadas_da_cobranca', dono: 'nutricionista_id' },
]

/** As tabelas sem dono que ninguém de fora lê nem escreve. */
export const TABELAS_FECHADAS: readonly string[] = ['administradores', 'dominios_faculdade', 'avisos_da_operadora']

const ordenar = (linhas: readonly unknown[]): unknown[] => [...linhas].map((l) => JSON.stringify(l)).sort()

/**
 * Tudo da vítima e do que é fechado, lido com a chave de serviço: as linhas de cada tabela, os arquivos do
 * balde com o conteúdo e a configuração do balde. Igual antes e depois = o ataque não mudou nada.
 */
export async function fotografar(c: Cenario): Promise<string> {
  const foto: Record<string, unknown> = {}
  for (const { tabela, dono } of TABELAS_DA_CONTA) {
    const r = await c.servico.from(tabela).select('*').in(dono, [c.vitima.id, c.admin.id])
    falhou(`fotografar ${tabela}`, r.error)
    foto[tabela] = ordenar(r.data ?? [])
  }
  for (const tabela of TABELAS_FECHADAS) {
    const r = await c.servico.from(tabela).select('*')
    falhou(`fotografar ${tabela}`, r.error)
    foto[tabela] = ordenar(r.data ?? [])
  }
  const lista = await c.servico.storage.from(BALDE).list(c.vitima.id)
  falhou('listar o balde da vítima', lista.error)
  const arquivos: Record<string, string> = {}
  for (const item of lista.data ?? []) {
    const baixado = await c.servico.storage.from(BALDE).download(`${c.vitima.id}/${item.name}`)
    falhou(`baixar ${item.name}`, baixado.error)
    const bytes = baixado.data ? new Uint8Array(await baixado.data.arrayBuffer()) : new Uint8Array()
    arquivos[item.name] = createHash('sha256').update(bytes).digest('hex')
  }
  foto['arquivos'] = arquivos
  const balde = await c.servico.storage.getBucket(BALDE)
  falhou('ler o balde', balde.error)
  foto['balde'] = { publico: balde.data?.public, tipos: balde.data?.allowed_mime_types }
  const baldes = await c.servico.storage.listBuckets()
  foto['baldes'] = (baldes.data ?? []).map((b) => b.id).sort()
  return JSON.stringify(foto)
}

interface RespostaQualquer {
  readonly data: unknown
  readonly error: unknown
}

/** Nada da vítima na resposta: nem o id, nem o token do link, nem o texto que só ela tem. */
export function semNadaDaVitima(c: Cenario, resposta: RespostaQualquer): void {
  const texto = JSON.stringify({ data: resposta.data ?? null, error: resposta.error ?? null })
  expect(texto).not.toContain(c.vitima.id)
  expect(texto).not.toContain(c.vitima.token)
  expect(texto).not.toContain(c.marcador)
}

/** Recusado ou vazio: erro, nulo ou lista vazia. Nunca uma linha. */
export function negadoOuVazio(resposta: RespostaQualquer): void {
  const vazio = resposta.data === null || (Array.isArray(resposta.data) && resposta.data.length === 0)
  expect(resposta.error !== null || vazio, `esperava recusa ou nada; veio ${JSON.stringify(resposta.data)}`).toBe(true)
}

/** Recusado com erro. */
export function recusado(resposta: RespostaQualquer): void {
  expect(resposta.error, `esperava recusa; veio ${JSON.stringify(resposta.data)}`).not.toBeNull()
}

/** O código do erro do PostgREST (`42501`, `PGRST202`...), ou o erro inteiro em texto quando não tem código. */
function codigoDo(erro: unknown): string {
  if (erro !== null && typeof erro === 'object' && 'code' in erro) return String(erro.code)
  return JSON.stringify(erro ?? null)
}

/** Recusado com um destes códigos, e só com eles: outro erro qualquer não prova que a regra barrou. */
export function recusadoCom(resposta: RespostaQualquer, codigos: readonly string[]): void {
  expect(resposta.error, `esperava recusa com ${codigos.join(' ou ')}; veio ${JSON.stringify(resposta.data)}`).not.toBeNull()
  expect(codigos, `recusado por outro motivo: ${JSON.stringify(resposta.error)}`).toContain(codigoDo(resposta.error))
}

/** Barrado pelo banco: `42501` (regra de linha ou permissão). */
export function barrado(resposta: RespostaQualquer): void {
  recusadoCom(resposta, ['42501'])
}

/** Barrado pelo banco (`42501`) ou nenhuma linha. Outro erro reprova: não prova que a regra barrou. */
export function barradoOuVazio(resposta: RespostaQualquer): void {
  if (resposta.error !== null && resposta.error !== undefined) {
    barrado(resposta)
    return
  }
  const vazio = resposta.data === null || (Array.isArray(resposta.data) && resposta.data.length === 0)
  expect(vazio, `esperava 42501 ou nada; veio ${JSON.stringify(resposta.data)}`).toBe(true)
}

/** DP-A4: sem erro de sintaxe do SQL e sem erro do servidor na resposta. */
export function semErroDeSql(resposta: RespostaQualquer): void {
  const erro = resposta.error
  if (erro === null || erro === undefined) return
  const texto = JSON.stringify(erro)
  expect(texto).not.toMatch(/syntax error|at or near|unterminated quoted|42601|XX000/i)
  if (typeof erro === 'object' && 'status' in erro) expect(erro.status).not.toBe(500)
}
