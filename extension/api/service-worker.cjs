'use strict';

const { Buffer } = require('buffer');

globalThis.Buffer = globalThis.Buffer || Buffer;
globalThis.process = globalThis.process || { env: {} };
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.platform = 'lite';

const { routes, modules } = require('./generated/modules.cjs');
const { createRequest } = require('../../MoeKoeMusic/api/util/request.js');
const { calculateMid, generateWebGLHash, getGuid, randomString, cookieToJson } = require('../../MoeKoeMusic/api/util/util.js');

const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 820;
const SESSION_KEY = 'moekoe.kugou.session';
const GUID_KEY = 'moekoe.kugou.guid';

let sessionState = {};
let sessionReady = null;

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

async function ensureSession() {
  if (!sessionReady) {
    sessionReady = (async () => {
      const stored = await storageGet([SESSION_KEY, GUID_KEY]);
      sessionState = stored[SESSION_KEY] || {};

      const guid = sessionState.KUGOU_API_GUID || stored[GUID_KEY] || getGuid();
      const patch = {
        KUGOU_API_PLATFORM: 'lite',
        KUGOU_API_GUID: guid,
        KUGOU_API_MID: sessionState.KUGOU_API_MID || calculateMid(guid),
        KUGOU_API_DEV: sessionState.KUGOU_API_DEV || randomString(10).toUpperCase(),
        KUGOU_API_MAC: sessionState.KUGOU_API_MAC || '02:00:00:00:00:00',
        KUGOU_API_WEBGL: sessionState.KUGOU_API_WEBGL || generateWebGLHash(),
      };

      sessionState = { ...sessionState, ...patch };
      await storageSet({ [SESSION_KEY]: sessionState, [GUID_KEY]: guid });
    })().catch((error) => {
      sessionReady = null;
      throw error;
    });
  }

  await sessionReady;
}

function parseCookieInput(cookie) {
  if (!cookie) return {};
  if (typeof cookie !== 'string') return cookie;
  return cookieToJson(cookie);
}

function parseRequestUrl(payload) {
  const base = payload.baseURL || 'http://moekoe.extension';
  const parsed = new URL(payload.url || '/', base);
  const params = Object.fromEntries(parsed.searchParams.entries());
  return {
    path: parsed.pathname || '/',
    params,
  };
}

function getModuleName(pathname) {
  const normalizedPath = `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return routes[normalizedPath] || normalizedPath.slice(1).replace(/\//g, '_');
}

function mergeCookies(cookieHeaders = []) {
  let changed = false;

  for (const rawCookie of cookieHeaders) {
    if (typeof rawCookie !== 'string') continue;

    const firstSegment = rawCookie.split(';')[0]?.trim();
    const separatorIndex = firstSegment.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = firstSegment.slice(0, separatorIndex).trim();
    const value = firstSegment.slice(separatorIndex + 1).trim();
    if (!key || sessionState[key] === value) continue;

    sessionState[key] = value;
    changed = true;
  }

  return changed;
}

async function persistSessionIfNeeded(changed) {
  if (!changed) return;
  await storageSet({ [SESSION_KEY]: sessionState });
}

function normalizeResult(result) {
  return {
    status: result.status,
    body: result.body,
    cookie: result.cookie || [],
    headers: result.headers || {},
  };
}

async function invokeApiRoute(payload) {
  await ensureSession();

  const { path, params: urlParams } = parseRequestUrl(payload);
  const moduleName = getModuleName(path);
  const apiModule = modules[moduleName];

  if (!apiModule) {
    return {
      status: 404,
      body: { status: 0, msg: `API route not found: ${path}` },
      cookie: [],
      headers: {},
    };
  }

  const headers = payload.headers || {};
  const authCookie = parseCookieInput(headers.Authorization || headers.authorization);
  const query = {
    ...urlParams,
    ...(payload.params || {}),
    ...(payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) ? payload.data : {}),
    cookie: {
      ...sessionState,
      ...parseCookieInput(payload.params?.cookie),
      ...parseCookieInput(payload.data?.cookie),
      ...authCookie,
    },
  };

  if (payload.data != null && (typeof payload.data !== 'object' || Array.isArray(payload.data))) {
    query.data = payload.data;
  }

  try {
    const response = await Promise.resolve(apiModule(query, createRequest));
    await persistSessionIfNeeded(mergeCookies(response.cookie));
    return normalizeResult(response);
  } catch (error) {
    if (error?.cookie) {
      await persistSessionIfNeeded(mergeCookies(error.cookie));
    }

    if (typeof error?.status === 'number') {
      return normalizeResult(error);
    }

    return {
      status: 502,
      body: { status: 0, msg: String(error?.message || error) },
      cookie: [],
      headers: {},
    };
  }
}

chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL('app/index.html'),
    type: 'popup',
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'moekoe:api-request') {
    return false;
  }

  invokeApiRoute(message.payload)
    .then((response) => sendResponse({ ok: response.status >= 200 && response.status < 300, response }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: String(error?.message || error),
        response: {
          status: 502,
          body: { status: 0, msg: String(error?.message || error) },
          cookie: [],
          headers: {},
        },
      });
    });

  return true;
});

