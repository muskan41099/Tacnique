import sqlite3
import json
from datetime import datetime, timedelta
import secrets
import hashlib
from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

active_tokens = {}  

# -----------------------------
# Database helpers
# -----------------------------

def init_db() -> None:
    db = sqlite3.connect('quiz.db')
    cur = db.cursor()

    # Users
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            question_type TEXT NOT NULL,
            options TEXT,
            correct_answer TEXT,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            score INTEGER,
            total INTEGER,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    #Create default admin user
    cur.execute('SELECT * FROM users WHERE username = ?', ('admin',))
    if not cur.fetchone():
        admin_password_hash = hash_password('admin123')
        cur.execute(
            'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
            ('admin', admin_password_hash, 1)
        )

    db.commit()
    db.close()

init_db()

def get_db():
    conn = sqlite3.connect('quiz.db')
    conn.row_factory = sqlite3.Row
    return conn

# -----------------------------
# Auth helpers
# -----------------------------

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    return secrets.token_urlsafe(32)

def verify_token(token):
    if token in active_tokens:
        user_data = active_tokens[token]
        if (datetime.now() < user_data["expires"]):
            return user_data 
    return None

def require_auth(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            return jsonify({"error": "authorization required"}), 401
        
        token = token.split(" ")[1]
        user_data = verify_token(token)
        if not user_data:
            return jsonify({"error": "invalid token"}), 401
        
        return f(user_data, *args, **kwargs)
    
    wrapper.__name__ = f.__name__
    return wrapper

def require_admin(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            return jsonify({"error": "authorization required"}), 401
        
        token = token.split(" ")[1]
        user_data = verify_token(token)
        if not user_data or not user_data.get("is_admin"):
            return jsonify({"error": "admin privileges required"}), 403
        
        return f(user_data, *args, **kwargs)
    
    wrapper.__name__ = f.__name__
    return wrapper


# -----------------------------
# Routes (basic examples)
# -----------------------------

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    
    conn = get_db()
    cur = conn.cursor()

    try: 
        password_hash = hash_password(password)
        cur.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
            (username, password_hash, 0)
        )
        conn.commit()

        user_id = cur.lastrowid
        conn.close()

        return jsonify({"id": user_id, "username": username}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "username already exists"}), 409
    



@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash, is_admin FROM users WHERE username = ?",
        (username,)
    )
    row = cur.fetchone()
    conn.close()

    if not row or hash_password(password) != row["password_hash"]:
        return jsonify({"error": "invalid credentials"}), 401

    token = generate_token()
    active_tokens[token] = {
        "user_id": row["id"],
        "username": row["username"],
        "is_admin": bool(row["is_admin"]),
        "expires": datetime.now() + timedelta(hours=24)
    }

    return jsonify({
        'token': token,
        'user': {
            'id': row["id"],
            'username': username,
            'is_admin': bool(row["is_admin"])
        }
    })


@app.route("/api/logout", methods=["POST"])
@require_auth()
def logout(user_data):
    token = request.headers.get("Authorization").split(" ")[1]
    if token in active_tokens:
        del active_tokens[token]
    return jsonify({"message": "logged out"}), 200


@app.route("/api/me", methods=["GET"])
@require_auth()
def get_current_user(user_data):
    return jsonify({
        "id": user_data["user_id"],
        "username": user_data["username"],
        "is_admin": user_data["is_admin"]
    })


@app.route("/api/quizzes", methods=["POST"])
@require_admin()
def create_quiz(user_data):
    data = request.json
    conn = get_db()
    cur = conn.cursor()

    c.execute(
        "INSERT INTO quizzes (title, created_by) VALUES (?, ?)",
        (data.get("title"), user_data["user_id"])
    )
    quiz_id = cur.lastrowid

    for q in data.get("questions"):
        cur.execute(
            """
            INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answer)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                quiz_id,
                q.get("question_text"),
                q.get("question_type"),
                json.dumps(q.get("options")) if q.get("options") else None,
                q.get("correct_answer")
            )
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "quiz created", "quiz_id": quiz_id}), 201


@app.route("/api/quizzes", methods=["GET"])
def get_all_quizzes():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, created_by, created_at FROM quizzes")
    quizzes = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(quizzes)


@app.route("/api/quizzes/<int:quiz_id>", methods=["GET"])
def get_quiz(quiz_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, created_by, created_at FROM quizzes WHERE id = ?", (quiz_id,))
    quiz_row = cur.fetchone()

    if not quiz_row:
        conn.close()
        return jsonify({"error": "quiz not found"}), 404

    quiz = dict(quiz_row)

    cur.execute("SELECT id, question_text, question_type, options FROM questions WHERE quiz_id = ?", (quiz_id,))
    questions = []
    for row in cur.fetchall():
        question = dict(row)
        if question["options"]:
            question["options"] = json.loads(question["options"])
        questions.append(question)

    quiz["questions"] = questions
    conn.close()
    return jsonify(quiz)



@app.route("/api/quizzes/<int:quiz_id>/submit", methods=["POST"])
@require_auth()
def submit_quiz(user_data, quiz_id):
    data = request.json
    answers = data.get("answers", {})

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM quizzes WHERE id = ?", (quiz_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({"error": "quiz not found"}), 404

    cur.execute("SELECT id, correct_answer FROM questions WHERE quiz_id = ?", (quiz_id,))
    questions = cur.fetchall()

    score = 0
    total = len(questions)

    for question in questions:
        qid = question["id"]
        correct_answer = question["correct_answer"]
        user_answer = answers.get(str(qid))

        if user_answer is not None and str(user_answer) == str(correct_answer):
            score += 1

    cur.execute(
        """
        INSERT INTO submissions (quiz_id, user_id, score, total)
        VALUES (?, ?, ?, ?)
        """,
        (quiz_id, user_data["user_id"], score, total)
    )

    conn.commit()
    conn.close()

    return jsonify({"score": score, "total": total}), 200





if __name__ == "__main__":
    app.run(debug=True, port=5000)