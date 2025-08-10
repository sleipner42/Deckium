import pytest
from app.core.ai_service import AzureOpenAIService
from app.models.ai import Message


@pytest.mark.asyncio
async def test_stream_service():
    messages = [Message(role="user", content="How many r is in bluberry?")]
    collected = ""
    print(f"Starting test with message: {messages[0].content}")

    async for part in AzureOpenAIService().chat_stream(messages):
        print(part, end="")
        collected += part

    assert isinstance(collected, str) and collected.strip() != ""
