import os
import requests
from fastapi import FastAPI, Body, Response, Query
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware
import csv
import io
from typing import Optional

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Env vars
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
METABASE_URL = os.getenv("METABASE_URL")
METABASE_SESSION = os.getenv("METABASE_SESSION")
METABASE_DB_ID = int(os.getenv("METABASE_DB_ID"))

print("Environment variables loaded successfully.")

# Models
class Question(BaseModel):
    question: str

class SQLQuery(BaseModel):
    sql: str
    name: Optional[str] = "Generated Question"
    dashboard_id: Optional[int] = None   # Optional dashboard link

# === 1. Generate SQL ===
@app.post("/generate-sql")
def generate_sql(question: dict = Body(...)):
    model = genai.GenerativeModel("gemini-1.5-flash")
    with open("schema_context.txt") as f:
        schema_context = f.read()
    prompt = f"""
You are a SQL expert. The database schema is:

{schema_context}

Rules:
- Always prefix every table with the schema name: emsp.
- ONLY use the tables and columns listed in the schema above.
- Do not invent new tables or columns.

Convert the following natural language question into a valid SQL query:
Question: {question['question']}

Return only SQL code, nothing else.
"""
    response = model.generate_content(prompt)
    sql = (
        response.text.replace("```sql", "")
        .replace("```", "")
        .strip()
    )
    return {"sql": sql}

# === 2. Run SQL via Metabase (ad-hoc or saved) ===
@app.post("/run-sql")
def run_sql(query: SQLQuery, download: str = Query(None, enum=["csv", "xlsx"])):
    dataset_url = f"{METABASE_URL}/api/dataset"
    headers = {"X-Metabase-Session": METABASE_SESSION, "Content-Type": "application/json"}
    payload = {
        "database": METABASE_DB_ID,
        "type": "native",
        "native": {"query": query.sql}
    }

    r = requests.post(dataset_url, headers=headers, json=payload)
    if r.status_code != 200:
        return {"error": "Metabase query failed", "details": r.text, "sql": query.sql}

    res_json = r.json()
    cols = [c["name"] for c in res_json["data"]["cols"]]
    rows = res_json["data"]["rows"]

    #download feature will be implemented later

    # If download requested
    # if download == "csv":
    #     output = io.StringIO()
    #     writer = csv.writer(output)
    #     writer.writerow(cols)
    #     writer.writerows(rows)
    #     return Response(
    #         content=output.getvalue(),
    #         media_type="text/csv",
    #         headers={"Content-Disposition": f"attachment; filename=query_results.csv"}
    #     )

    # if download == "xlsx":
    #     from openpyxl import Workbook
    #     wb = Workbook()
    #     ws = wb.active
    #     ws.append(cols)
    #     for row in rows:
    #         ws.append(row)
    #     output = io.BytesIO()
    #     wb.save(output)
    #     return Response(
    #         content=output.getvalue(),
    #         media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    #         headers={"Content-Disposition": f"attachment; filename=query_results.xlsx"}
    #     )

    return {"sql": query.sql, "columns": cols, "rows": rows}

# === 3. Save query as Metabase Question (Card) ===
@app.post("/save-sql")
def save_sql(query: SQLQuery):
    headers = {"X-Metabase-Session": METABASE_SESSION, "Content-Type": "application/json"}
    card_payload = {
    "name": query.name,
    "dataset_query": {
        "type": "native",
        "native": {"query": query.sql},
        "database": int(METABASE_DB_ID),
    },
    "display": "table",
    "visualization_settings": {}  # 🔥 must be a dict, not null
}


    # Create card
    card_url = f"{METABASE_URL}/api/card"
    card_res = requests.post(card_url, headers=headers, json=card_payload)
    if card_res.status_code != 200:
        return {"error": "Failed to save question", "details": card_res.text}
    card_data = card_res.json()

    # Optionally add to dashboard
    # if query.dashboard_id:
    #     dash_url = f"{METABASE_URL}/api/dashboard/{query.dashboard_id}/cards"
    #     dash_payload = {"cardId": card_data["id"]}
    #     dash_res = requests.post(dash_url, headers=headers, json=dash_payload)
    #     if dash_res.status_code != 200:
    #         return {"error": "Card saved but failed to attach to dashboard", "details": dash_res.text}

    return {"message": "SQL saved as Metabase Question", "card": card_data}
