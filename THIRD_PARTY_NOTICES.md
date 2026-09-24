# Avisos de terceiros

## MaterialM Free (design e componentes de interface)

Base do visual entre 15 e 21/09/2026: raios grandes, botão pílula e a estrutura de menu lateral mais cabeçalho, que
continuam valendo. A partir de 24/09/2026 a cor e a tipografia passaram a vir do design system em `design-system/`
(ver `DESIGN.md`); os componentes de `design-system/componentes/` ainda descendem deste template.
Template: https://github.com/wrappixel/MaterialM-Tailwind-Nextjs-Free

```
MIT License

Copyright (c) 2026 by WrapPixel

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Tabela TACO normalizada e medidas caseiras da POF

Dados reorganizados por https://github.com/brolesi/taco (licença MIT, © 2026 Fabio Fogliarini Brolesi) a partir de
publicações públicas da NEPA/UNICAMP (TACO, 4ª edição, 2011) e do IBGE (POF 2008-2009). Texto da licença em
`dados-brutos/taco/LICENSE`.

## Referências nutricionais e antropométricas

Valores factuais citados com fonte: NASEM (Dietary Reference Intakes, 2019 e Energy, 2023), OMS (curvas de crescimento
2006 e 2007), Ministério da Saúde (norma técnica do SISVAN, 2011) e Kac et al., Am J Clin Nutr 2021. Detalhes em
`dados-brutos/README.md`.

## Efeitos de interface da 21st.dev

Os seis componentes de `design-system/componentes/efeitos/` (fundo aurora, padrão de grade, botão de fluxo, botão
origin, marca-texto e linha do tempo animada) são adaptações de componentes publicados em https://21st.dev, usados
apenas na área pública. Não fazem parte dos 25 componentes do design system.

## Referências visuais do design system

O export que originou `design-system/` (Claude Design, 24/09/2026) trazia oito capturas de um estudo de caso de painel
financeiro de terceiros, usadas só como referência de linguagem visual. **Elas não foram incorporadas ao projeto**: nem
a marca, nem o texto, nem as telas de lá aparecem no MetaNutri, e os arquivos não estão neste repositório.

Os ícones são do conjunto **Lucide** (licença ISC, © Lucide Contributors), embutidos via `lucide-react` para funcionar
offline. As fontes **Archivo**, **Figtree** e **Inter** são distribuídas sob a SIL Open Font License 1.1 e embutidas via
`@fontsource`.
