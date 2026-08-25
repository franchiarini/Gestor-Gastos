const knownIncomeErrors = [
  'Se requiere un usuario autenticado.',
  'No se encontró el usuario autenticado.',
  'El nombre de la categoría no puede estar vacío.',
  'Ya existe una categoría de ingreso con ese nombre.',
  'Ya existe otra categoría de ingreso con ese nombre.',
  'La categoría de ingreso no existe o no pertenece al usuario.',
  'No se puede eliminar la categoría porque tiene ingresos asociados.',
  'No se puede registrar un ingreso en una categoría archivada.',
  'No se puede usar una categoría de ingreso archivada.',
  'El monto debe ser mayor a cero.',
  'El monto no puede tener más de dos decimales.',
  'La fecha es obligatoria.',
  'La fecha del ingreso no puede ser futura.',
  'El ingreso no existe o no pertenece al usuario.',
]

export function getIncomeErrorMessage(message: string, fallback: string) {
  return knownIncomeErrors.find((knownError) => message.includes(knownError)) ?? fallback
}
