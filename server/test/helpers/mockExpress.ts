import type { Response, NextFunction } from 'express';
import type { AuthRequest, AuthUserPayload } from '../../src/middlewares/authMiddleware.js';

export interface MockResponse {
  statusCode: number;
  body: any;
  status: (code: number) => Response;
  json: (data: any) => Response;
  send: (data: any) => Response;
}

export function createMockReq(options: {
  body?: Record<string, any>;
  params?: Record<string, string>;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  user?: AuthUserPayload;
} = {}): AuthRequest {
  const headers = options.headers ?? {};
  const req: Partial<AuthRequest> = {
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    header: ((name: string) => {
      const foundKey = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
      return foundKey ? headers[foundKey] : undefined;
    }) as AuthRequest['header'],
  };
  if (options.user !== undefined) {
    req.user = options.user;
  }
  return req as AuthRequest;
}

export function createMockRes(): Response & MockResponse {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

export function createMockNext(): { next: NextFunction; wasCalled: () => boolean } {
  let called = false;
  const next: NextFunction = () => {
    called = true;
  };
  return {
    next,
    wasCalled: () => called,
  };
}