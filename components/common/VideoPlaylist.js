"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { Play, CheckCircle, Lock, Clock, FileText, HelpCircle } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage" // For localStorage replacement

import { videoAPI } from "../../api"

const VideoPlaylist = forwardRef((props, ref) => {
  const { lessonId, onVideoSelect, currentVideo, isAdmin } = props
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ completed_videos: 0, total_videos: 0 })
  const [completedVideos, setCompletedVideos] = useState(new Set())

  const markVideoAsCompleted = (videoId) => {
    setCompletedVideos((prev) => {
      const updated = new Set(prev)
      if (!updated.has(videoId)) {
        updated.add(videoId)
        saveCompletedVideos(updated)
        // Update the progress visually
        setProgress((prevProgress) => ({
          ...prevProgress,
          completed_videos: prevProgress.completed_videos + 1,
        }))
        // Notify parent if needed
        if (typeof props.onVideoCompleted === "function") {
          props.onVideoCompleted(videoId)
        }
      }
      return updated
    })
  }

  const refreshAll = async () => {
    setLoading(true)
    try {
      const res = await videoAPI.getVideosByLesson(lessonId)
      const lessonVideos = res.data.videos || []
      setVideos(lessonVideos)

      const progressRes = await videoAPI.getLessonProgress(lessonId)
      setProgress(progressRes.data)

      const completedSet = new Set()
      lessonVideos.forEach((v) => {
        if (v.isCompleted) completedSet.add(v.id)
      })
      await AsyncStorage.setItem(`completed-videos-${lessonId}`, JSON.stringify([...completedSet]))
      setCompletedVideos(completedSet)
    } catch (err) {
      console.error("Error refreshing video playlist:", err)
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    markVideoAsCompleted,
    refreshProgressOnly,
    refreshAll,
  }))

  const refreshProgressOnly = async () => {
    try {
      const progressRes = await videoAPI.getLessonProgress(lessonId)
      setProgress(progressRes.data)
    } catch (err) {
      console.error("Error refreshing progress:", err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. Get videos
        const res = await videoAPI.getVideosByLesson(lessonId)
        const lessonVideos = res.data.videos || []
        setVideos(lessonVideos)

        // 2. Get completed progress
        const progressRes = await videoAPI.getLessonProgress(lessonId)
        setProgress(progressRes.data)

        // Create a completed set (based on API flag isCompleted)
        const completedSet = new Set()
        lessonVideos.forEach((v) => {
          if (v.isCompleted) completedSet.add(v.id)
        })

        // Re-save to ensure consistency
        await AsyncStorage.setItem(`completed-videos-${lessonId}`, JSON.stringify([...completedSet]))
        setCompletedVideos(completedSet)
      } catch (err) {
        console.error("Error loading videos or progress", err)
      } finally {
        setLoading(false)
      }
    }

    if (lessonId) fetchData()
  }, [lessonId])

  const saveCompletedVideos = async (newCompleted) => {
    await AsyncStorage.setItem(`completed-videos-${lessonId}`, JSON.stringify([...newCompleted]))
  }

  const toggleVideoCompletion = (videoId) => {
    const newCompleted = new Set(completedVideos)
    if (newCompleted.has(videoId)) {
      newCompleted.delete(videoId)
    } else {
      newCompleted.add(videoId)
    }
    setCompletedVideos(newCompleted)
    saveCompletedVideos(newCompleted)
  }

  const getVideoIcon = (type) => {
    switch (type) {
      case "practice":
        return <FileText size={16} color="#16a34a" /> // green-600
      case "quiz":
        return <HelpCircle size={16} color="#8b5cf6" /> // purple-600
      default:
        return <Play size={16} color="#2563eb" /> // blue-600
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lesson Videos</Text>
        {/* Progress bar */}
        {!isAdmin && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarTextRow}>
              <Text style={styles.progressBarText}>
                {progress.completed_videos} of {progress.total_videos} videos completed
              </Text>
              <Text style={styles.progressBarText}>
                {progress.total_videos > 0
                  ? `${Math.round((progress.completed_videos / progress.total_videos) * 100)}%`
                  : "0%"}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      progress.total_videos > 0 ? (progress.completed_videos / progress.total_videos) * 100 : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
        <Text style={styles.videoCountText}>{videos.length} videos</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        {videos.map((video, index) => {
          const isCompleted = completedVideos.has(video.id)
          const isCurrent = currentVideo?.id === video.id
          return (
            <View
              key={video.id}
              style={[styles.videoItem, isCurrent ? styles.videoItemCurrent : styles.videoItemDefault]}
            >
              <View style={styles.videoItemContent}>
                {/* Checkbox */}
                <View style={styles.checkboxContainer}>
                  <Text style={styles.videoNumber}>{index + 1}</Text>
                  {!isAdmin && (
                    <TouchableOpacity
                      onPress={() => toggleVideoCompletion(video.id)}
                      style={[styles.checkbox, isCompleted ? styles.checkboxCompleted : styles.checkboxDefault]}
                    >
                      {isCompleted && <CheckCircle size={12} color="white" />}
                    </TouchableOpacity>
                  )}
                </View>
                {/* Icon */}
                <View style={styles.videoIcon}>{getVideoIcon(video.type)}</View>
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
                    <View style={styles.videoStats}>
                      <Text style={styles.videoDuration}>
                        <Clock size={12} color="#6b7280" /> {video.duration_minutes}:00
                      </Text>
                      {video.isLocked && <Lock size={16} color="#9ca3af" />}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 16, // rounded-lg
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // shadow-sm
    borderWidth: 1,
    borderColor: "#e5e7eb", // border
    height: "100%", // sticky top-24, fill available height
  },
  header: {
    padding: 16, // p-4
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb", // border-b
  },
  headerTitle: {
    fontSize: 18, // text-lg
    fontWeight: "600", // font-semibold
    color: "#1f2937", // text-gray-900
  },
  progressBarContainer: {
    marginTop: 8, // mt-2
  },
  progressBarTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4, // mb-1
  },
  progressBarText: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
  },
  progressBarBg: {
    width: "100%",
    backgroundColor: "#e5e7eb", // bg-gray-200
    height: 8, // h-2
    borderRadius: 9999, // rounded-full
  },
  progressBarFill: {
    backgroundColor: "#f97316", // bg-orange-500
    height: 8,
    borderRadius: 9999,
  },
  videoCountText: {
    fontSize: 14, // text-sm
    color: "#4b5563", // text-gray-600
    marginTop: 4, // mt-1
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: "#4b5563",
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12, // p-3
    borderLeftWidth: 4,
    borderBottomWidth: 1, // Simulate divide-y
    borderBottomColor: "#e5e7eb",
  },
  videoItemCurrent: {
    borderColor: "#f97316", // border-orange-500
    backgroundColor: "#fff7ed", // bg-orange-50
  },
  videoItemDefault: {
    borderColor: "transparent",
  },
  videoItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12, // space-x-2
  },
  videoNumber: {
    fontSize: 14, // text-sm
    fontWeight: "500", // font-medium
    color: "#6b7280", // text-gray-500
    width: 24, // w-6
  },
  checkbox: {
    width: 20, // w-5
    height: 20, // h-5
    borderRadius: 4, // rounded
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#22c55e", // bg-green-500
    borderColor: "#22c55e", // border-green-500
  },
  checkboxDefault: {
    borderColor: "#d1d5db", // border-gray-300
  },
  videoIcon: {
    marginRight: 12, // space-x-3
  },
  videoTitleButton: {
    flex: 1,
  },
  videoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  videoTitle: {
    fontSize: 14, // text-sm
    color: "#1f2937", // text-gray-700
    flexShrink: 1, // Allow text to wrap
  },
  videoTitleCurrent: {
    fontWeight: "500", // font-medium
  },
  videoTitleLocked: {
    color: "#9ca3af", // text-gray-400
  },
  videoStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // space-x-2
    marginLeft: 8, // Add some margin to separate from title
  },
  videoDuration: {
    fontSize: 12, // text-xs
    color: "#6b7280", // text-gray-500
    flexDirection: "row",
    alignItems: "center",
  },
})

export default VideoPlaylist
