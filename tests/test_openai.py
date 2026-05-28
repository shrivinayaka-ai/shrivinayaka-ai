from backend.openai_client import client

response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {
            "role": "system",
            "content": "You are a Vedic astrologer."
        },
        {
            "role": "user",
            "content": """
            Virgo ascendant.
            Saturn in 7th house.
            Jupiter in 10th house.
            """
        }
    ]
)

print(response.choices[0].message.content)