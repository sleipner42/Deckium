from typing import List, AsyncGenerator, Dict, Any
from openai import AsyncAzureOpenAI, AsyncOpenAI
from app.core.config import settings
from app.models.ai import Message


class AzureOpenAIService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            # azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            # api_version=settings.AZURE_OPENAI_API_VERSION,
            base_url="https://ai-kristoffer8494ai527053587388.openai.azure.com/openai/v1/",
            default_query={"api-version": "preview"},
        )
        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT

    async def chat(self, messages: List[Message]) -> str:
        formatted_messages = self._format_messages(messages)

        response = await self.client.chat.completions.create(
            model=self.deployment,
            messages=formatted_messages,
            reasoning_effort="high",
        )

        message = response.choices[0].message
        content = message.content or ""

        rc = getattr(message, "reasoning_content", None)
        if isinstance(rc, str) and rc.strip():
            thinking = f"<thinking>{rc}</thinking>\n"
            normalized = content.replace("<think>", "<thinking>")
            normalized = normalized.replace("</think>", "</thinking>")
            return thinking + normalized

        normalized = content.replace("<think>", "<thinking>")
        normalized = normalized.replace("</think>", "</thinking>")
        return normalized

    async def chat_stream(
        self, messages: List[Message]
    ) -> AsyncGenerator[str, None]:
        formatted_messages = self._format_messages(messages)

        stream = await self.client.responses.create(
            model=self.deployment,
            input=formatted_messages,
            stream=True,
            reasoning={"effort": "high", "summary": "auto"},
            store=False,
        )

        async for chunk in stream:

            if chunk.type == "response.output_text.delta":
                yield chunk.delta
            if chunk.type == "response.reasoning_summary_text.delta":
                yield chunk.delta

    def _format_messages(
        self, messages: List[Message]
    ) -> List[Dict[str, Any]]:
        formatted_messages: List[Dict[str, Any]] = []

        for msg in messages:
            role = msg.role

            if isinstance(msg.content, str):
                formatted_messages.append(
                    {
                        "role": role,
                        "content": msg.content,
                    }
                )
            else:
                formatted_content: List[Dict[str, Any]] = []
                for item in msg.content:
                    if item.type == "text":
                        formatted_content.append(
                            {
                                "type": "text",
                                "text": item.text,
                            }
                        )
                    elif item.type == "image_url" and item.image_url:
                        formatted_content.append(
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": item.image_url.get("url"),
                                },
                            }
                        )

                formatted_messages.append(
                    {
                        "role": role,
                        "content": formatted_content,
                    }
                )

        return formatted_messages


ai_service = AzureOpenAIService()
