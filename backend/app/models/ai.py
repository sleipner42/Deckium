from typing import List, Literal, Optional, Union, Dict
from pydantic import BaseModel


class MessageContent(BaseModel):
    type: str
    text: Optional[str] = None
    image_url: Optional[Dict[str, str]] = None


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: Union[str, List[MessageContent]]
    id: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = None
    stream: bool = False


class ChatResponse(BaseModel):
    content: str 