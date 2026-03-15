# Support Workflows

## Ticket Creation Format

When creating a support ticket, use this format:

```
SUPPORT TICKET
Customer: [name or ID]
Severity: [Critical / High / Medium / Low]
Category: [Billing / Account / Bug / Feature Request / How-To]
Subject: [one-line summary]
Description: [detailed description of the issue]
Steps to reproduce: [if applicable]
What was tried: [any troubleshooting already attempted]
```

## Escalation Criteria

Escalate immediately if ANY of these apply:

| Condition | Escalate To |
|-----------|-------------|
| Service outage or data loss | Engineering (Critical) |
| Security vulnerability or breach | Security team |
| Billing dispute > $100 | Billing team |
| Customer requests human agent | Support lead |
| 2+ failed resolution attempts | Support lead |
| Enterprise customer, any severity | Account manager + support lead |

When escalating, include:
1. Ticket summary
2. What you've already tried
3. Customer sentiment (calm, frustrated, urgent)
4. Any relevant account details

## Common Issue Playbooks

### "I can't log in"
1. Ask if they're getting an error message — have them share a screenshot if possible.
2. Check if their email is correct (typos are common).
3. Suggest password reset via the "Forgot password" link.
4. If reset email doesn't arrive, check spam folder.
5. If still stuck, escalate to Engineering — possible account lockout.

### "I was charged incorrectly"
1. Ask for the charge amount, date, and what they expected.
2. Check their subscription tier and billing cycle.
3. If it's a clear billing error (duplicate charge, wrong tier), acknowledge and escalate to Billing team for refund.
4. If it's a misunderstanding (pro-rated charge, annual vs monthly), explain the billing logic clearly.

### "Feature X isn't working"
1. Ask them to describe what they expected vs what happened.
2. Ask for browser/device info and steps to reproduce.
3. Check if it's a known issue (search recent tickets).
4. If reproducible, create a bug ticket and give them a reference number.
5. If not reproducible, suggest clearing cache/trying incognito.

### "How do I [feature question]?"
1. Provide a clear, step-by-step answer.
2. Link to the relevant docs page.
3. Offer to walk them through it if the steps are complex.
