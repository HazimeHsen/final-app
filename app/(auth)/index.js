import { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router"; // Changed from useNavigation
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Hand,
  ArrowRight,
  Check,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { authAPI } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [redirectTo, setRedirectTo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter(); // Changed from useNavigation

  const handleSubmit = async () => {
    // Validate form fields
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      if (!response.data) {
        throw new Error("No data received from server");
      }

      const { access_token, user: userData } = response.data;

      console.log("Received token:", access_token);

      if (!access_token || typeof access_token !== "string") {
        throw new Error("Invalid token format received");
      }

      await login(access_token, userData, formData.rememberMe);

      try {
          setRedirectTo("/admin/users"); // Updated path for Expo Router
       
      } catch (decodeError) {
        console.error("User role processing error:", decodeError);
        setError("Failed to process your login. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error.message);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && redirectTo) {
      router.replace(redirectTo); // Changed from navigation.replace
    }
  }, [user, redirectTo, router]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <LinearGradient
      colors={["#f3e8ff", "#fce7f3"]} // from-purple-50 to-pink-50
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        {/* Left Side - Illustration (hidden on small screens) */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCard}>
            <Image
              source={{
                uri: "https://via.placeholder.com/500x500.png?text=Welcome+Back",
              }}
              style={styles.illustrationImage}
            />
          </View>
          <View style={styles.floatingIconTopRight}>
            <Hand size={32} color="white" />
          </View>
          <View style={styles.floatingIconBottomLeft}>
            <Mail size={32} color="white" />
          </View>
          <View style={styles.illustrationTextContainer}>
            <Text style={styles.illustrationTitle}>Welcome Back!</Text>
            <Text style={styles.illustrationSubtitle}>
              Continue your Lebanese Sign Language learning journey with our
              community.
            </Text>
          </View>
        </View>

        {/* Right Side - Login Form */}
        <View style={styles.formWrapper}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <Hand size={32} color="white" />
              </View>
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.subtitle}>Welcome back to LSL Connect</Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              {/* Email Field */}
              <View>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(text) => handleChange("email", text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    required
                  />
                </View>
              </View>

              {/* Password Field */}
              <View>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChangeText={(text) => handleChange("password", text)}
                    secureTextEntry={!showPassword}
                    required
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.checkboxForgotContainer}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      handleChange("rememberMe", !formData.rememberMe)
                    }
                    style={styles.checkbox}
                  >
                    {formData.rememberMe && <Check size={16} color="#8b5cf6" />}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/forgot-password")}
                >
                  <Text style={styles.forgotPasswordLink}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                style={[
                  styles.submitButton,
                  isLoading && styles.submitButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Sign In</Text>
                    <ArrowRight
                      size={20}
                      color="white"
                      style={styles.submitButtonIcon}
                    />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.signupLinkContainer}>
                <Text style={styles.signupText}>
                  Don't have an account?{" "}
                  <Text
                    style={styles.signupLink}
                    onPress={() => router.push("/signup")}
                  >
                    Sign up here
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

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
  illustrationContainer: {
    flex: 1,
    marginRight: 48, // gap-12, simplified
    display: "none", // hidden lg:block
    // For larger screens, you'd use media queries or responsive libraries
    // For now, it's hidden by default in RN
  },
  illustrationCard: {
    backgroundColor: "rgba(255, 255, 255, 1)", // bg-white/20
    borderRadius: 24, // rounded-3xl
    padding: 32, // p-8
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)", // border border-white/30
  },
  illustrationImage: {
    width: "100%",
    height: 300, // Adjust height as needed
    borderRadius: 16, // rounded-2xl
    resizeMode: "contain",
  },
  floatingIconTopRight: {
    position: "absolute",
    top: -24, // -top-6
    right: -24, // -right-6
    backgroundColor: "#8b5cf6", // from-purple-600 to-pink-500 (simplified)
    borderRadius: 16, // rounded-2xl
    padding: 16, // p-4
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5, // shadow-xl
  },
  floatingIconBottomLeft: {
    position: "absolute",
    bottom: -24, // -bottom-6
    left: -24, // -left-6
    backgroundColor: "#fbbf24", // from-yellow-400 to-orange-500 (simplified)
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  illustrationTextContainer: {
    marginTop: 32, // mt-8
    alignItems: "center",
  },
  illustrationTitle: {
    fontSize: 28, // text-3xl
    fontWeight: "700", // font-bold
    color: "#1f2937", // text-gray-800
    marginBottom: 16, // mb-4
  },
  illustrationSubtitle: {
    color: "#4b5563", // text-gray-600
    fontSize: 18, // text-lg
    textAlign: "center",
  },
  formWrapper: {
    width: "100%",
    maxWidth: 400, // max-w-md
    // mx-auto lg:mx-0 handled by parent flex
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 1)", // bg-white/80
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
    marginBottom: 16, // mb-4
    padding: 12, // p-3
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
  passwordInput: {
    paddingRight: 48, // pr-12
  },
  passwordToggle: {
    position: "absolute",
    right: 12, // pr-3
    padding: 5, // To make it easier to tap
  },
  checkboxForgotContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    height: 16, // h-4
    width: 16, // w-4
    borderWidth: 1,
    borderColor: "#d1d5db", // border-gray-300
    borderRadius: 4, // rounded
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    marginLeft: 8, // ml-2
    fontSize: 14, // text-sm
    color: "#374151", // text-gray-700
  },
  forgotPasswordLink: {
    fontSize: 14, // text-sm
    color: "#8b5cf6", // text-purple-600
    fontWeight: "500", // font-medium
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
  socialLoginContainer: {
    marginTop: 24, // mt-6
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24, // Simplified spacing
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb", // border-gray-200
  },
  dividerText: {
    paddingHorizontal: 8, // px-2
    backgroundColor: "white", // bg-white
    color: "#6b7280", // text-gray-500
    fontSize: 14, // text-sm
  },
  socialButtonsContainer: {
    flexDirection: "row",
    gap: 12, // gap-3
    marginTop: 24, // mt-6
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
    borderWidth: 1,
    borderColor: "#e5e7eb", // border-gray-200
    borderRadius: 12, // rounded-xl
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // shadow-sm
    backgroundColor: "rgba(255, 255, 255, 0.7)", // bg-white/70 backdrop-blur-sm
  },
  socialIcon: {
    height: 20, // h-5
    width: 20, // w-5
    marginRight: 8, // ml-2
  },
  socialButtonText: {
    fontSize: 14, // text-sm
    fontWeight: "500", // font-medium
    color: "#374151", // text-gray-700
  },
  signupLinkContainer: {
    marginTop: 24, // mt-6
    alignItems: "center",
  },
  signupText: {
    color: "#4b5563", // text-gray-600
  },
  signupLink: {
    color: "#8b5cf6", // text-purple-600
    fontWeight: "500", // font-medium
  },
});

export default Login;
