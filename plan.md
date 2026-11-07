# Plan: Rebuilding this project from scratch

Order matters here. Each phase leaves something working and verifiable before the next one starts. The order is: content first, then GCP end to end, then automation. This plan targets GCP only.

## Phase 0: Prerequisites and accounts

1. Buy a domain (or reuse one) and decide on a registrar. You will point its nameservers at Cloud DNS (GCP).
2. Create accounts: GCP and GitHub.
3. Install tooling: Terraform >= 1.7, Node.js LTS (pin it in `.nvmrc`), [uv](https://docs.astral.sh/uv/) (it installs and manages Python 3.14 for the Cloud Function; the version is pinned later in `functions/visitor-counter/.python-version`, see Phase 4), gcloud SDK, Git.
4. Create the GitHub repo. Add a root `.gitignore` (`node_modules/`, `dist/`, `.terraform/`, `*.tfstate*`, `*.tfvars`, `.venv/`, `__pycache__/`, `*.zip`, `.DS_Store`, `.idea/`) and a LICENSE (MIT).
5. Set up IAM: a dedicated admin identity for GCP (not a personal owner account used day to day), and a billing budget and alert so experiments can't surprise you.
6. Decide the hostnames up front: the site at `<domain>` and the API at `api.<domain>`.
7. Check quotas before you rely on a service, especially the GCP project's Compute quotas in your target region.

## Phase 1: Resume website (React)

Status: steps 1 to 8 are done. Before the step 9 commit, replace the placeholder content in `src/data/` and `src/content/blog/`, and add the real `frontend/public/resume.pdf` (until then the "Download PDF" link serves the SPA HTML instead of a PDF). `.webp` images are not needed yet because the site has no photos.

1. Scaffold the app in `frontend/` with Vite + React and TypeScript: `npm create vite@latest frontend -- --template react-ts`. Pin the Node version (`.nvmrc`) and commit `package-lock.json`.
2. Add routing with React Router (`/`, `/resume`, `/projects`, `/projects/:slug`, `/blog`, `/blog/:slug`). Plan for client-side routing from the start, because the hosting layer in Phase 3 must serve `index.html` for unknown paths.
3. Build the UI as components:
   - Layout: header/nav, footer, theme (light/dark) toggle
   - Sections: About, Projects, Learning, Contact (each a component fed by a data file)
   - `VisitorCounter` component (placeholder until Phase 4)
   - Pages for resume (with a downloadable `public/resume.pdf`), project detail, and blog
4. Keep content out of the components: put projects and resume data in `src/data/*.ts` or JSON, and blog posts as Markdown files in `src/content/blog/` (frontmatter: `title`, `date`, `summary`), loaded at build time with `import.meta.glob` and rendered with `react-markdown`. Switch to `@mdx-js/rollup` only if posts ever need React components.
5. Static assets (images, favicons, `site.webmanifest`, resume PDF) go in `frontend/public/`. Use optimized `.webp` images.
6. Add basics: page titles and meta tags (`react-helmet-async`), accessible markup, responsive plain CSS in `src/index.css` (no CSS modules or Tailwind needed at this size), route-change focus handling, and a 404 page.
7. Add tests: Vitest + React Testing Library for routing and key components (`npm test`), oxlint for linting (`npm run lint`) and Prettier for formatting (`npm run format`, `npm run format:check`).
8. Run `npm run dev` and iterate locally. Run `npm run build` and `npm run preview` to confirm the `dist/` output works, including a direct load of a deep link like `/projects/foo`.
9. Commit (on the `wilson_resume` branch, then merge to `main`). **Checkpoint:** the production build works locally, and deep links work in preview.

Alternative if SEO or per-page HTML matters: use Next.js static export or Vite SSG so each route is pre-rendered. A plain SPA is simpler and is what the rest of this plan assumes.

## Phase 2: Remote Terraform state (GCP bootstrap)

This comes before any other infrastructure so everything after it can use a remote backend.

1. Create a GCP project (with billing linked) and enable the APIs you need (Storage, Compute, Cloud DNS, Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc, Firestore, IAM, IAM Credentials, Security Token Service, Cloud Resource Manager and Service Usage; the last three are needed for Workload Identity Federation and for Terraform to manage the project). Enable them once with `gcloud services enable` (or `google_project_service` resources) before applying anything that needs them.
2. Write `gcp/state/` Terraform: a Cloud Storage bucket for state (versioning on, uniform bucket-level access, public access prevention enforced). The GCS backend does native state locking, so no separate lock table is needed.
3. Apply it with local state, then optionally migrate its own state into the bucket.
4. Add Workload Identity Federation for GitHub Actions (`oidc.tf`): a workload identity pool and OIDC provider restricted to this repo (attribute condition on `assertion.repository`), plus a service account that the pool can impersonate, with least-privilege roles. This avoids long-lived service account keys in CI.
5. **Checkpoint:** `terraform init` works from another directory using the GCS backend. Give each later stack (`gcp/frontend`, `gcp/backend`) its own `backend.tf` with a distinct prefix.

## Phase 3: GCP frontend

1. `gcp/frontend/storage.tf`: a Cloud Storage bucket for the site (named after the domain or a unique name), uniform bucket-level access, and `index.html` as the main page. A backend bucket behind the load balancer needs the bucket to be publicly readable (`allUsers` with `roles/storage.objectViewer`; so public access prevention must not be enforced on this bucket, unlike the state bucket). This is fine for a public website, but nothing private may ever go in it.
2. `dns.tf`: a Cloud DNS managed zone and records. Update the registrar's nameservers.
3. `loadbalancer.tf`: a global external HTTPS load balancer with a reserved static IP, a backend bucket with Cloud CDN enabled, a URL map, a Google-managed SSL certificate, and an HTTP-to-HTTPS redirect.
4. SPA routing: Cloud Storage cannot fall back to `index.html` with a 200 on its own (a not-found page is served with a 404). Options, in order of preference (verify the first against current docs before committing to it, as I haven't tested it):
   - A custom error response policy on the load balancer URL map that matches 404 and serves `/index.html` with an overridden 200 status.
   - Use `HashRouter` (URLs like `/#/projects/foo`), which needs no server support but gives uglier URLs.
   - Accept the 404 status with the SPA HTML (browsers still render the app, but search engines and uptime checks see 404s).
   Test `/projects/foo` directly whichever you pick.
5. `deploy.sh`: run `npm ci && npm run build` in `frontend/`, upload with `gcloud storage rsync frontend/dist/ gs://<bucket> --delete-unmatched-destination-objects`, then set metadata (`gcloud storage objects update` or a separate `cp --cache-control`): long `Cache-Control` for hashed `assets/`, `no-cache` for `index.html`. Then invalidate the CDN cache (`gcloud compute url-maps invalidate-cdn-cache`). Read the bucket name and URL map name from `terraform output`, not hardcoded values (a known weak spot in the first build).
6. **Checkpoint:** `https://<your-domain>` serves the resume with a valid managed certificate. Managed certs only provision once the DNS A record points at the load balancer IP, and can take up to an hour or more.

## Phase 4: GCP backend (visitor counter)

Terraform for the backend lives in `gcp/backend/` (its own state prefix); the load balancer stays in `gcp/frontend/`.

1. `firestore.tf` (in `gcp/backend/`): a Firestore database (Native mode) with a single counter document.
2. Set up the Python project with uv in `functions/visitor-counter/`: `uv init --app`, `uv python pin 3.14` (writes `.python-version`), then `uv add functions-framework google-cloud-firestore` and `uv add --dev pytest`. Commit `pyproject.toml` and `uv.lock`.
3. `functions/visitor-counter/main.py`: an HTTP Cloud Function (Gen 2) that atomically increments the counter with `firestore.Increment(1)` (or a transaction) and returns the new count. Return CORS headers and handle `OPTIONS` preflight.
4. Cloud Functions deploys from a `requirements.txt`, so generate it from the lockfile with `uv export --no-dev --no-hashes -o requirements.txt` as part of the build rather than maintaining it by hand. Keep it out of git or regenerate it in CI so it can't drift from `uv.lock`.
5. `cloud-functions.tf` (in `gcp/backend/`): the function (2nd gen, `runtime = "python314"`, which is GA; keep it on the same minor version as `.python-version`), a dedicated runtime service account with least privilege (Firestore access on that database only), and Cloud Logging. Build the source zip with `archive_file` (include `main.py` and the generated `requirements.txt`; exclude `.venv/`, tests and `uv.lock`) and upload it to a source bucket from Terraform. The `requirements.txt` must be generated before `terraform plan`, so make that the first step of both the local deploy script and the CI job.
6. Restrict invocation and CORS: grant `roles/run.invoker` to `allUsers` on this function's underlying Cloud Run service only (Gen 2 functions need this, not the older `cloudfunctions.invoker`), and set `Access-Control-Allow-Origin` to your domain (allow `http://localhost:5173` too while developing, driven by a Terraform variable). Set a max instance count to cap cost.
7. `gcp/frontend/api-domain.tf`: an `api.<domain>` custom domain through the same load balancer (a serverless NEG for the Cloud Run service, routed by host in the existing URL map), with a managed cert and a DNS record. It lives in the frontend stack because that stack owns the load balancer and URL map; look the Cloud Run service up with a data source, so apply `gcp/backend` first. Prefer this over Cloud Run domain mappings, which are limited to certain regions.
8. Wire the `VisitorCounter` React component to `fetch` the API (URL from `VITE_API_URL`) and render the count, with loading and error states. Call it once per page load (guard against React StrictMode double-invoking the effect in dev).
9. Add a unit test for the function (mock the Firestore client) and run it with `uv run pytest`.
10. **Checkpoint:** the counter increments on each page load in production.

## Phase 5: CI/CD with GitHub Actions

1. `state.yml`: Terraform plan/apply for `gcp/state` (manual trigger).
2. `backend.yml`: on changes to `gcp/backend/**` or `functions/**`, install uv (`astral-sh/setup-uv`), run `uv sync --locked` and `uv run pytest` in `functions/visitor-counter/`, generate `requirements.txt` with `uv export`, then `terraform fmt -check`, `validate`, `plan`, and `apply` on main. Authenticate through Workload Identity Federation (`google-github-actions/auth`).
3. `frontend.yml`: on changes to `frontend/**` or `gcp/frontend/**`, run in `frontend/`: `npm ci`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` (with `VITE_API_URL` set), then rsync `dist/` to the bucket and invalidate the CDN cache. Use `actions/setup-node` with `node-version-file: .nvmrc` (the file is at the repo root) and npm caching with `cache-dependency-path: frontend/package-lock.json`.
4. Protect `main` (required checks) and keep `plan` output visible on PRs.
5. Use `uv sync --locked` in CI so a stale `uv.lock` fails the build instead of silently resolving new versions.
6. **Checkpoint:** a content-only commit under `frontend/` merged to main goes live without any manual step.

## Phase 6: Documentation and polish

1. Draw an architecture diagram (SVG in `docs/diagrams/`, outside the React app so it doesn't affect the build).
2. README: architecture, repo layout, prerequisites, deploy steps, known limitations.
3. Write blog posts as you go, not at the end. Good topics: why Terraform, OIDC for GitHub Actions, remote vs local state, and the GCP deployment write-up.
4. Add a cloud-resume-challenge case study as a project entry in the React app.
5. Add monitoring and cost guards: Cloud Monitoring alerts, budget alerts, and a cheap uptime check.

## Phase 7: Hardening (stretch)

- Security headers on the CDN (Cloud CDN custom response headers), Cloud Armor or rate limiting on the counter API.
- Smoke tests after deploy (curl the site and the API, assert on the status code and the count).
- Dedupe visitors (hash of IP + day) instead of counting every hit.
- Pin and update dependencies automatically (Dependabot, which supports both npm and uv).

## Lessons from the first build (avoid repeating)

- Hardcoded bucket and URL map IDs in `deploy.sh` files: read Terraform outputs instead.
- Committed Cloud Function zip files: build them in Terraform (`archive_file`) or in CI and keep them out of git.
- Setting up the OIDC role took several attempts: do it once in Phase 2 (Workload Identity Federation on GCP) and test it with a trivial workflow first.
