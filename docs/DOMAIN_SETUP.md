# Domain Setup: a1score.app

Every domain-level setting for `a1score.app` lives in one idempotent script,
`scripts/cloudflare-domain-setup.sh`. Run it as often as you like: a second run
changes nothing. It never touches the apex `a1score.app` record, which belongs
to the Cloudflare Pages **Custom domains** binding (see `DOMAIN_CUTOVER.md`).

## Audit (2026-10-24, before this change)

| Check | Found | Problem |
| --- | --- | --- |
| Nameservers | `lewis` / `zariyah.ns.cloudflare.com` | ok |
| Apex A/AAAA | Cloudflare proxied → Pages, HTTP 200 | ok |
| `http://` → `https://` | 301 | ok |
| `a1score.pages.dev` → apex | 301 (middleware) | ok |
| `www.a1score.app` | **NXDOMAIN** | typed/linked `www` URLs fail |
| MX / SPF / DMARC / DKIM | **none** | anyone can send mail as `@a1score.app` |
| CAA | **none** | any CA may issue certificates |
| Edge HSTS | `max-age=15768000` (6 months) | disagrees with the 2-year `preload` header in `next.config.mjs` |
| DNSSEC | not signed | |
| `/.well-known/security.txt` | 404 | |

## What the script sets

### DNS

| Type | Name | Value | Why |
| --- | --- | --- | --- |
| CNAME | `www` | `a1score.app` (proxied) | gives `www` an address so the redirect rule can answer |
| MX | `@` | `0 .` — **only with `NULL_MX=1`** | Null MX (RFC 7505). Off by default: the site publishes `admin@` and `privacy@`, which should be served by Cloudflare Email Routing instead |
| TXT | `@` | `v=spf1 -all` | no server may send mail as the domain |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100` (+ `rua=` if `DMARC_RUA` is set) | receivers reject spoofed mail, subdomains included |
| TXT | `*._domainkey` | `v=DKIM1; p=` | revokes every DKIM selector |
| CAA | `@` | `issue` + `issuewild` for `letsencrypt.org`, `pki.goog`, `digicert.com`, `ssl.com`, `sectigo.com` | only the CAs Cloudflare edge certificates come from |
| TXT | `@` | `google-site-verification=…` | only when `GOOGLE_SITE_VERIFICATION` is set |

Other records (for example an existing Search Console TXT) are left alone.

> **Receiving mail at admin@ / privacy@**: Cloudflare dashboard → a1score.app →
> **Email → Email Routing** → enable, add the destination inbox (it must click
> the verification email), then add custom addresses `admin@a1score.app` and
> `privacy@a1score.app`. Cloudflare adds its own MX and SPF records; accept them
> (SPF becomes `v=spf1 include:_spf.mx.cloudflare.net ~all`). Do not use
> `NULL_MX=1` together with Email Routing.
>
> **When you start sending email** (Resend, Postmark, Google Workspace, …):
> replace the Null MX with the provider's MX, add its `include:` to SPF
> (`v=spf1 include:_spf.example.com -all`), add its DKIM selector record, and
> delete the `*._domainkey` record. Keep DMARC at `p=reject` once reports are clean.

### Redirects

| From | To | How |
| --- | --- | --- |
| `www.a1score.app/*` | `https://a1score.app/*` (301, query kept) | Cloudflare Single Redirect rule `a1score_www_to_apex` |
| `http://*` | `https://*` | Always Use HTTPS |
| `a1score.pages.dev/*` | `https://a1score.app/*` (301) | `src/middleware.ts` (pages.dev is not in the zone, so no zone rule can do it) |
| `/watchlist`, `/methodology` | `/following`, `/values` | `next.config.mjs` |

The `www` check in `src/middleware.ts` stays as a fallback: if the rule is ever
disabled, requests that reach Pages still get the same 301.

### SSL/TLS and edge

| Setting | Value |
| --- | --- |
| SSL mode | Full (strict) |
| Minimum TLS | 1.2 |
| TLS 1.3 | on |
| Always Use HTTPS | on |
| Automatic HTTPS Rewrites | on |
| Opportunistic Encryption | on |
| HTTP/3 | on |
| Brotli | on |
| 0-RTT | off (replayable requests) |
| HSTS | 2 years, includeSubDomains, preload, nosniff (matches `next.config.mjs`; `.app` is already HSTS-preloaded as a TLD) |

### DNSSEC

Enabled. If the domain is registered at **Cloudflare Registrar** the DS record
is published automatically. With any other registrar, copy the DS record the
script prints into the registrar's DNSSEC settings, or the zone stays unsigned
at the parent. Use `SKIP_DNSSEC=1` to leave DNSSEC alone.

## Applied

First applied 2026-10-24: www CNAME + 301 rule, SPF, DMARC, DKIM revocation,
CAA (Cloudflare also adds `comodoca.com` itself), SSL Full (strict), TLS 1.3
without 0-RTT, 2-year HSTS preload, DNSSEC. The registrar is Cloudflare
Registrar, so the DS record is published at `.app` automatically.

## Running it

### 1. Create an API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token → Custom token**:

- **Permissions** (all *Zone*): `Zone: Read`, `DNS: Edit`, `Zone Settings: Edit`, `Single Redirect: Edit`
  (optional: `Email Routing Rules: Edit` + account `Email Routing Addresses: Edit` to script mail forwarding)
- **Zone Resources**: Include → Specific zone → `a1score.app`

### 2a. From GitHub Actions (recommended)

1. Repo → **Settings → Secrets and variables → Actions**
   - Secret `CLOUDFLARE_API_TOKEN` = the token
   - Optional secret `CLOUDFLARE_ZONE_ID` (skips the zone lookup, for tokens without `Zone: Read` on the listing)
   - Optional variables `DMARC_RUA` (e.g. `mailto:dmarc-reports@yourdomain`) and `GOOGLE_SITE_VERIFICATION`
2. **Actions → Cloudflare domain setup → Run workflow** with *dry run* ticked; read the plan.
3. Run it again with *dry run* unticked.

### 2b. Locally

```bash
export CLOUDFLARE_API_TOKEN=...
DRY_RUN=1 ./scripts/cloudflare-domain-setup.sh   # plan
./scripts/cloudflare-domain-setup.sh             # apply
```

Needs `bash`, `curl` and `jq`.

## Verify

```bash
dig +short www.a1score.app                     # Cloudflare IPs
curl -sI https://www.a1score.app/matches?x=1 | grep -i location   # https://a1score.app/matches?x=1
dig +short MX a1score.app                      # 0 .
dig +short TXT a1score.app                     # "v=spf1 -all"
dig +short TXT _dmarc.a1score.app              # "v=DMARC1; p=reject; ..."
dig +short CAA a1score.app
dig +dnssec +short DS a1score.app              # non-empty once the registrar has the DS
curl -sI https://a1score.app | grep -i strict  # max-age=63072000; includeSubDomains; preload
curl -s https://a1score.app/.well-known/security.txt
```

Online checks: <https://dnsviz.net/d/a1score.app/dnssec/>,
<https://www.ssllabs.com/ssltest/analyze.html?d=a1score.app>,
<https://mxtoolbox.com/dmarc.aspx>, <https://hstspreload.org/?domain=a1score.app>.
