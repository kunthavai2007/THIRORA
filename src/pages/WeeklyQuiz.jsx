import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readStorage, writeStorage, notifyDataChange } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'

const quizScoreStorageKey = 'quizScore'
const quizAttemptsStorageKey = 'quizAttempts'
const questionCount = 8

const questionBank = [
  { id: 'html-1', topic: 'HTML', difficulty: 'Easy', question: 'Which element is the highest-level heading?', options: ['<h6>', '<heading>', '<h1>', '<header>'], answer: '<h1>', explanation: '<h1> is the main heading for a page or section.' },
  { id: 'html-2', topic: 'HTML', difficulty: 'Medium', question: 'Which attribute provides alternative text for an image?', options: ['title', 'alt', 'src', 'label'], answer: 'alt', explanation: 'alt text describes an image for accessibility and failed loads.' },
  { id: 'css-1', topic: 'CSS', difficulty: 'Easy', question: 'Which property changes text color?', options: ['font-style', 'background-color', 'color', 'text-decoration'], answer: 'color', explanation: 'The color property controls foreground text color.' },
  { id: 'css-2', topic: 'CSS', difficulty: 'Medium', question: 'Which layout system handles two-dimensional rows and columns?', options: ['Flexbox', 'Grid', 'Float', 'Positioning'], answer: 'Grid', explanation: 'CSS Grid is designed for two-dimensional layouts.' },
  { id: 'css-3', topic: 'CSS', difficulty: 'Hard', question: 'When specificity is equal, which CSS rule wins?', options: ['The earlier rule', 'The later rule', 'The shorter rule', 'The rule with fewer properties'], answer: 'The later rule', explanation: 'The later declaration wins when cascade priority and specificity are equal.' },
  { id: 'js-1', topic: 'JavaScript', difficulty: 'Easy', question: 'What does a function provide?', options: ['Reusable instructions', 'Database tables', 'Page styles', 'Image compression'], answer: 'Reusable instructions', explanation: 'Functions package behavior that can be called with different inputs.' },
  { id: 'js-2', topic: 'JavaScript', difficulty: 'Medium', question: 'Which declaration prevents reassignment of a binding?', options: ['var', 'let', 'const', 'static'], answer: 'const', explanation: 'const prevents reassignment of the variable binding.' },
  { id: 'js-3', topic: 'JavaScript', difficulty: 'Hard', question: 'What does Promise.all do?', options: ['Resolves on the first result', 'Resolves when all fulfill or rejects when one rejects', 'Runs one promise', 'Converts promises to callbacks'], answer: 'Resolves when all fulfill or rejects when one rejects', explanation: 'Promise.all coordinates several promises and rejects if any input rejects.' },
  { id: 'python-1', topic: 'Python', difficulty: 'Easy', question: 'Which Python collection is ordered and mutable?', options: ['Tuple', 'List', 'Set', 'Frozen set'], answer: 'List', explanation: 'Lists preserve order and allow items to be changed.' },
  { id: 'python-2', topic: 'Python', difficulty: 'Medium', question: 'What does a list comprehension provide?', options: ['A concise way to build a list', 'A database connection', 'A class constructor', 'A package installer'], answer: 'A concise way to build a list', explanation: 'Comprehensions express mapping and filtering while creating a list.' },
  { id: 'python-3', topic: 'Python', difficulty: 'Hard', question: 'What is a key benefit of a generator?', options: ['Stores every value immediately', 'Evaluates values lazily', 'Disables iteration', 'Converts code to SQL'], answer: 'Evaluates values lazily', explanation: 'Generators produce values on demand and can reduce memory use.' },
  { id: 'sql-1', topic: 'SQL', difficulty: 'Easy', question: 'Which SQL statement reads rows from a table?', options: ['SELECT', 'READ', 'FETCH TABLE', 'OPEN'], answer: 'SELECT', explanation: 'SELECT queries data from tables or views.' },
  { id: 'sql-2', topic: 'SQL', difficulty: 'Medium', question: 'What does an INNER JOIN return?', options: ['All left rows', 'Rows matching in both tables', 'Only unmatched rows', 'A new database'], answer: 'Rows matching in both tables', explanation: 'INNER JOIN keeps records matching the join condition in both sources.' },
  { id: 'sql-3', topic: 'SQL', difficulty: 'Hard', question: 'What is a common index tradeoff?', options: ['Faster reads but more storage and write overhead', 'Slower reads with no storage use', 'Automatic validation', 'Removal of primary keys'], answer: 'Faster reads but more storage and write overhead', explanation: 'Indexes speed lookups but consume storage and must update on writes.' },
  { id: 'git-1', topic: 'Git', difficulty: 'Easy', question: 'Which Git command records staged changes?', options: ['git save', 'git commit', 'git record', 'git snapshot'], answer: 'git commit', explanation: 'git commit records staged changes in repository history.' },
  { id: 'git-2', topic: 'Git', difficulty: 'Medium', question: 'What is a Git branch used for?', options: ['Isolating lines of development', 'Compressing images', 'Installing packages', 'Hosting a database'], answer: 'Isolating lines of development', explanation: 'Branches allow independent feature or fix work before integration.' },
]

function shuffle(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

function buildQuiz() {
  const topics = [...new Set(questionBank.map((question) => question.topic))]
  const required = topics.map((topic) => shuffle(questionBank.filter((question) => question.topic === topic))[0])
  const remaining = questionBank.filter((question) => !required.some((item) => item.id === question.id))
  return shuffle([...required, ...shuffle(remaining).slice(0, questionCount - required.length)])
}

function summarizeAttempt(questions, responses) {
  const topicMap = {}
  questions.forEach((question) => {
    if (!topicMap[question.topic]) topicMap[question.topic] = { topic: question.topic, correct: 0, total: 0 }
    topicMap[question.topic].total += 1
    if (responses[question.id] === question.answer) topicMap[question.topic].correct += 1
  })
  const topicPerformance = Object.values(topicMap).map((topic) => ({
    ...topic,
    percentage: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
  }))
  const score = questions.reduce((total, question) => total + (responses[question.id] === question.answer ? 1 : 0), 0)
  return {
    completedAt: new Date().toISOString(),
    score,
    total: questions.length,
    percentage: questions.length ? Math.round((score / questions.length) * 100) : 0,
    topicPerformance,
    strongTopics: topicPerformance.filter((topic) => topic.percentage >= 70).map((topic) => topic.topic),
    weakTopics: topicPerformance.filter((topic) => topic.percentage < 70).map((topic) => topic.topic),
  }
}

function WeeklyQuiz() {
  const { careerContext } = useAuth()
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [responses, setResponses] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [attempts, setAttempts] = useState(() =>
    readStorage(quizAttemptsStorageKey, [], Array.isArray)
  )
  const [quizStartTime, setQuizStartTime] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadQuizAttemptsFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          if (isMounted && !session?.user) {
            setAttempts([])
            setAttempt(null)
            writeStorage(quizAttemptsStorageKey, [])
            writeStorage(quizScoreStorageKey, null)
          }
          return
        }

        const user = session.user

        const { data: attemptsData, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: true })

        if (attemptsError) {
          console.error('Error loading quiz attempts:', attemptsError)
          return
        }

        if (!isMounted) return

        if (!attemptsData || attemptsData.length === 0) {
          setAttempts([])
          setAttempt(null)
          writeStorage(quizAttemptsStorageKey, [])
          writeStorage(quizScoreStorageKey, null)
          return
        }

        const { data: topicData, error: topicError } = await supabase
          .from('quiz_topic_performance')
          .select('*')
          .eq('student_id', user.id)

        if (topicError) {
          console.error('Error loading topic performance:', topicError)
        }

        const topicMapByAttempt = {}
        ;(topicData || []).forEach((item) => {
          if (!topicMapByAttempt[item.attempt_id]) {
            topicMapByAttempt[item.attempt_id] = []
          }
          topicMapByAttempt[item.attempt_id].push({
            topic: item.topic,
            total: Number(item.total_questions) || 0,
            correct: Number(item.correct_answers) || 0,
            percentage: Number(item.percentage) || 0,
          })
        })

        const formattedAttempts = attemptsData.map((row) => {
          const topicPerformance = topicMapByAttempt[row.id] || []
          const score = Number(row.score) || 0
          const total = Number(row.total_questions) || 0
          const percentage = Number(row.percentage) || (total ? Math.round((score / total) * 100) : 0)

          return {
            id: row.id,
            completedAt: row.completed_at || row.created_at,
            score,
            total,
            percentage,
            timeTakenSeconds: row.time_taken_seconds || 0,
            quizWeek: row.quiz_week || 1,
            quizTitle: row.quiz_title || 'Weekly Assessment',
            topicPerformance,
            strongTopics: topicPerformance.filter((t) => t.percentage >= 70).map((t) => t.topic),
            weakTopics: topicPerformance.filter((t) => t.percentage < 70).map((t) => t.topic),
            student_id: row.student_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        })

        if (!isMounted) return

        setAttempts(formattedAttempts)
        const latestAttempt = formattedAttempts[formattedAttempts.length - 1]
        setAttempt(latestAttempt)

        writeStorage(quizAttemptsStorageKey, formattedAttempts)
        if (latestAttempt) {
          writeStorage(
            quizScoreStorageKey,
            latestAttempt.total ? Math.round((latestAttempt.score / latestAttempt.total) * 5) : 0
          )
        }
      } catch (error) {
        console.error('Unexpected error loading quiz attempts:', error)
      }
    }

    loadQuizAttemptsFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        loadQuizAttemptsFromSupabase()
      } else if (!session?.user && isMounted) {
        setAttempts([])
        setAttempt(null)
        writeStorage(quizAttemptsStorageKey, [])
        writeStorage(quizScoreStorageKey, null)
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(responses).length

  function startQuiz() {
    setQuestions(buildQuiz())
    setCurrentIndex(0)
    setSelectedAnswer('')
    setResponses({})
    setFeedback(null)
    setAttempt(null)
    setQuizStartTime(Date.now())
  }

  function handleAnswerSubmit(event) {
    event.preventDefault()
    if (!currentQuestion || !selectedAnswer || feedback) return
    setResponses((currentResponses) => ({ ...currentResponses, [currentQuestion.id]: selectedAnswer }))
    setFeedback({ correct: selectedAnswer === currentQuestion.answer, answer: currentQuestion.answer, explanation: currentQuestion.explanation })
  }

  async function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1)
      setSelectedAnswer('')
      setFeedback(null)
      return
    }

    const timeTaken = quizStartTime ? Math.max(1, Math.round((Date.now() - quizStartTime) / 1000)) : 0
    const completedAttempt = summarizeAttempt(questions, responses)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        const localAttempt = { id: Date.now(), ...completedAttempt, timeTakenSeconds: timeTaken }
        const updatedAttempts = [...attempts, localAttempt]
        setAttempt(localAttempt)
        setAttempts(updatedAttempts)
        writeStorage(quizAttemptsStorageKey, updatedAttempts)
        writeStorage(
          quizScoreStorageKey,
          completedAttempt.total ? Math.round((completedAttempt.score / completedAttempt.total) * 5) : 0
        )
        notifyDataChange('quiz-completed')
        return
      }

      const user = session.user

      // 1. Insert into public.quiz_attempts
      const { data: attemptRow, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          student_id: user.id,
          quiz_week: 1,
          quiz_title: 'Weekly Skill Assessment',
          total_questions: completedAttempt.total,
          correct_answers: completedAttempt.score,
          score: completedAttempt.score,
          percentage: completedAttempt.percentage,
          time_taken_seconds: timeTaken,
          completed_at: completedAttempt.completedAt,
        })
        .select('*')
        .single()

      if (attemptError) {
        console.error('Error saving quiz attempt:', attemptError)
        alert(attemptError.message || 'Failed to save quiz attempt to database.')
        return
      }

      const attemptId = attemptRow.id

      // 2. Insert into public.quiz_topic_performance
      if (completedAttempt.topicPerformance && completedAttempt.topicPerformance.length > 0) {
        const topicRows = completedAttempt.topicPerformance.map((t) => ({
          attempt_id: attemptId,
          student_id: user.id,
          topic: t.topic,
          total_questions: t.total,
          correct_answers: t.correct,
          percentage: t.percentage,
        }))

        const { error: topicError } = await supabase
          .from('quiz_topic_performance')
          .insert(topicRows)

        if (topicError) {
          console.error('Error saving quiz topic performance:', topicError)
        }
      }

      // 3. Insert into public.quiz_responses
      const responseRows = questions.map((q) => {
        const selAnswer = responses[q.id] || ''
        return {
          attempt_id: attemptId,
          student_id: user.id,
          question_id: q.id,
          topic: q.topic,
          difficulty: q.difficulty || 'Medium',
          question_text: q.question,
          selected_answer: selAnswer,
          correct_answer: q.answer,
          is_correct: selAnswer === q.answer,
          explanation: q.explanation || '',
        }
      })

      const { error: responsesError } = await supabase
        .from('quiz_responses')
        .insert(responseRows)

      if (responsesError) {
        console.error('Error saving quiz responses:', responsesError)
      }

      const savedAttempt = {
        ...completedAttempt,
        id: attemptId,
        student_id: user.id,
        timeTakenSeconds: timeTaken,
        quizWeek: 1,
        quizTitle: 'Weekly Skill Assessment',
        created_at: attemptRow.created_at,
        updated_at: attemptRow.updated_at,
      }

      const updatedAttempts = [...attempts, savedAttempt]
      setAttempt(savedAttempt)
      setAttempts(updatedAttempts)
      writeStorage(quizAttemptsStorageKey, updatedAttempts)
      writeStorage(
        quizScoreStorageKey,
        savedAttempt.total ? Math.round((savedAttempt.score / savedAttempt.total) * 5) : 0
      )
      notifyDataChange('quiz-completed')
    } catch (error) {
      console.error('Unexpected error submitting quiz:', error)
      alert('An unexpected error occurred while saving your quiz.')
    }
  }

  return (
    <main className="quiz-page">
      <div className="quiz-shell">
        <Link className="back-link" to="/"><span aria-hidden="true">&lt;-</span> Back to Dashboard</Link>
        <header className="quiz-header">
          <p className="eyebrow">Keep learning</p>
          <h1>Weekly Skill Quiz</h1>
          <p>
            Take an indicative learning assessment across the skills you are building. Use topic feedback to decide what to study next.
            {careerContext?.hasContext && careerContext?.track ? ` Calibrated to your ${careerContext.track} learning direction (${careerContext.sourceLabel}).` : ''}
          </p>
        </header>

        {!questions.length && !attempt && (
          <section className="quiz-empty-state" aria-labelledby="quiz-start-heading">
            <p className="quiz-result-label">
              {careerContext?.hasContext && careerContext?.track ? `Target Focus: ${careerContext.track}` : 'Skill assessment'}
            </p>
            <h2 id="quiz-start-heading">Ready for a focused check-in?</h2>
            <p>Questions are selected from HTML, CSS, JavaScript, Python, SQL, and Git across easy, medium, and hard difficulty.</p>
            <button className="submit-quiz-button" type="button" onClick={startQuiz}>Start Skill Assessment</button>
            {attempts.length === 0 && <span className="quiz-history-empty">No completed quiz attempts yet.</span>}
          </section>
        )}

        {questions.length > 0 && !attempt && (
          <form className="quiz-form quiz-single-question" onSubmit={handleAnswerSubmit}>
            <div className="quiz-form-heading">
              <div><p className="quiz-topic-label">{currentQuestion.topic} / {currentQuestion.difficulty}</p><h2>Question {currentIndex + 1} of {questions.length}</h2></div>
              <span>{Math.round((answeredCount / questions.length) * 100)}% complete</span>
            </div>
            <div className="quiz-progress-track"><div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div>
            <fieldset className="quiz-question">
              <legend><span className="question-number">{String(currentIndex + 1).padStart(2, '0')}</span>{currentQuestion.question}</legend>
              <div className="answer-options">
                {currentQuestion.options.map((option) => <label className={`answer-option${selectedAnswer === option ? ' answer-selected' : ''}`} key={option}><input type="radio" name="current-question" value={option} checked={selectedAnswer === option} onChange={() => setSelectedAnswer(option)} /><span>{option}</span></label>)}
              </div>
            </fieldset>
            {!feedback && <button className="submit-quiz-button" type="submit" disabled={!selectedAnswer}>Check Answer</button>}
            {feedback && <div className={`quiz-feedback ${feedback.correct ? 'quiz-feedback-correct' : 'quiz-feedback-incorrect'}`} role="status"><strong>{feedback.correct ? 'Correct' : 'Review this one'}</strong><p>Correct answer: {feedback.answer}</p><p>{feedback.explanation}</p><button className="submit-quiz-button" type="button" onClick={handleNext}>{currentIndex === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}</button></div>}
          </form>
        )}

        {attempt && (
          <>
            <section className="quiz-result quiz-summary" aria-live="polite">
              <p className="quiz-result-label">Indicative learning assessment</p>
              <h2>Your Score: {attempt.score} / {attempt.total}</h2>
              <p>Accuracy: {attempt.percentage}%</p>
              <p className="quiz-assessment-note">This result is a learning signal from this question set, not a definitive measure of your overall ability.</p>
              {attempt.topicPerformance && <div className="quiz-topic-summary"><div><span>Strong topics</span><strong>{attempt.strongTopics?.length ? attempt.strongTopics.join(', ') : 'Keep practicing across topics'}</strong></div><div><span>Topics to review</span><strong>{attempt.weakTopics?.length ? attempt.weakTopics.join(', ') : 'No immediate review gaps'}</strong></div></div>}
              <button className="try-again-button" type="button" onClick={startQuiz}>Take Another Assessment</button>
            </section>
            {attempt.topicPerformance && <section className="quiz-topic-performance" aria-labelledby="topic-performance-heading"><h2 id="topic-performance-heading">Topic-wise performance</h2><div className="topic-performance-grid">{attempt.topicPerformance.map((topic) => <div className="topic-performance-card" key={topic.topic}><span>{topic.topic}</span><strong>{topic.percentage}%</strong><small>{topic.correct} of {topic.total} correct</small></div>)}</div></section>}
            <section className="quiz-history" aria-labelledby="quiz-history-heading"><h2 id="quiz-history-heading">Quiz history</h2>{attempts.length ? attempts.slice().reverse().map((historyAttempt) => <div className="quiz-history-row" key={historyAttempt.id}><span>{new Date(historyAttempt.completedAt).toLocaleDateString()}</span><strong>{historyAttempt.score} / {historyAttempt.total}</strong><span>{historyAttempt.percentage}% accuracy</span></div>) : <p className="quiz-history-empty">Your completed attempts will appear here.</p>}</section>
          </>
        )}
      </div>
    </main>
  )
}

export default WeeklyQuiz
