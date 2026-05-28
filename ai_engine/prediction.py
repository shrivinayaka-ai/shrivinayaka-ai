from datetime import datetime
import re
from backend.openai_client import client


PLANETS = [
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury"
]


def get_current_dasha(dasha_data):
    today = datetime.today().date()

    for period in dasha_data["timeline"]:
        start = datetime.strptime(period["start"], "%Y-%m-%d").date()
        end = datetime.strptime(period["end"], "%Y-%m-%d").date()

        if start <= today < end:
            return period

    return None


def validate_dasha_mentions(report, expected_planet):
    wrong_planets = [
        planet for planet in PLANETS
        if planet != expected_planet
        and re.search(rf"\b{planet}\s+Mahadasha\b", report, re.IGNORECASE)
    ]

    return wrong_planets


def generate_full_prediction(chart_data, report_type="free"):
    report_type = report_type.lower().strip()

    current_dasha = get_current_dasha(chart_data["dasha"])

    if current_dasha is None:
        raise ValueError("No current Mahadasha found in dasha timeline.")

    print("CURRENT DASHA USED:", current_dasha)

    clean_chart = {
        "birth_date": chart_data["birth_date"],
        "birth_time": chart_data["birth_time"],
        "birth_place": chart_data["birth_place"],
        "latitude": chart_data["latitude"],
        "longitude": chart_data["longitude"],
        "calculation": chart_data["calculation"],
        "chart": chart_data["chart"],
        "current_mahadasha_planet": current_dasha["planet"],
        "current_mahadasha_start": current_dasha["start"],
        "current_mahadasha_end": current_dasha["end"],
        "current_mahadasha_years": current_dasha["years"]
    }

    if report_type == "premium":
        report_instruction = f"""
Write a deeply personalized premium Vedic astrology report.

The report should feel like a paid consultation from an experienced astrologer.

FORMAT EXACTLY:

# Premium Vedic Astrology Report

## 1. Core Personality & Life Pattern
Explain:
- emotional nature
- thinking style
- strengths
- weaknesses
- inner conflicts
- life direction
- decision-making pattern

Write 3-5 detailed paragraphs.

## 2. Career, Work & Success Path
Analyze:
- suitable career direction
- business vs job tendency
- recognition potential
- leadership ability
- communication ability
- financial growth through profession
- career challenges
- best work environments

Mention likely growth periods during current Mahadasha.

Write in detailed practical style.

## 3. Money & Financial Stability
Analyze:
- earning pattern
- spending habits
- savings tendency
- financial risks
- long-term wealth potential
- sudden gains/losses
- stability patterns

Give practical financial guidance.

## 4. Relationship, Marriage & Emotional Compatibility
Analyze:
- emotional expectations
- attachment style
- relationship strengths
- communication in relationships
- possible emotional struggles
- marriage tendencies
- compatibility patterns
- loyalty/trust themes

If chart shows delay or intensity, explain gently without fear.

## 5. Health & Mental Wellbeing
Do NOT diagnose disease.

Discuss:
- stress patterns
- emotional pressure
- mental balance
- lifestyle tendencies
- sleep/stress habits
- energy fluctuations

Give gentle wellness advice.

## 6. Detailed Current Mahadasha Analysis
IMPORTANT:
Analyze ONLY:
{current_dasha["planet"]} Mahadasha

Current Mahadasha:
{current_dasha["start"]} to {current_dasha["end"]}

Explain:
- psychological impact
- career impact
- financial impact
- relationship impact
- spiritual growth
- major lessons of this Mahadasha
- likely transformation themes

Give timing tendencies like:
- early phase
- middle phase
- later phase

without making deterministic claims.

## 7. Practical Remedies & Alignment Advice
Give safe and practical remedies:
- discipline habits
- meditation/mantra
- donation/charity
- spiritual practices
- emotional healing suggestions
- lifestyle improvements

Avoid superstition and fear-based remedies.

## 8. Final Guidance
End with:
- hopeful practical advice
- emotional encouragement
- balanced guidance
- empowerment mindset

WRITING STYLE:
- Warm
- Human
- Insightful
- Deeply personalized
- Practical
- Emotionally intelligent
- Like a real astrologer speaking directly to the person

AVOID:
- fear-based language
- guaranteed predictions
- medical diagnosis
- exaggerated mystical claims
"""
    else:
        report_instruction = """
Write a short free astrology report.

Use this format exactly:

# Free Astrology Summary

## Personality Snapshot
Give 4-5 lines only.

## Career Hint
Give 4-5 lines only.

## Money Hint
Give 3-4 lines only.

## Relationship Hint
Give 3-4 lines only.

## Current Mahadasha
Give 4-5 lines only.

End with:
"For a detailed personalized report with remedies and deeper timing analysis, you can unlock the premium report."
"""

    prompt = f"""
You are a professional Vedic astrologer.

Create an astrology prediction report using ONLY the data below.

VERY IMPORTANT:
The current Mahadasha is exactly:
{current_dasha["planet"]} Mahadasha

Current Mahadasha period:
{current_dasha["start"]} to {current_dasha["end"]}

Do not infer, recalculate, or choose Mahadasha from any other chart factor.
Do not mention any other planet as Mahadasha.

Report Type:
{report_type}

Report Instructions:
{report_instruction}

Astrology Data:
{clean_chart}

Use simple, warm, balanced language.
No fear-based prediction.
No guaranteed claims.
"""

    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    f"You must follow the provided current Mahadasha exactly: "
                    f"{current_dasha['planet']} Mahadasha. Never name another planet as Mahadasha."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    report = response.choices[0].message.content
    wrong_planets = validate_dasha_mentions(report, current_dasha["planet"])

    if wrong_planets:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"Rewrite the report. The only allowed Mahadasha is "
                        f"{current_dasha['planet']} Mahadasha. Remove all references "
                        f"to these incorrect Mahadashas: {', '.join(wrong_planets)}."
                    )
                },
                {
                    "role": "user",
                    "content": report
                }
            ]
        )
        report = response.choices[0].message.content

        wrong_planets = validate_dasha_mentions(report, current_dasha["planet"])
        if wrong_planets:
            raise ValueError(
                "AI response mentioned incorrect Mahadasha: "
                + ", ".join(wrong_planets)
            )

    return report
