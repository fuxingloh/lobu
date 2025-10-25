#!/usr/bin/env bun

import { DispatcherError } from "../errors/dispatcher-error";

/**
 * Slack API errors
 */
export class SlackApiError extends DispatcherError {
  constructor(
    message: string,
    public readonly slackError: string,
    public readonly data?: unknown
  ) {
    super(message, `SLACK_API_${slackError.toUpperCase()}`, 502);
  }

  isRetryable(): boolean {
    // Retry on rate limits and transient errors
    const retryableErrors = [
      "rate_limited",
      "timeout",
      "service_unavailable",
      "internal_error",
    ];
    return retryableErrors.includes(this.slackError);
  }

  /**
   * Check if this is a validation error (non-retryable)
   */
  isValidationError(): boolean {
    const validationErrors = [
      "invalid_blocks",
      "msg_too_long",
      "invalid_arguments",
      "invalid_array_arg",
    ];
    return validationErrors.includes(this.slackError);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      slackError: this.slackError,
      data: this.data,
      isValidationError: this.isValidationError(),
    };
  }
}
