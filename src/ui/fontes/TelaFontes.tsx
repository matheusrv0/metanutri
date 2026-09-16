import { ExternalLink } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '../componentes/card.tsx'

interface Fonte {
  readonly titulo: string
  readonly uso: string
  readonly referencia: string
  readonly url: string
}

const FONTES: readonly Fonte[] = [
  {
    titulo: 'Composição dos alimentos',
    uso: 'Energia, macronutrientes e micronutrientes de 597 alimentos, por 100 g.',
    referencia: 'NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição, 2011.',
    url: 'https://github.com/brolesi/taco',
  },
  {
    titulo: 'Medidas caseiras',
    uso: 'Conversão entre gramas e medidas como colher, concha e unidade.',
    referencia: 'IBGE. Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil (POF 2008-2009).',
    url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html',
  },
  {
    titulo: 'Referências de ingestão (DRI)',
    uso: 'EAR, RDA, AI, UL, CDRR do sódio e faixas de distribuição de macronutrientes.',
    referencia: 'NASEM. Dietary Reference Intakes for Sodium and Potassium, Apêndice J. Washington (DC); 2019.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK545442/',
  },
  {
    titulo: 'Necessidade energética',
    uso: 'Equações para crianças, adolescentes, gestantes e lactantes.',
    referencia: 'NASEM. Dietary Reference Intakes for Energy. Washington (DC); 2023.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK591034/',
  },
  {
    titulo: 'Taxa metabólica basal de adultos',
    uso: 'Fórmulas de Mifflin-St Jeor e Harris-Benedict.',
    referencia: 'Mifflin MD, St Jeor ST et al. Am J Clin Nutr 1990;51:241-7 · Harris JA, Benedict FG. Proc Natl Acad Sci 1918;4:370-3.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    titulo: 'Crescimento de crianças e adolescentes',
    uso: 'Escore-z de IMC e estatura para a idade.',
    referencia: 'OMS. Child Growth Standards (2006) e Growth Reference 5-19 years (2007).',
    url: 'https://www.who.int/tools/growth-reference-data-for-5to19-years',
  },
  {
    titulo: 'Classificação antropométrica',
    uso: 'Pontos de corte de IMC para adultos, idosos, crianças e adolescentes.',
    referencia: 'Ministério da Saúde. Orientações para a coleta e análise de dados antropométricos (SISVAN), 2011.',
    url: 'https://pesquisa.bvsalud.org/bvsms/resource/pt/mis-63607',
  },
  {
    titulo: 'Ganho de peso na gestação',
    uso: 'Faixas de ganho de peso pelo IMC pré-gestacional.',
    referencia: 'Kac G, Carrilho TRB et al. Am J Clin Nutr 2021;113:1351-1360.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33740020/',
  },
]

export function TelaFontes() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[70ch] text-muted-foreground">
        O MetaNutri apoia o estudo e o planejamento. A prescrição é responsabilidade do nutricionista. Estas são as fontes de cada número
        mostrado no planejador.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {FONTES.map((f) => (
          <Card key={f.titulo}>
            <CardHeader>
              <CardTitle>{f.titulo}</CardTitle>
              <CardDescription>{f.uso}</CardDescription>
            </CardHeader>
            <p className="text-sm">{f.referencia}</p>
            <a
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 self-start rounded-full text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Abrir fonte
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Card>
        ))}
      </div>
    </div>
  )
}
