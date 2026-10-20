// O servidor de conta de mentira das telas públicas (spec revisao-geral-publica, D-233). O site de teste é montado com
// um endereço do Supabase que não existe (`ENDERECO_FALSO`), e o Playwright responde por ele: nada sai da máquina.
// Assim dá para abrir, sem banco, as telas que só existem com o servidor ligado: Completar cadastro, Comprovar
// matrícula, o checkout com sessão, a volta do pagamento e o link do paciente lido da nuvem.
import type { Page, Route } from '@playwright/test'

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
  /** O que o login responde. */
  readonly entrar?: 'ok' | 'credencial-invalida' | 'sem-rede'
  /** A marcação do paciente (`marcar_missoes`): grava, ou o pedido cai. */
  readonly marcar?: 'ok' | 'sem-rede'
  /** O e-mail da sessão, quando o teste precisa de um diferente (um e-mail longo, por exemplo). */
  readonly emailDaSessao?: string
}

const base64url = (texto: string): string => Buffer.from(texto).toString('base64url')

/** Um JWT só no formato: o site não confere a assinatura, e o servidor falso não confere nada. */
function tokenFalso(validoAte: number, email: string): string {
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = base64url(JSON.stringify({ sub: USUARIO_FALSO.id, email, role: 'authenticated', aud: 'authenticated', exp: validoAte }))
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

const json = (route: Route, corpo: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })

/** Liga o servidor falso numa página, antes do `goto`. */
export async function ligarServidorFalso(pagina: Page, cenario: Cenario = {}): Promise<void> {
  if (cenario.sessao) {
    await pagina.addInitScript(
      ([chave, valor]) => {
        if (!localStorage.getItem(chave)) localStorage.setItem(chave, valor)
      },
      [CHAVE_DA_SESSAO, JSON.stringify(sessao(cenario.emailDaSessao))] as const,
    )
  }

  // O script dos campos do cartão nunca sai da máquina: um script vazio carrega, não cria a operadora, e o checkout
  // mostra o aviso de campos que não carregaram, com o botão de assinar parado (CB-88 da checkout-proprio).
  await pagina.route('https://sdk.mercadopago.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))

  await pagina.route(`${ENDERECO_FALSO}/**`, async (route) => {
    const pedido = route.request()
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
    if (caminho.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (caminho.startsWith('/auth/v1/')) return json(route, {})

    if (caminho === '/rest/v1/rpc/missoes_por_token') {
      if (cenario.link === 'sem-rede') return route.abort('internetdisconnected')
      return json(route, cenario.link ? [cenario.link] : [])
    }
    if (caminho === '/rest/v1/rpc/marcar_missoes') return cenario.marcar === 'sem-rede' ? route.abort('internetdisconnected') : json(route, null)
    if (caminho === '/rest/v1/rpc/eh_admin') return json(route, false)
    if (caminho.startsWith('/rest/v1/rpc/')) return json(route, null)

    if (pedido.method() !== 'GET') return json(route, [], 201)
    if (caminho === '/rest/v1/perfis') return json(route, cenario.perfil ? [cenario.perfil] : [])
    if (caminho === '/rest/v1/assinaturas') return json(route, cenario.assinatura ? [cenario.assinatura] : [])
    if (caminho === '/rest/v1/pedidos_estudante') return json(route, cenario.pedidoEstudante ? [cenario.pedidoEstudante] : [])
    return json(route, [])
  })
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
