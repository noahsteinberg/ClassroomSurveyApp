const prefix = 'classroom-survey'
export function submissionMarker(surveyId: string) {
  return localStorage.getItem(`${prefix}:submitted:${surveyId}`) === '1'
}
export function browserToken(surveyId: string) {
  const key = `${prefix}:token:${surveyId}`
  const existing = localStorage.getItem(key)
  if (
    existing &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      existing,
    )
  )
    throw new Error('Invalid stored token')
  const token = existing ?? crypto.randomUUID()
  localStorage.setItem(key, token)
  if (localStorage.getItem(key) !== token)
    throw new Error('Browser storage unavailable')
  return token
}
export function markSubmitted(surveyId: string) {
  // Server uniqueness remains authoritative if storage becomes unavailable after saving.
  try {
    localStorage.setItem(`${prefix}:submitted:${surveyId}`, '1')
  } catch {
    /* the server already recorded the response */
  }
}
