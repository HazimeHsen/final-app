import { Tabs } from "expo-router";
import { LogOut, User, Settings } from "lucide-react-native";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useRouter } from "expo-router";

export default function AppLayout() {
  const { logout } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

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
        name="student/dashboard"
        options={{
          title: "Levels",
          tabBarIcon: ({ color }) => <LogOut size={24} color={color} />,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <LogOut size={20} color="#ef4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
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
});
