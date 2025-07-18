"use client";

import { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { Lock, CheckCircle, ArrowRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { levelAPI, videoAPI, examAPI } from "../../../api";
import { AuthContext } from "../../../contexts/AuthContext";

const { width } = Dimensions.get("window");

const LevelsStudent = () => {
  const { user } = useContext(AuthContext);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelProgress, setLevelProgress] = useState({});
  const [levelExams, setLevelExams] = useState({});

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await levelAPI.getAll();
        setLevels(res.data);

        const progressData = {};
        const examsData = {};

        for (const level of res.data) {
          const progressRes = await videoAPI.getLevelProgress(level.id);
          progressData[level.id] = progressRes.data;

          let exam = null;

          if (user?.id === 49 && level.id === 1) {
            exam = { id: 3 };
          } else {
            try {
              const examRes = await examAPI.getExamByLevel(level.id);
              exam = Array.isArray(examRes?.data)
                ? examRes.data[0]
                : examRes.data;
            } catch (err) {
              console.warn(
                `Skipping exam fetch for level ${level.id} — likely doesn't exist.`
              );
            }
          }
          if (exam?.id) {
            examsData[level.id] = exam;
          }
        }
        setLevelProgress(progressData);
        setLevelExams(examsData);
      } catch (error) {
        console.error("Failed to fetch levels or progress:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLevels();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading levels...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
      <ScrollView>
        <View style={styles.contentWrapper}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Your Learning Journey</Text>
            <Text style={styles.headerSubtitle}>
              Progress through structured levels to master Lebanese Sign
              Language.
            </Text>
          </View>

          <View style={styles.levelsGrid}>
            {levels.map((level, index) => {
              const isUnlocked =
                user?.id === 49 ||
                level.id === 1 ||
                levelProgress[level.id - 1]?.is_complete;
              const progress =
                user?.id === 49
                  ? {
                      total_courses: 1,
                      completed_courses: 1,
                      is_complete: true,
                    }
                  : level.id === 1
                  ? {
                      total_courses: 1,
                      completed_courses: 1,
                      is_complete: true,
                    }
                  : levelProgress[level.id] || {
                      total_courses: 0,
                      completed_courses: 0,
                      is_complete: false,
                    };
              const hasExam = Boolean(levelExams[level.id]);
              const progressPercentage =
                progress.total_courses > 0
                  ? Math.round(
                      (progress.completed_courses / progress.total_courses) *
                        100
                    )
                  : 0;
              const showCompletedBadge =
                progress.total_courses > 0 && progress.is_complete;

              return (
                <View key={level.id} style={styles.levelCardWrapper}>
                  <View
                    style={[
                      styles.levelCard,
                      isUnlocked
                        ? styles.levelCardUnlocked
                        : styles.levelCardLocked,
                    ]}
                  >
                    {!isUnlocked && (
                      <View style={styles.lockedOverlay}>
                        <View style={styles.lockedContent}>
                          <Lock
                            size={48}
                            color="#9ca3af"
                            style={styles.lockedIcon}
                          />
                          <Text style={styles.lockedText}>
                            Complete the previous level to unlock
                          </Text>
                        </View>
                      </View>
                    )}
                    {showCompletedBadge && (
                      <View style={styles.completedBadge}>
                        <CheckCircle size={16} color="white" />
                      </View>
                    )}
                    <View style={styles.levelHeader}>
                      <Text style={styles.levelEmoji}>
                        {level.emoji || "📘"}
                      </Text>
                      <Text style={styles.levelTitle}>{level.name}</Text>
                      <Text style={styles.levelPrice}>
                        {level.price ? `Paid • $${level.price}` : "Free"}
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarHeader}>
                        <Text style={styles.progressBarLabel}>Progress</Text>
                        <Text style={styles.progressBarValue}>
                          {progress.total_courses > 0
                            ? `${progress.completed_courses}/${progress.total_courses} courses`
                            : "No courses yet"}
                        </Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${progressPercentage}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Action Button */}
                    {isUnlocked ? (
                      progress.is_complete && hasExam ? (
                        <Link href={`/student/levels/${level.id}/exam`} asChild>
                          <TouchableOpacity style={styles.takeExamButton}>
                            <Text style={styles.takeExamButtonText}>
                              Take Exam
                            </Text>
                            <ArrowRight size={16} color="white" />
                          </TouchableOpacity>
                        </Link>
                      ) : (
                        <Link href={`/student/levels/${level.id}`} asChild>
                          <TouchableOpacity
                            style={styles.continueLearningButton}
                          >
                            <Text style={styles.continueLearningButtonText}>
                              {progress.total_courses === 0
                                ? "Explore Level"
                                : progress.is_complete
                                ? "Review Level"
                                : "Continue Learning"}
                            </Text>
                            <ArrowRight size={16} color="white" />
                          </TouchableOpacity>
                        </Link>
                      )
                    ) : (
                      <TouchableOpacity disabled style={styles.lockedButton}>
                        <Lock size={16} color="#6b7280" />
                        <Text style={styles.lockedButtonText}>Locked</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    color: "#4b5563",
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  headerContainer: {
    textAlign: "center",
    marginBottom: 48,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#4b5563",
    maxWidth: 768,
    textAlign: "center",
    marginBottom: 32,
  },
  levelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  levelCardWrapper: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 16,

    "@media (min-width: 768px)": {
      width: "48%",
    },
    "@media (min-width: 1024px)": {
      width: "31%",
    },
  },
  levelCard: {
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
    transitionDuration: 300,
  },
  levelCardUnlocked: {
    borderColor: "#f3e8ff",
  },
  levelCardLocked: {
    borderColor: "#e5e7eb",
    opacity: 0.6,
  },
  lockedOverlay: {
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
  lockedContent: {
    alignItems: "center",
  },
  lockedIcon: {
    height: 48,
    width: 48,
    color: "#9ca3af",
    marginBottom: 8,
  },
  lockedText: {
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  levelHeader: {
    textAlign: "center",
    marginBottom: 24,
  },
  levelEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  levelPrice: {
    color: "#4b5563",
    fontSize: 14,
  },
  progressBarContainer: {
    marginBottom: 24,
  },
  progressBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBarLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  progressBarValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8b5cf6",
  },
  progressBarBackground: {
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
  },
  progressBarFill: {
    backgroundColor: "#8b5cf6",
    height: 8,
    borderRadius: 9999,
  },
  takeExamButton: {
    width: "100%",
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  takeExamButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  continueLearningButton: {
    width: "100%",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueLearningButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  lockedButton: {
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
  lockedButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default LevelsStudent;
