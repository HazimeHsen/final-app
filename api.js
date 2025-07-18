import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ACCESS_TOKEN } from "./constant"

const api = axios.create({
  baseURL: `http://192.168.0.110:8000/` ,
  headers: {
    Accept: "application/json",
  },
})

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN)
    console.log("🛠️ Adding Authorization header:", token)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

console.log("PROCESS", process.env.EXPO_PUBLIC_API_URL)
// Response interceptor: handle 401 unauthorized (redirect to login)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(ACCESS_TOKEN)
      await AsyncStorage.removeItem("user")
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
    await AsyncStorage.removeItem("user")
    return Promise.resolve()
  },
  getCurrentUser: () => api.get("/user"),
}

// USER APIS
export const userAPI = {
  create: (data) => {
    if (data instanceof FormData) {
      return api.post("api/videos", data, {
        headers: {
          "Content-Type": "multipart/form-type",
        },
      })
    }
    return api.post("api/videos", data)
  },
  getUserById: (id) => api.get(`api/users/${id}`),
  deleteUserById: (id) => api.delete(`api/users/${id}`),
  updateUserProfile: (id, data) => api.put(`api/users/${id}/profile`, data),
  updateUserRole: (id, data) => api.put(`api/users/${id}/role`, data),
  getAllUsers: () => api.get("api/users"),
  getInstructors: () => api.get("api/users/instructors"),
  getStudents: () => api.get("api/students"),
  getLevels: () => api.get("api/levels"),
  getRoles: () => api.get("api/roles"),
}

// LEVEL APIS
export const levelAPI = {
  getAll: () => api.get("api/levels"),
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
}

// LESSON API
export const lessonAPI = {
  getByCourse: (courseId) => api.get(`api/course/${courseId}/lessons`),
  getById: (lessonId) => api.get(`api/lesson/${lessonId}`),
  getLessonVideos: (lessonId) => api.get(`api/lessons-videos/${lessonId}`),
  create: (data) => api.post("api/lessons", data),
  update: (id, data) => api.put(`api/lessons/${id}`, data),
  delete: (id) => api.delete(`api/lessons/${id}`),
  getVideos: (lessonId) => api.get(`api/lessons/${lessonId}/videos`),
}

// VIDEO API
export const videoAPI = {
  getByLesson: (lessonId) => api.get(`api/lesson/${lessonId}`),
  getById: (id) => api.get(`api/videos/${id}`),
  getVideosByLesson: (lessonId) => api.get(`/api/lessons/${lessonId}/videos`),
  create: (data) => api.post("api/videos", data),
  update: (id, data) => api.put(`api/videos/${id}`, data),
  delete: (id) => api.delete(`api/videos/${id}`),
  markCompleted: (videoId) => api.post(`api/videos/${videoId}/completed`),
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

export const updateProfile = async (id, data) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN)
  return api.put(`api/users/${id}/profile`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// EXAM API
export const examAPI = {
  getAll: () => api.get("api/exams"),
  create: (examData) => api.post("api/exams", examData),
  getById: (id) => api.get(`api/exams/${id}`),
  update: (id, examData) => api.put(`api/exams/${id}`, examData),
  delete: (id) => api.delete(`api/exams/${id}`),
  submit: (examId, submissionData) => {
    return api.post(`api/exams/${examId}/submit`, submissionData)
  },
  getResults: (examId) => api.get(`api/exams/${examId}/results`),
  getCertificate: (examId) =>
    api.get(`api/exams/${examId}/certificate`, {
      responseType: "blob",
    }),
  uploadAnswerImage: (examId, questionId, formData) => {
    return api.post(`api/exams/${examId}/questions/${questionId}/answer-image`, formData, {
      headers: {
        "Content-Type": "multipart/form-type",
      },
    })
  },
  gradeStudent: (examId, studentId) => api.get(`api/exams/${examId}/students/${studentId}/grades`),
}

// EXAM QUESTION API
export const examQuestionAPI = {
  getByExam: (examId) => api.get(`api/exams/${examId}/questions`),
  create: (examId, questionData) => api.post(`api/exams/${examId}/questions`, questionData),
  getById: (examId, questionId) => api.get(`api/exams/${examId}/questions/${questionId}`),
  update: (examId, questionId, questionData) => api.put(`api/exams/${examId}/questions/${questionId}`, questionData),
  delete: (examId, questionId) => api.delete(`api/exams/${examId}/questions/${questionId}`),
  reorder: (examId, questions) => api.put(`api/exams/${examId}/questions/reorder`, { questions }),
  uploadMedia: (examId, formData) => {
    return api.post(`api/exams/${examId}/questions/media`, formData, {
      headers: {
        "Content-Type": "multipart/form-type",
      },
    })
  },
  uploadOptionImage: (examId, questionId, optionId, formData) => {
    return api.post(`api/exams/${examId}/questions/${questionId}/options/${optionId}/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-type",
      },
    })
  },
}

// EXAM SUBMISSION API
export const examSubmissionAPI = {
  submit: (data) => api.post("api/exam-submissions", data),
  gradeStudent: (studentId) => api.get(`api/students/${studentId}/grades`),
  getAll: () => api.get("api/exam-submissions"),
  getByExam: (examId) => api.get(`api/exams/${examId}/submissions`),
  getById: (submissionId) => api.get(`api/exam-submissions/${submissionId}`),
  updateGrade: (submissionId, data) => api.patch(`api/exam-submissions/${submissionId}/grade`, data),
}

// CERTIFICATE API
export const certificateAPI = {
  generate: (userId, levelId) => api.get(`api/certificates/generate/${userId}/${levelId}`),
  download: (courseId) => api.get(`api/certificate/download/${courseId}`, { responseType: "blob" }),
  getAllForUser: () => api.get("api/certificates"),
}

// RATING API
export const ratingAPI = {
  rateVideo: (data) => api.post("api/rate", data),
  getVideoRatings: (videoId) => api.get(`api/rate/video/${videoId}`),
  getUserRating: (videoId) => api.get(`api/rate/video/${videoId}/user`),
  deleteRating: (id) => api.delete(`api/rate/${id}`),
}

// PAYMENT API
export const paymentAPI = {
  pay: (levelId) => api.post(`api/pay/level/${levelId}`),
  simulateSuccess: (levelId) => api.get(`api/pay/level/${levelId}/success`),
  simulateSuccessAction: (levelId, sessionId) =>
    api.post(
      `api/pay/level/${levelId}/success/action`,
      {},
      {
        params: { "cko-session-id": sessionId },
      },
    ),
  simulateFailed: (levelId) => api.post(`api/pay/level/${levelId}/failed`),
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

// Change password
export const changePassword = (data) => api.post("api/change-password", data)

// MESSAGE -CHAT APIS
export const messagesAPI = {
  createMessage: (messageData) => api.post("api/messages", messageData),
}

export default api
