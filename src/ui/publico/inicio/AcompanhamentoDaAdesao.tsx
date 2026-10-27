import { RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { CelularDasMissoes } from './CelularDasMissoes.tsx'
import { CELULAR_DO_EXEMPLO, MISSOES_DO_EXEMPLO } from './exemploDaLanding.ts'
import { APOIO, ESPACO_DE_SECAO, MARGEM, TITULO_DE_SECAO } from './estiloDaLanding.ts'
import { PainelDeAdesao } from './PainelDeAdesao.tsx'

/**
 * "Acompanhamento da adesão pelo celular" (spec landing-v3, D-659 a D-662): o celular do exemplo, "em segundos" e o
 * painel de Adesão. Marcar uma missão no celular acende a bolinha de hoje da Maria no painel. Ao abrir, as duas missões
 * da manhã estão marcadas.
 */
export function AcompanhamentoDaAdesao() {
  const [feitas, setFeitas] = useState<readonly boolean[]>(() => MISSOES_DO_EXEMPLO.map((_, i) => i < CELULAR_DO_EXEMPLO.marcadasAoAbrir))
  const virar = (indice: number) => setFeitas((antes) => antes.map((feita, i) => (i === indice ? !feita : feita)))

  return (
    <section aria-labelledby="titulo-adesao" className={`bg-landing-chao ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-adesao" data-surge="" className={TITULO_DE_SECAO}>
        Acompanhamento da adesão pelo celular
      </h2>
      <p data-surge="" className={APOIO}>
        O plano vira missões diárias que o paciente marca pelo celular, sem aplicativo. Você vê quem parou de marcar e chama pelo WhatsApp com uma
        mensagem pronta. Experimente: marque uma missão no celular.
      </p>
      <div
        data-surge=""
        className="relative isolate mt-12 grid grid-cols-[320px_auto_minmax(0,1fr)] items-center gap-8 overflow-hidden rounded-[32px] bg-landing-afundado p-12 before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(50%_70%_at_18%_50%,var(--landing-luz-cartao),transparent_70%)] before:content-[''] max-[1100px]:grid-cols-1 max-[1100px]:justify-items-center max-[1100px]:p-8 max-[720px]:rounded-3xl max-[720px]:px-3 max-[720px]:py-5"
      >
        <CelularDasMissoes feitas={feitas} aoVirar={virar} />
        {/* D-662: no celular, só o ícone gira; o texto continua na horizontal. */}
        <div aria-hidden="true" className="grid justify-items-center gap-2.5 text-[13px] font-bold text-landing-tinta-suave">
          <RefreshCcw size={28} strokeWidth={2} className="text-landing-destaque max-[1100px]:rotate-90" />
          <span>em segundos</span>
        </div>
        <PainelDeAdesao feitasHoje={feitas.filter(Boolean).length} />
      </div>
    </section>
  )
}
