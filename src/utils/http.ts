/**
 * HTTP utility - Unified HTTP client with retry, timeout, and error handling
 */

import https from "https";
import http from "http";

export interface HttpRequestOptions {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

/** Build URL with query parameters */
function buildUrl(
  baseUrl: string,
  params?: Record<string, string | number | boolean>,
): URL {
  const url = new URL(baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/** Perform a single HTTP request */
function doRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = buildUrl(options.url, options.params);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: options.timeout || 15000,
    };

    const req = lib.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        const status = res.statusCode || 0;
        try {
          const parsed = JSON.parse(data) as T;
          if (status >= 200 && status < 300) {
            resolve({ status, data: parsed });
          } else {
            reject(new HttpError(`HTTP ${status}`, status, parsed));
          }
        } catch {
          reject(
            new HttpError(`Invalid JSON response (HTTP ${status})`, status),
          );
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new HttpError("Request timeout", 0));
    });

    req.on("error", (err: Error) => {
      reject(new HttpError(`Network error: ${err.message}`, 0));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/** HTTP error with status code */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseData?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Make an HTTP request with automatic retries.
 */
export async function httpRequest<T = unknown>(
  options: HttpRequestOptions,
): Promise<HttpResponse<T>> {
  const maxRetries = options.retries ?? 1;
  const retryDelay = options.retryDelay ?? 1000;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await doRequest<T>(options);
    } catch (err) {
      lastError = err as Error;

      // Don't retry on auth errors
      if (
        err instanceof HttpError &&
        (err.status === 401 || err.status === 403)
      ) {
        throw err;
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
