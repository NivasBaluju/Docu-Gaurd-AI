import os
import urllib.parse
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def get_db_url():
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return "postgresql://localhost/deciva"
    try:
        parsed = urllib.parse.urlparse(url)
        query_params = urllib.parse.parse_qs(parsed.query)
        # Remove channel_binding if unsupported by libpq / psycopg2
        query_params.pop('channel_binding', None)
        new_query = urllib.parse.urlencode(query_params, doseq=True)
        sanitized = urllib.parse.urlunparse(parsed._replace(query=new_query))
        return sanitized
    except Exception:
        return url

def get_db_connection():
    db_url = get_db_url()
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    conn.autocommit = True
    return conn

def test_connection():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 AS test;")
        row = cur.fetchone()
        cur.close()
        conn.close()
        return True, "PostgreSQL connected successfully"
    except Exception as e:
        return False, str(e)
