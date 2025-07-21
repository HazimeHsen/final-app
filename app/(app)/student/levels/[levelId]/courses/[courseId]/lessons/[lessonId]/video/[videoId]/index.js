"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { VideoView, useVideoPlayer } from "expo-video"
import { useEvent } from "expo"
import Slider from "@react-native-community/slider"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Play, Pause, Volume2, Maximize, MessageCircle, Star, ArrowLeft } from "lucide-react-native"
import QASection from "../../../../../../../../../../../components/common/QASection"
import ReviewsSection from "../../../../../../../../../../../components/common/ReviewsSection"
import VideoPlaylist from "../../../../../../../../../../../components/common/VideoPlaylist"
import { videoAPI, courseAPI } from "../../../../../../../../../../../api"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000/"

const LessonsPage = () => {
  const {
    lessonId: lessonIdParam,
    videoId: videoIdParam,
    courseId: courseIdParam,
    levelId: levelIdParam,
  } = useLocalSearchParams()

  const lessonId = Number.parseInt(lessonIdParam, 10)
  const videoId = Number.parseInt(videoIdParam, 10)
  const courseId = Number.parseInt(courseIdParam, 10)
  const levelId = Number.parseInt(levelIdParam, 10)

  const router = useRouter()
  const videoPlaylistRef = useRef()

  const [currentLesson, setCurrentLesson] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeTab, setActiveTab] = useState("qa")
  const [course, setCourse] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [videoLoading, setVideoLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const handleVideoAutoCompleteRef = useRef(null)

  // Helper function to format time
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Function to receive the markVideoAsCompleted function from VideoPlaylist
  const setVideoAutoCompleteHandler = (handler) => {
    handleVideoAutoCompleteRef.current = handler
  }

  // Function to handle video end (moved up)
  const handleVideoEnd = async () => {
    try {
      if (currentLesson && !currentLesson.isCompleted) {
        await videoAPI.markCompleted(currentLesson.id)
        console.log("Video marked completed in backend")
        if (handleVideoAutoCompleteRef.current) {
          handleVideoAutoCompleteRef.current(currentLesson.id)
        }
        setCurrentLesson((prev) => ({ ...prev, isCompleted: true }))
      }
      handleNextVideo() // This function also needs to be defined before this call
    } catch (err) {
      console.error("❌ Error marking video completed", err)
      Alert.alert("Error", "Failed to mark video as completed. Please try again.")
    }
  }

  // Function to handle lesson selection (moved up)
  const handleLessonSelect = (lesson) => {
    setCurrentLesson(lesson)
    setActiveTab("playlist") // Keep playlist tab active when selecting new video
    router.replace(`/student/levels/${levelId}/courses/${courseId}/lessons/${lessonId}/video/${lesson.id}`)
  }

  // Navigation functions (moved up)
  const handlePrevVideo = () => {
    if (!chapter || !currentLesson) return
    const index = chapter.lessons.findIndex((v) => v.id === currentLesson.id)
    if (index > 0) {
      handleLessonSelect(chapter.lessons[index - 1])
    }
  }

  const handleNextVideo = () => {
    if (!chapter || !currentLesson) return
    const index = chapter.lessons.findIndex((v) => v.id === currentLesson.id)
    if (index < chapter.lessons.length - 1) {
      handleLessonSelect(chapter.lessons[index + 1])
    } else {
      router.replace(`/student/levels/${levelId}/courses/${courseId}`)
    }
  }

  // Video control functions (moved up)
  const togglePlayPause = () => {
    if (!player) return
    if (player.playing) {
      player.pause()
    } else {
      player.play()
    }
  }

  const toggleMute = () => {
    if (player) {
      player.muted = !player.muted
    }
  }

  const toggleFullscreen = async () => {
    if (player) {
      if (player.isFullscreen) {
        await player.dismissFullscreenPlayer()
      } else {
        await player.presentFullscreenPlayer()
      }
    }
  }

  const handleSeek = async (value) => {
    setCurrentTime(value)
    if (player) {
      player.seekTo(value * 1000) // seekTo expects milliseconds
    }
  }

  // FOR VIDEO CONTROLLER - using useVideoPlayer
  const player = useVideoPlayer(currentLesson?.videoUrl ? `${API_BASE_URL}${currentLesson.videoUrl}` : "", (player) => {
    // Initial player setup if needed, e.g., player.loop = false;
    // We'll control play/pause via state and effects.
  })

  // Use useEvent to listen to player status updates
  const { isPlaying: playerIsPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  })
  const { currentTime: playerCurrentTime } = useEvent(player, "timeupdate", {
    currentTime: player.currentTime,
  })
  const { duration: playerDuration } = useEvent(player, "durationchange", {
    duration: player.duration,
  })
  const { isMuted: playerIsMuted } = useEvent(player, "mutedChange", {
    isMuted: player.muted,
  })

  // Update local states based on player events
  useEffect(() => {
    setIsPlaying(playerIsPlaying)
  }, [playerIsPlaying])

  useEffect(() => {
    setCurrentTime(playerCurrentTime / 1000) // Convert ms to seconds
  }, [playerCurrentTime])

  useEffect(() => {
    setVideoDuration(playerDuration / 1000) // Convert ms to seconds
  }, [playerDuration])

  useEffect(() => {
    setIsMuted(playerIsMuted)
  }, [playerIsMuted])

  // This useEvent now correctly references handleVideoEnd after its definition
  useEvent(player, "ended", () => {
    handleVideoEnd()
  })

  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        if (!currentLesson) {
          setPageLoading(true)
        } else {
          setVideoLoading(true)
        }
        const response = await videoAPI.getVideosByLesson(lessonId)
        const { lesson, videos } = response.data
        console.log("API Response:", { lesson, videos })

        if (!videos || videos.length === 0) {
          setCurrentLesson(null)
          setChapter(null)
          setCourse(null)
          return
        }

        const selectedVideo = videos.find((v) => v.id === Number(videoId)) || videos[0]

        const courseResponse = await courseAPI.getById(courseId)
        const courseData = courseResponse.data

        const formattedLesson = {
          id: selectedVideo.id,
          title: selectedVideo.title,
          description: selectedVideo.description,
          duration: selectedVideo.duration_minutes,
          videoUrl: selectedVideo.video_url,
          type: "video",
          isCompleted: selectedVideo.isCompleted || false,
        }

        const key = `completed-videos-${lessonId}`
        const saved = await AsyncStorage.getItem(key)
        if (saved) {
          try {
            const completed = new Set(JSON.parse(saved))
            formattedLesson.isCompleted = completed.has(selectedVideo.id)
          } catch (e) {
            console.warn("Parse error for completed videos", e)
          }
        }

        setCurrentLesson(formattedLesson)
        setChapter({
          id: lessonId,
          title: lesson?.title || "Lesson Title",
          chapterNumber: 1,
          completedLessons: videos.filter((v) => v.isCompleted || (saved && JSON.parse(saved).includes(v.id))).length,
          totalLessons: videos.length,
          course: {
            id: courseData.id,
            title: courseData.title,
          },
          lessons: videos.map((v) => ({
            id: v.id,
            title: v.title,
            duration_minutes: v.duration_minutes,
            type: "video",
            videoUrl: v.video_url,
            description: v.description,
            isCompleted: v.isCompleted || (saved && JSON.parse(saved).includes(v.id)),
          })),
        })
        setCourse(courseData)
      } catch (err) {
        console.error("Error loading videos:", err)
        Alert.alert("Error", "Failed to load lesson content. Please try again.")
        setCurrentLesson(null)
        setChapter(null)
        setCourse(null)
      } finally {
        setPageLoading(false)
        setVideoLoading(false)
      }
    }

    if (lessonId && videoId && courseId && levelId) {
      fetchLessonData()
    }
  }, [lessonId, videoId, courseId, levelId])

  // Effect to control play/pause based on isPlaying state
  useEffect(() => {
    if (player) {
      if (isPlaying) {
        player.play()
      } else {
        player.pause()
      }
    }
  }, [isPlaying, player])

  // Effect to handle video source change and initial play when currentLesson changes
  useEffect(() => {
    if (player && currentLesson?.videoUrl) {
      const videoUri = `${API_BASE_URL}${currentLesson.videoUrl}`
      // Only update source if it's different to avoid unnecessary reloads
      if (player.src !== videoUri) {
        player.src = videoUri
        player.play() // Auto-play when new video loads
        setIsPlaying(true) // Ensure local state reflects playing
      }
    }
  }, [currentLesson?.videoUrl, player, API_BASE_URL])

  const tabs = [
    { id: "qa", label: "Q&A", icon: MessageCircle },
    { id: "reviews", label: "Reviews", icon: Star },
  ]

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    )
  }

  if (!course || !chapter || !currentLesson) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Lesson Content Not Found</Text>
        <TouchableOpacity
          onPress={() => router.replace(`/student/levels/${levelId}/courses/${courseId}`)}
          style={styles.backButton}
        >
          <ArrowLeft size={16} color="#8b5cf6" />
          <Text style={styles.backButtonText}>Back to Courses</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const hasPrevVideo = chapter?.lessons?.some((v, i) => i > 0 && v.id === currentLesson?.id)
  const hasNextVideo = chapter?.lessons?.some((v, i) => i < chapter.lessons.length - 1 && v.id === currentLesson?.id)

  return (
    <View style={styles.fullScreenContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.mainContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={20} color="#4b5563" />
              </TouchableOpacity>
              <View>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                <Text style={styles.chapterSubtitle}>
                  Chapter {chapter.chapterNumber} • {course.title}
                </Text>
              </View>
            </View>
            <Text style={styles.completedLessonsText}>
              {chapter.completedLessons} of {chapter.totalLessons} lessons completed
            </Text>
          </View>
          <View style={styles.contentGrid}>
            {/* Video Player */}
            <View style={styles.videoPlayerContainer}>
              <View style={styles.videoWrapper}>
                {videoLoading ? (
                  <View style={styles.videoLoadingOverlay}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.videoLoadingText}>Loading video...</Text>
                  </View>
                ) : currentLesson?.videoUrl ? (
                  <View style={styles.videoPlayer}>
                    <VideoView
                      player={player}
                      style={styles.video}
                      allowsFullscreen // Use allowsFullscreen prop
                      // No useNativeControls prop needed, as we're using custom controls
                    />
                    {/* Custom Overlay Controls */}
                    <View style={styles.overlayControls}>
                      {/* Seek Bar */}
                      <Slider
                        style={styles.seekBar}
                        minimumValue={0}
                        maximumValue={videoDuration || 0}
                        value={currentTime}
                        onValueChange={(value) => {
                          setCurrentTime(value)
                          setIsScrubbing(true)
                        }}
                        onSlidingComplete={async (value) => {
                          await handleSeek(value)
                          setIsScrubbing(false)
                        }}
                        minimumTrackTintColor="#8b5cf6"
                        maximumTrackTintColor="#e5e7eb"
                        thumbTintColor="#8b5cf6"
                      />
                      {/* Bottom Controls */}
                      <View style={styles.bottomControls}>
                        <View style={styles.leftControls}>
                          <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
                            {isPlaying ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={toggleMute} style={styles.controlButton}>
                            {playerIsMuted ? (
                              <Volume2 size={24} color="rgba(255,255,255,0.5)" />
                            ) : (
                              <Volume2 size={24} color="white" />
                            )}
                          </TouchableOpacity>
                          <Text style={styles.timeText}>
                            {formatTime(currentTime)} / {formatTime(videoDuration)}
                          </Text>
                        </View>
                        <View style={styles.rightControls}>
                          <TouchableOpacity
                            onPress={handlePrevVideo}
                            disabled={!hasPrevVideo}
                            style={[styles.controlButton, !hasPrevVideo && styles.controlButtonDisabled]}
                          >
                            <Text style={[styles.controlButtonText, !hasPrevVideo && styles.controlButtonTextDisabled]}>
                              ← Prev
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleNextVideo}
                            disabled={!hasNextVideo}
                            style={[styles.controlButton, !hasNextVideo && styles.controlButtonDisabled]}
                          >
                            <Text style={[styles.controlButtonText, !hasNextVideo && styles.controlButtonTextDisabled]}>
                              Next →
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={toggleFullscreen} style={styles.controlButton}>
                            <Maximize size={24} color="white" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noVideoPlaceholder}>
                    <Play size={64} color="rgba(255,255,255,0.8)" style={styles.noVideoIcon} />
                    <Text style={styles.noVideoTitle}>Select a lesson to start learning</Text>
                    <Text style={styles.noVideoSubtitle}>Choose from the playlist on the right</Text>
                  </View>
                )}
              </View>
              {/* Lesson Info */}
              {currentLesson && (
                <View style={styles.lessonInfoCard}>
                  <Text style={styles.lessonInfoTitle}>{currentLesson.title}</Text>
                  <Text style={styles.lessonInfoDescription}>{currentLesson.description}</Text>
                  <View style={styles.lessonInfoStats}>
                    <Text style={styles.lessonInfoStatText}>Duration: {currentLesson.duration} min</Text>
                    <Text style={styles.lessonInfoStatText}>Type: {currentLesson.type}</Text>
                    {currentLesson.isCompleted && <Text style={styles.lessonInfoCompletedText}>✓ Completed</Text>}
                  </View>
                </View>
              )}
              {/* Tab Navigation */}
              <View style={styles.tabNavigationCard}>
                <View style={styles.tabsContainer}>
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[
                          styles.tabButton,
                          activeTab === tab.id ? styles.tabButtonActive : styles.tabButtonInactive,
                        ]}
                      >
                        <IconComponent size={16} color={activeTab === tab.id ? "#8b5cf6" : "#6b7280"} />
                        <Text
                          style={[
                            styles.tabButtonText,
                            activeTab === tab.id ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
              {/* Tab Content */}
              <View style={styles.tabContentCard}>
                {activeTab === "qa" && <QASection videoId={videoId} />}
                {activeTab === "reviews" && <ReviewsSection videoId={videoId} />}
              </View>
            </View>
            {/* Sidebar - Video Playlist */}
            <View style={styles.playlistSidebar}>
              <VideoPlaylist
                ref={videoPlaylistRef}
                lessonId={lessonId}
                currentVideo={currentLesson}
                onVideoSelect={handleLessonSelect}
                onVideoCompleted={setVideoAutoCompleteHandler}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#f9fafb", // bg-gray-50
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 32, // py-6
    alignItems: "center",
  },
  mainContentWrapper: {
    width: "100%",
    maxWidth: 1200, // max-w-7xl
    paddingHorizontal: 16, // px-4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4b5563",
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 20,
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
    marginLeft: 8,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24, // mb-6
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16, // gap-4
  },
  chapterTitle: {
    fontSize: 24, // text-2xl
    fontWeight: "bold",
    color: "#1f2937", // text-gray-900
  },
  chapterSubtitle: {
    color: "#4b5563", // text-gray-600
  },
  completedLessonsText: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
  },
  // Content Grid
  contentGrid: {
    flexDirection: "column", // Default to column for small screens
    gap: 24, // gap-6
    // For larger screens, use media queries or responsive layout libraries
    // For now, it's a column layout.
    // On web, this would be grid-cols-1 lg:grid-cols-3
    // We'll simulate this with flexWrap and maxWidth for the playlist
  },
  videoPlayerContainer: {
    flex: 2, // lg:col-span-2
  },
  videoWrapper: {
    backgroundColor: "black",
    borderRadius: 16, // rounded-lg
    marginBottom: 24, // mb-6
    aspectRatio: 16 / 9, // aspect-video
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoLoadingText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlayControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "column",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)", // bg-gradient-to-t from-black/60 to-transparent
    padding: 16, // p-4
    gap: 16, // space-y-4
  },
  seekBar: {
    width: "100%",
    height: 20, // h-2, but needs more height for touch
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16, // gap-4
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // gap-3
  },
  controlButton: {
    padding: 4, // Add padding for easier touch
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonText: {
    color: "white",
    fontSize: 14,
  },
  controlButtonTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  timeText: {
    color: "white",
    fontSize: 14,
  },
  noVideoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "black",
  },
  noVideoIcon: {
    marginBottom: 16, // mb-4
    opacity: 0.8,
  },
  noVideoTitle: {
    fontSize: 20, // text-xl
    fontWeight: "600", // font-semibold
    color: "white",
    marginBottom: 8, // mb-2
  },
  noVideoSubtitle: {
    color: "#d1d5db", // text-gray-300
  },
  // Lesson Info
  lessonInfoCard: {
    backgroundColor: "white",
    borderRadius: 16, // rounded-lg
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // shadow-sm
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    padding: 24, // p-6
    marginBottom: 24, // mb-6
  },
  lessonInfoTitle: {
    fontSize: 20, // text-xl
    fontWeight: "bold",
    color: "#1f2937", // text-gray-900
    marginBottom: 8, // mb-2
  },
  lessonInfoDescription: {
    color: "#4b5563", // text-gray-600
    marginBottom: 16, // mb-4
  },
  lessonInfoStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16, // space-x-4
    fontSize: 14, // text-sm
    color: "#6b7280", // text-gray-500
  },
  lessonInfoStatText: {
    fontSize: 14,
    color: "#6b7280",
  },
  lessonInfoCompletedText: {
    fontSize: 14,
    color: "#22c55e", // text-green-600
    fontWeight: "500", // font-medium
  },
  // Tab Navigation
  tabNavigationCard: {
    backgroundColor: "white",
    borderRadius: 16, // rounded-lg
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // shadow-sm
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    marginBottom: 24, // mb-6
  },
  tabsContainer: {
    flexDirection: "row",
    // overflow-x-auto and whitespace-nowrap are for web, not directly applicable here
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // gap-2
    paddingHorizontal: 24, // px-6
    paddingVertical: 16, // py-4
    borderBottomWidth: 2,
  },
  tabButtonActive: {
    borderColor: "#8b5cf6", // border-purple-500
    backgroundColor: "#f3e8ff", // bg-purple-50
  },
  tabButtonInactive: {
    borderColor: "transparent",
    // hover:text-gray-700 hover:bg-gray-50 not directly translated
  },
  tabButtonText: {
    fontSize: 14, // text-sm
    fontWeight: "500", // font-medium
  },
  tabButtonTextActive: {
    color: "#8b5cf6", // text-purple-600
  },
  tabButtonTextInactive: {
    color: "#6b7280", // text-gray-500
  },
  // Tab Content
  tabContentCard: {
    backgroundColor: "white",
    borderRadius: 16, // rounded-lg
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // shadow-sm
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    padding: 24, // p-6
  },
  // Sidebar - Video Playlist
  playlistSidebar: {
    flex: 1, // lg:col-span-1
    // sticky top-24 is handled by the parent ScrollView and flex layout
    // For a true sticky header/sidebar, you might need a more complex layout
    // or a dedicated library like `react-native-sticky-header-footer-view`.
    // For now, it will scroll with the content.
    minHeight: 300, // Ensure it has some height
  },
})

export default LessonsPage
