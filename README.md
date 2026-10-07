# Handbollsbanken

A mobile-first handball practice planner for a small number of clubs. Coaches can curate a shared exercise library, build ordered training plans and draw reusable court diagrams. Each club's teams, members, exercises and plans are isolated from other clubs.

The planner turns the total session duration and exercise order into an elapsed-time timeline, splitting time evenly across the selected drills.

The interface supports Swedish and English. Swedish is selected by default; use the language selector in the app to switch languages. Your choice is saved on the device.

## Stack

- React, TypeScript and Vite; Tailwind CSS utilities, shadcn-style reusable UI primitives, and React-Konva.
- Progressive Web App support with an installable manifest and automatic service-worker updates.
- Azure Static Web Apps with its integrated Azure Functions API (no separately managed web server).
- Azure Table Storage for clubs, users, membership requests, teams, exercises and plans. Diagram JSON is stored in a private Azure Blob container.
- Static Web Apps built-in Microsoft Entra ID authentication. The API derives the signed-in identity from the Static Web Apps principal and enforces club membership and roles.
- Bicep provisions the Static Web App, Storage Account, Application Insights and storage data-role assignments. The application accesses Storage through `DefaultAzureCredential`; storage keys are disabled.

No SQL database, Cosmos DB, Kubernetes, Redis, Service Bus or App Service is used. Infrastructure provisions Static Web Apps Standard to support the configured identity and API setup; Storage and Application Insights are usage-based.

## Project layout

```text
.
├── .github/workflows/
│   ├── app-deploy.yml              # Build and deploy the site and integrated API
│   └── infra-deploy.yml            # Deploy Bicep after infra changes
├── api/
│   ├── src/domain.ts               # Domain types and request validation
│   ├── src/index.ts                # Authenticated HTTP API and authorization
│   ├── src/repository.ts           # Table Storage and diagram Blob repositories
│   ├── host.json
│   └── local.settings.example.json
├── infra/
│   ├── main.bicep
│   └── modules/
│       ├── application-insights.bicep
│       ├── static-web-app.bicep
│       └── storage.bicep
├── public/
│   ├── staticwebapp.config.json    # Routes, providers and API protection
│   └── favicon.svg
└── src/
    ├── components/                 # Shared UI and Konva diagram editor
    ├── lib/api.ts
    ├── App.tsx
    └── types.ts
```

## Local development

Prerequisites: Node.js 20+, npm, Azure Functions Core Tools v4, and Azurite. The local API uses an in-memory repository by default, so Azurite is only needed for the Functions host's local runtime storage.

1. Install packages:

   ```powershell
   npm install
   Set-Location api
   npm install
   Set-Location ..
   ```

2. Install and start Azurite if it is not already installed:

   ```powershell
   npm install --global azurite
   azurite --silent --location .azurite
   ```

3. In a second terminal, copy the example Functions settings and start the API:

   ```powershell
   Copy-Item api/local.settings.example.json api/local.settings.json
   Set-Location api
   npm run build
   func start
   ```

4. In another terminal, start Vite:

   ```powershell
   npm run dev
   ```

   Open the URL printed by Vite. Its `/api` proxy forwards requests to Functions on port 7071. Local development uses a mock coach identity (`DEV_AUTH=true`) and volatile in-memory application data; signing in with Microsoft is not part of the local flow. The example settings seed a small demo club so the library and planner work immediately. Data is lost when the local Functions process restarts.

To try the join-request flow, use another mock email in the browser console and reload:

```js
localStorage.setItem("handboll-dev-email", "new.coach@local.test");
location.reload();
```

Submit a request, then switch back to the seeded ClubAdmin with `localStorage.removeItem("handboll-dev-email"); location.reload();` to approve it. The mock identity header is accepted only by a local Functions process with `DEV_AUTH=true`; it is ignored in production.

To test against an Azure Storage account locally, set `STORAGE_MODE=table` and `STORAGE_ACCOUNT_NAME` in `api/local.settings.json`, then sign in to Azure CLI (`az login`) with an identity granted **Storage Table Data Contributor** and **Storage Blob Data Contributor**. Never put storage account keys in source control. The seeded local demo account has GlobalAdmin and ClubAdmin access; for another mock email, add it to `GLOBAL_ADMIN_EMAILS` before its first sign-in.

Build checks:

```powershell
npm run build
Set-Location api
npm run build
```

## Deploy to Azure

### 1. Configure Azure and GitHub

- Create an Azure resource group.
- Create an app registration/service principal for the infrastructure workflow. Grant it Contributor and User Access Administrator (or Owner) on that resource group so it can deploy resources and create the Storage data-role assignments.
- Configure a federated credential on that app registration for GitHub Actions: issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`, and subject `repo:gurrish/handbollsbanken:ref:refs/heads/main`. If you use a different repository or deploy from a GitHub environment, set the subject to match that repository or environment exactly.
- Azure authentication uses GitHub's OIDC federation; **do not create or store an Entra service-principal client secret**. `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID` are identifiers, not passwords. The workflow below reads them from GitHub secrets, but you can store them as repository variables instead if you update its `azure/login` inputs from `secrets.*` to `vars.*`.
- Add these GitHub repository secrets:
  - `AZURE_CLIENT_ID`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`
  - `SWA_DEPLOYMENT_TOKEN` (set after the first infrastructure deployment)
- Add these repository variables:
  - `AZURE_RESOURCE_GROUP`
  - `NAME_PREFIX` (optional; defaults to `handbollsbanken`)
  - `GLOBAL_ADMIN_EMAILS` (comma-separated sign-in email addresses for initial GlobalAdmins)

### 2. Deploy infrastructure

Push an `infra/**` change to `main`, or run **Deploy infrastructure** from the Actions tab. The workflow deploys the Static Web App, storage account, Application Insights and table/blob data roles. The first deployment can also be started locally:

```powershell
az login
az deployment group create `
  --resource-group <resource-group> `
  --template-file infra/main.bicep `
  --parameters namePrefix=<short-name> globalAdminEmails=<admin-email>
```

Use the resulting `staticWebAppName` output to retrieve the deployment token:

```powershell
az staticwebapp secrets list --name <static-web-app-name> --resource-group <resource-group> --query properties.apiKey --output tsv
```

Save that value as the GitHub `SWA_DEPLOYMENT_TOKEN` secret. The app's first release is then triggered by pushing an application change to `main` (or by running **Build and deploy application**).

### 3. Sign in and configure clubs

Sign in with an email listed in `GLOBAL_ADMIN_EMAILS`. GlobalAdmins can create clubs and review membership requests. A user signs in, chooses a club and submits a request; a ClubAdmin or GlobalAdmin approves or rejects it. Approved users start as Coaches. A GlobalAdmin or ClubAdmin can then set an approved member's role to ClubAdmin, Coach or Viewer.

Microsoft Entra ID uses Static Web Apps' preconfigured `aad` provider; the configuration deliberately does not override it with a custom identity-provider registration. The MVP does not currently enable Google or Facebook. Adding another custom identity provider requires configuring a complete custom Microsoft Entra registration too, because Static Web Apps custom provider registrations replace the preconfigured providers.

## Access model and API

- `GlobalAdmin`: create clubs, review requests across clubs and manage member roles.
- `ClubAdmin`: review requests for their club, create teams and manage club member roles.
- `Coach`: create and update exercises and training plans.
- `Viewer`: view approved club data and diagrams.
- Every team, join request, exercise and training plan is partitioned by `ClubId`; plans also reference a `TeamId`. API queries use the authenticated user's approved club, not a caller-supplied tenant identifier.
- `/api/*` is protected by Static Web Apps `authenticated` routing. Functions independently parse the trusted `x-ms-client-principal` header and check membership and role requirements.
- HTTP endpoints: `GET /api/bootstrap`; `POST /api/clubs` and `PUT /api/clubs/{id}`; `POST /api/join-requests`; `PATCH /api/join-requests/{id}`; `POST /api/teams`; exercise and plan collection `GET`/`POST` and item `PUT`/`DELETE`; `PATCH /api/users/{id}/role`.
- Scalar domain fields are stored as native Table properties, while list fields use JSON-encoded string properties. Diagram JSON is written to a private `diagrams` blob container and returned as part of the exercise DTO.

For production, set `GLOBAL_ADMIN_EMAILS` before the first user signs in and use a Microsoft Entra tenant policy appropriate for the clubs. User profiles and access decisions are application data; do not treat a client-supplied role or club ID as authoritative.
