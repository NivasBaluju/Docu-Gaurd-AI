const Api = (() => {
  const TOKEN_KEY = 'deciva_token';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function request(method, url, body, isForm = false, timeoutMs = 30000) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm && body) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Request timed out. Please check your network or try again.');
      }
      throw fetchErr;
    }
    clearTimeout(timer);

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.blob();
    }

    if (!res.ok) {
      const message = (data && data.error) || 'Request failed';
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    getToken, setToken, clearToken,
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body || {}),
    del: (url) => request('DELETE', url),
    upload: (url, formData) => request('POST', url, formData, true)
  };
})();
