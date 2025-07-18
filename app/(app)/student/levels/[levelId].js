"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, Link, useRouter } from "expo-router";
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
  TrendingUp,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { levelAPI, courseAPI, videoAPI } from "../../../../api";
import { AuthContext } from "../../../../contexts/AuthContext";

const { width } = Dimensions.get("window");

const LevelDetailStudent = () => {
  const { levelId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [level, setLevel] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState({
    completedCourses: [],
    currentCourse: null,
    totalXP: 0,
  });

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

        const progressResponse = await videoAPI.getBatchCourseProgress(
          courseIds
        );
        const progressMap = progressResponse.data || {};

        const augmentedCourses = fetchedCourses.map((course) => {
          const progress = progressMap[course.id] || {};
          const hasContent = (progress.total_lessons || 0) > 0;
          const isCompleted = hasContent
            ? progress.is_complete || false
            : false;
          return {
            ...course,
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

        const firstUnlocked = augmentedCourses.find(
          (course) => course.isUnlocked
        );
        const completedIds = augmentedCourses
          .filter((c) => c.isCompleted)
          .map((c) => c.id);

        setUserProgress((prev) => ({
          ...prev,
          completedCourses: completedIds,
          currentCourse: firstUnlocked?.id || null,
        }));
        setCourses(augmentedCourses);
      } catch (error) {
        console.error("Failed to fetch level or course data:", error);
        setLevel(null);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLevelAndCourseData();
  }, [levelId, user]);

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
        <View style={styles.contentWrapper}>
          <View style={styles.loadingPlaceholder}>
            <View style={styles.loadingHeader} />
            <View style={styles.loadingCard} />
            <View style={styles.loadingGrid}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={styles.loadingCourseCard} />
              ))}
            </View>
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
      <ScrollView>
        <View style={styles.contentWrapper}>
          {/* Breadcrumb */}
          <View style={styles.breadcrumbContainer}>
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
            style={styles.levelHeaderCard}
          >
            <View style={styles.levelHeaderContent}>
              <View style={styles.levelHeaderLeft}>
                <Text style={styles.levelHeaderEmoji}>{level.emoji}</Text>
                <View>
                  <Text style={styles.levelHeaderTitle}>
                    {level.title} Level
                  </Text>
                  <Text style={styles.levelHeaderDescription}>
                    {level.description}
                  </Text>
                  <View style={styles.levelHeaderStats}>
                    <View style={styles.levelHeaderStatItem}>
                      <BookOpen size={16} color="white" />
                      <Text style={styles.levelHeaderStatText}>
                        {courses.length} Course{courses.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <View style={styles.levelHeaderStatItem}>
                      <Clock size={16} color="white" />
                      <Text style={styles.levelHeaderStatText}>
                        {totalEstimatedHours} min
                      </Text>
                    </View>
                    <View style={styles.levelHeaderStatItem}>
                      <Star size={16} color="white" />
                      <Text style={styles.levelHeaderStatText}>
                        {totalXPReward} XP Total
                      </Text>
                    </View>
                    {level.is_paid === 1 && (
                      <View style={styles.levelHeaderStatItem}>
                        <Text style={styles.levelHeaderPrice}>
                          ${level.price}
                        </Text>
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
                <View style={styles.levelProgressBarBackground}>
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
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, styles.statIconBgGreen]}>
                  <CheckCircle size={24} color="#16a34a" />
                </View>
                <View>
                  <Text style={styles.statValue}>{completedCoursesCount}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, styles.statIconBgBlue]}>
                  <Play size={24} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.statValue}>
                    {
                      courses.filter((c) => c.isUnlocked && !c.isCompleted)
                        .length
                    }
                  </Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statCard, styles.statCardGray]}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, styles.statIconBgGray]}>
                  <Lock size={24} color="#4b5563" />
                </View>
                <View>
                  <Text style={styles.statValue}>
                    {courses.filter((c) => !c.isUnlocked).length}
                  </Text>
                  <Text style={styles.statLabel}>Locked</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statCard, styles.statCardOrange]}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, styles.statIconBgOrange]}>
                  <Trophy size={24} color="#ea580c" />
                </View>
                <View>
                  <Text style={styles.statValue}>
                    {courses.reduce(
                      (sum, course) =>
                        sum + (course.isCompleted ? course.xpReward : 0),
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>XP Earned</Text>
                </View>
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
              const isCurrentCourse = course.id === userProgress.currentCourse;
              console.log(
                course.hasContent
                  ? `/student/levels/${levelId}/courses/${course.id}`
                  : "#"
              );

              return (
                <View key={course.id} style={styles.courseCardWrapper}>
                  <View
                    style={[
                      styles.courseCard,
                      course.isUnlocked
                        ? styles.courseCardUnlocked
                        : styles.courseCardLocked,
                      isCurrentCourse && styles.courseCardCurrent,
                    ]}
                  >
                    {/* Lock Overlay for Locked Courses */}
                    {!course.isUnlocked && (
                      <View style={styles.courseLockedOverlay}>
                        <View style={styles.courseLockedContent}>
                          <Lock
                            size={32}
                            color="#9ca3af"
                            style={styles.courseLockedIcon}
                          />
                          <Text style={styles.courseLockedText}>
                            Complete previous courses
                          </Text>
                        </View>
                      </View>
                    )}
                    {/* Current Course Badge */}
                    {isCurrentCourse && (
                      <LinearGradient
                        colors={["#8b5cf6", "#ec4899"]}
                        style={styles.currentCourseBadge}
                      >
                        <Text style={styles.currentCourseBadgeText}>
                          CURRENT
                        </Text>
                      </LinearGradient>
                    )}
                    {/* Completed Badge */}
                    {course.isCompleted && course.hasContent && (
                      <View style={styles.courseCompletedBadge}>
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
                        <Text style={styles.courseProgressBarLabel}>
                          Progress
                        </Text>
                        <Text style={styles.courseProgressBarValue}>
                          {progressPercentage}%
                        </Text>
                      </View>
                      <View style={styles.courseProgressBarBackground}>
                        <View
                          style={[
                            styles.courseProgressBarFill,
                            { width: `${progressPercentage}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.courseProgressBarCount}>
                        {course.completedChapters} of {course.chapters} chapters
                      </Text>
                    </View>
                    {/* Course Stats */}
                    <View style={styles.courseStats}>
                      <View style={styles.courseStatItem}>
                        <View style={styles.courseStatIconText}>
                          <BookOpen size={16} color="#6b7280" />
                          <Text style={styles.courseStatLabel}>Chapters</Text>
                        </View>
                        <Text style={styles.courseStatValue}>
                          {course.chapters}
                        </Text>
                      </View>
                      <View style={styles.courseStatItem}>
                        <View style={styles.courseStatIconText}>
                          <Clock size={16} color="#6b7280" />
                          <Text style={styles.courseStatLabel}>Duration</Text>
                        </View>
                        <Text style={styles.courseStatValue}>
                          {course.duration}
                        </Text>
                      </View>
                      <View style={styles.courseStatItem}>
                        <View style={styles.courseStatIconText}>
                          <TrendingUp size={16} color="#6b7280" />
                          <Text style={styles.courseStatLabel}>Difficulty</Text>
                        </View>
                        <Text
                          style={[
                            styles.difficultyBadge,
                            getDifficultyColor(course.difficulty),
                          ]}
                        >
                          {course.difficulty}
                        </Text>
                      </View>
                      <View style={styles.courseStatItem}>
                        <View style={styles.courseStatIconText}>
                          <Star size={16} color="#6b7280" />
                          <Text style={styles.courseStatLabel}>XP Reward</Text>
                        </View>
                        <Text style={styles.courseStatValue}>
                          {course.xpReward} XP
                        </Text>
                      </View>
                    </View>
                    {/* Action Button */}
                    {course.isUnlocked && course.hasContent ? (
                      <Link
                        href={
                          course.hasContent
                            ? `/student/levels/${levelId}/courses/${course.id}`
                            : "#"
                        }
                        style={[
                          styles.courseActionButton,
                          !course.hasContent &&
                            styles.courseActionButtonDisabled,
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
                      <TouchableOpacity
                        disabled
                        style={styles.courseLockedButton}
                      >
                        <Lock size={16} color="#6b7280" />
                        <Text style={styles.courseLockedButtonText}>
                          Locked
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Level Completion Reward */}
          {levelProgress === 100 && (
            <LinearGradient
              colors={["#22c55e", "#10b981"]}
              style={styles.levelCompletionCard}
            >
              <Award
                size={64}
                color="white"
                style={styles.levelCompletionIcon}
              />
              <Text style={styles.levelCompletionTitle}>
                🎉 Level Completed!
              </Text>
              <Text style={styles.levelCompletionMessage}>
                Congratulations! You've mastered the {level.title} level. Ready
                for the next challenge?
              </Text>
              <Link href="/student/dashboard" asChild>
                <TouchableOpacity style={styles.levelCompletionButton}>
                  <Text style={styles.levelCompletionButtonText}>
                    Continue to Next Level
                  </Text>
                  <ArrowRight size={16} color="#16a34a" />
                </TouchableOpacity>
              </Link>
            </LinearGradient>
          )}

          {/* Back to Levels Button */}
          <View style={styles.backToAllLevelsContainer}>
            <Link href="/student/dashboard" asChild>
              <TouchableOpacity style={styles.backToAllLevelsButton}>
                <ArrowLeft size={16} color="#8b5cf6" />
                <Text style={styles.backToAllLevelsButtonText}>
                  Back to All Levels
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
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
  loadingPlaceholder: {
    flex: 1,
    padding: 16,
  },
  loadingHeader: {
    height: 32,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    width: "25%",
    marginBottom: 32,
  },
  loadingCard: {
    backgroundColor: "#e5e7eb",
    borderRadius: 16,
  },
  loadingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 24,
  },
  loadingCourseCard: {
    width: "100%",
    height: 256,
    backgroundColor: "#e5e7eb",
    borderRadius: 16,
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
    marginBottom: 32,
  },
  breadcrumbLink: {
    fontSize: 14,
    color: "#4b5563",
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
    color: "#4b5563",
  },
  breadcrumbCurrent: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  levelHeaderCard: {
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
  },
  levelHeaderContent: {
    flexDirection: "column",
    alignItems: "flex-start",

    ...(width > 1024 && {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }),
  },
  levelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    ...(width > 1024 && {
      marginBottom: 0,
    }),
    gap: 16,
  },
  levelHeaderEmoji: {
    fontSize: 64,
  },
  levelHeaderTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  levelHeaderDescription: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
  },
  levelHeaderStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    fontSize: 14,
  },
  levelHeaderStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelHeaderStatText: {
    color: "white",
  },
  levelHeaderPrice: {
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
    textAlign: "center",
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
  levelProgressBarBackground: {
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
    width: "100%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
  },
  statCardGreen: { borderColor: "#f3e8ff" },
  statCardBlue: { borderColor: "#eff6ff" },
  statCardGray: { borderColor: "#f9fafb" },
  statCardOrange: { borderColor: "#fff7ed" },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconBg: {
    padding: 12,
    borderRadius: 9999,
  },
  statIconBgGreen: { backgroundColor: "#dcfce7" },
  statIconBgBlue: { backgroundColor: "#dbeafe" },
  statIconBgGray: { backgroundColor: "#f3f4f6" },
  statIconBgOrange: { backgroundColor: "#ffedd5" },
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
    justifyContent: "space-between",
    gap: 24,
  },
  courseCardWrapper: {
    width: width > 1024 ? "31%" : width > 768 ? "48%" : "100%",
    marginBottom: 24,
  },
  courseCard: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
  },
  courseCardUnlocked: {
    borderColor: "#f3e8ff",
  },
  courseCardLocked: {
    borderColor: "#e5e7eb",
    opacity: 0.6,
  },
  courseCardCurrent: {
    borderColor: "#a78bfa",
  },
  courseLockedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(249, 250, 251, 0.9)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  courseLockedContent: {
    alignItems: "center",
  },
  courseLockedIcon: {
    height: 32,
    width: 32,
    color: "#9ca3af",
    marginBottom: 8,
  },
  courseLockedText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  currentCourseBadge: {
    position: "absolute",
    top: -12,
    right: -12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  currentCourseBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  courseCompletedBadge: {
    position: "absolute",
    top: -12,
    right: -12,
    backgroundColor: "#22c55e",
    padding: 8,
    borderRadius: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  courseContent: {
    textAlign: "center",
    marginBottom: 16,
    alignItems: "center",
  },
  courseEmoji: {
    fontSize: 40,
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
    lineHeight: 20,
    textAlign: "center",
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
  courseProgressBarBackground: {
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
  },
  courseProgressBarFill: {
    backgroundColor: "#8b5cf6",
    height: 8,
    borderRadius: 9999,
  },
  courseProgressBarCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  courseStats: {
    gap: 8,
    marginBottom: 16,
  },
  courseStatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseStatIconText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  courseStatLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  courseStatValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  difficultyBadge: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  difficultyEasy: { color: "#16a34a", backgroundColor: "#dcfce7" },
  difficultyMedium: { color: "#ca8a04", backgroundColor: "#fefce8" },
  difficultyHard: { color: "#dc2626", backgroundColor: "#fee2e2" },
  difficultyDefault: { color: "#4b5563", backgroundColor: "#f3f4f6" },
  courseActionButton: {
    width: "100%",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
    textAlign: "center",
    justifyContent: "center",
    gap: 8,
  },
  courseActionButtonDisabled: {
    opacity: 0.75,
  },
  courseActionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
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
    gap: 8,
  },
  courseLockedButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },
  levelCompletionCard: {
    marginTop: 48,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    textAlign: "center",
  },
  levelCompletionIcon: {
    height: 64,
    width: 64,
    marginBottom: 16,
  },
  levelCompletionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  levelCompletionMessage: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 24,
    textAlign: "center",
  },
  levelCompletionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    fontWeight: "500",
  },
  levelCompletionButtonText: {
    color: "#16a34a",
    fontSize: 16,
    fontWeight: "500",
  },
  backToAllLevelsContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  backToAllLevelsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backToAllLevelsButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
  },
});

export default LevelDetailStudent;
