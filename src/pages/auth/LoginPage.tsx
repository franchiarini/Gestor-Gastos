import { Link } from 'react-router'

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Iniciar sesión</h1>
        <p className="text-lg text-gray-600 mb-6">
          Accedé a tu cuenta para continuar.
        </p>
        <Link to="/register" className="text-blue-600 font-semibold hover:underline">
          Crear una cuenta
        </Link>
      </div>
    </div>
  )
}

export default LoginPage
