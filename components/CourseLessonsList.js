"use client";

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Play, Lock, CheckCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { lessonAPI } from "../api";

const CourseLessonsList = ({
  course,
  courseId,
  levelId,
  isPremium = false,
}) => {
  const router = useRouter();

  const handleLessonClick = async (lesson) => {
    if (lesson.isLocked && !isPremium) {
      router.push("/student/payment");
      return;
    }
    try {
      const res = await lessonAPI.getVideos(lesson.id);
      const videos = res.data?.videos;
      if (videos && videos.length > 0) {
        router.push(
          `/student/levels/${levelId}/courses/${courseId}/lessons/${lesson.id}/video/${videos[0].id}`
        );
      } else {
        console.warn(`No videos found for lesson ${lesson.id}`);
      }
    } catch (err) {
      console.error("Failed to fetch lesson videos", err);
    }
  };

  const getLessonStatus = (lesson) => {
    if (lesson.isLocked && !isPremium) return "locked";
    if (lesson.isCompleted) return "completed";
    return "not-started";
  };

  if (!course || !course.lessons) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading lessons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {/* Course Header */}
      <LinearGradient
        colors={["#fbbf24", "#f97316"]}
        style={styles.courseHeader}
      >
        <View style={styles.courseHeaderContent}>
          <View>
            <Text style={styles.courseHeaderTitle}>{course.title}</Text>
            <Text style={styles.courseHeaderSubtitle}>
              {course.lessons.length} lessons
            </Text>
          </View>
          <View style={styles.courseHeaderIconContainer}>
            <Text style={styles.courseHeaderIcon}>{course.icon || "📘"}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Lessons List */}
      {course.lessons.map((lesson, index) => {
        const status = getLessonStatus(lesson);
        return (
          <TouchableOpacity
            key={lesson.id}
            onPress={() => status !== "locked" && handleLessonClick(lesson)}
            disabled={status === "locked"}
            style={[
              styles.lessonCard,
              status === "completed" && styles.lessonCardCompleted,
              status === "locked" && styles.lessonCardLocked,
              status === "not-started" && styles.lessonCardNotStarted,
            ]}
          >
            <View style={styles.lessonCardContent}>
              <View>
                <View style={styles.lessonStatusRow}>
                  <Text style={styles.lessonNumber}>Lesson {index + 1}</Text>
                  {status === "completed" && (
                    <CheckCircle size={20} color="#22c55e" />
                  )}
                  {status === "locked" && <Lock size={20} color="#9ca3af" />}
                </View>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDuration}>
                  {lesson.duration_minutes} min
                </Text>
                <View style={styles.lessonProgressBarBackground}>
                  <View
                    style={[
                      styles.lessonProgressBarFill,
                      { width: `${lesson.isCompleted ? 100 : 0}%` },
                      lesson.isCompleted
                        ? styles.lessonProgressBarFillCompleted
                        : styles.lessonProgressBarFillNotCompleted,
                    ]}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={() => status !== "locked" && handleLessonClick(lesson)}
                disabled={status === "locked"}
                style={[
                  styles.playButton,
                  status === "locked" && styles.playButtonLocked,
                  status === "completed" && styles.playButtonCompleted,
                  status === "not-started" && styles.playButtonNotStarted,
                ]}
              >
                <Play size={20} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#4b5563",
  },
  listContainer: {
    gap: 16,
  },
  courseHeader: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  courseHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courseHeaderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  courseHeaderSubtitle: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  courseHeaderIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: "white",
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  courseHeaderIcon: {
    fontSize: 32,
  },
  lessonCard: {
    backgroundColor: "white",
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    transitionDuration: 300,
  },
  lessonCardCompleted: {
    borderColor: "#90ee90",
  },
  lessonCardLocked: {
    borderColor: "#d1d5db",
    opacity: 0.7,
  },
  lessonCardNotStarted: {
    borderColor: "#fdba74",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lessonCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lessonStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  lessonNumber: {
    fontSize: 14,
    color: "#4b5563",
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  lessonDuration: {
    fontSize: 14,
    color: "#6b7280",
  },
  lessonProgressBarBackground: {
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
    marginTop: 8,
  },
  lessonProgressBarFill: {
    height: 8,
    borderRadius: 9999,
  },
  lessonProgressBarFillCompleted: {
    backgroundColor: "#22c55e",
  },
  lessonProgressBarFillNotCompleted: {
    backgroundColor: "#f97316",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    transitionDuration: 300,
  },
  playButtonLocked: {
    backgroundColor: "#e5e7eb",
  },
  playButtonCompleted: {
    backgroundColor: "#22c55e",
  },
  playButtonNotStarted: {
    backgroundColor: "#f97316",
  },
});

export default CourseLessonsList;
