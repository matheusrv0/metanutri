import { ExternalLink } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'

interface TelaAjudaProps {
  readonly aoIrPara: (tela: 'painel' | 'pacientes' | 'casos' | 'produtos' | 'config') => void
}

const PASSOS = [
  { titulo: 'Cadastre o paciente', texto: 'Nome, nascimento e restrições. Os planos seguintes já nascem com esses dados.', tela: 'pacientes' as const },
  { titulo: 'Escolha o caminho', texto: 'Prescrição rápida para retorno e ajuste; atendimento completo quando houver avaliação.', tela: 'painel' as const },
  { titulo: 'Monte o plano', texto: 'Digite "150 arroz int" e tecle Enter. Medida caseira e kcal aparecem sozinhas.', tela: 'casos' as const },
  { titulo: 'Confira a adequação', texto: 'Veja o que falta de micronutriente e use o cobrir para fechar a falta.', tela: 'casos' as const },
  { titulo: 'Entregue', texto: 'Dieta para imprimir vira PDF no próprio navegador; o Word segue o modelo do estágio.', tela: 'casos' as const },
]

const REFERENCIAS = [
  { assunto: 'Composição dos alimentos', fonte: 'NEPA/UNICAMP. TACO, 4ª edição, 2011', url: 'https://www.cfn.org.br/wp-content/uploads/2017/03/taco_4_edicao_ampliada_e_revisada.pdf' },
  { assunto: 'Medidas caseiras', fonte: 'IBGE. POF 2008-2009, medidas referidas', url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html' },
  { assunto: 'Referências de ingestão', fonte: 'NASEM. DRI, Apêndice J, 2019', url: 'https://www.ncbi.nlm.nih.gov/books/NBK545442/' },
  { assunto: 'Energia', fonte: 'NASEM. DRI for Energy, 2023 · Mifflin-St Jeor, 1990 · Harris-Benedict, 1918', url: 'https://www.ncbi.nlm.nih.gov/books/NBK591034/' },
  { assunto: 'Crescimento', fonte: 'OMS. Child Growth Standards 2006 e Growth Reference 5-19, 2007', url: 'https://www.who.int/tools/growth-reference-data-for-5to19-years' },
  { assunto: 'Classificação antropométrica', fonte: 'Ministério da Saúde. SISVAN, 2011', url: 'https://pesquisa.bvsalud.org/bvsms/resource/pt/mis-63607' },
  { assunto: 'Ganho de peso na gestação', fonte: 'Kac G, Carrilho TRB et al. Am J Clin Nutr 2021', url: 'https://pubmed.ncbi.nlm.nih.gov/33740020/' },
  { assunto: 'Dobras cutâneas', fonte: 'Jackson e Pollock, 1978 e 1980 · Siri, 1961 · Faulkner, 1968', url: 'https://pubmed.ncbi.nlm.nih.gov/718832/' },
  { assunto: 'Produtos de rótulo', fonte: 'Open Food Facts, base colaborativa aberta', url: 'https://world.openfoodfacts.org/' },
]

/** Primeiros passos e de onde vem cada número. */
export function TelaAjuda({ aoIrPara }: TelaAjudaProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Primeiros passos</CardTitle>
          <CardDescription>Cinco minutos até a primeira dieta entregue.</CardDescription>
        </CardHeader>
        <ol className="flex flex-col">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3 border-b border-border py-3 last:border-0">
              <span aria-hidden="true" className="numeros flex size-7 shrink-0 items-center justify-center border border-borderdefault text-sm font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-heading">{p.titulo}</p>
                <p className="text-sm text-muted-foreground">{p.texto}</p>
              </div>
              <button
                type="button"
                onClick={() => aoIrPara(p.tela)}
                className="shrink-0 self-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Ir
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>De onde vêm os números</CardTitle>
          <CardDescription>Cada cálculo mostra a fonte na própria tela. Aqui está a lista inteira, com os links.</CardDescription>
        </CardHeader>
        <ul className="flex flex-col">
          {REFERENCIAS.map((r) => (
            <li key={r.assunto} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-heading">{r.assunto}</p>
                <p className="text-xs text-muted-foreground">{r.fonte}</p>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Abrir
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Limites que você precisa conhecer</CardTitle>
          <CardDescription>Nada aqui é opinião do sistema; são fatos sobre os dados e sobre a lei.</CardDescription>
        </CardHeader>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>A tabela de composição não traz vitamina D, vitamina B12 nem folato. A adequação desses três não aparece.</li>
          <li>Açúcares e gordura saturada só existem em produto que você cadastra pelo rótulo.</li>
          <li>Os números de energia, dobras e ganho de peso ainda não foram conferidos por nutricionista.</li>
          <li>A prescrição de dieta é privativa de nutricionista com registro no CRN, pela Lei 8.234/1991.</li>
          <li>Tudo fica guardado só neste navegador. Faça backup em Configurações antes de trocar de aparelho.</li>
        </ul>
        <button
          type="button"
          onClick={() => aoIrPara('config')}
          className="self-start rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ir para Configurações
        </button>
      </Card>
    </div>
  )
}
