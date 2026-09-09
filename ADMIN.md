# ServiceLink administration

The admin workspace is available at `/admin` to administrator accounts. Each
responsibility has its own focused section: overview, users, services,
bookings, payments, disputes, categories, reviews, and provider verification.

## Create the first administrator

Set the following environment variables in `.env`:

```text
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-password
ADMIN_NAME=ServiceLink Admin
ADMIN_CONTACT=Administrator
```

`ADMIN_PASSWORD` must contain at least 12 characters. Then run:

```text
npm run admin:create
```

The command creates the account or safely promotes the matching existing
account. Public registration can only create customer and provider accounts.

## Image policy

Service thumbnails, profile avatars, and review images accept HTTP or HTTPS
URLs only. ServiceLink does not accept or store uploaded image files.

## Dummy payment gateway

The MVP includes a local payment simulator. It never connects to a bank and
never stores cardholder names, card numbers, expiry dates, or CVVs.

- Successful payment: `4242 4242 4242 4242`
- Declined payment: `4000 0000 0000 0002`

Customers can pay after a provider confirms a booking. Receipts are visible to
the customer, provider, and administrators. Administrators can issue a dummy
refund from `/admin/payments`.
