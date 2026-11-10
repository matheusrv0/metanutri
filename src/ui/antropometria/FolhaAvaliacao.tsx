import type { ReactNode } from 'react'
import type { DocumentoDaAvaliacao } from '@/domain/documentoDaAvaliacao.ts'
import { FRASE_PROPOSTA } from '@/domain/documentoDoPaciente.ts'
import { assinaturaEmTexto, type AssinaturaDaFolha } from '@/domain/folhaDieta.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { cn } from '@ds/lib/cn.ts'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { LinhasDeAssinatura } from '../exportar/LinhasDeAssinatura.tsx'
import { regraDaLinhaFina } from '../exportar/linhaFina.ts'
import { SeloDaSituacao } from './SeloDaSituacao.tsx'
import { apresentarLinha } from './textosDaAvaliacao.ts'

interface FolhaAvaliacaoProps {
  readonly documento: DocumentoDaAvaliacao
  readonly assinatura: AssinaturaDaFolha
  /** Conta de estudante: a frase de proposta do estágio (D-1495, CA-2463). */
  readonly proposta: boolean
  /** A data da avaliação, AAAA-MM-DD, para a assinatura por extenso. */
  readonly data: string
}

function Secao({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 break-inside-avoid-page">
      <h3 className="text-base font-bold text-heading">{titulo}</h3>
      {children}
    </section>
  )
}

/** O topo: quem assina à esquerda, o contato de Configurações à direita (D-1430, bloco 1; D-1490 sem cidade). */
function Cabecalho({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  const perfil = lerPerfil(useArmazenamento())
  const contato = [perfil.telefone.trim(), perfil.email.trim()].filter(Boolean).join(' · ')
  let nome = ''
  let papel = ''
  if (assinatura.tipo === 'nutricionista') {
    const [antes, ...depois] = assinatura.linha.split(' · ')
    nome = antes ?? ''
    papel = depois.length > 0 ? `Nutricionista · ${depois.join(' · ')}` : 'Nutricionista'
  } else if (assinatura.tipo === 'estagio') {
    nome = assinatura.estagiario
    papel = assinatura.preceptor ? `Estagiário(a) · preceptor(a): ${assinatura.preceptor}` : 'Estagiário(a)'
  }
  if (!nome && !contato) return null
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-heading pb-3">
      {nome ? (
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight text-heading">{nome}</p>
          <p className="text-sm text-foreground">{papel}</p>
        </div>
      ) : null}
      {contato ? <p className="min-w-0 text-sm text-muted-foreground sm:text-right">{contato}</p> : null}
    </header>
  )
}

/** Duas linhas por item abaixo de 640 px; a grade de cinco colunas no computador e no papel (D-1499). */
// No celular, a classificação tem metade da linha: "Risco substancialmente aumentado" quebra entre as palavras.
const COLUNAS_DOS_RESULTADOS = 'grid grid-cols-[minmax(0,1fr)_minmax(0,50%)] gap-x-3 gap-y-0.5 sm:grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]'
const COLUNAS_DA_COMPARACAO = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 sm:grid-cols-[minmax(0,1.4fr)_5rem_5rem_6rem_minmax(0,1fr)]'

/**
 * A folha do "Documento da avaliação" (spec antropometria-telas, D-1429 a D-1433, D-1490 a D-1499): o papel claro nos
 * dois temas (`.papel`), A4 retrato no papel e fluida na tela. Seção sem dado não sai. A foto nunca vem para cá (CFN
 * 599/2018, art. 58). O resultado usa as peças da tela: `apresentarLinha` e `SeloDaSituacao`.
 */
export function FolhaAvaliacao({ documento: d, assinatura, proposta, data }: FolhaAvaliacaoProps) {
  const linhaFina = regraDaLinhaFina(`${d.nome} · Avaliação de ${d.data}`, assinaturaEmTexto(assinatura))
  const metade = Math.ceil(d.dobras.length / 2)
  const colunasDeDobras = [d.dobras.slice(0, metade), d.dobras.slice(metade)].filter((c) => c.length > 0)

  return (
    <article
      aria-label="Documento da avaliação"
      className="folha-documento papel mx-auto flex max-w-[820px] flex-col gap-6 bg-card p-4 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere] sm:p-10"
    >
      {/* Da segunda página em diante, a paciente, a data e quem assina (D-1433, como a dieta, CA-316). */}
      <style>{linhaFina}</style>

      <Cabecalho assinatura={assinatura} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-2xl font-bold leading-tight text-heading">Avaliação antropométrica</h2>
        <p className="text-sm text-muted-foreground">{d.data}</p>
      </div>

      {proposta ? <p className="font-semibold text-heading">{FRASE_PROPOSTA}</p> : null}

      <Secao titulo="Paciente">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-surfacerow p-3.5 sm:grid-cols-3">
          {d.paciente.map((c) => (
            <div key={c.rotulo} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
              <dd className="font-semibold text-heading">{c.valor}</dd>
            </div>
          ))}
        </dl>
      </Secao>

      {d.metodos.length > 0 ? (
        <Secao titulo="Métodos">
          <ul className="grid list-disc gap-1 pl-5">
            {d.metodos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Secao>
      ) : null}

      {d.basicas.length > 0 ? (
        <Secao titulo="Medidas básicas">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {d.basicas.map((b) => (
              <div key={b.rotulo} className="rounded-lg border border-border px-3.5 py-3">
                <p className="text-xs text-muted-foreground">{b.rotulo}</p>
                <p className="numeros text-lg font-bold text-heading">{b.valor}</p>
                {b.nota ? <p className="text-xs text-muted-foreground">{b.nota}</p> : null}
              </div>
            ))}
          </div>
        </Secao>
      ) : null}

      {d.membros.length > 0 || d.tronco.length > 0 ? (
        <Secao titulo="Circunferências (cm)">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {d.membros.length > 0 ? (
              <table aria-label="Membros" className="numeros w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="py-1 text-left font-normal">
                      Membros
                    </th>
                    <th scope="col" className="w-20 py-1 text-right font-normal">
                      Direito
                    </th>
                    <th scope="col" className="w-20 py-1 text-right font-normal">
                      Esquerdo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.membros.map((m) => (
                    <tr key={m.nome} className="border-b border-border">
                      <th scope="row" className="py-1.5 text-left font-normal">
                        {m.nome}
                      </th>
                      {'unico' in m ? (
                        <td colSpan={2} className="py-1.5 text-center">
                          {m.unico}
                        </td>
                      ) : (
                        <>
                          <td className="py-1.5 text-right">{m.direito}</td>
                          <td className="py-1.5 text-right">{m.esquerdo}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {d.tronco.length > 0 ? (
              <table aria-label="Tronco" className="numeros w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="py-1 text-left font-normal">
                      Tronco
                    </th>
                    <th scope="col" className="w-20 py-1 text-right font-normal">
                      Medida
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.tronco.map((t) => (
                    <tr key={t.nome} className="border-b border-border">
                      <th scope="row" className="py-1.5 text-left font-normal">
                        {t.nome}
                      </th>
                      <td className="py-1.5 text-right">{t.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </Secao>
      ) : null}

      {d.dobras.length > 0 ? (
        <Secao titulo="Dobras cutâneas (mm)">
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            {colunasDeDobras.map((coluna, i) => (
              <table key={i} aria-label={i === 0 ? 'Dobras cutâneas' : 'Dobras cutâneas, continuação'} className="numeros w-full border-collapse text-sm">
                <thead className={i > 0 ? 'max-sm:sr-only' : undefined}>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="py-1 pl-4 text-left font-normal">
                      Dobra
                    </th>
                    <th scope="col" className="w-20 py-1 text-right font-normal">
                      Medida
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coluna.map((x) => (
                    <tr key={x.nome} className="border-b border-border">
                      <th scope="row" className="relative py-1.5 pl-4 text-left font-normal">
                        {x.usada ? (
                          <span aria-hidden="true" className="absolute left-0 text-heading">
                            ●
                          </span>
                        ) : null}
                        {x.nome}
                        {x.usada ? <span className="sr-only"> (dobra usada no protocolo)</span> : null}
                      </th>
                      <td className="py-1.5 text-right">{x.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {d.dobras.some((x) => x.usada) ? '● dobra usada no protocolo. ' : ''}
            {d.somaDasDobras ? <b className="font-semibold text-heading">{`${d.somaDasDobras}. `}</b> : null}
            Dobras variam entre avaliadores: compare medidas feitas pela mesma pessoa.
          </p>
        </Secao>
      ) : null}

      {d.diametros ? (
        <Secao titulo="Diâmetros ósseos (cm)">
          <p>{d.diametros}</p>
        </Secao>
      ) : null}

      {d.resultados.length > 0 ? (
        <Secao titulo="Resultados">
          <div role="table" aria-label="Resultados" className="grid text-sm">
            <div role="rowgroup" className="hidden sm:grid">
              <div role="row" className={cn(COLUNAS_DOS_RESULTADOS, 'border-b border-border pb-1 text-xs text-muted-foreground')}>
                <span role="columnheader">Indicador</span>
                <span role="columnheader" className="text-right">
                  Valor
                </span>
                <span role="columnheader">Referência</span>
                <span role="columnheader">Classificação</span>
                <span role="columnheader">Fonte</span>
              </div>
            </div>
            <div role="rowgroup" className="grid">
              {d.resultados.map((r) => {
                const a = apresentarLinha(r.linha)
                return (
                  <div key={r.linha.id} role="row" className={cn(COLUNAS_DOS_RESULTADOS, 'items-center border-b border-border py-1.5 break-inside-avoid')}>
                    <span role="rowheader" className="min-w-0">
                      {r.nome}
                    </span>
                    <span role="cell" className="numeros whitespace-nowrap text-right font-semibold text-heading">
                      {a.real}
                    </span>
                    <span role="cell" className="min-w-0 text-xs text-muted-foreground sm:text-sm sm:text-foreground">
                      {a.recomendacao}
                    </span>
                    <span role="cell" className="flex min-w-0 justify-end [overflow-wrap:normal] sm:justify-start">
                      {a.selo ? <SeloDaSituacao rotulo={a.selo.rotulo} tom={a.selo.tom} /> : <span className="text-muted-foreground">—</span>}
                    </span>
                    <span role="cell" className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
                      {a.fonte?.curta ?? ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Secao>
      ) : null}

      {d.comparacao ? (
        <Secao titulo="Comparação com a avaliação anterior">
          <div role="table" aria-label="Comparação com a avaliação anterior" className="grid text-sm">
            <div role="rowgroup" className="hidden sm:grid">
              <div role="row" className={cn(COLUNAS_DA_COMPARACAO, 'border-b border-border pb-1 text-xs text-muted-foreground')}>
                <span role="columnheader">Medida</span>
                <span role="columnheader" className="text-right">
                  {d.comparacao.antes}
                </span>
                <span role="columnheader" className="text-right">
                  {d.comparacao.agora}
                </span>
                <span role="columnheader" className="text-right">
                  Variação
                </span>
                <span role="columnheader">Leitura</span>
              </div>
            </div>
            <div role="rowgroup" className="grid">
              {d.comparacao.linhas.map((l) => (
                <div key={l.nome} role="row" className={cn(COLUNAS_DA_COMPARACAO, 'items-center border-b border-border py-1.5 break-inside-avoid')}>
                  <span role="rowheader" className="min-w-0">
                    {l.nome}
                  </span>
                  <span role="cell" className="numeros text-right max-sm:hidden">
                    {l.antes}
                  </span>
                  <span role="cell" className="numeros text-right font-semibold text-heading max-sm:hidden">
                    {l.agora}
                  </span>
                  <span role="cell" className="numeros text-right">
                    {l.variacao}
                  </span>
                  <span role="cell" className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
                    <span className="sm:hidden">{`${l.antes} → ${l.agora}${l.leitura ? ' · ' : ''}`}</span>
                    {l.leitura}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {d.comparacao.legenda ? <p className="text-xs text-muted-foreground">{d.comparacao.legenda}</p> : null}
        </Secao>
      ) : null}

      <Secao titulo="Diagnóstico nutricional">
        {d.diagnostico ? (
          <p className="whitespace-pre-line">{d.diagnostico}</p>
        ) : (
          <div role="img" aria-label="Espaço para escrever o diagnóstico à mão" className="grid gap-7 pt-5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block border-b border-border" />
            ))}
          </div>
        )}
        {d.observacoes ? <p className="whitespace-pre-line text-xs text-muted-foreground">{`Condições da medida: ${d.observacoes}`}</p> : null}
      </Secao>

      {d.referencias.length > 0 ? (
        <Secao titulo="Referências">
          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 sm:gap-x-8">
            {d.referencias.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Secao>
      ) : null}

      {/* A assinatura não fica sozinha no topo de uma página (D-1433): vai junto com o aviso. */}
      <div className="flex flex-col gap-2 break-inside-avoid">
        <p className="text-xs text-muted-foreground">A interpretação é da nutricionista e não substitui avaliação clínica.</p>
        <LinhasDeAssinatura assinatura={assinatura} />
        <p className="text-center text-sm text-foreground sm:ml-auto sm:w-1/2">{dataPorExtenso(data)}</p>
        <p className="pt-4 text-xs text-muted-foreground">Gerado no MetaNutri</p>
      </div>
    </article>
  )
}
