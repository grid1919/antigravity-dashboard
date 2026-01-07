# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting feature
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Considerations

### Authentication

By default, the dashboard binds to `localhost` only and requires no authentication. This is safe for local development.

To enable network access:
1. Set the `DASHBOARD_SECRET` environment variable
2. The server will bind to all interfaces (`0.0.0.0`)
3. All API requests will require Bearer token authentication

### Sensitive Data

- **OAuth tokens** are stored in `~/.config/opencode/antigravity-accounts.json`
- **Never commit** your `.env` file or accounts file to version control
- The `/api/accounts/export` endpoint does not expose refresh tokens

### API Proxy

The API proxy (`/v1/messages`, `/v1/chat/completions`) uses your Antigravity accounts to make requests. Be aware that:
- All requests are logged to the SQLite database
- The proxy API key is derived from your configured accounts
- Rate limits from Google Cloud apply to your accounts

## Best Practices

1. Keep your `.env` file secure and never commit it
2. Use `DASHBOARD_SECRET` when exposing the dashboard on a network
3. Regularly rotate your Google OAuth credentials
4. Monitor the dashboard logs for unusual activity
