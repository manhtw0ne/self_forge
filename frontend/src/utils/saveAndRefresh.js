export async function saveAndRefresh(save, refresh) {
  await save();
  try { return { saved: true, data: await refresh() }; }
  catch { return { saved: true, refreshFailed: true }; }
}
