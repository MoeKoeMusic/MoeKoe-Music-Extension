'use strict';

const { Buffer } = require('buffer');

const forbiddenHeaders = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'user-agent',
  'via',
]);

function appendParams(url, params = {}) {
  const target = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => target.searchParams.append(key, String(item)));
    } else {
      target.searchParams.set(key, String(value));
    }
  }

  return target.toString();
}

function normalizeHeaders(headers = {}) {
  return Object.entries(headers).reduce((result, [key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (value == null || forbiddenHeaders.has(normalizedKey)) return result;
    result[key] = String(value);
    return result;
  }, {});
}

function normalizeBody(data) {
  if (data == null) return undefined;
  if (typeof data === 'string' || data instanceof Blob || data instanceof FormData || data instanceof URLSearchParams) return data;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return data;
  return JSON.stringify(data);
}

async function readBody(response, responseType) {
  if (responseType === 'arraybuffer') {
    return Buffer.from(await response.arrayBuffer());
  }

  const text = await response.text();
  if (!text) return '';

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function axios(options = {}) {
  const base = options.baseURL || '';
  const rawUrl = /^https?:\/\//i.test(options.url || '') ? options.url : `${base}${options.url || ''}`;
  const url = appendParams(rawUrl, options.params);
  const method = (options.method || 'GET').toUpperCase();
  const headers = normalizeHeaders(options.headers);
  const body = method === 'GET' || method === 'HEAD' ? undefined : normalizeBody(options.data);

  const response = await fetch(url, {
    method,
    headers,
    body,
    credentials: options.withCredentials ? 'include' : 'same-origin',
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key.toLowerCase()] = value;
  });

  const result = {
    data: await readBody(response, options.responseType),
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    config: options,
    request: null,
  };

  if (!response.ok) {
    const error = new Error(`Request failed with status code ${response.status}`);
    error.response = result;
    error.config = options;
    throw error;
  }

  return result;
}

axios.create = () => axios;
axios.default = axios;

module.exports = axios;

