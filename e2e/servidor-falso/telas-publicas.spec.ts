// CA-758 (spec revisao-geral-publica): cada tela pública abre em 390 e 1280 px com o título certo, sem rolar para o lado,
// sem erro no console e com a ação principal à vista. O site de teste tem o servidor de conta ligado (falso, D-233),
// como o site no ar: Entrar e Criar conta aparecem como em produção, e as telas com conta abrem.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { conferirFumaca, LARGURAS_DA_FUMACA, vigiarConsole } from '../apoio/fumaca.ts'
import {
  assinaturaFalsa,
  DIETA_GUARDADA,
  ligarServidorFalso,
  linkFalso,
  PERFIL_ESTUDANTE,
  PERFIL_NUTRICIONISTA,
  type Cenario,
} from '../apoio/servidorFalso.ts'

interface Tela {
  readonly nome: string
  readonly endereco: string
  readonly titulo: string | RegExp
  readonly acao: (pagina: Page) => Locator
  readonly cenario?: Cenario
  /** O que a pessoa faz antes de a tela estar no estado conferido (escolher uma aba, por exemplo). */
  readonly antes?: (pagina: Page) => Promise<void>
}

const comSessao = (extra: Cenario = {}): Cenario => ({ sessao: true, perfil: PERFIL_NUTRICIONISTA, ...extra })
const botao = (nome: string | RegExp) => (p: Page) => p.getByRole('button', { name: nome, exact: typeof nome === 'string' }).filter({ visible: true }).first()
const noTopo = (nome: string) => (p: Page) => p.getByRole('banner').getByRole('button', { name: nome })
const LANDING = /Faltou cálcio/

const TELAS: readonly Tela[] = [
  { nome: 'o endereço sem caminho abre a landing (CA-730)', endereco: '/', titulo: LANDING, acao: noTopo('Começar grátis') },
  { nome: 'Landing', endereco: '/#/inicio', titulo: LANDING, acao: noTopo('Começar grátis') },
  { nome: 'Preços', endereco: '/#/precos', titulo: 'Planos e preços', acao: botao('Assinar Solo') },
  { nome: 'Preços com o Solo em destaque', endereco: '/#/precos/solo', titulo: 'Planos e preços', acao: botao('Assinar Solo') },
  { nome: 'Entrar', endereco: '/#/entrar', titulo: 'Entrar', acao: botao('Entrar') },
  { nome: 'Criar conta (Free)', endereco: '/#/criar-conta', titulo: 'Crie sua conta', acao: botao('Criar conta') },
  { nome: 'Criar conta (Solo)', endereco: '/#/criar-conta/solo', titulo: 'Crie sua conta', acao: botao('Criar conta e continuar') },
  { nome: 'Criar conta (Solo anual)', endereco: '/#/criar-conta/solo/anual', titulo: 'Crie sua conta', acao: botao('Criar conta e continuar') },
  { nome: 'Criar conta (Pro)', endereco: '/#/criar-conta/pro', titulo: 'Crie sua conta', acao: botao('Criar conta e continuar') },
  { nome: 'Criar conta (Estudante)', endereco: '/#/criar-conta/estudante', titulo: 'Crie sua conta de estudante', acao: botao('Criar conta e continuar') },
  { nome: 'Confirmar e-mail', endereco: '/#/confirmar-email', titulo: 'Confira seu e-mail', acao: botao('Confirmar') },
  { nome: 'Esqueci a senha', endereco: '/#/esqueci-senha', titulo: 'Esqueci a senha', acao: botao('Mandar o código') },
  { nome: 'Esqueci a senha (o código)', endereco: '/#/esqueci-senha/codigo', titulo: 'Crie uma senha nova', acao: botao('Salvar a senha') },
  { nome: 'Nova senha', endereco: '/#/nova-senha', titulo: 'Este link não vale mais', acao: botao('Pedir um código') },
  { nome: 'Termos', endereco: '/#/termos', titulo: 'Termos de uso', acao: noTopo('Começar grátis') },
  { nome: 'Privacidade', endereco: '/#/privacidade', titulo: 'Política de privacidade', acao: noTopo('Começar grátis') },
  { nome: 'Fontes', endereco: '/#/fontes', titulo: 'Fontes da base', acao: (p) => p.getByRole('main').getByRole('link').first() },
  {
    nome: 'Checkout',
    endereco: '/#/assinar/solo/mensal',
    titulo: 'Assine o MetaNutri',
    acao: botao(/^Assinar por R\$/),
    cenario: comSessao(),
  },
  { nome: 'Checkout de quem já assina', endereco: '/#/assinar/pro/anual', titulo: 'Assine o MetaNutri', acao: botao('Ir para o painel'), cenario: comSessao({ assinatura: assinaturaFalsa('ativa') }) },
  { nome: 'Volta do pagamento (ativa)', endereco: '/#/pagamento', titulo: 'Assinatura ativa', acao: botao('Ir para o painel'), cenario: comSessao({ assinatura: assinaturaFalsa('ativa') }) },
  { nome: 'Volta do pagamento (em análise)', endereco: '/#/pagamento', titulo: 'Pagamento em análise', acao: botao('Ir para o painel'), cenario: comSessao({ assinatura: assinaturaFalsa('pendente') }) },
  { nome: 'Volta do pagamento (recusada)', endereco: '/#/pagamento', titulo: 'Pagamento não concluído', acao: botao('Tentar de novo'), cenario: comSessao({ assinatura: assinaturaFalsa('recusada') }) },
  { nome: 'Comprovar matrícula', endereco: '/#/comprovar-matricula', titulo: 'Comprove sua matrícula', acao: botao('Enviar para análise'), cenario: comSessao({ perfil: PERFIL_ESTUDANTE }) },
  { nome: 'Completar cadastro', endereco: '/#/painel', titulo: 'Complete seu cadastro', acao: botao('Continuar'), cenario: comSessao({ perfil: null }) },
  { nome: 'Landing com sessão', endereco: '/#/inicio', titulo: LANDING, acao: noTopo('Ir para o painel'), cenario: comSessao() },
  {
    nome: 'Link do paciente (missões)',
    endereco: '/#/missoes/token-do-teste',
    titulo: 'Suas missões de hoje, Ana',
    acao: botao(/Almoço por volta das 12:00/),
    cenario: { link: linkFalso() },
  },
  {
    nome: 'Link do paciente (Meu plano)',
    endereco: '/#/missoes/token-do-teste',
    titulo: 'Seu plano alimentar, Ana',
    acao: (p) => p.getByRole('region', { name: '12:00 Almoço' }),
    cenario: { link: linkFalso({ dieta: DIETA_GUARDADA }) },
    antes: async (p) => p.getByRole('tab', { name: 'Meu plano' }).click(),
  },
  { nome: 'Link do paciente (link que não existe)', endereco: '/#/missoes/token-do-teste', titulo: 'Este link não existe mais', acao: (p) => p.getByRole('main'), cenario: { link: null } },
]

for (const largura of LARGURAS_DA_FUMACA) {
  test.describe(`CA-758: telas públicas em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    for (const tela of TELAS) {
      test(`${tela.nome}`, async ({ page }) => {
        const erros = await vigiarConsole(page)
        await ligarServidorFalso(page, tela.cenario ?? {})
        await page.goto(tela.endereco)
        if (tela.antes) await tela.antes(page)
        await conferirFumaca(page, erros, { titulo: tela.titulo, acao: tela.acao })
        if (tela.endereco === '/') await expect(page).toHaveURL(/#\/inicio$/)
      })
    }
  })
}
