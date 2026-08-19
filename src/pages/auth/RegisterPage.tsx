import { Link } from 'react-router'

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Crear cuenta</h1>
        <p className="text-lg text-gray-600 mb-6">
          Registrate para comenzar a usar la aplicación.
        </p>
        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  )
}

export default RegisterPage
