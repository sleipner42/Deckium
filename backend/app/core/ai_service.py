from typing import List, AsyncGenerator, Dict, Any, Optional
from openai import AsyncAzureOpenAI
from app.core.config import settings
from app.models.ai import Message


class AzureOpenAIService:
    def __init__(self):
        self.client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT

    async def chat(self, messages: List[Message]) -> str:
        formatted_messages = self._format_messages(messages)

        response = await self.client.chat.completions.create(
            model=self.deployment, messages=formatted_messages
        )

        return response.choices[0].message.content

    async def chat_stream(self, messages: List[Message]) -> AsyncGenerator[str, None]:
        formatted_messages = self._format_messages(messages)

        stream = await self.client.chat.completions.create(
            model=self.deployment, messages=formatted_messages, stream=True
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _format_messages(self, messages: List[Message]) -> List[Dict[str, Any]]:
        formatted_messages: List[Dict[str, Any]] = []

        for msg in messages:
            role = msg.role

            if isinstance(msg.content, str):
                formatted_messages.append({"role": role, "content": msg.content})
            else:
                formatted_content: List[Dict[str, Any]] = []
                for item in msg.content:
                    if item.type == "text":
                        formatted_content.append({"type": "text", "text": item.text})
                    elif item.type == "image_url" and item.image_url:
                        formatted_content.append(
                            {
                                "type": "image_url",
                                "image_url": {"url": item.image_url.get("url")},
                            }
                        )

                formatted_messages.append({"role": role, "content": formatted_content})

        return formatted_messages


ai_service = AzureOpenAIService()
