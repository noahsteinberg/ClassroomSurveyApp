import { supabase } from './supabase'

export type ResultSurvey = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}
export type ResultQuestion = {
  id: string
  question_text: string
  question_type: string
  position: number
}
export type ResultChoice = {
  id: string
  question_id: string
  choice_text: string
  position: number
}
export type ResultResponse = { id: string; submitted_at: string }
export type ResultAnswer = {
  id: string
  response_id: string
  question_id: string
  choice_id: string | null
}
export type ResultData = {
  survey: ResultSurvey
  questions: ResultQuestion[]
  choices: ResultChoice[]
  responses: ResultResponse[]
  answers: ResultAnswer[]
  loadedAt: string
}

// Explicit pages avoid the Data API's default row cap. Errors never return partial results.
export async function readPages<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: unknown }>,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    if (signal.aborted) throw new Error('Aborted')
    const { data, error } = await read(from, from + 499)
    if (error || !Array.isArray(data)) throw new Error('Results request failed')
    rows.push(...(data as T[]))
    if (data.length < 500) return rows
  }
}
async function groups<T>(
  ids: string[],
  read: (
    ids: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: unknown }>,
  signal: AbortSignal,
) {
  const result: T[] = []
  for (let start = 0; start < ids.length; start += 100) {
    const batch = ids.slice(start, start + 100)
    result.push(
      ...(await readPages<T>((from, to) => read(batch, from, to), signal)),
    )
  }
  return result
}
export async function loadResults(
  id: string,
  signal: AbortSignal,
): Promise<ResultData> {
  const client = supabase!
  const fields = 'id,title,description,status,created_at,updated_at'
  const { data: initial, error } = await client
    .from('surveys')
    .select(fields)
    .eq('id', id)
    .abortSignal(signal)
    .maybeSingle()
  if (error || !initial) throw new Error('Survey unavailable')
  const [questions, responseRows] = await Promise.all([
    readPages<ResultQuestion>(
      (from, to) =>
        client
          .from('questions')
          .select('id,question_text,question_type,position')
          .eq('survey_id', id)
          .order('position')
          .order('id')
          .range(from, to)
          .abortSignal(signal),
      signal,
    ),
    readPages<ResultResponse>(
      (from, to) =>
        client
          .from('responses')
          .select('id,submitted_at')
          .eq('survey_id', id)
          .order('submitted_at')
          .order('id')
          .range(from, to)
          .abortSignal(signal),
      signal,
    ),
  ])
  // Capture the response IDs once: tables, charts and CSV all use this same set.
  const responses = [...new Map(responseRows.map((r) => [r.id, r])).values()]
  const [choices, answers] = await Promise.all([
    groups<ResultChoice>(
      questions.map((q) => q.id),
      (ids, from, to) =>
        client
          .from('choices')
          .select('id,question_id,choice_text,position')
          .in('question_id', ids)
          .order('question_id')
          .order('position')
          .order('id')
          .range(from, to)
          .abortSignal(signal),
      signal,
    ),
    groups<ResultAnswer>(
      responses.map((r) => r.id),
      (ids, from, to) =>
        client
          .from('answers')
          .select('id,response_id,question_id,choice_id')
          .in('response_id', ids)
          .order('id')
          .range(from, to)
          .abortSignal(signal),
      signal,
    ),
  ])
  const { data: current, error: latestError } = await client
    .from('surveys')
    .select(fields)
    .eq('id', id)
    .abortSignal(signal)
    .maybeSingle()
  if (
    latestError ||
    !current ||
    (current.updated_at !== initial.updated_at &&
      (initial.status === 'draft' || current.status === 'draft'))
  )
    throw new Error('Survey changed while loading')
  return {
    survey: current,
    questions,
    choices,
    responses,
    answers,
    loadedAt: new Date().toISOString(),
  }
}
