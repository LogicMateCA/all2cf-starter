# Team organizations pack

This optional pack configures the official Better Auth Organization plugin at the same version as Better Auth core. It adds organizations, members, verified-email invitations, active organization state, and teams. Organization `owner`, `admin`, and `member` roles remain tenant-scoped and never grant platform `/admin` access.

The SQL file is a clean empty-database baseline generated for the selected Starter shape. It is not a migration strategy for an existing product. An initialized product owns later upgrade migrations separately.

Invitation mail uses the Starter authentication email provider, so CFsend remains the default and Resend or Cloudflare Email Service remain explicit alternatives.
