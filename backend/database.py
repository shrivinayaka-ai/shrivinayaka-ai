import sqlite3
import json
from datetime import datetime

DB_NAME = "reports.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            birth_date TEXT,
            birth_time TEXT,
            birth_place TEXT,
            report_type TEXT,
            current_mahadasha TEXT,
            chart_json TEXT,
            report_text TEXT,
            payment_status TEXT,
            created_at TEXT
        )
    """)

    conn.commit()
    conn.close()


def save_report(
    name,
    birth_date,
    birth_time,
    birth_place,
    report_type,
    current_mahadasha,
    chart,
    report_text,
    payment_status="free"
):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO reports (
            name,
            birth_date,
            birth_time,
            birth_place,
            report_type,
            current_mahadasha,
            chart_json,
            report_text,
            payment_status,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        name,
        birth_date,
        birth_time,
        birth_place,
        report_type,
        json.dumps(current_mahadasha),
        json.dumps(chart),
        report_text,
        payment_status,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    report_id = cursor.lastrowid
    conn.close()

    return report_id


def get_all_reports():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            birth_date,
            birth_time,
            birth_place,
            report_type,
            payment_status,
            created_at
        FROM reports
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    reports = []

    for row in rows:
        reports.append({
            "id": row[0],
            "name": row[1],
            "birth_date": row[2],
            "birth_time": row[3],
            "birth_place": row[4],
            "report_type": row[5],
            "payment_status": row[6],
            "created_at": row[7],
        })

    return reports


def get_report_by_id(report_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            birth_date,
            birth_time,
            birth_place,
            report_type,
            current_mahadasha,
            chart_json,
            report_text,
            payment_status,
            created_at
        FROM reports
        WHERE id = ?
    """, (report_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row[0],
        "name": row[1],
        "birth_date": row[2],
        "birth_time": row[3],
        "birth_place": row[4],
        "report_type": row[5],
        "current_mahadasha": row[6],
        "chart": row[7],
        "report": row[8],
        "payment_status": row[9],
        "created_at": row[10],
    }
