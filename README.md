# Step-Up MFA Demo

A minimal React + Vite single-page app demonstrating Auth0 **step-up authentication**: users log in normally (Authorization Code + PKCE, no MFA), can view public content, but accessing the "protected page" triggers a fresh authorization request with `acr_values=http://schemas.openid.net/pape/policies/2007/06/multi-factor`. An Auth0 Action bound to the `post-login` trigger inspects that transaction and calls `api.multifactor.enable('any')`, forcing an MFA challenge. The app then checks the new ID token's `amr` claim for `"mfa"` before unlocking the protected content.

Reference: [Auth0 — Configure Step-Up Authentication for Web Apps](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication/configure-step-up-authentication-for-web-apps)

## Local setup

Create a `.env` file in the project root (this file is gitignored and must never be committed):

```
VITE_AUTH0_DOMAIN=auth.jaggerybyt.com
VITE_AUTH0_CLIENT_ID=OHBXAthSLNZAWLGwceqPJaEpI8FI5yCW
```

Then:

```
npm install
npm run dev
```

## How the step-up flow works

1. User logs in via the standard PKCE flow — no MFA required.
2. User clicks **Access Protected Page**. The app decodes the current ID token and checks the `amr` claim.
3. If `amr` doesn't include `"mfa"`, the app calls `loginWithRedirect` again with `acr_values` set to the step-up policy URI.
4. The `post-login` Action sees `acr_values` on the transaction and enables MFA for that login only.
5. After the user completes an MFA challenge, Auth0 redirects back with a new ID token containing `amr: ["mfa"]`, and the protected content unlocks.

Logging in and browsing the public page without ever clicking "Access Protected Page" never prompts for MFA — it's applied conditionally, not tenant-wide.

## Deployment

Pushing to `main` builds the app and deploys it to GitHub Pages via `.github/workflows/deploy.yml`. The Vite `base` path in `vite.config.js` is set to `/stepup-auth0-demo/` to match the GitHub Pages project site URL.

The workflow reads `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` from repository secrets (Settings → Secrets and variables → Actions) — add both with the same values as your local `.env` before the first deploy.
