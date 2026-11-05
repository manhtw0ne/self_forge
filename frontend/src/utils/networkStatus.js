export const CONNECTION_UNCERTAIN = 'sf:connection-uncertain';
export function isConnectionFailure(error) {
  if (error?.code === 'ERR_CANCELED') return false;
  if (error?.response) return [408, 502, 503, 504].includes(error.response.status);
  return ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code);
}
