export function hasPasswordConfirmationMismatch(password, confirmation) {
  return confirmation.length > 0 && password !== confirmation;
}
