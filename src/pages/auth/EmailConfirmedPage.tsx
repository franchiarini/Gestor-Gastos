import { Link } from 'react-router'

function EmailConfirmedPage() {
  return (
    <main className="app-page flex items-center justify-center">
      <div className="app-panel w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Email confirmado</h1>
        <p className="text-lg text-gray-600 mb-6">
          Tu correo fue verificado correctamente.
        </p>
        <Link to="/login" className="app-button-primary">
          Iniciar sesión
        </Link>
      </div>
    </main>
  )
}

export default EmailConfirmedPage
