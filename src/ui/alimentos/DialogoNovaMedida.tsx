import { useState } from 'react'
import type { MedidaCaseira } from '@/domain/busca.ts'
import { PESO_MAXIMO_DA_MEDIDA } from '@/domain/medidasProprias.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoNovaMedidaProps {
  /** O alimento que ganha a medida; `null` mantém a janela fechada. */
  readonly alimento: { readonly descricao: string } | null
  /** "g" ou "ml" ao lado do peso. */
  readonly unidade: string
  /** O nome já escrito: a medida que faltou na entrada rápida (spec alimentos-e-gramaturas, correção A, D-432). */
  readonly nomeInicial?: string
  /**
   * Grava a medida; devolve o motivo quando não deu (CB-372). Quem chama decide onde ela mora: medida própria da conta
   * (alimento da base) ou do próprio alimento (D-387).
   */
  readonly aoSalvar: (medida: MedidaCaseira) => string | null
  readonly aoFechar: () => void
}

/** "Concha da minha casa = 120 g" (spec alimentos-e-gramaturas, D-387): o nome e o peso de uma medida. */
export function DialogoNovaMedida({ alimento, unidade, nomeInicial = '', aoSalvar, aoFechar }: DialogoNovaMedidaProps) {
  return (
    <Dialog open={alimento !== null} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-md">
        {alimento ? <Formulario descricao={alimento.descricao} unidade={unidade} nomeInicial={nomeInicial} aoSalvar={aoSalvar} aoFechar={aoFechar} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ descricao, unidade, nomeInicial = '', aoSalvar, aoFechar }: { readonly descricao: string } & Omit<DialogoNovaMedidaProps, 'alimento'>) {
  const [nome, setNome] = useState(nomeInicial)
  const [gramas, setGramas] = useState<number | null>(null)
  const [erro, setErro] = useState<{ readonly campo: 'nome' | 'gramas' | 'geral'; readonly mensagem: string } | null>(null)

  const salvar = () => {
    if (nome.trim() === '') return setErro({ campo: 'nome', mensagem: 'Dê um nome à medida, como “concha”.' })
    if (gramas === null || !(gramas > 0) || gramas > PESO_MAXIMO_DA_MEDIDA) return setErro({ campo: 'gramas', mensagem: `Informe um peso entre 0 e 2.000 ${unidade}.` })
    const motivo = aoSalvar({ nome: nome.trim(), gramas })
    if (motivo) setErro({ campo: 'geral', mensagem: motivo })
    else aoFechar()
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        salvar()
      }}
    >
      <DialogHeader>
        <DialogTitle>Nova medida</DialogTitle>
        <DialogDescription>{`${descricao}. A medida fica salva na sua conta e aparece primeiro, marcada “sua”.`}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <CampoTexto rotulo="Nome da medida" valor={nome} aoMudar={setNome} placeholder="concha, pote, fatia…" erro={erro?.campo === 'nome' ? erro.mensagem : undefined} />
        <CampoNumero rotulo="Peso" valor={gramas} aoMudar={setGramas} sufixo={unidade} erro={erro?.campo === 'gramas' ? erro.mensagem : undefined} />
      </div>
      {erro?.campo === 'geral' ? (
        <p role="alert" className="text-sm text-errortext">
          {erro.mensagem}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">Salvar medida</Button>
      </DialogFooter>
    </form>
  )
}
