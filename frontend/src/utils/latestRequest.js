// Only the latest request may publish data, errors or completion.
export function createLatestRequest() {
  let version = 0;
  return {
    invalidate() { version++; },
    async run(request, success, failure, finish) {
      const mine = ++version;
      try { const value = await request(); if (mine === version) success(value); }
      catch (error) { if (mine === version) failure(error); }
      finally { if (mine === version) finish(); }
    },
  };
}
