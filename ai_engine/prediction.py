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


def generate_full_prediction(chart_data, report_type="free", language="english"):
    report_type = report_type.lower().strip()
    language = language.lower().strip()

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
        "transits": chart_data.get("transits"),
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

## 2. Core Karmic Challenges
Explain:
- repeating life struggles
- emotional patterns
- psychological contradictions
- difficult karmic themes
- internal conflicts
- delays/frustrations
- areas where the native feels blocked
- destructive habits or coping patterns
- hidden fears or dissatisfaction
- relationship between desires and reality

This section should feel deeply personal and emotionally accurate.

## 3. Career, Work & Success Path
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

## 4. Money & Financial Stability
Analyze:
- earning pattern
- spending habits
- savings tendency
- financial risks
- long-term wealth potential
- sudden gains/losses
- stability patterns

Give practical financial guidance.

## 5. Relationship, Marriage & Emotional Compatibility
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

## 6. Health & Mental Wellbeing
Do NOT diagnose disease.

Discuss:
- stress patterns
- emotional pressure
- mental balance
- lifestyle tendencies
- sleep/stress habits
- energy fluctuations

Give gentle wellness advice.

## 7. Current Transit Analysis
Analyze current Saturn, Jupiter, Rahu and Ketu transits.

VERY IMPORTANT:
For each transit planet, always write TWO separate sub-sections:

1. Planet in House from Ascendant
2. Planet in House from Moon

Do this for all four planets:
- Saturn
- Jupiter
- Rahu
- Ketu

Required format:

### Saturn in 10th House
Explain result from Ascendant.

### Saturn in 12th House from Moon
Explain emotional/mental result from Moon.

### Jupiter in 1st House
Explain result from Ascendant.

### Jupiter in 3rd House from Moon
Explain emotional/mental result from Moon.

### Rahu in 9th House
Explain result from Ascendant.

### Rahu in 11th House from Moon
Explain emotional/mental result from Moon.

### Ketu in 3rd House
Explain result from Ascendant.

### Ketu in 5th House from Moon
Explain emotional/mental result from Moon.

Do not skip Moon-based placement for any planet.
Do not skip Ascendant-based placement for any planet.
Do not combine both meanings into one paragraph.

Do not write:
"From Moon's view..."
or
"From the Moon's angle..."

Instead always use heading format:
"Planet in Xth House from Moon"

Do not display technical labels like:
"House from Ascendant: 10"
or
"House from Moon: 12"

Give realistic effects:
- pressure
- delays
- instability
- emotional burden
- opportunities
- caution
- practical advice for next 6-12 months

## 8. Detailed Current Mahadasha Analysis
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

## 9. Practical Remedies & Alignment Advice
Give safe and practical remedies:
- discipline habits
- meditation/mantra
- donation/charity
- spiritual practices
- emotional healing suggestions
- lifestyle improvements

Avoid superstition and fear-based remedies.

## 10. Final Guidance
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

    language_instruction = ""

    if language == "hindi":
        language_instruction = """
Generate the entire report in सरल हिंदी.

Keep all markdown headings and section titles in English exactly as given in the report format.

Only write the explanation paragraphs in Hindi.

Use simple Hindi spoken in daily life.

Write in very simple everyday Hindi.

Write in simple spoken Hindi used by Indian astrologers.

Do not translate English sentences word-for-word.

Avoid bookish, academic or government-style Hindi.

Do not use poetic, philosophical, spiritual or motivational language.

Do not write like a book, article, quote or social media post.

Use short sentences.

Avoid Sanskrit-heavy language.

Avoid difficult astrology jargon.

Write as if a knowledgeable astrologer is speaking directly to a client sitting in front of them.

Imagine the client is a 45-60 year old Indian who has never studied astrology.

Do not try to sound literary.

The report should sound like an astrologer speaking, not like Google Translate or a Hindi professor.

The report should sound like advice, not poetry.

Every statement should feel conversational and easy to understand.

If a sentence sounds like literature, rewrite it in simpler language.

Use Devanagari script.

Examples:
Instead of:
"आपकी जन्मकुंडली की शुरुआत मिथुन लग्न से होती है"

Write:
"आपकी जन्मकुंडली मिथुन लग्न की है"

Instead of:
"आपकी सोच बहु-आयामी है"

Write:
"आप एक साथ कई बातों के बारे में सोचते हैं"

Instead of:
"यह आपकी पहचान बन सकती है"

Write:
"यह आदत आपके जीवन का हिस्सा बन जाती है"

Instead of:
"Your income pattern can be unpredictable."

Write:
"आपकी आय में उतार-चढ़ाव देखने को मिल सकता है। अक्सर आप अचानक मिलने वाले अवसरों से लाभ कमाने की कोशिश करते हैं।"

Keep language simple enough that an average Indian can understand it easily.

Do NOT use:
- अतएव
- यथार्थतः
- परिणामस्वरूप
- परछाईं में
- ऊर्जा
- मंज़िलें
- आत्म-स्वतंत्रता
- कर्मिक समस्या
- गहरी यात्रा
- परिवर्तनकारी अनुभव
- दिल की खाली जगह

These sound like government Hindi.

Use direct practical language.

Use natural Hindi words such as:
- संभव है
- अक्सर
- कभी-कभी
- इस समय
- आने वाले महीनों में
"""
    elif language == "hinglish":
        language_instruction = """
Write the entire report in simple Hinglish.

Keep all markdown headings and section titles in English exactly as given in the report format.

Only write the explanation paragraphs in Hinglish.

Use Roman Hindi mixed with simple English, the way an Indian astrologer may speak naturally to a client.

Do not use Devanagari script.

Do not write pure English.

Do not translate English sentences word-for-word.

Use short, clear, conversational sentences.

Avoid poetic, philosophical, spiritual, motivational, bookish or social-media style language.

Write like an experienced astrologer explaining the chart to a normal Indian client sitting in front of them.

Use practical Hinglish words such as:
- ho sakta hai
- aksar
- kabhi-kabhi
- is samay
- aane wale mahino mein
- dhyan rakhna hoga
- patience rakhna zaroori hai

Examples:
Wrong: Your income pattern can be unpredictable.
Correct: Aapki income mein kabhi-kabhi utaar-chadhav aa sakta hai. Aksar aap sudden opportunities se fayda lene ki koshish karte hain.

Wrong: This is a transformative journey for your inner self.
Correct: Is phase mein aapko apni aadaton aur decisions ko practical tareeke se dekhna hoga.

The report should sound like advice, not poetry.
"""
    else:
        language_instruction = """
Write the entire report in simple natural English.

Keep all markdown headings and section titles in English exactly as given in the report format.

Avoid complicated words.

Write like an astrologer speaking to an intelligent friend.

Use simple words instead of academic or psychological jargon.
"""

    prompt = f"""
You are an expert Vedic astrologer creating psychologically realistic and astrologically honest reports.

Do not make the report excessively positive, motivational, or generic.

The report must feel emotionally accurate and deeply human.

Always discuss BOTH:
- strengths
- weaknesses
- karmic struggles
- emotional conflicts
- delays
- frustrations
- instability patterns
- psychological contradictions

when visible in the chart.

Do not soften difficult placements unrealistically.

Avoid fake positivity.

If the chart shows:
- loneliness
- delays
- unstable career patterns
- emotional dissatisfaction
- confusion
- overthinking
- isolation
- repeated setbacks
- relationship struggles
- mental restlessness
- identity conflict

then explain them clearly but compassionately.

For every major strength mentioned, also explain:
- the shadow side
- the emotional cost
- how the same energy can become destructive if unbalanced.

For example, instead of writing:
"You are intelligent and adaptable."

Write in this style:
"Your mind adapts quickly, but this can create chronic overthinking and difficulty staying emotionally or professionally settled for long periods."

Explain recurring life patterns instead of isolated traits.

Examples:
- repeating unstable career cycles
- emotional dissatisfaction despite achievement
- attracting unavailable people
- rebuilding life repeatedly
- difficulty feeling mentally settled
- intense phases followed by withdrawal

Relate predictions to present life reality.

The native should feel the report understands:
- what is currently difficult
- why the current phase may feel heavy or confusing
- what karmic lesson is active now

Connect natal chart themes with the current Mahadasha and current transits so the report does not feel timeless or disconnected from the present.

Do not end every section positively.

Some sections should end with:
- caution
- realism
- maturity
- acceptance
- need for discipline
instead of optimism.

Avoid generic astrology language.

When writing in English, use simple, natural English.

Avoid complex words when a simpler word can explain the same idea.

Write as if speaking directly to an intelligent friend.

Avoid words such as:
- mercurial
- catalytic
- autonomous
- institutional
- paradigm
- transformative journey
- psychological integration

Prefer everyday language.

The report should be easy to understand for someone with no astrology knowledge.

Avoid repeating the same meaning in different words.

Each paragraph should add new insight.

Do not repeat:
- adaptability
- communication skills
- curiosity
- independence

more than once unless necessary.

The user should feel:
"This explains my real life."
not:
"This is generic motivational writing."

Keep tone balanced, grounded, insightful and emotionally intelligent.

Do not use fear-based predictions or absolute statements.

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

Report Language:
{language}

Language Instructions:
{language_instruction}

Strictly follow the selected report language. Do not switch to English unless Report Language is english.
Keep all report headings in English for every language.

Report Instructions:
{report_instruction}

Astrology Data:
{clean_chart}

Use clear, emotionally intelligent language.
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
                    f"{current_dasha['planet']} Mahadasha. Never name another planet as Mahadasha. "
                    f"You must write the report in this language: {language}."
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
                        f"to these incorrect Mahadashas: {', '.join(wrong_planets)}. "
                        f"Keep the report language as {language}."
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
