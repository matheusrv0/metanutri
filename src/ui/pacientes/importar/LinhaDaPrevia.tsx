import { Fragment, memo, useId } from 'react'
import { dataCompleta } from '@/domain/formatarData.ts'
import type { Correcao, LinhaDaPrevia as Linha } from '@/domain/importar/previa.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { CaixaDeMarcar } from '@ds/componentes/forms/CaixaDeMarcar.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { ListaNativa } from '@ds/componentes/forms/ListaNativa.tsx'
import { cn } from '@ds/lib/cn.ts'

/**
 * As colunas da prévia. No computador (1024 px ou mais): caixa, linha, nome, sexo, nascimento, telefone e situação.
 * Abaixo disso, a lista de duas linhas do CA-1948: a caixa, o nome e a situação em cima; o sexo e o nascimento
 * embaixo, lado a lado. Nada rola para o lado em 360 px (D-800).
 */
export const GRADE_DA_PREVIA =
  'grid grid-cols-[2.75rem_minmax(0,5.5rem)_minmax(0,1fr)] gap-x-3 gap-y-2 lg:grid-cols-[2.75rem_2.75rem_minmax(0,1.6fr)_5.5rem_8.75rem_minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-y-0'

interface LinhaDaPreviaProps {
  readonly linha: Linha
  readonly aoMarcar: (numero: number, marcada: boolean) => void
  readonly aoCorrigir: (numero: number, mudanca: Correcao) => void
}

const varianteDoMotivo = (linha: Linha) => {
  if (linha.fora !== null) return 'muted' as const
  if (linha.problemas.length > 0) return 'lightWarning' as const
  return linha.marcada ? ('lightSuccess' as const) : ('muted' as const)
}

/**
 * Uma linha da prévia (D-909). A linha com data inválida ou sexo que não se leu mostra o campo para corrigir ali mesmo;
 * o motivo descreve a caixa de marcar e o campo com erro (CA-1947). O que veio da planilha é texto, nunca HTML
 * (CA-1946).
 */
export const LinhaDaPrevia = memo(function LinhaDaPrevia({ linha, aoMarcar, aoCorrigir }: LinhaDaPreviaProps) {
  const id = useId()
  const idMotivo = `${id}-motivo`
  const fora = linha.fora !== null
  const erroDaData = linha.problemas.includes('data')
  const erroDoSexo = linha.problemas.some((p) => p !== 'data')
  const apagado = fora || (!linha.marcada && linha.problemas.length === 0)

  return (
    <div role="row" className={cn(GRADE_DA_PREVIA, 'items-center border-b border-border py-3 last:border-b-0 lg:min-h-14 lg:px-1 lg:py-2')}>
      <span role="cell" className="row-span-3 self-start lg:row-span-1 lg:self-center">
        <CaixaDeMarcar rotulo={`Importar ${linha.nome}`} rotuloOculto marcada={linha.marcada} desativada={fora} descritaPor={idMotivo} aoMudar={(marcada) => aoMarcar(linha.numero, marcada)} />
      </span>
      <span role="cell" className="numeros hidden text-sm text-muted-foreground lg:block">
        {linha.numero}
      </span>
      <span role="cell" className="col-span-2 min-w-0 lg:col-span-1">
        {/* D-801: o nome identifica: até duas linhas, com o nome inteiro no `title`. */}
        <span title={linha.nome} className={cn('line-clamp-2 break-words text-sm font-semibold', apagado ? 'text-muted-foreground' : 'text-heading')}>
          {linha.nome}
        </span>
        <span className="block truncate text-xs text-muted-foreground" title={linha.email || undefined}>
          <span className="numeros lg:hidden">{`Linha ${linha.numero}${linha.email ? ' · ' : ''}`}</span>
          {linha.email}
        </span>
      </span>
      <span role="cell" className="col-start-2 row-start-3 min-w-0 text-sm lg:col-start-auto lg:row-start-auto">
        {linha.corrigeSexo ? (
          <ListaNativa
            aria-label={`Sexo de ${linha.nome}`}
            aria-invalid={erroDoSexo || undefined}
            aria-describedby={idMotivo}
            value={linha.sexo ?? ''}
            onChange={(evento) => aoCorrigir(linha.numero, { sexo: evento.target.value === 'F' || evento.target.value === 'M' ? evento.target.value : '' })}
          >
            <option value="">—</option>
            <option value="F">F</option>
            <option value="M">M</option>
          </ListaNativa>
        ) : (
          <span className={apagado ? 'text-muted-foreground' : 'text-foreground'}>{linha.sexo ?? '—'}</span>
        )}
      </span>
      <span role="cell" className="col-start-3 row-start-3 min-w-0 text-sm lg:col-start-auto lg:row-start-auto">
        {linha.corrigeData ? (
          <Input
            aria-label={`Data de nascimento de ${linha.nome}`}
            aria-invalid={erroDaData || undefined}
            aria-describedby={idMotivo}
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            value={linha.dataTexto}
            onChange={(evento) => aoCorrigir(linha.numero, { data: evento.target.value })}
            className="numeros"
          />
        ) : (
          <span className={cn('numeros', apagado ? 'text-muted-foreground' : 'text-foreground')}>{linha.nascimento ? dataCompleta(linha.nascimento) : linha.dataTexto || '—'}</span>
        )}
      </span>
      <span role="cell" className={cn('numeros hidden truncate text-sm lg:block', apagado ? 'text-muted-foreground' : 'text-foreground')} title={linha.telefone || undefined}>
        {linha.telefone || '—'}
      </span>
      <span role="cell" className="col-span-2 col-start-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-auto lg:row-start-auto">
        {/* break-ui: dois problemas são dois selos (a pílula de duas linhas não se lê); lidos como um motivo só. */}
        <span id={idMotivo} className="flex flex-wrap gap-1">
          {linha.motivo.split(' · ').map((parte, indice) => (
            <Fragment key={parte}>
              {indice > 0 ? (
                <>
                  {' '}
                  <span className="sr-only">·</span>{' '}
                </>
              ) : null}
              <Badge variant={varianteDoMotivo(linha)} className="whitespace-normal">
                {parte}
              </Badge>
            </Fragment>
          ))}
        </span>
      </span>
    </div>
  )
})
