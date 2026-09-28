import hmac
import os
from fastapi import Header, HTTPException

def require_internal_authorization(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("ML_INTERNAL_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="ML internal authentication is not configured")
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized internal caller")
