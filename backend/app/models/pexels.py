from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class PexelsSearchRequest(BaseModel):
    query: str
    orientation: Optional[str] = None
    per_page: int = 5
    page: int = 1
    min_width: Optional[int] = None
    min_height: Optional[int] = None
    color: Optional[str] = None


class PexelsImageUrls(BaseModel):
    original: str
    large: str
    large2x: str
    medium: str
    small: str
    portrait: str
    landscape: str
    tiny: str


class PexelsImage(BaseModel):
    id: int
    urls: PexelsImageUrls
    width: int
    height: int
    aspect_ratio: float
    photographer: str
    photographer_url: str
    photographer_id: int
    alt: str
    description: str
    source_url: str
    avg_color: str
    liked: bool


class PexelsSearchResponse(BaseModel):
    images: List[PexelsImage]
    total: int
    page: int
    per_page: int
    total_pages: int
    next_page: Optional[str] = None
    prev_page: Optional[str] = None
    query: str
    parameters: Dict[str, Any]
    message: str 