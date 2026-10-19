import { useId, useState } from 'react'
import { lerReceitaDoPlano, NOMES_DA_PORCAO, somaDosIngredientes } from '@/domain/receitaNoPlano.ts'
import { validarReceita, type DadosReceita, type Receita } from '@/domain/receitas.ts'
import type { ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ds/componentes/forms/select.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { EntradaRapida } from '../plano/EntradaRapida.tsx'
import { LinhaItem } from '../plano/LinhaItem.tsx'
import { ResumoDaPorcao } from './ResumoDaPorcao.tsx'

interface EditorReceitaProps {
  /** A receita a editar; `null` para uma nova. */
  readonly receita: Receita | null
  readonly aoSalvar: (dados: DadosReceita) => void
  readonly aoCancelar: () => void
}

const idNovo = (): string => globalThis.crypto.randomUUID()

/**
 * O editor da receita (spec receitas-com-calculo, CA-861 a CA-863): nome, ingredientes pela mesma busca da refeição,
 * rendimento, peso pronto, modo de preparo e o valor de uma porção. Abre no lugar da lista, não numa janela (D-272).
 */
export function EditorReceita({ receita, aoSalvar, aoCancelar }: EditorReceitaProps) {
  const [nome, setNome] = useState(receita?.nome ?? '')
  // Cada ingrediente é uma linha como a do plano: id local, alimento e gramas.
  const [ingredientes, setIngredientes] = useState<readonly ItemPlano[]>(() => (receita?.ingredientes ?? []).map((i) => ({ id: idNovo(), alimentoId: i.alimentoId, gramas: i.gramas })))
  const [porcoes, setPorcoes] = useState<number | null>(receita?.porcoes ?? null)
  const [nomeDaPorcao, setNomeDaPorcao] = useState(receita?.nomeDaPorcao ?? 'porção')
  const [pesoProntoG, setPesoProntoG] = useState<number | null>(receita?.pesoProntoG ?? null)
  const [preparo, setPreparo] = useState(receita?.preparo ?? '')
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const idPreparo = useId()
  const idPorcao = useId()

  const rascunho = {
    nome,
    ingredientes: ingredientes.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas })),
    porcoes,
    nomeDaPorcao,
    pesoProntoG,
    preparo,
  }
  const problemas = validarReceita(rascunho)
  // O peso pronto inválido aparece na hora; o resto, depois de tentar salvar.
  const erroDe = (campo: (typeof problemas)[number]['campo']) =>
    tentouSalvar || campo === 'pesoProntoG' ? problemas.find((p) => p.campo === campo)?.mensagem : undefined
  const soma = somaDosIngredientes(rascunho)
  const paraCalcular = porcoes === null ? null : lerReceitaDoPlano({ ...rascunho, porcoes, origemId: receita?.id ?? 'nova' })
  const podeMostrarPorcao = paraCalcular !== null && problemas.every((p) => p.campo === 'nome')

  const salvar = () => {
    setTentouSalvar(true)
    if (problemas.length > 0 || porcoes === null) return
    aoSalvar({ ...rascunho, porcoes, ingredientes: rascunho.ingredientes.filter((i) => i.gramas > 0) })
  }

  const erroIngredientes = erroDe('ingredientes')

  return (
    <Card className="mx-auto w-full max-w-3xl gap-6">
      <h2 className="card-title">{receita ? 'Editar receita' : 'Nova receita'}</h2>

      <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} placeholder="Panqueca de banana" erro={erroDe('nome')} />

      <section aria-label="Ingredientes da receita" className="flex flex-col gap-3">
        <h3 className="rotulo">Ingredientes</h3>
        <EntradaRapida
          rotulo="Adicionar ingrediente"
          aoAdicionar={(alimentoId, gramas) => setIngredientes((atual) => [...atual, { id: idNovo(), alimentoId, gramas }])}
        />
        {ingredientes.length > 0 ? (
          <ul aria-label="Ingredientes" className="flex flex-col">
            {ingredientes.map((item) => (
              <LinhaItem
                key={item.id}
                item={item}
                aoMudarGramas={(g) => setIngredientes((atual) => atual.map((i) => (i.id === item.id ? { ...i, gramas: g } : i)))}
                aoRemover={() => setIngredientes((atual) => atual.filter((i) => i.id !== item.id))}
              />
            ))}
          </ul>
        ) : null}
        {erroIngredientes ? (
          <p role="alert" className="text-xs text-errortext">
            {erroIngredientes}
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoNumero rotulo="Rende" valor={porcoes} aoMudar={setPorcoes} placeholder="2" erro={erroDe('porcoes')} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idPorcao}>Nome da porção</Label>
          <Select value={nomeDaPorcao} onValueChange={setNomeDaPorcao}>
            <SelectTrigger id={idPorcao} aria-label="Nome da porção" className="h-11 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOMES_DA_PORCAO.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CampoNumero
          rotulo="Peso pronto"
          valor={pesoProntoG}
          aoMudar={setPesoProntoG}
          sufixo="g"
          placeholder={soma > 0 ? formatarNumero(soma, 0) : undefined}
          dica={pesoProntoG === null && soma > 0 ? `Vazio: a soma dos ingredientes, ${formatarNumero(soma, 0)} g.` : undefined}
          erro={erroDe('pesoProntoG')}
        />
      </div>

      {podeMostrarPorcao ? <ResumoDaPorcao receita={paraCalcular} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={idPreparo}>Modo de preparo</Label>
        <Textarea id={idPreparo} rows={5} value={preparo} onChange={(e) => setPreparo(e.target.value)} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button onClick={salvar}>Salvar receita</Button>
      </div>
    </Card>
  )
}
