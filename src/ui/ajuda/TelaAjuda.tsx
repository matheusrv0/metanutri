import { ExternalLink } from 'lucide-react'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { useNuvem } from '../estado/contextoNuvem.ts'

interface TelaAjudaProps {
  readonly aoIrPara: (tela: 'painel' | 'pacientes' | 'casos' | 'produtos' | 'config' | 'fontes') => void
}

const PASSOS = [
  { titulo: 'Cadastre o paciente', texto: 'Nome, nascimento e restrições. Os próximos planos já começam com esses dados.', tela: 'pacientes' as const },
  { titulo: 'Escolha o caminho', texto: 'Prescrição rápida para retorno e ajuste; atendimento completo quando houver avaliação.', tela: 'painel' as const },
  { titulo: 'Monte o plano', texto: 'Digite “1 concha de feijão” e tecle Enter. A medida, os gramas e as kcal aparecem juntos.', tela: 'casos' as const },
  { titulo: 'Confira a adequação', texto: 'Veja os nutrientes abaixo da meta e use o botão Cobrir.', tela: 'casos' as const },
  { titulo: 'Entregue', texto: 'O plano impresso é salvo em PDF pelo próprio navegador; o aconselhamento e o memorial são gerados em Word.', tela: 'casos' as const },
]

const REFERENCIAS = [
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
  // Com conta, os dados ficam na nuvem (spec dados-na-nuvem, D-128); no modo local, só no navegador.
  const nuvem = useNuvem()
  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Primeiros passos</CardTitle>
        </CardHeader>
        <ol className="flex flex-col">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3 border-b border-border py-3 last:border-0">
              {/* M-025 (spec ajustes-mobile): o número em círculo, não no quadrado da direção antiga. */}
              <span aria-hidden="true" className="numeros flex size-7 shrink-0 items-center justify-center rounded-full border border-borderdefault text-sm font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-heading">{p.titulo}</p>
                <p className="text-sm text-muted-foreground">{p.texto}</p>
              </div>
              <button
                type="button"
                onClick={() => aoIrPara(p.tela)}
                className="inline-flex shrink-0 items-center justify-center self-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:size-11"
              >
                Ir
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Fontes dos dados</CardTitle>
          <CardDescription>Cada cálculo mostra a fonte na própria tela. Aqui está a lista inteira, com os links.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-heading">Composição e medidas caseiras dos alimentos</p>
            <p className="text-xs text-muted-foreground">{NOME_DA_BASE}</p>
          </div>
          <button
            type="button"
            onClick={() => aoIrPara('fontes')}
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Fontes da base
          </button>
        </div>
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
                className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11"
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
        </CardHeader>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>
            Vitamina D, vitamina E, folato, vitamina B12 e selênio vêm de alimento equivalente do USDA e faltam em boa parte das
            preparações brasileiras. Quando o dado falta, a linha da adequação recebe †.
          </li>
          <li>Açúcares e gordura saturada só aparecem nos produtos cadastrados pelo rótulo.</li>
          <li>A prescrição de dieta é privativa de nutricionista com registro no CRN, pela Lei 8.234/1991.</li>
          <li>
            {nuvem === null
              ? 'Tudo fica salvo só neste navegador. Faça backup em Configurações antes de trocar de aparelho.'
              : 'Seus dados ficam salvos na sua conta, na nuvem. Sem internet, a edição fica travada até a conexão voltar.'}
          </li>
        </ul>
        <button
          type="button"
          onClick={() => aoIrPara('config')}
          className="inline-flex items-center self-start rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11"
        >
          Ir para Configurações
        </button>
      </Card>
    </div>
  )
}
