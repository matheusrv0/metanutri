import { Trash } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { CHAVE_MODELOS_SUPLEMENTO, criarRepositorioModelosSuplemento, descreverSuplemento, type ModeloSuplemento } from '@/domain/suplementos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useOutraAbaGravou } from '../estado/usarOutraAba.ts'

interface DialogoModelosSuplementoProps {
  readonly aoUsar: (modelo: ModeloSuplemento) => void
  readonly aoFechar: () => void
}

/**
 * Os modelos de suplemento da conta (CA-574): cada um com o nome, a dose, o horário, por quanto tempo e a
 * observação, inteiros (o texto quebra a linha). Usar acrescenta uma cópia ao paciente; apagar tira da conta.
 */
export function DialogoModelosSuplemento({ aoUsar, aoFechar }: DialogoModelosSuplementoProps) {
  const armazenamento = useArmazenamento()
  const repositorio = useMemo(() => criarRepositorioModelosSuplemento(armazenamento), [armazenamento])
  const [versao, setVersao] = useState(0)
  const modelos = useMemo(() => {
    void versao
    return repositorio.listar()
  }, [repositorio, versao])
  // CB-124 (spec dados-na-nuvem): outra aba da conta gravou modelos; a lista se refaz.
  const reler = useCallback(() => setVersao((v) => v + 1), [])
  useOutraAbaGravou(CHAVE_MODELOS_SUPLEMENTO, reler)

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modelos de suplemento</DialogTitle>
          <DialogDescription>Usar acrescenta uma cópia ao paciente.</DialogDescription>
        </DialogHeader>

        {modelos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum modelo ainda. Use “Salvar como modelo” num suplemento da lista.</p>
        ) : (
          // min-w-0: dentro da grade da janela, a lista não empurra os botões para fora da tela.
          <ul className="flex min-w-0 flex-col gap-2">
            {modelos.map((m) => {
              const detalhe = descreverSuplemento(m)
              const observacao = m.observacao.trim()
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5">
                  <div className="min-w-0 flex-1 basis-48 break-words">
                    <p className="text-sm font-semibold text-heading">{m.nome}</p>
                    {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
                    {observacao ? <p className="whitespace-pre-wrap text-xs text-muted-foreground">{observacao}</p> : null}
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="lightprimary" aria-label={`Usar ${m.nome}`} onClick={() => aoUsar(m)}>
                      Usar
                    </Button>
                    <Button
                      size="iconsm"
                      variant="ghost"
                      aria-label={`Apagar o modelo ${m.nome}`}
                      onClick={() => {
                        repositorio.excluir(m.id)
                        reler()
                      }}
                    >
                      <Trash aria-hidden="true" />
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
