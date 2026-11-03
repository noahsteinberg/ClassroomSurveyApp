import { Link } from 'react-router-dom'
export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900"
    >
      <section
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        aria-labelledby="page-title"
      >
        <h1 id="page-title" className="text-4xl font-bold tracking-tight">
          Classroom Survey
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Quick in-class understanding checks.
        </p>
        <Link to="/login" className="button primary mt-7">
          Instructor Login
        </Link>
      </section>
    </main>
  )
}
