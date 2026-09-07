let renewal: Promise<boolean> | undefined;

async function csrfToken(): Promise<string> {
  const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('CSRF token request failed');
  return ((await response.json()) as { token: string }).token;
}

export function renewWebSessionOnce(): Promise<boolean> {
  if (renewal) return renewal;
  renewal = (async () => {
    const token = await csrfToken();
    const response = await fetch('/api/users/auth/refresh', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'x-csrf-token': token },
    });
    return response.ok;
  })();
  const clear = () => {
    renewal = undefined;
  };
  void renewal.then(clear, clear);
  return renewal;
}
