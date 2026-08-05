# Create Notification (Story 5.10c)

Appwrite Function that creates role-targeted in-app notifications. The function
fully derives `target_roles` from its own `TYPE_CONFIG` and ignores any client-
supplied `target_roles` or `target_permissions`, preventing callers from
broadening the audience beyond the type's authorization matrix.

## Authorization Matrix

| Type | Required Permission | Target Roles |
| ---- | ------------------- | ------------ |
| `at_risk_learner` | `school:read` | School Administrator, Head Teacher, Teacher |
| `farm_alert:upcoming_harvest` | `farm:read` | Farm Manager, Crop Manager, Village Head, Deputy Village Head |
| `farm_alert:overdue_harvest` | `farm:read` | Farm Manager, Crop Manager, Village Head, Deputy Village Head |
| `farm_alert:low_inventory` | `farm:read` | Farm Manager, Crop Manager, Village Head, Deputy Village Head |
| `farm_alert:underperforming_yield` | `farm:read` | Farm Manager, Crop Manager, Village Head, Deputy Village Head |
| `farm_alert:crop_failure` | `farm:read` | Farm Manager, Crop Manager, Village Head, Deputy Village Head |
| `vendor_created` | `vendors:write` | Finance Manager, Farm Manager, Crop Manager, Village Head, Deputy Village Head |

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `DATABASE_ID` | Appwrite database ID (default: `villageDB`) |
| `TABLE_USERS` | Users table ID (default: `users`) |
| `TABLE_ROLES` | Roles table ID (default: `roles`) |
| `TABLE_NOTIFICATIONS` | Notifications table ID (default: `notifications`) |

See `appwrite_setup/FUNCTION_DEPLOYMENT.md` for full deployment instructions.
