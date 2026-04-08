import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  VideoCameraIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  FolderOpenIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  AcademicCapIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n/index.jsx";
import { openExternalUrl, saveOrOpenBlob } from "../../utils/mobileWeb";

function getEnrollmentCourseId(enrollment) {
  if (!enrollment) return null;
  const id = enrollment.class?.course_id ?? enrollment.course_id;
  return id != null ? Number(id) : null;
}

// ─── QuizResultModal ─────────────────────────────────────────────────────────
// Standalone component (outside StudentELearning) so it never unmounts unexpectedly
const QuizResultModal = ({ result, quiz, onClose }) => {
  const { t } = useI18n();
  const passed = result.passed;
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Score summary — neutre, lisible */}
        <div className="p-6 text-center border-b border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-200/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {passed ? t("elearning_quiz_passed") : t("elearning_quiz_failed")}
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">
            {result.score?.toFixed(1)}
            <span className="text-xl sm:text-2xl font-semibold text-gray-500 dark:text-gray-400">
              /{quiz.total_points}
            </span>
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
            {result.correct_count}/{result.total_questions}{" "}
            {t("elearning_correct_answers")}
          </p>
        </div>

        {/* Answer Review */}
        {result.answers?.length > 0 && (
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
              {t("elearning_answer_review")}
            </p>
            {result.answers.map((a, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border ${
                  a.is_correct
                    ? "border-gray-200 bg-white dark:bg-dark-200/50 dark:border-dark-100"
                    : "border-gray-300 bg-gray-50/80 dark:bg-dark-200/70 dark:border-dark-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  {a.is_correct ? (
                    <CheckCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Q{i + 1}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{t("elearning_your_answer")}:</span>{" "}
                      <span className="text-gray-900 dark:text-gray-100">
                        {a.your_answer ?? (
                          <em className="text-gray-400">{t("elearning_no_answer")}</em>
                        )}
                      </span>
                    </p>
                    {!a.is_correct && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">{t("elearning_correct_answer")}:</span>{" "}
                        <span className="text-gray-800 dark:text-gray-200">
                          {Array.isArray(a.correct_answer)
                            ? a.correct_answer[0]
                            : a.correct_answer}
                        </span>
                      </p>
                    )}
                    {a.explanation && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 italic">
                        {a.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-dark-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            {t("close")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── QuizModal ───────────────────────────────────────────────────────────────
// Standalone component (outside StudentELearning).
// CRITICAL: must be outside the parent so it doesn't unmount/remount when
// the parent re-renders (e.g. when quizAnswers state changes).
const QuizModal = ({ activeQuiz, onFinish }) => {
  const { t } = useI18n();
  const [quizAnswers, setQuizAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(activeQuiz.quiz.duration_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Refs so callbacks always have latest values without stale closures
  const answersRef = useRef({});
  const isSubmittingRef = useRef(false);

  const submitQuizFn = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await api.post(
        `/elearning/quizzes/attempt/${activeQuiz.attempt_id}/submit`,
        { answers: answersRef.current },
      );
      // Pass result up to parent — QuizModal does NOT render the result itself.
      // This prevents the blank-page crash that occurred when activeQuiz became
      // null during AnimatePresence exit while QuizModal still tried to render
      // QuizResultModal with activeQuiz.quiz.
      onFinish(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || t("error"));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Countdown timer using setTimeout chain — avoids calling async fn inside
  // a setState updater (which must be pure/synchronous).
  useEffect(() => {
    if (timeLeft <= 0) {
      submitQuizFn();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleAnswer = (questionId, answer) => {
    answersRef.current = { ...answersRef.current, [questionId]: answer };
    setQuizAnswers({ ...answersRef.current });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const question = activeQuiz.questions[currentQuestion];
  const answeredCount = Object.keys(quizAnswers).length;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-3xl overflow-hidden"
      >
        {/* Quiz Header */}
        <div className="bg-gray-800 dark:bg-dark-100 text-white p-4 border-b border-gray-700/50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">{activeQuiz.quiz.title}</h2>
              <p className="text-sm opacity-80">
                {currentQuestion + 1} / {activeQuiz.questions.length}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-3xl font-bold font-mono ${timeLeft < 60 ? "text-amber-200/90 animate-pulse" : ""}`}
              >
                {formatTime(timeLeft)}
              </div>
              <p className="text-sm opacity-80">{t("elearning_time_remaining")}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 dark:bg-dark-100">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{
              width: `${((currentQuestion + 1) / activeQuiz.questions.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="p-6">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-3">
              {question.points} pt{question.points > 1 ? "s" : ""}
            </span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {question.question}
            </h3>
          </div>

          <div className="space-y-3">
            {question.type === "multiple_choice" &&
              question.options?.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    quizAnswers[question.id] === option
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-dark-100 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={quizAnswers[question.id] === option}
                    onChange={() => handleAnswer(question.id, option)}
                    className="w-5 h-5 text-primary-500"
                  />
                  <span className="text-gray-900 dark:text-white">{option}</span>
                </label>
              ))}

            {question.type === "true_false" && (
              <div className="flex gap-4">
                {["vrai", "faux"].map((option) => (
                  <label
                    key={option}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      quizAnswers[question.id] === option
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-dark-100 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={quizAnswers[question.id] === option}
                      onChange={() => handleAnswer(question.id, option)}
                      className="w-5 h-5 text-primary-500"
                    />
                    <span className="text-gray-900 dark:text-white font-medium capitalize">
                      {option === "vrai" ? t("elearning_true") : t("elearning_false")}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {question.type === "short_answer" && (
              <input
                type="text"
                value={quizAnswers[question.id] || ""}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder={t("elearning_your_answer")}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-dark-100 bg-transparent text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="px-6 pb-4">
          <p className="text-sm text-gray-500 mb-2">{t("elearning_question_navigation")}</p>
          <div className="flex flex-wrap gap-2">
            {activeQuiz.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  currentQuestion === i
                    ? "bg-primary-500 text-white"
                    : quizAnswers[activeQuiz.questions[i].id]
                      ? "bg-gray-600 text-white dark:bg-gray-500"
                      : "bg-gray-200 dark:bg-dark-100 text-gray-600 dark:text-gray-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {answeredCount} / {activeQuiz.questions.length} {t("elearning_questions_answered")}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-100 flex justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50"
          >
            {t("previous")}
          </button>
          {currentQuestion === activeQuiz.questions.length - 1 ? (
            <button
              onClick={submitQuizFn}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "..." : t("elearning_submit_quiz")}
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentQuestion(
                  Math.min(activeQuiz.questions.length - 1, currentQuestion + 1),
                )
              }
              className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              {t("next")}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentELearning = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("courses");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["courses"]));
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [onlineCourses, setOnlineCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  // quizResult: { result, quiz } — set after quiz submission; drives QuizResultModal
  const [quizResult, setQuizResult] = useState(null);
  // completedResults: { [quizId]: resultData } — persists within the session
  const [completedResults, setCompletedResults] = useState({});
  const [showSubmissionModal, setShowSubmissionModal] = useState(null);
  const [showViewSubmissionModal, setShowViewSubmissionModal] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const statusRef = useRef({});

  useEffect(() => {
    if (user) fetchData();
  }, [user?.id]);

  // Tick every 30 seconds so isQuizAvailable re-evaluates when time passes
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const refreshOnlineCourses = useCallback(async () => {
    try {
      const onlineRes = await api.get("/elearning/courses/student");
      setOnlineCourses(onlineRes.data.courses || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!user?.student?.id) return;
    const timer = setInterval(() => {
      refreshOnlineCourses();
    }, 5000);
    return () => clearInterval(timer);
  }, [user?.student?.id, refreshOnlineCourses]);

  useEffect(() => {
    const selectedCourseId = getEnrollmentCourseId(selectedCourse);
    const prev = statusRef.current;
    for (const c of onlineCourses) {
      const old = prev[c.id];
      const relevant =
        selectedCourseId == null || Number(c.course_id) === Number(selectedCourseId);
      if (relevant && old !== undefined && old !== c.status) {
        if (c.status === "live") {
          toast.success(t("elearning_live_now_toast"));
        }
        if (old === "live" && c.status === "ended") {
          toast(t("elearning_session_ended_toast"));
        }
      }
    }
    const next = { ...prev };
    for (const c of onlineCourses) {
      next[c.id] = c.status;
    }
    statusRef.current = next;
  }, [onlineCourses, selectedCourse, t]);

  // Reset visited tabs when selected course changes
  useEffect(() => {
    setVisitedTabs(new Set(["courses"]));
    setActiveTab("courses");
  }, [selectedCourse?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const onlineRes = await api.get("/elearning/courses/student");
      setOnlineCourses(onlineRes.data.courses || []);

      if (user?.student?.id) {
        try {
          const enrolledRes = await api.get(`/students/${user.student.id}/courses`);
          setEnrolledCourses(enrolledRes.data.data || []);
        } catch (e) {
          setEnrolledCourses([]);
        }
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaterials = async (courseId) => {
    try {
      const response = await api.get(`/elearning/materials/course/${courseId}`);
      setMaterials(response.data.materials || []);
    } catch (error) {
      setMaterials([]);
    }
  };

  const fetchQuizzes = async (courseId) => {
    try {
      const response = await api.get(`/elearning/quizzes/course/${courseId}`);
      const list = response.data.quizzes || [];
      setQuizzes(list);

      // Schedule a re-fetch when a quiz becomes available within the next hour
      list
        .filter(
          (q) =>
            q.available_from &&
            new Date(q.available_from) > new Date() &&
            q.status === "published",
        )
        .forEach((q) => {
          const ms = new Date(q.available_from) - Date.now();
          if (ms < 3_600_000) setTimeout(() => fetchQuizzes(courseId), ms + 500);
        });
    } catch (error) {
      setQuizzes([]);
    }
  };

  const fetchAssignments = async (courseId) => {
    try {
      const response = await api.get(`/elearning/assignments/course/${courseId}`);
      setAssignments(response.data.assignments || []);
    } catch (error) {
      setAssignments([]);
    }
  };

  const handleCourseChange = (enrollmentIdStr) => {
    if (!enrollmentIdStr) {
      setSelectedEnrollmentId("");
      setSelectedCourse(null);
      return;
    }
    const enrollment = enrolledCourses.find(
      (e) => String(e.id) === String(enrollmentIdStr),
    );
    setSelectedEnrollmentId(String(enrollmentIdStr));
    setSelectedCourse(enrollment || null);
    const cid = enrollment ? getEnrollmentCourseId(enrollment) : null;
    if (cid) {
      fetchMaterials(cid);
      fetchQuizzes(cid);
      fetchAssignments(cid);
    }
  };

  const joinCourse = async (courseId) => {
    try {
      const response = await api.post(`/elearning/courses/${courseId}/join`);
      const meetingUrl = response.data?.meeting_url;
      if (!meetingUrl) {
        toast.error(t("elearning_no_meeting_link"));
        return;
      }
      if (openExternalUrl(meetingUrl)) {
        toast.success(t("joining_live_course"));
      } else {
        toast.error(t("error"));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t("error"));
    }
  };

  const downloadMaterial = async (materialId, fileName) => {
    try {
      const response = await api.get(`/elearning/materials/${materialId}/download`, {
        responseType: "blob",
      });
      const mime =
        response.headers?.["content-type"]?.split(";")[0]?.trim() ||
        "application/octet-stream";
      saveOrOpenBlob(response.data, fileName || "document", mime);
      toast.success(t("download_started"));
    } catch (error) {
      toast.error(t("error"));
    }
  };

  const downloadSubmissionFile = async (submissionId, fileName) => {
    try {
      const response = await api.get(
        `/elearning/assignments/submission/${submissionId}/download`,
        { responseType: "blob" },
      );
      const mime =
        response.headers?.["content-type"]?.split(";")[0]?.trim() ||
        "application/octet-stream";
      saveOrOpenBlob(response.data, fileName || "remise", mime);
      toast.success(t("download_started"));
    } catch {
      toast.error(t("error"));
    }
  };

  const startQuiz = async (quizId) => {
    try {
      const response = await api.post(`/elearning/quizzes/${quizId}/start`);
      setActiveQuiz({ ...response.data, quizId });
    } catch (error) {
      toast.error(error.response?.data?.error || t("error"));
    }
  };

  const onQuizFinish = (resultData) => {
    // Capture quiz info before clearing activeQuiz (setState is async)
    const finishedQuiz = activeQuiz?.quiz;
    const quizId = activeQuiz?.quizId;

    setActiveQuiz(null);

    if (resultData && finishedQuiz) {
      // Show the result modal independently (not nested inside QuizModal)
      setQuizResult({ result: resultData, quiz: finishedQuiz });
      // Remember result for "View Grades" button within this session
      if (quizId) {
        setCompletedResults((prev) => ({ ...prev, [quizId]: resultData }));
      }
    }

    const courseId = getEnrollmentCourseId(selectedCourse);
    if (courseId) fetchQuizzes(courseId);
  };

  // Compute quiz availability client-side using live `now` state (updates every 30s)
  const isQuizAvailable = (quiz) => {
    if ((quiz.my_attempts || 0) >= quiz.max_attempts) return false;
    if (quiz.status !== "published") return false;
    if (quiz.available_from && new Date(quiz.available_from) > now) return false;
    if (quiz.available_until && new Date(quiz.available_until) < now) return false;
    return true;
  };

  const tabs = [
    {
      id: "courses",
      name: t("elearning_courses"),
      icon: VideoCameraIcon,
      count: onlineCourses.length,
    },
    {
      id: "materials",
      name: t("elearning_documents"),
      icon: DocumentTextIcon,
      count: materials.length,
    },
    {
      id: "quizzes",
      name: t("elearning_quizzes"),
      icon: ClipboardDocumentListIcon,
      count: quizzes.length,
    },
    {
      id: "assignments",
      name: t("elearning_assignments"),
      icon: FolderOpenIcon,
      count: assignments.length,
    },
  ];

  // ─── Assignment Submission Modal ─────────────────────────────────────────
  const SubmissionModal = ({ assignment }) => {
    const fileInputRef = useRef(null);
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!content && !file) {
        toast.error(t("add_content_or_file"));
        return;
      }
      setIsSubmitting(true);
      const formData = new FormData();
      if (content) formData.append("content", content);
      if (file) formData.append("file", file);
      try {
        await api.post(`/elearning/assignments/${assignment.id}/submit`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(t("assignment_submitted"));
        setShowSubmissionModal(null);
        const cid = getEnrollmentCourseId(selectedCourse);
        if (cid) fetchAssignments(cid);
      } catch (error) {
        toast.error(error.response?.data?.error || t("error"));
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="p-5 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("elearning_submit_assignment")}
              </h2>
              <p className="text-sm text-gray-500">{assignment.title}</p>
            </div>
            <button
              onClick={() => setShowSubmissionModal(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {assignment.description && (
              <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t("elearning_instructions")}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{assignment.description}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("elearning_comment_answer")}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder={t("elearning_write_answer_here")}
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("elearning_file_optional")}
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-dark-100 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <DocumentTextIcon className="w-8 h-8 text-primary-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">{t("elearning_click_select_file")}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t("elearning_accepted_types")}{" "}
                      {assignment.allowed_file_types?.join(", ") || "pdf, doc, docx"} (max{" "}
                      {assignment.max_file_size_mb || 10}MB)
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                accept={
                  assignment.allowed_file_types?.map((ext) => `.${ext}`).join(",") ||
                  ".pdf,.doc,.docx"
                }
                className="hidden"
              />
            </div>

            {assignment.is_overdue && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">
                  {t("elearning_late_warning")} {assignment.late_penalty_percent}%
                </span>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-200 dark:border-dark-100 flex gap-3">
            <button
              onClick={() => setShowSubmissionModal(null)}
              className="flex-1 py-3 bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content && !file)}
              className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              {isSubmitting ? t("submitting") : t("elearning_submit")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="text-center py-12 bg-gray-50 dark:bg-dark-200 rounded-xl">
      <Icon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("elearning_title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t("elearning_subtitle")}</p>
      </motion.div>

      {/* Course Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("elearning_select_course_label")}
        </label>
        <select
          value={selectedEnrollmentId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full p-3 rounded-xl bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
        >
          <option value="">{t("elearning_select_course_option")}</option>
          {enrolledCourses.map((enrollment) => (
            <option key={enrollment.id} value={String(enrollment.id)}>
              {enrollment.class?.course?.name || enrollment.course?.name || t("course")}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-dark-200 p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setVisitedTabs(prev => new Set([...prev, tab.id])) }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white dark:bg-dark-300 text-primary-600 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.name}</span>
            {tab.count > 0 && !visitedTabs.has(tab.id) && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {/* Online Courses */}
        {activeTab === "courses" &&
          (() => {
            const selectedCourseId = getEnrollmentCourseId(selectedCourse);
            const filteredOnlineCourses = selectedCourseId
              ? onlineCourses.filter((c) => Number(c.course_id) === Number(selectedCourseId))
              : onlineCourses;
            return (
              <div className="space-y-4">
                {!selectedCourse ? (
                  <EmptyState
                    icon={VideoCameraIcon}
                    title={t("elearning_no_course_selected")}
                    description={t("elearning_no_course_courses_desc")}
                  />
                ) : isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-48 bg-gray-100 dark:bg-dark-200 rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredOnlineCourses.length === 0 ? (
                  <EmptyState
                    icon={VideoCameraIcon}
                    title={t("elearning_no_online_courses")}
                    description={t("elearning_no_online_courses_desc")}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredOnlineCourses.map((course) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className={`p-3 rounded-xl border border-gray-200/80 dark:border-dark-100 ${course.status === "live" ? "bg-gray-100 dark:bg-dark-200 text-gray-800 dark:text-gray-200" : "bg-gray-50 dark:bg-dark-200/80 text-gray-700 dark:text-gray-300"}`}
                          >
                            {course.status === "live" ? (
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                                <VideoCameraIcon className="w-5 h-5" />
                              </div>
                            ) : (
                              <PlayIcon className="w-5 h-5" />
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium px-3 py-1 rounded-full border border-gray-200 dark:border-dark-100 ${
                              course.status === "scheduled"
                                ? "bg-gray-50 text-gray-700 dark:bg-dark-200 dark:text-gray-300"
                                : course.status === "live"
                                  ? "bg-primary-500/10 text-gray-800 dark:text-gray-200"
                                  : "bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400"
                            }`}
                          >
                            {course.status === "scheduled"
                              ? t("elearning_scheduled")
                              : course.status === "live"
                                ? t("elearning_live_badge")
                                : t("elearning_ended")}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-lg">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {course.course?.name}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                          Prof. {course.teacher?.user?.first_name}{" "}
                          {course.teacher?.user?.last_name}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {course.duration_minutes} min
                          </span>
                          {course.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {new Date(course.scheduled_at).toLocaleString(undefined, {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>

                        {course.status === "live" && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => joinCourse(course.id)}
                            className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <VideoCameraIcon className="w-5 h-5" />
                            {t("elearning_join_course")}
                          </motion.button>
                        )}
                        {course.status === "scheduled" && (() => {
                          const start = course.scheduled_at
                            ? new Date(course.scheduled_at)
                            : null;
                          const past = start && start <= new Date();
                          return (
                            <div
                              className={`w-full py-3 rounded-xl text-center font-medium ${
                                past
                                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
                                  : "bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {past
                                ? t("elearning_waiting_teacher_start")
                                : t("elearning_starts_soon")}
                            </div>
                          );
                        })()}
                        {course.status === "ended" && course.recording_url && (
                          <button className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                            <PlayIcon className="w-5 h-5" />
                            {t("elearning_view_recording")}
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        {/* Materials */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            {!selectedCourse ? (
              <EmptyState
                icon={DocumentTextIcon}
                title={t("elearning_no_course_selected")}
                description={t("elearning_no_course_docs_desc")}
              />
            ) : materials.length === 0 ? (
              <EmptyState
                icon={DocumentTextIcon}
                title={t("elearning_no_documents")}
                description={t("elearning_no_documents_desc")}
              />
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-white dark:bg-dark-200 rounded-xl shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {material.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {material.type} •{" "}
                          {material.file_size
                            ? `${(material.file_size / (1024 * 1024)).toFixed(2)} MB`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {material.external_url ? (
                        <button
                          onClick={() => openExternalUrl(material.external_url)}
                          className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                      ) : material.downloadable ? (
                        <button
                          onClick={() =>
                            downloadMaterial(material.id, material.file_name)
                          }
                          className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quizzes */}
        {activeTab === "quizzes" && (
          <div className="space-y-4">
            {!selectedCourse ? (
              <EmptyState
                icon={ClipboardDocumentListIcon}
                title={t("elearning_no_course_selected")}
                description={t("elearning_no_course_quizzes_desc")}
              />
            ) : quizzes.length === 0 ? (
              <EmptyState
                icon={ClipboardDocumentListIcon}
                title={t("elearning_no_quizzes")}
                description={t("elearning_no_quizzes_desc")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((quiz) => {
                  const canAttempt = isQuizAvailable(quiz);
                  return (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        {quiz.my_attempts > 0 && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full border border-gray-200 dark:border-dark-100 bg-gray-50 text-gray-700 dark:bg-dark-200 dark:text-gray-300">
                            {t("elearning_score")}: {quiz.best_score?.toFixed(1)}/
                            {quiz.total_points}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {quiz.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {quiz.questions?.length || 0} {t("elearning_questions")} •{" "}
                        {quiz.duration_minutes} min
                      </p>

                      {/* Availability window */}
                      {(quiz.available_from || quiz.available_until) && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-2 bg-gray-50 dark:bg-dark-300 px-2 py-1.5 rounded-lg">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {quiz.available_from
                              ? new Date(quiz.available_from).toLocaleString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "…"}
                            {" → "}
                            {quiz.available_until
                              ? new Date(quiz.available_until).toLocaleString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "…"}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span>
                          <AcademicCapIcon className="w-4 h-4 inline mr-1" />
                          {quiz.total_points} pts
                        </span>
                        <span>
                          {t("elearning_attempts_label")}: {quiz.my_attempts || 0}/
                          {quiz.max_attempts}
                        </span>
                      </div>

                      {canAttempt ? (
                        <button
                          onClick={() => startQuiz(quiz.id)}
                          className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                          {quiz.my_attempts > 0
                            ? t("elearning_retry")
                            : t("elearning_start_quiz")}
                        </button>
                      ) : (
                        <div className="w-full py-2 bg-gray-100 dark:bg-dark-200 text-gray-500 rounded-lg text-sm font-medium text-center">
                          {(quiz.my_attempts || 0) >= quiz.max_attempts
                            ? t("elearning_attempts_exhausted")
                            : t("elearning_not_available")}
                        </div>
                      )}
                      {/* View Grades button — visible after completing quiz in this session */}
                      {completedResults[quiz.id] && (
                        <button
                          onClick={() =>
                            setQuizResult({
                              result: completedResults[quiz.id],
                              quiz: {
                                title: quiz.title,
                                total_points: quiz.total_points,
                              },
                            })
                          }
                          className="w-full py-2 mt-2 border border-primary-500 text-primary-500 rounded-lg text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          {t("view_results")}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Assignments */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            {!selectedCourse ? (
              <EmptyState
                icon={FolderOpenIcon}
                title={t("elearning_no_course_selected")}
                description={t("elearning_no_course_assignments_desc")}
              />
            ) : assignments.length === 0 ? (
              <EmptyState
                icon={FolderOpenIcon}
                title={t("elearning_no_assignments")}
                description={t("elearning_no_assignments_desc")}
              />
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const isOverdue = assignment.is_overdue;
                  const hasSubmitted = assignment.my_submission;
                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className={`p-3 rounded-xl border border-gray-200/80 dark:border-dark-100 ${
                              hasSubmitted
                                ? "bg-gray-50 dark:bg-dark-200/50"
                                : isOverdue
                                  ? "bg-gray-100 dark:bg-dark-200/70"
                                  : "bg-gray-50 dark:bg-dark-200/50"
                            }`}
                          >
                            {hasSubmitted ? (
                              <CheckCircleIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            ) : isOverdue ? (
                              <ExclamationTriangleIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <FolderOpenIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {assignment.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              <span className="text-gray-500">
                                <AcademicCapIcon className="w-4 h-4 inline mr-1" />
                                {assignment.total_points} pts
                              </span>
                              <span
                                className={
                                  isOverdue && !hasSubmitted
                                    ? "text-gray-700 dark:text-gray-300 font-medium"
                                    : "text-gray-500"
                                }
                              >
                                <CalendarIcon className="w-4 h-4 inline mr-1" />
                                {new Date(assignment.due_date).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {hasSubmitted && (
                                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                  <CheckCircleIcon className="w-4 h-4" />
                                  {t("elearning_submitted")}
                                  {hasSubmitted.grade !== null &&
                                    ` - ${t("elearning_grade")}: ${hasSubmitted.grade}/${assignment.total_points}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {assignment.can_submit ? (
                            <button
                              onClick={() => setShowSubmissionModal(assignment)}
                              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                            >
                              {hasSubmitted
                                ? t("elearning_resubmit")
                                : t("elearning_submit")}
                            </button>
                          ) : hasSubmitted ? (
                            <button
                              onClick={() => setShowViewSubmissionModal({ assignment, submission: hasSubmitted })}
                              className="px-4 py-2 bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
                            >
                              {t("elearning_view_submission")}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {t("elearning_deadline_passed")}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {activeQuiz && <QuizModal activeQuiz={activeQuiz} onFinish={onQuizFinish} />}

      {/* Quiz Result Modal — rendered at parent level so it's never inside QuizModal
          during AnimatePresence exit, which was causing the blank-page crash */}
      {quizResult && (
        <QuizResultModal
          result={quizResult.result}
          quiz={quizResult.quiz}
          onClose={() => setQuizResult(null)}
        />
      )}

      {/* View Submission Modal */}
      <AnimatePresence>
        {showViewSubmissionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-5 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{showViewSubmissionModal.assignment.title}</h2>
                  <p className="text-sm text-gray-500">{showViewSubmissionModal.assignment.total_points} pts</p>
                </div>
                <button onClick={() => setShowViewSubmissionModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Assignment description */}
                <div className="p-4 bg-gray-50 dark:bg-dark-200 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t("elearning_instructions")}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{showViewSubmissionModal.assignment.description}</p>
                </div>
                {/* Submission content */}
                {showViewSubmissionModal.submission?.content && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t("elearning_my_answer")}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">{showViewSubmissionModal.submission.content}</p>
                  </div>
                )}
                {/* File */}
                {showViewSubmissionModal.submission?.file_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-200 rounded-xl">
                      <DocumentTextIcon className="w-6 h-6 text-primary-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 break-all">
                        {showViewSubmissionModal.submission.file_name}
                      </span>
                    </div>
                    {showViewSubmissionModal.submission?.id != null && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadSubmissionFile(
                            showViewSubmissionModal.submission.id,
                            showViewSubmissionModal.submission.file_name,
                          )
                        }
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        {t("elearning_download_file")}
                      </button>
                    )}
                  </div>
                )}
                {/* Grade & feedback */}
                {showViewSubmissionModal.submission?.grade !== null && showViewSubmissionModal.submission?.grade !== undefined && (
                  <div className="p-4 bg-gray-50 dark:bg-dark-200/80 rounded-xl border border-gray-200 dark:border-dark-100">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t("elearning_grade")}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{showViewSubmissionModal.submission.grade} / {showViewSubmissionModal.assignment.total_points}</p>
                    {showViewSubmissionModal.submission?.feedback && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{showViewSubmissionModal.submission.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Modal */}
      <AnimatePresence>
        {showSubmissionModal && <SubmissionModal assignment={showSubmissionModal} />}
      </AnimatePresence>
    </div>
  );
};

export default StudentELearning;
