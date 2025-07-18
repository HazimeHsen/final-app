"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Mail, ArrowLeft, CheckCircle, Hand } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import api from "../../api"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState("")
  const navigation = useNavigation()

  const handleSubmit = async () => {
    // Validate email
    if (!email) {
      setError("Please enter your email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post("/api/forgot-password", {
        email: email.trim().toLowerCase(),
      })

      if (response.data) {
        setSuccess(true)
        setMessage(response.data.message || "Password reset instructions have been sent to your email.")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      setError(error.response?.data?.message || error.message || "Failed to send reset instructions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (text) => {
    setEmail(text)
    if (error) setError(null)
  }

  if (success) {
    return (
      <LinearGradient
        colors={["#f3e8ff", "#fce7f3"]} // from-purple-50 to-pink-50
        style={styles.container}
      >
        <View style={styles.successCard}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={32} color="white" />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>{message}</Text>
          <Text style={styles.successEmailText}>
            We sent password reset instructions to <Text style={styles.boldEmail}>{email}</Text>
          </Text>

          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.successButton}>
            <Text style={styles.successButtonText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSuccess(false)
              setEmail("")
              setMessage("")
            }}
            style={styles.tryDifferentEmailButton}
          >
            <Text style={styles.tryDifferentEmailText}>Try different email</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={["#f3e8ff", "#fce7f3"]} // from-purple-50 to-pink-50
      style={styles.container}
    >
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backButton}>
          <ArrowLeft size={16} color="#8b5cf6" />
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Hand size={32} color="white" />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>No worries! Enter your email and we'll send you reset instructions.</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                value={email}
                onChangeText={handleChange}
                keyboardType="email-address"
                autoCapitalize="none"
                required
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Send Reset Instructions</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerLink}>Sign in instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 64, // pt-16
  },
  card: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.8)", // bg-white/80
    borderRadius: 24, // rounded-3xl
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10, // shadow-2xl
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)", // border border-white/50
    padding: 32, // p-8
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24, // mb-6
  },
  backButtonText: {
    color: "#8b5cf6", // text-purple-600
    fontWeight: "500", // font-medium
    marginLeft: 8, // mr-2
  },
  header: {
    alignItems: "center",
    marginBottom: 32, // mb-8
  },
  headerIconContainer: {
    width: 64, // w-16
    height: 64, // h-16
    backgroundColor: "#8b5cf6", // bg-gradient-to-r from-purple-600 to-pink-500 (simplified)
    borderRadius: 16, // rounded-2xl
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16, // mb-4
  },
  title: {
    fontSize: 28, // text-3xl
    fontWeight: "700", // font-bold
    color: "#1f2937", // text-gray-800
    marginBottom: 8, // mb-2
  },
  subtitle: {
    color: "#4b5563", // text-gray-600
    textAlign: "center",
  },
  errorBox: {
    marginBottom: 24, // mb-6
    padding: 16, // p-4
    backgroundColor: "#fee2e2", // bg-red-100
    borderColor: "#ef4444", // border-red-400
    borderWidth: 1,
    borderRadius: 12, // rounded-xl
  },
  errorText: {
    color: "#b91c1c", // text-red-700
  },
  form: {
    gap: 24, // space-y-6
  },
  label: {
    fontSize: 14, // text-sm
    fontWeight: "500", // font-medium
    color: "#374151", // text-gray-700
    marginBottom: 8, // mb-2
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 12, // pl-3
  },
  input: {
    flex: 1,
    paddingLeft: 40, // pl-10
    paddingRight: 12, // pr-3
    paddingVertical: 12, // py-3
    borderWidth: 1,
    borderColor: "#e5e7eb", // border-gray-200
    borderRadius: 12, // rounded-xl
    backgroundColor: "rgba(255, 255, 255, 0.7)", // bg-white/70 backdrop-blur-sm
    fontSize: 16,
    color: "#1f2937",
  },
  submitButton: {
    width: "100%",
    backgroundColor: "#8b5cf6", // bg-gradient-to-r from-purple-600 to-pink-500 (simplified)
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
    borderRadius: 12, // rounded-xl
    fontWeight: "600", // font-semibold
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5, // shadow-lg
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 32, // mt-8
    alignItems: "center",
  },
  footerText: {
    fontSize: 14, // text-sm
    color: "#6b7280", // text-gray-500
    marginBottom: 16, // mb-4
  },
  footerLink: {
    color: "#8b5cf6", // text-purple-600
    fontWeight: "500", // font-medium
  },
  // Success screen styles
  successCard: {
    width: "90%",
    maxWidth: 400,
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
  },
  successIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#10b981", // from-green-500 to-emerald-500 (simplified)
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  successMessage: {
    color: "#4b5563",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  successEmailText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 32,
    textAlign: "center",
  },
  boldEmail: {
    fontWeight: "bold",
  },
  successButton: {
    width: "100%",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontWeight: "600",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  successButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  tryDifferentEmailButton: {
    width: "100%",
    paddingVertical: 8,
    marginTop: 16,
    alignItems: "center",
  },
  tryDifferentEmailText: {
    color: "#8b5cf6",
    fontWeight: "500",
  },
})

export default ForgotPassword
