function getRuntime() {
  return globalThis.chrome?.runtime;
}

export function canUseExtensionApi() {
  return location.protocol === 'chrome-extension:' && Boolean(getRuntime()?.sendMessage);
}

function normalizeHeaders(headers) {
  if (!headers) return {};
  if (typeof headers.toJSON === 'function') return headers.toJSON();

  return Object.entries(headers).reduce((result, [key, value]) => {
    if (value != null) result[key] = String(value);
    return result;
  }, {});
}

function normalizeData(data, headers) {
  if (typeof data !== 'string') return data;

  const contentType = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
  if (!contentType.includes('application/json')) return data;

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function sendRuntimeMessage(message) {
  const runtime = getRuntime();

  return new Promise((resolve, reject) => {
    runtime.sendMessage(message, (response) => {
      const error = runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(response);
    });
  });
}

function createAxiosError(message, config, response) {
  const error = new Error(message);
  error.config = config;
  error.response = response;
  error.request = { extension: true };
  return error;
}

export function createExtensionApiAdapter() {
  return async (config) => {
    const headers = normalizeHeaders(config.headers);
    const payload = {
      url: config.url || '/',
      baseURL: config.baseURL || '',
      method: (config.method || 'GET').toUpperCase(),
      params: config.params || {},
      data: normalizeData(config.data, headers),
      headers,
      responseType: config.responseType || '',
    };

    const messageResponse = await sendRuntimeMessage({
      type: 'moekoe:api-request',
      payload,
    });

    if (!messageResponse?.ok) {
      const response = messageResponse?.response || {
        data: { status: 0, msg: messageResponse?.error || 'Extension API request failed' },
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        config,
        request: { extension: true },
      };

      throw createAxiosError(messageResponse?.error || 'Extension API request failed', config, response);
    }

    const response = {
      data: messageResponse.response.body,
      status: messageResponse.response.status,
      statusText: messageResponse.response.status === 200 ? 'OK' : 'Error',
      headers: messageResponse.response.headers || {},
      config,
      request: { extension: true },
    };

    const validateStatus = config.validateStatus || ((status) => status >= 200 && status < 300);
    if (!validateStatus(response.status)) {
      throw createAxiosError(`Request failed with status code ${response.status}`, config, response);
    }

    return response;
  };
}

