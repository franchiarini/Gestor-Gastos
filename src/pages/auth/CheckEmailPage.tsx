import { Link } from 'react-router'

function CheckEmailPage() {
  return (
    <main className="app-page flex items-center justify-center">
      <div className="app-panel w-full max-w-lg text-center">
        <h1 className="app-text mb-4 text-4xl font-bold">Revisá tu correo</h1>
        <p className="app-muted mb-3 text-lg">
          Te enviamos un correo de confirmación.
        </p>
        <p className="app-muted mb-6">
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
