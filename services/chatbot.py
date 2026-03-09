from openai import OpenAI
from core.config import GITHUB_TOKEN

client = OpenAI(
    api_key=GITHUB_TOKEN,
    base_url="https://models.inference.ai.azure.com"
)

def travel_assistant(message, location, confidence=None, similar=None, hotel_count=None):
    if not location:
        return "Please upload and analyze an image so I know which place you’re asking about 📷"

    # =========================
    # 🔹 ADDED: HOTEL AWARENESS
    # =========================
    if hotel_count == 0 and any(
        k in message.lower() for k in ["hotel", "stay", "accommodation", "resort"]
    ):
        return (
            f"There are limited registered accommodations directly near {location}. "
            "This often happens at heritage sites, natural reserves, or protected areas. "
            "Nearby towns usually offer more hotel options with better access. "
            "If you like, I can guide you to nearby areas where accommodations are available."
        )

    system_prompt = f"""
You are LOOK-UP Assistant, an AI travel guide for Sri Lanka.

IMPORTANT CONTEXT:
The place name below was identified using an image recognition model (CLIP).
You MUST treat it as the correct location unless the user explicitly questions it.

Identified place: {location}
Confidence level: {confidence}%
Nearby attractions: {", ".join(similar or [])}

Your behavior:
- Speak confidently when explaining the place
- If the user asks "where is this", explain the location clearly
- If the user asks directions, explain how to get there
- If the user asks general questions, answer based on THIS place
- Do NOT repeat information unnecessarily
- Sound like a friendly human tour guide
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.6,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
    )

    return res.choices[0].message.content.strip()
