"use client";

import { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Search, MessageCircle, Send } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import { commentAPI } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

const QASection = ({ videoId }) => {
  const { user } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ content: "" });
  const [expandedAnswers, setExpandedAnswers] = useState(new Set());
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await commentAPI.getByVideo(videoId);
        const mapped = res.data.map((c) => ({
          id: c.id,
          commentId: c.id,
          title: `Comment by ${c.user_name || "Unknown"}`,
          content: c.content,
          author: c.user_name || "Unknown",
          authorId: c.user_id,
          authorAvatar: "/placeholder.svg",
          timestamp: new Date(c.created_at).toLocaleString(),
          upvotes: 0,
          downvotes: 0,
          isInstructor: false,
          answers: (c.replies || []).map((r) => ({
            id: r.id,
            content: r.content,
            author: r.user_name || "Unknown",
            authorId: r.user_id,
            authorAvatar: "/placeholder.svg",
            timestamp: new Date(r.created_at).toLocaleString(),
          })),
        }));
        setComments(mapped);
      } catch (err) {
        console.error("Error fetching comments", err);
        Alert.alert("Error", "Failed to load Q&A. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    if (videoId) {
      fetchComments();
    }
  }, [videoId]);

  const handleDelete = async (commentId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this comment?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await commentAPI.delete(commentId);
              setComments((prev) =>
                prev.filter((c) => c.commentId !== commentId)
              );
              Alert.alert("Success", "Comment deleted successfully.");
            } catch (err) {
              console.error("Failed to delete comment", err);
              Alert.alert(
                "Error",
                err.response?.data?.message ||
                  "Failed to delete comment. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!newQuestion.content.trim()) {
      Alert.alert("Input Required", "Please enter your question.");
      return;
    }
    try {
      const res = await commentAPI.create({
        video_id: videoId,
        content: newQuestion.content,
      });
      const c = res.data.comment;
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
      };
      setComments([newEntry, ...comments]);
      setNewQuestion({ content: "" });
      setShowNewQuestion(false);
      Alert.alert("Success", "Question posted successfully!");
    } catch (err) {
      console.error("Failed to submit comment", err);
      Alert.alert(
        "Error",
        err.response?.data?.message ||
          "Failed to post question. Please try again."
      );
    }
  };

  const toggleAnswers = (id) => {
    setExpandedAnswers((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const filtered = comments.filter((c) => {
    const searchMatch =
      c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const filterMatch =
      filterType === "all" ||
      (filterType === "unanswered" && c.answers.length === 0) ||
      (filterType === "instructor" && c.answers.some((a) => a.isInstructor));
    return searchMatch && filterMatch;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortBy === "popular"
      ? b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
      : new Date(b.timestamp) - new Date(a.timestamp)
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading Q&A...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Q&A</Text>
            <Text style={styles.sectionSubtitle}>
              {comments.length} comments
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowNewQuestion(!showNewQuestion)}
            style={styles.askQuestionButton}
          >
            <Text style={styles.askQuestionButtonText}>Ask Question</Text>
          </TouchableOpacity>
        </View>

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
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.postButton}
              >
                <Send size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowNewQuestion(false)}
                style={styles.cancelButton}
              >
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
                  <Text style={styles.avatarText}>
                    {q.author?.charAt(0) || "U"}
                  </Text>
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentText}>{q.content}</Text>
                    {user?.id === q.authorId && (
                      <TouchableOpacity
                        onPress={() => handleDelete(q.commentId)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.commentFooter}>
                    <Text style={styles.commentTimestamp}>
                      {q.author} • {q.timestamp}
                    </Text>
                    <View style={styles.commentActions}>
                      {q.answers.length > 0 && (
                        <TouchableOpacity
                          onPress={() => toggleAnswers(q.id)}
                          style={styles.toggleAnswersButton}
                        >
                          <MessageCircle size={16} color="#2563eb" />
                          <Text style={styles.toggleAnswersText}>
                            {q.answers.length} Answer
                            {q.answers.length > 1 ? "s" : ""}
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
                          <Text style={styles.answerTimestamp}>
                            {a.timestamp}
                          </Text>
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
            <MessageCircle
              size={40}
              color="#9ca3af"
              style={styles.noCommentsIcon}
            />
            <Text style={styles.noCommentsText}>No comments yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
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

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#4b5563",
  },
  askQuestionButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  askQuestionButtonText: {
    color: "white",
  },

  filterContainer: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  searchInputContainer: {
    flex: 1,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -8,
  },
  searchInput: {
    width: "100%",
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 16,
    color: "#1f2937",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "white",
    overflow: "hidden",
  },
  picker: {
    height: 40,
    width: 150,
    color: "#1f2937",
  },

  askForm: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 24,
  },
  textArea: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: "row",
    gap: 8,
  },
  postButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postButtonText: {
    color: "white",
  },
  buttonIcon: {
    marginRight: 4,
  },
  cancelButton: {
    backgroundColor: "#d1d5db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#1f2937",
  },

  commentsList: {
    gap: 16,
  },
  commentCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
  },
  commentHeader: {
    flexDirection: "row",
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#bfdbfe",
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#2563eb",
    fontWeight: "500",
    fontSize: 14,
  },
  commentContent: {
    flex: 1,
  },
  commentMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAuthor: {
    fontWeight: "500",
    color: "#1f2937",
  },
  deleteButton: {},
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 14,
  },
  commentText: {
    color: "#374151",
  },
  commentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#6b7280",
  },
  commentTimestamp: {
    fontSize: 14,
    color: "#6b7280",
  },
  commentActions: {
    flexDirection: "row",
    gap: 12,
  },
  toggleAnswersButton: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  toggleAnswersText: {
    color: "#2563eb",
  },
  answersContainer: {
    marginTop: 12,
    gap: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb",
    paddingLeft: 16,
  },
  answerCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
  },
  answerAuthor: {
    fontWeight: "500",
    color: "#1f2937",
  },
  answerContent: {
    fontSize: 14,
    color: "#4b5563",
  },
  answerTimestamp: {
    fontSize: 12,
    color: "#9ca3af",
  },
  noCommentsContainer: {
    alignItems: "center",
    paddingVertical: 24,
    color: "#6b7280",
  },
  noCommentsIcon: {
    marginBottom: 8,
    opacity: 0.5,
  },
  noCommentsText: {
    color: "#6b7280",
  },
});

export default QASection;
