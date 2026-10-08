import { render, screen } from '@testing-library/react'
import { TelaPrivacidade } from './TelaPrivacidade.tsx'
import { TelaTermos } from './TelaTermos.tsx'

// O vi.mock é içado para antes dos imports; os getters deixam cada teste trocar os valores.
const legal = vi.hoisted(() => ({ RESPONSAVEL: 'Fulana de Tal' as string | null, CONTATO_EMAIL: 'contato@exemplo.com' as string | null }))

vi.mock('@/domain/legal.ts', () => ({
  get RESPONSAVEL() {
    return legal.RESPONSAVEL
  },
  get CONTATO_EMAIL() {
    return legal.CONTATO_EMAIL
  },
  DATA_TERMOS: '8 de outubro de 2026',
  VERSAO_TERMOS: '2026-10-08',
  PRAZO_EXCLUSAO_DIAS: 90,
  PRAZO_INCIDENTE_HORAS: 72,
}))

describe('documentos legais', () => {
  beforeEach(() => {
    legal.RESPONSAVEL = 'Fulana de Tal'
    legal.CONTATO_EMAIL = 'contato@exemplo.com'
  })

  it('CA-222 e CA-224: termos dizem quem prescreve, quem é controlador e operador, e a data', () => {
    render(<TelaTermos />)
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
    expect(screen.getByText(/Versão de 8 de outubro de 2026/)).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('quem prescreve é o nutricionista')
    expect(texto).toContain('controlador')
    expect(texto).toContain('operador')
    expect(texto).toContain('uso não comercial')
    expect(texto).toContain('A tela do paciente avisa que não é atendimento profissional.')
    expect(texto).not.toContain('PDF sai marcado')
    expect(texto).toContain('comprovante de matrícula')
    expect(texto).toContain('7 dias')
  })

  it('CA-221, CA-224 e CA-302: a política diz quem responde, onde ficam os dados e o que é feito do comprovante', () => {
    render(<TelaPrivacidade />)
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Fulana de Tal')
    expect(texto).toContain('contato@exemplo.com')
    expect(texto).toContain('art. 18')
    expect(texto).toContain('neste aparelho')
    expect(texto).toContain('Supabase')
    expect(texto).toContain('apagado 30 dias depois')
    expect(texto).toContain('8 de outubro de 2026')
  })

  it('D-124 (spec dados-por-conta): a política diz que os dados ficam separados por conta e como apagar os seus', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Os planos e as fichas de paciente ficam salvos neste aparelho, no navegador de quem usa, separados por conta.')
    expect(texto).toContain('Os seus dados neste aparelho somem quando você usa "Apagar tudo", em Configurações, ou "Sair e apagar".')
    expect(texto).not.toContain('O que está neste aparelho some')
  })

  it('D-122 (spec dados-por-conta): outra conta no mesmo aparelho não vê os seus dados, e os termos não mandam sair nem apagar', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Se outra conta entrar no mesmo aparelho, ela não vê os seus dados.')
    expect(texto).not.toContain('precisa sair ou apagar')
  })

  it('D-46: sem responsável ou contato, os dois mostram que estão em preparação', () => {
    legal.RESPONSAVEL = null
    render(<TelaPrivacidade />)
    expect(screen.getByText('Este texto está sendo finalizado e entra no ar em breve.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('art. 18')
  })

  it('CA-365: a política diz que o responsável acompanha contas e assinaturas e que os e-mails saem pelo Resend', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain(
      'O nome, o e-mail, a situação, o plano e as datas de criação da conta e do último login também servem para o responsável pelo MetaNutri acompanhar as contas e as assinaturas.',
    )
    expect(texto).toContain('são enviados pelo Resend')
    expect(texto).not.toContain('Gmail')
  })

  it('CA-381: os termos dizem cartão de crédito, renovação sozinha e cancelamento em Conta e plano, sem citar o processador', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Solo e Pro são assinaturas pagas com cartão de crédito')
    expect(texto).toContain('renovam sozinhas')
    expect(texto).toContain('Para cancelar, use Conta e plano. O plano pago vale até o fim do período já pago')
    expect(texto).not.toMatch(/mercado ?pago/i)
  })

  it('CA-391: os termos não prometem preço de fundador nem preço fixo para sempre', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/fundador|preço travado|mantém esse preço|não sobe|para sempre/i)
  })

  it('os termos não prometem prazo para o cancelamento por cobrança recusada', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Se as cobranças continuarem sendo recusadas, a assinatura é cancelada e a conta volta para o Free.')
    expect(texto).not.toContain('novas tentativas')
    expect(texto).not.toMatch(/\d+ dias?[^.]*recusad|recusad[^.]*\d+ dias?/)
  })

  it('CA-382: a política diz quem processa o cartão, que ele vai direto e criptografado, e o pouco que o MetaNutri guarda', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('O pagamento é processado pelo Mercado Pago.')
    expect(texto).toContain('vão direto do seu navegador para ele, criptografados, sem passar pelo MetaNutri')
    expect(texto).toContain('Do cartão, o MetaNutri guarda só a bandeira, os 4 últimos números e a data da próxima cobrança')
    expect(texto).not.toContain('Nenhum dado de cartão passa pelo MetaNutri')
  })

  it('M1 (LGPD): a política diz que o nome impresso no cartão e o CPF do titular também vão para o Mercado Pago', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain(
      'Os dados do cartão (número, validade e código), o nome impresso no cartão e o CPF do titular vão direto do seu navegador para ele, criptografados, sem passar pelo MetaNutri.',
    )
  })

  it('CA-464: a política diz, em "Onde os dados ficam", que o Cloudflare Turnstile recebe dados técnicos do navegador nas telas de conta', () => {
    render(<TelaPrivacidade />)
    const lista = screen.getByRole('heading', { name: 'Onde os dados ficam' }).nextElementSibling
    expect(lista).toHaveTextContent(
      'Nas telas de conta, o Cloudflare Turnstile recebe dados técnicos do navegador, como o endereço IP, para separar pessoas de robôs.',
    )
  })
})
