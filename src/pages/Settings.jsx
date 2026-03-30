import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  LanguageIcon,
  BellIcon,
  EnvelopeIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/index.jsx";
import { settingsApi } from "../services/api";

const STORAGE_KEY = "esl_user_settings";

const defaultSettings = {
  font_size: 100,
  language: "fr",
  email_notifications: true,
  push_notifications: true,
  dashboard_widgets: [],
};

const Settings = () => {
  const { themeMode, setThemeMode } = useTheme();
  const { user } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...defaultSettings, ...JSON.parse(stored) }
    } catch (e) {}
    return defaultSettings
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Available widgets based on role — using translation keys
  const widgetsByRole = {
    admin: [
      { id: "stats", nameKey: "widget_stats" },
      { id: "calendar", nameKey: "widget_calendar" },
      { id: "notifications", nameKey: "widget_notifications" },
      { id: "quick_actions", nameKey: "widget_quick_actions" },
      { id: "recent_activity", nameKey: "widget_recent_activity" },
      { id: "system_health", nameKey: "widget_system_health" },
    ],
    teacher: [
      { id: "stats", nameKey: "widget_stats" },
      { id: "calendar", nameKey: "widget_calendar" },
      { id: "notifications", nameKey: "widget_notifications" },
      { id: "my_classes", nameKey: "widget_my_classes" },
      { id: "upcoming_sessions", nameKey: "widget_upcoming_sessions" },
      { id: "quick_actions", nameKey: "widget_quick_actions" },
    ],
    student: [
      { id: "stats", nameKey: "widget_stats" },
      { id: "calendar", nameKey: "widget_calendar" },
      { id: "notifications", nameKey: "widget_notifications" },
      { id: "my_courses", nameKey: "widget_my_courses" },
      { id: "grades_summary", nameKey: "widget_grades_summary" },
      { id: "upcoming_exams", nameKey: "widget_upcoming_exams" },
    ],
    finance: [
      { id: "stats", nameKey: "widget_stats" },
      { id: "calendar", nameKey: "widget_calendar" },
      { id: "notifications", nameKey: "widget_notifications" },
      { id: "payments_today", nameKey: "widget_payments_today" },
      { id: "pending_payments", nameKey: "widget_pending_payments" },
    ],
    registrar: [
      { id: "stats", nameKey: "widget_stats" },
      { id: "calendar", nameKey: "widget_calendar" },
      { id: "notifications", nameKey: "widget_notifications" },
      { id: "new_registrations", nameKey: "widget_new_registrations" },
      { id: "pending_approvals", nameKey: "widget_pending_approvals" },
    ],
  };

  // Sync language from I18n context on mount
  useEffect(() => {
    if (language) {
      setSettings((prev) => ({ ...prev, language }));
    }
  }, [language]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsed });
        applySettings(parsed);
      } catch (_) {
      }
    }
  }, []);

  // Initialize dashboard_widgets to all role widgets if never configured
  useEffect(() => {
    if (!user?.role) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const hasSavedWidgets = stored && JSON.parse(stored)?.dashboard_widgets?.length > 0;
    if (!hasSavedWidgets) {
      const roleWidgets = (widgetsByRole[user.role] || []).map((w) => w.id);
      setSettings((prev) => ({ ...prev, dashboard_widgets: roleWidgets }));
    }
  }, [user?.role]);

  // Apply non-theme settings immediately
  const applySettings = (newSettings) => {
    document.documentElement.style.fontSize = `${newSettings.font_size}%`;
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (key === "font_size") {
      applySettings(newSettings);
    }
    if (key === "language") {
      setLanguage(value);
    }
    // Auto-save notification preferences immediately
    if (key === "email_notifications" || key === "push_notifications") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (_) {}
      settingsApi.update({ [key]: value }).catch(() => {});
    }
  };

  const handleThemeChange = (themeId) => {
    setThemeMode(themeId);
  };

  const toggleWidget = (widgetId) => {
    const current = settings.dashboard_widgets || [];
    const newWidgets = current.includes(widgetId)
      ? current.filter((w) => w !== widgetId)
      : [...current, widgetId];
    const newSettings = { ...settings, dashboard_widgets: newWidgets };
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (_) {}
  };

  const saveSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      applySettings(settings);
      setSaved(true);
      settingsApi
        .update({ language: settings.language, theme: themeMode })
        .catch(() => {});
      toast.success(t("settings_saved"));
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast.error(t("save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    if (!confirm(t("reset_confirm"))) return;
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    applySettings(defaultSettings);
    setThemeMode('auto');
    setLanguage(defaultSettings.language);
    toast.success(t("settings_reset"));
  };

  const themes = [
    { id: "light", nameKey: "theme_light", icon: SunIcon },
    { id: "dark", nameKey: "theme_dark", icon: MoonIcon },
    { id: "auto", nameKey: "theme_auto", icon: ComputerDesktopIcon },
  ];



  const availableWidgets = widgetsByRole[user?.role] || widgetsByRole.student;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t("settings")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("settings_subtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetSettings}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t("reset")}
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saved ? (
              <>
                <CheckIcon className="w-4 h-4" />
                {t("saved")}
              </>
            ) : (
              t("save")
            )}
          </motion.button>
        </div>
      </div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 p-6"
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <SunIcon className="w-5 h-5 text-primary-500" />
          {t("appearance")}
        </h2>

        {/* Theme */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t("theme")}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  themeMode === theme.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-dark-100 hover:border-gray-300"
                }`}
              >
                <theme.icon
                  className={`w-6 h-6 ${
                    themeMode === theme.id
                      ? "text-primary-500"
                      : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    themeMode === theme.id
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {t(theme.nameKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t("font_size")}: {settings.font_size}%
          </label>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">A</span>
            <input
              type="range"
              min={80}
              max={130}
              step={5}
              value={settings.font_size}
              onChange={(e) =>
                handleSettingChange("font_size", parseInt(e.target.value))
              }
              className="flex-1 h-2 bg-gray-200 dark:bg-dark-100 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <span className="text-lg text-gray-500">A</span>
          </div>
        </div>
      </motion.div>

      {/* Language */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 p-6"
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <LanguageIcon className="w-5 h-5 text-primary-500" />
          {t("language")}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSettingChange("language", "fr")}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              settings.language === "fr"
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-gray-200 dark:border-dark-100 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl">🇫🇷</span>
            <span className="font-medium text-gray-900 dark:text-white">
              Français
            </span>
          </button>
          <button
            onClick={() => handleSettingChange("language", "en")}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              settings.language === "en"
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-gray-200 dark:border-dark-100 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl">🇬🇧</span>
            <span className="font-medium text-gray-900 dark:text-white">
              English
            </span>
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 p-6"
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <BellIcon className="w-5 h-5 text-primary-500" />
          {t("notifications")}
        </h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-300 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {t("notifications_email")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("notifications_email_desc")}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) =>
                handleSettingChange("email_notifications", e.target.checked)
              }
              className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-300 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <ComputerDesktopIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {t("notifications_push")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("notifications_push_desc")}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.push_notifications}
              onChange={(e) =>
                handleSettingChange("push_notifications", e.target.checked)
              }
              className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
            />
          </label>

        </div>
      </motion.div>

      {/* Dashboard Widgets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 p-6"
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <Squares2X2Icon className="w-5 h-5 text-primary-500" />
          {t("dashboard_widgets")}
        </h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t("dashboard_widgets_desc")}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableWidgets.map((widget) => (
            <button
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                (settings.dashboard_widgets || []).includes(widget.id)
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-200 dark:border-dark-100 hover:border-gray-300"
              }`}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  (settings.dashboard_widgets || []).includes(widget.id)
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 dark:bg-dark-100 text-gray-400"
                }`}
              >
                {(settings.dashboard_widgets || []).includes(widget.id) ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <Squares2X2Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  (settings.dashboard_widgets || []).includes(widget.id)
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t(widget.nameKey)}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
