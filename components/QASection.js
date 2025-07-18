"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Search, MessageCircle, Send } from "lucide-react-native";
import { commentAPI } from "../api";
import { AuthContext } from "../contexts/AuthContext";

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
      try {
        const res = await commentAPI.getByVideo(videoId);
        const mapped = res.data.map((c, i) => ({
          id: i + 1,
          commentId: c.id,
          title: `Comment by ${c.user_name || "Unknown"}`,
          content: c.content,
          author: c.user_name || "Unknown",
          authorId: c.user_id,
          authorAvatar: "/placeholder.svg?height=40&width=40",
          timestamp: new Date(c.created_at).toLocaleString(),
          upvotes: 0,
          downvotes: 0,
          isInstructor: false,
          answers: (c.replies || []).map((r, j) => ({
            id: `${i + 1}-${j}`,
            content: r.content,
            author: r.user_name || "Unknown",
            authorId: r.user_id,
            authorAvatar: "/placeholder.svg?height=40&width=40",
            timestamp: new Date(r.created_at).toLocaleString(),
          })),
        }));
        setComments(mapped);
      } catch (err) {
        console.error("Error fetching comments", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [videoId]);

  const handleDelete = (commentId) => {
    Alert.alert(
      "Delete Comment",
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
            } catch (err) {
              console.error("Failed to delete comment", err);
              Alert.alert(
                "Error",
                "Something went wrong. Could not delete comment."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSubmit = async () => {
    if (!newQuestion.content.trim()) return;

    try {
      const res = await commentAPI.create({
        video_id: videoId,
        content: newQuestion.content,
      });
      const c = res.data.comment;
      const newEntry = {
        id: comments.length + 1,
        commentId: c.id,
        title: `Comment by ${c.user_name}`,
        content: c.content,
        author: c.user_name,
        authorId: user.id,
        authorAvatar: "/placeholder.svg?height=40&width=40",
        timestamp: new Date(c.created_at).toLocaleString(),
        upvotes: 0,
        downvotes: 0,
        isInstructor: false,
        answers: [],
      };
      setComments([newEntry, ...comments]);
      setNewQuestion({ content: "" });
      setShowNewQuestion(false);
    } catch (err) {
      console.error("Failed to submit comment", err);
      Alert.alert("Error", "Failed to submit comment. Please try again.");
    }
  };

  const toggleAnswers = (id) => {
    const copy = new Set(expandedAnswers);
    copy.has(id) ? copy.delete(id) : copy.add(id);
    setExpandedAnswers(copy);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Q&A</Text>
          <Text style={styles.subtitle}>{comments.length} comments</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowNewQuestion(!showNewQuestion)}
          style={styles.askButton}
        >
          <Text style={styles.askButtonText}>Ask Question</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <View style={styles.pickerContainer}>
          <TextInput
            style={styles.picker}
            value={filterType}
            onChangeText={setFilterType}
            selectTextOnFocus={false}
            placeholder="Filter"
          />
        </View>
        <View style={styles.pickerContainer}>
          <TextInput
            style={styles.picker}
            value={sortBy}
            onChangeText={setSortBy}
            selectTextOnFocus={false}
            placeholder="Sort By"
          />
        </View>
      </View>

      {showNewQuestion && (
        <View style={styles.askForm}>
          <TextInput
            style={styles.questionInput}
            value={newQuestion.content}
            onChangeText={(text) => setNewQuestion({ content: text })}
            placeholder="Ask something about this video..."
            multiline
            numberOfLines={4}
            required
          />
          <View style={styles.formButtons}>
            <TouchableOpacity onPress={handleSubmit} style={styles.postButton}>
              <Send size={16} color="white" />
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

      <View style={styles.commentsList}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#f97316"
            style={styles.loadingIndicator}
          />
        ) : sorted.length === 0 ? (
          <View style={styles.noComments}>
            <MessageCircle
              size={40}
              color="#6b7280"
              style={styles.noCommentsIcon}
            />
            <Text style={styles.noCommentsText}>No comments yet</Text>
          </View>
        ) : (
          sorted.map((q) => (
            <View key={q.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Image
                  source={{ uri: q.authorAvatar }}
                  style={styles.authorAvatar}
                />
                <View style={styles.commentMeta}>
                  <View style={styles.commentTitleRow}>
                    <Text style={styles.commentAuthor}>{q.title}</Text>
                    {user?.id === q.authorId && (
                      <TouchableOpacity
                        onPress={() => handleDelete(q.commentId)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentContent}>{q.content}</Text>
                  <View style={styles.commentFooter}>
                    <Text style={styles.commentTimestamp}>
                      {q.author} • {q.timestamp}
                    </Text>
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
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
  },
  askButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  askButtonText: {
    color: "white",
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    flex: 1,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#1f2937",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1f2937",
    minWidth: 120,
  },
  askForm: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 16,
    marginBottom: 24,
  },
  questionInput: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#1f2937",
    textAlignVertical: "top",
  },
  formButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
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
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: "#d1d5db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#4b5563",
    fontSize: 14,
  },
  commentsList: {
    gap: 16,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  noComments: {
    alignItems: "center",
    paddingVertical: 24,
    color: "#6b7280",
  },
  noCommentsIcon: {
    marginBottom: 8,
  },
  noCommentsText: {
    fontSize: 16,
    color: "#6b7280",
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
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
  },
  commentMeta: {
    flex: 1,
  },
  commentTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
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
  commentContent: {
    color: "#374151",
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 14,
    color: "#6b7280",
  },
  commentTimestamp: {
    fontSize: 14,
    color: "#6b7280",
  },
  toggleAnswersButton: {
    flexDirection: "row",
    gap: 4,
    color: "#2563eb",
    alignItems: "center",
  },
  toggleAnswersText: {
    color: "#2563eb",
    fontSize: 14,
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
});

export default QASection;
