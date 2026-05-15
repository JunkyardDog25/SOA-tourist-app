import base64
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from app.config import settings

security = HTTPBearer()


class TokenData(BaseModel):
    user_id: str          # Neo4j string ID iz "userId" claim-a
    username: str         # iz "sub" claim-a
    email: str
    roles: list[str]      # ["ROLE_GUIDE", "ROLE_TOURIST", "ROLE_ADMIN"]


def _get_signing_key() -> bytes:
    """
    Auth servis koristi Base64-enkodiran secret (Decoders.BASE64 u Javi).
    Moramo ga dekodirati pre upotrebe, isto kao Go gateway.
    """
    return base64.b64decode(settings.JWT_SECRET)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """
    Raspakuje JWT bearer token koji dolazi iz auth_service.

    JWT payload struktura (iz JwtUtil.java):
    {
        "sub": "username",
        "userId": "neo4j-id",
        "email": "user@example.com",
        "roles": ["ROLE_GUIDE", "ROLE_TOURIST"],
        "iat": ...,
        "exp": ...
    }
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            _get_signing_key(),
            algorithms=["HS256", "HS384", "HS512"],
        )

        user_id: str = payload.get("userId")
        username: str = payload.get("sub")
        email: str = payload.get("email", "")
        roles: list = payload.get("roles", [])

        if user_id is None or username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing userId or sub",
            )

        return TokenData(
            user_id=user_id,
            username=username,
            email=email,
            roles=roles,
        )

    except JWTError as e:
        print(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
        )


def require_role(required_role: str):
    """
    Proverava da li korisnik ima odredjenu ulogu.
    Spring Security koristi ROLE_ prefiks, pa se prosledjuje npr. "ROLE_GUIDE".

    Koristi se: Depends(require_role("ROLE_GUIDE"))
    """
    async def role_checker(
        current_user: TokenData = Depends(get_current_user),
    ) -> TokenData:
        if required_role not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}",
            )
        return current_user

    return role_checker