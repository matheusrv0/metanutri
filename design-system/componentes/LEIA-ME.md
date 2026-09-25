# Os componentes, um por um

Os 25 que vieram do export, mais os que nasceram depois (marcados).

Para que serve cada um, quando usar e a API de verdade. Resgatado dos
`*.prompt.md` do export e **corrigido para a API dos componentes portados**, que em
vários casos é diferente da do export: aqui os primitivos são shadcn/Radix compostos,
não componentes com props de conveniência.

Para ver tudo desenhado, com as variantes e os estados: rota `#/design-system`.
Para as regras que governam os valores: [DESIGN.md](../../DESIGN.md).

---

## forms/

### Button
Botão de ação em pílula. Um `default` (grafite) por tela; `accent` é ficha neutra para
ação secundária de destaque. Ícone entra como filho, não como prop.

```tsx
<Button><Plus aria-hidden="true" />Novo plano</Button>
<Button variant="accent">Cobrir</Button>
<Button variant="ghost" size="sm">Ajustar</Button>
<Button variant="outline" size="icon" aria-label="Remover"><X aria-hidden="true" /></Button>
<Button loading>Exportando</Button>
<Button block variant="soft">Nunca sugerir</Button>
```

Variantes: `default` · `accent` · `secondary` · `outline` · `soft` · `lightprimary` ·
`lighterror` · `ghost` · `destructive` · `link`.
Tamanhos: `sm` 32 · `default` 40 · `lg` 48 · `icon` · `iconsm`.
Estados: hover · `:active` (encolhe 3%) · foco (anel) · `disabled` · `loading` (`aria-busy`).

### Input
Campo de uma linha; 40 px, raio 12, foco com borda forte e anel. É o primitivo cru:
rótulo, dica, erro e sufixo vêm do `CampoTexto`.

```tsx
<Input placeholder="Ex.: Ana, retorno" />
<Input aria-invalid defaultValue="-4" />
<Input disabled defaultValue="Calculado pela fórmula" />
```

### CampoTexto
O campo que se usa nas telas: rótulo ligado por `htmlFor`, dica, erro com `role="alert"`,
sufixo de unidade dentro do campo e rótulo ocultável para leitor de tela quando a coluna
já nomeia o dado. *Arquivo de apoio: não é um dos 25.*

```tsx
<CampoTexto rotulo="Nome do plano" valor={nome} aoMudar={setNome} dica="Como aparece na folha." />
<CampoTexto rotulo="Gramas" valor={g} aoMudar={setG} numerico sufixo="g" rotuloOculto />
```

### CampoNumero
Campo numérico para gramas, kcal, kg e %. Aceita vírgula, guarda o texto enquanto a
pessoa digita (`68,` não apaga o campo) e **vazio é `null`, nunca 0**.

```tsx
<CampoNumero rotulo="Meta de energia" valor={1800} sufixo="kcal" aoMudar={setMeta} />
<CampoNumero rotulo="Gramas de arroz" rotuloOculto valor={150} sufixo="g" aoMudar={setG} />
```

### Label
Rótulo acima do campo. Sempre com `htmlFor`.

```tsx
<Label htmlFor="peso">Peso</Label>
```

### Textarea
Campo de várias linhas: anamnese, orientações, observações.

```tsx
<Textarea placeholder="Beber 2 L de água por dia…" />
```

### Select
Lista suspensa do Radix, composta. Funciona com teclado e com o seletor nativo do celular.

```tsx
<Select value={formula} onValueChange={setFormula}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="mifflin">Mifflin-St Jeor, 1990</SelectItem>
  </SelectContent>
</Select>
```

### Switch
Liga e desliga uma preferência — o único controle em forma de interruptor. O rótulo é
um `Label` ao lado, não uma prop.

```tsx
<Label htmlFor="crus">Incluir alimentos crus</Label>
<Switch id="crus" checked={v} onCheckedChange={setV} />
```

### GrupoOpcoes
Escolha única entre 2 a 4 opções curtas (sexo, preset, fórmula), todas visíveis — mais
rápido que uma lista suspensa. `valor={null}` é o estado vazio.

```tsx
<GrupoOpcoes
  rotulo="Tipo de referência"
  valor="individual"
  aoEscolher={set}
  opcoes={[
    { valor: 'individual', rotulo: 'Individual (RDA, 90%)' },
    { valor: 'coletivo', rotulo: 'Coletivo (EAR, 50%)' },
  ]}
/>
```

---

## display/

### Card
O recipiente de todo bloco. Composto por subcomponentes, não por props de título.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Onde você parou</CardTitle>
    <CardDescription>Os últimos planos abertos neste aparelho.</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>
<Card variant="sunken" tight>…</Card>
```

Variantes: `default` · `sunken` (painel interno) · `flat` (sem sombra) · `sheen` (vitrine,
raio 28). `tight` aperta o respiro.

### Badge
Selo de estado em pílula. **Cor sempre significa estado, nunca decora.**

```tsx
<Badge variant="lightSuccess" dot>Adequado</Badge>
<Badge variant="lightWarning" dot>Abaixo da meta</Badge>
<Badge variant="lightError" dot>Acima do limite superior</Badge>
<Badge variant="lightInfo">DRI 2019 · RDA</Badge>
<Badge variant="solid">Plus</Badge>
```

Variantes: `default` · `lightPrimary` · `lightSuccess` · `lightWarning` · `lightError` ·
`lightInfo` · `muted` · `solid` · `accent` · `outline`.

### Alert
Recado inline para lacuna de dado, aviso de armazenamento e ressalva de fórmula.

```tsx
<Alert variant="warning">Informe a idade para calcular o gasto energético.</Alert>
<Alert variant="info" title="Planos salvos só neste aparelho">
  <HardDrive aria-hidden="true" />
  Faça backup em Configurações antes de trocar de aparelho.
</Alert>
```

Variantes: `info` · `warning` · `error` · `success`.

### Progress
Barra fina de percentual: % do GET, completude do plano, uso.

```tsx
<Progress value={94} variant="success" />
```

Variantes: `default` · `success` · `warning` · `error` · `info` · `muted`.
Acima de 100 a barra satura; abaixo de 0 fica vazia.

### Separator
Fio de 1 px em `--border-subtle` entre grupos dentro de um cartão.

```tsx
<Separator />
<Separator orientation="vertical" />
```

### Table
Tabela de dado: cabeçalho sobre fundo afundado, linhas separadas por fio, numeral
tabular e a legenda de notação no rodapé. Composta.

```tsx
<Table>
  <TableHeader>
    <TableRow><TableHead>Nutriente</TableHead><TableHead className="text-right">No plano</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>Cálcio †</TableCell><TableCell className="numeros text-right">612 mg</TableCell></TableRow>
  </TableBody>
</Table>
<TableFootnotes>
  <span>† Total possivelmente subestimado.</span>
</TableFootnotes>
```

Marcas de notação: `†` subestimado · `‡` limite não se aplica · `—` não analisado.
Coluna de número leva `numeros`.

### Tooltip
Bolha no hover e no foco: explica a fonte de um número ou uma marca de notação.
**Nunca esconda informação obrigatória só aqui** — quem usa o celular não tem hover.

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><abbr>†</abbr></TooltipTrigger>
    <TooltipContent>2 alimentos do plano não têm este nutriente na tabela.</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Icon
Ícone do sistema. Lucide é o único conjunto. O que o componente acrescenta são as regras
do design system: traço 1,75, três tamanhos e a pastilha redonda.

O glifo entra como **componente importado**, não como nome em texto — é o que mantém o
pacote pequeno (o app roda offline). No export era `name="flame"`, porque a ferramenta
carregava o Lucide de CDN.

```tsx
import { Flame } from 'lucide-react'

<Icon glifo={Flame} />
<Icon glifo={Flame} tamanho="menu" pastilha="cinza" />
<Icon glifo={TriangleAlert} titulo="Atenção" />
```

Tamanhos: `linha` 16 · `menu` 18 · `cabecalho` 20.
Pastilhas: `nenhuma` · `cinza` · `forte` (grafite com glifo claro) · `acento`.
Sem `titulo` o ícone é decorativo e fica escondido do leitor de tela.

### Fontes
Procedência recolhida. A regra do produto é que nenhum número apareça sem dizer de onde
veio — mas a citação inteira ao lado de cada linha afoga a leitura. Então ela sai da vista
e fica a um clique, **uma vez por cartão**, com o rótulo dizendo a qual dado pertence.

Não é tooltip de propósito: no celular não existe passar o cursor, e o sistema proíbe
esconder informação obrigatória só no hover.

```tsx
<Fontes itens={[{ rotulo: 'IMC', texto: 'Ministério da Saúde. SISVAN, 2011' }]} />
<Fontes itens={[{ texto: 'Mifflin-St Jeor, 1990' }]} />   // uma só: o rótulo some
```

O botão expõe `aria-expanded` e `aria-controls`; os ícones são decorativos
(`aria-hidden`). *Nasceu depois do export, em 24/09/2026.*

---

## overlay/

### Dialog
Modal para confirmação curta e formulário pequeno (renomear, excluir, metas).

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Excluir plano?</DialogTitle>
      <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="destructive">Excluir</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sheet
Gaveta. À direita no computador para as sugestões do "Cobrir"; embaixo no celular;
à esquerda para o menu no celular.

```tsx
<Sheet open={aberto} onOpenChange={setAberto}>
  <SheetContent side={celular ? 'bottom' : 'right'}>
    <SheetTitle>Cobrir cálcio</SheetTitle>
    <SheetDescription>Faltam 388 mg para a meta.</SheetDescription>
  </SheetContent>
</Sheet>
```

### DropdownMenu
Lista de ação em popover (Exportar, o menu "⋯" do cartão).

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline"><Download aria-hidden="true" />Exportar</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Documento</DropdownMenuLabel>
    <DropdownMenuItem>Dieta para imprimir</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Copiar tabela de adequação</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## navigation/

### Tabs
Alterna entre visões do mesmo dado (Principal / Substituto 1 / Substituto 2).

```tsx
<Tabs value={op} onValueChange={setOp}>
  <TabsList>
    <TabsTrigger value="principal">Principal</TabsTrigger>
    <TabsTrigger value="s1">Substituto 1</TabsTrigger>
  </TabsList>
  <TabsContent value="principal">…</TabsContent>
</Tabs>
```

### ItemMenu
Entrada do menu lateral. Ativa vira pastilha clara sobre o cinza da barra, com
`aria-current="page"`. `icone` e `extra` são nós React.

```tsx
<ItemMenu icone={<LayoutDashboard aria-hidden="true" />} rotulo="Painel" ativo aoClicar={ir} />
<ItemMenu icone={<FolderOpen aria-hidden="true" />} rotulo="Planos" extra={<span className="numeros">12</span>} ativo={false} aoClicar={ir} />
<ItemMenu icone={<ClipboardList aria-hidden="true" />} rotulo="Plano aberto" detalhe="Ana Souza — retorno" ativo={false} aoClicar={ir} />
```

### EtapasDoCaso
O trilho de três etapas no topo de todo plano: Dados e medidas → Plano alimentar →
Adequação. As etapas vêm de `@/ui/navegacao.ts`, não de prop.

```tsx
<EtapasDoCaso abaAtual="plano" aoEscolher={setAba} />
```

---

## nutricao/

### CartaoDestaque
Cartão de número do painel. **No máximo um herói `grafite` por linha.**

```tsx
<CartaoDestaque tom="grafite" rotulo="Energia do dia" valor="1.850" unidade="kcal" apoio="Mifflin-St Jeor, 1990" icone={Flame} />
<CartaoDestaque tom="branco" rotulo="Pacientes" valor="8" apoio="Fichas com restrições" icone={UserRound} />
<CartaoDestaque tom="ocre" rotulo="Precisa de atenção" valor="2" apoio="Abaixo da meta" icone={TriangleAlert} aoClicar={ir} />
```

Tons: `branco` · `grafite` (herói) · `ocre` (precisa de atenção). Não há tom colorido:
neste sistema a cor pertence ao estado do nutriente. `children` entra abaixo do
número (o herói leva dois botões ali). Com `aoClicar` o cartão vira botão e sobe 2 px no
hover.

### BarraAdequacao
Barra de adequação de micronutriente. O trilho vai até 160% da meta.

```tsx
<BarraAdequacao nome="Cálcio" pct={61} detalhe="612 de 1.000 mg" fonte="DRI 2019 · RDA" />
<BarraAdequacao nome="Sódio" pct={128} temLimite detalhe="1.920 mg · UL 1.500" />
<BarraAdequacao nome="Vitamina D" pct={null} fonte="Não existe na TACO" />
```

Estados: `dentro` · `abaixo` · `acima` (só com `temLimite`) · **`sem dado`**, que é
hachura (`--pattern-nodata`) e nunca barra vazia — vazio se lê como zero, e zero seria
mentira. `marca` põe a nota (`†`) depois do nome.

### MedidorMacro
Onde o macro está na faixa: faixa recomendada em destaque, marcador do plano e a frase
que responde à pergunta de verdade ("Faltam 6 pontos para a faixa", "Dentro da faixa").
Anda a cada alimento adicionado.

Recebe o `ResultadoMacro` do domínio e calcula o resto — no export as posições vinham
soltas por prop.

```tsx
<MedidorMacro nome="Proteína" macro={macros.proteina} meta="Meta: 10 a 35% (faixa da idade)" />
<MedidorMacro nome="Fibra" macro={semMeta} meta={null} />
```

---

## efeitos/ — fora dos 25

Seis componentes de animação da área pública, vindos do repositório (21st.dev), não do
export: `aurora-background`, `grid-pattern`, `flow-button`, `origin-button`,
`text-highlight` e `timeline-animation`. Não entram na área de trabalho: lá não há
animação decorativa.
