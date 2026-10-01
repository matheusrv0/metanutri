import { Ruler } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { mostraCamposDeEstagio, mostraReceitas, type AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { temDadoDeComposicao } from '@/domain/camposVisiveis.ts'
import { validarCaso } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { CamposComposicao } from './CamposComposicao.tsx'
import { CartaoIdentificacao } from './CartaoIdentificacao.tsx'
import { CartaoPessoa } from './CartaoPessoa.tsx'
import { PainelAntropometria } from './PainelAntropometria.tsx'

interface TelaCasoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** Pacientes cadastrados, para vincular este plano a uma ficha. */
  readonly pacientes?: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: (pacienteId: string | null) => void
  /** Painéis extras da coluna da direita (ex.: Resumo do dia). */
  readonly lateral?: ReactNode
  /** Quem assina e a situação (US-A2, US-A4); sem ela, o plano fica como era (CB-69). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
}

/** Etapa 1: dados do caso e avaliação antropométrica, só com o que vale para o caso (US-B4). */
export function TelaCaso({ caso, aoAlterar, lateral, assinatura, pacientes = [], aoVincularPaciente }: TelaCasoProps) {
  const validacao = useMemo(() => validarCaso(caso), [caso])
  const antropometria = useMemo(() => avaliarAntropometria(caso), [caso])
  const situacao = assinatura?.situacao ?? null

  // Quais campos aparecem se decide quando o plano abre (ou a situação muda), não a cada tecla:
  // senão apagar todo o texto de Receitas, por exemplo, faria o campo sumir no meio da edição.
  const [visibilidade, setVisibilidade] = useState(() => ({ id: caso.id, situacao, estagio: mostraCamposDeEstagio(situacao, caso), receitas: mostraReceitas(situacao, caso) }))
  let atual = visibilidade
  if (visibilidade.id !== caso.id || visibilidade.situacao !== situacao) {
    atual = { id: caso.id, situacao, estagio: mostraCamposDeEstagio(situacao, caso), receitas: mostraReceitas(situacao, caso) }
    setVisibilidade(atual)
  }
  const comReceitas = atual.receitas
  const rapido = caso.modo === 'rapido'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <CartaoIdentificacao
          caso={caso}
          aoAlterar={aoAlterar}
          pacientes={pacientes}
          aoVincularPaciente={aoVincularPaciente}
          assinatura={assinatura}
          camposDeEstagio={atual.estagio}
        />

        <CartaoPessoa caso={caso} aoAlterar={aoAlterar} erros={validacao.erros} />

        <Card>
          <CardHeader>
            <CardTitle>{comReceitas ? 'Orientações e receitas' : 'Orientações'}</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orientacoes">Orientações nutricionais</Label>
            <Textarea id="orientacoes" rows={4} value={caso.orientacoes} onChange={(e) => aoAlterar({ orientacoes: e.target.value })} />
          </div>
          {comReceitas ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="receitas">Receitas</Label>
              <Textarea id="receitas" rows={4} value={caso.receitas} onChange={(e) => aoAlterar({ receitas: e.target.value })} />
            </div>
          ) : null}

          {rapido ? null : (
            <Recolhivel key={`composicao-${caso.id}`} titulo="Composição corporal" resumo="Dobras ou bioimpedância. Opcional." abertoInicial={temDadoDeComposicao(caso)}>
              <CamposComposicao caso={caso} aoAlterar={aoAlterar} />
            </Recolhivel>
          )}
          <Recolhivel key={`observacoes-${caso.id}`} titulo="Observações" resumo="Anotações suas, não saem no documento." abertoInicial={caso.observacoes.trim() !== ''}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" rows={4} value={caso.observacoes} onChange={(e) => aoAlterar({ observacoes: e.target.value })} />
            </div>
          </Recolhivel>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        {rapido ? (
          <Card className="gap-3">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>Sem avaliação neste plano</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Esta é uma prescrição rápida: sem avaliação antropométrica, e o documento exportado diz isso.</p>
            <Button variant="lightprimary" className="self-start" onClick={() => aoAlterar({ modo: 'completo' })}>
              Virar atendimento completo
            </Button>
          </Card>
        ) : (
          <PainelAntropometria resultado={antropometria} />
        )}
        {lateral}
      </div>
    </div>
  )
}
