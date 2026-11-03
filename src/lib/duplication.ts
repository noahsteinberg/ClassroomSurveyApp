import { supabase } from './supabase'
import { readPages } from './results'
import type { Draft, DraftQuestion } from './draft'

export async function loadDuplicate(
  id: string,
  signal: AbortSignal,
): Promise<Draft> {
  const client = supabase!
  async function metadata() {
    const { data, error } = await client
      .from('surveys')
      .select('title,description,updated_at')
      .eq('id', id)
      .abortSignal(signal)
      .single()
    if (error || !data)
      throw new Error(
        'Source survey unavailable. Refresh the dashboard and try again.',
      )
    return data
  }
  const source = await metadata()
  const questions = await readPages<{
    id: string
    question_text: string
    question_type: DraftQuestion['question_type']
  }>(
    (from, to) =>
      client
        .from('questions')
        .select('id,question_text,question_type')
        .eq('survey_id', id)
        .order('position')
        .order('id')
        .range(from, to)
        .abortSignal(signal),
    signal,
  )
  const copied: DraftQuestion[] = []
  for (const question of questions) {
    const choices = await readPages<{ choice_text: string }>(
      (from, to) =>
        client
          .from('choices')
          .select('choice_text')
          .eq('question_id', question.id)
          .order('position')
          .order('id')
          .range(from, to)
          .abortSignal(signal),
      signal,
    )
    copied.push({
      id: crypto.randomUUID(),
      question_text: question.question_text,
      question_type: question.question_type,
      choices: choices.map((c) => ({
        id: crypto.randomUUID(),
        choice_text: c.choice_text,
      })),
    })
  }
  if ((await metadata()).updated_at !== source.updated_at)
    throw new Error('The source changed while loading. Try Duplicate again.')
  return {
    id: crypto.randomUUID(),
    updated_at: null,
    title: `Copy of ${source.title}`,
    description: source.description ?? '',
    questions: copied,
  }
}
