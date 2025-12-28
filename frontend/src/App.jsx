import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }
    fetchQuizzes();
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/quizzes`);
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setView('home');
  };

  return (
    <div className="App">
      <header>
        <h1>Quiz Management System</h1>
        <nav>
          <button onClick={() => setView('home')}>Home</button>
          {user?.is_admin && (
            <button onClick={() => setView('admin')}>Admin Panel</button>
          )}
          {!user ? (
            <>
              <button onClick={() => setView('login')}>Login</button>
              <button onClick={() => setView('register')}>Register</button>
            </>
          ) : (
            <div className="user-info">
              <span>Welcome, {user.username}!</span>
              {user.is_admin && <span className="admin-badge">Admin</span>}
              <button onClick={logout}>Logout</button>
            </div>
          )}
        </nav>
      </header>

      <main>
        {view === 'home' && <QuizList quizzes={quizzes} setView={setView} user={user} />}
        {view === 'login' && <Login setToken={setToken} setView={setView} />}
        {view === 'register' && <Register setView={setView} />}
        {view === 'admin' && user?.is_admin && <AdminPanel onQuizCreated={fetchQuizzes} token={token} />}
        {view === 'take-quiz' && <TakeQuiz setView={setView} token={token} user={user} />}
        {view === 'results' && <QuizResults setView={setView} />}
      </main>
    </div>
  );
}

// Login Component
function Login({ setToken, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setView('home');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        <button type="submit" className="submit-btn">Login</button>
      </form>
      <p className="auth-link">
        Don't have an account? <button onClick={() => setView('register')}>Register</button>
      </p>
    </div>
  );
}

// Register Component
function Register({ setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setView('login'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="auth-form">
      <h2>Register</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Registration successful! Redirecting to login...</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            minLength="6"
          />
        </div>
        <button type="submit" className="submit-btn">Register</button>
      </form>
      <p className="auth-link">
        Already have an account? <button onClick={() => setView('login')}>Login</button>
      </p>
    </div>
  );
}

// Quiz List Component
function QuizList({ quizzes, setView, user }) {
  const handleTakeQuiz = (quizId) => {
    if (!user) {
      alert('Please login to take a quiz');
      return;
    }
    localStorage.setItem('currentQuizId', quizId);
    setView('take-quiz');
  };

  return (
    <div className="quiz-list">
      <h2>Available Quizzes</h2>
      {quizzes.length === 0 ? (
        <p>No quizzes available yet. {user?.is_admin && 'Create one in the Admin Panel!'}</p>
      ) : (
        <div className="quiz-grid">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="quiz-card">
              <h3>{quiz.title}</h3>
              <p>Created by: {quiz.creator || 'Admin'}</p>
              <p>Date: {new Date(quiz.created_at).toLocaleDateString()}</p>
              <button onClick={() => handleTakeQuiz(quiz.id)}>
                Take Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Panel Component
function AdminPanel({ onQuizCreated, token }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question_text: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '' }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { 
      question_text: '', 
      question_type: 'mcq', 
      options: ['', '', '', ''], 
      correct_answer: '' 
    }]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`${API_URL}/api/quizzes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, questions })
      });
      
      if (res.ok) {
        alert('Quiz created successfully!');
        setTitle('');
        setQuestions([{ question_text: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '' }]);
        onQuizCreated();
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to create quiz'));
      }
    } catch (err) {
      alert('Error creating quiz: ' + err.message);
    }
  };

  return (
    <div className="admin-panel">
      <h2>Create New Quiz</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Quiz Title:</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
        </div>

        {questions.map((q, qIdx) => (
          <div key={qIdx} className="question-block">
            <h4>Question {qIdx + 1}</h4>
            
            <div className="form-group">
              <label>Question Type:</label>
              <select 
                value={q.question_type} 
                onChange={(e) => updateQuestion(qIdx, 'question_type', e.target.value)}
              >
                <option value="mcq">Multiple Choice</option>
                <option value="tf">True/False</option>
                <option value="text">Text Answer</option>
              </select>
            </div>

            <div className="form-group">
              <label>Question Text:</label>
              <input 
                type="text" 
                value={q.question_text} 
                onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)} 
                required 
              />
            </div>

            {q.question_type === 'mcq' && (
              <div className="options-group">
                <label>Options:</label>
                {q.options.map((opt, oIdx) => (
                  <input 
                    key={oIdx}
                    type="text" 
                    placeholder={`Option ${oIdx + 1}`}
                    value={opt} 
                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} 
                    required 
                  />
                ))}
              </div>
            )}

            {q.question_type === 'tf' && (
              <div className="form-group">
                <p>Options: True / False</p>
              </div>
            )}

            <div className="form-group">
              <label>Correct Answer:</label>
              <input 
                type="text" 
                value={q.correct_answer} 
                onChange={(e) => updateQuestion(qIdx, 'correct_answer', e.target.value)} 
                placeholder={q.question_type === 'mcq' ? 'Enter exact option text' : 'Enter correct answer'}
                required 
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={addQuestion} className="add-question-btn">
          Add Another Question
        </button>
        
        <button type="submit" className="submit-btn">Create Quiz</button>
      </form>
    </div>
  );
}

// Take Quiz Component
function TakeQuiz({ setView, token, user }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const quizId = localStorage.getItem('currentQuizId');
    if (quizId) {
      fetchQuiz(quizId);
    }
  }, []);

  const fetchQuiz = async (quizId) => {
    try {
      const res = await fetch(`${API_URL}/api/quizzes/${quizId}`);
      const data = await res.json();
      setQuiz(data);
      setLoading(false);
    } catch (err) {
      alert('Error loading quiz');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      alert('Please login to submit quiz');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      
      const results = await res.json();
      localStorage.setItem('quizResults', JSON.stringify(results));
      setView('results');
    } catch (err) {
      alert('Error submitting quiz');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!quiz) return <div>Quiz not found</div>;

  return (
    <div className="take-quiz">
      <h2>{quiz.title}</h2>
      <form onSubmit={handleSubmit}>
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="question">
            <h3>Question {idx + 1}</h3>
            <p>{q.question_text}</p>

            {q.question_type === 'mcq' && (
              <div className="options">
                {q.options.map((opt, oIdx) => (
                  <label key={oIdx} className="option-label">
                    <input 
                      type="radio" 
                      name={`q${q.id}`}
                      value={opt}
                      onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                      required
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'truefalse' && (
              <div className="options">
                <label className="option-label">
                  <input 
                    type="radio" 
                    name={`q${q.id}`}
                    value="true"
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    required
                  />
                  True
                </label>
                <label className="option-label">
                  <input 
                    type="radio" 
                    name={`q${q.id}`}
                    value="false"
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    required
                  />
                  False
                </label>
              </div>
            )}

            {q.question_type === 'text' && (
              <input 
                type="text" 
                onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                required
              />
            )}
          </div>
        ))}
        
        <button type="submit" className="submit-btn">Submit Quiz</button>
      </form>
    </div>
  );
}

// Results Component
function QuizResults({ setView }) {
  const [results, setResults] = useState(null);

  useEffect(() => {
    const savedResults = localStorage.getItem('quizResults');
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  if (!results) return <div>No results found</div>;

  return (
    <div className="results">
      <h2>Quiz Results</h2>
      <div className="score-card">
        <h3>Your Score: {results.score} / {results.total}</h3>
        <p>Percentage: {results.percentage}%</p>
      </div>
      
      <button onClick={() => setView('home')} className="home-btn">
        Back to Home
      </button>
    </div>
  );
}

export default App;