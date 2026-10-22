import { numeroDaUrina, opcoesDaPergunta, respostaDaUrina, tipoDaPergunta, type PerguntaDaFicha } from '@/domain/anamnese.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { EscalaDaUrina } from './EscalaDaUrina.tsx'
import { EscolhaUnica } from './EscolhaUnica.tsx'

interface PerguntaDaAnamneseProps {
  /** O id do campo, único na tela. */
  readonly campo: string
  readonly pergunta: PerguntaDaFicha
  readonly dica: string | undefined
  /** Texto-guia do campo vazio (o recordatório). */
  readonly placeholder?: string | undefined
  readonly aoResponder: (resposta: string) => void
}

/**
 * Uma pergunta da anamnese, pelo tipo do id (spec conduta-da-nutricionista, D-299; spec ficha-unica, CA-1063): texto,
 * número, escolha única ou a escala da urina. Resposta que não é uma das escolhas (escrita como texto numa versão
 * antiga) fica num campo de texto, para nada sumir (CB-297).
 */
export function PerguntaDaAnamnese({ campo, pergunta, dica, placeholder, aoResponder }: PerguntaDaAnamneseProps) {
  const tipo = tipoDaPergunta(pergunta.id)
  const temResposta = pergunta.resposta.trim() !== ''
  const urina = tipo === 'cor-da-urina' ? numeroDaUrina(pergunta.resposta) : null
  const opcoes = opcoesDaPergunta(pergunta.id)
  const escolha = tipo === 'escolha' && opcoes.includes(pergunta.resposta) ? pergunta.resposta : null
  const deEscolha = (tipo === 'cor-da-urina' && (urina !== null || !temResposta)) || (tipo === 'escolha' && (escolha !== null || !temResposta))
  const idDica = dica ? `${campo}-dica` : undefined

  return (
    <div data-pergunta="" className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {deEscolha ? <Label id={`${campo}-rotulo`}>{pergunta.texto}</Label> : <Label htmlFor={campo}>{pergunta.texto}</Label>}
        {pergunta.foraDoRoteiro ? <Badge variant="muted">Fora do roteiro</Badge> : null}
      </div>
      {dica ? (
        <p id={idDica} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
      {deEscolha && tipo === 'cor-da-urina' ? (
        <EscalaDaUrina rotuloId={`${campo}-rotulo`} dicaId={idDica} valor={urina} aoEscolher={(numero) => aoResponder(numero === null ? '' : respostaDaUrina(numero))} />
      ) : deEscolha ? (
        <EscolhaUnica rotuloId={`${campo}-rotulo`} opcoes={opcoes} valor={escolha} aoEscolher={(opcao) => aoResponder(opcao ?? '')} />
      ) : tipo === 'numero' ? (
        <Input
          id={campo}
          inputMode="numeric"
          aria-describedby={idDica}
          className="h-11 max-w-40 sm:h-10"
          value={pergunta.resposta}
          onChange={(e) => aoResponder(e.target.value)}
        />
      ) : (
        <Textarea
          id={campo}
          aria-describedby={idDica}
          rows={2}
          className="min-h-16"
          value={pergunta.resposta}
          placeholder={placeholder}
          onChange={(e) => aoResponder(e.target.value)}
        />
      )}
    </div>
  )
}
