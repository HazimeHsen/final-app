import { Stack } from "expo-router"

export default function StudentLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard/index" options={{ headerShown: false }} />
      <Stack.Screen name="levels/[levelId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="levels/[levelId]/exam" options={{ headerShown: false }} />
      <Stack.Screen name="levels/[levelId]/courses/[courseId]/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="levels/[levelId]/courses/[courseId]/lessons/[lessonId]/video/[videoId]/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="certificates/index"
        options={{ headerShown: false }}
      />
    </Stack>
  )
}
