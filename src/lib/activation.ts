export function activationError(message: string) {
  if (message.includes('SURVEY_REQUIRES_QUESTIONS'))
    return 'Add at least one question and save the draft before activating.'
  if (message.includes('MULTIPLE_CHOICE_REQUIRES_CHOICES'))
    return 'Every multiple-choice question needs at least two choices. Edit and save the draft first.'
  if (message.includes('TRUE_FALSE_REQUIRES_FIXED_CHOICES'))
    return 'True / False questions must have the fixed True and False choices. Edit and save the draft first.'
  if (message.includes('DRAFT_REQUIRED'))
    return 'Only draft surveys can be activated. Refresh the dashboard to see the current status.'
  if (message.includes('SURVEY_NOT_FOUND'))
    return 'This survey is no longer available. Return to the dashboard.'
  return 'Unable to activate the survey. Check your connection and refresh the dashboard before trying again.'
}
