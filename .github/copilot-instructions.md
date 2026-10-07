# Copilot instructions

## Project overview

Handbollsbanken is a small, multi-club handball training planner for at most 100 users. Keep the architecture simple and low-cost. The frontend is a React, TypeScript and Vite PWA. The backend is an Azure Functions API integrated with Azure Static Web Apps. Structured data belongs in Azure Table Storage; court diagrams belong in private Azure Blob Storage.

Do not introduce SQL databases, Cosmos DB, Kubernetes, App Service, Redis, Service Bus, or other infrastructure without an explicit requirement.

## Project structure

- `src/`: React application, screens, shared UI, client API, and React-Konva diagram editor.
- `api/src/domain.ts`: domain types and Zod request validation.
- `api/src/index.ts`: Functions HTTP routes, identity, authentication, and authorization.
- `api/src/repository.ts`: repository interface and in-memory/Table Storage implementations.
- `infra/`: Bicep entry point and resource modules.
- `public/staticwebapp.config.json`: Static Web Apps authentication, API route access, and SPA navigation.
- `.github/workflows/`: infrastructure and application CI/CD.

## Code conventions

- Use TypeScript for application and API code. Preserve strict type checking; avoid `any` and unsafe casts.
- Follow existing React component patterns and the shared UI primitives in `src/components/ui.tsx`.
- Keep UI responsive and mobile-first. Maintain the established visual language and accessible labels, dialog behavior, keyboard support, and focus handling.
- Validate and constrain all API input with Zod schemas in `api/src/domain.ts`. Return actionable client errors for invalid requests and avoid silently swallowing unexpected failures.
- Keep persistence behind the `Repository` interface. Implement changes for both `MemoryRepository` and `TableRepository` where applicable.
- Use native Table Storage partition and row keys. Partition club-owned records by `ClubId`; include a team ID where applicable. Persist diagram JSON in the private Blob container rather than embedding it in Table entities.
- Reuse established domain types, validation, and shared components rather than duplicating them.

## Authentication, authorization, and tenant isolation

- Production API requests must use the authenticated Static Web Apps `x-ms-client-principal` identity. Never trust a role, user ID, or club ID supplied by the browser.
- The `x-dev-user-email` mock identity is for local development only. Do not enable or accept it in production.
- Enforce role checks on the API for every write or administrative operation. The UI may hide controls for usability, but it is not an authorization boundary.
- Scope all club queries and resource lookups to the signed-in user's approved club. GlobalAdmin access must be explicit. Never expose data across clubs through bootstrap responses, list queries, or guessed resource IDs.
- New users require an approved membership before receiving club data. Preserve the join-request and admin approval flow.
- Assign storage access through managed identity and Azure RBAC. Do not add storage account keys or credentials to application code.

## Build and validation

- Frontend: `npm ci` then `npm run build` from the repository root.
- Functions API: `npm ci` then `npm run build` from `api/`.
- Infrastructure: `az bicep build --file infra/main.bicep`.
- For changes, run the smallest relevant checks and add or update tests for behavior changes. Check `git diff --check` before finishing.
- Keep root and API lockfiles committed when dependencies change. Do not install packages unless a dependency manifest has changed or a validation command reports a missing package.

## Infrastructure and deployment

- Keep Azure resources defined in Bicep under `infra/` and use the existing modules where practical.
- Preserve Static Web Apps integrated Functions hosting and the current managed-identity design.
- The infrastructure workflow authenticates with GitHub OIDC federation; do not add a client-secret requirement for the Entra service principal.
- Keep workflow triggers and README deployment instructions aligned when changing resource parameters, secrets, variables, routes, or deployment paths.
- Google login is optional and uses the documented OAuth settings. Do not claim providers are enabled unless both configuration and credentials are in place.

## Documentation

Update `README.md` when changing local setup, domain flows, authentication providers, infrastructure, required GitHub settings, or deployment procedures. Document limitations and required external configuration explicitly; do not imply that Azure resources have already been deployed.
