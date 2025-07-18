"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  Play,
  CheckCircle,
  Lock,
  Clock,
  FileText,
  HelpCircle,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { videoAPI } from "../api";

const VideoPlaylist = forwardRef((props, ref) => {
  const { lessonId, onVideoSelect, currentVideo } = props;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({
    completed_videos: 0,
    total_videos: 0,
  });
  const [completedVideos, setCompletedVideos] = useState(new Set());

  const saveCompletedVideos = async (newCompleted) => {
    try {
      await AsyncStorage.setItem(
        `completed-videos-${lessonId}`,
        JSON.stringify([...newCompleted])
      );
    } catch (e) {
      console.error("Failed to save completed videos to AsyncStorage", e);
    }
  };

  const markVideoAsCompleted = async (videoId) => {
    const updated = new Set(completedVideos);
    if (!updated.has(videoId)) {
      updated.add(videoId);
      setCompletedVideos(updated);
      await saveCompletedVideos(updated);

      setProgress((prev) => ({
        ...prev,
        completed_videos: prev.completed_videos + 1,
      }));

      if (typeof props.onVideoCompleted === "function") {
        props.onVideoCompleted(videoId);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    markVideoAsCompleted,
  }));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await videoAPI.getVideosByLesson(lessonId);
        const lessonVideos = res.data.videos || [];
        setVideos(lessonVideos);

        const progressRes = await videoAPI.getLessonProgress(lessonId);
        setProgress(progressRes.data);

        const completedSet = new Set();
        lessonVideos.forEach((v) => {
          if (v.isCompleted) completedSet.add(v.id);
        });

        try {
          const savedRaw = await AsyncStorage.getItem(
            `completed-videos-${lessonId}`
          );
          if (savedRaw) {
            JSON.parse(savedRaw).forEach((id) => completedSet.add(id));
          }
        } catch (e) {
          console.warn("Failed to parse AsyncStorage progress", e);
        }

        await saveCompletedVideos(completedSet);
        setCompletedVideos(completedSet);
      } catch (err) {
        console.error("Error loading videos or progress", err);
      } finally {
        setLoading(false);
      }
    };
    if (lessonId) fetchData();
  }, [lessonId]);

  const toggleVideoCompletion = async (videoId) => {
    const newCompleted = new Set(completedVideos);
    if (newCompleted.has(videoId)) {
      newCompleted.delete(videoId);
    } else {
      newCompleted.add(videoId);
    }
    setCompletedVideos(newCompleted);
    await saveCompletedVideos(newCompleted);
  };

  const getVideoIcon = (type) => {
    switch (type) {
      case "practice":
        return <FileText size={16} color="#22c55e" />;
      case "quiz":
        return <HelpCircle size={16} color="#8b5cf6" />;
      default:
        return <Play size={16} color="#3b82f6" />;
    }
  };

  const getVideoTypeColor = (type) => {
    switch (type) {
      case "practice":
        return styles.iconGreen;
      case "quiz":
        return styles.iconPurple;
      default:
        return styles.iconBlue;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#f97316" />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lesson Videos</Text>
        {/* Progress bar */}
        <View style={styles.progressBarSection}>
          <View style={styles.progressBarTextRow}>
            <Text style={styles.progressBarText}>
              {progress.completed_videos} of {progress.total_videos} videos
              completed
            </Text>
            <Text style={styles.progressBarText}>
              {progress.total_videos > 0
                ? `${Math.round(
                    (progress.completed_videos / progress.total_videos) * 100
                  )}%`
                : "0%"}
            </Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${
                    progress.total_videos > 0
                      ? (progress.completed_videos / progress.total_videos) *
                        100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>
        <Text style={styles.videoCountText}>{videos.length} videos</Text>
      </View>
      <View style={styles.videoList}>
        {videos.map((video, index) => {
          const isCompleted = completedVideos.has(video.id);
          const isCurrent = currentVideo?.id === video.id;
          return (
            <View
              key={video.id}
              style={[
                styles.videoItem,
                isCurrent ? styles.videoItemCurrent : styles.videoItemDefault,
              ]}
            >
              <View style={styles.videoItemContent}>
                {/* Checkbox */}
                <View style={styles.checkboxContainer}>
                  <Text style={styles.videoNumber}>{index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => toggleVideoCompletion(video.id)}
                    style={[
                      styles.checkbox,
                      isCompleted
                        ? styles.checkboxCompleted
                        : styles.checkboxDefault,
                    ]}
                  >
                    {isCompleted && <CheckCircle size={12} color="white" />}
                  </TouchableOpacity>
                </View>
                {/* Icon */}
                <View style={getVideoTypeColor(video.type)}>
                  {getVideoIcon(video.type)}
                </View>
                {/* Title + duration */}
                <TouchableOpacity
                  onPress={() => !video.isLocked && onVideoSelect(video)}
                  disabled={video.isLocked}
                  style={styles.videoTitleButton}
                >
                  <View style={styles.videoTitleRow}>
                    <Text
                      style={[
                        styles.videoTitle,
                        isCurrent && styles.videoTitleCurrent,
                        video.isLocked && styles.videoTitleLocked,
                      ]}
                    >
                      {video.title}
                    </Text>
                    <View style={styles.videoDurationLockedContainer}>
                      <Text style={styles.videoDuration}>
                        <Clock size={12} color="#6b7280" />
                        {video.duration_minutes}:00
                      </Text>
                      {video.isLocked && <Lock size={16} color="#9ca3af" />}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loadingText: {
    color: "#6b7280",
  },
  container: {
    backgroundColor: "white",
    borderRadius: 8,
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
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  progressBarSection: {
    marginTop: 8,
  },
  progressBarTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
  progressBarText: {
    fontSize: 14,
    color: "#4b5563",
  },
  progressBarBackground: {
    width: "100%",
    backgroundColor: "#e5e7eb",
    height: 8,
    borderRadius: 9999,
  },
  progressBarFill: {
    backgroundColor: "#f97316",
    height: 8,
    borderRadius: 9999,
  },
  videoCountText: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 4,
  },
  videoList: {},
  videoItem: {
    padding: 12,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  videoItemCurrent: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },
  videoItemDefault: {
    borderColor: "transparent",
  },
  videoItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    width: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkboxDefault: {
    borderColor: "#d1d5db",
  },
  iconGreen: { color: "#22c55e" },
  iconPurple: { color: "#8b5cf6" },
  iconBlue: { color: "#3b82f6" },
  videoTitleButton: {
    flex: 1,
    paddingVertical: 4,
  },
  videoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  videoTitle: {
    fontSize: 14,
    color: "#4b5563",
    flexShrink: 1,
  },
  videoTitleCurrent: {
    fontWeight: "500",
  },
  videoTitleLocked: {
    color: "#9ca3af",
  },
  videoDurationLockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  videoDuration: {
    fontSize: 12,
    color: "#6b7280",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

export default VideoPlaylist;
