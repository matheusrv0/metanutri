import { anguloNaFrase, FOTOS_POR_AVALIACAO, NOME_DO_ANGULO, textoDoTamanho, type ArmazenamentoDeFotos } from '@/domain/fotosDaAvaliacao.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import type { ArquivoDaAvaliacao } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { QuadroDaFoto } from './QuadroDaFoto.tsx'

interface ListaDeFotosProps {
  readonly armazenamento: ArmazenamentoDeFotos
  readonly fotos: readonly ArquivoDaAvaliacao[]
  /** AAAA-MM-DD da avaliação, para o texto alternativo. */
  readonly data: string
  readonly aoExcluir: (foto: ArquivoDaAvaliacao) => void
}

/**
 * As fotos de hoje (D-1454): cada uma com o ângulo, o tamanho e "Excluir"; as vagas, "Foto N de 5". Cinco por linha na
 * tela larga e três abaixo de 640 px, como o protótipo.
 */
export function ListaDeFotos({ armazenamento, fotos, data, aoExcluir }: ListaDeFotosProps) {
  const vagas = Array.from({ length: Math.max(0, FOTOS_POR_AVALIACAO - fotos.length) }, (_, i) => fotos.length + i + 1)
  return (
    <ul aria-label="Fotos de hoje" className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      {fotos.map((foto) => (
        <li key={foto.id} className="flex min-w-0 flex-col gap-1.5">
          <QuadroDaFoto key={foto.caminho} armazenamento={armazenamento} caminho={foto.caminho} alt={`Foto de ${anguloNaFrase(foto.angulo)}, ${dataCompleta(data)}`} />
          <div className="flex min-w-0 flex-col text-xs leading-snug text-muted-foreground">
            <span className="text-sm font-semibold text-heading">{NOME_DO_ANGULO[foto.angulo ?? 'outra']}</span>
            <span className="numeros">{textoDoTamanho(foto.bytes)}</span>
          </div>
          <Button variant="link" size="sm" className="self-start px-0 text-muted-foreground" aria-label={`Excluir a foto de ${anguloNaFrase(foto.angulo)}`} onClick={() => aoExcluir(foto)}>
            Excluir
          </Button>
        </li>
      ))}
      {vagas.map((n) => (
        <li key={`vaga-${n}`} className="flex min-w-0 flex-col gap-1.5">
          <div className="grid aspect-[3/4] w-full place-items-center rounded-md border border-dashed border-borderstrong text-xs text-muted-foreground">Vaga</div>
          <span className="text-xs text-muted-foreground">{`Foto ${n} de ${FOTOS_POR_AVALIACAO}`}</span>
        </li>
      ))}
    </ul>
  )
}
