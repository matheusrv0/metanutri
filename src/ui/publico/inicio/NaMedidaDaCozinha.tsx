import { DIA_EM_MEDIDAS } from './exemploDaLanding.ts'
import { ESPACO_DE_SECAO, LEAD, MARGEM, TITULO_XL } from './estiloDaLanding.ts'

const BASE = import.meta.env.BASE_URL

const FOTOS = [
  {
    arquivo: 'dois-copos-de-leite',
    largura: 1600,
    altura: 1571,
    alt: 'Dois copos de leite de tamanhos diferentes, lado a lado.',
    legenda: 'Dois copos, duas medidas: cada uma tem o seu peso no plano.',
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

/** No celular (até 720 px), a tabela vira linhas de alimento com a medida, os gramas e as calorias embaixo (CA-1488). */
const CELULA = 'h-[1.6em] p-0 align-baseline font-medium max-[720px]:h-auto max-[720px]:w-auto max-[720px]:p-0 max-[720px]:text-left'

/** "Na medida da cozinha" (D-534): o plano como a paciente come, com os gramas ao lado; as medidas e as calorias são da base. */
export function NaMedidaDaCozinha() {
  return (
    <section aria-labelledby="titulo-cozinha" data-capitulo="afundado" className={`bg-landing-afundado ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-cozinha" data-surge="" className={TITULO_XL}>
        Na medida da cozinha
      </h2>
      <p data-surge="" className={`mt-5 max-w-[42ch] ${LEAD} text-landing-tinta-suave`}>
        A paciente lê o plano como come: em concha, escumadeira e copo americano. Os gramas ficam ao lado, para quem pesa.
      </p>
      <div className="mt-14 grid grid-cols-2 gap-5 max-[720px]:grid-cols-1">
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
              className={`aspect-[4/3] w-full rounded-[4px] object-cover ${foto.enquadramento}`}
            />
            <figcaption className="mt-2.5 text-(length:--landing-fs-s) text-landing-tinta-suave">{foto.legenda}</figcaption>
          </figure>
        ))}
      </div>
      <table data-surge="" className="mt-[88px] w-full border-collapse text-(length:--landing-fs-l) max-[720px]:block">
        <caption className="sr-only">Um dia em medidas caseiras, com gramas e calorias</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Alimento</th>
            <th scope="col">Medida</th>
            <th scope="col">Gramas</th>
            <th scope="col">Energia</th>
          </tr>
        </thead>
        {DIA_EM_MEDIDAS.map((refeicao, r) => (
          <tbody key={refeicao.refeicao} className="max-[720px]:block">
            <tr className="max-[720px]:block">
              <th
                colSpan={4}
                scope="rowgroup"
                className={`pb-2.5 text-left font-extrabold tracking-[-0.01em] text-landing-teal-claro max-[720px]:block max-[720px]:pt-9 max-[720px]:text-[20px] ${
                  r === 0 ? 'pt-0' : 'pt-14'
                }`}
              >
                {refeicao.refeicao}
              </th>
            </tr>
            {refeicao.itens.map((item) => (
              <tr
                key={item.alimento}
                className="max-[720px]:grid max-[720px]:grid-cols-[auto_auto_1fr] max-[720px]:gap-x-2 max-[720px]:py-2 max-[720px]:text-[15px] max-[720px]:text-landing-tinta-suave"
              >
                <td className={`${CELULA} max-[720px]:col-span-full max-[720px]:text-[20px] max-[720px]:font-semibold max-[720px]:text-landing-tinta`}>
                  {item.alimento}
                </td>
                <td className={`${CELULA} w-[30%] text-landing-tinta-suave`}>{item.medida}</td>
                <td
                  className={`${CELULA} w-[13%] pl-4 text-right whitespace-nowrap text-landing-tinta-suave max-[720px]:before:content-['·_']`}
                >
                  {item.gramas}
                </td>
                <td className={`${CELULA} w-[13%] pl-4 text-right whitespace-nowrap max-[720px]:justify-self-end`}>{item.kcal}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </section>
  )
}
