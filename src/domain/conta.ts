// Conta e assinatura. O sistema funciona inteiro sem conta: ela serve para levar
// os dados para outro aparelho e, no futuro, para cobrar.

export type IdPlano = 'free' | 'estudante' | 'solo' | 'pro' | 'clinica'

export interface PlanoAssinatura {
  readonly id: IdPlano
  readonly nome: string
  readonly resumo: string
  /** Em reais, por mês. Zero é grátis. */
  readonly mensal: number
  /** Em reais, no ano inteiro. Zero quando o plano não tem opção anual. */
  readonly anual: number
  readonly destaque: boolean
  readonly acaoTexto: string
  /** Quantos pacientes ativos cabem no plano. `null` é ilimitado. */
  readonly limitePacientesAtivos: number | null
  /**
   * Quantos links de missões podem existir ao mesmo tempo. Separado do limite de
   * pacientes porque o link alcança uma pessoa de verdade, fora do sistema.
   */
  readonly limiteLinksPaciente: number | null
  /**
   * Conta de estudante: pode usar, mas não para atender comercialmente. O PDF sai
   * marcado e a tela do paciente avisa — é o modelo do WebDiet, e o que a Lei
   * 8.234/1991 pede de quem ainda não tem CRN.
   */
  readonly usoNaoComercial: boolean
  /** Só entra com comprovante de matrícula. */
  readonly exigeComprovante: boolean
  /** O PDF sai com a marca do MetaNutri em vez da marca de quem atende. */
  readonly marcaNoPdf: boolean
  /** O que muda de verdade neste plano. */
  readonly recursos: readonly string[]
  /** Frase que abre a lista do que vem junto. */
  readonly inclui: readonly string[]
}

/**
 * Planos aprovados em 26/09/2026 e revistos em 27/09 (`docs/plano-negocio.md`).
 * A cobrança é por paciente ativo, não por plano montado — ver `pacientesAtivos`.
 *
 * O plano Estudante segue o modelo do WebDiet, decidido em 27/09: a pessoa usa o
 * sistema de verdade, mas a conta é de **uso não comercial** — no máximo 3 links de
 * missões, marca no PDF e aviso na tela do paciente. É o que concilia o estágio real
 * com a Lei 8.234/1991, que reserva a prescrição a quem tem CRN.
 */
export const PLANOS: readonly PlanoAssinatura[] = [
  {
    id: 'free',
    nome: 'Free',
    resumo: 'Para conhecer o sistema com um caso real, sem cartão.',
    mensal: 0,
    anual: 0,
    destaque: false,
    acaoTexto: 'Começar agora',
    limitePacientesAtivos: 2,
    limiteLinksPaciente: 2,
    usoNaoComercial: false,
    exigeComprovante: false,
    marcaNoPdf: true,
    recursos: ['2 pacientes ativos', 'Marca MetaNutri no PDF', 'Funciona sem internet'],
    inclui: ['Já vem com:', 'Adequação de micronutrientes', 'Missões diárias do paciente', 'Exportar Word e PDF'],
  },
  {
    id: 'estudante',
    nome: 'Estudante',
    resumo: 'Para o estágio, enquanto a faculdade não acaba. Uso não comercial.',
    mensal: 0,
    anual: 0,
    destaque: false,
    acaoTexto: 'Enviar comprovante',
    limitePacientesAtivos: 10,
    limiteLinksPaciente: 3,
    usoNaoComercial: true,
    exigeComprovante: true,
    marcaNoPdf: true,
    recursos: ['10 pacientes ativos', 'Até 3 links de missões', 'Grátis até a formatura'],
    inclui: ['Tudo do Free, mais:', 'Documento no modelo do estágio', 'Cadastro de produto por código de barras'],
  },
  {
    id: 'solo',
    nome: 'Solo',
    resumo: 'Para quem acabou de se formar e está montando a clientela.',
    mensal: 34.9,
    anual: 299,
    destaque: true,
    acaoTexto: 'Assinar',
    limitePacientesAtivos: 25,
    limiteLinksPaciente: 25,
    usoNaoComercial: false,
    exigeComprovante: false,
    marcaNoPdf: false,
    recursos: ['25 pacientes ativos', 'Seu logo nos documentos', 'Dados em qualquer aparelho'],
    inclui: ['Tudo do Grátis, mais:', 'Acompanhamento de quem está sumindo', 'Histórico de evolução', 'Suporte por e-mail'],
  },
  {
    id: 'pro',
    nome: 'Pro',
    resumo: 'Para nutricionista estabelecido, com agenda cheia.',
    mensal: 64.9,
    anual: 599,
    destaque: false,
    acaoTexto: 'Assinar',
    limitePacientesAtivos: null,
    limiteLinksPaciente: null,
    usoNaoComercial: false,
    exigeComprovante: false,
    marcaNoPdf: false,
    recursos: ['Pacientes ilimitados', 'Painel de micros completo', 'Dados em qualquer aparelho'],
    inclui: ['Tudo do Solo, mais:', 'Relatório de adesão por paciente', 'Modelos próprios de documento'],
  },
  {
    id: 'clinica',
    nome: 'Clínica',
    resumo: 'Para consultório com mais de um nutricionista.',
    mensal: 149,
    anual: 0,
    destaque: false,
    acaoTexto: 'Falar com a gente',
    limitePacientesAtivos: null,
    limiteLinksPaciente: null,
    usoNaoComercial: false,
    exigeComprovante: false,
    marcaNoPdf: false,
    recursos: ['Até 4 nutricionistas', 'Pacientes compartilhados', 'Painel do gestor'],
    inclui: ['Tudo do Pro, mais:', 'R$ 35 por nutricionista extra', 'Preceptor revisa e aprova', 'Suporte por WhatsApp'],
  },
]

/** Plano de quem cria conta sem comprovar nada. */
export const PLANO_PADRAO: IdPlano = 'free'

/** Quantas assinaturas travam o preço de fundador para sempre. */
export const VAGAS_PRECO_FUNDADOR = 200

/** Dias sem plano nem missão até o paciente deixar de contar como ativo. */
export const DIAS_PACIENTE_ATIVO = 30

/** Nenhum limite é aplicado hoje: sem cobrança, cobrar limite seria mentira. */
export const LIMITES_ATIVOS = false

const DIA_EM_MS = 24 * 60 * 60 * 1000

/**
 * Paciente ativo é quem teve plano ou missão nos últimos 30 dias — é assim que o
 * plano de negócio cobra. Data inválida ou ausente conta como inativo.
 */
export function ehPacienteAtivo(ultimaAtividade: string | null | undefined, agora: Date = new Date()): boolean {
  if (!ultimaAtividade) return false
  const quando = new Date(ultimaAtividade).getTime()
  if (Number.isNaN(quando)) return false
  const dias = (agora.getTime() - quando) / DIA_EM_MS
  return dias >= 0 && dias <= DIAS_PACIENTE_ATIVO
}

/** Quantos dos pacientes contam para o limite do plano agora. */
export function pacientesAtivos(ultimasAtividades: readonly (string | null | undefined)[], agora: Date = new Date()): number {
  return ultimasAtividades.filter((data) => ehPacienteAtivo(data, agora)).length
}

/**
 * Pode gerar mais um link de missões? Esta trava vale mesmo com `LIMITES_ATIVOS`
 * desligado: as outras são comerciais, esta existe porque o link alcança um paciente
 * de verdade e o plano Estudante é de quem ainda não tem CRN.
 */
export function podeGerarLink(plano: PlanoAssinatura, linksExistentes: number): boolean {
  return plano.limiteLinksPaciente === null || linksExistentes < plano.limiteLinksPaciente
}

export interface EstadoDoLimite {
  readonly ativos: number
  readonly limite: number | null
  readonly excedeu: boolean
  /** Quantos ainda cabem. `null` quando o plano é ilimitado. */
  readonly restantes: number | null
}

/** Compara os pacientes ativos com o limite do plano. Não bloqueia nada: só informa. */
export function estadoDoLimite(plano: PlanoAssinatura, ativos: number): EstadoDoLimite {
  const limite = plano.limitePacientesAtivos
  if (limite === null) return { ativos, limite: null, excedeu: false, restantes: null }
  return { ativos, limite, excedeu: ativos > limite, restantes: Math.max(0, limite - ativos) }
}

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

/**
 * O comparativo da página de preços, derivado dos próprios planos. Existe aqui, e não
 * na tela, porque já aconteceu de a página afirmar coisa que o plano não dizia: quando
 * o número sai de `PLANOS`, ele não tem como divergir.
 *
 * `true` vira marca de incluído, `false` vira travessão, texto vira texto.
 */
export type ValorComparativo = string | boolean

export interface LinhaComparativo {
  readonly rotulo: string
  /** Explicação curta, quando o rótulo sozinho engana. */
  readonly detalhe?: string
  /** Um valor por plano, na ordem de `PLANOS_COMPARADOS`. */
  readonly valores: readonly ValorComparativo[]
}

/** A coluna do Estudante não entra: ela é uma nota dentro da coluna Grátis. */
export const PLANOS_COMPARADOS: readonly IdPlano[] = ['free', 'solo', 'pro', 'clinica']

const porPlano = (fn: (plano: PlanoAssinatura) => ValorComparativo): readonly ValorComparativo[] =>
  PLANOS_COMPARADOS.map((id) => {
    const plano = planoPorId(id)
    return plano ? fn(plano) : false
  })

const numeroOuIlimitado = (n: number | null) => (n === null ? 'Ilimitados' : String(n))

export function comparativoDosPlanos(): readonly LinhaComparativo[] {
  return [
    {
      rotulo: 'Pacientes ativos',
      detalhe: 'Quem teve plano ou missão nos últimos 30 dias.',
      valores: porPlano((p) => numeroOuIlimitado(p.limitePacientesAtivos)),
    },
    {
      rotulo: 'Links de missões',
      detalhe: 'O endereço que o paciente abre no celular.',
      valores: porPlano((p) => numeroOuIlimitado(p.limiteLinksPaciente)),
    },
    { rotulo: 'Missões diárias do paciente', valores: porPlano(() => true) },
    { rotulo: 'Painel de micronutrientes com o botão cobrir', valores: porPlano(() => true) },
    { rotulo: 'Documento em Word no modelo do estágio', valores: porPlano(() => true) },
    {
      rotulo: 'Seu logo nos documentos',
      detalhe: 'Sem ele, o PDF sai com a marca do MetaNutri.',
      valores: porPlano((p) => !p.marcaNoPdf),
    },
    {
      rotulo: 'Dados em qualquer aparelho',
      valores: porPlano((p) => p.mensal > 0),
    },
    {
      rotulo: 'Quem está sumindo, no painel de adesão',
      valores: porPlano((p) => p.mensal > 0),
    },
    {
      rotulo: 'Mais de um nutricionista na mesma conta',
      valores: porPlano((p) => (p.id === 'clinica' ? 'Até 4' : false)),
    },
    {
      rotulo: 'Suporte',
      valores: porPlano((p) => (p.id === 'clinica' ? 'WhatsApp' : p.mensal > 0 ? 'E-mail' : 'Ajuda no app')),
    },
  ]
}
