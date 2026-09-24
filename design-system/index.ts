/*
 * A porta de entrada da biblioteca.
 *
 * Quem consome escreve `import { Button } from '@ds'`. O caminho interno
 * (`@ds/componentes/forms/button.tsx`) também funciona e é o que o app usa hoje,
 * arquivo por arquivo, para o Vite separar melhor o pacote — mas componente novo
 * precisa aparecer AQUI, senão ele não existe para a biblioteca.
 *
 * Os 25 componentes do sistema, na taxonomia do design system:
 *   forms       Button · Input · CampoNumero · Label · Textarea · Select · Switch · GrupoOpcoes
 *   display     Card · Badge · Alert · Progress · Separator · Table · Tooltip · Icon
 *   overlay     Dialog · Sheet · DropdownMenu
 *   navigation  Tabs · ItemMenu · EtapasDoCaso
 *   nutricao    CartaoDestaque · BarraAdequacao · MedidorMacro
 *
 * `efeitos/` fica de fora desta lista: são os efeitos de animação da área
 * pública, que já estavam no repositório e não vieram do export.
 */

export { cn } from './lib/cn.ts'

// forms
export { Button, buttonVariants, type ButtonProps } from './componentes/forms/button.tsx'
export { Input } from './componentes/forms/input.tsx'
export { CampoNumero } from './componentes/forms/CampoNumero.tsx'
export { CampoTexto } from './componentes/forms/CampoTexto.tsx'
export { Label } from './componentes/forms/label.tsx'
export { Textarea } from './componentes/forms/textarea.tsx'
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './componentes/forms/select.tsx'
export { Switch } from './componentes/forms/switch.tsx'
export { GrupoOpcoes } from './componentes/forms/GrupoOpcoes.tsx'

// display
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants, type CardProps } from './componentes/display/card.tsx'
export { Badge, badgeVariants, type BadgeProps } from './componentes/display/badge.tsx'
export { Alert, alertVariants, type AlertProps } from './componentes/display/alert.tsx'
export { Progress, progressIndicatorVariants, type ProgressProps } from './componentes/display/progress.tsx'
export { Separator } from './componentes/display/separator.tsx'
export { Table, TableBody, TableCell, TableFootnotes, TableHead, TableHeader, TableRow } from './componentes/display/table.tsx'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './componentes/display/tooltip.tsx'
export { Icon, type IconProps, type PastilhaIcone, type TamanhoIcone } from './componentes/display/Icon.tsx'
export { Fontes, type ItemFonte } from './componentes/display/Fontes.tsx'

// overlay
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './componentes/overlay/dialog.tsx'
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger, sheetVariants } from './componentes/overlay/sheet.tsx'
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './componentes/overlay/dropdown-menu.tsx'

// navigation
export { Tabs, TabsContent, TabsList, TabsTrigger } from './componentes/navigation/tabs.tsx'
export { ItemMenu } from './componentes/navigation/ItemMenu.tsx'
export { EtapasDoCaso } from './componentes/navigation/EtapasDoCaso.tsx'

// nutricao
export { CartaoDestaque, type TomDestaque } from './componentes/nutricao/CartaoDestaque.tsx'
export { BarraAdequacao } from './componentes/nutricao/BarraAdequacao.tsx'
export { MedidorMacro } from './componentes/nutricao/MedidorMacro.tsx'
