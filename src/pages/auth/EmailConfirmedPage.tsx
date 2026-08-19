import { Link } from 'react-router'

function EmailConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Email confirmado</h1>
        <p className="text-lg text-gray-600 mb-6">
          Tu correo fue verificado correctamente.
        </p>
        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  )
}

export default EmailConfirmedPage
