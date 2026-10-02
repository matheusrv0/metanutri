import { CONTATO_EMAIL, PRAZO_EXCLUSAO_DIAS, RESPONSAVEL } from '@/domain/legal.ts'
import { DocumentoLegal } from './DocumentoLegal.tsx'

/** Termos de uso (spec estilo-spora, CA-222). Escritos sem advogado, por decisão do dono (R-14). */
export function TelaTermos() {
  return (
    <DocumentoLegal titulo="Termos de uso">
      <h2>O que é o MetaNutri</h2>
      <p>
        Um programa de planejamento alimentar para nutricionistas: monta o plano, mostra o que falta de vitaminas e minerais, sugere alimentos e acompanha o
        paciente por missões diárias. É oferecido por {RESPONSAVEL ?? ''}.
      </p>

      <h2>Quem prescreve é o nutricionista</h2>
      <p>
        O MetaNutri calcula e sugere; quem prescreve é o nutricionista, que confere cada número antes de entregar ao paciente. A prescrição de dieta é
        privativa de nutricionista com registro no CRN (Lei 8.234/1991). Os cálculos seguem tabelas públicas de composição de alimentos e de referências
        nutricionais, e ainda não foram conferidos por nutricionista.
      </p>

      <h2>Os dados dos pacientes</h2>
      <p>
        O nutricionista é o controlador dos dados dos pacientes e o MetaNutri é o operador (LGPD, art. 39). Cabe ao nutricionista colher o consentimento do
        paciente antes de registrar os dados dele. O MetaNutri não usa esses dados para nenhuma finalidade própria. Detalhes na Política de privacidade.
      </p>

      <h2>Conta</h2>
      <ul>
        <li>Cada conta é de uma pessoa. Não compartilhe a senha.</li>
        <li>Os planos ficam salvos no aparelho. Guarde o backup, em Configurações, para não depender de um só aparelho.</li>
        <li>Se outra conta entrar no mesmo aparelho, ela não vê os seus dados: precisa sair ou apagar os dados do aparelho.</li>
      </ul>

      <h2>Planos e pagamento</h2>
      <ul>
        <li>Solo e Pro são assinaturas pagas com cartão de crédito, no ciclo mensal ou anual, e renovam sozinhas até você cancelar.</li>
        <li>Para cancelar, use Conta e plano. O plano pago vale até o fim do período já pago; depois a conta volta para o Free, sem perder nada.</li>
        <li>Quem entrou no preço de fundador mantém esse preço enquanto a assinatura estiver ativa.</li>
        <li>
          O plano pago começa quando o banco autoriza o cartão. Se as cobranças forem recusadas também nas novas tentativas, a assinatura é cancelada
          e a conta volta para o Free.
        </li>
      </ul>

      <h2>Plano Estudante</h2>
      <p>
        Para estudante de Nutrição, com conta criada com o e-mail da faculdade e comprovante de matrícula aprovado pelo MetaNutri. Vale 12 meses ou até a
        formatura prevista, o que vier antes, e renova com um comprovante novo. É de uso não comercial: serve para o estágio, sob supervisão, não para
        atender por conta própria. A tela do paciente avisa que não é atendimento profissional.
      </p>

      <h2>Nutricionista e CRN</h2>
      <p>
        Quem cria a conta como nutricionista declara que o CRN informado é seu e está ativo. O MetaNutri confere o registro na Consulta Nacional do
        Conselho Federal de Nutrição. Se o registro não for encontrado, a conta tem 7 dias para corrigir; depois disso, exportar documentos fica bloqueado
        até a correção. A situação da conta só muda de estudante para nutricionista, informando o CRN.
      </p>

      <h2>Encerramento</h2>
      <p>
        Você pode parar de usar quando quiser. Peça a exclusão da conta pelo {CONTATO_EMAIL ?? ''}: os dados na nuvem são apagados em até {PRAZO_EXCLUSAO_DIAS} dias.
        Contas usadas para fraude ou para atender sem registro no CRN, fora do plano Estudante, podem ser encerradas.
      </p>

      <h2>Limites</h2>
      <p>
        O MetaNutri é oferecido como está, sem garantia de funcionar sem interrupção. Não respondemos por decisão clínica tomada com base nele sem a
        conferência do nutricionista. Estes termos seguem a lei brasileira.
      </p>

      <h2>Contato</h2>
      <p>{CONTATO_EMAIL ?? ''}</p>
    </DocumentoLegal>
  )
}
