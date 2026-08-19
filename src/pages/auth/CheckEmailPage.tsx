import { Link } from 'react-router'

function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8 max-w-lg px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Revisá tu correo</h1>
        <p className="text-lg text-gray-600 mb-3">
          Te enviamos un correo de confirmación.
        </p>
        <p className="text-gray-600 mb-6">
          Confirmá tu email antes de poder acceder a la aplicación.
        </p>
        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}

export default CheckEmailPage
