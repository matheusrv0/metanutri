import { MessageCircle } from 'lucide-react'
import { useId, useState } from 'react'
import type { Paciente } from '@/domain/pacientes.ts'
import { formatarTelefone, linkDoWhatsApp, normalizarTelefone } from '@/domain/whatsapp.ts'
import { Button, buttonVariants } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

export type PacienteDoWhatsApp = Pick<Paciente, 'id' | 'nome' | 'telefone'>

interface DialogoWhatsAppProps {
  /** A ficha de quem recebe; nulo quando o plano ou o link não tem paciente vinculado (CA-506). */
  readonly paciente: PacienteDoWhatsApp | null
  /** O texto pronto; o nutricionista edita antes de abrir. */
  readonly texto: string
  readonly aoFechar: () => void
  /** Abre a ficha com o cursor no Telefone (CA-505). */
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
}

/** O que o diálogo diz em cada caso do D-142. */
function explicacao(paciente: PacienteDoWhatsApp | null, numero: string | null): string {
  if (paciente === null) return 'Este plano não tem paciente vinculado. Vincule um paciente em Paciente e medidas para usar o telefone da ficha.'
  const nome = paciente.nome.trim()
  if (numero !== null) return `Para ${nome ? `${nome}, ` : ''}${formatarTelefone(numero)}. Quem envia é você.`
  const deQuem = nome ? `de ${nome}` : 'deste paciente'
  return paciente.telefone.trim() === '' ? `A ficha ${deQuem} não tem telefone.` : `O telefone da ficha ${deQuem} não é um número do Brasil com DDD.`
}

/**
 * Antes de abrir o WhatsApp: para quem vai e o texto, que o nutricionista edita (spec whatsapp-e-retorno,
 * D-140 e D-142). O MetaNutri não envia nada: o botão é um link para o `wa.me`, numa aba nova.
 */
export function DialogoWhatsApp({ paciente, texto, aoFechar, aoCadastrarTelefone }: DialogoWhatsAppProps) {
  const idMensagem = useId()
  const [mensagem, setMensagem] = useState(texto)
  const numero = paciente ? normalizarTelefone(paciente.telefone) : null

  return (
    <Dialog open onOpenChange={(aberto) => (aberto ? undefined : aoFechar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar pelo WhatsApp</DialogTitle>
          <DialogDescription>{explicacao(paciente, numero)}</DialogDescription>
        </DialogHeader>

        {numero ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idMensagem}>Mensagem</Label>
            <Textarea id={idMensagem} rows={6} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar}>
            {numero ? 'Cancelar' : 'Entendi'}
          </Button>
          {numero ? (
            // Um link, não um botão: abrir o WhatsApp é navegação, numa aba nova, sem passar o endereço daqui.
            <a className={buttonVariants()} href={linkDoWhatsApp(numero, mensagem)} target="_blank" rel="noopener noreferrer" onClick={aoFechar}>
              <MessageCircle aria-hidden="true" />
              Abrir no WhatsApp <span className="sr-only">(abre em nova aba)</span>
            </a>
          ) : paciente && aoCadastrarTelefone ? (
            <Button
              onClick={() => {
                aoFechar()
                aoCadastrarTelefone(paciente.id)
              }}
            >
              Cadastre o telefone na ficha
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
