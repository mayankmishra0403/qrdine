export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "UNKNOWN",
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION", 422);
  }
}

export function handleActionError(error: unknown): { error: string } {
  if (error instanceof AppError) {
    return { error: error.message };
  }
  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      return { error: "This record already exists" };
    }
    return { error: error.message };
  }
  return { error: "An unexpected error occurred" };
}
