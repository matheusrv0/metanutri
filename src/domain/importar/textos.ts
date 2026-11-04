// As frases de recusa da importação (spec importar-pacientes, D-917 e DP-IP-4, DP-IP-5), num lugar só: a tela mostra,
// o domínio decide qual. Os testes escrevem a frase inteira, para uma troca daqui aparecer neles.

export type Recusa =
  | { readonly tipo: 'nao-e-planilha'; readonly nome: string }
  | { readonly tipo: 'xls' }
  | { readonly tipo: 'ods' }
  | { readonly tipo: 'numbers' }
  | { readonly tipo: 'grande' }
  | { readonly tipo: 'linhas' }
  | { readonly tipo: 'vazia' }
  | { readonly tipo: 'ilegivel' }
  | { readonly tipo: 'aba-grande' }

export function textoDaRecusa(recusa: Recusa): string {
  switch (recusa.tipo) {
    case 'nao-e-planilha':
      return `“${recusa.nome}” não é uma planilha. Use CSV ou XLSX.`
    case 'xls':
      return 'Arquivo .xls antigo. No Excel, salve como .xlsx ou CSV.'
    case 'ods':
      return 'Arquivo .ods. No LibreOffice, salve como .xlsx ou CSV.'
    case 'numbers':
      return 'Arquivo .numbers. No Numbers, exporte como .xlsx ou CSV.'
    case 'grande':
      return 'A planilha passa de 5 MB. Divida em arquivos menores.'
    case 'linhas':
      return 'A planilha tem mais de 2.000 linhas. Divida em arquivos menores.'
    case 'vazia':
      return 'A planilha não tem pacientes.'
    case 'aba-grande':
      return 'Aba grande demais. Salve a aba dos pacientes como CSV.'
    case 'ilegivel':
      return 'Não foi possível ler esta planilha. Use CSV ou XLSX.'
  }
}
