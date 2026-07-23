# Advanced CI Feedback Loop

This pull request replaces the basic CI definitions with an execution-oriented feedback system that records structured evidence, publishes actionable PR feedback, and optionally requests AI-assisted failure analysis through the OpenAI Responses API.

The workflows remain authoritative: they run repository scripts on `ubuntu-latest`, collect logs and exit codes, preserve artifacts, and never claim a failed or skipped gate passed.

Direct attachment to an existing ChatGPT conversation is not possible from GitHub Actions. Instead, the repository exposes machine-readable artifacts and PR comments that a connected ChatGPT GitHub session can inspect, while an optional server-side OpenAI integration can analyze failures when repository secrets are configured.
