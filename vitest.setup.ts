import '@testing-library/jest-dom/vitest'
import { prepararBaseAmpliadaParaTeste } from './src/ui/estado/baseAmpliada.ts'

// Spec base-ampliada: nos testes, a base ampliada não é pedida sozinha; o teste que precisa dela a registra.
prepararBaseAmpliadaParaTeste({ automatico: false })
