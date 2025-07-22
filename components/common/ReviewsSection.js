"use client";

import { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Star, Search, Trash2 } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import { ratingAPI } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

const ReviewsSection = ({ videoId }) => {
  const { user } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [userReviewId, setUserReviewId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const reviewsRes = await ratingAPI.getVideoRatings(videoId);
        setReviews(reviewsRes.data);

        if (user?.id) {
          const userReviewRes = await ratingAPI.getUserRating(videoId);
          if (userReviewRes.data) {
            setNewReview({
              rating: userReviewRes.data.stars,
              comment: userReviewRes.data.feedback,
            });
            setUserReviewId(userReviewRes.data.id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchReviews();
    }
  }, [videoId, user?.id]);

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert("Input Required", "Please enter your review comment.");
      return;
    }
    try {
      const res = await ratingAPI.rateVideo({
        video_id: videoId,
        stars: newReview.rating,
        feedback: newReview.comment,
      });
      const updated = res.data.rating;
      setUserReviewId(updated.id);
      setReviews((prev) => {
        const existing = prev.filter((r) => r.id !== updated.id);
        return [updated, ...existing];
      });
      setShowReviewForm(false);
      setNewReview({ rating: 5, comment: "" });
      Alert.alert(
        "Success",
        userReviewId
          ? "Review updated successfully!"
          : "Review submitted successfully!"
      );
    } catch (err) {
      console.error("Failed to submit review", err);
      Alert.alert(
        "Error",
        err.response?.data?.message ||
          "Failed to submit review. Please try again."
      );
    }
  };

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this review?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await ratingAPI.deleteRating(reviewId);
              setReviews((prev) => prev.filter((r) => r.id !== reviewId));
              if (reviewId === userReviewId) {
                setUserReviewId(null);
                setNewReview({ rating: 5, comment: "" });
              }
              Alert.alert("Success", "Review deleted successfully.");
            } catch (err) {
              console.error("Failed to delete review", err);
              Alert.alert(
                "Error",
                err.response?.data?.message ||
                  "Failed to delete review. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && onRatingChange && onRatingChange(star)}
          disabled={!interactive}
          style={interactive ? styles.interactiveStar : null}
        >
          <Star
            size={16}
            color={star <= rating ? "#facc15" : "#d1d5db"}
            fill={star <= rating ? "#facc15" : "none"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.feedback.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating =
      filterRating === "all" || review.stars === Number.parseInt(filterRating);
    return matchesSearch && matchesRating;
  });

  const getAverageRating = () => {
    const total = reviews.reduce((sum, r) => sum + r.stars, 0);
    return reviews.length ? (total / reviews.length).toFixed(1) : "0.0";
  };

  const getRatingDistribution = () => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => dist[r.stars]++);
    return dist;
  };
  const distribution = getRatingDistribution();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        {/* Rating Summary */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingSummaryGrid}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRatingText}>{getAverageRating()}</Text>
              <View style={styles.averageRatingStars}>
                {renderStars(Math.round(Number(getAverageRating())))}
              </View>
              <Text style={styles.reviewCountText}>
                {reviews.length} reviews
              </Text>
            </View>
            <View style={styles.distributionContainer}>
              {[5, 4, 3, 2, 1].map((rating) => (
                <View key={rating} style={styles.distributionRow}>
                  <Text style={styles.distributionLabel}>{rating} ★</Text>
                  <View style={styles.distributionBarBg}>
                    <View
                      style={[
                        styles.distributionBarFill,
                        {
                          width: `${
                            (distribution[rating] / reviews.length) * 100 || 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.distributionCount}>
                    {distribution[rating]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Header + Write Review Button */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Student Reviews</Text>
          {user && (
            <TouchableOpacity
              onPress={() => setShowReviewForm((prev) => !prev)}
              style={styles.writeReviewButton}
            >
              <Text style={styles.writeReviewButtonText}>
                {userReviewId ? "Edit Review" : "Write a Review"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Review Form */}
        {showReviewForm && (
          <View style={styles.reviewFormCard}>
            <Text style={styles.reviewFormTitle}>
              {userReviewId ? "Update Your Review" : "Write Your Review"}
            </Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Rating</Text>
              {renderStars(newReview.rating, true, (rating) =>
                setNewReview((prev) => ({ ...prev, rating }))
              )}
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Your Review</Text>
              <TextInput
                value={newReview.comment}
                onChangeText={(text) =>
                  setNewReview((prev) => ({ ...prev, comment: text }))
                }
                placeholder="Share your thoughts..."
                style={styles.textArea}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity
                onPress={() => setShowReviewForm(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitReview}
                style={styles.submitButton}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search & Filter */}
        <View style={styles.filterContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              placeholder="Search reviews..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {filteredReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {review.user?.name?.charAt(0) || "U"}
                  </Text>
                </View>
                <View style={styles.reviewMeta}>
                  <View style={styles.reviewAuthorRow}>
                    <Text style={styles.reviewAuthorName}>
                      {review.user?.name || "Anonymous"}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {formatDate(review.created_at)}
                    </Text>
                  </View>
                  <View style={styles.reviewStarsRow}>
                    {renderStars(review.stars)}
                    <Text style={styles.reviewScore}>({review.stars}/5)</Text>
                    {user && review.user_id === user.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteReview(review.id)}
                        style={styles.deleteReviewButton}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.reviewContent}>{review.feedback}</Text>
            </View>
          ))}
        </View>
        {filteredReviews.length === 0 && (
          <View style={styles.noReviewsContainer}>
            <Star size={48} color="#9ca3af" style={styles.noReviewsIcon} />
            <Text style={styles.noReviewsText}>
              No reviews found matching your criteria.
            </Text>
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

  ratingSummaryCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  ratingSummaryGrid: {
    flexDirection: "column",
    gap: 24,
  },
  averageRatingContainer: {
    alignItems: "center",
  },
  averageRatingText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  averageRatingStars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  reviewCountText: {
    color: "#4b5563",
  },
  distributionContainer: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  distributionLabel: {
    fontSize: 14,
    color: "#4b5563",
    width: 40,
  },
  distributionBarBg: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    borderRadius: 9999,
    height: 8,
  },
  distributionBarFill: {
    backgroundColor: "#facc15",
    height: 8,
    borderRadius: 9999,
  },
  distributionCount: {
    fontSize: 14,
    color: "#4b5563",
    width: 32,
    textAlign: "right",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  writeReviewButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  writeReviewButtonText: {
    color: "white",
  },

  reviewFormCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  reviewFormTitle: {
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 8,
  },
  starContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  interactiveStar: {},
  textArea: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#1f2937",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#4b5563",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonText: {
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

  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
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
  reviewMeta: {
    flex: 1,
  },
  reviewAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewAuthorName: {
    fontWeight: "500",
    color: "#1f2937",
  },
  reviewDate: {
    fontSize: 14,
    color: "#6b7280",
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  reviewScore: {
    fontSize: 14,
    color: "#4b5563",
  },
  deleteReviewButton: {
    marginLeft: 16,
  },
  reviewContent: {
    color: "#374151",
    marginBottom: 8,
  },
  noReviewsContainer: {
    alignItems: "center",
    paddingVertical: 32,
    color: "#6b7280",
  },
  noReviewsIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  noReviewsText: {
    color: "#6b7280",
  },
});

export default ReviewsSection;
