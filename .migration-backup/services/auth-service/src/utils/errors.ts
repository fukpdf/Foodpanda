export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class ValidationError extends AuthError {
  constructor(message: string, public readonly details?: unknown) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AuthError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends AuthError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = "Access denied") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends AuthError {
  constructor(message: string = "Too many requests") {
    super("RATE_LIMITED", message, 429);
    this.name = "RateLimitError";
  }
}

export class TokenError extends AuthError {
  constructor(message: string) {
    super("TOKEN_INVALID", message, 401);
    this.name = "TokenError";
  }
}

export class SessionError extends AuthError {
  constructor(message: string) {
    super("SESSION_INVALID", message, 401);
    this.name = "SessionError";
  }
}
