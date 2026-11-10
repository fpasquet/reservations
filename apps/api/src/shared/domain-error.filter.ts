import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import { DomainError } from './domain-error.js';

interface JsonResponse {
  status(code: number): { json(body: unknown): void };
}

/** Réponse d'erreur : `{ statusCode, code, message, field? }`. */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    response.status(error.status).json({
      statusCode: error.status,
      code: error.code,
      message: error.message,
      ...(error.field ? { field: error.field } : {}),
    });
  }
}
