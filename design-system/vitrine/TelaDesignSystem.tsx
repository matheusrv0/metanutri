import { useState } from 'react'
import { Flame, FolderOpen, Download, Sparkles, Search, TriangleAlert, ArrowLeftRight, LayoutDashboard, BookOpen } from 'lucide-react'
import type { ResultadoMacro } from '@/domain/macros.ts'
import { useTema } from '@/ui/tema/contextoTema.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Fontes } from '@ds/componentes/display/Fontes.tsx'
import { Icon } from '@ds/componentes/display/Icon.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { Separator } from '@ds/componentes/display/separator.tsx'
import { Table, TableBody, TableCell, TableFootnotes, TableHead, TableHeader, TableRow } from '@ds/componentes/display/table.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ds/componentes/display/tooltip.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ds/componentes/forms/select.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { EtapasDoCaso } from '@ds/componentes/navigation/EtapasDoCaso.tsx'
import { ItemMenu } from '@ds/componentes/navigation/ItemMenu.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ds/componentes/navigation/tabs.tsx'
import { BarraAdequacao } from '@ds/componentes/nutricao/BarraAdequacao.tsx'
import { CartaoDestaque } from '@ds/componentes/nutricao/CartaoDestaque.tsx'
import { MedidorMacro } from '@ds/componentes/nutricao/MedidorMacro.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ds/componentes/overlay/dialog.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@ds/componentes/overlay/sheet.tsx'

/*
 * Vitrine da biblioteca: os 25 componentes com todas as variantes e estados,
 * nos dois temas. É a prova viva de DESIGN.md — se algo aqui destoa do contrato,
 * um dos dois está errado.
 */

function Secao({ nome, arquivo, descricao, children }: { nome: string; arquivo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section aria-label={nome} className="flex flex-col gap-3">
      <div>
        <h2 className="card-title">{nome}</h2>
        <p className="text-xs text-muted-foreground">
          {descricao} · <code className="numeros">{arquivo}</code>
        </p>
      </div>
      <Card className="gap-5">{children}</Card>
    </section>
  )
}

function Linha({ estado, children }: { estado: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="rotulo">{estado}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

const MACRO_DENTRO: ResultadoMacro = {
  gramas: 78.4,
  pctKcal: 17.6,
  gPorKg: 1.26,
  meta: { tipo: 'pct', min: 10, max: 35 },
  origemMeta: 'amdr',
  estado: 'dentro',
}
const MACRO_ABAIXO: ResultadoMacro = { ...MACRO_DENTRO, gramas: 30.1, pctKcal: 6.8, gPorKg: 0.48, estado: 'abaixo' }
const MACRO_ACIMA: ResultadoMacro = { ...MACRO_DENTRO, gramas: 190.2, pctKcal: 42.9, gPorKg: 3.06, estado: 'acima' }
const MACRO_SEM_META: ResultadoMacro = { gramas: 62, pctKcal: null, gPorKg: null, meta: null, origemMeta: null, estado: null }

export function TelaDesignSystem() {
  const { preferencia, definir } = useTema()
  const [texto, setTexto] = useState('Arroz integral cozido')
  const [numero, setNumero] = useState<number | null>(150)
  const [opcao, setOpcao] = useState<'feminino' | 'masculino'>('feminino')
  const [ligado, setLigado] = useState(true)
  const [aba, setAba] = useState<'caso' | 'plano' | 'adequacao'>('plano')
  const [menu, setMenu] = useState('painel')

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 pb-16">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-titulo text-xl font-semibold">Biblioteca do design system</h1>
            <p className="max-w-[62ch] text-sm text-muted-foreground">
              Os 25 componentes de <code>design-system/componentes/</code>, com as variantes e os estados que o contrato prevê. Os valores de cor,
              fonte, espaço e raio vêm todos de <code>design-system/tokens/tokens.css</code>.
            </p>
          </div>
          <GrupoOpcoes
            rotulo="Tema"
            opcoes={[
              { valor: 'claro', rotulo: 'Claro' },
              { valor: 'escuro', rotulo: 'Escuro' },
              { valor: 'sistema', rotulo: 'Do sistema' },
            ]}
            valor={preferencia}
            aoEscolher={definir}
          />
        </header>

        <Secao nome="Button" arquivo="forms/button.tsx" descricao="Pílula. Ação principal é forest no claro, lime no escuro">
          <Linha estado="Variantes">
            <Button>Novo plano</Button>
            <Button variant="accent">Cobrir</Button>
            <Button variant="secondary">Fonte</Button>
            <Button variant="outline">Ajustar</Button>
            <Button variant="soft">Nunca sugerir</Button>
            <Button variant="lightprimary">Duplicar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="destructive">Excluir</Button>
            <Button variant="lighterror">Remover</Button>
            <Button variant="link">Ver fonte</Button>
          </Linha>
          <Linha estado="Tamanhos">
            <Button size="sm">Pequeno</Button>
            <Button>Padrão</Button>
            <Button size="lg">Grande</Button>
            <Button size="icon" aria-label="Exportar">
              <Download aria-hidden="true" />
            </Button>
            <Button size="iconsm" variant="ghost" aria-label="Buscar">
              <Search aria-hidden="true" />
            </Button>
          </Linha>
          <Linha estado="Estados — passe o cursor, use Tab, compare">
            <Button>Repouso</Button>
            <Button className="hover:bg-primaryemphasis bg-primaryemphasis">Sobre (forçado)</Button>
            <Button className="scale-[0.97]">Pressionado (forçado)</Button>
            <Button className="ring-2 ring-ring ring-offset-2 ring-offset-background">Foco (forçado)</Button>
            <Button disabled>Desativado</Button>
            <Button loading>Exportando</Button>
            <Button block variant="outline">
              Largura inteira
            </Button>
          </Linha>
          <Linha estado="Com ícone">
            <Button>
              <Sparkles aria-hidden="true" />
              Ver exemplo
            </Button>
            <Button variant="accent">
              <ArrowLeftRight aria-hidden="true" />
              Substituir
            </Button>
          </Linha>
        </Secao>

        <Secao nome="Input · Label · Textarea · Select · Switch" arquivo="forms/" descricao="Campos: altura 40, raio 12, anel lime no foco">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ds-in">Padrão</Label>
              <Input id="ds-in" defaultValue="Feijão carioca cozido" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ds-ph">Vazio</Label>
              <Input id="ds-ph" placeholder="Busque um alimento" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ds-err">Erro</Label>
              <Input id="ds-err" aria-invalid defaultValue="-4" />
              <p role="alert" className="text-xs text-errortext">
                O peso precisa ser maior que zero.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ds-dis">Desativado</Label>
              <Input id="ds-dis" disabled defaultValue="Calculado pela fórmula" />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto rotulo="CampoTexto — com dica" valor={texto} aoMudar={setTexto} dica="Como aparece na folha do paciente." />
            <CampoNumero rotulo="CampoNumero — aceita vírgula" valor={numero} aoMudar={setNumero} sufixo="g" />
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ds-ta">Textarea</Label>
              <Textarea id="ds-ta" placeholder="Observações do atendimento" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Select</Label>
                <Select defaultValue="mifflin">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mifflin">Mifflin-St Jeor, 1990</SelectItem>
                    <SelectItem value="harris">Harris-Benedict, 1918</SelectItem>
                    <SelectItem value="nasem">NASEM, 2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="ds-sw">Switch — ligado e desligado</Label>
                <div className="flex items-center gap-3">
                  <Switch id="ds-sw" checked={ligado} onCheckedChange={setLigado} />
                  <Switch checked={false} disabled aria-label="Desativado" />
                </div>
              </div>
            </div>
          </div>
          <Separator />
          <GrupoOpcoes
            rotulo="GrupoOpcoes — selecionado é o que tem fundo"
            opcoes={[
              { valor: 'feminino', rotulo: 'Feminino' },
              { valor: 'masculino', rotulo: 'Masculino' },
            ]}
            valor={opcao}
            aoEscolher={setOpcao}
          />
          <GrupoOpcoes
            rotulo="GrupoOpcoes — com erro e nada escolhido"
            opcoes={[
              { valor: 'a', rotulo: 'Dobras' },
              { valor: 'b', rotulo: 'Bioimpedância' },
            ]}
            valor={null}
            aoEscolher={() => undefined}
            erro="Escolha um método para calcular a composição."
          />
        </Secao>

        <Secao nome="Card" arquivo="display/card.tsx" descricao="Raio 16, fio de 1 px, sombra macia">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>default</CardTitle>
                <CardDescription>Branco com fio e sombra.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">O cartão de sempre.</CardContent>
            </Card>
            <Card variant="sunken">
              <CardTitle>sunken</CardTitle>
              <CardContent className="text-sm text-muted-foreground">Painel interno cinza, sem fio.</CardContent>
            </Card>
            <Card variant="flat">
              <CardTitle>flat</CardTitle>
              <CardContent className="text-sm text-muted-foreground">Sem sombra, para cartão dentro de cartão.</CardContent>
            </Card>
            <Card variant="sheen" tight>
              <CardTitle>sheen + tight</CardTitle>
              <CardContent className="text-sm text-muted-foreground">Painel de vitrine, raio 28.</CardContent>
            </Card>
          </div>
        </Secao>

        <Secao nome="Badge" arquivo="display/badge.tsx" descricao="O estado da adequação vira selo">
          <Linha estado="Variantes">
            <Badge>default</Badge>
            <Badge variant="lightPrimary">lightPrimary</Badge>
            <Badge variant="lightSuccess" dot>
              Dentro da meta
            </Badge>
            <Badge variant="lightWarning" dot>
              Abaixo
            </Badge>
            <Badge variant="lightError" dot>
              Acima do limite
            </Badge>
            <Badge variant="lightInfo">DRI 2019 · RDA</Badge>
            <Badge variant="muted">Sem dado</Badge>
            <Badge variant="solid">solid</Badge>
            <Badge variant="accent">accent</Badge>
            <Badge variant="outline">outline</Badge>
          </Linha>
        </Secao>

        <Secao nome="Alert" arquivo="display/alert.tsx" descricao="Quatro variantes, com e sem título">
          <div className="flex flex-col gap-2">
            <Alert variant="info">A TACO não traz vitamina D, B12, folato, açúcares nem gordura saturada.</Alert>
            <Alert variant="warning" title="Total possivelmente subestimado">
              <TriangleAlert aria-hidden="true" />
              Dois alimentos do dia não têm fibra medida.
            </Alert>
            <Alert variant="error">Este plano passa do limite superior de sódio.</Alert>
            <Alert variant="success">Todos os micronutrientes analisados estão dentro da faixa.</Alert>
          </div>
        </Secao>

        <Secao nome="Progress · Separator" arquivo="display/" descricao="Barra de 0 a 100, com as cores de estado">
          <div className="flex flex-col gap-3">
            <Progress value={72} />
            <Progress value={96} variant="success" />
            <Progress value={38} variant="warning" />
            <Progress value={100} variant="error" />
            <Progress value={55} variant="info" />
            <Progress value={0} variant="muted" />
          </div>
          <Separator />
          <div className="flex h-8 items-center gap-3 text-sm text-muted-foreground">
            esquerda
            <Separator orientation="vertical" />
            direita
          </div>
        </Secao>

        <Secao nome="Table" arquivo="display/table.tsx" descricao="Número tabular e a notação da TACO no rodapé">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nutriente</TableHead>
                <TableHead className="text-right">No plano</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Ferro</TableCell>
                <TableCell className="numeros text-right">12,4 mg</TableCell>
                <TableCell className="numeros text-right">18,0 mg</TableCell>
                <TableCell className="numeros text-right text-warningtext">69%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cálcio †</TableCell>
                <TableCell className="numeros text-right">980 mg</TableCell>
                <TableCell className="numeros text-right">1.000 mg</TableCell>
                <TableCell className="numeros text-right">98%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Vitamina D</TableCell>
                <TableCell className="numeros text-right text-muted-foreground">—</TableCell>
                <TableCell className="numeros text-right">15,0 µg</TableCell>
                <TableCell className="numeros text-right text-muted-foreground">—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <TableFootnotes>
            <span>† Total possivelmente subestimado: nem todo alimento do dia tem o nutriente medido.</span>
            <span>— Não analisado é falta de medição, não zero.</span>
          </TableFootnotes>
        </Secao>

        <Secao nome="Tooltip · Icon" arquivo="display/" descricao="Lucide, traço 1,75; a pastilha redonda é do sistema">
          <Linha estado="Tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Passe o cursor</Button>
              </TooltipTrigger>
              <TooltipContent>Fonte: Mifflin-St Jeor, 1990</TooltipContent>
            </Tooltip>
          </Linha>
          <Linha estado="Icon — tamanhos e pastilhas">
            <Icon glifo={Flame} />
            <Icon glifo={LayoutDashboard} tamanho="menu" />
            <Icon glifo={BookOpen} tamanho="cabecalho" />
            <Icon glifo={Flame} pastilha="cinza" />
            <Icon glifo={Sparkles} pastilha="forte" />
            <Icon glifo={Download} pastilha="acento" />
            <Icon glifo={Search} titulo="Buscar alimento" pastilha="cinza" />
          </Linha>
        </Secao>

        <Secao nome="Fontes" arquivo="display/Fontes.tsx" descricao="Procedência recolhida: sai da vista, fica a um clique">
          <Linha estado="Uma fonte só — o rótulo some">
            <Fontes itens={[{ texto: 'Mifflin MD, St Jeor ST, et al. Am J Clin Nutr 1990;51:241-7.' }]} />
          </Linha>
          <Linha estado="Várias — cada uma diz a que dado pertence">
            <Fontes
              itens={[
                { rotulo: 'IMC', texto: 'Brasil. Ministério da Saúde. Norma técnica do SISVAN. Brasília; 2011.' },
                { rotulo: 'Cintura', texto: 'WHO. Waist circumference and waist-hip ratio. Geneva; 2008.' },
                { rotulo: 'Energia', texto: 'NASEM. Dietary Reference Intakes for Energy. Washington (DC); 2023.' },
              ]}
            />
          </Linha>
        </Secao>

        <Secao nome="Dialog · Sheet · DropdownMenu" arquivo="overlay/" descricao="Camadas flutuantes: véu, sombra pop e Esc para fechar">
          <Linha estado="Abrir">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Abrir diálogo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir este plano?</DialogTitle>
                  <DialogDescription>Ele sai deste aparelho e não volta. Faça backup antes, em Configurações.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost">Cancelar</Button>
                  <Button variant="destructive">Excluir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Abrir gaveta</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetTitle>Cobrir ferro</SheetTitle>
                <SheetDescription>Até cinco alimentos de grupos diferentes para fechar a falta.</SheetDescription>
                <div className="mt-4 flex flex-col gap-2">
                  <BarraAdequacao nome="Ferro" pct={69} detalhe="12,4 de 18,0 mg" fonte="DRI 2019 · RDA" />
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download aria-hidden="true" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Dieta para imprimir</DropdownMenuItem>
                <DropdownMenuItem>Aconselhamento (Word)</DropdownMenuItem>
                <DropdownMenuItem>Memorial de cálculo (Word)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Linha>
        </Secao>

        <Secao nome="Tabs · ItemMenu · EtapasDoCaso" arquivo="navigation/" descricao="Selecionado é o que muda de fundo, nunca só de cor">
          <Tabs value={aba === 'adequacao' ? 'sub2' : aba === 'plano' ? 'principal' : 'sub1'} onValueChange={() => undefined}>
            <TabsList>
              <TabsTrigger value="principal">Principal</TabsTrigger>
              <TabsTrigger value="sub1">Substituto 1</TabsTrigger>
              <TabsTrigger value="sub2">Substituto 2</TabsTrigger>
            </TabsList>
            <TabsContent value="principal" className="pt-3 text-sm text-muted-foreground">
              A opção que entra na soma do dia.
            </TabsContent>
            <TabsContent value="sub1" className="pt-3 text-sm text-muted-foreground">
              Substitutos não entram na soma nem na adequação.
            </TabsContent>
            <TabsContent value="sub2" className="pt-3 text-sm text-muted-foreground">
              Substitutos não entram na soma nem na adequação.
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="max-w-xs rounded-lg bg-background p-2">
            <ItemMenu icone={<LayoutDashboard aria-hidden="true" />} rotulo="Painel" ativo={menu === 'painel'} aoClicar={() => setMenu('painel')} />
            <ItemMenu
              icone={<FolderOpen aria-hidden="true" />}
              rotulo="Planos"
              detalhe="Maria S. — retorno"
              extra={<span className="numeros rounded-full bg-muted px-2 py-0.5 text-2xs">12</span>}
              ativo={menu === 'planos'}
              aoClicar={() => setMenu('planos')}
            />
            <ItemMenu icone={<BookOpen aria-hidden="true" />} rotulo="Tabela de alimentos" ativo={menu === 'alimentos'} aoClicar={() => setMenu('alimentos')} />
          </div>

          <Separator />

          <EtapasDoCaso abaAtual={aba} aoEscolher={setAba} />
        </Secao>

        <Secao nome="CartaoDestaque" arquivo="nutricao/CartaoDestaque.tsx" descricao="Cinco tons; lime é o herói, um por tela">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CartaoDestaque tom="lime" rotulo="Energia do dia" valor="1.850" unidade="kcal" apoio="Mifflin-St Jeor, 1990" icone={Flame} />
            <CartaoDestaque tom="branco" rotulo="Planos salvos" valor="12" apoio="Neste aparelho" icone={FolderOpen} />
            <CartaoDestaque tom="verde" rotulo="Adequação" valor="82" unidade="%" apoio="18 de 22 nutrientes" icone={Sparkles} aoClicar={() => undefined} />
            <CartaoDestaque tom="escuro" rotulo="Alimentos" valor="597" apoio="TACO 4ª edição" icone={BookOpen} />
            <CartaoDestaque tom="ocre" rotulo="Precisa de atenção" valor="3" apoio="Abaixo da meta" icone={TriangleAlert} />
            <CartaoDestaque tom="lime" rotulo="Comece agora" valor="—" apoio="Nunca usou? Abra um dia inteiro já montado." icone={Sparkles}>
              <Button size="sm">Novo plano</Button>
              <Button size="sm" variant="outline">
                Ver exemplo
              </Button>
            </CartaoDestaque>
          </div>
        </Secao>

        <Secao nome="BarraAdequacao" arquivo="nutricao/BarraAdequacao.tsx" descricao="Dentro · abaixo · acima · sem dado (hachura, nunca zero)">
          <div className="flex flex-col gap-4">
            <BarraAdequacao nome="Cálcio" pct={98} detalhe="980 de 1.000 mg" fonte="DRI 2019 · RDA" />
            <BarraAdequacao nome="Ferro" pct={69} detalhe="12,4 de 18,0 mg" fonte="DRI 2019 · RDA" marca="†" />
            <BarraAdequacao nome="Sódio" pct={143} detalhe="2.145 de 1.500 mg" fonte="DRI 2019 · CDRR" temLimite />
            <BarraAdequacao nome="Vitamina D" pct={null} detalhe="Não analisado" fonte="Fora da TACO" />
          </div>
        </Secao>

        <Secao nome="MedidorMacro" arquivo="nutricao/MedidorMacro.tsx" descricao="A faixa recomendada, o marcador do plano e a frase da distância">
          <div className="flex flex-col gap-4">
            <MedidorMacro nome="Proteína" macro={MACRO_DENTRO} meta="Meta: 10 a 35% (faixa da idade)" />
            <MedidorMacro nome="Carboidrato" macro={MACRO_ABAIXO} meta="Meta: 10 a 35% (faixa da idade)" />
            <MedidorMacro nome="Gordura" macro={MACRO_ACIMA} meta="Meta: 10 a 35% (faixa da idade)" />
            <MedidorMacro nome="Fibra — sem meta" macro={MACRO_SEM_META} meta={null} />
          </div>
        </Secao>
      </div>
    </TooltipProvider>
  )
}
