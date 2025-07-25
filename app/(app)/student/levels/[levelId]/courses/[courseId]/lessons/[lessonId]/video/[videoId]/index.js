"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent, useEventListener } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Play, MessageCircle, Star, ArrowLeft } from "lucide-react-native";
import QASection from "../../../../../../../../../../../components/common/QASection";
import ReviewsSection from "../../../../../../../../../../../components/common/ReviewsSection";
import VideoPlaylist from "../../../../../../../../../../../components/common/VideoPlaylist";
import { videoAPI, courseAPI } from "../../../../../../../../../../../api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const LessonsPage = () => {
  const {
    lessonId: lessonIdParam,
    videoId: videoIdParam,
    courseId: courseIdParam,
    levelId: levelIdParam,
  } = useLocalSearchParams();

  const lessonId = Number.parseInt(lessonIdParam, 10);
  const videoId = Number.parseInt(videoIdParam, 10);
  const courseId = Number.parseInt(courseIdParam, 10);
  const levelId = Number.parseInt(levelIdParam, 10);

  const router = useRouter();
  const videoPlaylistRef = useRef();

  const [currentLesson, setCurrentLesson] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("qa");
  const [course, setCourse] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);

  const handleVideoAutoCompleteRef = useRef(null);

  const setVideoAutoCompleteHandler = (handler) => {
    handleVideoAutoCompleteRef.current = handler;
  };

  const handleVideoEnd = async () => {
    try {
      if (currentLesson && !currentLesson.isCompleted) {
        await videoAPI.markCompleted(currentLesson.id);
        console.log("Video marked completed in backend");
        if (handleVideoAutoCompleteRef.current) {
          handleVideoAutoCompleteRef.current(currentLesson.id);
        }
        setCurrentLesson((prev) => ({ ...prev, isCompleted: true }));
      }
      handleNextVideo();
    } catch (err) {
      console.error("❌ Error marking video completed", err);
      Alert.alert(
        "Error",
        "Failed to mark video as completed. Please try again."
      );
    }
  };

  const handleLessonSelect = (lesson) => {
    setCurrentLesson(lesson);
    setActiveTab("playlist");
    router.replace(
      `/student/levels/${levelId}/courses/${courseId}/lessons/${lessonId}/video/${lesson.id}`
    );
  };

  const handleNextVideo = () => {
    if (!chapter || !currentLesson) return;
    const index = chapter.lessons.findIndex((v) => v.id === currentLesson.id);
    if (index < chapter.lessons.length - 1) {
      handleLessonSelect(chapter.lessons[index + 1]);
    } else {
      router.replace(`/student/levels/${levelId}/courses/${courseId}`);
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
        const response = await videoAPI.getVideosByLesson(lessonId);
        const { lesson, videos } = response.data;
        console.log("API Response:", { lesson, videos });

        if (!videos || videos.length === 0) {
          setCurrentLesson(null);
          setChapter(null);
          setCourse(null);
          return;
        }

        const selectedVideo =
          videos.find((v) => v.id === Number(videoId)) || videos[0];

        const courseResponse = await courseAPI.getById(courseId);
        const courseData = courseResponse.data;

        const formattedLesson = {
          id: selectedVideo.id,
          title: selectedVideo.title,
          description: selectedVideo.description,
          duration: selectedVideo.duration_minutes,
          videoUrl: selectedVideo.video_url,
          type: "video",
          isCompleted: selectedVideo.isCompleted || false,
        };

        const key = `completed-videos-${lessonId}`;
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          try {
            const completed = new Set(JSON.parse(saved));
            formattedLesson.isCompleted = completed.has(selectedVideo.id);
          } catch (e) {
            console.warn("Parse error for completed videos", e);
          }
        }

        setCurrentLesson(formattedLesson);
        setChapter({
          id: lessonId,
          title: lesson?.title || "Lesson Title",
          chapterNumber: 1,
          completedLessons: videos.filter(
            (v) => v.isCompleted || (saved && JSON.parse(saved).includes(v.id))
          ).length,
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
            isCompleted:
              v.isCompleted || (saved && JSON.parse(saved).includes(v.id)),
          })),
        });
        setCourse(courseData);
      } catch (err) {
        console.error("Error loading videos:", err);
        Alert.alert(
          "Error",
          "Failed to load lesson content. Please try again."
        );
        setCurrentLesson(null);
        setChapter(null);
        setCourse(null);
      } finally {
        setPageLoading(false);
        setVideoLoading(false);
      }
    };

    if (lessonId && videoId && courseId && levelId) {
      fetchLessonData();
    }
  }, [lessonId, videoId, courseId, levelId]);

  const videoUri = currentLesson?.videoUrl
    ? new URL(currentLesson.videoUrl, "http://192.168.0.110:8000").href
    : null;

  const player = useVideoPlayer(videoUri);
  console.log(player.status);

  useEventListener(player, "playToEnd", () => {
    handleVideoEnd();
  });
  const tabs = [
    { id: "qa", label: "Q&A", icon: MessageCircle },
    { id: "reviews", label: "Reviews", icon: Star },
  ];

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    );
  }

  if (!course || !chapter || !currentLesson) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Lesson Content Not Found</Text>
        <TouchableOpacity
          onPress={() =>
            router.replace(`/student/levels/${levelId}/courses/${courseId}`)
          }
          style={styles.backButton}
        >
          <ArrowLeft size={16} color="#8b5cf6" />
          <Text style={styles.backButtonText}>Back to Courses</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPrevVideo = chapter?.lessons?.some(
    (v, i) => i > 0 && v.id === currentLesson?.id
  );
  const hasNextVideo = chapter?.lessons?.some(
    (v, i) => i < chapter.lessons.length - 1 && v.id === currentLesson?.id
  );

  return (
    <View style={styles.fullScreenContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.mainContentWrapper}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color="#4b5563" />
              </TouchableOpacity>
              <View>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                <Text style={styles.chapterSubtitle}>
                  Chapter {chapter.chapterNumber} • {course.title}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.contentGrid}>
            <View style={styles.videoPlayerContainer}>
              <View style={styles.videoWrapper}>
                {videoLoading ? (
                  <View style={styles.videoLoadingOverlay}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.videoLoadingText}>
                      Loading video...
                    </Text>
                  </View>
                ) : currentLesson?.videoUrl ? (
                  <View style={styles.videoPlayer}>
                    {player && (
                      <VideoView player={player} style={styles.video} />
                    )}
                  </View>
                ) : (
                  <View style={styles.noVideoPlaceholder}>
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
                      Duration: {currentLesson.duration} min
                    </Text>
                    <Text style={styles.lessonInfoStatText}>
                      Type: {currentLesson.type}
                    </Text>
                    {currentLesson.isCompleted && (
                      <Text style={styles.lessonInfoCompletedText}>
                        ✓ Completed
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.playlistSidebar}>
                <VideoPlaylist
                  ref={videoPlaylistRef}
                  lessonId={lessonId}
                  currentVideo={currentLesson}
                  onVideoSelect={handleLessonSelect}
                  onVideoCompleted={setVideoAutoCompleteHandler}
                />
              </View>

              <View style={styles.tabNavigationCard}>
                <View style={styles.tabsContainer}>
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[
                          styles.tabButton,
                          activeTab === tab.id
                            ? styles.tabButtonActive
                            : styles.tabButtonInactive,
                        ]}
                      >
                        <IconComponent
                          size={16}
                          color={activeTab === tab.id ? "#8b5cf6" : "#6b7280"}
                        />
                        <Text
                          style={[
                            styles.tabButtonText,
                            activeTab === tab.id
                              ? styles.tabButtonTextActive
                              : styles.tabButtonTextInactive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.tabContentCard}>
                {activeTab === "qa" && <QASection videoId={videoId} />}
                {activeTab === "reviews" && (
                  <ReviewsSection videoId={videoId} />
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 32,
    alignItems: "center",
  },
  mainContentWrapper: {
    width: "100%",
    maxWidth: 1200,
    paddingHorizontal: 16,
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  chapterTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  chapterSubtitle: {
    color: "#4b5563",
  },
  completedLessonsText: {
    fontSize: 14,
    color: "#4b5563",
  },

  contentGrid: {
    flexDirection: "column",
    gap: 24,
  },
  videoPlayerContainer: {
    flex: 2,
  },
  videoWrapper: {
    backgroundColor: "black",
    borderRadius: 16,
    marginBottom: 24,
    maxHeight: 200,
    width: "100%",
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
    flex: 1,
  },
  overlayControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "column",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 16,
    gap: 16,
  },
  seekBar: {
    width: "100%",
    height: 20,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  controlButton: {
    padding: 4,
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
    marginBottom: 16,
    opacity: 0.8,
  },
  noVideoTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  noVideoSubtitle: {
    color: "#d1d5db",
  },

  lessonInfoCard: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 24,
    marginBottom: 24,
  },
  lessonInfoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  lessonInfoDescription: {
    color: "#4b5563",
    marginBottom: 16,
  },
  lessonInfoStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  lessonInfoStatText: {
    fontSize: 14,
    color: "#6b7280",
  },
  lessonInfoCompletedText: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "500",
  },

  tabNavigationCard: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 24,
    overflow: "hidden",
  },
  tabsContainer: {
    flexDirection: "row",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 2,
    flex: 1,
    textAlign: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "#f3e8ff",
  },
  tabButtonInactive: {
    borderColor: "transparent",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabButtonTextActive: {
    color: "#8b5cf6",
  },
  tabButtonTextInactive: {
    color: "#6b7280",
  },

  tabContentCard: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 24,
  },

  playlistSidebar: {
    flex: 1,
    marginBottom: 24,
    minHeight: 300,
  },
});

export default LessonsPage;
