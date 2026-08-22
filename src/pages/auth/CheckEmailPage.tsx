import { Link } from 'react-router'

function CheckEmailPage() {
  return (
    <main className="app-page flex items-center justify-center">
      <div className="app-panel w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Revisá tu correo</h1>
        <p className="text-lg text-gray-600 mb-3">
          Te enviamos un correo de confirmación.
        </p>
        <p className="text-gray-600 mb-6">
          Confirmá tu email antes de poder acceder a la aplicación.
        </p>
        <Link to="/login" className="app-button-primary">
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  )
}

export default CheckEmailPage
