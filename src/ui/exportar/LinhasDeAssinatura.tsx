import type { AssinaturaDaFolha } from '@/domain/folhaDieta.ts'

/**
 * As linhas de assinatura do fim da folha (CA-313): uma para nutricionista, duas para estágio, uma "Assinatura"
 * sem ninguém. Saiu da `FolhaDieta` para servir também às folhas do paciente.
 */
export function LinhasDeAssinatura({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  const linhas =
    assinatura.tipo === 'nutricionista'
      ? [{ nome: assinatura.linha, papel: 'Nutricionista' }]
      : assinatura.tipo === 'estagio'
        ? [
            { nome: assinatura.estagiario, papel: 'Estagiário(a)' },
            { nome: assinatura.preceptor, papel: 'Preceptor(a)' },
          ]
        : [{ nome: '', papel: 'Assinatura' }]
  return (
    <div role="group" aria-label="Assinaturas" className="grid gap-8 sm:grid-cols-2">
      {linhas.map((l) => (
        <div key={l.papel} className={`flex flex-col items-center gap-1 pt-10 ${linhas.length === 1 ? 'sm:col-start-2' : ''}`}>
          <span aria-hidden="true" className="w-full border-b border-foreground" />
          {/* Centrado como o papel embaixo: um nome longo quebrava alinhado à esquerda (spec ajustes-mobile, M-026). */}
          {l.nome ? <span className="text-center font-semibold text-heading">{l.nome}</span> : null}
          <span className="text-muted-foreground">{l.papel}</span>
        </div>
      ))}
    </div>
  )
}
