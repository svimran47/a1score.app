#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# scripts/cloudflare-domain-setup.sh
#
# Idempotent setup of every domain-level setting for a1score.app on Cloudflare:
#   - DNS:       www CNAME, SPF, DMARC, DKIM null key, CAA (optional null MX)
#   - Redirects: www.a1score.app -> https://a1score.app (301, path + query kept)
#   - TLS/edge:  Full (strict), TLS >= 1.2, TLS 1.3, Always HTTPS, HSTS preload,
#                HTTP/3, Brotli, Automatic HTTPS Rewrites
#   - DNSSEC:    enabled (prints the DS record for the registrar)
#
# The apex record (a1score.app -> Cloudflare Pages) is managed by the Pages
# "Custom domains" binding and is intentionally never touched here.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=... ./scripts/cloudflare-domain-setup.sh            # apply
#   CLOUDFLARE_API_TOKEN=... DRY_RUN=1 ./scripts/cloudflare-domain-setup.sh  # plan only
#
# Optional env:
#   ZONE_NAME                 default: a1score.app
#   CLOUDFLARE_ZONE_ID        zone id; skips the lookup by name
#   DMARC_RUA                 aggregate-report mailbox, e.g. mailto:dmarc@example.com
#   GOOGLE_SITE_VERIFICATION  value of a google-site-verification=... TXT to add
#   SKIP_DNSSEC=1             do not touch DNSSEC
#   NULL_MX=1                 publish a Null MX (domain receives no mail)
#
# Token permissions (Zone resources: a1score.app):
#   Zone:Read, DNS:Edit, Zone Settings:Edit, Single Redirect:Edit
# See docs/DOMAIN_SETUP.md.
# -----------------------------------------------------------------------------
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-a1score.app}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
DRY_RUN="${DRY_RUN:-0}"
API="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

log()  { printf '  %s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }

# cf METHOD PATH [JSON_BODY] -> prints .result, fails loudly on API errors.
cf() {
  local method="$1" path="$2" body="${3:-}" resp
  if [[ -n "$body" ]]; then
    resp=$(curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" --data "$body")
  else
    resp=$(curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
  fi
  if [[ "$(jq -r '.success' <<<"$resp")" != "true" ]]; then
    echo "Cloudflare API error on $method $path:" >&2
    jq -c '.errors' <<<"$resp" >&2
    return 1
  fi
  jq -c '.result' <<<"$resp"
}

# mutate METHOD PATH JSON_BODY -> like cf, but a no-op under DRY_RUN.
mutate() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "[dry-run] $1 $2 $(jq -c . <<<"$3")"
    return 0
  fi
  cf "$@" >/dev/null
}

step "Resolving zone $ZONE_NAME"
# A token scoped to one zone may lack Zone:Read on /zones listing; accept the id directly.
[[ -n "$ZONE_ID" ]] || ZONE_ID=$(cf GET "/zones?name=$ZONE_NAME" | jq -r '.[0].id // empty')
[[ -n "$ZONE_ID" ]] || { echo "Zone $ZONE_NAME not found for this token" >&2; exit 1; }
log "zone id: $ZONE_ID"

# upsert_record JSON MATCH_JQ
#   JSON      full DNS record body (type, name, content|data, ttl, proxied, ...)
#   MATCH_JQ  jq filter selecting the existing record this one replaces, among
#             records of the same type + name. Records that don't match are
#             left alone (e.g. other TXT records at the apex).
upsert_record() {
  local record="$1" match="$2" type name existing id
  type=$(jq -r '.type' <<<"$record")
  name=$(jq -r '.name' <<<"$record")
  existing=$(cf GET "/zones/$ZONE_ID/dns_records?type=$type&name=$name&per_page=100" \
    | jq -c "[.[] | select($match)] | first // empty")

  if [[ -z "$existing" ]]; then
    log "create $type $name"
    mutate POST "/zones/$ZONE_ID/dns_records" "$record"
    return
  fi

  id=$(jq -r '.id' <<<"$existing")
  # Compare only the fields we manage so Cloudflare-added metadata is ignored.
  if jq -e --argjson want "$record" \
      '. as $have | [$want | keys[] | select(. != "comment")] | all(. as $k | $have[$k] == $want[$k])' \
      <<<"$existing" >/dev/null; then
    log "ok     $type $name"
  else
    log "update $type $name"
    mutate PUT "/zones/$ZONE_ID/dns_records/$id" "$record"
  fi
}

# Some names may only carry one CNAME; refuse to clobber a conflicting A/AAAA.
assert_no_address_records() {
  local name="$1" n
  n=$(cf GET "/zones/$ZONE_ID/dns_records?name=$name&per_page=100" \
    | jq '[.[] | select(.type == "A" or .type == "AAAA")] | length')
  if [[ "$n" != "0" ]]; then
    echo "Refusing to create CNAME $name: $n A/AAAA record(s) already exist. Remove them first." >&2
    exit 1
  fi
}

step "DNS records"

# www -> apex. Proxied so the redirect rule below answers before any origin.
assert_no_address_records "www.$ZONE_NAME"
upsert_record "$(jq -n --arg n "www.$ZONE_NAME" --arg c "$ZONE_NAME" \
  '{type:"CNAME", name:$n, content:$c, proxied:true, ttl:1, comment:"301 to apex via redirect rule"}')" \
  'true'

# The domain sends no mail: lock it down so it can't be spoofed.
# Inbound mail is left to Cloudflare Email Routing (admin@ / privacy@ are
# published on the site). NULL_MX=1 instead declares that it accepts no mail
# at all (RFC 7505); never combine that with Email Routing's MX records.
if [[ "${NULL_MX:-0}" == "1" ]]; then
  upsert_record "$(jq -n --arg n "$ZONE_NAME" \
    '{type:"MX", name:$n, content:".", priority:0, ttl:3600, comment:"Null MX - no inbound mail"}')" \
    '.content == "." or .content == ""'
fi

# SPF: no host is authorised to send as @a1score.app.
upsert_record "$(jq -n --arg n "$ZONE_NAME" \
  '{type:"TXT", name:$n, content:"\"v=spf1 -all\"", ttl:3600, comment:"SPF - no senders"}')" \
  '(.content | ltrimstr("\"") | startswith("v=spf1"))'

# DMARC: reject everything that fails alignment, on subdomains too.
DMARC="v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100"
if [[ -n "${DMARC_RUA:-}" ]]; then DMARC="$DMARC; rua=$DMARC_RUA"; fi
upsert_record "$(jq -n --arg n "_dmarc.$ZONE_NAME" --arg c "\"$DMARC\"" \
  '{type:"TXT", name:$n, content:$c, ttl:3600, comment:"DMARC"}')" \
  '(.content | ltrimstr("\"") | startswith("v=DMARC1"))'

# DKIM: wildcard empty key revokes every selector (M3AAWG recommendation).
upsert_record "$(jq -n --arg n "*._domainkey.$ZONE_NAME" \
  '{type:"TXT", name:$n, content:"\"v=DKIM1; p=\"", ttl:3600, comment:"DKIM - no valid keys"}')" \
  '(.content | ltrimstr("\"") | startswith("v=DKIM1"))'

if [[ -n "${GOOGLE_SITE_VERIFICATION:-}" ]]; then
  upsert_record "$(jq -n --arg n "$ZONE_NAME" --arg c "\"google-site-verification=$GOOGLE_SITE_VERIFICATION\"" \
    '{type:"TXT", name:$n, content:$c, ttl:3600, comment:"Google Search Console"}')" \
    '(.content | ltrimstr("\"") | startswith("google-site-verification="))'
fi

# CAA: only the CAs Cloudflare Universal/Advanced SSL issue from may issue.
# Wildcards are allowed for those same CAs so Cloudflare edge certs keep renewing.
for ca in letsencrypt.org pki.goog digicert.com ssl.com sectigo.com; do
  for tag in issue issuewild; do
    upsert_record "$(jq -n --arg n "$ZONE_NAME" --arg t "$tag" --arg v "$ca" \
      '{type:"CAA", name:$n, ttl:3600, data:{flags:0, tag:$t, value:$v}}')" \
      "(.data.tag == \"$tag\" and .data.value == \"$ca\")"
  done
done

step "Redirect rules"
# Single Redirect: www.a1score.app/* -> https://a1score.app/* (301).
# The phase entrypoint is replaced wholesale on PUT, so existing rules are
# kept and only the rule carrying our ref is replaced.
RULE_REF="a1score_www_to_apex"
RULE=$(jq -n --arg host "www.$ZONE_NAME" --arg apex "https://$ZONE_NAME" --arg ref "$RULE_REF" '{
  ref: $ref,
  description: "Redirect www to apex (301)",
  enabled: true,
  expression: "(http.host eq \"\($host)\")",
  action: "redirect",
  action_parameters: { from_value: {
    status_code: 301,
    preserve_query_string: true,
    target_url: { expression: "concat(\"\($apex)\", http.request.uri.path)" }
  }}
}')

PHASE="/zones/$ZONE_ID/rulesets/phases/http_request_dynamic_redirect/entrypoint"
EXISTING_RULES=$(cf GET "$PHASE" 2>/dev/null | jq -c '.rules // []' || echo '[]')
NEW_RULES=$(jq -c --argjson rule "$RULE" --arg ref "$RULE_REF" \
  '[.[] | select(.ref != $ref)
     | {ref, description, enabled, expression, action, action_parameters}
     | with_entries(select(.value != null))] + [$rule]' \
  <<<"$EXISTING_RULES")
if jq -e --argjson rule "$RULE" --arg ref "$RULE_REF" \
    'any(.[]; .ref == $ref and ({ref, description, enabled, expression, action, action_parameters} == $rule))' \
    <<<"$EXISTING_RULES" >/dev/null; then
  log "ok     $RULE_REF"
else
  log "apply  $RULE_REF ($(jq 'length' <<<"$NEW_RULES") rule(s) in phase)"
  mutate PUT "$PHASE" "$(jq -n --argjson rules "$NEW_RULES" '{rules:$rules}')"
fi

step "SSL/TLS and edge settings"
setting() {
  local id="$1" value="$2" current
  current=$(cf GET "/zones/$ZONE_ID/settings/$id" | jq -c '.value')
  if [[ "$current" == "$(jq -c . <<<"$value")" ]]; then
    log "ok     $id"
  else
    log "update $id: $current -> $(jq -c . <<<"$value")"
    mutate PATCH "/zones/$ZONE_ID/settings/$id" "$(jq -n --argjson v "$value" '{value:$v}')"
  fi
}

setting ssl                        '"strict"'
setting min_tls_version            '"1.2"'
setting tls_1_3                    '"on"'
setting always_use_https           '"on"'
setting automatic_https_rewrites   '"on"'
setting opportunistic_encryption   '"on"'
setting http3                      '"on"'
setting brotli                     '"on"'
setting 0rtt                       '"off"'
# Matches the Strict-Transport-Security header in next.config.mjs. Safe to
# preload: .app is already on the browser HSTS preload list as a whole TLD.
setting security_header '{"strict_transport_security":{"enabled":true,"max_age":63072000,"include_subdomains":true,"preload":true,"nosniff":true}}'

if [[ "${SKIP_DNSSEC:-0}" != "1" ]]; then
  step "DNSSEC"
  DNSSEC=$(cf GET "/zones/$ZONE_ID/dnssec")
  STATUS=$(jq -r '.status' <<<"$DNSSEC")
  log "status: $STATUS"
  if [[ "$STATUS" == "disabled" ]]; then
    mutate PATCH "/zones/$ZONE_ID/dnssec" '{"status":"active"}'
    [[ "$DRY_RUN" == "1" ]] || DNSSEC=$(cf GET "/zones/$ZONE_ID/dnssec")
  fi
  DS=$(jq -r '.ds // empty' <<<"$DNSSEC")
  if [[ -n "$DS" ]]; then
    log "DS record (add at your registrar unless it is Cloudflare Registrar):"
    log "  $DS"
  fi
fi

if [[ "$DRY_RUN" == "1" ]]; then step "Done (dry run, nothing changed)"; else step "Done"; fi
