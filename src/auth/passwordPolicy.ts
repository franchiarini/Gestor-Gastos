export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_REQUIREMENT_MESSAGE = 'La contraseña debe tener al menos 8 caracteres.'

export function isValidPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH
}
