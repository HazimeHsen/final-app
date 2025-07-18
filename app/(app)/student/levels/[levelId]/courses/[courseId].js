"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, Link, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { courseAPI, videoAPI, lessonAPI } from "../../../../../../api";
import CourseLessonsList from "../../../../../../components/CourseLessonsList";
import { AuthContext } from "../../../../../../contexts/AuthContext";

const CourseDetailStudent = () => {
  const { courseId, levelId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState({
    completedCourses: [],
    currentCourse: null,
    totalXP: 0,
  });

  useEffect(() => {
    const fetchCourseDetails = async () => {
      setLoading(true);
      try {
        const courseResponse = await courseAPI.getById(courseId);
        const courseData = courseResponse.data;

        const lessonsResponse = await lessonAPI.getByCourse(courseId);
        const rawLessons = lessonsResponse.data || [];

        const lessons = await Promise.all(
          rawLessons.map(async (lesson) => {
            try {
              const res = await videoAPI.getLessonProgress(lesson.id);
              const { total_videos, completed_videos, is_complete } = res.data;
              return {
                ...lesson,
                totalVideos: total_videos,
                completedVideos: completed_videos,
                isCompleted: is_complete,
              };
            } catch (err) {
              console.warn("Progress fetch failed for lesson", lesson.id);
              return {
                ...lesson,
                totalVideos: 0,
                completedVideos: 0,
                isCompleted: false,
              };
            }
          })
        );

        const totalLessons = lessons.length;
        const completedLessons = lessons.filter((l) => l.isCompleted).length;
        const progress =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        setCourse({
          id: courseData.id,
          title: courseData.title,
          icon: courseData.emoji || "📘",
          lessons,
          totalLessons,
          completedLessons,
          progress,
        });
      } catch (err) {
        console.error("Error fetching course or lessons:", err);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseDetails();
  }, [courseId]);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return styles.difficultyEasy;
      case "Medium":
        return styles.difficultyMedium;
      case "Hard":
        return styles.difficultyHard;
      default:
        return styles.difficultyDefault;
    }
  };

  const getProgressPercentage = (completed, total) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
        </View>
      </LinearGradient>
    );
  }

  if (!course) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Course not found</Text>
          <Link href="/student/dashboard" asChild>
            <TouchableOpacity style={styles.backToLevelsButton}>
              <ArrowLeft size={16} color="#8b5cf6" />
              <Text style={styles.backToLevelsButtonText}>Back to Levels</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </LinearGradient>
    );
  }

  const coursesWithContent = course.lessons.filter(
    (lesson) => lesson.totalVideos > 0
  );
  const completedCoursesCount = coursesWithContent.filter(
    (lesson) => lesson.isCompleted
  ).length;
  const levelProgress = getProgressPercentage(
    completedCoursesCount,
    coursesWithContent.length
  );

  const totalEstimatedHours = course.lessons.reduce(
    (sum, lesson) => sum + (Number.parseInt(lesson.duration_minutes) || 0),
    0
  );
  const totalXPReward = course.lessons.reduce(
    (sum, lesson) => sum + (lesson.xp_reward || 0),
    0
  );

  return (
    <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Breadcrumb */}
        <View style={styles.breadcrumbContainer}>
          <Link href="/student/dashboard" asChild>
            <TouchableOpacity>
              <Text style={styles.breadcrumbLink}>Levels</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.breadcrumbSeparator}>/</Text>
          <Link href={`/student/levels/${levelId}`} asChild>
            <TouchableOpacity>
              <Text style={styles.breadcrumbLink}>Back</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.breadcrumbSeparator}>/</Text>
          <Text style={styles.breadcrumbCurrent}>{course.title}</Text>
        </View>

        {/* Course Header + Progress */}
        <View style={styles.courseHeaderProgressCard}>
          <View style={styles.courseHeaderProgressContent}>
            <Text style={styles.courseHeaderProgressTitle}>{course.title}</Text>
            <Text style={styles.courseHeaderProgressSubtitle}>
              {course.completedLessons} of {course.totalLessons} lessons
              completed
            </Text>
          </View>
          <View style={styles.courseHeaderProgressBarBackground}>
            <View
              style={[
                styles.courseHeaderProgressBarFill,
                { width: `${course.progress}%` },
              ]}
            />
          </View>
        </View>

        <CourseLessonsList
          course={course}
          courseId={course.id}
          levelId={levelId}
        />

        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <Link href={`/student/levels/${levelId}`} asChild>
            <TouchableOpacity style={styles.backButton}>
              <ArrowLeft size={16} color="#8b5cf6" />
              <Text style={styles.backButtonText}>Back to Courses</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingSpinner: {
    height: 48,
    width: 48,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: "#f3f4f6",
    borderBottomColor: "#ea580c",
    transform: [{ rotate: "45deg" }],
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 20,
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  backToLevelsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backToLevelsButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
    marginLeft: 8,
  },
  breadcrumbContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 32,
  },
  breadcrumbLink: {
    color: "#8b5cf6",
  },
  breadcrumbSeparator: {
    color: "#4b5563",
  },
  breadcrumbCurrent: {
    color: "#1f2937",
    fontWeight: "500",
  },
  courseHeaderProgressCard: {
    backgroundColor: "#ffedd5",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  courseHeaderProgressContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseHeaderProgressTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#9a3412",
  },
  courseHeaderProgressSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  courseHeaderProgressBarBackground: {
    width: "100%",
    backgroundColor: "#d1d5db",
    borderRadius: 9999,
    height: 8,
    marginTop: 8,
  },
  courseHeaderProgressBarFill: {
    backgroundColor: "#f97316",
    height: 8,
    borderRadius: 9999,
  },
  backButtonContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
  },
});

export default CourseDetailStudent;
