import type { ResultData } from './results'

// Quote every cell and neutralize formula-like text, including user-supplied headers.
export function csvCell(value: string) {
  const safe =
    /^[\s\uFEFF]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value)
      ? `'${value}`
      : value
  return `"${safe.replace(/"/g, '""')}"`
}
export function resultsCsv(data: ResultData) {
  const questions = [...data.questions].sort((a, b) => a.position - b.position)
  const choices = new Map(data.choices.map((c) => [c.id, c]))
  const answers = new Map(
    data.answers.map((a) => [`${a.response_id}:${a.question_id}`, a]),
  )
  const headers = [
    'survey_id',
    'survey_title',
    'survey_description',
    'survey_status',
    'survey_created_at',
    'response_id',
    'submitted_at',
    ...questions.map((q, i) => `Question ${i + 1}: ${q.question_text}`),
  ]
  const rows = data.responses.map((r) => [
    data.survey.id,
    data.survey.title,
    data.survey.description ?? '',
    data.survey.status,
    new Date(data.survey.created_at).toISOString(),
    r.id,
    new Date(r.submitted_at).toISOString(),
    ...questions.map((q) => {
      const answer = answers.get(`${r.id}:${q.id}`)
      const choice = answer?.choice_id ? choices.get(answer.choice_id) : null
      return choice?.question_id === q.id ? choice.choice_text : ''
    }),
  ])
  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  )
}
export function downloadResultsCsv(data: ResultData) {
  const blob = new Blob([resultsCsv(data)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `survey-${data.survey.id}-results.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
