# Farm Module

Module for managing farm operations, crop tracking, and agricultural profitability.

## Structure

```
src/modules/farm/
├── components/         # Farm-specific components
│   ├── plots/         # Plot management components
│   ├── plantings/     # Planting record components
│   ├── harvests/      # Harvest recording components
│   └── dashboard/     # Dashboard widgets
├── composables/       # Farm composables
│   └── useFarmData.js # Data fetching composable
├── pages/             # Farm pages
│   ├── FarmIndexPage.vue      # Farm module landing
│   ├── FarmDashboardPage.vue  # Farm dashboard
│   ├── PlotsListPage.vue      # Plot management
│   ├── PlantingsListPage.vue  # Planting records
│   ├── HarvestsListPage.vue   # Harvest records
│   └── CropsDatabasePage.vue  # Crop database management
├── stores/            # Farm state management
│   └── farm-store.js  # Main farm store
└── router.js          # Farm routes
```

## Dependencies

- Inventory Store (for seed inventory)
- Finance Store (for expense/income integration)
- Residents Store (for Crop Manager assignments)

## Epic 3 Stories Covered

- Story 3.1: Plot Management
- Story 3.2: Crops Database
- Story 3.3: Planting Records with Seed Inventory
- Story 3.4: Planting Status Tracking
- Story 3.5: Harvest Recording
- Story 3.6: Continuous Picking Harvests
- Story 3.7: Automatic Inventory from Harvest
- Story 3.8: Sales Recording
- Story 3.9: Profitability Analysis
