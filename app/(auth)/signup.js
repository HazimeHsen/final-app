import { useState, useContext } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router" // Changed from useNavigation
import { Eye, EyeOff, Mail, Lock, User, Hand, ArrowRight, Phone, MapPin, Calendar } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { authAPI } from "../../api"
import { AuthContext } from "../../contexts/AuthContext"

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
    phone_nb: "",
    address: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter() // Changed from useNavigation
  const { login } = useContext(AuthContext)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    console.log("🔄 Sending form data:", formData)

    try {
      // Step 1: Register user using authAPI
      const registerResponse = await authAPI.signup(formData)
      console.log(" Registered successfully:", registerResponse.data)

      // Step 2: Auto-login using authAPI
      const loginResponse = await authAPI.login({
        email: formData.email,
        password: formData.password,
      })

      const { access_token, user } = loginResponse.data

      // Step 3: Save user in context and AsyncStorage
      await login(access_token, user, true) // 'true' for rememberMe

      setSuccess("Account created successfully! Redirecting to entrance exam...")
      setTimeout(() => {
        router.replace("/entrance-exam") // Updated path for Expo Router
      }, 2000)
    } catch (err) {
      console.error("❌ Registration or auto-login error:", err)
      if (err.response && err.response.data) {
        setError(err.response.data.message || "An error occurred. Please try again.")
      } else {
        setError("Network error or server crash. See console for details.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <LinearGradient
      colors={["#f3e8ff", "#fce7f3"]} // from-purple-50 to-pink-50
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        {/* Left Side - Signup Form */}
        <View style={styles.formWrapper}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <Hand size={32} color="white" />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join the LSL Connect community</Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <View style={styles.form}>
              {/* Name Field */}
              <InputField
                icon={<User size={20} color="#9ca3af" />}
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChangeText={(text) => handleChange("name", text)}
                placeholder="Enter your full name"
                label="Full Name"
              />
              {/* Email Field */}
              <InputField
                icon={<Mail size={20} color="#9ca3af" />}
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChangeText={(text) => handleChange("email", text)}
                placeholder="Enter your email"
                label="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {/* Password Field */}
              <InputField
                icon={<Lock size={20} color="#9ca3af" />}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChangeText={(text) => handleChange("password", text)}
                placeholder="Create a password"
                label="Password"
                secureTextEntry={!showPassword}
                extraIcon={
                  <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                  </TouchableOpacity>
                }
              />
              {/* Date of Birth */}
              <InputField
                icon={<Calendar size={20} color="#9ca3af" />}
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChangeText={(text) => handleChange("dob", text)}
                label="Date of Birth"
                placeholder="YYYY-MM-DD"
                keyboardType="numeric"
              />
              {/* Phone */}
              <InputField
                icon={<Phone size={20} color="#9ca3af" />}
                id="phone_nb"
                name="phone_nb"
                type="tel"
                value={formData.phone_nb}
                onChangeText={(text) => handleChange("phone_nb", text)}
                placeholder="76/888123"
                label="Phone Number"
                keyboardType="phone-pad"
              />
              {/* Address */}
              <InputField
                icon={<MapPin size={20} color="#9ca3af" />}
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChangeText={(text) => handleChange("address", text)}
                placeholder="Enter your address"
                label="Address"
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Create Account</Text>
                    <ArrowRight size={20} color="white" style={styles.submitButtonIcon} />
                  </>
                )}
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signinLinkContainer}>
                <Text style={styles.signinText}>
                  Already have an account?{" "}
                  <Text style={styles.signinLink} onPress={() => router.push("/")}>
                    Sign in here
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Side - Illustration (hidden on small screens) */}
        {/* You can add a similar illustration component here if needed for larger screens */}
      </View>
    </LinearGradient>
  )
}

const InputField = ({ icon, extraIcon, label, onChangeText, ...props }) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      {icon}
      <TextInput
        style={[styles.input, props.secureTextEntry && styles.passwordInput]}
        onChangeText={onChangeText}
        {...props}
      />
      {extraIcon}
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64, // pt-16
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row", // grid lg:grid-cols-2
    paddingHorizontal: 16, // px-4
    paddingVertical: 48, // py-12
    justifyContent: "center",
    alignItems: "center",
  },
  formWrapper: {
    width: "100%",
    maxWidth: 400, // max-w-md
    // mx-auto lg:mx-0 handled by parent flex
  },
  card: {
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
    backgroundColor: "#fee2e2", // bg-red-50
    borderColor: "#fca5a5", // border-red-200
    borderWidth: 1,
    borderRadius: 12, // rounded-xl
  },
  errorText: {
    color: "#dc2626", // text-red-600
    fontSize: 14, // text-sm
  },
  successBox: {
    marginBottom: 24, // mb-6
    padding: 16, // p-4
    backgroundColor: "#dcfce7", // bg-green-50
    borderColor: "#86efac", // border-green-200
    borderWidth: 1,
    borderRadius: 12, // rounded-xl
  },
  successText: {
    color: "#16a34a", // text-green-600
    fontSize: 14, // text-sm
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
  passwordInput: {
    paddingRight: 48, // pr-12 for eye icon
  },
  passwordToggle: {
    position: "absolute",
    right: 12, // pr-3
    padding: 5, // To make it easier to tap
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
    flexDirection: "row",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonIcon: {
    marginLeft: 8, // ml-2
  },
  signinLinkContainer: {
    marginTop: 24, // mt-6
    alignItems: "center",
  },
  signinText: {
    color: "#4b5563", // text-gray-600
  },
  signinLink: {
    color: "#8b5cf6", // text-purple-600
    fontWeight: "500", // font-medium
  },
})

export default Signup
