# ServiceLink project structure

```text
models/               MongoDB schemas
routes/               Public and account routes
routes/admin/         One admin module per management area
services/             Business integrations, including the dummy gateway
lib/                  Shared authorization, validation, security, and metrics
views/layouts/        Public and admin page shells
views/partials/       Shared navigation and sidebar components
views/admin/          Focused admin screens
views/payments/       Checkout and receipt screens
public/css/           Tailwind source and compiled stylesheet
public/js/            Shared browser interactions
tests/                Authorization, security, model, template, and payment tests
```

## Conventions

- Images are remote HTTP or HTTPS URLs. File uploads are intentionally not supported.
- Admin mutations remain POST-only and use CSRF protection.
- The payment gateway is a deterministic simulator, never a real payment processor.
- Soft-deleted services remain available to administrators for audit and restore workflows.
