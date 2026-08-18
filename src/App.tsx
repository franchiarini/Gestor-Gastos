import { Routes, Route, Link } from 'react-router'

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Gestor de Gastos
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Fundación técnica en construcción
        </p>
        <Link
          to="/router-check"
          className="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
        >
          Probar navegación
        </Link>
      </div>
    </div>
  )
}

function RouterCheck() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          React Router funcionando
        </h1>
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
        >
          Volver
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/router-check" element={<RouterCheck />} />
    </Routes>
  )
}

export default App
