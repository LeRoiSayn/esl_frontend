import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n/index.jsx";
import { scheduleApi } from "../../services/api";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export default function StudentSchedule() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.student?.id) fetchSchedule();
  }, [user]);

  const fetchSchedule = async () => {
    try {
      const response = await scheduleApi.getByStudent(user.student.id);
      setSchedules(response.data.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => s.day_of_week === day);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t("my_schedule")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("schedule_subtitle_student")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {DAYS.map((day) => (
          <div key={day} className="card p-6">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 capitalize flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-500" />
              {t(day)}
            </h3>
            <div className="space-y-3">
              {groupedByDay[day].length > 0 ? (
                groupedByDay[day].map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-teal-500/10 border border-primary-200 dark:border-primary-800"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {schedule.class?.course?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {schedule.class?.course?.code}
                    </p>
                    {schedule.class?.teacher?.user && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <UserIcon className="w-4 h-4" />
                        <span>
                          Prof. {schedule.class.teacher.user.first_name}{" "}
                          {schedule.class.teacher.user.last_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>
                        {schedule.start_time?.substring(0, 5)} -{" "}
                        {schedule.end_time?.substring(0, 5)}
                      </span>
                    </div>
                    {schedule.room && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{schedule.room}</span>
                      </div>
                    )}
                    {(schedule.midterm_date || schedule.final_date) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {schedule.midterm_date && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                            {t("midterm_exam")}: {schedule.midterm_date}
                          </span>
                        )}
                        {schedule.final_date && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                            {t("final_exam")}: {schedule.final_date}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">
                  {t("no_classes_scheduled")}
                </p>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
