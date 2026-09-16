import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const errorMessage =
      typeof exceptionResponse === "object" && exceptionResponse !== null
        ? (exceptionResponse as any).message || (exceptionResponse as any).error || JSON.stringify(exceptionResponse)
        : typeof exceptionResponse === "string"
          ? exceptionResponse
          : (exception as any)?.message || "Internal server error";

    const stack = (exception as any)?.stack;

    // Log the full error to stdout / terminal
    this.logger.error(
      `[${request?.method || "UNKNOWN"}] ${request?.url || "UNKNOWN"} - Status: ${status} - Error: ${errorMessage}`,
      stack,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url,
      error: {
        message: errorMessage,
        details: (exception as any)?.detail || (exception as any)?.message || undefined,
      },
    });
  }
}
