import { type ApiError, type ApiErrorCode, CursorError } from '@daiva/domain';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class ApiHttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export function createApiError(
  requestId: string,
  code: ApiErrorCode,
  message: string,
  details: unknown[] = [],
): ApiError {
  return {
    error: {
      code,
      message,
      requestId,
      details,
    },
  };
}

function issueDetails(error: ZodError): unknown[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function isFastifyValidationError(error: unknown): error is FastifyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as FastifyError).code === 'FST_ERR_VALIDATION'
  );
}

export function handleApiError(error: unknown, request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof ApiHttpError) {
    reply
      .code(error.statusCode)
      .send(createApiError(request.id, error.code, error.message, error.details));
    return;
  }

  if (error instanceof CursorError) {
    reply.code(400).send(createApiError(request.id, 'VALIDATION_ERROR', 'Invalid cursor', []));
    return;
  }

  if (error instanceof ZodError) {
    reply
      .code(400)
      .send(
        createApiError(
          request.id,
          'VALIDATION_ERROR',
          'Request validation failed',
          issueDetails(error),
        ),
      );
    return;
  }

  if (isFastifyValidationError(error)) {
    reply
      .code(400)
      .send(createApiError(request.id, 'VALIDATION_ERROR', 'Request validation failed', []));
    return;
  }

  request.log.error({ err: error, requestId: request.id }, 'unhandled_error');
  reply
    .code(500)
    .send(createApiError(request.id, 'INTERNAL_ERROR', 'An unexpected error occurred', []));
}
