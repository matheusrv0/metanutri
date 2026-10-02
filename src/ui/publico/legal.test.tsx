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
  DATA_TERMOS: '2 de outubro de 2026',
  VERSAO_TERMOS: '2026-10-02',
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
    expect(screen.getByText(/Versão de 2 de outubro de 2026/)).toBeInTheDocument()
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
    expect(texto).toContain('2 de outubro de 2026')
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

  it('CA-382: a política diz quem processa o cartão, que ele vai direto e criptografado, e o pouco que o MetaNutri guarda', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('O pagamento é processado pelo Mercado Pago.')
    expect(texto).toContain('vão direto do seu navegador para ele, criptografados, sem passar pelo MetaNutri')
    expect(texto).toContain('O MetaNutri guarda só a bandeira, os 4 últimos números do cartão e a data da próxima cobrança')
    expect(texto).not.toContain('Nenhum dado de cartão passa pelo MetaNutri')
  })
})
