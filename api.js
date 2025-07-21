import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ACCESS_TOKEN, USER_DATA, STORAGE_TYPE } from "./constant" // Ensure USER_DATA and STORAGE_TYPE are imported

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000/", // Use Expo public env var
  headers: {
    Accept: "application/json",
  },
})

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN)
    console.log("🛠️ Adding Authorization header:", token ? "Token Found" : "No Token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor: handle 401 unauthorized (redirect to login)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized (401) response. Clearing tokens.")
      await AsyncStorage.removeItem(ACCESS_TOKEN)
      await AsyncStorage.removeItem(USER_DATA) // Use USER_DATA constant
      await AsyncStorage.removeItem(STORAGE_TYPE) // Clear storage type
      // Navigation to login should be handled by the app's navigation logic
      // e.g., using router.replace('/') from a component or layout
    }
    return Promise.reject(error)
  },
)

// AUTH APIS
export const authAPI = {
  login: (credentials) => api.post("api/login", credentials),
  signup: (userData) => api.post("api/register", userData),
  forgotPassword: (email) => api.post("api/forgot-password", { email }),
  resetPassword: (data) => api.post("api/reset-password", data),
  logout: async () => {
    await AsyncStorage.removeItem(ACCESS_TOKEN)
    await AsyncStorage.removeItem(USER_DATA) // Use USER_DATA constant
    await AsyncStorage.removeItem(STORAGE_TYPE) // Clear storage type
    return Promise.resolve()
  },
  getCurrentUser: () => api.get("/user"),
}

// USER APIS
export const userAPI = {
  getPurchasedLevels: (userId) => api.get(`api/users/${userId}/purchased-levels`),
  createUser: (data) => api.post("api/users", data),
  create: (data) => {
    // This 'create' seems to be for videos, conflicting with userAPI.createUser.
    // Assuming it's a general file upload or video upload.
    // For FormData, axios automatically sets Content-Type, so no need to specify.
    if (data instanceof FormData) {
      return api.post("api/videos", data)
    }
    return api.post("api/videos", data)
  },
  uploadProfileImage: (formData) => api.post("api/user/profile-image", formData), // No manual headers for FormData
  deleteProfileImage: () => api.delete("api/user/profile-image"),
  getUserById: (id) => api.get(`api/users/${id}`),
  deleteUserById: (id) => api.delete(`api/users/${id}`), // Soft-delete (updates deleted_at)
  updateUserProfile: (id, data) => api.put(`api/users/${id}/profile`, data),
  updateUserRole: (id, data) => api.put(`api/users/${id}/role`, data),
  getAllUsers: () => api.get("api/users"),
  getInstructors: () => api.get("api/users/instructors"),
  getStudents: () => api.get("api/students"),
  getLevels: () => api.get("api/levels"),
  getRoles: () => api.get("api/roles"), // Adjust this endpoint if your backend uses a different one
}

// LEVEL APIS
export const levelAPI = {
  create: (data) => api.post("api/levels", data),
  getAll: () => api.get("api/levels"),
  getLevelProgress: (levelId) => api.get(`/api/levels/${levelId}/progress`),
  getById: (id) => api.get(`api/levels/${id}`),
  getCoursesByLevel: (levelId) => api.get(`api/levels/${levelId}/courses`),
}

// COURSE API
export const courseAPI = {
  getAll: () => api.get("api/courses"),
  getById: (id) => api.get(`api/courses/${id}`),
  getCoursesByLevel: (levelId) => api.get(`/api/courses/level/${levelId}`),
  create: (data) => api.post("api/courses", data),
  update: (id, data) => api.put(`api/courses/${id}`, data),
  delete: (id) => api.delete(`api/courses/${id}`),
  getLessonsByCourse: (courseId) => api.get(`api/courses/${courseId}/lessons`),
  markCompleted: (courseId) => api.post(`api/courses/${courseId}/completed`),
  reorder: (data) => api.put("api/courses/reorder", data),
}

// LESSON API
export const lessonAPI = {
  getByCourse: (courseId) => api.get(`api/course/${courseId}/lessons`),
  getById: (lessonId) => api.get(`api/lesson/${lessonId}`), // Get a specific lesson by ID with videos
  getLessonVideos: (lessonId) => api.get(`api/lessons-videos/${lessonId}`), // GET ALL VIDEOS FOR A LESSONS
  create: (data) => api.post("api/lessons", data),
  update: (id, data) => api.put(`api/lessons/${id}`, data),
  delete: (id) => api.delete(`api/lessons/${id}`),
  getVideos: (lessonId) => api.get(`api/lessons/${lessonId}/videos`),
  reorder: (lessons) => api.put("api/lessons/reorder", { lessons }),
  getByUser: (userId) => api.get(`api/users/${userId}/lessons`),
}

// VIDEO API
export const videoAPI = {
  getByLesson: (lessonId) => api.get(`api/lesson/${lessonId}`),
  getById: (id) => api.get(`api/videos/${id}`),
  getVideosByLesson: (lessonId) => api.get(`/api/lessons/${lessonId}/videos`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post("api/videos", data) // remove manual headers
    }
    return api.post("api/videos", data)
  },
  update: (id, data) => api.put(`api/videos/${id}`, data),
  delete: (id) => api.delete(`api/videos/${id}`),
  //Track video completion
  markCompleted: (videoId) => api.post(`api/videos/${videoId}/completed`),
  //Get progress by unit
  getLessonProgress: (lessonId) => api.get(`api/videos/lesson-progress/${lessonId}`),
  getCourseProgress: (courseId) => api.get(`api/videos/course-progress/${courseId}`),
  getLevelProgress: (levelId) => api.get(`api/videos/level-progress/${levelId}`),
  getBatchCourseProgress: (courseIds) =>
    api.post("api/videos/course-progress/batch", {
      course_ids: courseIds,
    }),
}

// COMMENT API
export const commentAPI = {
  getByVideo: (videoId) => api.get(`api/videos/${videoId}/comments`),
  create: (data) => api.post("api/comments", data),
  update: (id, data) => api.put(`api/comments/${id}`, data),
  delete: (id) => api.delete(`api/comments/${id}`),
}

// This function is redundant if updateUserProfile is used directly from userAPI
// export const updateProfile = async (id, data) => {
//   const token = await AsyncStorage.getItem(ACCESS_TOKEN);
//   return api.put(`api/users/${id}/profile`, data, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
// };

// EXAM API
export const examAPI = {
  // Get all exams (for current user)
  getAll: () => api.get("api/exams"),
  // Create a new exam
  create: (examData) => api.post("api/exams", examData),
  // Get single exam
  getById: (id) => api.get(`api/exams/${id}`),
  // Update an exam
  update: (id, examData) => api.put(`api/exams/${id}`, examData),
  // Delete an exam
  delete: (id) => api.delete(`api/exams/${id}`),
  // Submit exam answers
  submit: (examId, submissionData) => {
    return api.post(`api/exams/${examId}/submit`, submissionData)
  },
  // Get exam results
  getResults: (examId) => api.get(`api/exams/${examId}/results`),
  // Get certificate if available
  getCertificate: (examId) =>
    api.get(`api/exams/${examId}/certificate`, {
      responseType: "blob",
    }),
  // Upload answer image (for image upload questions)
  uploadAnswerImage: (examId, questionId, formData) => {
    return api.post(`api/exams/${examId}/questions/${questionId}/answer-image`, formData) // No manual headers
  },
  gradeStudent: (examId, studentId) => api.get(`api/exams/${examId}/students/${studentId}/grades`),
  getExamByLevel: (levelId) => api.get(`api/levels/${levelId}/exam`),
  deleteSubmission: (examId) => api.delete(`api/exams/${examId}/submission`),
}

// EXAM QUESTION API
export const examQuestionAPI = {
  // Get all questions for an exam
  getByExam: (examId) => api.get(`api/exams/${examId}/questions`),
  // Create a new question
  create: (examId, questionData) => api.post(`api/exams/${examId}/questions`, questionData),
  // Get single question
  getById: (examId, questionId) => api.get(`api/exams/${examId}/questions/${questionId}`),
  // Update a question
  update: (examId, questionId, questionData) => api.put(`api/exams/${examId}/questions/${questionId}`, questionData),
  // Delete a question
  delete: (examId, questionId) => api.delete(`api/exams/${examId}/questions/${questionId}`),
  // Reorder questions
  reorder: (examId, questions) => api.put(`api/exams/${examId}/questions/reorder`, { questions }),
  // Upload question media (image/video)
  uploadMedia: (examId, formData) => {
    return api.post(`api/exams/${examId}/questions/media`, formData) // No manual headers
  },
  // Upload option image (for multiple choice)
  uploadOptionImage: (examId, questionId, optionId, formData) => {
    return api.post(`api/exams/${examId}/questions/${questionId}/options/${optionId}/image`, formData) // No manual headers
  },
}

// EXAM SUBMISSION API
export const examSubmissionAPI = {
  submit: (data) => api.post("api/exam-submissions", data),
  gradeStudent: (studentId) => api.get(`api/students/${studentId}/grades`), // Update this to match your backend route
  // New API calls for fetching submissions
  getAll: () => api.get("api/exam-submissions"), // Get all submissions (for admin)
  getByExam: (examId) => api.get(`api/exams/${examId}/submissions`), // Get submissions for a specific exam (for instructor)
  getById: (submissionId) => api.get(`api/exam-submissions/${submissionId}`), // Get details of a single submission
  updateGrade: (submissionId, data) => api.patch(`api/exam-submissions/${submissionId}/grade`, data), // To update a submission's grade
}

// CERTIFICATE API
export const certificateAPI = {
  generate: (userId, levelId) => api.get(`api/certificates/generate/${userId}/${levelId}`),
  download: (courseId) => api.get(`api/certificate/download/${courseId}`, { responseType: "blob" }),
  // fetch all certificates for the logged-in user
  getAllForUser: (userId) => api.get(`api/certificates/user/${userId}`),
  deleteCertificate: (userId, levelId) => api.delete(`api/certificates/user/${userId}/level/${levelId}`),
}

// RATING API
export const ratingAPI = {
  // Create or update a rating for a video
  rateVideo: (data) => api.post("api/rate", data),
  // Get all ratings for a video
  getVideoRatings: (videoId) => api.get(`api/rate/video/${videoId}`),
  // Get the current user's rating for a video
  getUserRating: (videoId) => api.get(`api/rate/video/${videoId}/user`),
  // Delete the user's rating
  deleteRating: (id) => api.delete(`api/rate/${id}`),
  getAllRatings: () => api.get("api/admin/ratings"),
}

// PAYMENT API
export const paymentAPI = {
  // Real payment
  pay: (levelId) => api.post(`api/pay/level/${levelId}`),
  // Simulated payment success check (returns 1)
  simulateSuccess: (levelId) => api.get(`api/pay/level/${levelId}/success`),
  // Marks session as paid (simulated success)
  simulateSuccessAction: (levelId, sessionId) =>
    api.post(`api/pay/level/${levelId}/success/action`, {}, { params: { "cko-session-id": sessionId } }),
  // Optional: if simulating failure
  simulateFailed: (levelId) => api.post(`api/pay/level/${levelId}/failed`),
  // Confirm purchase completed
  purchaseSuccess: (levelId) => api.post(`api/levels/${levelId}/purchase/success`),
}

// ANNOUNCEMENT API
export const announcementAPI = {
  getByMeeting: (meetingId) => api.get(`api/announcements/${meetingId}`),
  create: (data) => api.post("api/announcements", data),
  delete: (id) => api.delete(`api/announcements/${id}`),
}

// MEETINGS API
export const meetingAPI = {
  schedule: (data) => api.post("api/meetings/schedule", data),
  getAll: () => api.get("api/meetings"),
  update: (meetingId, userId, data) => api.put(`api/meetings/${meetingId}/${userId}`, data),
  delete: (id) => api.delete(`api/meetings/${id}`),
}

// SECURE PHOTO EXAM API
export const secureAPI = {
  getExamSubmissionPhoto: (id) => api.get(`api/exam-submissions/${id}/photo`, { responseType: "blob" }),
}

// Exam Answer Review API (admin/teacher only)
export const reviewAPI = {
  getAll: () => api.get("api/exam-answers"),
  overrideScore: (id, data) => api.patch(`api/exam-answers/${id}/override`, data),
}

// Admin-specific APIs
export const adminAPI = {
  getPurchases: () => api.get("api/admin/purchases"),
  getPayments: () => api.get("api/admin/payments"),
  getLevelPayments: () => api.get("api/admin/levels/payments"),
}

// 🔑 Change password (adjust endpoint if different in your backend)
export const changePassword = (data) => api.post("api/change-password", data)

// MESSAGE -CHAT APIS
export const messagesAPI = {
  createMessage: (messageData) => api.post("api/messages", messageData),
  // getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
  // markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
  // deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  // uploadMedia: (formData) =>
  //   api.post("/messages/media", formData, {
  //     headers: { "Content-Type": "multipart/form-data" },
  //   }),
  // getAvailableUsers: (userType) => api.get(`/chats/available-users?type=${userType}`),
  // createChat: (userId) => api.post("/chats", { userId }),
  // getChatByParticipants: (userId) => api.get(`/chats/participants/${userId}`),
}

export default api
