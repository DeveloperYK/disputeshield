from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    business_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    business_name: str | None
    stripe_account_id: str | None
    subscription_tier: str
    is_active: bool

    model_config = {"from_attributes": True}
