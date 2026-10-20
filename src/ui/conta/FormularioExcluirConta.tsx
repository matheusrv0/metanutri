import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO } from '@/domain/conta.ts'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { DialogFooter } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaExclusao } from '../estado/usarExclusaoDaConta.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import { useVerificacao, type ExtraDoPedido } from '../publico/conta/usarVerificacao.ts'
import { VerificacaoContraRobos } from '../publico/conta/VerificacaoContraRobos.tsx'

interface FormularioExcluirContaProps {
  /** CA-803: assinatura do Mercado Pago que ainda cobra; a exclusão a cancela. */
  readonly pagaNaOperadora: boolean
  /** CA-803 (L5 da revisão): um plano pago ainda vale (ativo ou cancelado no prazo); o tempo que falta se perde. */
  readonly periodoPago: boolean
  readonly excluir: (senha: string, extra: ExtraDoPedido) => Promise<ResultadoDaExclusao>
  readonly aoBaixarBackup: () => void
  readonly aoFechar: () => void
  /** Um pedido está em andamento: a janela não fecha e nenhum botão aceita clique. */
  readonly enviando: boolean
  readonly aoMudarEnviando: (enviando: boolean) => void
}

interface Erro {
  readonly texto: string
  /** A frase é sobre a senha: o campo fica marcado. */
  readonly naSenha: boolean
}

/**
 * O que há dentro da janela de excluir a conta (spec exclusao-de-conta, D-250 e D-251). Nasce com a janela aberta: a
 * verificação contra robôs desenha o widget na caixa que este componente põe na página (useVerificacao).
 */
export function FormularioExcluirConta({ pagaNaOperadora, periodoPago, excluir, aoBaixarBackup, aoFechar, enviando, aoMudarEnviando }: FormularioExcluirContaProps) {
  const id = useId()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<Erro | null>(null)
  const [backupSalvo, setBackupSalvo] = useState(false)
  // CA-807: o segundo clique (ou o Enter) não manda outro pedido; lido só nos manipuladores.
  const enviandoRef = useRef(false)
  // D-251: a mesma verificação de Entrar, porque a senha é conferida pela mesma entrada.
  const verificacao = useVerificacao('login')

  const confirmar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current || senha === '') return
    // CA-811: ainda conferindo, nada sai (CA-458); sem o script, segue sem a verificação (D-119).
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setErro({ texto: MENSAGEM_ERRO[pedido.erro], naSenha: false })
      return
    }
    enviandoRef.current = true
    aoMudarEnviando(true)
    setErro(null)
    const resultado = await excluir(senha, pedido.extra)
    // Deu certo: a página vai para o início e recarrega (CA-808). Até lá, nada mais aceita clique.
    if (resultado.ok) return
    enviandoRef.current = false
    aoMudarEnviando(false)
    setErro({ texto: resultado.erro, naSenha: resultado.naSenha })
  }

  return (
    <form onSubmit={(evento) => void confirmar(evento)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 text-sm">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-foreground marker:text-muted-foreground">
          <li>Pacientes, planos e o resto dos dados da conta.</li>
          <li>Os links dos pacientes, que deixam de abrir.</li>
          <li>Situação, CRN e comprovantes de matrícula.</li>
          {pagaNaOperadora ? <li>A assinatura é cancelada, sem novas cobranças.</li> : null}
          {periodoPago ? <li>O tempo que falta do período pago se perde.</li> : null}
        </ul>
        <p className="text-muted-foreground">Em outro aparelho com a conta aberta, saia antes.</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            aoBaixarBackup()
            setBackupSalvo(true)
          }}
        >
          Baixar backup
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {backupSalvo ? 'Backup salvo.' : ''}
        </p>
      </div>

      {/* Sem o olho de mostrar a senha: Conta e plano só usa os ícones da marca (CA-383). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-senha`}>Sua senha</Label>
        <Input
          id={`${id}-senha`}
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          aria-invalid={erro?.naSenha === true}
        />
      </div>

      {erro ? <AvisoPagamento tipo="erro">{erro.texto}</AvisoPagamento> : null}

      <VerificacaoContraRobos verificacao={verificacao}>
        <DialogFooter>
          <Button type="button" variant="outline" autoFocus onClick={aoFechar} disabled={enviando}>
            Manter conta
          </Button>
          <Button type="submit" variant="destructive" disabled={enviando || senha === ''} aria-busy={enviando || undefined}>
            {enviando ? <PontosDaMarca pulsando /> : null}
            Excluir conta
          </Button>
        </DialogFooter>
      </VerificacaoContraRobos>
    </form>
  )
}
