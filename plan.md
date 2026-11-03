# Plan: Rebuilding this project from scratch

Order matters here. Each phase leaves something working and verifiable before the next one starts. The order is: content first, then one cloud end to end, then automation, then the other clouds.

## Phase 0: Prerequisites and accounts

1. Buy a domain (or reuse one) and decide on a registrar. You will point its nameservers at Cloud DNS (GCP) and, later, Route 53 / Azure DNS for subdomains.
2. Create accounts: AWS, GCP, Azure, GitHub.
3. Install tooling: Terraform >= 1.7, Node.js LTS (pin it in `.nvmrc`), Python 3.11 (for the Lambda and Cloud Function; pin it in `.python-version`), AWS CLI, gcloud SDK, Azure CLI, Git.
4. Create the GitHub repo. Add `.gitignore` (`node_modules/`, `dist/`, `.terraform/`, `*.tfstate*`, `.venv/`) and a LICENSE.
5. Set up IAM: a non-root admin user (or SSO) for AWS and a dedicated admin identity for GCP and Azure, and a billing budget and alert on every cloud so experiments can't surprise you.
6. Decide the hostnames up front: the primary site on GCP at `<domain>` (with `api.<domain>`), and delegated subdomains for the other clouds, for example `aws.<domain>` (with `api.aws.<domain>`) and `azure.<domain>`.
7. Check quotas before you rely on a service, especially Azure Functions/App Service plans in your target region and the GCP project's Compute quotas (a quota blocked the Azure backend last time).

## Phase 1: Resume website (React)

1. Scaffold the app in `frontend/` with Vite + React (TypeScript optional but recommended): `npm create vite@latest frontend -- --template react-ts`. Pin the Node version (`.nvmrc`) and commit `package-lock.json`.
2. Add routing with React Router (`/`, `/resume`, `/projects`, `/projects/:slug`, `/blog`, `/blog/:slug`). Plan for client-side routing from the start, because the hosting layers in later phases must serve `index.html` for unknown paths.
3. Build the UI as components:
   - Layout: header/nav, footer, theme (light/dark) toggle
   - Sections: About, Projects, Learning, Contact (each a component fed by a data file)
   - `VisitorCounter` component (placeholder until Phase 4)
   - Pages for resume (with a downloadable `public/resume.pdf`), project detail, and blog
4. Keep content out of the components: put projects and resume data in `src/data/*.ts` or JSON, and blog posts as Markdown/MDX files loaded with `@mdx-js/rollup` (or `react-markdown`).
5. Static assets (images, favicons, `site.webmanifest`, resume PDF) go in `frontend/public/`. Use optimized `.webp` images.
6. Add basics: page titles and meta tags (`react-helmet-async`), accessible markup, responsive CSS (CSS modules or Tailwind), and a 404 page.
7. Add tests: Vitest + React Testing Library for key components, and ESLint/Prettier.
8. Run `npm run dev` and iterate locally. Run `npm run build` and `npm run preview` to confirm the `dist/` output works, including a direct load of a deep link like `/projects/foo`.
9. Commit. **Checkpoint:** the production build works locally, and deep links work in preview.

Alternative if SEO or per-page HTML matters: use Next.js static export or Vite SSG so each route is pre-rendered. A plain SPA is simpler and is what the rest of this plan assumes.

## Phase 2: Remote Terraform state (GCP bootstrap)

This comes before any other infrastructure so everything after it can use a remote backend.

1. Create a GCP project (with billing linked) and enable the APIs you need (Storage, Compute, Cloud DNS, Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc, Firestore, IAM Credentials). Enable them once with `gcloud services enable` (or `google_project_service` resources) before applying anything that needs them.
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
5. `deploy.sh`: run `npm ci && npm run build` in `frontend/`, upload with `gcloud storage rsync frontend/dist/ gs://<bucket> --delete-unmatched-destination-objects`, then set metadata (`gcloud storage objects update` or a separate `cp --cache-control`): long `Cache-Control` for hashed `assets/`, `no-cache` for `index.html`. Then invalidate the CDN cache (`gcloud compute url-maps invalidate-cdn-cache`). Read the bucket name and URL map name from `terraform output`, not hardcoded values (a known weak spot in the current repo).
6. **Checkpoint:** `https://<your-domain>` serves the resume with a valid managed certificate. Managed certs only provision once the DNS A record points at the load balancer IP, and can take up to an hour or more.

## Phase 4: GCP backend (visitor counter)

1. `firestore.tf`: a Firestore database (Native mode) with a single counter document.
2. `functions/visitor-counter/main.py` plus `requirements.txt`: an HTTP Cloud Function (Gen 2) that atomically increments the counter with `firestore.Increment(1)` (or a transaction) and returns the new count. Return CORS headers and handle `OPTIONS` preflight.
3. `cloud-functions.tf`: the function, a dedicated runtime service account with least privilege (Firestore access on that database only), and Cloud Logging. Build the source zip with `archive_file` and upload it to a source bucket from Terraform.
4. Restrict invocation and CORS: grant `roles/run.invoker` to `allUsers` on this function's underlying Cloud Run service only (Gen 2 functions need this, not the older `cloudfunctions.invoker`), and set `Access-Control-Allow-Origin` to your domain. Set a max instance count to cap cost.
5. `api-domain.tf`: an `api.<domain>` custom domain through the same load balancer (a serverless NEG for the Cloud Run service, routed by host), with a managed cert and a DNS record. Prefer this over Cloud Run domain mappings, which are limited to certain regions.
6. Wire the `VisitorCounter` React component to `fetch` the API (URL from `VITE_API_URL`) and render the count, with loading and error states. Call it once per page load (guard against React StrictMode double-invoking the effect in dev).
7. Add a unit test for the function (mock the Firestore client).
8. **Checkpoint:** the counter increments on each page load in production.

## Phase 5: CI/CD with GitHub Actions

1. `state.yml`: Terraform plan/apply for `gcp/state` (manual trigger).
2. `backend.yml`: on changes to `gcp/backend/**`, run tests, then `terraform fmt -check`, `validate`, `plan`, and `apply` on main. Authenticate through Workload Identity Federation (`google-github-actions/auth`).
3. `frontend.yml`: on changes to `frontend/**` or `gcp/frontend/**`, run lint and tests, `npm ci && npm run build` (with `VITE_API_URL` set), rsync `dist/` to the bucket, invalidate the CDN cache. Cache `node_modules` with `actions/setup-node`.
4. Protect `main` (required checks) and keep `plan` output visible on PRs.
5. Set up Python in the backend workflow (`actions/setup-python`) so the function's tests run in CI.
6. **Checkpoint:** a content-only commit under `frontend/` merged to main goes live without any manual step.

## Phase 6: AWS port

Goal: prove the design is portable, not just copy it. Serve it from a delegated subdomain such as `aws.<domain>`: create a Route 53 hosted zone for that subdomain and add the NS records in the Cloud DNS zone.

1. Remote state: an S3 bucket (versioning, encryption, public access blocked) with native S3 state locking (or a DynamoDB lock table), in `aws/state/`. Add the GitHub OIDC provider and an IAM role for GitHub Actions scoped to this repo and branch.
2. Backend: a DynamoDB table (on-demand) with a counter item, a Lambda in `aws/backend/lambda/` doing an atomic `UpdateItem ADD`, an IAM role with least privilege, and an API Gateway HTTP API with CORS. Add an `api.<domain>` custom domain.
3. Frontend: a private S3 bucket with an origin access control, an ACM certificate in `us-east-1`, Route 53 records, and a CloudFront distribution. For SPA routing, add custom error responses so 403/404 return `/index.html` with status 200.
4. `deploy.sh`: build, `aws s3 sync`, CloudFront invalidation. Derive names from Terraform outputs.
5. Make the counter endpoint configurable per environment (`VITE_API_URL` at build time).
6. Add a Lambda unit test (moto or a mocked boto3 client) and extend the GitHub Actions workflows to cover `aws/**` using the OIDC role.
7. **Checkpoint:** the AWS URL serves the site and the counter works.

## Phase 7: Azure port

1. Frontend: use **Azure Static Web Apps** from the start, not plain storage static website hosting (which has no SPA fallback to `index.html` and no free custom-domain HTTPS; the first attempt had to be redone for this reason). Add a `navigationFallback` in `staticwebapp.config.json`, a resource group, and a custom domain on `azure.<domain>` (Azure DNS or a CNAME from Cloud DNS).
2. Backend: Azure Functions + Cosmos DB (Table API or NoSQL). Check quotas on App Service/Consumption plans **before** designing it, since that blocked the backend last time. Pick a region with quota, or request an increase early.
3. `status.sh` and `deploy.sh` helpers.
4. **Checkpoint:** the Azure URL serves the site (and the counter, if quota allows).

## Phase 8: Documentation and polish

1. Draw one architecture diagram per cloud (SVGs in `docs/diagrams/`, outside the React app so they don't affect the build).
2. README: architecture, repo layout, prerequisites, deploy steps per cloud, known limitations.
3. Write blog posts as you go, not at the end. Good topics: why Terraform for multi-cloud, OIDC for GitHub Actions, remote vs local state, and per-cloud deployment write-ups.
4. Add a cloud-resume-challenge case study as a project entry in the React app.
5. Add monitoring and cost guards: Cloud Monitoring alerts (and CloudWatch alarms on AWS), budget alerts, and a cheap uptime check.

## Phase 9: Hardening (stretch)

- Security headers on the CDN (Cloud CDN custom response headers; CloudFront response headers policy on AWS), Cloud Armor or rate limiting on the counter API.
- Smoke tests after deploy (curl the site and the API, assert on the status code and the count).
- Dedupe visitors (hash of IP + day) instead of counting every hit.
- Use remote state for Azure too (a blob container with the `azurerm` backend), not just GCP and AWS.
- Pin and update dependencies automatically (Dependabot).

## Lessons from the first build (avoid repeating)

- Hardcoded bucket, distribution and URL map IDs in `deploy.sh` files: read Terraform outputs instead.
- Committed Lambda and Cloud Function zip files: build them in Terraform (`archive_file`) or in CI and keep them out of git.
- Azure quota issues surfaced late: check quotas in Phase 0 (step 7).
- Setting up the OIDC role took several attempts: do it once in Phase 2 (Workload Identity Federation on GCP) and test it with a trivial workflow first.
