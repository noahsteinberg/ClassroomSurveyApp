export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900">
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
        <p className="mt-6 text-sm text-slate-600">
          Instructor login and survey tools are coming next.
        </p>
      </section>
    </main>
  )
}
