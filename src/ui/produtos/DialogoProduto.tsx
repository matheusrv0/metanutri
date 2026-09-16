import { useState } from 'react'
import { buscarRotuloPorCodigo } from '@/domain/codigoBarras.ts'
import { CAMPOS_OPCIONAIS, CAMPOS_ROTULO, porCem, validarProduto, type Produto } from '@/domain/produtos.ts'
import { LeitorCodigo } from './LeitorCodigo.tsx'
import type { ChaveNutrienteAlimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoNumero } from '../caso/CampoNumero.tsx'
import { CampoTexto } from '../caso/CampoTexto.tsx'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'

type Valores = Partial<Record<ChaveNutrienteAlimento, number | null>>

interface DialogoProdutoProps {
  /** Produto a editar, 'novo' para cadastro em branco, `null` para manter fechado. */
  readonly produto: Produto | 'novo' | null
  readonly aoSalvar: (dados: Omit<Produto, 'id' | 'criadoEm'> & { readonly id?: number }) => void
  readonly aoFechar: () => void
}

export function DialogoProduto({ produto, aoSalvar, aoFechar }: DialogoProdutoProps) {
  return (
    <Dialog open={produto !== null} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        {produto !== null ? <Formulario produto={produto} aoSalvar={aoSalvar} aoFechar={aoFechar} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ produto, aoSalvar, aoFechar }: { readonly produto: Produto | 'novo' } & Omit<DialogoProdutoProps, 'produto'>) {
  const inicial = produto === 'novo' ? null : produto
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [marca, setMarca] = useState(inicial?.marca ?? '')
  const [porcaoG, setPorcaoG] = useState<number | null>(inicial?.porcaoG ?? null)
  const [medidaCaseira, setMedidaCaseira] = useState(inicial?.medidaCaseira ?? '')
  const [valores, setValores] = useState<Valores>(inicial?.porPorcao ?? {})
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [codigoBarras, setCodigoBarras] = useState(inicial?.codigoBarras ?? '')
  const [procurando, setProcurando] = useState(false)
  const [avisoCodigo, setAvisoCodigo] = useState<string | null>(null)

  const lerCodigo = async (codigo: string) => {
    setProcurando(true)
    setAvisoCodigo(null)
    setCodigoBarras(codigo)
    try {
      const achado = await buscarRotuloPorCodigo(codigo)
      if (!achado) {
        setAvisoCodigo('Não achei esse código na base pública. Copie os números da embalagem e o produto fica salvo aqui.')
        return
      }
      if (achado.nome) setNome(achado.nome)
      if (achado.marca) setMarca(achado.marca)
      if (achado.porcaoG) setPorcaoG(achado.porcaoG)
      if (achado.medidaCaseira) setMedidaCaseira(achado.medidaCaseira)
      setValores((atual) => ({ ...atual, ...achado.porPorcao }))
      setAvisoCodigo(`Dados trazidos da ${achado.fonte}. Confira com a embalagem antes de salvar: base colaborativa erra às vezes.`)
    } catch {
      setAvisoCodigo('Sem internet para consultar o código. Digite os valores do rótulo.')
    } finally {
      setProcurando(false)
    }
  }

  const dados = {
    ...(inicial ? { id: inicial.id } : {}),
    codigoBarras,
    nome,
    marca,
    porcaoG: porcaoG ?? 0,
    medidaCaseira,
    porPorcao: valores,
  }

  const problemas = validarProduto(dados)
  const erroDe = (campo: string) => (tentouSalvar ? problemas.find((p) => p.campo === campo)?.mensagem : undefined)

  const campo = (c: { readonly chave: ChaveNutrienteAlimento; readonly rotulo: string; readonly unidade: string }) => (
    <CampoNumero
      key={c.chave}
      rotulo={c.rotulo}
      valor={valores[c.chave] ?? null}
      aoMudar={(v) => setValores((atual) => ({ ...atual, [c.chave]: v }))}
      sufixo={c.unidade}
      erro={erroDe(c.chave)}
    />
  )

  const kcalPorcao = valores.energia_kcal
  const previa = porcaoG && porcaoG > 0 && typeof kcalPorcao === 'number' ? porCem(kcalPorcao, porcaoG) : null

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        setTentouSalvar(true)
        if (problemas.length === 0) aoSalvar(dados)
      }}
    >
      <DialogHeader>
        <DialogTitle>{inicial ? 'Editar produto' : 'Cadastrar produto pelo rótulo'}</DialogTitle>
        <DialogDescription>Copie os números como estão na embalagem, na porção que o rótulo declara. A conversão para 100 g é automática.</DialogDescription>
      </DialogHeader>

      <LeitorCodigo aoLer={(codigo) => void lerCodigo(codigo)} ocupado={procurando} />

      {avisoCodigo ? (
        <Alert variant={avisoCodigo.startsWith('Dados trazidos') ? 'info' : 'warning'}>
          <span aria-hidden="true">i</span>
          <p>{avisoCodigo}</p>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto rotulo="Nome do produto" valor={nome} aoMudar={setNome} placeholder="Iogurte natural" erro={erroDe('nome')} />
        <CampoTexto rotulo="Marca" valor={marca} aoMudar={setMarca} placeholder="Opcional" />
        <CampoNumero rotulo="Porção do rótulo" valor={porcaoG} aoMudar={setPorcaoG} sufixo="g ou ml" erro={erroDe('porcaoG')} />
        <CampoTexto rotulo="Medida caseira da porção" valor={medidaCaseira} aoMudar={setMedidaCaseira} placeholder="1 pote, 2 fatias" />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="rotulo">Obrigatório no rótulo</h3>
        <div className="grid gap-4 sm:grid-cols-2">{CAMPOS_ROTULO.map(campo)}</div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="rotulo">Se o rótulo trouxer</h3>
        <div className="grid gap-4 sm:grid-cols-2">{CAMPOS_OPCIONAIS.map(campo)}</div>
      </section>

      {previa !== null ? (
        <Alert variant="info">
          <span aria-hidden="true">=</span>
          <p>{`Equivale a ${formatarNumero(previa, 0)} kcal por 100 g, que é como o plano vai calcular.`}</p>
        </Alert>
      ) : null}

      {tentouSalvar && problemas.length > 0 ? (
        <Alert variant="warning">
          <span aria-hidden="true">!</span>
          <p>{problemas.length === 1 ? 'Falta um campo do rótulo.' : `Faltam ${problemas.length} campos do rótulo.`} Os campos em falta estão marcados.</p>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">{inicial ? 'Salvar alterações' : 'Cadastrar produto'}</Button>
      </DialogFooter>
    </form>
  )
}
