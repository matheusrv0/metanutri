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
  DATA_TERMOS: '19 de outubro de 2026',
  VERSAO_TERMOS: '2026-10-19',
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
    expect(screen.getByText(/Versão de 19 de outubro de 2026/)).toBeInTheDocument()
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

  it('CA-994 (spec site-publico-profissional): quem prescreve continua nos Termos, sem dizer que os cálculos não foram conferidos', () => {
    render(<TelaTermos />)
    const secao = screen.getByRole('heading', { name: 'Quem prescreve é o nutricionista' }).nextElementSibling
    expect(secao).toHaveTextContent('Lei 8.234/1991')
    expect(secao).toHaveTextContent('confere cada número antes de entregar ao paciente')
    expect(document.body.textContent).not.toMatch(/conferidos/)
  })

  it('CA-221, CA-224 e CA-302: a política diz quem responde, onde ficam os dados e o que é feito do comprovante', () => {
    render(<TelaPrivacidade />)
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Fulana de Tal')
    expect(texto).toContain('contato@exemplo.com')
    expect(texto).toContain('art. 18')
    expect(texto).toContain('vinculados à conta')
    expect(texto).not.toContain('presos')
    expect(texto).toContain('Supabase')
    expect(texto).toContain('apagado 30 dias depois')
    expect(texto).toContain('19 de outubro de 2026')
  })

  it('CA-552 (spec dieta-no-link): a política diz que o link do paciente pode mostrar o plano alimentar, quando o nutricionista liga', () => {
    render(<TelaPrivacidade />)
    const dados = screen.getByRole('heading', { name: 'Que dados guardamos e para quê' }).nextElementSibling
    expect(dados).toHaveTextContent(
      'O plano alimentar do paciente (refeições, quantidades, substitutos, orientações e receitas), quando o nutricionista ativa “Mostrar o plano alimentar no link”: para o paciente consultar o plano.',
    )
    const onde = screen.getByRole('heading', { name: 'Onde os dados ficam' }).nextElementSibling
    expect(onde).toHaveTextContent('A conta, a assinatura, os dados da conta e as missões e o plano alimentar do link do paciente ficam na Supabase')
    const seguranca = screen.getByRole('heading', { name: 'Segurança' }).nextElementSibling
    expect(seguranca).toHaveTextContent('O link do paciente usa um endereço secreto e mostra só as missões daquele paciente e, quando o nutricionista ativa, o plano alimentar dele.')
    expect(seguranca).toHaveTextContent('um nutricionista não acessa os dados de outro')
    expect(seguranca).not.toHaveTextContent('mostra só as missões daquele paciente.')
  })

  it('CA-597 (spec anamnese-e-prescricoes): a política diz que a ficha também guarda a próxima consulta, a anamnese, os suplementos e os pedidos de exame, como dado de saúde', () => {
    render(<TelaPrivacidade />)
    const dados = screen.getByRole('heading', { name: 'Que dados guardamos e para quê' }).nextElementSibling
    expect(dados).toHaveTextContent(
      'Da ficha do paciente, guardamos também a data da próxima consulta, as respostas da anamnese, os suplementos e os pedidos de exame que o nutricionista registra: para o atendimento, os lembretes e os documentos que ele imprime. São dados de saúde, com o mesmo cuidado dos outros.',
    )
  })

  it('D-128 e D-131 (spec dados-na-nuvem) e CA-1184: a política diz que os dados ficam na nuvem, vinculados à conta, e que a cópia do navegador é apagada ao sair', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Os planos, as fichas de paciente e as configurações ficam na nuvem, vinculados à conta.')
    expect(texto).toContain('Enquanto a pessoa está dentro, o navegador guarda uma cópia de trabalho; ao sair da conta, ela é apagada.')
    expect(texto).toContain('A cópia de trabalho no navegador é apagada quando você sai da conta.')
    // DP-22 e DP-30: o dado de antes que ainda não foi para a conta não é apagado ao sair.
    expect(texto).toContain('Dados antigos que ainda não foram enviados ficam neste navegador e sobem para a conta na próxima vez que você entrar.')
    expect(texto).not.toMatch(/Apagar tudo|Sair e apagar|ficam salvos neste aparelho|cópia na nuvem/)
  })

  it('D-128 (spec dados-na-nuvem): os termos dizem que os planos ficam na nuvem e que sem internet não dá para editar', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Os planos alimentares ficam na nuvem, vinculados à conta. Sem internet, o MetaNutri não deixa editar até a conexão voltar.')
    expect(texto).not.toContain('Os planos ficam salvos no aparelho')
  })

  it('D-122 (spec dados-por-conta): outra conta no mesmo aparelho não vê os seus dados, e os termos não mandam sair nem apagar', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Se outra conta entrar no mesmo aparelho, ela não vê os seus dados.')
    expect(texto).not.toContain('precisa sair ou apagar')
  })

  it('CA-827 (spec exclusao-de-conta): a política diz como excluir a conta, o que sai na hora, o que fica, por quanto tempo, e que o e-mail continua valendo', () => {
    render(<TelaPrivacidade />)
    const titulo = screen.getByRole('heading', { name: 'Por quanto tempo' })
    const secao: Element[] = []
    for (let atual = titulo.nextElementSibling; atual && atual.tagName !== 'H2'; atual = atual.nextElementSibling) secao.push(atual)
    const texto = secao.map((elemento) => elemento.textContent).join(' ')
    expect(texto).toContain(
      'Enquanto a conta existir. Para excluir, use Conta e assinatura e confirme com a senha: os dados da conta são apagados da nuvem na hora, inclusive os pacientes e os links deles, que deixam de abrir. Você também pode pedir a exclusão pelo e-mail contato@exemplo.com.',
    )
    expect(texto).toContain('Depois da exclusão, ficam só:')
    expect(texto).not.toContain('ficam só três coisas, sem nome, e-mail nem cartão')
    expect(texto).toContain(
      'O registro da última assinatura paga (o código dela no Mercado Pago, o plano, o valor e as datas, só com o dia), por 5 anos, sem nome, e-mail nem cartão: a lei fiscal manda guardar, e ele serve para responder a uma contestação de cobrança (LGPD, art. 16, I).',
    )
    // L2 da revisão: "sem ligação direta", porque o dono, com o painel do Mercado Pago, ainda poderia cruzar os dados.
    expect(texto).toContain('O histórico das mudanças de assinatura, sem nome nem e-mail e sem ligação direta com a pessoa, com as datas só com o dia, para as contas do MetaNutri.')
    expect(texto).toContain('O registro dos avisos do Mercado Pago, sem nome nem e-mail, que é apagado em 90 dias.')
    expect(texto).not.toMatch(/sem ligação com a pessoa|não tem dado pessoal/)
    // D-259 (revisão de 19/10/2026): o registro de acesso guarda o e-mail, e a Política diz.
    expect(texto).toContain('Os registros de acesso dos últimos 6 meses.')
    expect(texto).toContain(
      'Os registros de acesso (data, hora, endereço IP e o e-mail usado para entrar) ficam 6 meses, como manda o Marco Civil da Internet (art. 15), e depois são apagados.',
    )
    expect(texto).toContain('As cópias de segurança do banco são apagadas automaticamente em até 90 dias.')
    expect(texto).not.toContain('apagados em até 90 dias, salvo obrigação legal')
  })

  it('CA-828 (spec exclusao-de-conta): os termos dizem que a conta é excluída em Conta e assinatura, na hora, ou pelo e-mail', () => {
    render(<TelaTermos />)
    const encerramento = screen.getByRole('heading', { name: 'Encerramento' }).nextElementSibling
    expect(encerramento).toHaveTextContent(
      'Você pode parar de usar quando quiser. Para excluir a conta, use Conta e assinatura: os dados na nuvem são apagados na hora. Você também pode pedir a exclusão pelo e-mail contato@exemplo.com.',
    )
    expect(encerramento).not.toHaveTextContent('Peça a exclusão da conta pelo')
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
      'O nome, o e-mail, a situação, a assinatura e as datas de criação da conta e do último acesso também servem para o responsável pelo MetaNutri acompanhar as contas e as assinaturas.',
    )
    expect(texto).toContain('são enviados pelo Resend')
    expect(texto).not.toContain('Gmail')
  })

  it('CA-381 e CA-1184: os termos dizem cartão de crédito, renovação automática e cancelamento em Conta e assinatura, sem citar o processador', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Solo e Pro são assinaturas pagas com cartão de crédito')
    expect(texto).toContain('renovam automaticamente até você cancelar')
    expect(texto).toContain('Para cancelar, use Conta e assinatura. A assinatura vale até o fim do período já pago')
    expect(texto).toContain('Se o registro não for encontrado, o titular tem 7 dias para corrigir')
    expect(texto).toContain('A conta só passa de estudante para nutricionista quando o CRN é informado.')
    expect(texto).toContain('casos de estudo e estágio supervisionado')
    expect(texto).not.toMatch(/Conta e plano|presos|sozinhas|Estudante de Nutrição/)
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
