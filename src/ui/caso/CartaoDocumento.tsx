import { UserRound } from 'lucide-react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { CampoAgua } from './CampoAgua.tsx'

interface CartaoDocumentoProps {
  /** O caso como vale (a meta de água depende de idade, sexo e gestação, que podem vir da ficha). */
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Estagiário(a) e Preceptor(a) aparecem (spec ajustes-de-uso, CA-251 e CB-51). */
  readonly camposDeEstagio: boolean
  readonly comReceitas: boolean
  /** O que a anamnese diz da hidratação, ao lado da meta de água (CA-1071). */
  readonly lembreteAgua?: string | null | undefined
}

/**
 * Orientações e documento (spec ficha-unica, D-345 e CA-1071): o que vai para o plano impresso, o link e o Word, e as
 * anotações internas deste plano.
 */
export function CartaoDocumento({ caso, aoAlterar, assinatura, camposDeEstagio, comReceitas, lembreteAgua }: CartaoDocumentoProps) {
  const situacao = assinatura?.situacao ?? null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orientações e documento</CardTitle>
      </CardHeader>

      {/* Spec alimentos-e-gramaturas, D-376: as quantidades para o paciente ficam no topo da etapa Refeições e na janela de imprimir. */}
      <CampoAgua caso={caso} aoAlterar={aoAlterar} lembrete={lembreteAgua} />

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

      {camposDeEstagio ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <CampoTexto rotulo="Estagiário(a)" valor={caso.estagiario} aoMudar={(v) => aoAlterar({ estagiario: v })} />
          <CampoTexto rotulo="Preceptor(a)" valor={caso.preceptor} aoMudar={(v) => aoAlterar({ preceptor: v })} />
          {situacao === 'estudante' && assinatura ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {assinatura.origem === 'conta'
                ? 'Num plano novo, estes nomes vêm da sua conta e de Configurações › Quem assina. Você pode trocá-los aqui.'
                : 'Num plano novo, estes nomes vêm de Configurações › Quem assina. Você pode trocá-los aqui.'}
            </p>
          ) : null}
        </div>
      ) : assinatura ? (
        <div className="flex items-center gap-3 rounded-lg bg-lightprimary px-4 py-3">
          <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-foreground">
            Assina este plano:{' '}
            <strong className="font-semibold text-heading">{assinatura.linhaNutricionista ?? 'nome e CRN não informados'}</strong>
            <span className="block text-xs text-muted-foreground">
              {assinatura.linhaNutricionista === null
                ? assinatura.origem === 'conta'
                  ? 'Confira nome e CRN em Conta e assinatura.'
                  : 'Preencha em Configurações › Quem assina.'
                : assinatura.origem === 'conta'
                  ? 'Vem do seu cadastro.'
                  : 'Vem de Configurações › Quem assina.'}
            </span>
          </p>
        </div>
      ) : null}

      <Recolhivel key={`anotacoes-${caso.id}`} titulo="Anotações deste plano" resumo="Anotações internas. Não aparecem no documento." abertoInicial={caso.observacoes.trim() !== ''}>
        <div className="flex flex-col gap-1.5">
          {/* D-247: o título do recolhido já diz o que é; o rótulo fica só para o leitor de tela. */}
          <Label htmlFor="observacoes" className="sr-only">
            Anotações deste plano
          </Label>
          <Textarea id="observacoes" rows={4} value={caso.observacoes} onChange={(e) => aoAlterar({ observacoes: e.target.value })} />
        </div>
      </Recolhivel>
    </Card>
  )
}
