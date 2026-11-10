import { useState } from 'react'
import { ANGULOS_DA_COMPARACAO, anguloInicial, anguloNaFrase, comparacaoDeFotos, NOME_DO_ANGULO, type ArmazenamentoDeFotos } from '@/domain/fotosDaAvaliacao.ts'
import type { AvaliacaoDoHistorico } from '@/domain/historicoAntropometrico.ts'
import type { AnguloDaFoto } from '@/domain/tipos.ts'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { QuadroDaFoto } from './QuadroDaFoto.tsx'

interface CompararFotosProps {
  readonly armazenamento: ArmazenamentoDeFotos
  readonly anterior: AvaliacaoDoHistorico
  readonly atual: AvaliacaoDoHistorico
}

const OPCOES = ANGULOS_DA_COMPARACAO.map((valor) => ({ valor, rotulo: NOME_DO_ANGULO[valor] }))

/**
 * "Comparar fotos" (D-1455 e D-1510): o ângulo, a foto dele na avaliação de antes e na de hoje lado a lado, e as
 * diferenças de peso, cintura e soma das dobras com a leitura da mudança mínima detectável. Só na ficha (D-1456).
 */
export function CompararFotos({ armazenamento, anterior, atual }: CompararFotosProps) {
  const [angulo, setAngulo] = useState<AnguloDaFoto>(() => anguloInicial(anterior, atual))
  const { quadros, diferencas } = comparacaoDeFotos(anterior, atual, angulo)
  return (
    <div role="region" aria-label="Comparar fotos" className="flex flex-col gap-3.5">
      <SeletorSegmentado rotulo="Ângulo" opcoes={OPCOES} valor={angulo} aoEscolher={setAngulo} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {quadros.map((q, i) => (
          <figure key={i === 0 ? 'antes' : 'agora'} className="m-0 flex min-w-0 flex-col gap-1.5">
            {q.foto ? (
              <QuadroDaFoto key={q.foto.caminho} armazenamento={armazenamento} caminho={q.foto.caminho} alt={`Foto de ${anguloNaFrase(angulo)}, ${q.data}`} />
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center rounded-md border border-dashed border-borderstrong px-3 text-center text-xs text-muted-foreground">
                {q.falta}
              </div>
            )}
            <figcaption className="flex flex-col text-xs leading-snug text-muted-foreground">
              <span className="numeros text-sm font-semibold text-heading">{q.data}</span>
              <span className="numeros">{q.detalhe}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {diferencas.length > 0 ? (
        <ul aria-label="Diferenças entre as avaliações" className="flex flex-col">
          {diferencas.map((d) => (
            <li key={d.nome} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-t border-border py-2.5 first:border-t-0">
              <span className="text-sm text-foreground">{d.nome}</span>
              <span className="numeros text-right text-sm font-semibold text-heading">{d.valor}</span>
              <span className="numeros col-span-2 text-xs text-muted-foreground">{d.detalhe}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
