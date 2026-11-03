export type DraftChoice = { id: string; choice_text: string }
export type DraftQuestion = {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false'
  choices: DraftChoice[]
}
export type Draft = {
  id: string
  updated_at: string | null
  title: string
  description: string
  questions: DraftQuestion[]
}
export const blankDraft = (): Draft => ({
  id: crypto.randomUUID(),
  updated_at: null,
  title: '',
  description: '',
  questions: [],
})
export const newChoices = (
  type: DraftQuestion['question_type'],
): DraftChoice[] =>
  (type === 'true_false' ? ['True', 'False'] : ['', '']).map((choice_text) => ({
    id: crypto.randomUUID(),
    choice_text,
  }))
export function moveItem<T>(items: T[], index: number, direction: number) {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const copy = [...items]
  ;[copy[index], copy[target]] = [copy[target], copy[index]]
  return copy
}
export function draftErrors(draft: Draft) {
  const errors: Record<string, string> = {}
  if (!draft.title.trim()) errors.title = 'Enter a survey title.'
  for (const q of draft.questions) {
    if (!q.question_text.trim())
      errors[q.id] = 'Enter question text or remove this question.'
    for (const c of q.choices)
      if (!c.choice_text.trim())
        errors[c.id] = 'Enter choice text or remove this choice.'
  }
  return errors
}
