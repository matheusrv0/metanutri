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
        <li>Missões marcadas pelo paciente e as datas: para mostrar a adesão ao nutricionista.</li>
      </ul>
      <p>
        Os dados de saúde são dados pessoais sensíveis. Eles são tratados para a tutela da saúde por profissional de saúde e com o consentimento do
        paciente, colhido pelo nutricionista (LGPD, art. 11).
      </p>

      <h2>Onde os dados ficam</h2>
      <ul>
        <li>Os planos e as fichas de paciente ficam salvos neste aparelho, no navegador de quem usa.</li>
        <li>
          A conta, a assinatura, a cópia na nuvem e as missões do link do paciente ficam na Supabase, que hospeda o banco de dados do MetaNutri. Os
          servidores podem ficar fora do Brasil.
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
        Enquanto a conta existir. Depois do pedido de exclusão, os dados na nuvem são apagados em até {PRAZO_EXCLUSAO_DIAS} dias, salvo obrigação legal de
        guardar. O que está neste aparelho some quando você usa "Apagar tudo", em Configurações.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Quem usa o MetaNutri e cada paciente podem pedir confirmação, acesso, correção, anonimização, portabilidade e eliminação dos dados, e revogar o
        consentimento (LGPD, art. 18). O paciente pode pedir ao nutricionista ou direto pelo {CONTATO_EMAIL ?? ''}. Respondemos em até 15 dias.
      </p>

      <h2>Segurança</h2>
      <p>
        Acesso por senha, conexão cifrada e separação por conta no banco: um nutricionista não alcança os dados de outro. O link de missões usa um endereço
        secreto e mostra só as missões daquele paciente. Se houver incidente de segurança, o nutricionista é avisado em até {PRAZO_INCIDENTE_HORAS} horas.
      </p>

      <h2>Mudanças</h2>
      <p>Quando esta política mudar de forma relevante, avisamos por e-mail e a data no topo muda.</p>
    </DocumentoLegal>
  )
}
