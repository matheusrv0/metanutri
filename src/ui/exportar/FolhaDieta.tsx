import { medidaEquivalente } from '@/domain/busca.ts'
import { listaDeCompras, missoesDoPlano } from '@/domain/missoes.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import { OPCOES, type Caso, type ItemPlano, type OpcaoId, type Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

interface FolhaDietaProps {
  readonly caso: Caso
  readonly plano: Plano
}

const NOME_OPCAO: Record<OpcaoId, string> = { principal: 'Principal', substituto1: 'Substituto 1', substituto2: 'Substituto 2' }

/** "Arroz, tipo 1, cozido — 4 colheres de sopa (100 g)". Sem medida caseira, só as gramas. */
function descrever(item: ItemPlano): string {
  const alimento = buscarAlimento(item.alimentoId)
  const medida = medidaEquivalente(item.alimentoId, item.gramas)
  const gramas = `${formatarNumero(item.gramas, 0)} g`
  const quantidade = medida ? `${medida.texto} (${gramas})` : gramas
  return `${alimento?.descricao ?? 'Alimento removido'} — ${quantidade}`
}

const dataBr = (iso: string | null) => {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/**
 * Folha da dieta para o paciente: só o que ele precisa ler.
 * Some da tela na impressão tudo que é interface; o navegador salva em PDF.
 */
export function FolhaDieta({ caso, plano }: FolhaDietaProps) {
  const totais = totaisDoPlano(plano, buscarAlimento)
  const energia = calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual })
  const kcal = totais.nutrientes.energia_kcal.total
  const missoes = missoesDoPlano(plano, { pesoKg: caso.pesoKg })
  const compras = listaDeCompras(plano)

  return (
    <article className="folha-dieta mx-auto flex max-w-[820px] flex-col gap-5 bg-card p-8 text-[13px] leading-relaxed text-tinta">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-fioforte pb-3">
        <div>
          <h2 className="font-titulo text-2xl font-bold leading-tight">Plano alimentar</h2>
          <p className="text-sm text-muted-foreground">{caso.nome.trim() || 'Sem nome'}</p>
        </div>
        <dl className="numeros grid gap-x-6 gap-y-0.5 text-right text-xs sm:grid-cols-2">
          {caso.dataConsulta ? (
            <div>
              <dt className="inline text-muted-foreground">Data: </dt>
              <dd className="inline">{dataBr(caso.dataConsulta)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline text-muted-foreground">Energia do plano: </dt>
            <dd className="inline">{`${formatarNumero(kcal, 0)} kcal`}</dd>
          </div>
          {energia.get !== null ? (
            <div>
              <dt className="inline text-muted-foreground">Meta do dia: </dt>
              <dd className="inline">{`${formatarNumero(energia.get, 0)} kcal`}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="flex flex-col gap-4">
        {plano.refeicoes.map((refeicao) => (
          <section key={refeicao.id} className="break-inside-avoid border-b border-fio pb-3 last:border-0">
            <h3 className="font-titulo text-[15px] font-semibold">
              <span className="numeros mr-2">{refeicao.horario}</span>
              {refeicao.nome}
            </h3>
            {OPCOES.map((opcao) => {
              const itens = refeicao.opcoes[opcao].filter((i) => i.gramas > 0)
              if (itens.length === 0) return null
              return (
                <div key={opcao} className="mt-1.5">
                  <p className="rotulo">{NOME_OPCAO[opcao]}</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {itens.map((item) => (
                      <li key={item.id}>{descrever(item)}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {OPCOES.every((o) => refeicao.opcoes[o].filter((i) => i.gramas > 0).length === 0) ? (
              <p className="mt-1 text-muted-foreground">Sem alimentos nesta refeição.</p>
            ) : null}
          </section>
        ))}
      </div>

      <section className="break-inside-avoid">
        <h3 className="font-titulo text-[15px] font-semibold">Missões do dia</h3>
        <ul className="mt-1 flex flex-col gap-1">
          {missoes.map((m) => (
            <li key={m.id} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 inline-block size-3.5 shrink-0 border border-fioforte" />
              <span>{m.texto}</span>
            </li>
          ))}
        </ul>
        {missoes.length === 0 ? <p className="mt-1 text-muted-foreground">As missões aparecem quando o plano tiver alimentos.</p> : null}
      </section>

      <section className="break-inside-avoid">
        <h3 className="font-titulo text-[15px] font-semibold">Lista de compras do dia</h3>
        <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
          {compras.map((c) => (
            <li key={c.descricao} className="numeros">{`${c.descricao} — ${formatarNumero(c.gramas, 0)} g`}</li>
          ))}
        </ul>
        {compras.length === 0 ? <p className="mt-1 text-muted-foreground">Sem alimentos no plano ainda.</p> : null}
      </section>

      {caso.orientacoes.trim() ? (
        <section className="break-inside-avoid">
          <h3 className="font-titulo text-[15px] font-semibold">Orientações</h3>
          <p className="mt-1 whitespace-pre-wrap">{caso.orientacoes}</p>
        </section>
      ) : null}

      {caso.receitas.trim() ? (
        <section className="break-inside-avoid">
          <h3 className="font-titulo text-[15px] font-semibold">Receitas</h3>
          <p className="mt-1 whitespace-pre-wrap">{caso.receitas}</p>
        </section>
      ) : null}

      <footer className="mt-2 border-t border-fioforte pt-3 text-xs text-muted-foreground">
        <p>
          {caso.modo === 'rapido'
            ? 'Plano montado em prescrição rápida: sem avaliação antropométrica.'
            : 'Plano montado com avaliação antropométrica.'}{' '}
          Documento de apoio ao planejamento. A prescrição é responsabilidade do nutricionista.
        </p>
        <p className="mt-1">
          {[caso.estagiario.trim() && `Elaborado por ${caso.estagiario.trim()}`, caso.preceptor.trim() && `Responsável: ${caso.preceptor.trim()}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </footer>
    </article>
  )
}
