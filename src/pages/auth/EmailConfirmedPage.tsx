import { Link } from 'react-router'

function EmailConfirmedPage() {
  return (
    <main className="app-page flex items-center justify-center">
      <div className="app-panel w-full max-w-lg text-center">
        <h1 className="app-text mb-4 text-4xl font-bold">Email confirmado</h1>
        <p className="app-muted mb-6 text-lg">
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
