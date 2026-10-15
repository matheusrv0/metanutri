import { Trash } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { CHAVE_MODELOS_SUPLEMENTO, criarRepositorioModelosSuplemento, descreverSuplemento, type ModeloSuplemento } from '@/domain/suplementos.ts'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useOutraAbaGravou } from '../estado/usarOutraAba.ts'

interface DialogoModelosSuplementoProps {
  readonly aoUsar: (modelo: ModeloSuplemento) => void
  readonly aoFechar: () => void
}

/** Os modelos de suplemento da conta (CA-574): usar acrescenta uma cópia ao paciente; apagar tira da conta. */
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
          <ul className="flex flex-col gap-2">
            {modelos.map((m) => (
              <li key={m.id}>
                <LinhaLista
                  titulo={m.nome}
                  detalhe={descreverSuplemento(m) || undefined}
                  fim={
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
                  }
                />
              </li>
            ))}
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
