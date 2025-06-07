import httpx
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.models.pexels import (
    PexelsImage,
    PexelsImageUrls
)
from app.api.deps import get_current_authenticated_user
from app.core.auth import TokenData
from app.core.config import settings

router = APIRouter()

PEXELS_SEARCH_COST = 0.1


@router.get("/search", response_model=PexelsImage)
async def search_images(
    query: str = Query(..., description="Search query for images"),
    orientation: Optional[str] = Query(None, description="Image orientation"),
    min_width: Optional[int] = Query(None, description="Minimum image width"),
    min_height: Optional[int] = Query(
        None, description="Minimum image height"
    ),
    color: Optional[str] = Query(None, description="Image color filter"),
    current_user: TokenData = Depends(get_current_authenticated_user),
):
    try:
        if not current_user.email:
            raise HTTPException(status_code=401, detail="Unauthorized")

        api_key = settings.PEXELS_API_KEY
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="Pexels API key not configured"
            )

        valid_orientations = ["landscape", "portrait", "square"]
        if orientation and orientation not in valid_orientations:
            raise HTTPException(
                status_code=400,
                detail=(f"Invalid orientation. Must be one of: "
                        f"{', '.join(valid_orientations)}")
            )

        params: Dict[str, Any] = {
            "query": query,
            "per_page": 1,
            "page": 1,
        }

        if orientation:
            params["orientation"] = orientation
        if min_width:
            params["min_width"] = min_width
        if min_height:
            params["min_height"] = min_height
        if color:
            params["color"] = color

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.pexels.com/v1/search",
                headers={"Authorization": api_key},
                params=params,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Pexels API error: {response.text}"
            )

        data = response.json()

        if not data.get("photos") or len(data["photos"]) == 0:
            raise HTTPException(
                status_code=404,
                detail="No images found for the given query"
            )

        photo = data["photos"][0]
        
        image = PexelsImage(
            id=photo["id"],
            urls=PexelsImageUrls(
                original=photo["src"]["original"],
                large=photo["src"]["large"],
                large2x=photo["src"]["large2x"],
                medium=photo["src"]["medium"],
                small=photo["src"]["small"],
                portrait=photo["src"]["portrait"],
                landscape=photo["src"]["landscape"],
                tiny=photo["src"]["tiny"],
            ),
            width=photo["width"],
            height=photo["height"],
            aspect_ratio=photo["width"] / photo["height"],
            photographer=photo["photographer"],
            photographer_url=photo["photographer_url"],
            photographer_id=photo["photographer_id"],
            alt=photo.get("alt", query),
            description=photo.get("alt", f"{query} image"),
            source_url=photo["url"],
            avg_color=photo["avg_color"],
            liked=photo["liked"],
        )

        return image

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Pexels API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        ) 