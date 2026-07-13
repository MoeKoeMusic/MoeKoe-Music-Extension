'use strict';

function parse(input) {
  const parsed = new URL(input, 'http://moekoe.extension');
  return {
    protocol: parsed.protocol,
    slashes: true,
    auth: parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}` : null,
    host: parsed.host,
    port: parsed.port,
    hostname: parsed.hostname,
    hash: parsed.hash,
    search: parsed.search,
    query: parsed.search ? parsed.search.slice(1) : null,
    pathname: parsed.pathname,
    path: `${parsed.pathname}${parsed.search}`,
    href: parsed.href,
  };
}

module.exports = {
  URL: globalThis.URL,
  parse,
};

