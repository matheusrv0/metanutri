import { ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { calcularSubstituto, type CriterioEquivalencia } from '@/domain/substitutos.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { ItemPlano, OpcaoId } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { GrupoOpcoes } from '../caso/GrupoOpcoes.tsx'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'
import { EntradaRapida } from './EntradaRapida.tsx'

interface DialogoSubstitutoProps {
  /** Item do Principal que será substituído; `null` mantém a janela fechada. */
  readonly item: ItemPlano | null
  readonly aoAdicionar: (opcao: OpcaoId, alimentoId: number, gramas: number) => void
  readonly aoFechar: () => void
}

const DIFERENCAS = [
  { chave: 'energia_kcal', rotulo: 'Energia', unidade: 'kcal', casas: 0 },
  { chave: 'proteina_g', rotulo: 'Proteína', unidade: 'g', casas: 1 },
  { chave: 'carboidrato_g', rotulo: 'Carboidrato', unidade: 'g', casas: 1 },
  { chave: 'lipideos_g', rotulo: 'Gordura', unidade: 'g', casas: 1 },
] as const

/** CA-41 e CA-42: porção equivalente de um substituto, com medida caseira e diferenças. */
export function DialogoSubstituto({ item, aoAdicionar, aoFechar }: DialogoSubstitutoProps) {
  const [criterio, setCriterio] = useState<CriterioEquivalencia>('kcal')
  const [substitutoId, setSubstitutoId] = useState<number | null>(null)

  const original = item ? buscarAlimento(item.alimentoId) : undefined
  const substituto = substitutoId === null ? undefined : buscarAlimento(substitutoId)
  const resultado = item && substitutoId !== null ? calcularSubstituto(item, substitutoId, criterio, buscarAlimento) : null

  const fechar = () => {
    setSubstitutoId(null)
    aoFechar()
  }

  return (
    <Dialog open={item !== null} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Substituto equivalente</DialogTitle>
          <DialogDescription>
            {original ? `Porção equivalente a ${formatarNumero(item?.gramas ?? 0, 0)} g de ${original.descricao}.` : 'Escolha um alimento.'}
          </DialogDescription>
        </DialogHeader>

        <GrupoOpcoes<CriterioEquivalencia>
          rotulo="Equivalente por"
          opcoes={[
            { valor: 'kcal', rotulo: 'Energia (kcal)' },
            { valor: 'proteina', rotulo: 'Proteína' },
            { valor: 'carboidrato', rotulo: 'Carboidrato' },
          ]}
          valor={criterio}
          aoEscolher={setCriterio}
        />

        <EntradaRapida rotulo="Escolher alimento substituto" aoAdicionar={(id) => setSubstitutoId(id)} />

        {resultado && substituto ? (
          resultado.motivoSemCalculo ? (
            <Alert variant="warning">
              <ArrowLeftRight aria-hidden="true" />
              <p>{resultado.motivoSemCalculo}</p>
            </Alert>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4">
              <p className="text-sm font-semibold text-heading">{substituto.descricao}</p>
              <p className="numeros text-lg font-bold text-primary">
                {`${formatarNumero(resultado.gramas ?? 0, 0)} g${resultado.medida ? ` · ${resultado.medida.texto}` : ''}`}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {DIFERENCAS.map((d) => {
                  const valor = resultado.diferencas[d.chave]
                  return (
                    <div key={d.chave} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{d.rotulo}</dt>
                      <dd className="numeros font-medium text-heading">{`${valor > 0 ? '+' : ''}${formatarNumero(valor, d.casas)} ${d.unidade}`}</dd>
                    </div>
                  )
                })}
              </dl>
              <p className="text-xs text-muted-foreground">Diferença em relação ao alimento original, na porção calculada.</p>
            </div>
          )
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={fechar}>
            Cancelar
          </Button>
          {(['substituto1', 'substituto2'] as const).map((opcao) => (
            <Button
              key={opcao}
              variant={opcao === 'substituto1' ? 'default' : 'lightprimary'}
              disabled={!resultado || resultado.gramas === null}
              onClick={() => {
                if (substitutoId !== null && resultado?.gramas !== null && resultado?.gramas !== undefined) {
                  aoAdicionar(opcao, substitutoId, resultado.gramas)
                  fechar()
                }
              }}
            >
              {opcao === 'substituto1' ? 'Pôr em Substituto 1' : 'Pôr em Substituto 2'}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
