/**
 * LLM-as-judge grader using the Lobu gateway.
 *
 * Borrows the Claude outcomes pattern: a separate evaluator context
 * grades agent output against a markdown rubric with per-criterion scoring.
 */

import {
  createSession,
  deleteSession,
  sendAndCollect,
  type CollectedResponse,
} from "./client.js";
import type { RubricResult, TurnResult } from "./types.js";

export async function gradeWithRubric(
  gatewayUrl: string,
  authToken: string,
  rubricContent: string,
  turns: TurnResult[],
  timeoutMs: number
): Promise<RubricResult> {
  const transcript = turns
    .map((t) => `User: ${t.user}\nAgent: ${t.agent}`)
    .join("\n\n");

  const prompt = `## Rubric\n${rubricContent}\n\n## Conversation Transcript\n${transcript}\n\nGrade the agent's responses against the rubric. Return JSON only.`;

  const session = await createSession(gatewayUrl, authToken, {
    forceNew: true,
    dryRun: true,
  });

  try {
    const response = await sendAndCollect(session, prompt, timeoutMs);
    return parseGraderResponse(response);
  } finally {
    await deleteSession(session);
  }
}

export async function gradeInline(
  gatewayUrl: string,
  authToken: string,
  criteria: string,
  agentResponse: string,
  timeoutMs: number
): Promise<{ passed: boolean; score: number; reason: string }> {
  const prompt = `## Criteria\n${criteria}\n\n## Agent Response\n${agentResponse}\n\nDoes the response meet the criteria? Return JSON only: { "passed": boolean, "score": 0.0-1.0, "reason": "one sentence" }`;

  const session = await createSession(gatewayUrl, authToken, {
    forceNew: true,
    dryRun: true,
  });

  try {
    const response = await sendAndCollect(session, prompt, timeoutMs);
    return parseInlineResponse(response);
  } finally {
    await deleteSession(session);
  }
}

function parseGraderResponse(response: CollectedResponse): RubricResult {
  if (response.error) {
    return {
      score: 0,
      criteria: [{ name: "error", passed: false, explanation: response.error }],
    };
  }

  try {
    const json = extractJSON(response.text);
    const parsed = JSON.parse(json) as {
      criteria?: Array<{ name: string; passed: boolean; explanation: string }>;
      score?: number;
    };
    return {
      score: typeof parsed.score === "number" ? parsed.score : 0,
      criteria: Array.isArray(parsed.criteria)
        ? parsed.criteria.map((c) => ({
            name: String(c.name ?? ""),
            passed: Boolean(c.passed),
            explanation: String(c.explanation ?? ""),
          }))
        : [],
    };
  } catch {
    return {
      score: 0,
      criteria: [
        {
          name: "parse_error",
          passed: false,
          explanation: "Failed to parse grader response",
        },
      ],
    };
  }
}

function parseInlineResponse(response: CollectedResponse): {
  passed: boolean;
  score: number;
  reason: string;
} {
  if (response.error) {
    return { passed: false, score: 0, reason: response.error };
  }

  try {
    const json = extractJSON(response.text);
    const parsed = JSON.parse(json) as {
      passed?: boolean;
      score?: number;
      reason?: string;
    };
    return {
      passed: Boolean(parsed.passed),
      score:
        typeof parsed.score === "number" ? parsed.score : parsed.passed ? 1 : 0,
      reason: String(parsed.reason ?? ""),
    };
  } catch {
    return {
      passed: false,
      score: 0,
      reason: "Failed to parse grader response",
    };
  }
}

/** Extract JSON from text that may contain markdown fences or surrounding prose. */
function extractJSON(text: string): string {
  // Try to find JSON in markdown code block
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenced?.[1]) return fenced[1].trim();

  // Try to find raw JSON object
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text.trim();
}
