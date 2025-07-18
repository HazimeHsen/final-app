import { Stack } from "expo-router"
import { AuthProvider } from "../contexts/AuthContext"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack>
          {/* Public routes (authentication flow) */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          {/* Authenticated routes */}
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  )
}
