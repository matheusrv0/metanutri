// O servidor de conta de mentira das telas públicas (spec revisao-geral-publica, D-233). O site de teste é montado com
// um endereço do Supabase que não existe (`ENDERECO_FALSO`), e o Playwright responde por ele: nada sai da máquina.
// Assim dá para abrir, sem banco, as telas que só existem com o servidor ligado: Completar cadastro, Comprovar
// matrícula, o checkout com sessão, a volta do pagamento e o link do paciente lido da nuvem.
import type { BrowserContext, Page, Route } from '@playwright/test'
import { AJUSTES_IA, SUGESTAO_IA } from './respostasIa.ts'

export const ENDERECO_FALSO = 'https://falso-e2e.supabase.co'
/** Só tem o tamanho de uma chave (o site confere o comprimento); não abre nada. */
export const CHAVE_FALSA = 'chave-falsa-do-teste-e2e-000000000000'
/** Onde o supabase-js guarda a sessão: `sb-<primeira parte do endereço>-auth-token`. */
const CHAVE_DA_SESSAO = 'sb-falso-e2e-auth-token'

export const USUARIO_FALSO = { id: '00000000-0000-4000-8000-000000000001', email: 'maria@exemplo.com', nome: 'Maria Souza' } as const

export type Linha = Record<string, unknown>

export interface Cenario {
  /** Com sessão aberta (o e-mail do `USUARIO_FALSO`). */
  readonly sessao?: boolean
  /** A linha de `perfis` da conta; nula, a conta não tem situação (Completar cadastro). */
  readonly perfil?: Linha | null
  readonly assinatura?: Linha | null
  readonly pedidoEstudante?: Linha | null
  /** A linha que `missoes_por_token` devolve; nula, o link não existe; `'sem-rede'`, o pedido cai. */
  readonly link?: Linha | null | 'sem-rede'
  /** Revisão r1 (D-1246): o que `link_trocado` responde quando o link não abre (o endereço foi trocado). */
  readonly linkTrocado?: boolean
  /** O que o login responde. */
  readonly entrar?: 'ok' | 'credencial-invalida' | 'sem-rede'
  /** A marcação do paciente (`marcar_missoes`): grava, ou o pedido cai. */
  readonly marcar?: 'ok' | 'sem-rede'
  /** O e-mail da sessão, quando o teste precisa de um diferente (um e-mail longo, por exemplo). */
  readonly emailDaSessao?: string
  /** A cópia da conta já na nuvem (o `dados` da linha de `copias`), para a conta abrir com pacientes e planos. */
  readonly copia?: unknown
  /**
   * Spec assistente-ia, CA-2380: o que a função sugerir-plano de mentira responde. "sugestao" responde a sugestão (ou os
   * ajustes, no adequar); "lento", a mesma depois de 3 s; "limite", o mês cheio; "recusa", 422; "erro", 503; "sem-rede",
   * o pedido cai (o contador responde). A API da Anthropic nunca é chamada.
   */
  readonly ia?: 'sugestao' | 'lento' | 'limite' | 'recusa' | 'erro' | 'sem-rede'
  /**
   * Spec lado-do-paciente: a resposta de cada Edge Function pelo nome (`meu-link`, `avisos-resposta`…), a partir do
   * corpo pedido. Função sem resposta aqui segue como antes.
   */
  readonly funcoes?: Readonly<Record<string, (corpo: Linha) => RespostaDaFuncao>>
}

/** O que uma Edge Function falsa responde: 200 por padrão. */
export interface RespostaDaFuncao {
  readonly status?: number
  readonly corpo: unknown
}

/** Um pedido que chegou ao servidor falso: o nome da função (do banco ou do servidor) e o corpo. */
export interface PedidoAoServidor {
  readonly nome: string
  readonly corpo: Linha
}

const base64url = (texto: string): string => Buffer.from(texto).toString('base64url')

/**
 * Um JWT só no formato: o site não confere a assinatura, e o servidor falso não confere nada. Traz a hora da entrada
 * (`amr`) e a de emissão (`iat`), como o Supabase: sem elas, a sessão conta como vencida (spec separacao-site-app,
 * DP-SA-4).
 */
function tokenFalso(validoAte: number, email: string): string {
  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = base64url(
    JSON.stringify({
      sub: USUARIO_FALSO.id,
      email,
      role: 'authenticated',
      aud: 'authenticated',
      exp: validoAte,
      iat: agora,
      amr: [{ method: 'password', timestamp: agora }],
    }),
  )
  return `${cabecalho}.${corpo}.assinatura-falsa`
}

const usuarioFalso = (email: string) => ({
  id: USUARIO_FALSO.id,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  email_confirmed_at: '2026-10-01T12:00:00Z',
  user_metadata: { nome: USUARIO_FALSO.nome },
  app_metadata: { provider: 'email' },
  identities: [{ id: 'i1' }],
  created_at: '2026-10-01T12:00:00Z',
})

function sessao(email: string = USUARIO_FALSO.email) {
  const validoAte = Math.floor(Date.now() / 1000) + 24 * 3600
  return {
    access_token: tokenFalso(validoAte, email),
    refresh_token: 'refresh-falso',
    token_type: 'bearer',
    expires_in: 24 * 3600,
    expires_at: validoAte,
    user: usuarioFalso(email),
  }
}

/** O que o teste olha e controla no servidor falso depois de ligado (spec separacao-site-app, DP-SA-28). */
export interface ServidorFalso {
  /** O `scope` de cada `logout` pedido, na ordem (`global` quando o pedido não diz). */
  readonly logouts: string[]
  /** O corpo de cada gravação na tabela `copias` (a cópia de trabalho que subiu), na ordem. */
  readonly gravacoesDaCopia: unknown[]
  /** O corpo de cada gravação na tabela `marcas` (o "Salvar" de "Sua marca", spec marca-no-link), na ordem. */
  readonly gravacoesDaMarca: Linha[]
  /** Spec lado-do-paciente: cada função do banco chamada (`registrar_acesso`, `marcar_missoes`…), na ordem. */
  readonly chamadasDoBanco: PedidoAoServidor[]
  /** Spec lado-do-paciente: cada Edge Function chamada (`meu-link`, `avisos-resposta`…), na ordem. */
  readonly pedidosDeFuncao: PedidoAoServidor[]
  /** Enquanto verdadeiro, todo pedido ao Supabase cai como sem internet. */
  semRede: boolean
  /**
   * Spec antropometria-telas (F2): o armazenamento das fotos e dos anexos, pelo caminho no balde, com o tipo e os bytes
   * que chegaram. Começa vazio e vale para as abas do mesmo navegador.
   */
  readonly arquivos: Map<string, ArquivoGuardado>
  /** Spec assistente-ia: o corpo de cada pedido à função sugerir-plano, na ordem. */
  readonly pedidosDaIa: Linha[]
}

/** Um arquivo no armazenamento falso. */
export interface ArquivoGuardado {
  readonly tipo: string
  readonly bytes: Buffer
  /** Data e hora do envio, ISO; o teste que põe o arquivo direto pode deixar sem. */
  readonly criadoEm?: string
}

/** O arquivo de um envio do supabase-js: o Blob vai num formulário (multipart), na parte sem nome. */
function arquivoDoFormulario(corpo: Buffer, tipoDoPedido: string): ArquivoGuardado | null {
  const limite = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(tipoDoPedido)
  const marca = limite?.[1] ?? limite?.[2]
  if (!marca) return null
  const separador = Buffer.from(`--${marca}`)
  let inicio = corpo.indexOf(separador)
  while (inicio >= 0) {
    const proximo = corpo.indexOf(separador, inicio + separador.length)
    if (proximo < 0) break
    const parte = corpo.subarray(inicio + separador.length + 2, proximo - 2)
    const fimDoCabecalho = parte.indexOf('\r\n\r\n')
    const cabecalho = parte.subarray(0, fimDoCabecalho).toString('utf8')
    if (/filename=/i.test(cabecalho)) {
      const tipo = /content-type:\s*([^\r\n]+)/i.exec(cabecalho)?.[1]?.trim() ?? 'application/octet-stream'
      return { tipo, bytes: Buffer.from(parte.subarray(fimDoCabecalho + 4)) }
    }
    inicio = proximo
  }
  return null
}

const BALDE_DAS_FOTOS = 'fotos-avaliacao'

const json = (route: Route, corpo: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })

/** A linha da conta na tabela `copias`, como o Supabase guarda (spec dados-na-nuvem, D-128). */
interface LinhaDaCopia {
  readonly dados: unknown
  readonly aparelho: unknown
  readonly atualizado_em: string
}

/**
 * A nuvem de cada navegador do teste: as abas do mesmo contexto dividem a mesma linha, como dividiriam o mesmo banco.
 * Sem guardar a cópia, cada conferência de 60 s achava a nuvem vazia e o app anotava a versão como nula, o que nunca
 * acontece com o Supabase depois do primeiro envio (correção do CA-1442).
 */
const nuvens = new WeakMap<BrowserContext, { copia: LinhaDaCopia | null; arquivos: Map<string, ArquivoGuardado> }>()

const corpoDoPedido = (valor: unknown): Record<string, unknown> => {
  const linha: unknown = Array.isArray(valor) ? valor[0] : valor
  return typeof linha === 'object' && linha !== null ? (linha as Record<string, unknown>) : {}
}

/** O corpo em JSON do pedido; sem corpo, ou com um que não é JSON, vazio. */
const corpoEmJson = (pedido: { postDataJSON(): unknown }): Record<string, unknown> => {
  try {
    return corpoDoPedido(pedido.postDataJSON())
  } catch {
    return {}
  }
}

/**
 * Liga o servidor falso no navegador da página, antes do `goto`. Spec separacao-site-app (DP-SA-17): responde no
 * contexto, não só na página, para valer também na aba que o "Continuar" do site abre.
 */
export async function ligarServidorFalso(pagina: Page, cenario: Cenario = {}): Promise<ServidorFalso> {
  const contexto = pagina.context()
  const nuvem = nuvens.get(contexto) ?? {
    copia: cenario.copia ? { dados: cenario.copia, aparelho: 'outro-aparelho', atualizado_em: '2026-11-01T12:00:00.000Z' } : null,
    arquivos: new Map<string, ArquivoGuardado>(),
  }
  nuvens.set(contexto, nuvem)
  const servidor: ServidorFalso = {
    logouts: [],
    gravacoesDaCopia: [],
    gravacoesDaMarca: [],
    chamadasDoBanco: [],
    pedidosDeFuncao: [],
    semRede: false,
    arquivos: nuvem.arquivos,
    pedidosDaIa: [],
  }
  // A função da IA conta os usos do mês como a de verdade: a sugestão que deu certo sobe o contador (D-1318).
  let usosDaIa = cenario.ia === 'limite' ? 20 : 7
  if (cenario.sessao) {
    await contexto.addInitScript(
      ([chave, valor]) => {
        if (!localStorage.getItem(chave)) localStorage.setItem(chave, valor)
      },
      [CHAVE_DA_SESSAO, JSON.stringify(sessao(cenario.emailDaSessao))] as const,
    )
  }

  // O script dos campos do cartão nunca sai da máquina: um script vazio carrega, não cria a operadora, e o checkout
  // mostra o aviso de campos que não carregaram, com o botão de assinar parado (CB-88 da checkout-proprio).
  await contexto.route('https://sdk.mercadopago.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))

  await contexto.route(`${ENDERECO_FALSO}/**`, async (route) => {
    const pedido = route.request()
    if (servidor.semRede) return route.abort('internetdisconnected')
    if (pedido.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
      })
    }
    const url = new URL(pedido.url())
    const caminho = url.pathname

    if (caminho.startsWith('/auth/v1/token')) {
      if (cenario.entrar === 'sem-rede') return route.abort('internetdisconnected')
      if (cenario.entrar === 'ok') return json(route, sessao(cenario.emailDaSessao))
      return json(route, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
    }
    if (caminho.startsWith('/auth/v1/user')) return json(route, usuarioFalso(cenario.emailDaSessao ?? USUARIO_FALSO.email))
    if (caminho.startsWith('/auth/v1/logout')) {
      servidor.logouts.push(url.searchParams.get('scope') ?? 'global')
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } })
    }
    if (caminho.startsWith('/auth/v1/')) return json(route, {})

    // Spec antropometria-telas (F2): o balde das fotos, com o que o app usa (enviar, assinar, abrir, listar, apagar).
    const doBalde = `/storage/v1/object/${BALDE_DAS_FOTOS}/`
    const assinado = `/storage/v1/object/sign/${BALDE_DAS_FOTOS}/`
    if (caminho.startsWith(doBalde) && pedido.method() === 'POST') {
      const nome = decodeURIComponent(caminho.slice(doBalde.length))
      const arquivo = arquivoDoFormulario(pedido.postDataBuffer() ?? Buffer.alloc(0), (await pedido.allHeaders())['content-type'] ?? '')
      if (!arquivo) return json(route, { statusCode: '400', error: 'Bad Request', message: 'Sem arquivo' }, 400)
      if (nuvem.arquivos.has(nome)) return json(route, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, 400)
      nuvem.arquivos.set(nome, { ...arquivo, criadoEm: new Date().toISOString() })
      return json(route, { Key: `${BALDE_DAS_FOTOS}/${nome}`, Id: `id-${nuvem.arquivos.size}` })
    }
    if (caminho.startsWith(assinado) && pedido.method() === 'POST') {
      const nome = decodeURIComponent(caminho.slice(assinado.length))
      if (!nuvem.arquivos.has(nome)) return json(route, { statusCode: '404', error: 'not_found', message: 'Object not found' }, 400)
      return json(route, { signedURL: `/object/sign/${BALDE_DAS_FOTOS}/${nome}?token=falso` })
    }
    if (caminho.startsWith(assinado) && pedido.method() === 'GET') {
      const arquivo = nuvem.arquivos.get(decodeURIComponent(caminho.slice(assinado.length)))
      if (!arquivo) return route.fulfill({ status: 400, headers: { 'access-control-allow-origin': '*' }, body: '' })
      return route.fulfill({ status: 200, contentType: arquivo.tipo, headers: { 'access-control-allow-origin': '*', 'cache-control': 'max-age=0' }, body: arquivo.bytes })
    }
    if (caminho === `/storage/v1/object/list/${BALDE_DAS_FOTOS}`) {
      const prefixo = String(corpoDoPedido(pedido.postDataJSON())['prefix'] ?? '')
      const dentro = [...nuvem.arquivos.keys()].filter((nome) => nome.startsWith(`${prefixo}/`) && !nome.slice(prefixo.length + 1).includes('/'))
      // Como o Supabase: o tamanho em `metadata.size` e a data do envio (DP-AT-21).
      return json(
        route,
        dentro.map((nome, i) => ({ name: nome.slice(prefixo.length + 1), id: `id-${i}`, created_at: nuvem.arquivos.get(nome)?.criadoEm ?? null, metadata: { size: nuvem.arquivos.get(nome)?.bytes.length ?? 0 } })),
      )
    }
    if (caminho === `/storage/v1/object/${BALDE_DAS_FOTOS}` && pedido.method() === 'DELETE') {
      const nomes = corpoDoPedido(pedido.postDataJSON())['prefixes']
      const apagados = (Array.isArray(nomes) ? nomes : []).filter((nome): nome is string => typeof nome === 'string' && nuvem.arquivos.delete(nome))
      return json(route, apagados.map((nome) => ({ name: nome })))
    }
    if (caminho === '/functions/v1/sugerir-plano') {
      const corpo = corpoDoPedido(pedido.postDataJSON())
      servidor.pedidosDaIa.push(corpo)
      const uso = () => ({ usados: usosDaIa, limite: 20, renovaEm: '2026-12-01' })
      if (corpo['modo'] === 'uso') return json(route, { uso: uso() })
      const erro = (status: number, codigo: string, frase: string) => json(route, { erro: frase, codigo }, status)
      if (cenario.ia === 'sem-rede') return route.abort('internetdisconnected')
      if (cenario.ia === 'limite') return erro(429, 'limite-mes', 'As 20 sugestões do mês foram usadas.')
      if (cenario.ia === 'recusa') return erro(422, 'recusa', 'A IA não respondeu a este pedido.')
      if (cenario.ia === 'erro') return erro(503, 'indisponivel', 'As sugestões com IA estão indisponíveis agora.')
      if (cenario.ia === 'lento') await new Promise((pronto) => setTimeout(pronto, 3000))
      usosDaIa += 1
      return json(route, { resposta: corpo['modo'] === 'ajustar' ? AJUSTES_IA : SUGESTAO_IA, uso: uso(), foraDaBase: 0, modelo: 'claude-opus-5-5' })
    }
    // Spec lado-do-paciente: as Edge Functions que o teste responde, e o registro de cada pedido.
    if (caminho.startsWith('/functions/v1/')) {
      const nome = caminho.slice('/functions/v1/'.length)
      const corpo = corpoEmJson(pedido)
      servidor.pedidosDeFuncao.push({ nome, corpo })
      const responderFuncao = cenario.funcoes?.[nome]
      if (responderFuncao) {
        const resposta = responderFuncao(corpo)
        return json(route, resposta.corpo, resposta.status ?? 200)
      }
    }
    if (caminho.startsWith('/rest/v1/rpc/')) servidor.chamadasDoBanco.push({ nome: caminho.slice('/rest/v1/rpc/'.length), corpo: corpoEmJson(pedido) })

    if (caminho === '/rest/v1/rpc/missoes_por_token') {
      if (cenario.link === 'sem-rede') return route.abort('internetdisconnected')
      return json(route, cenario.link ? [cenario.link] : [])
    }
    if (caminho === '/rest/v1/rpc/link_trocado') return json(route, cenario.linkTrocado === true)
    if (caminho === '/rest/v1/rpc/marcar_missoes') return cenario.marcar === 'sem-rede' ? route.abort('internetdisconnected') : json(route, null)
    if (caminho === '/rest/v1/rpc/eh_admin') return json(route, false)
    if (caminho.startsWith('/rest/v1/rpc/')) return json(route, null)

    if (caminho === '/rest/v1/copias') {
      // Como o PostgREST: o insert recusa a linha repetida (23505); o update só grava com a versão certa e devolve a
      // linha gravada; a leitura devolve a linha guardada.
      const { copia } = nuvem
      if (pedido.method() === 'GET') {
        if (copia === null) return json(route, [])
        return json(route, [url.searchParams.get('select') === 'atualizado_em' ? { atualizado_em: copia.atualizado_em } : { dados: copia.dados, atualizado_em: copia.atualizado_em }])
      }
      const corpo = corpoDoPedido(pedido.postDataJSON())
      servidor.gravacoesDaCopia.push(corpo)
      const nova: LinhaDaCopia = { dados: corpo['dados'], aparelho: corpo['aparelho'], atualizado_em: String(corpo['atualizado_em']) }
      if (pedido.method() === 'POST') {
        if (copia !== null) return json(route, { code: '23505', message: 'duplicate key value violates unique constraint "copias_pkey"' }, 409)
        nuvem.copia = nova
        return json(route, [{ atualizado_em: nova.atualizado_em }], 201)
      }
      const versao = url.searchParams.get('atualizado_em')?.replace(/^eq\./, '')
      if (copia === null || copia.atualizado_em !== versao) return json(route, [])
      nuvem.copia = nova
      return json(route, [{ atualizado_em: nova.atualizado_em }])
    }
    // Spec marca-no-link: a marca publicada (upsert, como o app grava).
    if (caminho === '/rest/v1/marcas' && pedido.method() === 'POST') {
      servidor.gravacoesDaMarca.push(corpoDoPedido(pedido.postDataJSON()))
      return json(route, [], 201)
    }
    if (pedido.method() !== 'GET') return json(route, [], 201)
    if (caminho === '/rest/v1/perfis') return json(route, cenario.perfil ? [cenario.perfil] : [])
    if (caminho === '/rest/v1/assinaturas') return json(route, cenario.assinatura ? [cenario.assinatura] : [])
    if (caminho === '/rest/v1/pedidos_estudante') return json(route, cenario.pedidoEstudante ? [cenario.pedidoEstudante] : [])
    return json(route, [])
  })
  return servidor
}

// ---------- Linhas prontas ----------

export const PERFIL_NUTRICIONISTA: Linha = {
  nome: USUARIO_FALSO.nome,
  situacao: 'nutricionista',
  crn_regiao: 3,
  crn_numero: '12345',
  crn_status: 'confirmado',
  crn_declarado_em: '2026-10-01T12:00:00Z',
  crn_decidido_em: '2026-10-02T12:00:00Z',
}

export const PERFIL_ESTUDANTE: Linha = { nome: USUARIO_FALSO.nome, situacao: 'estudante', crn_regiao: null, crn_numero: null, crn_status: null }

export const PEDIDO_RECUSADO: Linha = {
  id: 'p1',
  instituicao: 'Universidade Federal do Rio Grande do Norte (UFRN)',
  matricula: '20231234',
  periodo: 5,
  formatura: '2028-12-01',
  status: 'recusado',
  motivo: 'o comprovante não mostra o semestre atual',
  enviado_em: '2026-10-10T12:00:00Z',
  decidido_em: '2026-10-11T12:00:00Z',
  aviso_fechado: false,
}

export function assinaturaFalsa(status: 'ativa' | 'pendente' | 'recusada', plano: 'solo' | 'pro' = 'solo'): Linha {
  return { nutricionista_id: USUARIO_FALSO.id, plano, ciclo: 'mensal', status, expira_em: null, cartao_bandeira: 'Mastercard', cartao_final: '6351', valor_centavos: 2990 }
}

/** O link do paciente como a função do banco devolve, com a dieta guardada como texto (spec dieta-no-link, D-151). */
export function linkFalso(parcial: Linha = {}): Linha {
  return {
    id: 'a1',
    token: 'token-do-teste',
    caso_id: 'c1',
    paciente_id: null,
    nome: 'Ana, 30 anos',
    criado_em: '2026-10-15T12:00:00Z',
    missoes: [
      { id: 'refeicao-1', texto: 'Café da manhã por volta das 07:00', origem: 'Refeição do plano' },
      { id: 'refeicao-2', texto: 'Almoço por volta das 12:00', origem: 'Refeição do plano' },
      { id: 'agua', texto: 'Beber 2 litros de água', origem: '35 ml por kg de peso' },
    ],
    marcacoes: [],
    uso_nao_comercial: false,
    dieta: null,
    ...parcial,
  }
}

const item = (medida: string | null, gramas: number, alimento: string) => ({ medida, gramas, alimento })

/**
 * A dieta do plano de exemplo como o link a guarda hoje (spec dieta-no-link, D-151): o nome da tabela e a medida do
 * planejador. Copiada do `dietaDoPlano` do exemplo em 19/10/2026 (o Playwright não lê o JSON da base pelo domínio).
 */
export const DIETA_GUARDADA = {
  refeicoes: [
    {
      horario: '06:00',
      nome: 'Desjejum',
      opcoes: [
        [
          item('1 unidade e meia', 70, 'Pão, trigo, francês'),
          item(null, 5, 'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)'),
          item(null, 30, 'Queijo, minas, frescal'),
          item('3 colheres de sopa', 120, 'Mamão, Formosa, cru'),
        ],
      ],
    },
    { horario: '09:00', nome: 'Lanche da manhã', opcoes: [[item('5 fatias', 130, 'Banana, prata, crua'), item('4 unidades', 15, 'Castanha-do-Brasil, crua')]] },
    {
      horario: '12:00',
      nome: 'Almoço',
      opcoes: [
        [
          item('6 colheres de sopa', 150, 'Arroz, tipo 1, cozido'),
          item('6 colheres de sopa', 100, 'Feijão, carioca, cozido'),
          item('1 bife', 100, 'Frango, peito, sem pele, grelhado'),
          item('4 colheres de servir', 80, 'Brócolis, cozido'),
          item('meia unidade', 60, 'Cenoura, crua'),
        ],
        [item(null, 90, 'Macarrão, trigo, cru'), item('1 bife', 100, 'Carne, bovina, patinho, sem gordura, grelhado')],
        [item('2 colheres de servir e meia', 150, 'Batata, inglesa, cozida'), item('meia unidade', 100, 'Merluza, filé, assado')],
      ],
    },
    { horario: '16:00', nome: 'Lanche da tarde', opcoes: [[item('1 copo americano', 150, 'Iogurte, natural'), item('2 colheres de sopa', 30, 'Aveia, flocos, crua')]] },
    {
      horario: '19:00',
      nome: 'Jantar',
      opcoes: [
        [
          item('6 colheres de sopa', 120, 'Arroz, integral, cozido'),
          item('3 colheres de sopa e meia', 60, 'Lentilha, cozida'),
          item('2 unidades', 90, 'Ovo, de galinha, inteiro, cozido/10minutos'),
          item('4 colheres de servir e meia', 70, 'Alface, crespa, crua'),
        ],
      ],
    },
    { horario: '21:00', nome: 'Ceia', opcoes: [[item('3 fatias e meia', 130, 'Maçã, Fuji, com casca, crua')]] },
  ],
  orientacoes: 'Beba água ao longo do dia.\nEvite frituras.',
  receitas: 'Salada de grão-de-bico: grão-de-bico cozido, tomate, cebola e azeite.',
  copiadaEm: '2026-10-15',
}
