"use client";

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Play, Lock, CheckCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { lessonAPI } from "../../api";

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
    <View style={styles.container}>
      {/* Course Header */}
      <LinearGradient
        colors={["#8b5cf6", "#ec4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.courseHeader}
      >
        <View style={styles.courseHeaderContent}>
          <View>
            <Text style={styles.courseHeaderTitle}>{course.title}</Text>
            <Text style={styles.courseHeaderSubtitle}>
              {course.lessons.length} lesson
              {course.lessons.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.courseHeaderIconBg}>
            <Text style={styles.courseHeaderIcon}>{course.icon || "📘"}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Lessons List */}
      <View style={styles.lessonsList}>
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
                  <View style={styles.lessonMeta}>
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
                  <View style={styles.lessonProgressBarBg}>
                    <LinearGradient
                      colors={
                        lesson.isCompleted
                          ? ["#22c55e", "#16a34a"]
                          : ["#8b5cf6", "#ec4899"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.lessonProgressBarFill,
                        { width: lesson.isCompleted ? "100%" : "0%" },
                      ]}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  disabled={status === "locked"}
                  style={[
                    styles.playButton,
                    status === "locked" && styles.playButtonLocked,
                    status === "completed" && styles.playButtonCompleted,
                    status === "not-started" && styles.playButtonNotStarted,
                  ]}
                  onPress={() =>
                    status !== "locked" && handleLessonClick(lesson)
                  }
                >
                  <Play size={20} color="white" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#4b5563",
  },
  container: {},

  courseHeader: {
    borderRadius: 24,
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
  courseHeaderIconBg: {
    width: 64,
    height: 64,
    backgroundColor: "white",
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  courseHeaderIcon: {
    fontSize: 32,
  },

  lessonsList: {
    gap: 16,
  },
  lessonCard: {
    backgroundColor: "white",
    borderWidth: 2,
    borderRadius: 24,
    padding: 24,
    transitionDuration: 300,
  },
  lessonCardCompleted: {
    borderColor: "#86efac",
  },
  lessonCardLocked: {
    borderColor: "#d1d5db",
    opacity: 0.7,
  },
  lessonCardNotStarted: {
    borderColor: "#ede9fe",
  },
  lessonCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lessonMeta: {
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
  lessonProgressBarBg: {
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
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    transitionDuration: 300,
  },
  playButtonLocked: {
    backgroundColor: "#e5e7eb",
  },
  playButtonCompleted: {
    backgroundColor: "#22c55e",
  },
  playButtonNotStarted: {
    backgroundColor: "#8b5cf6",
  },
});

export default CourseLessonsList;
