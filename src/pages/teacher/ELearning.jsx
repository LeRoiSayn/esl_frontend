import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  VideoCameraIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  FolderPlusIcon,
  PlusIcon,
  PlayIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  AcademicCapIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useI18n } from "../../i18n/index.jsx";
import { toDatetimeLocalValue, datetimeLocalToIsoUtc } from "../../utils/datetimeLocal";
import {
  openReportAsync,
  buildOnlineCourseAttendanceReportBody,
} from "../../utils/reportPrint";

const ELearning = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("courses");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["courses"]));
  const [myCourses, setMyCourses] = useState([]);
  const [onlineCourses, setOnlineCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [sessionReportLoadingId, setSessionReportLoadingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, onlineCoursesRes] = await Promise.all([
        api.get("/elearning/teacher/classes"),
        api.get("/elearning/courses/teacher"),
      ]);
      const classesPayload = classesRes.data?.classes ?? classesRes.data;
      const safeClasses = Array.isArray(classesPayload) ? classesPayload : [];
      setMyCourses(safeClasses);
      const onlinePayload =
        onlineCoursesRes.data?.courses ?? onlineCoursesRes.data;
      setOnlineCourses(Array.isArray(onlinePayload) ? onlinePayload : []);
    } catch (_) {
      try {
        const coursesRes = await api.get("/courses");
        const fallbackPayload = coursesRes.data?.data ?? coursesRes.data;
        setMyCourses(Array.isArray(fallbackPayload) ? fallbackPayload : []);
      } catch (_e) {
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaterials = async (courseId) => {
    try {
      const response = await api.get(`/elearning/materials/course/${courseId}`);
      setMaterials(response.data.materials || []);
    } catch (_) {
      setMaterials([]);
    }
  };

  const fetchQuizzes = async (courseId) => {
    try {
      const response = await api.get(`/elearning/quizzes/course/${courseId}`);
      setQuizzes(response.data.quizzes || []);
    } catch (_) {
      setQuizzes([]);
    }
  };

  const fetchAssignments = async (courseId) => {
    try {
      const response = await api.get(
        `/elearning/assignments/course/${courseId}`,
      );
      setAssignments(response.data.assignments || []);
    } catch (_) {
      setAssignments([]);
    }
  };

  const handleCourseChange = (courseId) => {
    const course = Array.isArray(myCourses)
      ? myCourses.find((c) => (c.course_id || c.id) === parseInt(courseId))
      : undefined;
    setSelectedCourse(course);
    setVisitedTabs(new Set(["courses"]));
    setActiveTab("courses");
    if (courseId) {
      if (activeTab === "materials") fetchMaterials(courseId);
      if (activeTab === "quizzes") fetchQuizzes(courseId);
      if (activeTab === "assignments") fetchAssignments(courseId);
    }
  };

  const startCourse = async (id) => {
    try {
      const res = await api.post(`/elearning/courses/${id}/start`);
      const updated = res.data.course;
      setOnlineCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated, status: "live" } : c))
      );
      if (res.data.meeting_url) {
        window.open(res.data.meeting_url, "_blank", "noopener,noreferrer");
      }
      toast.success(t('session_started'));
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const endCourse = async (id) => {
    try {
      const res = await api.post(`/elearning/courses/${id}/end`);
      const updated = res.data.course;
      setOnlineCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated, status: "ended" } : c))
      );
      toast.success(t('session_ended'));
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const handleUpdateCourse = async (id, data) => {
    try {
      const res = await api.put(`/elearning/courses/${id}`, data);
      const updated = res.data.course;
      setOnlineCourses((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
      setEditingCourse(null);
      toast.success(t('item_updated'));
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const deleteMaterial = async (id) => {
    if (!confirm("Supprimer ce document?")) return;
    try {
      await api.delete(`/elearning/materials/${id}`);
      toast.success(t('item_deleted'));
      fetchMaterials(selectedCourse?.course_id || selectedCourse?.id);
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const publishQuiz = async (id) => {
    try {
      await api.post(`/elearning/quizzes/${id}/publish`);
      toast.success(t('quiz_published'));
      fetchQuizzes(selectedCourse?.course_id || selectedCourse?.id);
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const deleteQuiz = async (id) => {
    if (!confirm("Supprimer ce quiz et toutes les tentatives?")) return;
    try {
      await api.delete(`/elearning/quizzes/${id}`);
      toast.success(t('quiz_deleted'));
      fetchQuizzes(selectedCourse?.course_id || selectedCourse?.id);
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const publishAssignment = async (id) => {
    try {
      await api.post(`/elearning/assignments/${id}/publish`);
      toast.success(t('assignment_published'));
      fetchAssignments(selectedCourse?.course_id || selectedCourse?.id);
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const deleteAssignment = async (id) => {
    if (!confirm("Supprimer ce devoir et toutes les soumissions?")) return;
    try {
      await api.delete(`/elearning/assignments/${id}`);
      toast.success(t('assignment_deleted'));
      fetchAssignments(selectedCourse?.course_id || selectedCourse?.id);
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const tabs = [
    {
      id: "courses",
      name: "Cours en Ligne",
      icon: VideoCameraIcon,
      count: onlineCourses.length,
    },
    {
      id: "materials",
      name: "Documents",
      icon: DocumentTextIcon,
      count: materials.length,
    },
    {
      id: "quizzes",
      name: "Quiz",
      icon: ClipboardDocumentListIcon,
      count: quizzes.length,
    },
    {
      id: "assignments",
      name: "Devoirs",
      icon: FolderPlusIcon,
      count: assignments.length,
    },
  ];

  // ==================== MODALS ====================

  const Modal = ({ title, onClose, children, size = "md" }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`bg-white dark:bg-dark-300 rounded-2xl w-full overflow-hidden ${
          size === "lg" ? "max-w-3xl" : size === "xl" ? "max-w-5xl" : "max-w-lg"
        }`}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-dark-100">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );

  const CreateOnlineCourseModal = () => {
    const [formData, setFormData] = useState({
      class_id: "",
      title: "",
      description: "",
      external_url: "",
      scheduled_at: "",
      duration_minutes: 60,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await api.post("/elearning/courses", {
          class_id: formData.class_id,
          title: formData.title,
          description: formData.description,
          external_url: formData.external_url,
          scheduled_at: datetimeLocalToIsoUtc(formData.scheduled_at),
          duration_minutes: formData.duration_minutes || 60,
        });
        toast.success(t('course_online_created'));
        setShowModal(null);
        fetchData();
      } catch (error) {
        toast.error(
          error.response?.data?.message || t('error'),
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal title="Créer un Cours en Ligne" onClose={() => setShowModal(null)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Classe</label>
            <select
              value={formData.class_id}
              onChange={(e) =>
                setFormData({ ...formData, class_id: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Sélectionner une classe</option>
              {(Array.isArray(myCourses) ? myCourses : []).map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >{`${c.course_name} — classe ${c.id}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Lien Google Meet (URL)</label>
            <input
              type="url"
              value={formData.external_url}
              onChange={(e) =>
                setFormData({ ...formData, external_url: e.target.value })
              }
              className="input"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              required
            />
          </div>

          <div>
            <label className="label">Titre de la session</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input"
              placeholder="Ex: Introduction au chapitre 3"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input"
              rows={3}
              placeholder="Description du cours..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date et heure</label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_at: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Durée (min)</label>
              <input
                type="number"
                min={15}
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value, 10) || 60,
                  })
                }
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(null)}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? "Création..." : "Créer le cours"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const EditOnlineCourseModal = () => {
    const [formData, setFormData] = useState({
      title: editingCourse?.title ?? "",
      description: editingCourse?.description ?? "",
      meeting_url: editingCourse?.meeting_url ?? "",
      scheduled_at: toDatetimeLocalValue(editingCourse?.scheduled_at),
      duration_minutes: editingCourse?.duration_minutes ?? 60,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (!editingCourse) return;
      setFormData({
        title: editingCourse.title ?? "",
        description: editingCourse.description ?? "",
        meeting_url: editingCourse.meeting_url ?? "",
        scheduled_at: toDatetimeLocalValue(editingCourse.scheduled_at),
        duration_minutes: editingCourse.duration_minutes ?? 60,
      });
    }, [editingCourse?.id]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await handleUpdateCourse(editingCourse.id, {
          ...formData,
          scheduled_at: datetimeLocalToIsoUtc(formData.scheduled_at),
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal title="Modifier le Cours en Ligne" onClose={() => setEditingCourse(null)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Titre</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div>
            <label className="label">Lien de réunion (URL)</label>
            <input
              type="url"
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
              className="input"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date et heure</label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Durée (min)</label>
              <input
                type="number"
                min="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setEditingCourse(null)}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };


  const UploadMaterialModal = () => {
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
      course_id: selectedCourse?.course_id || selectedCourse?.id || "",
      class_id: "",
      title: "",
      description: "",
      // type will be either a file type like 'pdf' or the special 'link'
      type: "pdf",
      downloadable: true,
      external_url: "",
      mode: "file", // 'file' or 'link'
    });
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setFile(selectedFile);
        if (!formData.title) {
          setFormData({
            ...formData,
            title: selectedFile.name.replace(/\.[^/.]+$/, ""),
          });
        }
        // Auto-detect type
        const ext = selectedFile.name.split(".").pop().toLowerCase();
        let type = "other";
        if (["pdf"].includes(ext)) type = "pdf";
        else if (["doc", "docx"].includes(ext)) type = "document";
        else if (["ppt", "pptx"].includes(ext)) type = "presentation";
        else if (["jpg", "jpeg", "png", "gif"].includes(ext)) type = "image";
        setFormData({
          ...formData,
          type,
          title: formData.title || selectedFile.name.replace(/\.[^/.]+$/, ""),
        });
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (formData.mode === "file" && !file) {
        toast.error(t('select_file_first'));
        return;
      }

      setIsSubmitting(true);
      const data = new FormData();
      // append standard fields
      data.append("course_id", formData.course_id);
      if (formData.class_id) data.append("class_id", formData.class_id);
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("downloadable", formData.downloadable ? 1 : 0);

      if (formData.mode === "link") {
        data.append("type", "link");
        data.append("external_url", formData.external_url);
      } else {
        data.append("type", formData.type);
        data.append("file", file);
      }

      try {
        await api.post("/elearning/materials", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(t('upload_success'));
        setShowModal(null);
        if (selectedCourse)
          fetchMaterials(selectedCourse.course_id || selectedCourse.id);
      } catch (error) {
        toast.error(error.response?.data?.message || t('error'));
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal title="Uploader un Document" onClose={() => setShowModal(null)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Cours</label>
            <select
              value={formData.course_id}
              onChange={(e) =>
                setFormData({ ...formData, course_id: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Sélectionner un cours</option>
              {(Array.isArray(myCourses) ? myCourses : []).map((course) => (
                <option
                  key={course.course_id || course.id}
                  value={course.course_id || course.id}
                >
                  {course.course_name || course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Fichier</label>
            {formData.mode === "file" ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-dark-100 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <DocumentTextIcon className="w-8 h-8 text-primary-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      PDF, DOC, DOCX, PPT, PPTX (max 50MB)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={formData.external_url}
                onChange={(e) =>
                  setFormData({ ...formData, external_url: e.target.value })
                }
                className="input"
                required={formData.mode === "link"}
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
              className="hidden"
            />
          </div>

          <div>
            <label className="label">Titre</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input"
              placeholder="Titre du document"
              required
            />
          </div>

          <div>
            <label className="label">Description (optionnel)</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input"
              rows={2}
              placeholder="Description du document..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.downloadable}
              onChange={(e) =>
                setFormData({ ...formData, downloadable: e.target.checked })
              }
              className="w-4 h-4 text-primary-500 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Autoriser le téléchargement
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(null)}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (formData.mode === "file" && !file)}
              className="btn-primary flex-1"
            >
              {isSubmitting ? "Upload..." : "Uploader"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const CreateQuizModal = () => {
    const [formData, setFormData] = useState({
      course_id: selectedCourse?.course_id || selectedCourse?.id || "",
      title: "",
      description: "",
      duration_minutes: 30,
      total_points: 20,
      passing_score: 10,
      max_attempts: 1,
      shuffle_questions: false,
      show_answers_after: true,
      available_from: "",
      available_until: "",
      questions: [
        {
          type: "multiple_choice",
          question: "",
          options: ["", "", "", ""],
          correct_answer: "",
          points: 1,
        },
      ],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addQuestion = () => {
      setFormData({
        ...formData,
        questions: [
          ...formData.questions,
          {
            type: "multiple_choice",
            question: "",
            options: ["", "", "", ""],
            correct_answer: "",
            points: 1,
          },
        ],
      });
    };

    const removeQuestion = (index) => {
      const newQuestions = formData.questions.filter((_, i) => i !== index);
      setFormData({ ...formData, questions: newQuestions });
    };

    const updateQuestion = (index, field, value) => {
      const newQuestions = [...formData.questions];
      newQuestions[index][field] = value;
      setFormData({ ...formData, questions: newQuestions });
    };

    const updateOption = (qIndex, oIndex, value) => {
      const newQuestions = [...formData.questions];
      newQuestions[qIndex].options[oIndex] = value;
      setFormData({ ...formData, questions: newQuestions });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (formData.questions.some((q) => !q.question || !q.correct_answer)) {
        toast.error(t('complete_all_questions'));
        return;
      }
      setIsSubmitting(true);
      try {
        // Convert datetime-local strings (local time, no TZ) to UTC ISO so the
        // server stores the correct moment regardless of server/client timezone mismatch.
        const toUTC = (val) => (val ? new Date(val).toISOString() : null);
        const payload = {
          ...formData,
          available_from: toUTC(formData.available_from),
          available_until: toUTC(formData.available_until),
        };
        await api.post("/elearning/quizzes", payload);
        toast.success(t('quiz_created'));
        setShowModal(null);
        if (selectedCourse)
          fetchQuizzes(selectedCourse.course_id || selectedCourse.id);
      } catch (error) {
        toast.error(
          error.response?.data?.message || t('error'),
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal title="Créer un Quiz" onClose={() => setShowModal(null)} size="lg">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[65vh] overflow-y-auto pr-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cours</label>
              <select
                value={formData.course_id}
                onChange={(e) =>
                  setFormData({ ...formData, course_id: e.target.value })
                }
                className="input"
                required
              >
                <option value="">Sélectionner</option>
                {myCourses.map((course) => (
                  <option
                    key={course.course_id || course.id}
                    value={course.course_id || course.id}
                  >
                    {course.course_name || course.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Titre</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">Durée (min)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value),
                  })
                }
                className="input"
                min={5}
              />
            </div>
            <div>
              <label className="label">Total points</label>
              <input
                type="number"
                value={formData.total_points}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_points: parseInt(e.target.value),
                  })
                }
                className="input"
                min={1}
              />
            </div>
            <div>
              <label className="label">Note de passage</label>
              <input
                type="number"
                value={formData.passing_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passing_score: parseInt(e.target.value),
                  })
                }
                className="input"
                min={0}
              />
            </div>
            <div>
              <label className="label">Max tentatives</label>
              <input
                type="number"
                value={formData.max_attempts}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_attempts: parseInt(e.target.value),
                  })
                }
                className="input"
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Disponible à partir de</label>
              <input
                type="datetime-local"
                value={formData.available_from}
                onChange={(e) =>
                  setFormData({ ...formData, available_from: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Disponible jusqu'à</label>
              <input
                type="datetime-local"
                value={formData.available_until}
                onChange={(e) =>
                  setFormData({ ...formData, available_until: e.target.value })
                }
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.shuffle_questions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shuffle_questions: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-500 rounded"
              />
              <span className="text-sm">Mélanger les questions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_answers_after}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    show_answers_after: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-500 rounded"
              />
              <span className="text-sm">Montrer les réponses après</span>
            </label>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-100 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Questions ({formData.questions.length})
            </h3>

            {formData.questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="mb-4 p-4 bg-gray-50 dark:bg-dark-200 rounded-lg"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Question {qIndex + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(qIndex, "type", e.target.value)
                      }
                      className="p-2 rounded bg-white dark:bg-dark-300 text-sm border-0"
                    >
                      <option value="multiple_choice">Choix multiple</option>
                      <option value="true_false">Vrai/Faux</option>
                      <option value="short_answer">Réponse courte</option>
                    </select>
                    <input
                      type="number"
                      value={q.points}
                      onChange={(e) =>
                        updateQuestion(
                          qIndex,
                          "points",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-16 p-2 rounded bg-white dark:bg-dark-300 text-sm border-0"
                      min={1}
                      placeholder="pts"
                    />
                    {formData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(qIndex, "question", e.target.value)
                  }
                  placeholder="Entrez la question..."
                  className="w-full p-2 mb-3 rounded bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-0"
                  required
                />

                {q.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correct_answer === opt && opt !== ""}
                          onChange={() =>
                            updateQuestion(qIndex, "correct_answer", opt)
                          }
                          className="w-4 h-4 text-primary-500"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) =>
                            updateOption(qIndex, oIndex, e.target.value)
                          }
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1 p-2 rounded bg-white dark:bg-dark-300 text-sm border-0"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">
                      Sélectionnez la bonne réponse
                    </p>
                  </div>
                )}

                {q.type === "true_false" && (
                  <div className="flex gap-4">
                    {["vrai", "faux"].map((option) => (
                      <label key={option} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`tf-${qIndex}`}
                          checked={q.correct_answer === option}
                          onChange={() =>
                            updateQuestion(qIndex, "correct_answer", option)
                          }
                          className="w-4 h-4 text-primary-500"
                        />
                        <span className="capitalize">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "short_answer" && (
                  <input
                    type="text"
                    value={q.correct_answer}
                    onChange={(e) =>
                      updateQuestion(qIndex, "correct_answer", e.target.value)
                    }
                    placeholder="Réponse correcte"
                    className="w-full p-2 rounded bg-white dark:bg-dark-300 text-sm border-0"
                  />
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addQuestion}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-dark-100 rounded-lg text-gray-500 hover:text-primary-500 hover:border-primary-500 transition-colors"
            >
              + Ajouter une question
            </button>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-dark-100">
            <button
              type="button"
              onClick={() => setShowModal(null)}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? "Création..." : "Créer le Quiz"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const CreateAssignmentModal = () => {
    const [formData, setFormData] = useState({
      course_id: selectedCourse?.course_id || selectedCourse?.id || "",
      title: "",
      description: "",
      instructions: "",
      total_points: 20,
      due_date: "",
      allow_late_submission: false,
      late_penalty_percent: 10,
      allow_multiple_submissions: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const toUTC = (val) => (val ? new Date(val).toISOString() : null);
        await api.post("/elearning/assignments", {
          ...formData,
          due_date: toUTC(formData.due_date),
        });
        toast.success(t('assignment_created'));
        setShowModal(null);
        if (selectedCourse)
          fetchAssignments(selectedCourse.course_id || selectedCourse.id);
      } catch (error) {
        toast.error(
          error.response?.data?.message || t('error'),
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal title="Créer un Devoir" onClose={() => setShowModal(null)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Cours</label>
            <select
              value={formData.course_id}
              onChange={(e) =>
                setFormData({ ...formData, course_id: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Sélectionner</option>
              {myCourses.map((course) => (
                <option
                  key={course.course_id || course.id}
                  value={course.course_id || course.id}
                >
                  {course.course_name || course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Titre</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="label">Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              className="input"
              rows={2}
              placeholder="Instructions pour les étudiants..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Points totaux</label>
              <input
                type="number"
                value={formData.total_points}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_points: parseInt(e.target.value),
                  })
                }
                className="input"
                min={1}
              />
            </div>
            <div>
              <label className="label">Date limite</label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="input"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_late_submission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    allow_late_submission: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-500 rounded"
              />
              <span className="text-sm">Accepter les soumissions tardives</span>
            </label>
            {formData.allow_late_submission && (
              <div className="ml-6">
                <label className="label text-sm">Pénalité (%)</label>
                <input
                  type="number"
                  value={formData.late_penalty_percent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      late_penalty_percent: parseInt(e.target.value),
                    })
                  }
                  className="input"
                  min={0}
                  max={100}
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_multiple_submissions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    allow_multiple_submissions: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-500 rounded"
              />
              <span className="text-sm">Autoriser plusieurs soumissions</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(null)}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? "Création..." : "Créer le devoir"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const QuizResultsModal = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchResults = async () => {
        if (!selectedItem?.id) {
          setLoading(false);
          return;
        }
        try {
          const response = await api.get(
            `/elearning/quizzes/${selectedItem.id}/results`,
          );
          setData(response.data);
        } catch (error) {
          toast.error(t('error'));
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    }, [selectedItem]);

    const handlePrint = () => {
      if (!data) return;
      const quiz = data.quiz;
      const stats = data.stats;
      const attempts = data.attempts || [];
      const printDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

      const rows = attempts.map((a) => `
        <tr>
          <td>${a.student?.name || '—'}</td>
          <td>${a.student?.registration_number || '—'}</td>
          <td class="${a.score >= quiz.passing_score ? 'pass' : 'fail'}">${typeof a.score === 'number' ? a.score.toFixed(1) : a.score}/${quiz.total_points}</td>
          <td>${a.correct_count}/${a.total_questions}</td>
          <td>${a.completed_at ? new Date(a.completed_at).toLocaleString('fr-FR') : '—'}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html lang="fr"><head>
        <meta charset="UTF-8"/>
        <title>Résultats: ${quiz?.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #111; font-size: 13px; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1e40af; padding-bottom: 16px; }
          .header img { height: 70px; margin-bottom: 8px; }
          .header h1 { font-size: 18px; color: #1e40af; margin: 4px 0; }
          .header h2 { font-size: 14px; font-weight: normal; margin: 2px 0; color: #444; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #555; }
          .stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; margin-bottom: 20px; }
          .stat-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; text-align: center; }
          .stat-box .val { font-size: 20px; font-weight: bold; color: #1e40af; }
          .stat-box .lbl { font-size: 11px; color: #666; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1e40af; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
          td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
          tr:nth-child(even) td { background: #f8f9fa; }
          .pass { color: #16a34a; font-weight: bold; }
          .fail { color: #dc2626; font-weight: bold; }
          @media print { body { margin: 15px; } }
        </style>
      </head><body>
        <div class="header">
          <img src="/esl-logo.png" onerror="this.style.display='none'"/>
          <h1>École de santé de Libreville</h1>
          <h2>Résultats du Quiz — ${quiz?.title || ''}</h2>
        </div>
        <div class="meta">
          <span>Cours: ${selectedCourse?.name || selectedCourse?.class?.course?.name || '—'}</span>
          <span>Seuil de réussite: ${quiz?.passing_score}/${quiz?.total_points}</span>
          <span>Imprimé le ${printDate}</span>
        </div>
        <div class="stats">
          <div class="stat-box"><div class="val">${stats?.total_attempts ?? 0}</div><div class="lbl">Tentatives</div></div>
          <div class="stat-box"><div class="val">${typeof stats?.average_score === 'number' ? stats.average_score.toFixed(1) : '—'}</div><div class="lbl">Moyenne</div></div>
          <div class="stat-box"><div class="val" style="color:#16a34a">${typeof stats?.highest_score === 'number' ? stats.highest_score.toFixed(1) : '—'}</div><div class="lbl">Maximum</div></div>
          <div class="stat-box"><div class="val" style="color:#dc2626">${typeof stats?.lowest_score === 'number' ? stats.lowest_score.toFixed(1) : '—'}</div><div class="lbl">Minimum</div></div>
          <div class="stat-box"><div class="val">${typeof stats?.pass_rate === 'number' ? stats.pass_rate.toFixed(0) : '—'}%</div><div class="lbl">Taux de réussite</div></div>
        </div>
        <table>
          <thead><tr>
            <th>Étudiant</th><th>Matricule</th><th>Score</th><th>Réponses correctes</th><th>Date</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;

      const pw = window.open('', '_blank');
      pw.document.write(html);
      pw.document.close();
      pw.focus();
      setTimeout(() => { pw.print(); }, 400);
    };

    if (loading)
      return (
        <Modal title="Résultats du Quiz" onClose={() => setShowModal(null)}>
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Modal>
      );

    return (
      <Modal
        title={`Résultats: ${data?.quiz?.title}`}
        onClose={() => setShowModal(null)}
        size="xl"
      >
        <div className="space-y-6">
          {/* Print button */}
          <div className="flex justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-100 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
              Imprimer
            </button>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats?.total_attempts}
              </p>
              <p className="text-xs text-gray-500">Tentatives</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats?.average_score?.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Moyenne</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {data?.stats?.highest_score?.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Max</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {data?.stats?.lowest_score?.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Min</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary-600">
                {data?.stats?.pass_rate?.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">Réussite</p>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Étudiant</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Réponses correctes</th>
                  <th className="px-4 py-3 text-center">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {data?.attempts?.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {attempt.student.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attempt.student.registration_number}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${attempt.score >= data.quiz.passing_score ? "text-green-600" : "text-red-600"}`}
                      >
                        {attempt.score?.toFixed(1)}/{data.quiz.total_points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {attempt.correct_count}/{attempt.total_questions}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                      {new Date(attempt.completed_at).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.attempts?.length === 0 && (
              <p className="text-center py-8 text-gray-500">
                Aucune tentative pour ce quiz
              </p>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  const AssignmentSubmissionsModal = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [grading, setGrading] = useState(null);
    const [gradeForm, setGradeForm] = useState({ grade: "", feedback: "" });

    useEffect(() => {
      if (!selectedItem?.id) {
        setLoading(false);
        return;
      }
      fetchSubmissions();
    }, [selectedItem]);

    const fetchSubmissions = async () => {
      try {
        const response = await api.get(
          `/elearning/assignments/${selectedItem.id}/submissions`,
        );
        setData(response.data);
      } catch (error) {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };

    const submitGrade = async () => {
      if (!gradeForm.grade) return;
      try {
        await api.post(
          `/elearning/assignments/submission/${grading.id}/grade`,
          gradeForm,
        );
        toast.success(t('grade_recorded'));
        setGrading(null);
        setGradeForm({ grade: "", feedback: "" });
        fetchSubmissions();
      } catch (error) {
        toast.error(t('error'));
      }
    };

    const downloadFile = async (submissionId, fileName) => {
      try {
        const response = await api.get(
          `/elearning/assignments/submission/${submissionId}/download`,
          { responseType: "blob" },
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        toast.error(t('error'));
      }
    };

    if (loading)
      return (
        <Modal title="Soumissions" onClose={() => setShowModal(null)}>
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Modal>
      );

    return (
      <Modal
        title={`Soumissions: ${data?.assignment?.title}`}
        onClose={() => setShowModal(null)}
        size="xl"
      >
        <div className="space-y-6">
          {/* Assignment description */}
          {data?.assignment?.description && (
            <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Instructions</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.assignment.description}</p>
            </div>
          )}
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats?.total_enrolled}
              </p>
              <p className="text-xs text-gray-500">Inscrits</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {data?.stats?.total_submitted}
              </p>
              <p className="text-xs text-gray-500">Soumis</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary-600">
                {data?.stats?.total_graded}
              </p>
              <p className="text-xs text-gray-500">Notés</p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {data?.stats?.total_late}
              </p>
              <p className="text-xs text-gray-500">En retard</p>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Étudiant</th>
                  <th className="px-4 py-3 text-center">Fichier</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Note</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {data?.submissions?.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sub.student.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sub.student.registration_number}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {sub.content && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 max-w-xs whitespace-pre-wrap line-clamp-3">{sub.content}</p>
                      )}
                      {sub.file_name ? (
                        <button
                          onClick={() => downloadFile(sub.id, sub.file_name)}
                          className="text-primary-600 hover:underline text-xs flex items-center gap-1"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          {sub.file_name}
                        </button>
                      ) : !sub.content ? (
                        <span className="text-gray-400 text-xs">Aucun fichier</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${sub.is_late ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                      >
                        {sub.is_late ? "En retard" : "À temps"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sub.grade !== null ? (
                        <span className="font-semibold">
                          {sub.grade}/{data.assignment.total_points}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setGrading(sub);
                          setGradeForm({
                            grade: sub.grade || "",
                            feedback: sub.feedback || "",
                          });
                        }}
                        className="px-3 py-1 bg-primary-500 text-white rounded text-xs hover:bg-primary-600"
                      >
                        {sub.grade !== null ? "Modifier" : "Noter"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.submissions?.length === 0 && (
              <p className="text-center py-8 text-gray-500">
                Aucune soumission
              </p>
            )}
          </div>

          {/* Grade Form */}
          {grading && (
            <div className="border-t border-gray-200 dark:border-dark-100 pt-4">
              <h4 className="font-semibold mb-3">
                Noter: {grading.student.name}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Note / {data.assignment.total_points}
                  </label>
                  <input
                    type="number"
                    value={gradeForm.grade}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, grade: e.target.value })
                    }
                    className="input"
                    min={0}
                    max={data.assignment.total_points}
                  />
                </div>
                <div>
                  <label className="label">Feedback</label>
                  <input
                    type="text"
                    value={gradeForm.feedback}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, feedback: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setGrading(null)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button onClick={submitGrade} className="btn-primary">
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const openSessionAttendanceReport = async (sessionId) => {
    setSessionReportLoadingId(sessionId);
    try {
      const title = "Rapport — cours en ligne";
      const ok = await openReportAsync(title, async () => {
        const res = await api.get(
          `/elearning/courses/${sessionId}/attendance-report`,
        );
        const session = res.data?.session ?? {};
        return {
          subtitle: session.title || `Session #${sessionId}`,
          body: buildOnlineCourseAttendanceReportBody(res.data),
        };
      });
      if (!ok) toast.error(t("popup_blocked"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSessionReportLoadingId(null);
    }
  };

  // ==================== COMPONENTS ====================

  const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
    actionLabel,
  }) => (
    <div className="text-center py-12 bg-gray-50 dark:bg-dark-200 rounded-xl">
      <Icon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      {action && (
        <button onClick={action} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );

  const CourseCard = ({
    course,
    onStart,
    onEnd,
    onEdit,
    onOpenReport,
    sessionReportLoadingId,
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${course.status === "live" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
        >
          {course.status === "live" ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <VideoCameraIcon className="w-5 h-5" />
            </div>
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${course.status === "scheduled" ? "bg-yellow-100 text-yellow-700" : course.status === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
        >
          {course.status === "scheduled"
            ? "Programmé"
            : course.status === "live"
              ? "En direct"
              : "Terminé"}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
        {course.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {course.course?.name}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <ClockIcon className="w-4 h-4" />
          {course.duration_minutes} min
        </span>
        {course.scheduled_at && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            {new Date(course.scheduled_at).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <UserGroupIcon className="w-4 h-4" />
          {course.attendance_count ?? course.attendance?.length ?? 0}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          {course.status === "scheduled" && (
            <button
              onClick={() => onStart(course.id)}
              className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600">
              Démarrer
            </button>
          )}
          {course.status === "live" && (
            <>
              <button
                onClick={() => course.meeting_url && window.open(course.meeting_url, "_blank", "noopener,noreferrer")}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                Rejoindre
              </button>
              <button
                onClick={() => onEnd(course.id)}
                className="py-2 px-3 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                title="Terminer la session">
                ⏹
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onEdit(course)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg">
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          disabled={sessionReportLoadingId !== null}
          onClick={() => onOpenReport(course.id)}
          className="w-full py-2 text-center rounded-lg text-sm font-medium border border-gray-200 dark:border-dark-100 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {sessionReportLoadingId === course.id
            ? t("loading")
            : t("elearning_view_session_report")}
        </button>
      </div>
    </motion.div>
  );

  const MaterialCard = ({ material }) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {material.title}
          </h4>
          <p className="text-sm text-gray-500">
            {material.type} • {material.download_count || 0} téléchargements
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {material.external_url ? (
          <button
            onClick={() => window.open(material.external_url, "_blank")}
            className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
        ) : (
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg">
            <EyeIcon className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => deleteMaterial(material.id)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const QuizCard = ({ quiz }) => (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${quiz.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400"}`}
        >
          {quiz.status === "published" ? t("published") : t("draft")}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
        {quiz.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {quiz.questions?.length || 0} {t("elearning_questions")} • {quiz.duration_minutes} min
      </p>
      {/* Availability window */}
      {(quiz.available_from || quiz.available_until) && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-2 bg-gray-50 dark:bg-dark-300 px-2 py-1.5 rounded-lg">
          <ClockIcon className="w-3.5 h-3.5 shrink-0" />
          <span>
            {quiz.available_from
              ? new Date(quiz.available_from).toLocaleString(undefined, {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })
              : "…"}
            {" → "}
            {quiz.available_until
              ? new Date(quiz.available_until).toLocaleString(undefined, {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })
              : "…"}
          </span>
        </div>
      )}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>{t("total")}: {quiz.total_points} pts</span>
        <span>{t("passing_score")}: {quiz.passing_score} pts</span>
      </div>
      <div className="flex gap-2">
        {quiz.status === "draft" && (
          <button
            onClick={() => publishQuiz(quiz.id)}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            {t("publish")}
          </button>
        )}
        {quiz.status === "published" && (
          <button
            onClick={() => {
              setSelectedItem(quiz);
              setShowModal("quiz-results");
            }}
            className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            {t("view_results")}
          </button>
        )}
        <button
          onClick={() => deleteQuiz(quiz.id)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const AssignmentCard = ({ assignment }) => {
    const isOverdue =
      assignment.due_date && new Date(assignment.due_date) < new Date();
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <FolderPlusIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {assignment.title}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${assignment.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                >
                  {assignment.status === "published" ? "Publié" : "Brouillon"}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {assignment.description}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-gray-500">
                  <AcademicCapIcon className="w-4 h-4 inline mr-1" />
                  {assignment.total_points} points
                </span>
                <span className={isOverdue ? "text-red-500" : "text-gray-500"}>
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  {new Date(assignment.due_date).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assignment.status === "draft" && (
              <button
                onClick={() => publishAssignment(assignment.id)}
                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm"
              >
                Publier
              </button>
            )}
            {assignment.status === "published" && (
              <button
                onClick={() => {
                  setSelectedItem(assignment);
                  setShowModal("assignment-submissions");
                }}
                className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm"
              >
                Soumissions
              </button>
            )}
            <button
              onClick={() => deleteAssignment(assignment.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            E-Learning
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gérez vos cours en ligne, documents, quiz et devoirs
          </p>
        </motion.div>

        {/* Course Selector */}
        {["materials", "quizzes", "assignments"].includes(activeTab) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
          >
            <label className="label">Sélectionnez un cours</label>
            <select
              value={selectedCourse?.course_id || selectedCourse?.id || ""}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="input"
            >
              <option value="">-- Sélectionner un cours --</option>
              {(Array.isArray(myCourses) ? myCourses : []).map((course) => (
                <option
                  key={course.course_id || course.id}
                  value={course.course_id || course.id}
                >
                  {course.course_name || course.name} (
                  {course.course_code || course.code})
                </option>
              ))}
            </select>
          </motion.div>
        )}

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
              <span className="hidden sm:inline">{tab.name}</span>
              {tab.count > 0 && !visitedTabs.has(tab.id) && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {/* Online Courses Tab */}
          {activeTab === "courses" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal("course")}
                  className="btn-primary flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Créer un cours
                </button>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-48 bg-gray-100 dark:bg-dark-200 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : onlineCourses.length === 0 ? (
                <EmptyState
                  icon={VideoCameraIcon}
                  title="Aucun cours en ligne"
                  description="Créez votre premier cours vidéo pour vos étudiants"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlineCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onStart={startCourse}
                      onEnd={endCourse}
                      onEdit={setEditingCourse}
                      onOpenReport={openSessionAttendanceReport}
                      sessionReportLoadingId={sessionReportLoadingId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === "materials" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal("material")}
                  className="btn-primary flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  Uploader un document
                </button>
              </div>
              {!selectedCourse ? (
                <EmptyState
                  icon={DocumentTextIcon}
                  title="Sélectionnez un cours"
                  description="Choisissez un cours pour voir ou ajouter des documents"
                />
              ) : materials.length === 0 ? (
                <EmptyState
                  icon={DocumentTextIcon}
                  title="Aucun document"
                  description="Uploadez des PDF, présentations et autres ressources"
                />
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quizzes Tab */}
          {activeTab === "quizzes" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal("quiz")}
                  className="btn-primary flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Créer un quiz
                </button>
              </div>
              {!selectedCourse ? (
                <EmptyState
                  icon={ClipboardDocumentListIcon}
                  title="Sélectionnez un cours"
                  description="Choisissez un cours pour voir ou créer des quiz"
                />
              ) : quizzes.length === 0 ? (
                <EmptyState
                  icon={ClipboardDocumentListIcon}
                  title="Aucun quiz"
                  description="Créez des quiz interactifs avec correction automatique"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal("assignment")}
                  className="btn-primary flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Créer un devoir
                </button>
              </div>
              {!selectedCourse ? (
                <EmptyState
                  icon={FolderPlusIcon}
                  title="Sélectionnez un cours"
                  description="Choisissez un cours pour voir ou créer des devoirs"
                />
              ) : assignments.length === 0 ? (
                <EmptyState
                  icon={FolderPlusIcon}
                  title="Aucun devoir"
                  description="Créez des devoirs et recevez les soumissions de vos étudiants"
                />
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showModal === "course" && <CreateOnlineCourseModal />}
          {showModal === "material" && <UploadMaterialModal />}
          {showModal === "quiz" && <CreateQuizModal />}
          {showModal === "assignment" && <CreateAssignmentModal />}
          {showModal === "quiz-results" && <QuizResultsModal />}
          {showModal === "assignment-submissions" && (
            <AssignmentSubmissionsModal />
          )}
          {editingCourse && <EditOnlineCourseModal />}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

// Simple Error Boundary to prevent a full blank page when a modal or child component throws.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(_error, _info) {
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
          <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
            {String(this.state.error)}
          </pre>
          <div className="mt-4">
            <button onClick={this.reset} className="btn-primary">
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ELearning;
