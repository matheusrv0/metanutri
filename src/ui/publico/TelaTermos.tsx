import { CONTATO_EMAIL, RESPONSAVEL } from '@/domain/legal.ts'
import { DocumentoLegal } from './DocumentoLegal.tsx'

/** Termos de uso (spec estilo-spora, CA-222). Escritos sem advogado, por decisão do dono (R-14). */
export function TelaTermos() {
  return (
    <DocumentoLegal titulo="Termos de uso">
      <h2>O que é o MetaNutri</h2>
      <p>
        Um software de planejamento alimentar para nutricionistas: monta o plano alimentar, mostra o que ficou abaixo da meta em vitaminas e minerais,
        sugere alimentos e porções e acompanha o paciente por missões diárias. É oferecido por {RESPONSAVEL ?? ''}.
      </p>

      <h2>Quem prescreve é o nutricionista</h2>
      <p>
        O MetaNutri calcula e sugere; quem prescreve é o nutricionista, que confere cada número antes de entregar ao paciente. A prescrição de dieta é
        privativa de nutricionista com registro no CRN (Lei 8.234/1991). Os cálculos seguem tabelas públicas de composição de alimentos e de referências
        nutricionais.
      </p>

      <h2>Os dados dos pacientes</h2>
      <p>
        O nutricionista é o controlador dos dados dos pacientes e o MetaNutri é o operador (LGPD, art. 39). Cabe ao nutricionista colher o consentimento do
        paciente antes de registrar os dados dele. O MetaNutri não usa esses dados para nenhuma finalidade própria. Detalhes na Política de privacidade.
      </p>

      <h2>Conta</h2>
      <ul>
        <li>Cada conta é de uma pessoa. Não compartilhe a senha.</li>
        <li>Os planos alimentares ficam na nuvem, vinculados à conta. Sem internet, o MetaNutri não deixa editar até a conexão voltar.</li>
        <li>Se outra conta entrar no mesmo aparelho, ela não vê os seus dados.</li>
      </ul>

      <h2>Assinaturas e pagamento</h2>
      <ul>
        <li>Solo e Pro são assinaturas pagas com cartão de crédito, no ciclo mensal ou anual, e renovam automaticamente até você cancelar.</li>
        <li>
          Para cancelar, use Conta e assinatura. A assinatura vale até o fim do período já pago; depois, a conta volta para o Free, sem perder
          nada.
        </li>
        <li>
          A assinatura começa quando o banco autoriza o cartão. Se as cobranças continuarem sendo recusadas, a assinatura é cancelada e a conta
          volta para o Free.
        </li>
      </ul>

      <h2>Plano Estudante</h2>
      <p>
        Para estudante de nutrição, com conta criada com o e-mail da faculdade e comprovante de matrícula aprovado pelo MetaNutri. Vale 12 meses ou até a
        formatura prevista, o que vier antes, e renova com um comprovante novo. É de uso não comercial: serve para casos de estudo e estágio
        supervisionado, não para atender por conta própria. A tela do paciente avisa que não é atendimento profissional.
      </p>

      <h2>Nutricionista e CRN</h2>
      <p>
        Quem cria a conta como nutricionista declara que o CRN informado é seu e está ativo. O MetaNutri confere o registro na Consulta Nacional do
        Conselho Federal de Nutrição. Se o registro não for encontrado, o titular tem 7 dias para corrigir; depois disso, exportar documentos fica
        bloqueado até a correção. A conta só passa de estudante para nutricionista quando o CRN é informado.
      </p>

      <h2>Encerramento</h2>
      <p>
        Você pode parar de usar quando quiser. Para excluir a conta, use Conta e assinatura: os dados na nuvem são apagados na hora. Você também pode
        pedir a exclusão pelo e-mail {CONTATO_EMAIL ?? ''}.
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
