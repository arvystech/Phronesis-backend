/**
 * Helper to format database 'HH:MM:SS' time into { time: 'H:MM', period: 'AM/PM' }
 */
const formatTime = (timeStr) => {
  if (!timeStr) return { time: "", period: "" };
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return {
    time: `${hours}:${minutes}`,
    period: period,
  };
};

/**
 * Helper to get duration in minutes between 'HH:MM:SS' time strings
 */
const getDurationMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  const sParts = startTime.split(":");
  const eParts = endTime.split(":");
  const sMin = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
  const eMin = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);
  return eMin - sMin;
};

/**
 * Helper to format student timetable data grouped by day of week
 */
const formatTimetableEntries = (dbEntries) => {
  const timetableDataGrouped = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  days.forEach((day) => {
    const dayDbEntries = (dbEntries || [])
      .filter((entry) => entry.day === day)
      .map((entry) => {
        const formatted = formatTime(entry.start_time);
        const isBreak =
          entry.subject_name && entry.subject_name.toLowerCase().includes("break");
        return {
          start_time: entry.start_time,
          time: formatted.time,
          period: isBreak ? "" : formatted.period,
          subject: entry.subject_name || "",
          room: entry.room || "",
          teacher: entry.teacher_name || "",
          color: isBreak ? "break" : "primary",
          duration: getDurationMinutes(entry.start_time, entry.end_time),
        };
      });

    dayDbEntries.sort((a, b) => a.start_time.localeCompare(b.start_time));
    timetableDataGrouped[day] = dayDbEntries;
  });

  return timetableDataGrouped;
};

module.exports = {
  formatTime,
  getDurationMinutes,
  formatTimetableEntries,
};
