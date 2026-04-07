import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeftIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useI18n } from "../../i18n/index.jsx";

const OnlineSessionReport = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/elearning/courses/${sessionId}/attendance-report`);
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) {
          toast.error(t("error"));
          navigate("/teacher/elearning", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, t]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const session = data?.session;
  const attendees = data?.attendees ?? [];
  const scheduled = session?.scheduled_at ? new Date(session.scheduled_at) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/teacher/elearning"
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold font-display text-gray-900 dark:text-white">
          {t("elearning_session_report_title")}
        </h1>
      </div>

      <div className="card p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 border-b border-gray-200 dark:border-dark-100 pb-6">
          <img
            src="/esl-logo.png"
            alt=""
            className="h-16 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
              École de Santé de Libreville
            </p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {session?.title}
            </h2>
            {session?.course_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{session.course_name}</p>
            )}
          </div>
        </div>

        {session?.description ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {t("elearning_report_description")}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {session.description}
            </p>
          </div>
        ) : null}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-200">
            <dt className="text-gray-500 dark:text-gray-400 mb-1">{t("elearning_report_date_day")}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {scheduled
                ? scheduled.toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-200">
            <dt className="text-gray-500 dark:text-gray-400 mb-1">{t("elearning_report_time")}</dt>
            <dd className="font-medium text-gray-900 dark:text-white font-mono">
              {scheduled
                ? scheduled.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </dd>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-200">
            <dt className="text-gray-500 dark:text-gray-400 mb-1">{t("elearning_report_duration")}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {session?.duration_minutes != null ? `${ session.duration_minutes } min` : "—"}
            </dd>
          </div>
          <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20">
            <dt className="text-primary-700 dark:text-primary-300 mb-1 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4" />
              {t("elearning_attendees_count")}
            </dt>
            <dd className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
              {data?.attendee_count ?? attendees.length}
            </dd>
          </div>
        </dl>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t("elearning_report_participants")}
          </h3>
          {attendees.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("elearning_report_no_attendees")}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                      {t("elearning_report_student")}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                      {t("elearning_report_matricule")}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                      {t("elearning_report_joined_at")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                  {attendees.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{row.student?.name || "—"}</td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                        {row.student?.student_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.joined_at
                          ? new Date(row.joined_at).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-100">
          <button type="button" onClick={() => window.print()} className="btn-secondary">
            {t("print")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnlineSessionReport;
