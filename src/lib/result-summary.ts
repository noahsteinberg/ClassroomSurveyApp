import type { ResultData, ResultQuestion } from './results'

export function questionResults(data: ResultData, question: ResultQuestion) {
  const responseIds = new Set(data.responses.map((r) => r.id))
  const choices = data.choices
    .filter((c) => c.question_id === question.id)
    .sort((a, b) => a.position - b.position)
  const choiceIds = new Set(choices.map((c) => c.id))
  const valid = data.answers.filter(
    (a) =>
      a.question_id === question.id &&
      responseIds.has(a.response_id) &&
      a.choice_id &&
      choiceIds.has(a.choice_id),
  )
  return {
    choices: choices.map((c) => {
      const count = new Set(
        valid.filter((a) => a.choice_id === c.id).map((a) => a.response_id),
      ).size
      return {
        ...c,
        count,
        percentage: data.responses.length
          ? Math.round((count / data.responses.length) * 1000) / 10
          : 0,
      }
    }),
    unanswered:
      data.responses.length - new Set(valid.map((a) => a.response_id)).size,
  }
}
