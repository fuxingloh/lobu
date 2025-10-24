#!/usr/bin/env bun

/**
 * Centralized error handling for dispatcher
 * Platform-specific errors (e.g., Slack) are in their respective directories
 */

/**
 * Base error class for all dispatcher errors
 */
export class DispatcherError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
