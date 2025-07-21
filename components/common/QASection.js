"use client"

import { useEffect, useState, useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from "react-native"
import { Search, MessageCircle, Send } from "lucide-react-native"
import { Picker } from "@react-native-picker/picker" // For select dropdown

import { commentAPI } from "../../api"
import { AuthContext } from "../../contexts/AuthContext" // Adjusted path

const QASection = ({ videoId }) => {
  const { user } = useContext(AuthContext)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState({ content: "" })
  const [expandedAnswers, setExpandedAnswers] = useState(new Set())
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true)
      try {
        const res = await commentAPI.getByVideo(videoId)
        const mapped = res.data.map((c) => ({
          id: c.id, // Use actual comment ID
          commentId: c.id,
          title: `Comment by ${c.user_name || "Unknown"}`,
          content: c.content,
          author: c.user_name || "Unknown",
          authorId: c.user_id,
          authorAvatar: "/placeholder.svg", // Placeholder, consider generating initials
          timestamp: new Date(c.created_at).toLocaleString(),
          upvotes: 0, // Assuming no upvote/downvote data from API
          downvotes: 0,
          isInstructor: false, // Assuming no instructor flag from API
          answers: (c.replies || []).map((r) => ({
            id: r.id, // Use actual reply ID
            content: r.content,
            author: r.user_name || "Unknown",
            authorId: r.user_id,
            authorAvatar: "/placeholder.svg",
            timestamp: new Date(r.created_at).toLocaleString(),
          })),
        }))
        setComments(mapped)
      } catch (err) {
        console.error("Error fetching comments", err)
        Alert.alert("Error", "Failed to load Q&A. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    if (videoId) {
      fetchComments()
    }
  }, [videoId])

  const handleDelete = async (commentId) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this comment?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await commentAPI.delete(commentId)
            setComments((prev) => prev.filter((c) => c.commentId !== commentId))
            Alert.alert("Success", "Comment deleted successfully.")
          } catch (err) {
            console.error("Failed to delete comment", err)
            Alert.alert("Error", err.response?.data?.message || "Failed to delete comment. Please try again.")
          }
        },
      },
    ])
  }

  const handleSubmit = async () => {
    if (!newQuestion.content.trim()) {
      Alert.alert("Input Required", "Please enter your question.")
      return
    }
    try {
      const res = await commentAPI.create({
        video_id: videoId,
        content: newQuestion.content,
      })
      const c = res.data.comment
      const newEntry = {
        id: c.id,
        commentId: c.id,
        title: `Comment by ${c.user_name || user?.name || "You"}`,
        content: c.content,
        author: c.user_name || user?.name || "You",
        authorId: user?.id,
        authorAvatar: "/placeholder.svg",
        timestamp: new Date(c.created_at).toLocaleString(),
        upvotes: 0,
        downvotes: 0,
        isInstructor: false,
        answers: [],
      }
      setComments([newEntry, ...comments])
      setNewQuestion({ content: "" })
      setShowNewQuestion(false)
      Alert.alert("Success", "Question posted successfully!")
    } catch (err) {
      console.error("Failed to submit comment", err)
      Alert.alert("Error", err.response?.data?.message || "Failed to post question. Please try again.")
    }
  }

  const toggleAnswers = (id) => {
    setExpandedAnswers((prev) => {
      const copy = new Set(prev)
      copy.has(id) ? copy.delete(id) : copy.add(id)
      return copy
    })
  }

  const filtered = comments.filter((c) => {
    const searchMatch =
      c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase())
    const filterMatch =
      filterType === "all" ||
      (filterType === "unanswered" && c.answers.length === 0) ||
      (filterType === "instructor" && c.answers.some((a) => a.isInstructor)) // Assuming isInstructor is available
    return searchMatch && filterMatch
  })

  const sorted = [...filtered].sort((a, b) =>
    sortBy === "popular"
      ? b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
      : new Date(b.timestamp) - new Date(a.timestamp),
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading Q&A...</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Q&A</Text>
            <Text style={styles.sectionSubtitle}>{comments.length} comments</Text>
          </View>
          <TouchableOpacity onPress={() => setShowNewQuestion(!showNewQuestion)} style={styles.askQuestionButton}>
            <Text style={styles.askQuestionButtonText}>Ask Question</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              placeholder="Search..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filterType}
              onValueChange={(itemValue) => setFilterType(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Unanswered" value="unanswered" />
              <Picker.Item label="Instructor Answered" value="instructor" />
            </Picker>
          </View>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={sortBy} onValueChange={(itemValue) => setSortBy(itemValue)} style={styles.picker}>
              <Picker.Item label="Recent" value="recent" />
              <Picker.Item label="Popular" value="popular" />
            </Picker>
          </View>
        </View>

        {/* Ask Form */}
        {showNewQuestion && (
          <View style={styles.askForm}>
            <TextInput
              value={newQuestion.content}
              onChangeText={(text) => setNewQuestion({ content: text })}
              placeholder="Ask something about this video..."
              multiline
              numberOfLines={4}
              style={styles.textArea}
              required
            />
            <View style={styles.formButtons}>
              <TouchableOpacity onPress={handleSubmit} style={styles.postButton}>
                <Send size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowNewQuestion(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsList}>
          {sorted.map((q) => (
            <View key={q.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{q.author?.charAt(0) || "U"}</Text>
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentAuthor}>{q.title}</Text>
                    {user?.id === q.authorId && (
                      <TouchableOpacity onPress={() => handleDelete(q.commentId)} style={styles.deleteButton}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{q.content}</Text>
                  <View style={styles.commentFooter}>
                    <Text style={styles.commentTimestamp}>
                      {q.author} • {q.timestamp}
                    </Text>
                    <View style={styles.commentActions}>
                      {q.answers.length > 0 && (
                        <TouchableOpacity onPress={() => toggleAnswers(q.id)} style={styles.toggleAnswersButton}>
                          <MessageCircle size={16} color="#2563eb" />
                          <Text style={styles.toggleAnswersText}>
                            {q.answers.length} Answer{q.answers.length > 1 ? "s" : ""}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {expandedAnswers.has(q.id) && (
                    <View style={styles.answersContainer}>
                      {q.answers.map((a) => (
                        <View key={a.id} style={styles.answerCard}>
                          <Text style={styles.answerAuthor}>{a.author}</Text>
                          <Text style={styles.answerContent}>{a.content}</Text>
                          <Text style={styles.answerTimestamp}>{a.timestamp}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
        {!loading && sorted.length === 0 && (
          <View style={styles.noCommentsContainer}>
            <MessageCircle size={40} color="#9ca3af" style={styles.noCommentsIcon} />
            <Text style={styles.noCommentsText}>No comments yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 24, // space-y-6
  },
  container: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4b5563",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24, // space-y-6
  },
  sectionTitle: {
    fontSize: 20, // text-xl
    fontWeight: "600", // font-semibold
    color: "#1f2937", // text-gray-900
  },
  sectionSubtitle: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
  },
  askQuestionButton: {
    backgroundColor: "#2563eb", // bg-blue-600
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  askQuestionButtonText: {
    color: "white",
  },

  // Filters
  filterContainer: {
    flexDirection: "column", // sm:flex-row
    gap: 16, // gap-4
    marginBottom: 24, // space-y-6
  },
  searchInputContainer: {
    flex: 1,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12, // left-3
    top: "50%",
    marginTop: -8, // -translate-y-1/2
  },
  searchInput: {
    width: "100%",
    paddingLeft: 40, // pl-10
    paddingRight: 16, // pr-4
    paddingVertical: 8, // py-2
    borderWidth: 1,
    borderColor: "#d1d5db", // border-gray-300
    borderRadius: 8, // rounded-lg
    fontSize: 16,
    color: "#1f2937",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "white",
    overflow: "hidden", // Ensures border radius applies to picker
  },
  picker: {
    height: 40, // Adjust height as needed
    width: 150, // Adjust width as needed
    color: "#1f2937",
  },

  // Ask Form
  askForm: {
    backgroundColor: "#f9fafb", // bg-gray-50
    padding: 16, // p-4
    borderRadius: 8, // rounded
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    marginBottom: 24, // space-y-4
  },
  textArea: {
    width: "100%",
    paddingHorizontal: 12, // px-3
    paddingVertical: 8, // py-2
    borderWidth: 1,
    borderColor: "#d1d5db", // border-gray-300
    borderRadius: 8, // rounded-lg
    textAlignVertical: "top", // For multiline
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 16, // space-y-4
  },
  formButtons: {
    flexDirection: "row",
    gap: 8, // gap-2
  },
  postButton: {
    backgroundColor: "#2563eb", // bg-blue-600
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // gap-2
  },
  postButtonText: {
    color: "white",
  },
  buttonIcon: {
    marginRight: 4,
  },
  cancelButton: {
    backgroundColor: "#d1d5db", // bg-gray-300
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  cancelButtonText: {
    color: "#1f2937",
  },

  // Comments List
  commentsList: {
    gap: 16, // space-y-4
  },
  commentCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    borderRadius: 8, // rounded
    padding: 16, // p-4
  },
  commentHeader: {
    flexDirection: "row",
    gap: 12, // gap-3
  },
  avatarContainer: {
    width: 40, // w-10
    height: 40, // h-10
    backgroundColor: "#bfdbfe", // bg-blue-100
    borderRadius: 9999, // rounded-full
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#2563eb", // text-blue-600
    fontWeight: "500", // font-medium
    fontSize: 14,
  },
  commentContent: {
    flex: 1,
  },
  commentMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4, // mb-1
  },
  commentAuthor: {
    fontWeight: "500", // font-medium
    color: "#1f2937", // text-gray-900
  },
  deleteButton: {
    // text-red-600 hover:text-red-800 text-sm
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 14,
  },
  commentText: {
    color: "#374151", // text-gray-700
    marginBottom: 8, // mb-2
  },
  commentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 14, // text-sm
    color: "#6b7280", // text-gray-500
  },
  commentTimestamp: {
    fontSize: 14,
    color: "#6b7280",
  },
  commentActions: {
    flexDirection: "row",
    gap: 12, // gap-3
  },
  toggleAnswersButton: {
    flexDirection: "row",
    gap: 4, // gap-1
    alignItems: "center",
  },
  toggleAnswersText: {
    color: "#2563eb", // text-blue-600
  },
  answersContainer: {
    marginTop: 12, // mt-3
    gap: 8, // space-y-2
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb", // border-l pl-4
    paddingLeft: 16,
  },
  answerCard: {
    backgroundColor: "#f9fafb", // bg-gray-50
    padding: 12, // p-3
    borderRadius: 8, // rounded
  },
  answerAuthor: {
    fontWeight: "500", // font-medium
    color: "#1f2937", // text-gray-900
  },
  answerContent: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
  },
  answerTimestamp: {
    fontSize: 12, // text-xs
    color: "#9ca3af", // text-gray-400
  },
  noCommentsContainer: {
    alignItems: "center", // text-center
    paddingVertical: 24, // py-6
    color: "#6b7280", // text-gray-500
  },
  noCommentsIcon: {
    marginBottom: 8, // mb-2
    opacity: 0.5,
  },
  noCommentsText: {
    color: "#6b7280",
  },
})

export default QASection
