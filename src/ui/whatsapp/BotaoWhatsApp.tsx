import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { DialogoWhatsApp, type PacienteDoWhatsApp } from './DialogoWhatsApp.tsx'

interface BotaoWhatsAppProps {
  /** A ficha de quem recebe; nulo quando não há paciente vinculado. */
  readonly paciente: PacienteDoWhatsApp | null
  /** O texto pronto daquele lugar (link, contato, lembrete ou parabéns; D-149). */
  readonly texto: string
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
  /** Só o ícone, para a linha apertada do Painel; este é o nome que o leitor de tela lê. */
  readonly rotuloCompacto?: string | undefined
}

/**
 * O botão "WhatsApp" (spec whatsapp-e-retorno). O diálogo só existe enquanto está aberto: cada vez
 * que abre, o texto começa do texto pronto.
 */
export function BotaoWhatsApp({ paciente, texto, aoCadastrarTelefone, rotuloCompacto }: BotaoWhatsAppProps) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      {rotuloCompacto ? (
        // O título mostra no passar do mouse o que o ícone faz; o leitor de tela lê o texto escondido.
        <Button size="iconsm" variant="ghost" title={rotuloCompacto} onClick={() => setAberto(true)}>
          <MessageCircle aria-hidden="true" />
          <span className="sr-only">{rotuloCompacto}</span>
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setAberto(true)}>
          <MessageCircle aria-hidden="true" />
          WhatsApp
        </Button>
      )}
      {aberto ? <DialogoWhatsApp paciente={paciente} texto={texto} aoFechar={() => setAberto(false)} aoCadastrarTelefone={aoCadastrarTelefone} /> : null}
    </>
  )
}
