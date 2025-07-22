"use client"

import { useState, useEffect, useContext } from "react"
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from "react-native"
import { Link } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { Lock, CheckCircle, ArrowRight } from "lucide-react-native"
import * as WebBrowser from "expo-web-browser"

import { levelAPI, videoAPI, examAPI, userAPI, paymentAPI } from "../../../../api"
import { AuthContext } from "../../../../contexts/AuthContext"

const LevelsStudent = () => {
  const { user } = useContext(AuthContext)
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [levelProgress, setLevelProgress] = useState({})
  const [levelExams, setLevelExams] = useState({})
  const [levelExamResults, setLevelExamResults] = useState({})
  const [purchasedLevels, setPurchasedLevels] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const levelsRes = await levelAPI.getAll()
        setLevels(levelsRes.data)

        if (user?.id) {
          try {
            const purchasedRes = await userAPI.getPurchasedLevels(user.id)
            console.log("Purchased levels response:", purchasedRes)
            if (purchasedRes.data?.success) {
              const purchasedLevelIds = purchasedRes.data.data.map((p) => p.level_id)
              setPurchasedLevels(purchasedLevelIds)
              console.log("Purchased level IDs:", purchasedLevelIds)
            }
          } catch (err) {
            console.error("Failed to fetch purchased levels:", err)
          }
        }

        const progressData = {}
        const examsData = {}
        const resultsData = {}

        await Promise.all(
          levelsRes.data.map(async (level) => {
            const progressRes = await videoAPI.getLevelProgress(level.id)
            progressData[level.id] = progressRes.data

            let exam = null
            if (level.id === 1 || level.id === 2) {
              exam = { id: 3 }
            } else {
              try {
                const examRes = await examAPI.getExamByLevel(level.id)
                exam = Array.isArray(examRes?.data) ? examRes.data[0] : examRes.data
              } catch (err) {
                console.warn(`No exam found for level ${level.id}:`, err)
              }
            }

            if (exam?.id) {
              examsData[level.id] = exam
              try {
                const resultRes = await examAPI.gradeStudent(exam.id, user?.id)
                resultsData[level.id] = resultRes?.data || null
              } catch (err) {
                resultsData[level.id] = null
              }
            }
          }),
        )
        setLevelProgress(progressData)
        setLevelExams(examsData)
        setLevelExamResults(resultsData)
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const isLevelUnlockedSequentially = (level) => {
    if (level.id === 1) return true
    if (user?.id === 49) return true
    const prevLevelId = level.id - 1
    const prevLevelProgress = levelProgress[prevLevelId]
    const prevLevelExam = levelExams[prevLevelId]
    const prevLevelExamResult = levelExamResults[prevLevelId]

    if (!prevLevelProgress?.is_complete) return false
    if (!prevLevelExam) return true
    return prevLevelExamResult?.score > 50
  }

  const handlePay = async (levelId) => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to purchase this level.")
      return
    }
    try {
      const res = await paymentAPI.pay(levelId)
      console.log({ res })
      if (res.data?.url) {
        WebBrowser.openBrowserAsync(res.data.url)
      } else {
        throw new Error("No redirect URL received")
      }
    } catch (error) {
      console.error("Payment initiation failed:", error)
      Alert.alert("Payment Failed", "Failed to initiate payment. Please try again.")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading levels...</Text>
      </View>
    )
  }

  return (
    <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Your Learning Journey</Text>
          <Text style={styles.headerSubtitle}>
            Progress through structured levels to master Lebanese Sign Language.
          </Text>
        </View>

        <View style={styles.levelsGrid}>
          {levels.map((level) => {
            const isEligible = isLevelUnlockedSequentially(level)
            const hasPrice = level.price > 0
            const hasPurchased = purchasedLevels.includes(level.id)
            const progress = levelProgress[level.id] || {
              total_courses: 0,
              completed_courses: 0,
              is_complete: false,
            }
            const hasExam = Boolean(levelExams[level.id])
            const examResult = levelExamResults[level.id]
            const progressPercentage =
              progress.total_courses > 0 ? Math.round((progress.completed_courses / progress.total_courses) * 100) : 0
            const showCompletedBadge = progress.is_complete && (!hasExam || examResult?.score > 50)
            const showPayButton = isEligible && hasPrice && !hasPurchased
            const isAccessible = isEligible && (!hasPrice || hasPurchased)

            return (
              <View
                key={level.id}
                style={[styles.levelCard, !isEligible ? styles.levelCardLocked : styles.levelCardUnlocked]}
              >
                {!isEligible && (
                  <View style={styles.lockedOverlay}>
                    <View style={styles.lockedContent}>
                      <Lock size={48} color="#9ca3af" />
                      <Text style={styles.lockedText}>Complete the previous level to unlock</Text>
                    </View>
                  </View>
                )}
                {showCompletedBadge && isAccessible && (
                  <View style={styles.completedBadge}>
                    <CheckCircle size={16} color="white" />
                  </View>
                )}
                <View style={styles.levelHeader}>
                  <Text style={styles.levelEmoji}>{level.emoji || "📘"}</Text>
                  <Text style={styles.levelTitle}>{level.name}</Text>
                  <Text style={styles.levelPrice}>
                    {hasPrice ? `Paid • $${level.price}` : "Free"}
                    {hasPurchased && hasPrice && " (Purchased)"}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressValue}>
                      {progress.total_courses > 0
                        ? `${progress.completed_courses}/${progress.total_courses} courses`
                        : "No courses yet"}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={["#8b5cf6", "#ec4899"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                    />
                  </View>
                </View>

                {!isEligible ? (
                  <TouchableOpacity disabled style={styles.buttonLocked}>
                    <Lock size={16} color="#6b7280" />
                    <Text style={styles.buttonLockedText}>Locked</Text>
                  </TouchableOpacity>
                ) : showPayButton ? (
                  <TouchableOpacity onPress={() => handlePay(level.id)} style={styles.buttonPay}>
                    <Text style={styles.buttonPayText}>Pay to Unlock - ${level.price}</Text>
                    <ArrowRight size={16} color="white" style={styles.buttonIcon} />
                  </TouchableOpacity>
                ) : progress.is_complete && hasExam ? (
                  examResult?.score > 0 ? (
                    <View style={styles.buttonExamCompleted}>
                      <CheckCircle size={16} color="#9ca3af" />
                      <Text style={styles.buttonExamCompletedText}>Exam completed</Text>
                    </View>
                  ) : (
                    <Link href={`/student/levels/${level.id}/exam`} asChild>
                      <TouchableOpacity style={styles.buttonPrimary}>
                        <Text style={styles.buttonPrimaryText}>
                          {examResult?.score === 0 ? "Retake Exam" : "Take Exam"}
                        </Text>
                        <ArrowRight size={16} color="white" style={styles.buttonIcon} />
                      </TouchableOpacity>
                    </Link>
                  )
                ) : (
                  <Link href={`/student/levels/${level.id}`} asChild>
                    <TouchableOpacity style={styles.buttonPrimary}>
                      <Text style={styles.buttonPrimaryText}>
                        {progress.total_courses === 0
                          ? "Explore Level"
                          : progress.is_complete
                            ? "Review Level"
                            : "Continue Learning"}
                      </Text>
                      <ArrowRight size={16} color="white" style={styles.buttonIcon} />
                    </TouchableOpacity>
                  </Link>
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

// Define common button styles outside of StyleSheet.create
const commonButtonStyles = {
  width: "100%",
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "row",
}

const commonButtonTextStyles = {
  fontSize: 16,
  fontWeight: "600",
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  headerContainer: {
    textAlign: "center",
    marginBottom: 48,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#4b5563",
    maxWidth: 600,
    textAlign: "center",
  },
  levelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  levelCard: {
    position: "relative",
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    minHeight: 320,
    justifyContent: "space-between",
  },
  levelCardUnlocked: {
    borderColor: "#ede9fe",
  },
  levelCardLocked: {
    borderColor: "#e5e7eb",
    opacity: 0.6,
  },
  lockedOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(243, 244, 246, 0.9)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  lockedContent: {
    alignItems: "center",
    padding: 16,
  },
  lockedText: {
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },
  completedBadge: {
    position: "absolute",
    top: -12,
    right: -12,
    backgroundColor: "#10b981",
    padding: 8,
    borderRadius: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 50,
  },
  levelHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  levelEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: "bold",
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
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  progressBarBg: {
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 9999,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  buttonLocked: {
    ...commonButtonStyles,
    backgroundColor: "#d1d5db", // gray-300
  },
  buttonLockedText: {
    ...commonButtonTextStyles,
    color: "#6b7280", // gray-500
  },
  buttonPay: {
    ...commonButtonStyles,
    backgroundColor: "#2563eb", // blue-600
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonPayText: {
    ...commonButtonTextStyles,
    color: "white",
  },
  buttonPrimary: {
    ...commonButtonStyles,
    // The LinearGradient component in JSX handles the background gradient
    backgroundColor: "#8b5cf6", // Fallback color if gradient doesn't load
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonPrimaryText: {
    ...commonButtonTextStyles,
    color: "white",
  },
  buttonExamCompleted: {
    ...commonButtonStyles,
    backgroundColor: "#f3f4f6", // gray-100
    borderColor: "#d1d5db", // gray-300
    borderWidth: 1,
  },
  buttonExamCompletedText: {
    ...commonButtonTextStyles,
    color: "#6b7280", // gray-500
  },
})

export default LevelsStudent
