import { Plus, TriangleAlert, X } from 'lucide-react'
import { useId, useState } from 'react'
import { motivoParaNaoSugerirDados } from '@/domain/alimentoProprio.ts'
import { buscarRotuloPorCodigo } from '@/domain/codigoBarras.ts'
import { lerMedidaDaLista } from '@/domain/medidaDoRotulo.ts'
import {
  CAMPOS_GERAIS,
  CAMPOS_MACROS,
  CAMPOS_MICROS,
  energiaIncoerente,
  GRUPOS_PROPRIOS,
  PREPAROS_PROPRIOS,
  validarAlimentoProprio,
  valoresPor100,
  type DadosAlimentoProprio,
  type FonteAlimentoProprio,
  type PreparoProprio,
  type TipoAlimentoProprio,
} from '@/domain/produtos.ts'
import type { ChaveNutrienteAlimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { LeitorCodigo } from './LeitorCodigo.tsx'

interface DialogoAlimentoProprioProps {
  /** Os dados iniciais (novo, cópia da base, receita ou o item a editar); `null` mantém a janela fechada. */
  readonly inicial: { readonly dados: DadosAlimentoProprio; readonly editando: boolean } | null
  /** Em quantos planos o alimento está: editar avisa que muda os cálculos deles (D-385). */
  readonly emPlanos?: number
  /** Grava; devolve o motivo quando não deu (o limite de 1.000, CB-371). */
  readonly aoSalvar: (dados: DadosAlimentoProprio) => string | null
  readonly aoFechar: () => void
}

const TIPOS: readonly { readonly valor: TipoAlimentoProprio; readonly rotulo: string }[] = [
  { valor: 'alimento', rotulo: 'Alimento' },
  { valor: 'preparacao', rotulo: 'Preparação' },
  { valor: 'rotulo', rotulo: 'Rótulo' },
]

const FONTES: readonly { readonly valor: FonteAlimentoProprio['tipo']; readonly rotulo: string }[] = [
  { valor: 'rotulo', rotulo: 'Rótulo da embalagem' },
  { valor: 'open-food-facts', rotulo: 'Open Food Facts' },
  { valor: 'laboratorio', rotulo: 'Análise de laboratório' },
  { valor: 'copia-da-base', rotulo: 'Cópia da base' },
  { valor: 'outra', rotulo: 'Outra' },
]

/** As listas de escolha usam o select do navegador, como o resto do app. */
const SELECT = 'h-11 w-full rounded-md border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:text-sm aria-[invalid=true]:border-error'

/** "Meus alimentos" (spec alimentos-e-gramaturas, D-383 e D-384): alimento, preparação ou rótulo, por 100 g ou por porção. */
export function DialogoAlimentoProprio({ inicial, emPlanos = 0, aoSalvar, aoFechar }: DialogoAlimentoProprioProps) {
  return (
    <Dialog open={inicial !== null} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {inicial ? <Formulario inicial={inicial.dados} editando={inicial.editando} emPlanos={emPlanos} aoSalvar={aoSalvar} aoFechar={aoFechar} /> : null}
      </DialogContent>
    </Dialog>
  )
}

interface FormularioProps {
  readonly inicial: DadosAlimentoProprio
  readonly editando: boolean
  readonly emPlanos: number
  readonly aoSalvar: (dados: DadosAlimentoProprio) => string | null
  readonly aoFechar: () => void
}

function Formulario({ inicial, editando, emPlanos, aoSalvar, aoFechar }: FormularioProps) {
  const [d, setD] = useState<DadosAlimentoProprio>(inicial)
  const [tentou, setTentou] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [procurando, setProcurando] = useState(false)
  const [avisoCodigo, setAvisoCodigo] = useState<{ readonly tipo: 'info' | 'warning'; readonly texto: string } | null>(null)
  const idGrupo = useId()
  const idPreparo = useId()
  const idFonte = useId()
  const idObservacoes = useId()
  const idSugerir = useId()

  const mudar = (m: Partial<DadosAlimentoProprio>) => setD((atual) => ({ ...atual, ...m }))
  const mudarValor = (chave: ChaveNutrienteAlimento, v: number | null) => setD((atual) => ({ ...atual, valores: { ...atual.valores, [chave]: v } }))

  const { problemas, avisos } = validarAlimentoProprio(d)
  const erroDe = (campo: string) => (tentou ? problemas.find((p) => p.campo === campo)?.mensagem : undefined)
  const avisoDe = (campo: string) => avisos.find((a) => a.campo === campo)?.mensagem
  const incoerente = energiaIncoerente(d.valores)
  // D-493: o motivo da regra do alimento próprio trava a chave do Cobrir, como a energia incoerente.
  const motivoSemSugestao = motivoParaNaoSugerirDados(d)
  const chaveTravada = incoerente || motivoSemSugestao !== null
  const unidade = d.unidade
  const por100 = valoresPor100(d)

  const lerCodigo = async (codigo: string) => {
    setProcurando(true)
    setAvisoCodigo(null)
    mudar({ codigoBarras: codigo })
    try {
      const achado = await buscarRotuloPorCodigo(codigo)
      if (!achado) {
        setAvisoCodigo({ tipo: 'warning', texto: 'Este código não está na Open Food Facts. Digite os valores do rótulo.' })
        return
      }
      // A13 e D-382: por 100 g ou 100 ml, como a base publica; a porção do rótulo vira medida.
      setD((atual) => ({
        ...atual,
        nome: achado.nome || atual.nome,
        marca: achado.marca || atual.marca,
        unidade: achado.unidade,
        base: 'por100',
        porcaoG: 100,
        valores: { ...atual.valores, ...achado.por100 },
        medidas: achado.porcao ? [...atual.medidas.filter((m) => m.nome !== 'porção'), { nome: 'porção', gramas: achado.porcao.gramas }] : atual.medidas,
        fonte: { tipo: 'open-food-facts', codigo: achado.codigo, data: new Date().toISOString().slice(0, 10) },
      }))
      setAvisoCodigo({ tipo: 'info', texto: `Dados da Open Food Facts, por 100 ${achado.unidade}. Confira com a embalagem antes de salvar: a base é colaborativa e pode ter erros.` })
    } catch {
      setAvisoCodigo({ tipo: 'warning', texto: 'Não foi possível consultar o código sem internet. Digite os valores do rótulo.' })
    } finally {
      setProcurando(false)
    }
  }

  const campoNutriente = (c: { readonly chave: ChaveNutrienteAlimento; readonly rotulo: string; readonly unidade: string }) => (
    <CampoNumero
      key={c.chave}
      rotulo={c.rotulo}
      valor={d.valores[c.chave] ?? null}
      aoMudar={(v) => mudarValor(c.chave, v)}
      sufixo={c.unidade}
      erro={erroDe(c.chave)}
      // O aviso da energia fica num quadro só, embaixo dos macros.
      dica={c.chave === 'energia_kcal' ? undefined : avisoDe(c.chave)}
    />
  )

  const fonteTipo = d.fonte?.tipo ?? ''
  const salvar = () => {
    setTentou(true)
    if (problemas.length > 0) return
    const motivo = aoSalvar(d)
    if (motivo) setErroGeral(motivo)
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        salvar()
      }}
    >
      <DialogHeader>
        <DialogTitle>{editando ? 'Editar alimento' : 'Novo alimento'}</DialogTitle>
        <DialogDescription>Os valores entram nos cálculos do plano como os da base. Campo vazio é “não informado”, nunca zero.</DialogDescription>
      </DialogHeader>

      {editando && emPlanos > 0 ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{`Está em ${emPlanos} ${emPlanos === 1 ? 'plano' : 'planos'}. Mudar os valores muda os cálculos ${emPlanos === 1 ? 'dele' : 'deles'}.`}</p>
        </Alert>
      ) : null}

      <GrupoOpcoes<TipoAlimentoProprio>
        rotulo="Tipo"
        opcoes={TIPOS}
        valor={d.tipo}
        aoEscolher={(tipo) => mudar({ tipo, ...(tipo === 'rotulo' && d.fonte === null ? { fonte: { tipo: 'rotulo' } } : {}) })}
      />

      {d.tipo === 'rotulo' ? (
        <div className="flex flex-col gap-3">
          <LeitorCodigo aoLer={(codigo) => void lerCodigo(codigo)} ocupado={procurando} />
          {avisoCodigo ? (
            <Alert variant={avisoCodigo.tipo}>
              <TriangleAlert aria-hidden="true" />
              <p>{avisoCodigo.texto}</p>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <CampoTexto rotulo="Nome" valor={d.nome} aoMudar={(nome) => mudar({ nome })} placeholder="Cuscuz da casa, castanha-de-baru…" erro={erroDe('nome')} />
        <CampoTexto
          rotulo="Nome para o paciente"
          valor={d.nomeParaPaciente}
          aoMudar={(nomeParaPaciente) => mudar({ nomeParaPaciente })}
          placeholder="Opcional"
          dica="O nome do plano impresso e do link. Vazio, vale o nome."
          erro={erroDe('nomeParaPaciente')}
        />
        {d.tipo === 'rotulo' ? <CampoTexto rotulo="Marca" valor={d.marca} aoMudar={(marca) => mudar({ marca })} placeholder="Opcional" /> : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idGrupo}>Grupo</Label>
          <select id={idGrupo} value={d.grupo} onChange={(e) => mudar({ grupo: e.target.value })} className={SELECT} aria-invalid={erroDe('grupo') ? true : undefined}>
            <option value="">Escolha…</option>
            {GRUPOS_PROPRIOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {erroDe('grupo') ? <p className="text-xs text-errortext">{erroDe('grupo')}</p> : null}
        </div>
        {d.tipo === 'alimento' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idPreparo}>Como é servido</Label>
            <select
              id={idPreparo}
              value={d.preparo ?? ''}
              onChange={(e) => mudar({ preparo: e.target.value === '' ? null : (e.target.value as PreparoProprio) })}
              className={SELECT}
              aria-invalid={erroDe('preparo') ? true : undefined}
            >
              <option value="">Escolha…</option>
              {PREPAROS_PROPRIOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {erroDe('preparo') ? <p className="text-xs text-errortext">{erroDe('preparo')}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-5">
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <GrupoOpcoes<'g' | 'ml'>
            rotulo="Medido em"
            opcoes={[
              { valor: 'g', rotulo: 'gramas' },
              { valor: 'ml', rotulo: 'mililitros' },
            ]}
            valor={d.unidade}
            aoEscolher={(u) => mudar({ unidade: u })}
          />
          <GrupoOpcoes<'por100' | 'porcao'>
            rotulo="Os valores são"
            opcoes={[
              { valor: 'por100', rotulo: `Por 100 ${unidade}` },
              { valor: 'porcao', rotulo: 'Na porção' },
            ]}
            valor={d.base}
            aoEscolher={(base) => mudar({ base, porcaoG: base === 'por100' ? 100 : d.porcaoG === 100 ? null : d.porcaoG })}
          />
        </div>
        {d.unidade === 'ml' ? <p className="text-xs text-muted-foreground">Em mililitros, 1 ml conta como 1 g nos cálculos.</p> : null}
        {d.base === 'porcao' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoNumero rotulo="Porção" valor={d.porcaoG} aoMudar={(porcaoG) => mudar({ porcaoG })} sufixo={unidade} erro={erroDe('porcaoG')} />
            <CampoTexto
              rotulo="Medida caseira da porção"
              valor={d.nomeDaPorcao}
              aoMudar={(nomeDaPorcao) => mudar({ nomeDaPorcao })}
              placeholder="1 pote, 4 colheres de sopa…"
              dica="Vira uma medida caseira do alimento."
            />
          </div>
        ) : null}

        {/* Sem caixa alta: a unidade (g, ml) não vira "G". */}
        <h3 className="text-sm font-semibold text-heading">{d.base === 'por100' ? `Obrigatórios, por 100 ${unidade}` : 'Obrigatórios, na porção'}</h3>
        <div className="grid gap-4 sm:grid-cols-2">{CAMPOS_MACROS.map(campoNutriente)}</div>
        {incoerente ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>{avisoDe('energia_kcal')}</p>
          </Alert>
        ) : null}
        {erroDe('soma') ? <p className="text-sm text-errortext">{erroDe('soma')}</p> : null}
        {d.base === 'porcao' && por100 && typeof por100.energia_kcal === 'number' ? (
          <p className="text-xs text-muted-foreground">{`Equivale a ${formatarNumero(por100.energia_kcal, 0)} kcal por 100 ${unidade}, valor usado nos cálculos do plano.`}</p>
        ) : null}

        <h3 className="text-sm font-semibold text-heading">Se tiver</h3>
        <div className="grid gap-4 sm:grid-cols-2">{CAMPOS_GERAIS.map(campoNutriente)}</div>

        <details className="group rounded-2xl bg-surfacerow px-4 py-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-heading">Vitaminas e minerais (se tiver)</summary>
          <p className="pb-3 text-xs text-muted-foreground">Vitamina A em RAE e folato em DFE, como na adequação.</p>
          <div className="grid gap-4 pb-2 sm:grid-cols-2">{CAMPOS_MICROS.map(campoNutriente)}</div>
        </details>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5" aria-label="Medidas caseiras">
        <h3 className="text-sm font-semibold text-heading">Medidas caseiras</h3>
        {d.medidas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma medida. Sem ela, o paciente lê o peso.</p> : null}
        <ul className="flex flex-col gap-2">
          {d.medidas.map((m, i) => {
            // D-496: "2 fatias" com 50 g é gravada como a fatia de 25 g; a linha mostra a leitura antes de salvar.
            const lida = lerMedidaDaLista(m.nome, m.gramas)
            const mudou = m.nome.trim() !== '' && m.gramas > 0 && (lida.nome !== m.nome.trim() || lida.gramas !== m.gramas)
            return (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-start gap-2">
                <CampoTexto
                  rotulo={`Nome da medida ${i + 1}`}
                  rotuloOculto
                  valor={m.nome}
                  aoMudar={(nome) => mudar({ medidas: d.medidas.map((x, j) => (j === i ? { ...x, nome } : x)) })}
                  placeholder="fatia"
                />
                <CampoNumero
                  rotulo={`Peso da medida ${i + 1}`}
                  rotuloOculto
                  valor={m.gramas > 0 ? m.gramas : null}
                  aoMudar={(v) => mudar({ medidas: d.medidas.map((x, j) => (j === i ? { ...x, gramas: v ?? 0 } : x)) })}
                  sufixo={unidade}
                />
                <Button type="button" variant="ghost" size="iconsm" aria-label={`Tirar a medida ${m.nome || i + 1}`} onClick={() => mudar({ medidas: d.medidas.filter((_, j) => j !== i) })}>
                  <X aria-hidden="true" />
                </Button>
                {mudou ? <p className="col-span-3 text-xs text-muted-foreground">{`Fica ${lida.nome} · ${formatarNumero(lida.gramas, Number.isInteger(lida.gramas) ? 0 : 1)} ${unidade}.`}</p> : null}
              </li>
            )
          })}
        </ul>
        {problemas.some((p) => p.campo.startsWith('medida-')) && tentou ? <p className="text-xs text-errortext">Cada medida precisa de nome e de peso entre 0 e 2.000.</p> : null}
        <Button type="button" variant="lightprimary" size="sm" className="self-start" onClick={() => mudar({ medidas: [...d.medidas, { nome: '', gramas: 0 }] })}>
          <Plus aria-hidden="true" />
          Adicionar medida
        </Button>
      </section>

      <section className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idFonte}>Fonte dos valores</Label>
          <select
            id={idFonte}
            value={fonteTipo}
            onChange={(e) => {
              const tipo = e.target.value as FonteAlimentoProprio['tipo'] | ''
              const fonte: FonteAlimentoProprio | null =
                tipo === ''
                  ? null
                  : tipo === 'outra'
                    ? { tipo, texto: '' }
                    : tipo === 'open-food-facts'
                      ? { tipo, codigo: d.codigoBarras, data: new Date().toISOString().slice(0, 10) }
                      : tipo === 'copia-da-base'
                        ? { tipo, origemId: d.fonte?.tipo === 'copia-da-base' ? d.fonte.origemId : 0 }
                        : { tipo }
              mudar({ fonte })
            }}
            className={SELECT}
            aria-invalid={erroDe('fonte') ? true : undefined}
          >
            <option value="">Escolha…</option>
            {FONTES.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </select>
          {erroDe('fonte') && d.fonte?.tipo !== 'outra' ? <p className="text-xs text-errortext">{erroDe('fonte')}</p> : null}
        </div>
        {d.fonte?.tipo === 'outra' ? (
          <CampoTexto rotulo="De onde vieram" valor={d.fonte.texto} aoMudar={(texto) => mudar({ fonte: { tipo: 'outra', texto } })} placeholder="Ficha técnica do fornecedor…" erro={erroDe('fonte')} />
        ) : null}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={idObservacoes}>Observações</Label>
          <Textarea id={idObservacoes} value={d.observacoes} maxLength={500} onChange={(e) => mudar({ observacoes: e.target.value })} placeholder="Opcional" />
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl bg-surfacerow px-4 py-3">
        <Switch
          id={idSugerir}
          checked={d.sugerirAutomaticamente && !chaveTravada}
          disabled={chaveTravada}
          onCheckedChange={(v) => mudar({ sugerirAutomaticamente: v })}
          aria-describedby={`${idSugerir}-texto`}
          className="mt-0.5"
        />
        <Label htmlFor={idSugerir} className="min-h-11 flex-1 cursor-pointer flex-col items-start gap-0.5 font-normal leading-normal">
          <span className="text-sm font-semibold text-heading">Pode aparecer no Cobrir e nas trocas</span>
          <span id={`${idSugerir}-texto`} className="text-xs text-muted-foreground">
            {incoerente
              ? 'Confira a energia antes: com ela fora dos macros, o alimento não é sugerido.'
              : motivoSemSugestao !== null
                ? `Não entra no Cobrir nem nas trocas: ${motivoSemSugestao}.`
                : 'Desligado, o alimento só entra quando você o põe no plano.'}
          </span>
        </Label>
      </div>

      {tentou && problemas.length > 0 ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{problemas.length === 1 ? 'Falta acertar um campo.' : `Faltam acertar ${problemas.length} campos.`} Eles estão marcados.</p>
        </Alert>
      ) : null}
      {erroGeral ? (
        <p role="alert" className="text-sm text-errortext">
          {erroGeral}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">{editando ? 'Salvar alterações' : 'Salvar alimento'}</Button>
      </DialogFooter>
    </form>
  )
}
