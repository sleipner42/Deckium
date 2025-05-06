from fastapi import APIRouter
from app.models.item import Item

router = APIRouter()


@router.get("/", response_model=list[Item])
def read_items() -> list[dict[str, float | int | str]]:
    return [
        {"id": 1, "name": "Foo", "price": 42.0},
        {
            "id": 2,
            "name": "Bar",
            "description": "The Bar Fighters",
            "price": 69.9,
            "tax": 4.2,
        },
    ]


@router.post("/", response_model=Item)
def create_item(item: Item) -> Item:
    return item
