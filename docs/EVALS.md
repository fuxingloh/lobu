# Agent Evaluations

Evaluate your agent's quality with `lobu eval`. Define what "good" looks like using YAML eval files and markdown rubrics, then measure it with statistical trials.

## Quick Start

1. Create an `evals/` directory inside your agent's content directory:
   ```
   agents/my-agent/
     IDENTITY.md
     evals/
       ping.yaml
   ```

2. Write an eval file:
   ```yaml
   name: ping
   description: Agent responds to a simple greeting
   trials: 3
   timeout: 30

   turns:
     - content: "Hello, are you there?"
       assert:
         - type: contains
           value: "hello"
           options: { case_insensitive: true }
   ```

3. Run it:
   ```bash
   lobu eval
   ```

Every run auto-saves results and generates a comparison report at `evals/evals-report.md`.

## Eval File Format

Each `.yaml` file in your agent's `evals/` directory defines one evaluation.

```yaml
name: my-eval                        # Required: unique name
description: What this tests         # Optional
trials: 3                            # How many times to run (default: 3)
timeout: 120                         # Seconds per turn (default: 120)
tags: [smoke, fast]                  # Optional tags
rubric: my-eval.rubric.md            # Optional: path to rubric file (relative)

scoring:
  pass_threshold: 0.8                # Fraction of trials that must pass (default: 0.8)

turns:
  - content: "User message"
    assert:
      - type: contains
        value: "expected text"
        weight: 0.5
      - type: llm-rubric
        value: "Criteria for LLM judge"
        weight: 0.5
```

### Turns

Each turn sends a message to the agent and optionally checks the response. Turns without `assert` are sent but not scored (useful for setup messages in multi-turn conversations).

### Assertion Types

#### `contains`
Checks if the agent's response contains a string.

```yaml
- type: contains
  value: "expected text"
  options:
    case_insensitive: true     # Optional, default: false
```

#### `regex`
Checks if the agent's response matches a regular expression.

```yaml
- type: regex
  value: "(hello|hi|hey)"
```

#### `llm-rubric`
Uses an LLM judge (via the Lobu gateway) to evaluate the response against criteria. The judge runs in a separate context to avoid bias.

```yaml
- type: llm-rubric
  value: "Response is friendly and acknowledges the greeting"
```

## Rubrics

For deeper evaluation, create a markdown rubric file. When `rubric` is specified in the eval YAML, the full conversation transcript is graded against it after all turns complete.

**Example: `follows-instructions.rubric.md`**

```markdown
# Instruction Following

## Direct Compliance
- Agent addresses the specific request, not a tangential topic
- Response format matches formatting instructions given

## Boundary Respect
- Agent does not add unrequested features or information
- Stays within scope of the conversation
```

The rubric grader returns per-criterion pass/fail with explanations, so you can see exactly which criteria your agent fails on.

### Tips for Writing Rubrics

Borrowed from [Claude's outcomes documentation](https://platform.claude.com/docs/en/managed-agents/define-outcomes):

- Structure as explicit, gradeable criteria: "The response contains exactly 3 bullet points" not "The response looks good"
- Each criterion should be independently scoreable
- If you don't have a rubric, give Claude an example of a known-good response and ask it to analyze what makes it good, then turn that into a rubric

## CLI Usage

```bash
lobu eval                              # Run all evals for default agent
lobu eval ping                         # Run a specific eval by name
lobu eval -a hr-assistant              # Run evals for a specific agent
lobu eval -m claude/sonnet             # Eval with a specific model
lobu eval -m openai/gpt-4.1            # Compare against a different model
lobu eval --trials 10                  # Override trial count
lobu eval --ci --output results.json   # CI mode: JSON output, non-zero exit on failure
```

## Comparing Models

Run the same evals against different models to find the best fit for your agent:

```bash
lobu eval -m claude/sonnet
lobu eval -m openai/gpt-4.1
lobu eval -m google/gemini-2.5-pro
```

Each run auto-saves results to `evals/.results/`. A comparison report is generated at `evals/evals-report.md` after every run, showing all models side by side:

```markdown
## Model Comparison

| Eval                  | claude/sonnet      | openai/gpt-4.1    | google/gemini-2.5-pro |
| --------------------- | ------------------ | ------------------ | --------------------- |
| ping                  | PASS 0.95 (100%)   | PASS 0.88 (100%)   | PASS 0.91 (100%)      |
| context-retention     | PASS 0.90 (80%)    | FAIL 0.65 (60%)    | PASS 0.85 (80%)       |
| follows-instructions  | PASS 0.87 (80%)    | PASS 0.82 (80%)    | FAIL 0.70 (60%)       |

## Overall Scores

| Model                   | Pass Rate | Avg Score | p50 Latency | Total Tokens |
| ----------------------- | --------- | --------- | ----------- | ------------ |
| claude/sonnet           | 100%      | 0.91      | 2100ms      | 12,450       |
| openai/gpt-4.1         | 67%       | 0.78      | 1800ms      | 10,200       |
| google/gemini-2.5-pro   | 67%       | 0.82      | 2400ms      | 11,800       |
```

## Token Usage

Every eval run tracks token consumption per turn and per eval. This helps you compare not just quality but cost across models. Token counts appear in:
- Console output (per eval summary)
- JSON results (`totalTokens` field on each eval)
- Markdown comparison report (Total Tokens column)

## Multi-Turn Conversations

Test how your agent handles context across turns:

```yaml
name: context-retention
trials: 5

turns:
  - content: "My name is Alice and I work at Acme Corp."

  - content: "What company do I work at?"
    assert:
      - type: contains
        value: "Acme"

  - content: "And what's my name?"
    assert:
      - type: contains
        value: "Alice"
```

The first turn has no assertions -- it sets up context. Subsequent turns test recall.

## Iteration Workflow

1. **Write evals first** -- before changing your agent's prompts, define what "good" looks like
2. **Run a baseline** -- `lobu eval -m claude/sonnet`
3. **Make changes** -- update IDENTITY.md, SOUL.md, skills, etc.
4. **Re-run evals** -- `lobu eval -m claude/sonnet`
5. **Compare** -- open `evals/evals-report.md` to see before/after
6. **Try other models** -- `lobu eval -m openai/gpt-4.1` to compare
7. **Look at rubric feedback** -- per-criterion explanations show exactly what's missing

## CI Integration

Run evals in GitHub Actions:

```yaml
- name: Run agent evals
  run: lobu eval --ci --output results.json
  env:
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

The `--ci` flag outputs JSON to stdout and exits with code 1 if any eval fails.

## Results JSON

```json
{
  "agent": "hr-assistant",
  "model": "sonnet",
  "provider": "claude",
  "timestamp": "2026-04-09T12:00:00Z",
  "summary": { "total": 3, "passed": 3, "failed": 0 },
  "evals": [
    {
      "name": "ping",
      "passRate": 1.0,
      "avgScore": 0.91,
      "p50LatencyMs": 2100,
      "totalTokens": { "inputTokens": 1200, "outputTokens": 450, "totalTokens": 1650 },
      "trials": [...]
    }
  ]
}
```
