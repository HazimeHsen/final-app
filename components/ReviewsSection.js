"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Star, Search, Filter, Trash2 } from "lucide-react-native";
import { ratingAPI } from "../api";
import { AuthContext } from "../contexts/AuthContext";

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
        if (videoId) {
          const res = await ratingAPI.getVideoRatings(videoId);
          setReviews(res.data);

          const userRatingRes = await ratingAPI.getUserRating(videoId);
          if (userRatingRes.data) {
            setNewReview({
              rating: userRatingRes.data.stars,
              comment: userRatingRes.data.feedback,
            });
            setUserReviewId(userRatingRes.data.id);
          } else {
            setNewReview({ rating: 5, comment: "" });
            setUserReviewId(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch reviews or user rating:", err);
        setReviews([]);
        setNewReview({ rating: 5, comment: "" });
        setUserReviewId(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [videoId, user]);

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert("Error", "Please enter your review comment.");
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
      Alert.alert(
        "Success",
        userReviewId
          ? "Review updated successfully!"
          : "Review submitted successfully!"
      );
    } catch (err) {
      console.error("Failed to submit review", err);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    }
  };

  const handleDeleteReview = (reviewId) => {
    Alert.alert(
      "Delete Review",
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
              Alert.alert("Success", "Review deleted successfully!");
            } catch (err) {
              console.error("Failed to delete review", err);
              Alert.alert(
                "Error",
                "Something went wrong. Could not delete review."
              );
            }
          },
        },
      ],
      { cancelable: true }
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
          style={interactive ? styles.interactiveStar : styles.staticStar}
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
      review.feedback?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Rating Summary */}
      <View style={styles.ratingSummaryCard}>
        <View style={styles.ratingSummaryGrid}>
          <View style={styles.averageRatingContainer}>
            <Text style={styles.averageRatingText}>{getAverageRating()}</Text>
            <View style={styles.averageRatingStars}>
              {renderStars(Math.round(Number(getAverageRating())))}
            </View>
            <Text style={styles.reviewCountText}>{reviews.length} reviews</Text>
          </View>
          <View style={styles.distributionContainer}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={rating} style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>{rating} ★</Text>
                <View style={styles.distributionBarBackground}>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Reviews</Text>
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
        <View style={styles.reviewForm}>
          <Text style={styles.formTitle}>
            {userReviewId ? "Update Your Review" : "Write Your Review"}
          </Text>
          <View style={styles.formContent}>
            <View>
              <Text style={styles.formLabel}>Rating</Text>
              {renderStars(newReview.rating, true, (rating) =>
                setNewReview((prev) => ({ ...prev, rating }))
              )}
            </View>
            <View>
              <Text style={styles.formLabel}>Your Review</Text>
              <TextInput
                style={styles.reviewInput}
                value={newReview.comment}
                onChangeText={(text) =>
                  setNewReview((prev) => ({ ...prev, comment: text }))
                }
                placeholder="Share your thoughts..."
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
        </View>
      )}

      {/* Search & Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reviews..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <View style={styles.pickerContainer}>
          <Filter size={16} color="#9ca3af" style={styles.filterIcon} />
          <TextInput
            style={styles.picker}
            value={filterRating}
            onChangeText={setFilterRating}
            selectTextOnFocus={false}
            placeholder="All Ratings"
          />
          {/* In a real app, this would be a custom Picker component or a dropdown */}
        </View>
      </View>

      {/* Reviews List */}
      <View style={styles.reviewsList}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#f97316"
            style={styles.loadingIndicator}
          />
        ) : filteredReviews.length === 0 ? (
          <View style={styles.noReviews}>
            <Star size={48} color="#6b7280" style={styles.noReviewsIcon} />
            <Text style={styles.noReviewsText}>
              No reviews found matching your criteria.
            </Text>
          </View>
        ) : (
          filteredReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewCardContent}>
                <View style={styles.reviewerAvatarContainer}>
                  <Text style={styles.reviewerAvatarText}>
                    {review.user?.name?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.reviewDetails}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>
                        {review.user?.name}
                      </Text>
                    </View>
                    <Text style={styles.reviewDate}>
                      {formatDate(review.created_at)}
                    </Text>
                  </View>
                  <View style={styles.reviewRatingRow}>
                    {renderStars(review.stars)}
                    <Text style={styles.reviewRatingText}>
                      ({review.stars}/5)
                    </Text>
                    {user && review.user_id === user.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteReview(review.id)}
                        style={styles.deleteReviewButton}
                        title="Delete review"
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.reviewFeedback}>{review.feedback}</Text>
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
  ratingSummaryCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
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
    width: 32,
  },
  distributionBarBackground: {
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
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
    fontSize: 14,
  },
  reviewForm: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 16,
  },
  formContent: {
    gap: 16,
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
  staticStar: {},
  reviewInput: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    textAlignVertical: "top",
    fontSize: 14,
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
    color: "#4b5563",
  },
  cancelButtonText: {
    color: "#4b5563",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 14,
  },
  searchFilterContainer: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  searchInputContainer: {
    flex: 1,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
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
    position: "relative",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  filterIcon: {
    position: "absolute",
    left: 12,
  },
  picker: {
    paddingLeft: 40,
    paddingRight: 32,
    paddingVertical: 8,
    backgroundColor: "white",
    fontSize: 14,
    color: "#1f2937",
    minWidth: 120,
  },
  reviewsList: {
    gap: 16,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  noReviews: {
    alignItems: "center",
    paddingVertical: 32,
    color: "#6b7280",
  },
  noReviewsIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  noReviewsText: {
    fontSize: 16,
    color: "#6b7280",
  },
  reviewCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
  },
  reviewCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  reviewerAvatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#dbeafe",
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewerAvatarText: {
    color: "#2563eb",
    fontWeight: "500",
    fontSize: 14,
  },
  reviewDetails: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewerName: {
    fontWeight: "500",
    color: "#1f2937",
  },
  reviewDate: {
    fontSize: 14,
    color: "#6b7280",
  },
  reviewRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  reviewRatingText: {
    fontSize: 14,
    color: "#4b5563",
  },
  deleteReviewButton: {
    marginLeft: 16,
  },
  reviewFeedback: {
    color: "#374151",
    marginBottom: 8,
  },
});

export default ReviewsSection;
