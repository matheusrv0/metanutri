import { estadoDoAcompanhamento } from '@/domain/acompanhamento.ts'
import { maiuscula, quando, ultimoLinkPorPaciente, type ItemAgenda } from '@/domain/retorno.ts'
import { textoDeParabens, textoDoLembrete } from '@/domain/whatsapp.ts'
import { useAcompanhamentosOpcional, useLerDaNuvemAoAbrir } from '@/ui/estado/contextoAcompanhamentos.ts'
import { useCasosOpcional } from '@/ui/estado/contextoCasos.ts'
import { SeloEstado } from '@/ui/missoes/SeloEstado.tsx'
import { BotaoWhatsApp } from '@/ui/whatsapp/BotaoWhatsApp.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'

interface HojeEEstaSemanaProps {
  /** As consultas e os aniversários de hoje até 6 dias, já em ordem (nunca vazio: sem nada, o bloco não existe). */
  readonly itens: readonly ItemAgenda[]
  /** Hoje em Brasília (D-144). */
  readonly hoje: string
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
}

/**
 * "Quem eu atendo esta semana?" (spec whatsapp-e-retorno, D-146): nome, quando, o selo da Adesão
 * na consulta e o WhatsApp do lembrete ou dos parabéns em cada linha.
 */
export function HojeEEstaSemana({ itens, hoje, aoCadastrarTelefone }: HojeEEstaSemanaProps) {
  const links = useAcompanhamentosOpcional()?.acompanhamentos ?? []
  const planos = useCasosOpcional()?.casos ?? []
  // D-147: o selo não fica velho: as marcações do paciente vêm da nuvem, como na Adesão.
  useLerDaNuvemAoAbrir()
  const linkDe = ultimoLinkPorPaciente(links, planos)

  return (
    <Card className="gap-4">
      <CardTitle>Hoje e esta semana</CardTitle>
      <ul className="flex flex-col gap-1.5" aria-label="Consultas e aniversários">
        {itens.map((item) => {
          const nome = item.paciente.nome.trim()
          const link = item.tipo === 'consulta' ? linkDe.get(item.paciente.id) : undefined
          return (
            <li key={`${item.tipo}-${item.paciente.id}`}>
              <LinhaLista
                titulo={nome || 'Paciente sem nome'}
                detalhe={item.tipo === 'aniversario' ? `Aniversário ${quando(item, hoje)}` : maiuscula(quando(item, hoje))}
                fim={
                  <span className="flex shrink-0 items-center gap-1">
                    {link ? <SeloEstado estado={estadoDoAcompanhamento(link, hoje)} className="whitespace-nowrap" /> : null}
                    <BotaoWhatsApp
                      paciente={item.paciente}
                      texto={item.tipo === 'aniversario' ? textoDeParabens(nome) : textoDoLembrete(nome, item)}
                      aoCadastrarTelefone={aoCadastrarTelefone}
                      rotuloCompacto={
                        item.tipo === 'aniversario' ? `Mandar parabéns para ${nome || 'o paciente'} pelo WhatsApp` : `Lembrar ${nome || 'o paciente'} da consulta pelo WhatsApp`
                      }
                    />
                  </span>
                }
              />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
