export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, "VALIDATION_ERROR", message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "credenciais inválidas") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "recurso não encontrado") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}
