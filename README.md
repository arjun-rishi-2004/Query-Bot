# 🌌 Iris Ask

**Iris Ask** is a natural-language-to-SQL engine with a clean chat interface.  
It integrates with **Metabase** to let you **ask questions in plain English**, generate SQL, run queries, and save them as reusable Metabase Questions.

---

## 📂 Project Structure

```

iris-ask/
│── frontend/   # React + Vite chat interface
│── backend/    # FastAPI service (SQL generation + Metabase integration)
│── README.md   # Master documentation

````

---

## 🚀 Tech Stack
- **Frontend**
  - React (Vite)
  - TailwindCSS
  - Axios
- **Backend**
  - Python (FastAPI, Uvicorn)
  - PostgreSQL
  - Gemini API
  - Metabase API

---

# ⚛️ Frontend (Iris Ask UI)

## Setup

```bash
cd frontend/metabase-ai
npm install
npm run dev
````

Frontend will be live at 👉 **[http://localhost:5173](http://localhost:5173)**

### Features

* Ask questions in chat.
* Generate SQL queries with **Gemini**.
* Run SQL queries directly on database.
* Save queries into **Metabase**.
* Saved cards use the **question text** as their title.

---

# 🔧 Backend (Iris Ask Service)

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

pip install -r requirements.txt
uvicorn app:app --reload
```

Backend runs at 👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## ⚙️ Configuration

Create `.env` inside `backend/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
GEMINI_API_KEY=your_gemini_key
METABASE_URL=http://localhost:3000
METABASE_USERNAME=admin@example.com
METABASE_PASSWORD=your_password
```

---

## 🗄️ Metabase Setup (Local)

### Run Metabase with Docker

```bash
docker run -d --name metabase -p 3000:3000 ^
  -e MB_ENCRYPTION_SECRET_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef ^
  metabase/metabase:latest

```

Open 👉 **[http://localhost:3000](http://localhost:3000)**

1. Create an **Admin account** (use same credentials as `.env`).
2. Add your **Postgres database** connection (same as backend).
3. Metabase API will now sync with backend.

---

## 📡 API Endpoints

### **POST /generate-sql**

Generate SQL from natural language.

```json
{ "question": "Show me all locations in Chennai" }
```

### **POST /run-sql**

Run a SQL query.

```json
{ "sql": "SELECT * FROM emsp.location WHERE city = 'Chennai';" }
```

### **POST /save-sql**

Save query as a Metabase Question.

```json
{
  "sql": "SELECT * FROM emsp.location;",
  "question": "List all locations"
}
```

---

## 🎯 Flow

1. User asks a **question** in frontend.
2. Backend → **Gemini** generates SQL (with schema awareness).
3. User can **Run** or **Save** SQL.
4. **Run** executes SQL on Postgres.
5. **Save** creates a **Metabase Question** with the user’s question as the card title.

---

Now Iris Ask = **Chat + SQL Engine + Metabase integration**.

```
