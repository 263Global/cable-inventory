export function getBatchFieldDisplayValue(
  isEditing: boolean,
  localValue: string,
  propValue: string | number,
): string {
  if (isEditing) return localValue
  return String(propValue ?? '')
}

export function shouldSaveBatchField(
  localValue: string,
  propValue: string | number,
  disabled: boolean,
): boolean {
  if (disabled) return false
  return localValue !== String(propValue ?? '')
}
