from astrology_engine.chart import generate_chart

chart = generate_chart(
    birth_date="1981-10-14",
    birth_time="23:31",
    birth_place="Delhi"
)

print(chart)