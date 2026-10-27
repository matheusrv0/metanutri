// CA-758 (spec revisao-geral-publica): cada página do site abre em 390 e 1280 px com o título certo, sem rolar para o lado,
// sem erro no console e com a ação principal à vista. Spec separacao-site-app: o site num endereço próprio, sem conta
// (D-501); as telas do app ficam em e2e/servidor-falso/telas-publicas.spec.ts.
import { test, type Locator, type Page } from '@playwright/test'
import { conferirFumaca, LARGURAS_DA_FUMACA, vigiarConsole } from '../apoio/fumaca.ts'

interface Pagina {
  readonly nome: string
  readonly endereco: string
  readonly titulo: string | RegExp
  readonly acao: (pagina: Page) => Locator
}

const LANDING = /Planos alimentares completos/
const botao = (nome: string) => (p: Page) => p.getByRole('button', { name: nome, exact: true }).filter({ visible: true }).first()
const linkNoTopo = (nome: string) => (p: Page) => p.getByRole('banner').getByRole('link', { name: nome })
// Spec landing-escura: na landing, a ação principal é o "Criar conta grátis" do topo da página; a barra tem links.
const naLanding = (nome: string) => (p: Page) => p.getByRole('region', { name: LANDING }).getByRole('button', { name: nome })

const PAGINAS: readonly Pagina[] = [
  { nome: 'Landing', endereco: '/', titulo: LANDING, acao: naLanding('Criar conta grátis') },
  { nome: 'Preços', endereco: '/precos/', titulo: 'Planos e preços', acao: botao('Assinar Solo') },
  { nome: 'Preços com o Solo em destaque', endereco: '/precos/?destaque=solo', titulo: 'Planos e preços', acao: botao('Assinar Solo') },
  { nome: 'Termos', endereco: '/termos/', titulo: 'Termos de uso', acao: linkNoTopo('Começar grátis') },
  { nome: 'Privacidade', endereco: '/privacidade/', titulo: 'Política de privacidade', acao: linkNoTopo('Começar grátis') },
  { nome: 'Referências', endereco: '/fontes/', titulo: 'Referências', acao: (p) => p.getByRole('main').getByRole('link').first() },
]

for (const largura of LARGURAS_DA_FUMACA) {
  test.describe(`CA-758: páginas do site em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    for (const pagina of PAGINAS) {
      test(`${pagina.nome}`, async ({ page }) => {
        const erros = await vigiarConsole(page)
        await page.goto(pagina.endereco)
        await conferirFumaca(page, erros, { titulo: pagina.titulo, acao: pagina.acao })
      })
    }
  })
}
