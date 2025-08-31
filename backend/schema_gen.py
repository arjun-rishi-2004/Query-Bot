import psycopg2
import os

# --- Connection details (hardcode or load from .env) ---
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "ocpi_zeon_dev-local")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "arjun@478")

output_file = "schema_context.txt"

# --- Queries ---
COLUMNS_QUERY = """
SELECT 
    table_name, 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_schema = 'emsp'
ORDER BY table_name, ordinal_position;
"""

FK_QUERY = """
SELECT 
    tc.table_name AS table_name,
    kcu.column_name AS column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY table_name, column_name;
"""

def export_schema_context():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    cur = conn.cursor()

    # Fetch tables & columns
    cur.execute(COLUMNS_QUERY)
    columns = cur.fetchall()

    # Fetch foreign keys
    cur.execute(FK_QUERY)
    fks = cur.fetchall()

    # --- Format results ---
    tables = {}
    for table_name, column_name, data_type in columns:
        if table_name not in tables:
            tables[table_name] = []
        tables[table_name].append(f"{column_name} ({data_type})")

    schema_text = ["Tables:"]
    for table, cols in tables.items():
        schema_text.append(f"{table}({', '.join(cols)})")

    schema_text.append("\nRelations:")
    for table, col, f_table, f_col in fks:
        schema_text.append(f"{table}.{col} → {f_table}.{f_col}")

    # Write to file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(schema_text))


    print(f"✅ Schema context exported to {output_file}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    export_schema_context()
