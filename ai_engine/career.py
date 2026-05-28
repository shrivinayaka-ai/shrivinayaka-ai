from backend.openai_client import client


def generate_career_prediction(chart_data):

    prompt = f"""
    You are an expert Vedic astrologer.

    Analyze the following birth chart data
    and provide career prediction.

    Focus on:
    - career growth
    - job stability
    - business possibilities
    - delays or struggles
    - best age periods
    - strengths

    Use practical and simple language.

    Avoid fear-based predictions.

    Birth Chart Data:
    {chart_data}
    """

    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {
                "role": "system",
                "content": "You are a professional Vedic astrologer."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content