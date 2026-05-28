from astrology_engine.chart import generate_chart
from ai_engine.prediction import generate_full_prediction


chart = generate_chart(
    birth_date="1981-10-14",
    birth_time="23:31",
    birth_place="Delhi"
)

report = generate_full_prediction(chart)

print(report)
