# Contributing

Thanks for helping improve All2CF.

Use GitHub Discussions for questions, ideas, and early proposals. Open an Issue for a reproducible product defect, documentation problem, or scoped feature request.

Before posting:

- remove credentials, tokens, customer data, email addresses, logs containing personal data, and private URLs;
- search existing Issues and Discussions;
- include the affected product version and a minimal reproduction when possible;
- use All2CF Support for account, billing, authorization, or customer-specific deployment problems.

Pull requests are welcome for reproducible Starter foundation fixes, Pack adapters, tests and documentation. Product-specific business behavior belongs in the product that owns it and should not be generalized into Starter without an explicit architecture decision.

Before opening a pull request:

```bash
npm ci
npm run typecheck
npm run build:sites
npm run bundle:check:marketing
npm run bundle:check:web
npm run bundle:check:docs
```

Material changes must include one focused Change Spec under `changes/` and keep Agent Map and `/dp` sources current. Do not commit `.dev.vars`, project tokens, Cloudflare secrets, provider credentials, generated `dist/`, `node_modules/`, or customer-specific identities.
