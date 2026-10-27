import { DIA_EM_GRAMAS } from './exemploDaLanding.ts'
import { ESPACO_DE_SECAO, LEAD, MARGEM, TITULO_XL } from './estiloDaLanding.ts'

const BASE = import.meta.env.BASE_URL

const FOTOS = [
  {
    arquivo: 'dois-copos-de-leite',
    largura: 1600,
    altura: 1571,
    alt: 'Dois copos de leite de tamanhos diferentes, lado a lado.',
    // D-605: o app mostra o líquido em mililitros (`unidadeDo`); o teste dos números confere.
    legenda: 'Leite e outros líquidos entram em mililitros.',
    enquadramento: 'object-[50%_60%]',
  },
  {
    arquivo: 'salada-com-frango',
    largura: 1600,
    altura: 1134,
    alt: 'Salada com frango grelhado, rúcula, pimentão e molho branco.',
    legenda: 'Salada com frango grelhado, rúcula e pimentão.',
    enquadramento: 'object-center',
  },
] as const

/** No celular (até 720 px), cada linha vira uma grade: o alimento, os gramas e as calorias na mesma linha. */
const CELULA = 'h-[1.5em] p-0 align-baseline font-medium max-[720px]:h-auto max-[720px]:w-auto max-[720px]:p-0'

/**
 * "Grama por grama" (spec landing-v3, D-603 e D-604): um dia de plano com o peso e as calorias de cada alimento, da Base
 * MetaNutri. Os gramas em destaque; as calorias em tinta suave. Não é o dia da Maria, e a legenda da tabela não diz que é.
 */
export function GramaPorGrama() {
  return (
    <section aria-labelledby="titulo-gramas" data-capitulo="afundado" className={`bg-landing-afundado ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-gramas" data-surge="" className={TITULO_XL}>
        Grama por grama
      </h2>
      <p data-surge="" className={`mt-5 max-w-[46ch] ${LEAD} text-landing-tinta-suave`}>
        Cada alimento do plano sai com o peso e as calorias da Base MetaNutri.
      </p>
      <div className="mt-11 grid grid-cols-2 gap-5 max-[720px]:grid-cols-1">
        {FOTOS.map((foto) => (
          <figure key={foto.arquivo} data-surge="" className="m-0">
            <img
              src={`${BASE}imagens/${foto.arquivo}.webp`}
              srcSet={`${BASE}imagens/${foto.arquivo}-800.webp 800w, ${BASE}imagens/${foto.arquivo}.webp ${foto.largura}w`}
              sizes="(max-width: 720px) 100vw, 50vw"
              width={foto.largura}
              height={foto.altura}
              loading="lazy"
              decoding="async"
              alt={foto.alt}
              className={`aspect-video w-full rounded-[4px] object-cover ${foto.enquadramento}`}
            />
            <figcaption className="mt-2.5 text-(length:--landing-fs-s) text-landing-tinta-suave">{foto.legenda}</figcaption>
          </figure>
        ))}
      </div>
      <table data-surge="" className="mt-16 w-full border-collapse text-(length:--landing-fs-l) max-[720px]:block">
        <caption className="sr-only">Um dia de plano, com os gramas e as calorias de cada alimento</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Alimento</th>
            <th scope="col">Gramas</th>
            <th scope="col">Energia</th>
          </tr>
        </thead>
        {DIA_EM_GRAMAS.map((refeicao, r) => (
          <tbody key={refeicao.refeicao} className="max-[720px]:block">
            <tr className="max-[720px]:block">
              <th
                colSpan={3}
                scope="rowgroup"
                className={`pb-2.5 text-left font-extrabold tracking-[-0.01em] text-landing-destaque max-[720px]:block max-[720px]:pt-9 max-[720px]:text-[20px] ${
                  r === 0 ? 'pt-0' : 'pt-11'
                }`}
              >
                {refeicao.refeicao}
              </th>
            </tr>
            {refeicao.itens.map((item) => (
              <tr key={item.alimento} className="max-[720px]:grid max-[720px]:grid-cols-[minmax(0,1fr)_auto_auto] max-[720px]:gap-x-3 max-[720px]:py-2 max-[720px]:text-[17px]">
                <td className={CELULA}>{item.alimento}</td>
                <td className={`${CELULA} w-[18%] pl-4 text-right font-extrabold tracking-[-0.02em] whitespace-nowrap`}>{item.gramas}</td>
                <td className={`${CELULA} w-[16%] pl-4 text-right whitespace-nowrap text-landing-tinta-suave`}>{item.kcal}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </section>
  )
}
