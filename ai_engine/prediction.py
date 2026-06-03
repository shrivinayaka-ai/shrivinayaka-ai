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


def translate_question_for_report(question, language):
    if not question or language != "hindi":
        return question

    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Translate the user's question into simple spoken Hindi. "
                    "Return only the Hindi translation in Devanagari script. "
                    "Do not add explanation."
                )
            },
            {
                "role": "user",
                "content": f"Question:\n{question}"
            }
        ]
    )

    return response.choices[0].message.content.strip()


def generate_full_prediction(
    chart_data,
    report_type="free",
    language="english",
    user_context=None,
    report_style="full"
):
    report_type = report_type.lower().strip()
    language = language.lower().strip()
    report_style = report_style.lower().strip()

    if user_context is None:
        user_context = {}

    question = user_context.get("main_question")
    translated_question = translate_question_for_report(question, language)
    if translated_question:
        user_context = {
            **user_context,
            "main_question": translated_question,
            "original_main_question": question,
        }

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
        "nakshatra": chart_data.get("nakshatra"),
        "nakshatra_summary_card": chart_data.get("nakshatra_summary_card"),
        "current_dasha": chart_data.get("current_dasha"),
        "current_dasha_details": chart_data.get("current_dasha_details"),
        "antardasha_timeline": chart_data.get("antardasha_timeline"),
        "dashas": chart_data.get("dashas"),
        "transits": chart_data.get("transits"),
        "current_mahadasha_planet": current_dasha["planet"],
        "current_mahadasha_start": current_dasha["start"],
        "current_mahadasha_end": current_dasha["end"],
        "current_mahadasha_years": current_dasha["years"]
    }

    if report_style in ("consultation", "question"):
        report_instruction = f"""
Write a focused astrology consultation that answers the user's main question.

IMPORTANT:

The user has paid for analysis of ONE primary question.

Consultation Section Rules:
Maximum 4 pages.

Keep Brief Chart Summary under 120 words.

Keep Transit Impact under 200 words.

Avoid repeating information already explained in Complete Astrology Report.

If multiple questions appear, identify the first major question and answer only that question.

Do not attempt to answer every question.

Ignore secondary questions.

Do NOT write a full life report.

Avoid unrelated sections such as personality, marriage, career, money or health unless they are directly relevant to the user's question.

The report should usually be 2-3 pages, concise, practical and direct.

For Personal Consultation Report:

Keep the report focused and concise.

Target length:
4-5 PDF pages maximum.

Brief Chart Summary:
Maximum 120 words.

Analyze only planets, houses, dasha and transits directly connected to the user's first question.

Do not write full personality, marriage, career, finance or health sections unless directly relevant to the question.

Use this format exactly:

# Personal Consultation Astrology Report

## Brief Chart Summary
Give only the chart factors directly relevant to the user's question.

## Factors Relevant To Question
Analyze the houses, planets and chart indicators connected to the question.

Examples:
- Mother health: 4th house, Moon, relevant house lord, current timing
- Court case: 6th house, 8th house, Mars, Saturn, current timing
- Job/career: 10th house, 6th house, Saturn, Sun, current timing
- Marriage: 7th house, Venus/Jupiter, 2nd house, 11th house, current timing
- Money: 2nd house, 11th house, 10th house, Jupiter, current timing

Do not force unrelated topics into the report.

## Current Dasha Impact
Explain how ONLY the current Mahadasha affects the user's question.

Current Mahadasha:
{current_dasha["planet"]} Mahadasha
{current_dasha["start"]} to {current_dasha["end"]}

Current Dasha and Antardasha Details:
{chart_data.get("current_dasha")}

Nakshatra Summary Card:
{chart_data.get("nakshatra_summary_card")}

Antardasha Timeline:
{chart_data.get("antardasha_timeline")}

If current Antardasha details are provided, explain how the Antardasha modifies the current Mahadasha for the user's question.
If next_antardasha is provided, briefly preview how the next Antardasha may shift the situation.
If the question is about timing, include a concise next 3 years roadmap.
If Antardasha Timeline is provided, include a simple table:
Period | Start Date | End Date
Do not confuse Antardasha with Mahadasha.
Do not name the Antardasha planet as the Mahadasha.

## Current Transit Impact
Mention ONLY the 2-3 most relevant transit factors connected directly to the user's question.

Do NOT repeat the full transit analysis already given in the Complete Astrology Report.

Keep this section under 200 words.

Use planet-specific headings instead of repeating "Main Effect".

For Current Transit Impact section:

Use ONLY English subheadings:

### Saturn Impact
### Jupiter Impact
### Rahu Impact
### Ketu Impact

Do not repeat the same heading twice.
Do not translate these headings into Hindi.
Do not write "शनि प्रभाव", "गुरु प्रभाव", "राहु प्रभाव", or "केतु प्रभाव".
Do not repeat planet impact headings.
Do not translate the impact heading separately.
After each heading, write one short paragraph only.
For Hindi reports, keep the heading in English and write the paragraph in Hindi.

Only include planets that are directly relevant to the question.

Do not write "Main Effect" repeatedly in the Personal Consultation section.

Do not include every transit if it is not relevant. But if a transit strongly affects the question, explain it clearly.

## Direct Answer
Format exactly like this:

Your Question

[Rewrite the user's question in clear language]

Direct Answer

[Provide the answer]

Overall Assessment

Choose one:
- Strongly Favorable
- Moderately Favorable
- Mixed but Improving
- Caution Needed

Do not use "Probability Level".

Do not skip the question.

Always display both:
- User Question
- Direct Answer
- Overall Assessment

They must be in separate paragraphs.

Leave one blank line between them.

For Hindi reports, format exactly:

Your Question

[यूज़र के प्रश्न को साफ और सरल भाषा में दोहराएं]

Direct Answer

[उत्तर]

Overall Assessment

Strongly Favorable / Moderately Favorable / Mixed but Improving / Caution Needed

Headings must remain in English. Keep body text in Hindi.

प्रश्न और उत्तर एक ही लाइन में न लिखें।

IMPORTANT OVERRIDE FOR HINDI REPORTS:
Ignore the Hindi heading labels shown above.

Use English headings only:
Your Question
Direct Answer
Overall Assessment

Write the question and answer body in Hindi.

IMPORTANT OVERRIDE FOR HINDI REPORTS:
Ignore the Hindi heading labels shown above.

Use English headings only:
Your Question
Direct Answer
Overall Assessment

Write the question and answer body in Hindi.

Never start the Direct Answer section with the answer itself.

Always display the question first, then the answer.

Do not give a vague answer.

IMPORTANT OVERRIDE FOR HINDI REPORTS:
Ignore the Hindi heading labels shown above.
Use English headings only:
Your Question
Direct Answer
Overall Assessment

Write the question and answer body in Hindi.

## Time Period
Give realistic timing tendencies if applicable.

Avoid guaranteed dates.

## Practical Advice
Give practical steps the user can take in this situation.

## Final Observation
End with a clear astrologer's final observation.

The final observation should feel like a grounded verdict, not motivation and not a confidence score.
"""
    elif report_type == "premium":
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

## 2. Moon Sign, Nakshatra and Pada Analysis
Use the provided Moon Nakshatra Details.

Mandatory:
Start this section with a clear summary card:

Moon Sign:
Nakshatra:
Pada:
Nakshatra Lord:

Explain:
- Moon sign emotional base
- Nakshatra nature
- Pada meaning
- Nakshatra lord influence
- how this affects personality, choices and emotional reactions

Write in simple practical language.

## 3. Deep Personality Breakdown from Nakshatra
Explain the psychological pattern shown by the Nakshatra and Pada.

Discuss:
- instinctive behavior
- emotional needs
- hidden fears
- desire pattern
- relationship with comfort, success and pressure
- shadow side of the Nakshatra

This section should feel personal, not textbook-like.

## 4. Emotional Nature and Mental Pattern
Explain:
- emotional rhythm
- thinking style
- stress response
- mood patterns
- how the native handles disappointment, delay and uncertainty

## 5. Core Karmic Challenges
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

## 6. Career, Work & Success Path
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

## 7. Money & Financial Stability
Analyze:
- earning pattern
- spending habits
- savings tendency
- financial risks
- long-term wealth potential
- sudden gains/losses
- stability patterns

Give practical financial guidance.

## 8. Relationship, Marriage & Emotional Compatibility
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

## 9. Health & Mental Wellbeing
Do NOT diagnose disease.

Discuss:
- stress patterns
- emotional pressure
- mental balance
- lifestyle tendencies
- sleep/stress habits
- energy fluctuations

Give gentle wellness advice.

## 10. Current Transit Analysis
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
#### Saturn Impact
[one short practical line]

#### Impact from Ascendant
Explain result from Ascendant.

#### Saturn in 12th House from Moon

#### Impact from Moon
Explain emotional/mental result from Moon.

#### Practical Advice
Give practical advice for the next 6-12 months.

### Jupiter in 1st House
#### Jupiter Impact
[one short practical line]

#### Impact from Ascendant
Explain result from Ascendant.

#### Jupiter in 3rd House from Moon

#### Impact from Moon
Explain emotional/mental result from Moon.

#### Practical Advice
Give practical advice for the next 6-12 months.

### Rahu in 9th House
#### Rahu Impact
[one short practical line]

#### Impact from Ascendant
Explain result from Ascendant.

#### Rahu in 11th House from Moon

#### Impact from Moon
Explain emotional/mental result from Moon.

#### Practical Advice
Give practical advice for the next 6-12 months.

### Ketu in 3rd House
#### Ketu Impact
[one short practical line]

#### Impact from Ascendant
Explain result from Ascendant.

#### Ketu in 5th House from Moon

#### Impact from Moon
Explain emotional/mental result from Moon.

#### Practical Advice
Give practical advice for the next 6-12 months.

Do not skip Moon-based placement for any planet.
Do not skip Ascendant-based placement for any planet.
Do not combine both meanings into one paragraph.
Do not use "Main Effect" in this section.
Do not write transit results as plain loose paragraphs.
Use the h3 and h4 heading structure above so each planet can be shown in a bordered box in the PDF.

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

Current Transit Analysis Rules:

For each planet transit, write:
1. Planet and house from Ascendant
2. Main practical effect
3. From Ascendant explanation
4. Planet and house from Moon
5. Emotional / mental effect from Moon
6. Practical advice

Transit analysis is important. Do not make this section too short.

For Jupiter, Rahu and Ketu also give detailed explanation equal to Saturn.

Minimum length:
- Saturn total: 180-220 words
- Jupiter total: 180-220 words
- Rahu total: 180-220 words
- Ketu total: 160-200 words

Do not write generic lines.
Connect transit result to user's employment, relationship, money and current concern if provided.

## 11. Detailed Current Mahadasha Analysis
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

## 12. Current Antardasha Meaning
Analyze the current Antardasha using ONLY the provided Current Dasha and Antardasha Details.

Mandatory:
Show the current period exactly:

Current Antardasha:
Start Date:
End Date:

Explain:
- how the Antardasha modifies the current Mahadasha
- emotional and practical themes
- career/money/relationship impact where relevant
- likely focus for the next 12-24 months
- cautions and practical advice

Do not call the Antardasha planet the Mahadasha planet.
Do not change the given current Mahadasha.

## 13. Next Antardasha Preview
Use the provided next_antardasha inside Current Dasha and Antardasha Details.

Mandatory:
Show the next period exactly:

Next Antardasha:
Start Date:
End Date:

Explain:
- which Antardasha comes next
- likely shift in focus
- what may improve
- what may become more demanding
- how to prepare before it starts

Do not make fixed guarantees.

## 14. Antardasha Timeline
Use the provided Antardasha Timeline.

Add a table exactly like:

Period | Start Date | End Date

Then explain the timing pattern in simple practical language.

## 15. Next 3 Years Roadmap
Create a practical timeline for the next 3 years.

Use this format:

### Year 1:
Period:
[Clear timing window]
Prediction:
[Opportunities, pressure points and likely developments]
Advice:
[Practical advice]

### Year 2:
Period:
[Clear timing window]
Prediction:
[Opportunities, pressure points and likely developments]
Advice:
[Practical advice]

### Year 3:
Period:
[Clear timing window]
Prediction:
[Opportunities, pressure points and likely developments]
Advice:
[Practical advice]

Connect this roadmap with:
- current Mahadasha
- current Antardasha
- next Antardasha
- current transits

Keep it realistic and practical.
Do not use the word "Theme" or "Themes" in this roadmap.
Keep Year 1, Year 2 and Year 3 close together with concise paragraphs and minimal gap.
Use only these labels under each year:
Period:
Prediction:
Advice:

## 16. Practical Remedies & Alignment Advice
Give safe and practical remedies:
- discipline habits
- meditation/mantra
- donation/charity
- spiritual practices
- emotional healing suggestions
- lifestyle improvements

Avoid superstition and fear-based remedies.

## 17. Final Guidance
End with:
- hopeful practical advice
- emotional encouragement
- balanced guidance
- empowerment mindset

At the end, always write "Final Observation" as a main heading, not plain text.

## 18. Direct Answer Section
If the user has asked a specific question, create the section title based on Report Language:

English:
### Direct Answer to Your Question

Hindi:
### आपके प्रश्न का सीधा उत्तर

Hinglish:
### Aapke Sawal Ka Seedha Jawaab

Create the following sub-headings:

### आपका प्रश्न

### संक्षिप्त उत्तर

### कुंडली क्या संकेत देती है

### संभावित समय अवधि

### व्यावहारिक सलाह

Do not use numbering.

Do not write:
1)
2)
3)

Use clean headings only.

Under "आपका प्रश्न", rewrite and repeat the user's question in a clean, professional way.

Do not copy the user's raw question word-for-word if it sounds informal, emotional, unstructured or grammatically rough.

Rewrite it into a clear client-style question while keeping the original meaning.

Example:
Instead of:
"I don't have any job and not married yet. There is no money inflow..."

Write:
"I am currently unemployed, unmarried, and do not have a regular income source. When can my financial situation improve?"

Hindi style:
"मैं वर्तमान में बेरोजगार हूं, शादी नहीं हुई है और नियमित आय का कोई स्रोत नहीं है। आर्थिक स्थिति कब बेहतर होगी?"

Hinglish style:
"Main abhi unemployed hoon, shaadi nahi hui hai aur regular income source nahi hai. Financial situation kab improve ho sakti hai?"

At the end provide:

Final Observation

Use this as a natural astrologer's final verdict, not as a machine-like score.

Do not write:
"Confidence Level: Medium"
or
"Reason: ..."

Instead write a final observation that clearly says whether the chart and current timing are supportive, mixed, delayed, or uncertain.

Base the final observation on:
- Natal chart
- Current Mahadasha
- Current major transits

If the chart and timing support the same outcome, say it clearly but without guarantees.

If signals are mixed, explain that improvement is possible but delays, pressure or extra effort are also visible.

If timing factors contradict each other, explain that the situation is uncertain and needs patience.

Example:

You asked:
"When will my finances improve?"

Short Answer:
Financial improvement is possible within the next 6-12 months, but stronger stability may take 1-3 years.

Why:
Rahu Mahadasha encourages new opportunities while Saturn is slowing career growth and demanding patience.

Time Period:
Small income opportunities may appear first through freelance work, consulting or temporary projects.

Practical Advice:
Focus on building one income source consistently instead of changing direction repeatedly.

Final Observation:

Kundli and current timing suggest that income opportunities can improve, but stability may build slowly. Consistent effort, skill development and choosing the right direction will matter more than sudden luck.

Hindi example:

अंतिम निष्कर्ष:

कुंडली और वर्तमान ग्रह दशाएं यह संकेत देती हैं कि आने वाले समय में आय के अवसर बढ़ सकते हैं। हालांकि स्थिरता धीरे-धीरे बनेगी और इसके लिए लगातार प्रयास, कौशल विकास और सही दिशा में काम करना जरूरी रहेगा।

Keep this section concise and direct.

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

    if (
        report_type == "premium"
        and report_style in ("full", "full_plus_consultation")
        and "## 11. Direct Answer Section" in report_instruction
    ):
        complete_report_instruction = (
            report_instruction
            .replace("# Premium Vedic Astrology Report", "# Complete Astrology Report")
            .split("## 11. Direct Answer Section")[0]
            .rstrip()
        )

        complete_report_instruction += """

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

        consultation_report_instruction = f"""
Write a focused personal consultation analysis that answers the user's main question.

IMPORTANT:
The user has paid for analysis of ONE primary question.

Keep the personal consultation focused and concise.

Consultation Section Rules:
Maximum 4 pages.

Keep Brief Chart Summary under 120 words.

Keep Transit Impact under 200 words.

Avoid repeating information already explained in Complete Astrology Report.

Brief Chart Summary:
Maximum 120 words.

Analyze only planets, houses, dasha and transits directly connected to the user's first question.

Do not write full personality, marriage, career, finance or health sections unless directly relevant to the question.

If multiple questions appear, identify the first major question and answer only that question.
Do not attempt to answer every question.
Ignore secondary questions.

For Hindi reports in this Part 2 consultation:
Keep all headings in English.
Use "Your Question", "Direct Answer", "Overall Assessment", "Time Period", and "Practical Advice" as headings.
Write only the paragraph body in Hindi.

Use this format exactly:

## PART 2 - Personal Consultation Analysis

## Brief Chart Summary
Give only the chart factors directly relevant to the user's question.

## Factors Relevant To Question
Analyze the houses, planets and chart indicators connected to the question.

Examples:
- Mother health: 4th house, Moon, relevant house lord, current timing
- Court case: 6th house, 8th house, Mars, Saturn, current timing
- Job/career: 10th house, 6th house, Saturn, Sun, current timing
- Marriage: 7th house, Venus/Jupiter, 2nd house, 11th house, current timing
- Money: 2nd house, 11th house, 10th house, Jupiter, current timing

## Current Dasha Impact
Explain how ONLY the current Mahadasha affects the user's question.

Current Mahadasha:
{current_dasha["planet"]} Mahadasha
{current_dasha["start"]} to {current_dasha["end"]}

## Current Transit Impact
Mention ONLY the 2-3 most relevant transit factors connected directly to the user's question.

Do NOT repeat the full transit analysis already given in the Complete Astrology Report.

Keep this section under 200 words.

Use planet-specific headings instead of repeating "Main Effect".

For Current Transit Impact section:

Use ONLY English subheadings:

### Saturn Impact
### Jupiter Impact
### Rahu Impact
### Ketu Impact

Do not repeat the same heading twice.
Do not translate these headings into Hindi.
Do not write "शनि प्रभाव", "गुरु प्रभाव", "राहु प्रभाव", or "केतु प्रभाव".
Do not repeat planet impact headings.
Do not translate the impact heading separately.
After each heading, write one short paragraph only.
For Hindi reports, keep the heading in English and write the paragraph in Hindi.

Only include planets that are directly relevant to the question.

Do not write "Main Effect" repeatedly in the Personal Consultation section.

## Direct Answer
Format exactly like this:

Your Question

[Rewrite the user's question in clear language]

Direct Answer

[Provide the answer]

Overall Assessment

Choose one:
- Strongly Favorable
- Moderately Favorable
- Mixed but Improving
- Caution Needed

Do not use "Probability Level".

Do not skip the question.

Always display both:
- User Question
- Direct Answer
- Overall Assessment

They must be in separate paragraphs.

Leave one blank line between them.

For Hindi reports, format exactly:

आपका प्रश्न

[यूज़र के प्रश्न को साफ और सरल भाषा में दोहराएं]

सीधा उत्तर

[उत्तर]

दोनों को अलग-अलग पैराग्राफ में दिखाएं।

प्रश्न और उत्तर एक ही लाइन में न लिखें।

Never start the Direct Answer section with the answer itself.

Always display the question first, then the answer.

IMPORTANT OVERRIDE FOR HINDI REPORTS:
Ignore the Hindi heading labels shown above.
Use English headings only:
Your Question
Direct Answer
Overall Assessment

Write the question and answer body in Hindi.

## Time Period
Give realistic timing tendencies if applicable. Avoid guaranteed dates.

## Practical Advice
Give practical steps the user can take in this situation.

## Final Observation
End with a clear astrologer's final observation.

The final observation should feel like a grounded verdict, not motivation and not a confidence score.
"""

        if report_style == "full":
            report_instruction = (
                complete_report_instruction
                + "\n\nDo not create a Direct Answer section in this complete report."
            )
        else:
            complete_part_instruction = (
                complete_report_instruction
                .replace("# Complete Astrology Report", "")
                .strip()
            )

            report_instruction = f"""
Write a complete paid report that feels like two separate products in one.

Use this title:

# Complete Astrology Report + Personal Consultation

First write:

## PART 1 - Complete Astrology Report

Then follow this complete report structure:

{complete_part_instruction}

After Part 1, write the personal consultation as a separate product:

{consultation_report_instruction}
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

Do not use #### headings.

Use only:
# for main title
## for major sections
### for sub-sections

For advice points, use bullet points only.
Do not write standalone bold advice lines as headings.

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

Moon Nakshatra Details:
{clean_chart.get("nakshatra")}

Nakshatra Summary Card:
{clean_chart.get("nakshatra_summary_card")}

Current Dasha and Antardasha Details:
{clean_chart.get("current_dasha_details")}

Antardasha Timeline:
{clean_chart.get("antardasha_timeline")}

Full Dasha Timeline:
{clean_chart.get("dashas")}

Do not infer, recalculate, or choose Mahadasha from any other chart factor.
Do not mention any other planet as Mahadasha.
If Antardasha details are provided, explain the Antardasha separately from Mahadasha.
Do not call Antardasha the Mahadasha.

Use Moon Nakshatra, Pada and Nakshatra Lord for personality, emotional nature and life pattern interpretation.

Mandatory formatting rules:

1. Under "Moon Sign, Nakshatra and Pada Analysis", start with:
Moon Sign:
Nakshatra:
Pada:
Nakshatra Lord:

2. Under "Current Antardasha Meaning", show:
Current Antardasha:
Start Date:
End Date:

3. Under "Next Antardasha Preview", show:
Next Antardasha:
Start Date:
End Date:

4. Add an "Antardasha Timeline" table:
Period | Start Date | End Date

5. Next 3 Years Roadmap should be:
Year 1:
Period:
Prediction:
Advice:
Year 2:
Period:
Prediction:
Advice:
Year 3:
Period:
Prediction:
Advice:

Do not use the word "Theme" or "Themes" in the Next 3 Years Roadmap.
Keep Year 1, Year 2 and Year 3 close together with concise paragraphs and minimal gap.
Use compact spacing between Period, Prediction and Advice.

Final Observation must appear as a heading exactly:
## Final Observation

Report Type:
{report_type}

Report Style:
{report_style}

Report Language:
{language}

Language Instructions:
{language_instruction}

Strictly follow the selected report language. Do not switch to English unless Report Language is english.
Keep all report headings in English for every language.

User Current Life Context:
{user_context}

IMPORTANT:

If the user has provided personal information such as:

- unemployed
- financial problems
- single
- married
- health issues
- career struggles
- relationship issues

then first acknowledge the user's situation before giving astrological interpretation.

Example:

User says:
"I am unemployed."

Write:

"You mentioned that you are currently unemployed.
Your chart and current planetary periods also show delays and instability in career matters."

User says:
"I am single."

Write:

"You mentioned that you are currently single.
The chart also indicates delays and caution in relationship matters."

User says:
"I have financial problems."

Write:

"You mentioned that finances are currently under pressure.
The chart and current planetary periods also indicate fluctuations and delays in income."

Do not assume the chart caused the problem.

First acknowledge the user's situation.

Then explain how the chart reflects or supports that situation.

This acknowledgement should appear naturally at the beginning of Career, Finance, Relationship, Health or other relevant sections.

If user has shared a main question, answer it clearly in the relevant section.

If Report Style is consultation or full_plus_consultation, answer the main question in the personal consultation section.

If Report Style is full, do not create a separate question-answer section.

Do not ignore the user context.

Do not overfit everything to the user context; combine it with chart, Mahadasha and transits.

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
