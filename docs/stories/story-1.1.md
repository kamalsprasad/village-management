# Story 1.1: Project Setup and Quasar + Appwrite Integration

Status: Ready

## Story

As a **developer**,
I want a fully configured Quasar SSR project with Appwrite backend integration,
so that I have a solid foundation to build all subsequent features.

## Acceptance Criteria

1. Quasar Framework (Vue 3) project initialized with SSR mode enabled
2. Project structure follows Quasar best practices (pages, components, layouts, stores)
3. Appwrite SDK integrated with connection configuration (endpoint, project ID)
4. Environment variables configured for Appwrite credentials (.env file with .env.example template)
5. Basic routing setup with placeholder home page
6. Development server runs successfully on localhost with hot reload
7. README.md includes setup instructions for new developers
8. Git repository initialized with .gitignore configured

## Tasks / Subtasks

- [x] Task 1: Initialize Quasar Project with SSR (AC: 1, 2)
  - [x] Subtask 1.1: Run `yarn create quasar` with Vite, Pinia, ESLint, Prettier, Sass/SCSS
  - [x] Subtask 1.2: Add SSR mode with `quasar mode add ssr`
  - [x] Subtask 1.3: Install additional dependencies: `yarn add appwrite vue-cal@next dexie date-fns chart.js`
  - [x] Subtask 1.4: Verify project structure matches Quasar best practices

- [ ] Task 2: Configure Appwrite Integration (AC: 3, 4)
  - [ ] Subtask 2.1: Create `src/boot/appwrite.js` boot file
  - [ ] Subtask 2.2: Initialize Appwrite Client with endpoint and project ID
  - [ ] Subtask 2.3: Export Appwrite services (Account, Databases, Storage, Functions)
  - [x] Subtask 2.4: Create `.env` file with Appwrite credentials (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID)
  - [ ] Subtask 2.5: Create `.env.example` template with placeholder values
  - [x] Subtask 2.6: Update `.gitignore` to exclude `.env` file
  - [ ] Subtask 2.7: Configure Quasar to load environment variables

- [ ] Task 3: Setup Basic Routing and Home Page (AC: 5)
  - [ ] Subtask 3.1: Create `src/pages/IndexPage.vue` with placeholder content
  - [ ] Subtask 3.2: Create `src/layouts/MainLayout.vue` with basic structure
  - [ ] Subtask 3.3: Configure routes in `src/router/routes.js`
  - [ ] Subtask 3.4: Verify routing works with SSR

- [ ] Task 4: Verify Development Server (AC: 6)
  - [ ] Subtask 4.1: Run `quasar dev -m ssr` and verify server starts
  - [ ] Subtask 4.2: Test hot reload by modifying a component
  - [ ] Subtask 4.3: Verify SSR rendering by viewing page source
  - [ ] Subtask 4.4: Test on localhost with different browsers

- [ ] Task 5: Documentation and Git Setup (AC: 7, 8)
  - [ ] Subtask 5.1: Update README.md with project description
  - [ ] Subtask 5.2: Add setup instructions (prerequisites, installation, running dev server)
  - [ ] Subtask 5.3: Document Appwrite configuration steps
  - [ ] Subtask 5.4: Verify `.gitignore` includes node_modules, .env, dist, .quasar
  - [ ] Subtask 5.5: Initialize git repository if not already done
  - [ ] Subtask 5.6: Create initial commit with project setup

## Dev Notes

### Setup Commands Already Completed

**Note from Kamal (2025-10-25):** The following setup commands have already been executed:
- ✅ `yarn create quasar` - Project initialized
- ✅ `quasar mode add ssr` - SSR mode added
- ✅ `yarn add appwrite vue-cal@next dexie date-fns chart.js` - Dependencies installed

**Remaining Work:** Focus on Tasks 2-5 (Appwrite integration, routing, verification, documentation).

### Architecture Patterns and Constraints

**Technology Stack (from Architecture Section 2.1):**
- Quasar Framework v2.18.5 (Vue 3 + Vite)
- Appwrite v21.2.1 (Backend-as-a-Service)
- Pinia for state management
- Vue Router v4.x for routing
- Node.js >=20 LTS for SSR runtime

**Mandatory Patterns:**
- **Component Syntax:** Vue 3 `<script setup>` ONLY (never use `export default`)
- **File Naming:** PascalCase for components, camelCase for composables/utils/stores
- **Project Structure:** Follow Quasar conventions (`/src/pages`, `/src/components`, `/src/layouts`, `/src/stores`, `/src-ssr`)

**Appwrite Configuration:**
- Store credentials in `.env` file (never commit to git)
- Create boot file at `src/boot/appwrite.js` for initialization
- Export services: Account, Databases, Storage, Functions
- Configure in `quasar.config.js` boot array

**SSR Considerations:**
- Appwrite client must be initialized in boot file (runs on both server and client)
- Environment variables must be accessible in SSR context
- Test SSR rendering by viewing page source (should show pre-rendered HTML)

### Project Structure Notes

**Expected Directory Structure (from Architecture Section 1):**
```
village-app/
├── src/
│   ├── assets/          # Static assets
│   ├── boot/            # Boot files (appwrite.js, offline.js, etc.)
│   ├── components/      # Reusable Vue components
│   ├── css/             # Global styles (app.scss, quasar.variables.scss)
│   ├── layouts/         # Layout components (MainLayout.vue)
│   ├── pages/           # Page components (IndexPage.vue)
│   ├── router/          # Vue Router configuration
│   ├── stores/          # Pinia stores
│   └── App.vue          # Root component
├── src-ssr/             # SSR-specific code
│   ├── middlewares/     # SSR middlewares
│   └── server.js        # SSR server entry point
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template (committed)
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies
├── quasar.config.js     # Quasar configuration
└── README.md            # Project documentation
```

**Alignment Notes:**
- Quasar starter already provides this structure
- Verify all directories exist after initialization
- Add custom boot files as needed (appwrite.js is first)

### Testing Standards Summary

**Manual Testing Required:**
1. Development server starts without errors
2. Hot reload works when editing components
3. SSR renders HTML correctly (view page source)
4. Appwrite connection succeeds (test in browser console)
5. Environment variables load correctly

**Verification Commands:**
```bash
# Start dev server
quasar dev -m ssr

# Build for production (optional verification)
quasar build -m ssr

# Check for linting errors
yarn lint
```

### References

- [Source: docs/architecture.md#1-project-initialization] - Complete setup commands and initialization steps
- [Source: docs/architecture.md#2.1-core-technologies] - Technology stack versions and rationale
- [Source: docs/architecture.md#3.1-architectural-decisions] - Component syntax and naming conventions
- [Source: docs/epics.md#story-1.1] - Story acceptance criteria and prerequisites
- [Source: docs/PRD.md#nfr-8-maintainability-and-open-source] - Code quality and documentation standards

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

_To be filled by Dev Agent_

### Debug Log References

_To be added during implementation_

### Completion Notes List

_To be added during implementation_

### File List

_To be added during implementation_
