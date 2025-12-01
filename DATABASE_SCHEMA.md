# Database Schema

The Village Management System uses Appwrite's TablesDB for data storage with a normalized schema design. All tables use ID-based relationships to prevent data duplication and maintain referential integrity.

## Core Tables

### users

Stores authentication and user account information.

| Column       | Type     | Constraints                 | Description                           |
| ------------ | -------- | --------------------------- | ------------------------------------- |
| `id`         | string   | Primary Key, Auto-generated | Unique user identifier                |
| `email`      | string   | Required, Unique, Indexed   | User email address for authentication |
| `name`       | string   | Required                    | User's display name                   |
| `created_at` | datetime | Auto-generated              | Account creation timestamp            |
| `updated_at` | datetime | Auto-updated                | Last modification timestamp           |

### residents

Stores comprehensive resident profile information with multi-role support.

| Column         | Type     | Constraints                          | Description                                 |
| -------------- | -------- | ------------------------------------ | ------------------------------------------- |
| `id`           | string   | Primary Key, Auto-generated          | Unique resident identifier                  |
| `name`         | string   | Required                             | Resident's full name                        |
| `dob`          | datetime | Optional                             | Date of birth                               |
| `gender`       | string   | Optional, Enum: Male/Female/Other    | Gender identity                             |
| `contact`      | string   | Optional                             | Contact information (phone/email)           |
| `household_id` | string   | Foreign Key → households.id, Indexed | Reference to household                      |
| `role_ids`     | string[] | Indexed                              | Array of role IDs for multi-role assignment |
| `created_at`   | datetime | Auto-generated                       | Record creation timestamp                   |
| `updated_at`   | datetime | Auto-updated                         | Last modification timestamp                 |

### households

Stores household information and composition.

| Column             | Type     | Constraints                         | Description                  |
| ------------------ | -------- | ----------------------------------- | ---------------------------- |
| `id`               | string   | Primary Key, Auto-generated         | Unique household identifier  |
| `name`             | string   | Required                            | Household name or identifier |
| `head_resident_id` | string   | Foreign Key → residents.id, Indexed | Reference to household head  |
| `address`          | string   | Optional                            | Physical address or location |
| `created_at`       | datetime | Auto-generated                      | Record creation timestamp    |
| `updated_at`       | datetime | Auto-updated                        | Last modification timestamp  |

### roles

Stores role definitions with permissions and storage quotas for RBAC.

| Column          | Type     | Constraints                 | Description                                    |
| --------------- | -------- | --------------------------- | ---------------------------------------------- |
| `id`            | string   | Primary Key, Auto-generated | Unique role identifier                         |
| `name`          | string   | Required, Unique            | Role name (e.g., Admin, Village Head, Teacher) |
| `permissions`   | string[] | Required                    | Array of permission strings                    |
| `storage_quota` | integer  | Required                    | Storage quota in GB                            |
| `created_at`    | datetime | Auto-generated              | Record creation timestamp                      |
| `updated_at`    | datetime | Auto-updated                | Last modification timestamp                    |

## Relationships

The database uses a normalized schema with ID-based relationships:

- **residents → households**: Many-to-one relationship via `residents.household_id` referencing `households.id`
- **households → residents**: One-to-many relationship via `households.head_resident_id` referencing `residents.id`
- **residents → roles**: Many-to-many relationship via `residents.role_ids` array containing role IDs

## Indexes

Indexes are created on frequently queried fields to optimize performance:

| Table        | Column             | Purpose                                 |
| ------------ | ------------------ | --------------------------------------- |
| `users`      | `email`            | Fast user lookup during authentication  |
| `residents`  | `household_id`     | Efficient household member queries      |
| `residents`  | `role_ids`         | Role-based filtering and access control |
| `households` | `head_resident_id` | Quick household head lookups            |

## Permissions

Table-level permissions are configured for role-based access control:

- **Read Access**: All authenticated users can read data from all tables
- **Write Access**: Only users with Admin or Village Head roles can create, update, or delete records
- **Row-Level Permissions**: Future enhancement for user-specific data access

## Example Queries

### List all residents in a household

```javascript
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';

const householdResidents = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.equal('household_id', 'household_123')],
});
```

### Get household with head resident details

```javascript
// First, get the household
const household = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'households',
  rowId: 'household_123',
});

// Then, get the head resident
const headResident = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: household.head_resident_id,
});
```

### Find all residents with a specific role

```javascript
const teachers = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.search('role_ids', 'teacher_role_id')],
});
```

### Create a new resident

```javascript
const newResident = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: 'unique()',
  data: {
    name: 'John Doe',
    dob: '1990-01-15',
    gender: 'Male',
    contact: '+260-97-123-4567',
    household_id: 'household_123',
    role_ids: ['resident_role_id'],
  },
});
```

## Database Setup

For detailed instructions on setting up the Appwrite database, see [appwrite_setup/README.md](appwrite_setup/README.md).
