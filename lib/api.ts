export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const mergedInit: RequestInit = { ...init }
  if (mergedInit.credentials === undefined) {
    mergedInit.credentials = 'same-origin'
  }

  return fetch(input, mergedInit)
}
