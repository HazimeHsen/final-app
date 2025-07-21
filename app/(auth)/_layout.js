import { Stack, Redirect } from "expo-router"
import { useContext } from "react"
import { ActivityIndicator, View, StyleSheet } from "react-native"
import { AuthContext } from "../../contexts/AuthContext"

export default function AuthLayout() {
  const { user, loading } = useContext(AuthContext)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    )
  }

  // If the user is already logged in, redirect them to the appropriate dashboard
  if (user) {
    if (user.role_id === 1) {
      return <Redirect href="/admin/users" />
    } else if (user.role_id === 2) {
      return <Redirect href="/instructor/dashboard" />
    } else if (user.role_id === 3) {
      return <Redirect href="/student/dashboard" />
    }
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} /> {/* Login page */}
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
    </Stack>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
