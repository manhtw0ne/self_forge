// Only explicit validation/business-rule rejections permit editing without reloading.
// Timeouts, server errors and authentication failures may require fresh state.
export function needsCheckInRefresh(error) {
  return ![400, 422].includes(error?.response?.status);
}
