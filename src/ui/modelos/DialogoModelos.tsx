import { BookmarkPlus, LayoutTemplate, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { clonarPlano, criarRepositorioModelos, type ModeloPlano } from '@/domain/modelos.ts'
import type { Plano } from '@/domain/tipos.ts'
import { CampoTexto } from '../caso/CampoTexto.tsx'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'

interface DialogoModelosProps {
  readonly aberto: boolean
  /** Plano atual, para salvar como modelo. */
  readonly plano: Plano
  readonly aoUsar: (plano: Plano) => void
  readonly aoFechar: () => void
}

function armazenamento() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const contarItens = (m: ModeloPlano) =>
  m.plano.refeicoes.reduce((total, r) => total + r.opcoes.principal.length + r.opcoes.substituto1.length + r.opcoes.substituto2.length, 0)

/** Modelos de plano: salvar o de hoje e começar o próximo a partir dele. */
export function DialogoModelos({ aberto, plano, aoUsar, aoFechar }: DialogoModelosProps) {
  const repositorio = useMemo(() => criarRepositorioModelos(armazenamento()), [])
  const [versao, setVersao] = useState(0)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [mensagem, setMensagem] = useState<string | null>(null)

  const modelos = useMemo(() => {
    void versao
    return repositorio.listar()
  }, [repositorio, versao])

  const salvar = () => {
    if (nome.trim() === '') return
    repositorio.salvar({ nome: nome.trim(), descricao: descricao.trim(), plano })
    setNome('')
    setDescricao('')
    setVersao((v) => v + 1)
    setMensagem('Modelo salvo. Ele aparece aqui na próxima vez.')
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modelos de plano</DialogTitle>
          <DialogDescription>Guarde um plano que deu certo e use como ponto de partida. As refeições entram no lugar das atuais.</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3 border border-fio bg-muted p-4">
          <h3 className="rotulo">Salvar o plano aberto</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoTexto rotulo="Nome do modelo" valor={nome} aoMudar={setNome} placeholder="Emagrecimento 1600 kcal" />
            <CampoTexto rotulo="Para que serve" valor={descricao} aoMudar={setDescricao} placeholder="Adulto, sem restrição" />
          </div>
          <Button className="self-start" onClick={salvar} disabled={nome.trim() === ''}>
            <BookmarkPlus aria-hidden="true" />
            Salvar como modelo
          </Button>
        </section>

        {mensagem ? (
          <Alert variant="success">
            <LayoutTemplate aria-hidden="true" />
            <p>{mensagem}</p>
          </Alert>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="rotulo">Meus modelos</h3>
          {modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>
          ) : (
            <ul className="flex flex-col" aria-label="Modelos salvos">
              {modelos.map((m) => (
                <li key={m.id} className="flex items-center gap-3 border-b border-fio py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-heading">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[m.descricao || null, `${m.plano.refeicoes.length} refeições`, `${contarItens(m)} alimentos`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="lightprimary"
                    onClick={() => {
                      aoUsar(clonarPlano(m.plano, () => globalThis.crypto.randomUUID()))
                      aoFechar()
                    }}
                  >
                    Usar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Apagar modelo ${m.nome}`}
                    onClick={() => {
                      repositorio.excluir(m.id)
                      setVersao((v) => v + 1)
                    }}
                  >
                    <Trash aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
