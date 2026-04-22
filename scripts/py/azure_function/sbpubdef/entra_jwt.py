"""
Validate Entra (Azure AD) access tokens sent from SPFx AadHttpClient to this API.

Uses tenant JWKS (OpenID keys). Accepts common v1/v2 issuers and audience forms for a
single-tenant API app registration.
"""

from __future__ import annotations

from typing import Any

import jwt
from jwt import PyJWKClient


def _normalize_aud_list(aud: Any) -> list[str]:
    if aud is None:
        return []
    if isinstance(aud, list):
        return [str(x) for x in aud]
    return [str(aud)]


def _audience_is_allowed(aud_claim: Any, *, api_app_id: str) -> bool:
    want = {api_app_id, f"api://{api_app_id}"}
    for a in _normalize_aud_list(aud_claim):
        if a in want:
            return True
        if a.replace("api://", "") == api_app_id:
            return True
    return False


def _issuer_ok(iss: str, *, tenant_id: str) -> bool:
    if not iss:
        return False
    tid = tenant_id.lower()
    allowed = {
        f"https://login.microsoftonline.com/{tid}/v2.0",
        f"https://sts.windows.net/{tid}/",
        f"https://login.microsoftonline.com/{tid}/",
    }
    return iss.rstrip("/").lower() in {x.rstrip("/").lower() for x in allowed}


def decode_and_validate_access_token(token: str, *, tenant_id: str, api_app_id: str) -> dict[str, Any]:
    if not token:
        raise ValueError("Missing bearer token")

    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    jwks_client = PyJWKClient(jwks_url)
    signing_key = jwks_client.get_signing_key_from_jwt(token)

    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={
            "verify_signature": True,
            "verify_aud": False,
            "verify_iss": False,
        },
    )

    iss = str(payload.get("iss") or "")
    if not _issuer_ok(iss, tenant_id=tenant_id):
        raise ValueError("Invalid token issuer")

    if not _audience_is_allowed(payload.get("aud"), api_app_id=api_app_id):
        raise ValueError("Invalid token audience")

    return payload


def caller_email_from_claims(claims: dict[str, Any]) -> str:
    for key in ("preferred_username", "upn", "email", "unique_name"):
        v = claims.get(key)
        if isinstance(v, str):
            s = v.strip().lower()
            if "@" in s:
                return s
    raise ValueError("Token missing an email/UPN claim")

