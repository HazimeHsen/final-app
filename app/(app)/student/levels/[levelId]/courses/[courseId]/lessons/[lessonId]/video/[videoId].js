"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av"; // Import Video from expo-av
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Maximize,
  BookOpen,
  MessageCircle,
  Star,
} from "lucide-react-native";
import QASection from "../../../../../../../../../../components/QASection";
import ReviewsSection from "../../../../../../../../../../components/ReviewsSection"; // Adjusted path
import VideoPlaylist from "../../../../../../../../../../components/VideoPlaylist"; // Adjusted path
import { videoAPI } from "../../../../../../../../../../api";

const { width, height } = Dimensions.get("window");

const LessonsPage = () => {
  const { lessonId, videoId, courseId, levelId } = useLocalSearchParams();
  const router = useRouter();
  const videoPlaylistRef = useRef();

  const [currentLesson, setCurrentLesson] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("playlist"); // Default to playlist for RN
  const [course, setCourse] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);

  // FOR VIDEO CONTROLLER
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState({});

  const backUrl = `/student/levels/${levelId}/courses/${courseId}`;

  const handlePlaybackStatusUpdate = (status) => {
    setPlaybackStatus(status);
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis / 1000);
    setVideoDuration(status.durationMillis / 1000);

    if (status.didJustFinish && !status.isLooping) {
      handleVideoEnd();
    }
  };

  const handlePrevVideo = () => {
    if (!chapter?.lessons) return;
    const index = chapter.lessons.findIndex((v) => v.id === currentLesson.id);
    if (index > 0) {
      handleLessonSelect(chapter.lessons[index - 1]);
    }
  };

  const handleNextVideo = () => {
    if (!chapter?.lessons) return;
    const index = chapter.lessons.findIndex((v) => v.id === currentLesson.id);
    if (index < chapter.lessons.length - 1) {
      handleLessonSelect(chapter.lessons[index + 1]);
    }
  };

  const hasPrevVideo = chapter?.lessons?.some(
    (v, i) => i > 0 && chapter.lessons[i].id === currentLesson?.id
  );
  const hasNextVideo = chapter?.lessons?.some(
    (v, i) =>
      i < chapter.lessons.length - 1 &&
      chapter.lessons[i].id === currentLesson?.id
  );

  const toggleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (videoRef.current) {
      if (playbackStatus.isFullScreen) {
        await videoRef.current.dismissFullscreenPlayer();
      } else {
        await videoRef.current.presentFullscreenPlayer();
      }
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = async (value) => {
    const newPosition = Number.parseFloat(value);
    setCurrentTime(newPosition);
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(newPosition * 1000);
    }
  };

  const handleVideoEnd = async () => {
    try {
      if (currentLesson) {
        await videoAPI.markCompleted(currentLesson.id);
        console.log("Video marked completed in backend");

        // Dynamically notify the playlist to update the checkbox + progress
        if (
          videoPlaylistRef.current &&
          typeof videoPlaylistRef.current.markVideoAsCompleted === "function"
        ) {
          videoPlaylistRef.current.markVideoAsCompleted(currentLesson.id);
        }

        // Move to next video
        handleNextVideo();
      }
    } catch (err) {
      console.error("❌ Error marking video completed", err);
    }
  };

  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        if (!currentLesson) {
          setPageLoading(true);
        } else {
          setVideoLoading(true);
        }
        const response = await videoAPI.getByLesson(lessonId);
        const videos = response.data;

        if (!videos || videos.length === 0) {
          setCurrentLesson(null);
          setChapter(null);
          setCourse(null);
          return;
        }

        // Find video from URL (or fallback to first)
        const selectedVideo =
          videos.find((v) => v.id === Number(videoId)) || videos[0];

        const formattedLesson = {
          id: selectedVideo.id,
          title: selectedVideo.title,
          description: selectedVideo.description,
          duration: `${selectedVideo.duration_minutes}:00`,
          videoUrl: selectedVideo.video_url,
          type: "video",
          isCompleted: false, // This will be updated by progress API
          chapter: {
            id: selectedVideo.lesson_id,
            title: "Lesson Title", // Placeholder, ideally from API
            chapterNumber: 1, // Placeholder
            completedLessons: 0, // Placeholder
            totalLessons: videos.length,
            course: {
              id: courseId, // Use actual courseId from params
              title: "Course Title", // Placeholder, ideally from API
            },
            lessons: videos.map((v) => ({
              id: v.id,
              title: v.title,
              duration_minutes: v.duration_minutes, // Keep original for playlist
              type: "video",
              videoUrl: v.video_url,
              description: v.description,
              isCompleted: false, // Will be updated by playlist's own progress
            })),
          },
        };
        setCurrentLesson(formattedLesson);
        setChapter(formattedLesson.chapter);
        setCourse(formattedLesson.chapter.course);
      } catch (err) {
        console.error("Error loading videos", err);
      } finally {
        setPageLoading(false);
        setVideoLoading(false);
      }
    };
    fetchLessonData();
  }, [lessonId, videoId, courseId]);

  const handleLessonSelect = (lesson) => {
    setCurrentLesson(lesson);
    setActiveTab("playlist"); // Always show playlist when a new lesson is selected
    router.replace(
      `/student/levels/${levelId}/courses/${courseId}/lessons/${lessonId}/video/${lesson.id}`
      // No state needed for Expo Router replace
    );
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const tabs = [
    { id: "playlist", label: "Playlist", icon: BookOpen }, // Added playlist tab
    { id: "qa", label: "Q&A", icon: MessageCircle },
    { id: "reviews", label: "Reviews", icon: Star },
  ];

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    );
  }

  if (!course || !chapter || !currentLesson) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Lesson Not Found</Text>
        <TouchableOpacity
          onPress={() => router.replace(backUrl)}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#8b5cf6" />
          <Text style={styles.backButtonText}>Back to Courses</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollViewContent}
        contentContainerStyle={styles.scrollViewPadding}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.replace(backUrl)}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color="#4b5563" />
            </TouchableOpacity>
            <View>
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
              <Text style={styles.courseInfo}>
                Chapter {chapter.chapterNumber} • {course.title}
              </Text>
            </View>
          </View>
          <Text style={styles.lessonCompletionText}>
            {chapter.completedLessons} of {chapter.totalLessons} lessons
            completed
          </Text>
        </View>

        <View style={styles.contentGrid}>
          {/* Video Player */}
          <View style={styles.videoPlayerContainer}>
            <View style={styles.videoWrapper}>
              {videoLoading ? (
                <View style={styles.videoLoadingOverlay}>
                  <ActivityIndicator size="large" color="#f97316" />
                </View>
              ) : currentLesson ? (
                <View style={styles.videoPlayer}>
                  <Video
                    ref={videoRef}
                    style={styles.video}
                    source={{
                      uri: `http://localhost:8000${currentLesson.videoUrl}`,
                    }}
                    useNativeControls={false} // We'll use custom controls
                    resizeMode={ResizeMode.CONTAIN}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    shouldPlay={isPlaying}
                    isMuted={isMuted}
                  />
                  {/* Custom Overlay Controls */}
                  <View style={styles.controlsOverlay}>
                    {/* Seek Bar */}
                    <TextInput
                      style={styles.seekBar}
                      value={currentTime.toString()}
                      onChangeText={handleSeek}
                      onResponderGrant={() => setIsScrubbing(true)}
                      onResponderRelease={() => setIsScrubbing(false)}
                      keyboardType="numeric" // This is a hack, ideally a custom slider
                    />
                    {/* Bottom Controls */}
                    <View style={styles.bottomControls}>
                      <View style={styles.leftControls}>
                        <TouchableOpacity
                          onPress={togglePlayPause}
                          style={styles.controlButton}
                        >
                          {isPlaying ? (
                            <Pause size={24} color="white" />
                          ) : (
                            <Play size={24} color="white" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={toggleMute}
                          style={styles.controlButton}
                        >
                          {isMuted ? (
                            <Volume2 size={24} color="rgba(255,255,255,0.5)" />
                          ) : (
                            <Volume2 size={24} color="white" />
                          )}
                        </TouchableOpacity>
                        <Text style={styles.timeText}>
                          {formatTime(currentTime)} /{" "}
                          {formatTime(videoDuration)}
                        </Text>
                      </View>
                      <View style={styles.rightControls}>
                        <TouchableOpacity
                          onPress={handlePrevVideo}
                          disabled={!hasPrevVideo}
                          style={[
                            styles.controlButton,
                            !hasPrevVideo && styles.disabledControl,
                          ]}
                        >
                          <Text style={styles.controlButtonText}>← Prev</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleNextVideo}
                          disabled={!hasNextVideo}
                          style={[
                            styles.controlButton,
                            !hasNextVideo && styles.disabledControl,
                          ]}
                        >
                          <Text style={styles.controlButtonText}>Next →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={toggleFullscreen}
                          style={styles.controlButton}
                        >
                          <Maximize size={24} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noVideoSelected}>
                  <Play
                    size={64}
                    color="rgba(255,255,255,0.8)"
                    style={styles.noVideoIcon}
                  />
                  <Text style={styles.noVideoTitle}>
                    Select a lesson to start learning
                  </Text>
                  <Text style={styles.noVideoSubtitle}>
                    Choose from the playlist on the right
                  </Text>
                </View>
              )}
            </View>

            {/* Lesson Info */}
            {currentLesson && (
              <View style={styles.lessonInfoCard}>
                <Text style={styles.lessonInfoTitle}>
                  {currentLesson.title}
                </Text>
                <Text style={styles.lessonInfoDescription}>
                  {currentLesson.description}
                </Text>
                <View style={styles.lessonInfoStats}>
                  <Text style={styles.lessonInfoStatText}>
                    Duration: {currentLesson.duration}
                  </Text>
                  <Text style={styles.lessonInfoStatText}>
                    Type: {currentLesson.type}
                  </Text>
                  {currentLesson.isCompleted && (
                    <Text style={styles.lessonInfoCompleted}>✓ Completed</Text>
                  )}
                </View>
              </View>
            )}

            {/* Tab Navigation */}
            <View style={styles.tabNavigationCard}>
              <View style={styles.tabButtonsContainer}>
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={[
                        styles.tabButton,
                        activeTab === tab.id && styles.tabButtonActive,
                      ]}
                    >
                      <IconComponent
                        size={16}
                        color={activeTab === tab.id ? "#f97316" : "#6b7280"}
                      />
                      <Text
                        style={[
                          styles.tabButtonText,
                          activeTab === tab.id && styles.tabButtonTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContentCard}>
              {activeTab === "playlist" && (
                <VideoPlaylist
                  ref={videoPlaylistRef}
                  lessonId={lessonId}
                  currentVideo={currentLesson}
                  onVideoSelect={handleLessonSelect}
                  // onVideoCompleted is handled internally by VideoPlaylist now
                />
              )}
              {activeTab === "qa" && <QASection videoId={videoId} />}
              {activeTab === "reviews" && <ReviewsSection videoId={videoId} />}
            </View>
          </View>

          {/* Sidebar - Video Playlist (Hidden on smaller screens, shown in tab) */}
          {/* The original design had a sticky sidebar. In RN, it's often better to put it in a tab or a separate modal/drawer.
              I've integrated it as the 'playlist' tab content. */}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // bg-gray-50
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingTop: 56 + (Platform.OS === "ios" ? 20 : 0), // Navbar height + status bar for iOS
  },
  scrollViewPadding: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 24, // py-6
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 10,
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
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: "#8b5cf6",
    fontWeight: "500",
    marginLeft: 8,
  },
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
    fontSize: 20, // text-2xl
    fontWeight: "bold",
    color: "#1f2937", // text-gray-900
  },
  courseInfo: {
    color: "#4b5563", // text-gray-600
  },
  lessonCompletionText: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
  },
  contentGrid: {
    flexDirection: "column", // grid grid-cols-1 lg:grid-cols-3
    gap: 24, // gap-6
    // For larger screens, you'd use media queries or responsive libraries
    // For now, it's a single column layout.
  },
  videoPlayerContainer: {
    // lg:col-span-2
    flex: 1, // Takes full width on mobile
  },
  videoWrapper: {
    backgroundColor: "black",
    borderRadius: 8, // rounded-lg
    marginBottom: 24, // mb-6
    aspectRatio: 16 / 9, // aspect-video
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  videoLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
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
  controlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)", // bg-gradient-to-t from-black/60 to-transparent
    padding: 16, // p-4
    gap: 16, // space-y-4
  },
  seekBar: {
    width: "100%",
    height: 20, // h-2 (visual height, touchable area)
    backgroundColor: "#f97316", // accent-orange-600 (simplified)
    borderRadius: 9999,
    // This is a simplified TextInput acting as a slider.
    // A real slider component (e.g., from react-native-slider) would be better.
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    color: "white",
    fontSize: 14, // text-sm
  },
  leftControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16, // gap-4
  },
  controlButton: {
    padding: 4,
  },
  timeText: {
    color: "white",
    fontSize: 14,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // gap-3
  },
  controlButtonText: {
    color: "white",
    fontSize: 14,
  },
  disabledControl: {
    opacity: 0.5,
  },
  noVideoSelected: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    borderRadius: 8,
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
    textAlign: "center",
  },
  lessonInfoCard: {
    backgroundColor: "white",
    borderRadius: 8, // rounded-lg
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
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
  lessonInfoCompleted: {
    color: "#22c55e", // text-green-600
    fontWeight: "500", // font-medium
  },
  tabNavigationCard: {
    backgroundColor: "white",
    borderRadius: 8, // rounded-lg
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    marginBottom: 24, // mb-6
  },
  tabButtonsContainer: {
    flexDirection: "row",
    // overflow-x-auto (ScrollView for tabs if needed)
  },
  tabButton: {
    flex: 1, // Distribute equally
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8, // gap-2
    paddingHorizontal: 24, // px-6
    paddingVertical: 16, // py-4
    borderBottomWidth: 2, // border-b-2
    transitionDuration: 300, // transition-colors
  },
  tabButtonActive: {
    borderColor: "#f97316", // border-orange-500
    backgroundColor: "#fff7ed", // bg-orange-50
  },
  tabButtonText: {
    fontSize: 14, // text-sm
    fontWeight: "500", // font-medium
    color: "#6b7280", // text-gray-500
  },
  tabButtonTextActive: {
    color: "#f97316", // text-orange-600
  },
  tabContentCard: {
    backgroundColor: "white",
    borderRadius: 8, // rounded-lg
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    padding: 24, // p-6
  },
});

export default LessonsPage;
