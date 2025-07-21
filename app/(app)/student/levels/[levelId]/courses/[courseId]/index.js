"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, Link, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { lessonAPI, courseAPI, videoAPI } from "../../../../../../../api";
import CourseLessonsList from "../../../../../../../components/common/CourseLessonList";

const CourseDetailStudent = () => {
  const { courseId: courseIdParam, levelId: levelIdParam } =
    useLocalSearchParams();
  const courseId = Number.parseInt(courseIdParam, 10);
  const levelId = Number.parseInt(levelIdParam, 10);

  const router = useRouter();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading course details...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Course not found</Text>
        <Link href="/student/levels" asChild>
          <TouchableOpacity style={styles.backToLevelsButton}>
            <ArrowLeft size={16} color="#8b5cf6" />
            <Text style={styles.backToLevelsButtonText}>Back to Levels</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.innerContainer}>
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
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
        <View style={styles.courseHeaderCard}>
          <View style={styles.courseHeaderContent}>
            <Text style={styles.courseHeaderTitle}>{course.title}</Text>
            <Text style={styles.courseHeaderProgressText}>
              {course.completedLessons} of {course.totalLessons} lessons
              completed
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={["#8b5cf6", "#ec4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${course.progress}%` }]}
            />
          </View>
        </View>

        {/* Lessons List */}
        <CourseLessonsList
          course={course}
          courseId={course.id}
          levelId={levelId}
        />

        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <Link href={`/student/levels/${levelId}`} asChild>
            <TouchableOpacity style={styles.backToCoursesButton}>
              <ArrowLeft size={16} color="#8b5cf6" />
              <Text style={styles.backToCoursesButtonText}>
                Back to Courses
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  innerContainer: {
    width: "100%",
    maxWidth: 1200,
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4b5563",
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
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backToLevelsButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
    marginLeft: 8,
  },

  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  breadcrumbLink: {
    fontSize: 14,
    color: "#4b5563",
  },
  breadcrumbSeparator: {
    fontSize: 14,
    color: "#4b5563",
    marginHorizontal: 8,
  },
  breadcrumbCurrent: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },

  courseHeaderCard: {
    backgroundColor: "#f3e8ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  courseHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseHeaderTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6d28d9",
  },
  courseHeaderProgressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  progressBarBg: {
    width: "100%",
    backgroundColor: "#d1d5db",
    borderRadius: 9999,
    height: 8,
    marginTop: 8,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 9999,
  },

  backButtonContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  backToCoursesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backToCoursesButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
    marginLeft: 8,
  },
});

export default CourseDetailStudent;
