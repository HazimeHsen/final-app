"use client"

import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Video } from "expo-video" // Changed from expo-av
import * as ImagePicker from "expo-image-picker" // For image uploads
import * as WebBrowser from "expo-web-browser" // For opening external links
import { useRouter } from "expo-router" // For navigation

import {
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Award,
  Target,
  Users,
  AlertCircle,
} from "lucide-react-native"

import { examAPI, certificateAPI } from "../../api" // Adjusted path
import { AuthContext } from "../../contexts/AuthContext"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000/"

const ExamPlayer = ({ examId, showCertificate }) => {
  const router = useRouter()
  const { user } = useContext(AuthContext)

  const [currentScreen, setCurrentScreen] = useState("welcome")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0) // Renamed to avoid conflict with question object
  const [answers, setAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(1800) // Default to 30 minutes
  const [examStarted, setExamStarted] = useState(false)
  const [userLevel, setUserLevel] = useState(null)
  const [score, setScore] = useState(0)
  const [examQuestions, setExamQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [examInfo, setExamInfo] = useState(null)
  const [levelId, setLevelId] = useState(null)
  const [hasPreviousSubmission, setHasPreviousSubmission] = useState(false)
  const [hasCertificate, setHasCertificate] = useState(false)

  const checkExistingSubmission = async () => {
    try {
      const result = await examAPI.gradeStudent(examId, user.id)
      console.log("Existing submission check result:", result.data)
      if (result.data) {
        setHasPreviousSubmission(true)
        setScore(result.data.score)
        setLevelId(result.data.level_id)
        return true
      }
      return false
    } catch (err) {
      console.log("Error checking existing submission:", err)
      return false
    }
  }

  const checkExistingCertificate = async () => {
    try {
      if (!levelId || !user?.id) return false
      const result = await certificateAPI.getAllForUser(user.id)
      const hasCert = result.data.some((cert) => cert.level_id === levelId)
      setHasCertificate(hasCert)
      return hasCert
    } catch (err) {
      console.log("Error checking existing certificate:", err)
      return false
    }
  }

  const deletePreviousSubmission = async () => {
    try {
      // Delete certificate first if it exists
      if (hasCertificate && levelId && user?.id) {
        await certificateAPI.deleteCertificate(user.id, levelId)
        setHasCertificate(false)
      }
      // Then delete the submission
      await examAPI.deleteSubmission(examId)
      setHasPreviousSubmission(false)
      return true
    } catch (err) {
      console.log("Error deleting submission:", err)
      Alert.alert("Error", "Failed to delete previous submission. Please try again.")
      return false
    }
  }

  const fetchExamData = async () => {
    try {
      setIsLoading(true)
      const hasSubmission = await checkExistingSubmission()
      if (hasSubmission) {
        await checkExistingCertificate()
        setCurrentScreen("results") // Go directly to results if already submitted
        return
      }

      const response = await examAPI.getById(examId)
      setExamInfo(response.data.exam)
      setTimeRemaining(response.data.exam.duration * 60 || 1800) // Set time based on exam data

      const formattedQuestions = response.data.questions.map((question) => ({
        id: question.id,
        question: question.question_text,
        type: question.question_media_type, // Use question_media_type for rendering
        media: question.question_media_url,
        options:
          question.answer_type === "multiple_choice"
            ? question.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
                image: opt.image_url,
              }))
            : [],
        correctAnswer: question.correct_answer,
        answer_type: question.answer_type,
        points: question.points,
      }))
      setExamQuestions(formattedQuestions)
    } catch (err) {
      setError("Failed to load exam questions. Please try again later.")
      console.log("Error fetching exam questions:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetakeExam = async () => {
    const success = await deletePreviousSubmission()
    if (success) {
      // Reset exam state and fetch questions again
      setCurrentScreen("welcome")
      setCurrentQuestionIndex(0)
      setAnswers({})
      setTimeRemaining(examInfo?.duration * 60 || 1800) // Reset to initial duration
      setExamStarted(false)
      setScore(0)
      setHasPreviousSubmission(false)
      setHasCertificate(false)
      await fetchExamData() // Fetch questions again after reset
    }
  }

  useEffect(() => {
    if (examId) {
      fetchExamData()
    }
  }, [examId, user?.id]) // Added user.id to dependencies

  const handleImageUpload = async (questionId) => {
    // Request camera roll permissions
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission required", "Please grant camera roll permissions to upload images.")
        return
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { file: uri, imagePreview: uri },
      }))
    }
  }

  useEffect(() => {
    let interval = null
    if (examStarted && timeRemaining > 0 && currentScreen === "exam" && examQuestions.length > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => time - 1)
      }, 1000)
    } else if (timeRemaining === 0 && examStarted) {
      handleSubmitExam() // Auto-submit when time runs out
    }
    return () => clearInterval(interval)
  }, [examStarted, timeRemaining, currentScreen, examQuestions])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleSubmitExam = async () => {
    setIsUploading(true)
    try {
      const imageUploadPromises = examQuestions.map(async (question) => {
        if (question.answer_type !== "image_upload" || !answers[question.id]?.file) {
          return null
        }

        const uri = answers[question.id].file
        const filename = uri.split("/").pop()
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : `image`

        const formData = new FormData()
        formData.append("image", { uri, name: filename, type })

        try {
          const response = await examAPI.uploadAnswerImage(examId, question.id, formData)
          return { questionId: question.id, photoPath: response.data.path }
        } catch (uploadError) {
          console.log(`Error uploading image for question ${question.id}:`, uploadError)
          Alert.alert("Upload Error", `Failed to upload image for a question. Please try again.`)
          return { questionId: question.id, photoPath: null } // Return null path on error
        }
      })

      const imageUploadResults = await Promise.all(imageUploadPromises)

      const submissions = examQuestions.map((question) => {
        if (question.answer_type === "image_upload") {
          const upload = imageUploadResults.find((u) => u?.questionId === question.id)
          return {
            exam_question_id: question.id,
            answer: "",
            photo: upload?.photoPath || null,
          }
        }
        if (question.answer_type === "multiple_choice") {
          const selectedOptionId = answers[question.id]
          return {
            exam_question_id: question.id,
            answer: selectedOptionId ? selectedOptionId.toString() : "",
            photo: null,
          }
        }
        // For text_input or other types
        return {
          exam_question_id: question.id,
          answer: answers[question.id] || "",
          photo: null,
        }
      })

      // Submit exam answers
      const res = await examAPI.submit(examId, { submissions: submissions })
      console.log("Exam submission response:", res.data)

      // Grade student
      const gradingResponse = await examAPI.gradeStudent(examId, user.id)
      console.log("Grading response:", gradingResponse.data)
      setScore(gradingResponse.data.score)
      setUserLevel(gradingResponse.data.level)
      const levelIdFromGrade = gradingResponse.data.level_id
      setLevelId(levelIdFromGrade)

      // Only generate certificate if passed (score >= 50) and showCertificate is true
      if (gradingResponse.data.score >= 50 && levelIdFromGrade && showCertificate) {
        try {
          const certRes = await certificateAPI.generate(user.id, levelIdFromGrade)
          const certUrl = certRes.data.certificate_url
          if (certUrl) {
            await WebBrowser.openBrowserAsync(certUrl) // Open certificate in browser
            setHasCertificate(true)
            Alert.alert("Certificate Generated", "Your certificate has been generated and opened in your browser!")
          }
        } catch (err) {
          console.log("Certificate generation failed:", err)
          Alert.alert("Certificate Error", "Failed to generate certificate.")
        }
      }
      setCurrentScreen("results")
    } catch (err) {
      console.log("Error submitting exam:", err)
      Alert.alert("Submission Failed", err.response?.data?.message || "Failed to submit exam. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const startExam = () => {
    setExamStarted(true)
    setCurrentScreen("exam")
  }

  const renderMedia = (question) => {
    if (!question.media) return null

    const mediaUrl = `${API_BASE_URL}${question.media}`

    switch (question.type) {
      case "image":
        return (
          <View style={styles.mediaContainer}>
            <Image source={{ uri: mediaUrl }} style={styles.mediaImage} resizeMode="contain" />
          </View>
        )
      case "video":
        return (
          <View style={styles.mediaContainer}>
            <Video
              source={{ uri: mediaUrl }}
              style={styles.mediaVideo}
              useNativeControls
              resizeMode="contain"
              // isLooping // This prop is for expo-av
              loop // This prop is for expo-video
            />
          </View>
        )
      default:
        return null
    }
  }

  const renderOptions = (question) => {
    if (question.answer_type === "multiple_choice") {
      return (
        <View style={styles.optionsContainer}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleAnswerSelect(question.id, option.id)}
              style={[
                styles.optionButton,
                answers[question.id] === option.id ? styles.optionButtonSelected : styles.optionButtonUnselected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  answers[question.id] === option.id ? styles.optionTextSelected : styles.optionTextUnselected,
                ]}
              >
                {option.text}
              </Text>
              {option.image && <Image source={{ uri: `${API_BASE_URL}${option.image}` }} style={styles.optionImage} />}
            </TouchableOpacity>
          ))}
        </View>
      )
    }

    if (question.answer_type === "image_upload") {
      return (
        <View style={styles.optionsContainer}>
          <TouchableOpacity onPress={() => handleImageUpload(question.id)} style={styles.imageUploadArea}>
            {answers[question.id]?.imagePreview ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: answers[question.id].imagePreview }} style={styles.imagePreview} />
                <Text style={styles.imageUploadTextSmall}>Tap to change image</Text>
              </View>
            ) : (
              <View style={styles.imageUploadPlaceholder}>
                <Text style={styles.imageUploadText}>Tap to upload an image</Text>
                <Text style={styles.imageUploadTextSmall}>Supported formats: JPEG, PNG</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.optionsContainer}>
        <TextInput
          value={answers[question.id] || ""}
          onChangeText={(text) => handleAnswerSelect(question.id, text)}
          style={styles.textInput}
          placeholder="Type your answer here..."
          multiline
          numberOfLines={4}
        />
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.fullScreenCenter}>
        <ActivityIndicator size="large" color="#8b5cf6" style={styles.spinner} />
        <Text style={styles.loadingText}>Loading exam questions...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.fullScreenCenter}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error Loading Exam</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={() => router.replace("/student/dashboard")} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back to Levels</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const passed = score >= 50

  if (currentScreen === "welcome") {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconContainer}>
              <BookOpen size={40} color="white" />
            </View>
            <Text style={styles.welcomeTitle}>{examInfo?.name || "LSL Entrance Exam"}</Text>
            <Text style={styles.welcomeSubtitle}>
              {examInfo?.description || "Welcome to the Lebanese Sign Language proficiency assessment."}
            </Text>

            <View style={styles.welcomeStatsGrid}>
              <View style={styles.statCard}>
                <Clock size={32} color="#8b5cf6" />
                <Text style={styles.statTitle}>Duration</Text>
                <Text style={styles.statValue}>
                  {examInfo?.duration ? `${examInfo.duration} minutes` : "30 minutes"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Target size={32} color="#ec4899" />
                <Text style={styles.statTitle}>Questions</Text>
                <Text style={styles.statValue}>
                  {examQuestions.length} {examQuestions.length === 1 ? "question" : "questions"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Award size={32} color="#fbbf24" />
                <Text style={styles.statTitle}>Level</Text>
                <Text style={styles.statValue}>{examInfo?.level_id || "Beginner to Advanced"}</Text>
              </View>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>
                <Users size={20} color="#2563eb" style={{ marginRight: 8 }} /> Exam Instructions
              </Text>
              <Text style={styles.instructionItem}>• Read each question carefully before selecting your answer</Text>
              <Text style={styles.instructionItem}>
                • You can navigate between questions using the Previous/Next buttons
              </Text>
              <Text style={styles.instructionItem}>
                • Some questions include images or videos - make sure to view them completely
              </Text>
              <Text style={styles.instructionItem}>• You can change your answers before submitting the exam</Text>
              <Text style={styles.instructionItem}>• The exam will auto-submit when time expires</Text>
            </View>

            <View style={styles.welcomeButtonContainer}>
              {!passed && hasPreviousSubmission ? (
                <TouchableOpacity onPress={handleRetakeExam} style={styles.retakeButton}>
                  <Text style={styles.retakeButtonText}>Retake Exam</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={startExam} style={styles.startButton}>
                  <Text style={styles.startButtonText}>Start Examination</Text>
                  <ArrowRight size={24} color="white" style={styles.buttonIcon} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    )
  }

  if (currentScreen === "exam" && examQuestions.length > 0) {
    const currentQ = examQuestions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100

    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.examHeaderFixed}>
          <View style={styles.examHeaderContent}>
            <View style={styles.examProgressInfo}>
              <Text style={styles.examProgressText}>
                Question {currentQuestionIndex + 1} of {examQuestions.length}
              </Text>
              <View style={styles.examProgressBarBg}>
                <LinearGradient
                  colors={["#8b5cf6", "#ec4899"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.examProgressBarFill, { width: `${progress}%` }]}
                />
              </View>
            </View>
            <View style={styles.timerContainer}>
              <Clock size={20} color="#8b5cf6" />
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContentExam}>
          <View style={styles.examQuestionCard}>
            <View style={styles.questionMeta}>
              <Text style={styles.questionBadge}>Question {currentQuestionIndex + 1}</Text>
              <Text style={styles.answeredCount}>
                {Object.keys(answers).length} of {examQuestions.length} answered
              </Text>
            </View>
            <Text style={styles.questionText}>{currentQ.question}</Text>

            {renderMedia(currentQ)}
            {renderOptions(currentQ)}

            <View style={styles.examNavigationButtons}>
              <TouchableOpacity
                onPress={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
              >
                <ArrowLeft size={20} color={currentQuestionIndex === 0 ? "#9ca3af" : "#4b5563"} />
                <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {currentQuestionIndex === examQuestions.length - 1 ? (
                <TouchableOpacity onPress={handleSubmitExam} disabled={isUploading} style={styles.submitExamButton}>
                  {isUploading ? (
                    <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                  ) : (
                    <CheckCircle size={20} color="white" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.submitExamButtonText}>{isUploading ? "Processing..." : "Submit Exam"}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleNextQuestion} style={styles.navButtonPrimary}>
                  <Text style={styles.navButtonPrimaryText}>Next</Text>
                  <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    )
  }

  if (currentScreen === "results") {
    const getLevelColor = (level) => {
      switch (level) {
        case "Advanced":
          return ["#10b981", "#059669"] // green-600 to emerald-500
        case "Intermediate":
          return ["#2563eb", "#0ea5e9"] // blue-600 to cyan-500
        case "Beginner":
          return ["#f59e0b", "#ea580c"] // yellow-600 to orange-500
        case "Foundation":
          return ["#8b5cf6", "#ec4899"] // purple-600 to pink-500
        default:
          return ["#4b5563", "#6b7280"] // gray-600 to gray-500
      }
    }

    const getLevelDescription = (level) => {
      switch (level) {
        case "Advanced":
          return "Outstanding performance! (85%+) You have mastered Lebanese Sign Language fundamentals and are ready for advanced concepts and complex conversations."
        case "Intermediate":
          return "Great work! (70-84%) You have a solid understanding of LSL basics and are ready to expand your vocabulary and grammar skills."
        case "Beginner":
          return "Good start! (50-69%) You have some knowledge of LSL and will benefit from our structured beginner program to build stronger foundations."
        case "Foundation":
          return "Welcome to LSL! (Below 50%) You're just starting your journey. Our foundation program will introduce you to the basics of Lebanese Sign Language step by step."
        default:
          return ""
      }
    }

    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.resultsCard}>
            <View
              style={[
                styles.resultsIconContainer,
                {
                  backgroundColor: passed ? "#10b981" : "#ef4444", // green-600 or red-600
                },
              ]}
            >
              {passed ? <CheckCircle size={40} color="white" /> : <AlertCircle size={40} color="white" />}
            </View>
            <Text style={styles.resultsTitle}>{passed ? "Exam Passed!" : "Exam Failed"}</Text>
            <Text style={styles.resultsSubtitle}>
              {passed
                ? "Congratulations on completing the LSL entrance examination."
                : "Don't worry! You can retake the exam to improve your score."}
            </Text>
            {passed && hasCertificate && (
              <Text style={styles.certificateDownloadedText}>Your certificate has been downloaded!</Text>
            )}

            <View style={styles.resultsStatsGrid}>
              <View style={[styles.statCard, passed ? styles.statCardPassed : styles.statCardFailed]}>
                <Text style={[styles.statTitleLarge, passed ? styles.textPurple : styles.textRed]}>
                  {score.toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>Overall Score</Text>
                {!passed && <Text style={styles.minScoreText}>Minimum passing score: 50%</Text>}
              </View>
              <View style={[styles.statCard, passed ? styles.statCardPink : styles.statCardOrange]}>
                <LinearGradient
                  colors={getLevelColor(userLevel)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.levelGradientTextWrapper}
                >
                  <Text style={styles.statTitleLargeGradient}>{userLevel}</Text>
                </LinearGradient>
                <Text style={styles.statLabel}>Your Level</Text>
              </View>
            </View>

            <View
              style={[
                styles.resultsDescriptionBox,
                passed ? styles.resultsDescriptionBoxPassed : styles.resultsDescriptionBoxFailed,
              ]}
            >
              <Text style={[styles.resultsDescriptionText, passed ? styles.textBlueDark : styles.textOrangeDark]}>
                {getLevelDescription(userLevel)}
              </Text>
            </View>

            <View style={styles.resultsButtonsContainer}>
              {!passed && (
                <TouchableOpacity onPress={handleRetakeExam} style={styles.retakeButton}>
                  <Text style={styles.retakeButtonText}>Retake Exam</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => router.replace("/student/dashboard")}
                style={[
                  styles.startButton, // Reusing startButton for consistent style
                  {
                    backgroundColor: getLevelColor(userLevel)[0], // Use first color of level gradient
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 8,
                  },
                ]}
              >
                <Text style={styles.startButtonText}>{passed ? "Start Learning Journey" : "Back to Dashboard"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // Full screen gradient
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48, // py-12
    paddingHorizontal: 16, // px-4
  },
  scrollViewContentExam: {
    flexGrow: 1,
    paddingVertical: 16, // Adjusted for fixed header
    paddingHorizontal: 16,
    paddingTop: 80, // Space for fixed header
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    color: "#4b5563",
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    textAlign: "center",
    maxWidth: 400,
    width: "100%",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 8,
  },
  errorMessage: {
    color: "#4b5563",
    marginBottom: 16,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Welcome Screen Styles
  welcomeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    padding: 32,
    alignItems: "center",
    maxWidth: 800,
    width: "100%",
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#8b5cf6", // Simplified gradient
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: "#4b5563",
    maxWidth: 600,
    textAlign: "center",
    marginBottom: 32,
  },
  welcomeStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 16, // gap-6
    marginBottom: 32,
    width: "100%",
  },
  statCard: {
    flex: 1,
    minWidth: 120, // Ensure cards don't get too small
    backgroundColor: "#ede9fe", // purple-50, pink-50, yellow-50 - simplified to purple-50 for consistency
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  statTitle: {
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
    marginTop: 12,
  },
  statValue: {
    color: "#4b5563",
    fontSize: 16,
  },
  instructionsBox: {
    backgroundColor: "#eff6ff", // blue-50
    borderColor: "#bfdbfe", // blue-200
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: "100%",
  },
  instructionsTitle: {
    fontWeight: "600",
    color: "#1e40af", // blue-800
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  instructionItem: {
    color: "#1c50a3", // blue-700
    marginBottom: 8,
    fontSize: 15,
  },
  welcomeButtonContainer: {
    width: "100%",
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#8b5cf6", // Simplified gradient
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  retakeButton: {
    backgroundColor: "#8b5cf6", // Simplified gradient
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  retakeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },

  // Exam Screen Styles
  examHeaderFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.5)",
    zIndex: 40,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  examHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  examProgressInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  examProgressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
    marginRight: 16,
  },
  examProgressBarBg: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
  },
  examProgressBarFill: {
    height: 8,
    borderRadius: 9999,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ede9fe", // purple-50
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", // Monospace font for timer
    fontWeight: "600",
    color: "#8b5cf6",
    marginLeft: 4,
    fontSize: 16,
  },
  examQuestionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    padding: 32,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  questionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  questionBadge: {
    backgroundColor: "#8b5cf6", // Simplified gradient
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: "500",
  },
  answeredCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  questionText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 24,
  },
  mediaContainer: {
    marginBottom: 24,
    alignItems: "center",
  },
  mediaImage: {
    width: "100%",
    height: 200, // h-48
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  mediaVideo: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  optionsContainer: {
    gap: 12, // space-y-3
  },
  optionButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonSelected: {
    borderColor: "#8b5cf6", // purple-500
    backgroundColor: "#f3e8ff", // purple-50
  },
  optionButtonUnselected: {
    borderColor: "#e5e7eb", // gray-200
    backgroundColor: "white",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1, // Allow text to take available space
  },
  optionTextSelected: {
    color: "#6d28d9", // purple-700
  },
  optionTextUnselected: {
    color: "#1f2937", // gray-800
  },
  optionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
  imageUploadArea: {
    width: "100%",
    padding: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db", // gray-300
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  imagePreviewContainer: {
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "contain",
  },
  imageUploadPlaceholder: {
    alignItems: "center",
    paddingVertical: 32,
  },
  imageUploadText: {
    color: "#6b7280", // gray-500
    fontSize: 16,
    marginBottom: 4,
  },
  imageUploadTextSmall: {
    color: "#9ca3af", // gray-400
    fontSize: 12,
  },
  textInput: {
    width: "100%",
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    fontSize: 16,
    color: "#1f2937",
    textAlignVertical: "top", // For multiline
  },
  examNavigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#f3f4f6", // gray-100
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: "#4b5563", // gray-700
    fontWeight: "500",
    fontSize: 16,
    marginLeft: 8,
  },
  navButtonTextDisabled: {
    color: "#9ca3af",
  },
  navButtonPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#8b5cf6", // Simplified gradient
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonPrimaryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  submitExamButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#10b981", // green-600
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitExamButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  // Results Screen Styles
  resultsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    padding: 32,
    alignItems: "center",
    maxWidth: 800,
    width: "100%",
  },
  resultsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  resultsSubtitle: {
    fontSize: 18,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
  },
  certificateDownloadedText: {
    color: "#10b981", // green-600
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  resultsStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 16,
    marginBottom: 32,
    width: "100%",
  },
  statCardPassed: {
    backgroundColor: "#ede9fe", // purple-50
  },
  statCardFailed: {
    backgroundColor: "#fee2e2", // red-50
  },
  statCardPink: {
    backgroundColor: "#fce7f3", // pink-50
  },
  statCardOrange: {
    backgroundColor: "#fff7ed", // orange-50
  },
  statTitleLarge: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statTitleLargeGradient: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    // This text will be rendered with a gradient by the LinearGradient wrapper
    // In React Native, text gradients are often achieved by masking or custom components.
    // For simplicity, we'll rely on the LinearGradient wrapper for the background.
    // If true text gradient is needed, it's more complex.
    color: "white", // Fallback color, actual color comes from gradient
  },
  levelGradientTextWrapper: {
    borderRadius: 8, // Match statCard's inner content
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "center", // Center the gradient text
  },
  statLabel: {
    color: "#4b5563",
    fontSize: 16,
  },
  minScoreText: {
    fontSize: 14,
    color: "#ef4444", // red-500
    marginTop: 8,
  },
  resultsDescriptionBox: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: "100%",
    borderWidth: 1,
  },
  resultsDescriptionBoxPassed: {
    backgroundColor: "#eff6ff", // blue-50
    borderColor: "#bfdbfe", // blue-200
  },
  resultsDescriptionBoxFailed: {
    backgroundColor: "#fff7ed", // orange-50
    borderColor: "#fed7aa", // orange-200
  },
  resultsDescriptionText: {
    fontSize: 18,
    lineHeight: 28,
  },
  textPurple: { color: "#8b5cf6" },
  textRed: { color: "#ef4444" },
  textBlueDark: { color: "#1e40af" },
  textOrangeDark: { color: "#c2410c" },
  resultsButtonsContainer: {
    flexDirection: "column", // Stack buttons vertically
    gap: 16, // space-y-4
    width: "100%",
    alignItems: "center",
  },
})

export default ExamPlayer
