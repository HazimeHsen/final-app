"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router"; // Changed from useParams, useNavigate

import { examAPI, videoAPI } from "../../../../../api"; // Adjusted path

import ExamPlayer from "../../../../../components/common/ExamPlayer";
import { AuthContext } from "../../../../../contexts/AuthContext";

const LevelExam = () => {
  const { levelId: levelIdParam } = useLocalSearchParams(); // Use useLocalSearchParams
  const levelId = Number.parseInt(levelIdParam, 10); // Ensure it's a number

  const { user } = useContext(AuthContext);
  const router = useRouter(); // Use useRouter

  const [examId, setExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setError("You must be logged in to access exams.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const progressRes = await videoAPI.getLevelProgress(levelId);
        const isComplete = progressRes?.data?.is_complete;

        if (levelId) {
          setExamId(levelId);
          setLoading(false);
          return;
        }

        if (!isComplete) {
          setError(
            "You must complete all courses in this level to unlock the exam."
          );
          return;
        }

        // Fetch the exam for this level
        const examRes = await examAPI.getExamByLevel(levelId);
        const exam = Array.isArray(examRes?.data)
          ? examRes.data[0]
          : examRes.data;

        if (!exam || !exam.id) {
          setError("No exam available for this level.");
          return;
        }

        // Check if user already attempted the exam
        const resultRes = await examAPI.gradeStudent(exam.id, user.id);
        const result = resultRes?.data;

        if (result) {
          if (result.score === 0) {
            console.log("User scored 0 — retaking exam");
            setExamId(exam.id);
          } else {
            setError("You have already completed this exam.");
          }
        } else {
          setExamId(exam.id); // No attempt yet
        }
      } catch (err) {
        console.error("Level exam init failed:", err);
        setError("Failed to load level exam. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (levelId) init();
  }, [levelId, user?.id, user]); // Added user to dependency array

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator
            size="large"
            color="#8b5cf6"
            style={styles.spinner}
          />
          <Text style={styles.loadingText}>Loading exam...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            onPress={() => router.replace("/student/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Go Back to Levels</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!examId) {
    return (
      <View style={styles.container}>
        <View style={styles.noExamContent}>
          <Text style={styles.noExamText}>
            No exam available for this level.
          </Text>
        </View>
      </View>
    );
  }

  return <ExamPlayer examId={examId} showCertificate={false} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb", // Light background
    padding: 20,
  },
  loadingContent: {
    alignItems: "center",
  },
  spinner: {
    marginBottom: 16, // mb-4
  },
  loadingText: {
    color: "#4b5563", // gray-600
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: "#fee2e2", // red-50
    borderColor: "#fca5a5", // red-200
    borderWidth: 1,
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    alignItems: "center",
    textAlign: "center",
    maxWidth: 400,
    width: "100%",
  },
  errorTitle: {
    fontSize: 20, // xl
    fontWeight: "bold",
    color: "#b91c1c", // red-700
    marginBottom: 8, // mb-2
  },
  errorMessage: {
    color: "#4b5563", // gray-600
    marginBottom: 16, // mb-4
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#8b5cf6", // purple-600
    paddingVertical: 10, // py-2
    paddingHorizontal: 24, // px-6
    borderRadius: 8, // rounded-lg
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
  noExamContent: {
    alignItems: "center",
  },
  noExamText: {
    color: "#4b5563", // gray-600
    fontSize: 16,
  },
});

export default LevelExam;
