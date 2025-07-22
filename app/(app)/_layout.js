"use client"

import { Tabs } from "expo-router"
import { LogOut, User, Settings, Layers, Award } from "lucide-react-native" // Added Award icon
import { TouchableOpacity, StyleSheet } from "react-native"
import { useContext } from "react"
import { AuthContext } from "../../contexts/AuthContext"
import { useRouter } from "expo-router"

export default function AppLayout() {
  const { logout } = useContext(AuthContext)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace("/")
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#8b5cf6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: true,
        headerStyle: styles.headerStyle,
        headerTitleStyle: styles.headerTitleStyle,
        headerTintColor: "#1f2937",
      }}
    >
      <Tabs.Screen
        name="student"
        options={{
          title: "Levels",
          tabBarIcon: ({ color }) => <Layers size={24} color={color} />,
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <LogOut size={20} color="#ef4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="certificates/index"
        options={{
          title: "Certificates",
          tabBarIcon: ({ color }) => <Award size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    height: 80,
    paddingBottom: 5,
    paddingTop: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  headerStyle: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitleStyle: {
    fontWeight: "bold",
    fontSize: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  logoutButtonText: {
    marginLeft: 4,
    color: "#ef4444",
    fontWeight: "600",
  },
})
