"use client"

import { useEffect, useState, useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from "react-native"
import { Star, Search, Trash2 } from "lucide-react-native"
import { Picker } from "@react-native-picker/picker" // For select dropdown

import { ratingAPI } from "../../api"
import { AuthContext } from "../../contexts/AuthContext" // Adjusted path

const ReviewsSection = ({ videoId }) => {
  const { user } = useContext(AuthContext)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRating, setFilterRating] = useState("all")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" })
  const [userReviewId, setUserReviewId] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      try {
        const reviewsRes = await ratingAPI.getVideoRatings(videoId)
        setReviews(reviewsRes.data)

        if (user?.id) {
          const userReviewRes = await ratingAPI.getUserRating(videoId)
          if (userReviewRes.data) {
            setNewReview({ rating: userReviewRes.data.stars, comment: userReviewRes.data.feedback })
            setUserReviewId(userReviewRes.data.id)
          }
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err)
      } finally {
        setLoading(false)
      }
    }

    if (videoId) {
      fetchReviews()
    }
  }, [videoId, user?.id])

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert("Input Required", "Please enter your review comment.")
      return
    }
    try {
      const res = await ratingAPI.rateVideo({
        video_id: videoId,
        stars: newReview.rating,
        feedback: newReview.comment,
      })
      const updated = res.data.rating
      setUserReviewId(updated.id)
      setReviews((prev) => {
        const existing = prev.filter((r) => r.id !== updated.id)
        return [updated, ...existing]
      })
      setShowReviewForm(false)
      setNewReview({ rating: 5, comment: "" })
      Alert.alert("Success", userReviewId ? "Review updated successfully!" : "Review submitted successfully!")
    } catch (err) {
      console.error("Failed to submit review", err)
      Alert.alert("Error", err.response?.data?.message || "Failed to submit review. Please try again.")
    }
  }

  const handleDeleteReview = async (reviewId) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this review?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await ratingAPI.deleteRating(reviewId)
            setReviews((prev) => prev.filter((r) => r.id !== reviewId))
            if (reviewId === userReviewId) {
              setUserReviewId(null)
              setNewReview({ rating: 5, comment: "" })
            }
            Alert.alert("Success", "Review deleted successfully.")
          } catch (err) {
            console.error("Failed to delete review", err)
            Alert.alert("Error", err.response?.data?.message || "Failed to delete review. Please try again.")
          }
        },
      },
    ])
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const renderStars = (rating, interactive = false, onRatingChange = null) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && onRatingChange && onRatingChange(star)}
          disabled={!interactive}
          style={interactive ? styles.interactiveStar : null}
        >
          <Star size={16} color={star <= rating ? "#facc15" : "#d1d5db"} fill={star <= rating ? "#facc15" : "none"} />
        </TouchableOpacity>
      ))}
    </View>
  )

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.feedback.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRating = filterRating === "all" || review.stars === Number.parseInt(filterRating)
    return matchesSearch && matchesRating
  })

  const getAverageRating = () => {
    const total = reviews.reduce((sum, r) => sum + r.stars, 0)
    return reviews.length ? (total / reviews.length).toFixed(1) : "0.0"
  }

  const getRatingDistribution = () => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((r) => dist[r.stars]++)
    return dist
  }
  const distribution = getRatingDistribution()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        {/* Rating Summary */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingSummaryGrid}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRatingText}>{getAverageRating()}</Text>
              <View style={styles.averageRatingStars}>{renderStars(Math.round(Number(getAverageRating())))}</View>
              <Text style={styles.reviewCountText}>{reviews.length} reviews</Text>
            </View>
            <View style={styles.distributionContainer}>
              {[5, 4, 3, 2, 1].map((rating) => (
                <View key={rating} style={styles.distributionRow}>
                  <Text style={styles.distributionLabel}>{rating} ★</Text>
                  <View style={styles.distributionBarBg}>
                    <View
                      style={[
                        styles.distributionBarFill,
                        { width: `${(distribution[rating] / reviews.length) * 100 || 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.distributionCount}>{distribution[rating]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Header + Write Review Button */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Student Reviews</Text>
          {user && (
            <TouchableOpacity onPress={() => setShowReviewForm((prev) => !prev)} style={styles.writeReviewButton}>
              <Text style={styles.writeReviewButtonText}>{userReviewId ? "Edit Review" : "Write a Review"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Review Form */}
        {showReviewForm && (
          <View style={styles.reviewFormCard}>
            <Text style={styles.reviewFormTitle}>{userReviewId ? "Update Your Review" : "Write Your Review"}</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Rating</Text>
              {renderStars(newReview.rating, true, (rating) => setNewReview((prev) => ({ ...prev, rating })))}
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Your Review</Text>
              <TextInput
                value={newReview.comment}
                onChangeText={(text) => setNewReview((prev) => ({ ...prev, comment: text }))}
                placeholder="Share your thoughts..."
                style={styles.textArea}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity onPress={() => setShowReviewForm(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitReview} style={styles.submitButton}>
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
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filterRating}
              onValueChange={(itemValue) => setFilterRating(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="All Ratings" value="all" />
              {[5, 4, 3, 2, 1].map((r) => (
                <Picker.Item key={r} label={`${r} Stars`} value={r.toString()} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {filteredReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{review.user?.name?.charAt(0) || "U"}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <View style={styles.reviewAuthorRow}>
                    <Text style={styles.reviewAuthorName}>{review.user?.name || "Anonymous"}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                  <View style={styles.reviewStarsRow}>
                    {renderStars(review.stars)}
                    <Text style={styles.reviewScore}>({review.stars}/5)</Text>
                    {user && review.user_id === user.id && (
                      <TouchableOpacity onPress={() => handleDeleteReview(review.id)} style={styles.deleteReviewButton}>
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
            <Text style={styles.noReviewsText}>No reviews found matching your criteria.</Text>
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

  // Rating Summary
  ratingSummaryCard: {
    backgroundColor: "#f9fafb", // bg-gray-50
    borderRadius: 16, // rounded-lg
    padding: 24, // p-6
    marginBottom: 24, // space-y-6
  },
  ratingSummaryGrid: {
    flexDirection: "column", // md:grid-cols-2
    gap: 24, // gap-6
  },
  averageRatingContainer: {
    alignItems: "center", // text-center
  },
  averageRatingText: {
    fontSize: 36, // text-4xl
    fontWeight: "bold",
    color: "#1f2937", // text-gray-900
    marginBottom: 8, // mb-2
  },
  averageRatingStars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8, // mb-2
  },
  reviewCountText: {
    color: "#4b5563", // text-gray-600
  },
  distributionContainer: {
    gap: 8, // space-y-2
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // gap-3
  },
  distributionLabel: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
    width: 40, // w-8
  },
  distributionBarBg: {
    flex: 1,
    backgroundColor: "#e5e7eb", // bg-gray-200
    borderRadius: 9999, // rounded-full
    height: 8, // h-2
  },
  distributionBarFill: {
    backgroundColor: "#facc15", // bg-yellow-400
    height: 8,
    borderRadius: 9999,
  },
  distributionCount: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
    width: 32, // w-8
    textAlign: "right",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16, // space-y-6
  },
  sectionTitle: {
    fontSize: 18, // text-lg
    fontWeight: "600", // font-semibold
    color: "#1f2937", // text-gray-900
  },
  writeReviewButton: {
    backgroundColor: "#2563eb", // bg-blue-600
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  writeReviewButtonText: {
    color: "white",
  },

  // Review Form
  reviewFormCard: {
    backgroundColor: "#f9fafb", // bg-gray-50
    borderRadius: 16, // rounded-lg
    padding: 24, // p-6
    marginBottom: 24, // space-y-6
  },
  reviewFormTitle: {
    fontWeight: "500", // font-medium
    color: "#1f2937", // text-gray-900
    marginBottom: 16, // mb-4
  },
  formField: {
    marginBottom: 16, // space-y-4
  },
  formLabel: {
    fontSize: 14, // text-sm
    fontWeight: "500", // font-medium
    color: "#4b5563", // text-gray-700
    marginBottom: 8, // mb-2
  },
  starContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4, // gap-1
  },
  interactiveStar: {
    // No direct hover/scale in RN, but can add touch feedback
  },
  textArea: {
    width: "100%",
    padding: 12, // p-3
    borderWidth: 1,
    borderColor: "#d1d5db", // border-gray-300
    borderRadius: 8, // rounded-lg
    textAlignVertical: "top", // For multiline
    fontSize: 16,
    color: "#1f2937",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12, // gap-3
  },
  cancelButton: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  cancelButtonText: {
    color: "#4b5563", // text-gray-600
  },
  submitButton: {
    backgroundColor: "#2563eb", // bg-blue-600
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  submitButtonText: {
    color: "white",
  },

  // Search & Filter
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

  // Reviews List
  reviewsList: {
    gap: 16, // space-y-4
  },
  reviewCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb", // border-gray-200
    borderRadius: 8, // rounded-lg
    padding: 16, // p-4
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16, // gap-4
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
    fontSize: 14, // text-sm
  },
  reviewMeta: {
    flex: 1,
  },
  reviewAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8, // mb-2
  },
  reviewAuthorName: {
    fontWeight: "500", // font-medium
    color: "#1f2937", // text-gray-900
  },
  reviewDate: {
    fontSize: 14, // text-sm
    color: "#6b7280", // text-gray-500
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // gap-2
    marginBottom: 12, // mb-3
  },
  reviewScore: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
  },
  deleteReviewButton: {
    marginLeft: 16, // ml-4
  },
  reviewContent: {
    color: "#374151", // text-gray-700
    marginBottom: 8, // mb-2
  },
  noReviewsContainer: {
    alignItems: "center", // text-center
    paddingVertical: 32, // py-8
    color: "#6b7280", // text-gray-500
  },
  noReviewsIcon: {
    marginBottom: 12, // mb-3
    opacity: 0.5,
  },
  noReviewsText: {
    color: "#6b7280",
  },
})

export default ReviewsSection
