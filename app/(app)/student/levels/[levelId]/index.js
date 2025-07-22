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
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  BookOpen,
  Play,
  Lock,
  CheckCircle,
  Clock,
  Star,
  Trophy,
  ArrowRight,
  Award,
} from "lucide-react-native";

import { levelAPI, courseAPI, videoAPI } from "../../../../../api";

const LevelDetailStudent = () => {
  const searchParams = useLocalSearchParams();
  const levelIdParam = searchParams?.levelId;
  const levelId = levelIdParam ? Number.parseInt(levelIdParam, 10) : null;

  const router = useRouter();

  const [level, setLevel] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevelAndCourseData = async () => {
      setLoading(true);
      try {
        const levelResponse = await levelAPI.getById(levelId);
        if (levelResponse.data) {
          setLevel({
            id: levelResponse.data.id,
            title: levelResponse.data.name,
            description:
              levelResponse.data.description || "Explore this exciting level!",
            emoji: levelResponse.data.emoji || "✨",
            is_paid: levelResponse.data.is_paid,
            price: levelResponse.data.price,
          });
        }

        const coursesResponse = await courseAPI.getCoursesByLevel(levelId);
        const fetchedCourses = coursesResponse.data || [];
        const courseIds = fetchedCourses.map((c) => c.id);

        let progressMap = {};
        if (courseIds.length > 0) {
          const progressResponse = await videoAPI.getBatchCourseProgress(
            courseIds
          );
          progressMap = progressResponse.data || {};
        }

        const augmentedCourses = fetchedCourses.map((course) => {
          const progress = progressMap[course.id] || {};
          const hasContent = (progress.total_lessons || 0) > 0;
          const isCompleted = hasContent
            ? progress.is_complete || false
            : false;

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            duration: `${course.duration || 10} min`,
            emoji: "📘",
            isCompleted,
            isUnlocked: true,
            completedChapters: progress.completed_lessons || 0,
            chapters: progress.total_lessons || 0,
            hasContent,
            xpReward: course.xp_reward || 0,
            difficulty: course.difficulty || "Medium",
          };
        });
        setCourses(augmentedCourses);
      } catch (error) {
        console.error("Failed to fetch level or course data:", error);
        setLevel(null);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (levelId) {
      fetchLevelAndCourseData();
    }
  }, [levelId]);

  const getProgressPercentage = (completed, total) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (!levelId || isNaN(levelId)) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Invalid Level ID</Text>
        <Link href="/student/dashboard" asChild>
          <TouchableOpacity style={styles.backToLevelsButton}>
            <ArrowLeft size={16} color="#8b5cf6" />
            <Text style={styles.backToLevelsButtonText}>Back to Levels</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading level details...</Text>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonGrid}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.skeletonCourseCard} />
            ))}
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!level) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Level not found</Text>
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

  const coursesWithContent = courses.filter((course) => course.hasContent);
  const completedCoursesCount = coursesWithContent.filter(
    (course) => course.isCompleted
  ).length;
  const levelProgress = getProgressPercentage(
    completedCoursesCount,
    coursesWithContent.length
  );

  const totalEstimatedHours = courses.reduce(
    (sum, course) => sum + (Number.parseInt(course.duration) || 0),
    0
  );
  const totalXPReward = courses.reduce(
    (sum, course) => sum + (course.xpReward || 0),
    0
  );

  return (
    <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <Link href="/student/dashboard" asChild>
            <TouchableOpacity>
              <Text style={styles.breadcrumbLink}>Levels</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.breadcrumbSeparator}>/</Text>
          <Text style={styles.breadcrumbCurrent}>{level.title}</Text>
        </View>

        {/* Level Header */}
        <LinearGradient
          colors={["#8b5cf6", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.levelHeaderCard}
        >
          <View style={styles.levelHeaderContent}>
            <View style={styles.levelHeaderLeft}>
              <Text style={styles.levelEmoji}>{level.emoji}</Text>
              <View>
                <Text style={styles.levelTitle}>{level.title} Level</Text>
                <Text style={styles.levelDescription}>
                  {level.description || "No description available"}
                </Text>
                <View style={styles.levelStatsRow}>
                  <View style={styles.levelStatItem}>
                    <BookOpen size={16} color="white" />
                    <Text style={styles.levelStatText}>
                      {courses.length} Course{courses.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.levelStatItem}>
                    <Clock size={16} color="white" />
                    <Text style={styles.levelStatText}>
                      {totalEstimatedHours} min
                    </Text>
                  </View>
                  {level.is_paid && (
                    <View style={styles.levelStatItem}>
                      <Text style={styles.levelPriceBadge}>${level.price}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.levelProgressBox}>
              <Text style={styles.levelProgressPercentage}>
                {levelProgress}%
              </Text>
              <Text style={styles.levelProgressLabel}>Level Progress</Text>
              <View style={styles.levelProgressBarBg}>
                <View
                  style={[
                    styles.levelProgressBarFill,
                    { width: `${levelProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.levelProgressCount}>
                {completedCoursesCount} of {coursesWithContent.length} course
                {coursesWithContent.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Progress Stats */}
        <View style={styles.progressStatsGrid}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={styles.statIconBgGreen}>
              <CheckCircle size={24} color="#10b981" />
            </View>
            <View>
              <Text style={styles.statValue}>{completedCoursesCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <View style={styles.statIconBgBlue}>
              <Play size={24} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.statValue}>
                {courses.filter((c) => c.isUnlocked && !c.isCompleted).length}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardGray]}>
            <View style={styles.statIconBgGray}>
              <Lock size={24} color="#6b7280" />
            </View>
            <View>
              <Text style={styles.statValue}>
                {courses.filter((c) => !c.isUnlocked).length}
              </Text>
              <Text style={styles.statLabel}>Locked</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardOrange]}>
            <View style={styles.statIconBgOrange}>
              <Trophy size={24} color="#f59e0b" />
            </View>
          </View>
        </View>

        {/* Courses Grid */}
        <View style={styles.coursesGrid}>
          {courses.map((course, index) => {
            const progressPercentage = getProgressPercentage(
              course.completedChapters,
              course.chapters
            );
            return (
              <View
                key={course.id}
                style={[
                  styles.courseCard,
                  course.isUnlocked
                    ? styles.courseCardUnlocked
                    : styles.courseCardLocked,
                ]}
              >
                {/* Lock Overlay for Locked Courses */}
                {!course.isUnlocked && (
                  <View style={styles.lockedOverlay}>
                    <View style={styles.lockedContent}>
                      <Lock size={32} color="#9ca3af" />
                      <Text style={styles.lockedText}>
                        Complete previous courses
                      </Text>
                    </View>
                  </View>
                )}
                {/* Completed Badge */}
                {course.isCompleted && course.hasContent && (
                  <View style={styles.completedBadge}>
                    <CheckCircle size={16} color="white" />
                  </View>
                )}
                {/* Course Content */}
                <View style={styles.courseContent}>
                  <Text style={styles.courseEmoji}>{course.emoji}</Text>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseDescription}>
                    {course.description}
                  </Text>
                </View>
                {/* Progress Bar - Always show */}
                <View style={styles.courseProgressBarContainer}>
                  <View style={styles.courseProgressBarHeader}>
                    <Text style={styles.courseProgressBarLabel}>Progress</Text>
                    <Text style={styles.courseProgressBarValue}>
                      {progressPercentage}%
                    </Text>
                  </View>
                  <View style={styles.courseProgressBarBg}>
                    <LinearGradient
                      colors={["#8b5cf6", "#ec4899"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.courseProgressBarFill,
                        { width: `${progressPercentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.courseProgressCount}>
                    {course.completedChapters} of {course.chapters} chapters
                  </Text>
                </View>
                {/* Course Stats */}
                <View style={styles.courseStatsContainer}>
                  <View style={styles.courseStatItem}>
                    <BookOpen size={16} color="#6b7280" />
                    <Text style={styles.courseStatLabel}>Chapters</Text>
                    <Text style={styles.courseStatValue}>
                      {course.chapters}
                    </Text>
                  </View>
                  <View style={styles.courseStatItem}>
                    <Clock size={16} color="#6b7280" />
                    <Text style={styles.courseStatLabel}>Duration</Text>
                    <Text style={styles.courseStatValue}>
                      {course.duration}
                    </Text>
                  </View>
                </View>
                {/* Action Button */}
                {course.isUnlocked ? (
                  <Link
                    href={
                      course.hasContent
                        ? `/student/levels/${levelId}/courses/${course.id}`
                        : "#"
                    }
                    style={[
                      styles.courseActionButton,
                      !course.hasContent && styles.courseActionButtonDisabled,
                    ]}
                  >
                    <Text style={styles.courseActionButtonText}>
                      {course.isCompleted
                        ? "Review Course"
                        : progressPercentage > 0
                        ? "Continue"
                        : "Start Course"}
                    </Text>
                  </Link>
                ) : (
                  <TouchableOpacity disabled style={styles.courseLockedButton}>
                    <Lock size={16} color="#6b7280" />
                    <Text style={styles.courseLockedButtonText}>Locked</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Level Completion Reward */}
        {levelProgress === 100 && (
          <LinearGradient
            colors={["#10b981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.levelCompletedCard}
          >
            <Award size={64} color="white" style={styles.levelCompletedIcon} />
            <Text style={styles.levelCompletedTitle}>🎉 Level Completed!</Text>
            <Text style={styles.levelCompletedSubtitle}>
              Congratulations! You've mastered the {level.title} level. Ready
              for the next challenge?
            </Text>
            <Link href="/student/dashboard" asChild>
              <TouchableOpacity style={styles.continueNextLevelButton}>
                <Text style={styles.continueNextLevelButtonText}>
                  Continue to Next Level
                </Text>
                <ArrowRight size={16} color="#10b981" />
              </TouchableOpacity>
            </Link>
          </LinearGradient>
        )}

        {/* Back to Levels Button */}
        <View style={styles.backToAllLevelsContainer}>
          <Link href="/student/dashboard" asChild>
            <TouchableOpacity style={styles.backToLevelsButton}>
              <ArrowLeft size={16} color="#8b5cf6" />
              <Text style={styles.backToLevelsButtonText}>
                Back to All Levels
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
    maxWidth: 1200,
    alignSelf: "center",
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
  skeletonHeader: {
    height: 32,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    width: "25%",
    marginBottom: 32,
  },
  skeletonCard: {
    height: 200,
    backgroundColor: "#e5e7eb",
    borderRadius: 24,
    marginBottom: 32,
    width: "100%",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 24,
  },
  skeletonCourseCard: {
    height: 256,
    backgroundColor: "#e5e7eb",
    borderRadius: 24,
    width: "100%",
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  levelHeaderCard: {
    borderRadius: 24,
    padding: 6,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  levelHeaderContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  levelEmoji: {
    fontSize: 48,
  },
  levelTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  levelDescription: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
  },
  levelStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  levelStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelStatText: {
    fontSize: 14,
    color: "white",
  },
  levelPriceBadge: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.3)",
    color: "white",
  },
  levelProgressBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  levelProgressPercentage: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  levelProgressLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 12,
  },
  levelProgressBarBg: {
    width: 128,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 9999,
    height: 8,
  },
  levelProgressBarFill: {
    backgroundColor: "white",
    height: 8,
    borderRadius: 9999,
  },
  levelProgressCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
  },

  progressStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 150,
  },
  statCardGreen: { borderColor: "#dcfce7" },
  statCardBlue: { borderColor: "#eff6ff" },
  statCardGray: { borderColor: "#f3f4f6" },
  statCardOrange: { borderColor: "#fff7ed" },
  statIconBgGreen: {
    padding: 12,
    backgroundColor: "#dcfce7",
    borderRadius: 9999,
  },
  statIconBgBlue: {
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 9999,
  },
  statIconBgGray: {
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 9999,
  },
  statIconBgOrange: {
    padding: 12,
    backgroundColor: "#fff7ed",
    borderRadius: 9999,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 14,
    color: "#4b5563",
  },

  coursesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  courseCard: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,

    justifyContent: "space-between",
    width: "100%",
    maxWidth: 380,
    marginHorizontal: 12,
    marginBottom: 24,
  },
  courseCardUnlocked: {
    borderColor: "#ede9fe",
  },
  courseCardLocked: {
    borderColor: "#e5e7eb",
    opacity: 0.6,
  },
  lockedOverlay: {
    position: "absolute",
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(249, 250, 251, 0.9)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  lockedContent: {
    alignItems: "center",
  },
  lockedText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },
  completedBadge: {
    position: "absolute",
    top: -12,
    right: -12,
    backgroundColor: "#22c55e",
    color: "white",
    padding: 8,
    borderRadius: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 50,
  },
  courseContent: {
    alignItems: "center",
    marginBottom: 16,
  },
  courseEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  courseDescription: {
    color: "#4b5563",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  courseProgressBarContainer: {
    marginBottom: 16,
  },
  courseProgressBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseProgressBarLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  courseProgressBarValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  courseProgressBarBg: {
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
  },
  courseProgressBarFill: {
    height: 8,
    borderRadius: 9999,
  },
  courseProgressCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  courseStatsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  courseStatItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courseStatLabel: {
    fontSize: 14,
    color: "#4b5563",
    marginLeft: 8,
  },
  courseStatValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  courseActionButton: {
    width: "100%",
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  courseActionButtonDisabled: {
    opacity: 0.75,
  },
  courseActionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  courseActionButtonIcon: {
    marginLeft: 8,
  },
  courseLockedButton: {
    width: "100%",
    backgroundColor: "#d1d5db",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  courseLockedButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },

  levelCompletedCard: {
    marginTop: 48,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    textAlign: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  levelCompletedIcon: {
    marginBottom: 16,
  },
  levelCompletedTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  levelCompletedSubtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 24,
    textAlign: "center",
  },
  continueNextLevelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  continueNextLevelButtonText: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "500",
    marginRight: 8,
  },

  backToAllLevelsContainer: {
    marginTop: 32,
    alignItems: "center",
  },
});

export default LevelDetailStudent;
