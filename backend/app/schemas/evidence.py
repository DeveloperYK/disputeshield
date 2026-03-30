from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.evidence import EvidenceSource, EvidenceType


class EvidenceResponse(BaseModel):
    id: uuid.UUID
    dispute_id: uuid.UUID
    evidence_type: EvidenceType
    source: EvidenceSource
    title: str
    description: str | None
    content: str | None
    file_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class EvidenceCreate(BaseModel):
    evidence_type: EvidenceType
    title: str
    description: str | None = None
    content: str | None = None
