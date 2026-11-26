# Chart of Accounts frontend integration

Implemented in this project:

- `src/services/api/accountsApi.ts`: typed API contract for GET list/detail, POST create, PATCH update, and DELETE soft-deactivation.
- `src/pages/Accounts/`: account listing, filters, account detail view, and create/edit modal.
- Added `/accounts` route and a sidebar entry.
- Added responsive styles that use the existing light/dark theme CSS variables.
- Accounts requests use the existing `apiRequest` helper, which attaches `Authorization: Bearer <accessToken>` when a token exists.

## Contract safeguards

- Create sends only `name`, `parentId`, and `isGroup`.
- Update sends only supported editable fields (`name`, `parentId` when changed, and `isGroup`).
- No request sends `OrganizationId`, account code, account type, system-account flags, or Description.
- List defaults to active accounts. The inactive toggle requests `?includeInactive=true`.
- Delete is presented as deactivation and updates the local list; it is not described as permanent deletion.
- System accounts and fixed Cash/Bank codes 1001 and 1004 are protected in the UI. The backend remains authoritative.

## Environment

Keep the project's existing `VITE_API_BASE_URL` configuration. It should point to the deployed API base URL (or local API host) without manually appending `/accounts`.
The uploaded `.env` was intentionally excluded from the output archive; configure environment values separately and do not commit secrets.
