import { CONTATO_EMAIL, PRAZO_EXCLUSAO_DIAS, PRAZO_INCIDENTE_HORAS, RESPONSAVEL } from '@/domain/legal.ts'
import { DocumentoLegal } from './DocumentoLegal.tsx'

/** Política de privacidade (spec estilo-spora, CA-221). Escrita sem advogado, por decisão do dono (R-14). */
export function TelaPrivacidade() {
  return (
    <DocumentoLegal titulo="Política de privacidade">
      <h2>Quem responde</h2>
      <p>
        O MetaNutri é um programa de planejamento alimentar e acompanhamento de pacientes. Quem responde por ele, inclusive como encarregado dos dados
        pessoais, é {RESPONSAVEL ?? ''}. Contato: {CONTATO_EMAIL ?? ''}.
      </p>

      <h2>Quem é quem</h2>
      <p>
        Nos dados dos pacientes, o nutricionista é o controlador: é ele quem decide registrar, coleta o consentimento e responde pelo atendimento. O
        MetaNutri é o operador: trata esses dados só para o serviço funcionar e segundo as instruções do nutricionista. Nos dados da conta do próprio
        nutricionista, o MetaNutri é o controlador.
      </p>

      <h2>Que dados guardamos e para quê</h2>
      <ul>
        <li>
          Nome, e-mail e senha de quem usa: para criar e manter a conta. A senha é guardada cifrada. O nome, o e-mail, a situação, o plano e as datas de
          criação da conta e do último login também servem para o responsável pelo MetaNutri acompanhar as contas e as assinaturas.
        </li>
        <li>Situação (estudante ou nutricionista) e, para nutricionista, o CRN declarado: para conferir no conselho que a conta é de nutricionista.</li>
        <li>
          Para o plano Estudante: instituição, matrícula, período, previsão de formatura e o comprovante de matrícula. O comprovante fica numa área
          privada, só a própria pessoa e o administrador do MetaNutri abrem, e é apagado 30 dias depois da análise.
        </li>
        <li>Plano assinado, data e versão dos termos aceitos: para cobrar certo e provar o aceite.</li>
        <li>Dados do paciente (nome, sexo, idade, medidas, restrições e condições clínicas): para calcular o plano alimentar.</li>
        <li>
          Na ficha do paciente, também a data da próxima consulta, as respostas da anamnese, os suplementos e os pedidos de exame que o nutricionista
          escreve: para o atendimento, os lembretes e as folhas que ele imprime. São dados de saúde, com o mesmo cuidado dos outros.
        </li>
        <li>Missões marcadas pelo paciente e as datas: para mostrar a adesão ao nutricionista.</li>
        <li>
          O plano alimentar do paciente (refeições, quantidades, substitutos, orientações e receitas), quando o nutricionista liga "Mostrar a dieta no
          link": para o paciente ver a dieta no link dele.
        </li>
      </ul>
      <p>
        Os dados de saúde são dados pessoais sensíveis. Eles são tratados para a tutela da saúde por profissional de saúde e com o consentimento do
        paciente, colhido pelo nutricionista (LGPD, art. 11).
      </p>

      <h2>Onde os dados ficam</h2>
      <ul>
        <li>
          Os planos, as fichas de paciente e as configurações ficam na nuvem, presos à conta. Enquanto a pessoa está dentro, o navegador guarda uma
          cópia de trabalho; ao sair da conta, ela é apagada. Dados de antes que ainda não foram para a conta ficam neste navegador até a próxima
          entrada, quando vão para ela.
        </li>
        <li>
          A conta, a assinatura, os dados da conta e as missões e a dieta do link do paciente ficam na Supabase, que hospeda o banco de dados do
          MetaNutri. Os servidores podem ficar fora do Brasil.
        </li>
        <li>
          O pagamento é processado pelo Mercado Pago. Os dados do cartão (número, validade e código), o nome impresso no cartão e o CPF do
          titular vão direto do seu navegador para ele, criptografados, sem passar pelo MetaNutri. Do cartão, o MetaNutri guarda só a bandeira,
          os 4 últimos números e a data da próxima cobrança, para mostrar em Conta e plano. Para os campos do cartão terem a letra do site, eles
          buscam a fonte no Google Fonts.
        </li>
        <li>Os e-mails de confirmação e de troca de senha são enviados pelo Resend, com o endereço do MetaNutri.</li>
        <li>Nas telas de conta, o Cloudflare Turnstile recebe dados técnicos do navegador, como o endereço IP, para separar pessoas de robôs.</li>
      </ul>
      <p>Não vendemos dados, não usamos para publicidade e não treinamos modelos de inteligência artificial com eles.</p>

      <h2>Por quanto tempo</h2>
      <p>
        Enquanto a conta existir. Para excluir, use Conta e plano e confirme com a senha: os dados da conta saem da nuvem na hora, inclusive os
        pacientes e os links deles, que deixam de abrir. Também dá para pedir pelo {CONTATO_EMAIL ?? ''}.
      </p>
      <p>Depois da exclusão, ficam só:</p>
      <ul>
        <li>
          O registro da última assinatura paga (o código dela no Mercado Pago, o plano, o valor e as datas, só com o dia), por 5 anos, sem nome,
          e-mail nem cartão: a lei fiscal manda guardar, e ele serve para responder a uma contestação de cobrança (LGPD, art. 16, I).
        </li>
        <li>
          O histórico das mudanças de plano, sem nome nem e-mail e sem ligação direta com a pessoa, com as datas só com o dia, para as contas do
          MetaNutri.
        </li>
        <li>O registro dos avisos do Mercado Pago, sem nome nem e-mail, que some em 90 dias.</li>
        <li>Os registros de acesso dos últimos 6 meses.</li>
      </ul>
      <p>
        Os registros de acesso (data, hora, endereço IP e o e-mail usado para entrar) ficam 6 meses, como manda o Marco Civil da Internet (art.
        15), e depois são apagados. As cópias de segurança do banco somem sozinhas em até {PRAZO_EXCLUSAO_DIAS} dias. A cópia de trabalho no
        navegador some quando você sai da conta.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Quem usa o MetaNutri e cada paciente podem pedir confirmação, acesso, correção, anonimização, portabilidade e eliminação dos dados, e revogar o
        consentimento (LGPD, art. 18). O paciente pode pedir ao nutricionista ou direto pelo {CONTATO_EMAIL ?? ''}. Respondemos em até 15 dias.
      </p>

      <h2>Segurança</h2>
      <p>
        Acesso por senha, conexão cifrada e separação por conta no banco: um nutricionista não alcança os dados de outro. O link do paciente usa um
        endereço secreto e mostra só as missões daquele paciente e, quando o nutricionista liga, a dieta dele. Se houver incidente de segurança, o
        nutricionista é avisado em até {PRAZO_INCIDENTE_HORAS} horas.
      </p>

      <h2>Mudanças</h2>
      <p>Quando esta política mudar de forma relevante, avisamos por e-mail e a data no topo muda.</p>
    </DocumentoLegal>
  )
}
