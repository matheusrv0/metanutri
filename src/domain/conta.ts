// Conta e assinatura. O sistema funciona inteiro sem conta: ela serve para levar
// os dados para outro aparelho e, no futuro, para cobrar.

export type IdPlano = 'estudante' | 'profissional' | 'clinica'

export interface PlanoAssinatura {
  readonly id: IdPlano
  readonly nome: string
  readonly resumo: string
  /** Em reais, por mês. Zero é grátis. */
  readonly mensal: number
  /** Em reais, no ano inteiro. */
  readonly anual: number
  readonly destaque: boolean
  readonly acaoTexto: string
  /** O que muda de verdade neste plano. */
  readonly recursos: readonly string[]
  /** Frase que abre a lista do que vem junto. */
  readonly inclui: readonly string[]
}

/**
 * Preços propostos a partir da entrevista (teto de R$ 20 no plano principal).
 * Enquanto não houver cobrança, nada aqui bloqueia o uso — ver `LIMITES_ATIVOS`.
 */
export const PLANOS: readonly PlanoAssinatura[] = [
  {
    id: 'estudante',
    nome: 'Estudante',
    resumo: 'Para quem está no estágio e monta plano no próprio computador.',
    mensal: 0,
    anual: 0,
    destaque: false,
    acaoTexto: 'Começar agora',
    recursos: ['Planos e pacientes ilimitados', 'Tudo salvo neste navegador', 'Funciona sem internet'],
    inclui: ['Já vem com:', 'Adequação de micronutrientes', 'Exportar Word e PDF', 'Cadastro de produto por código de barras'],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    resumo: 'Para quem atende de verdade e precisa dos dados em qualquer aparelho.',
    mensal: 19,
    anual: 182,
    destaque: true,
    acaoTexto: 'Assinar',
    recursos: ['Conta com dados na nuvem', 'Abre no computador e no celular', 'Backup automático'],
    inclui: ['Tudo do Estudante, mais:', 'Link do plano para o paciente', 'Sua marca nos documentos', 'Histórico de evolução'],
  },
  {
    id: 'clinica',
    nome: 'Clínica',
    resumo: 'Para consultório com mais de um nutricionista e preceptoria.',
    mensal: 49,
    anual: 470,
    destaque: false,
    acaoTexto: 'Falar com a gente',
    recursos: ['Até 5 profissionais', 'Preceptor revisa e aprova', 'Relatório por profissional'],
    inclui: ['Tudo do Profissional, mais:', 'Pastas por equipe', 'Modelos compartilhados', 'Suporte por WhatsApp'],
  },
]

/** Nenhum limite é aplicado hoje: sem cobrança, cobrar limite seria mentira. */
export const LIMITES_ATIVOS = false

export const planoPorId = (id: IdPlano): PlanoAssinatura | null => PLANOS.find((p) => p.id === id) ?? null

/** Quanto por mês sai o plano anual, para comparar honestamente com o mensal. */
export function mensalizadoDoAnual(plano: PlanoAssinatura): number {
  return plano.anual === 0 ? 0 : Math.round((plano.anual / 12) * 100) / 100
}

/** Desconto do anual em relação a 12 meses do mensal; zero quando não há. */
export function descontoAnualPct(plano: PlanoAssinatura): number {
  const doze = plano.mensal * 12
  if (doze <= 0 || plano.anual <= 0 || plano.anual >= doze) return 0
  return Math.round(((doze - plano.anual) / doze) * 100)
}

export interface Sessao {
  readonly id: string
  readonly email: string
  readonly nome: string
  readonly plano: IdPlano
}

export type ErroConta =
  | 'email-invalido'
  | 'senha-curta'
  | 'senha-diferente'
  | 'credencial-invalida'
  | 'email-em-uso'
  | 'sem-servidor'
  | 'falha-rede'

export const MENSAGEM_ERRO: Readonly<Record<ErroConta, string>> = {
  'email-invalido': 'Digite um e-mail válido, como voce@exemplo.com.',
  'senha-curta': 'A senha precisa de pelo menos 8 caracteres.',
  'senha-diferente': 'As duas senhas não são iguais.',
  'credencial-invalida': 'E-mail ou senha não conferem.',
  'email-em-uso': 'Já existe conta com este e-mail. Entre em vez de criar.',
  'sem-servidor': 'A conta na nuvem ainda não foi configurada neste aparelho. O sistema funciona normalmente sem ela.',
  'falha-rede': 'Não deu para falar com o servidor. Confira a internet e tente de novo.',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const SENHA_MINIMA = 8

/** Erros do formulário antes de qualquer chamada de rede. */
export function validarEntrada(email: string, senha: string): ErroConta | null {
  if (!EMAIL.test(email.trim())) return 'email-invalido'
  if (senha.length < SENHA_MINIMA) return 'senha-curta'
  return null
}

export function validarCadastro(email: string, senha: string, confirmacao: string): ErroConta | null {
  const erro = validarEntrada(email, senha)
  if (erro) return erro
  if (senha !== confirmacao) return 'senha-diferente'
  return null
}

/** "maria.silva@gmail.com" → "Maria Silva": um primeiro nome decente antes de a pessoa preencher. */
export function nomeSugerido(email: string): string {
  const usuario = email.split('@')[0] ?? ''
  return (
    usuario
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ') || 'Você'
  )
}
