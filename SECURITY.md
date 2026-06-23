# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `monoproject-mcp`, please report it
responsibly. **Do not open a public issue for security problems.**

Email **mail@monostudio.dev** with:

- a description of the vulnerability and its impact,
- steps to reproduce (proof-of-concept if possible),
- the affected version / commit.

We aim to acknowledge reports within **3 business days** and to provide a
remediation timeline after triage. Please give us a reasonable window to fix
the issue before any public disclosure.

## Scope

This repository is a **thin MCP client** — an HTTP wrapper around the
MONOProject REST API. It holds no business logic, database, or secrets of its
own. Relevant security considerations:

- **Your API token is a credential.** It is read from the `MONO_API_TOKEN`
  environment variable and sent as a `Bearer` token. It grants access to your
  workspace with your permissions. Treat it like a password.
- **Never commit your `.env`.** It is gitignored. If a token leaks, revoke it
  immediately in MONOProject → Settings → API Tokens and issue a new one.
- **Server-side enforcement.** Authorization, rate limiting, and subscription
  checks live in the MONOProject API, not in this client. Vulnerabilities in
  those areas should be reported against the API, but feel free to flag
  anything you notice via the contact above.

## Supported Versions

The latest `main` is supported. Security fixes are released as new versions.
