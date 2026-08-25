import type { IncomeCategory, IncomeCategoryStatus } from './getIncomeCategories'

export type IncomeCategoryRpcRow = {
  categoria_id: string
  categoria_nombre: string
  categoria_estado: IncomeCategoryStatus
  fecha_creacion: string
  fecha_modificacion: string
}

export function mapIncomeCategory(row: IncomeCategoryRpcRow): IncomeCategory {
  return {
    id: row.categoria_id,
    nombre: row.categoria_nombre,
    estado: row.categoria_estado,
    fechaCreacion: row.fecha_creacion,
    fechaModificacion: row.fecha_modificacion,
  }
}
