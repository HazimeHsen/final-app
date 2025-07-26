"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Info,
  Megaphone,
  ExternalLink,
  Clock,
} from "lucide-react-native";

import { announcementAPI } from "../../../api";
import { AuthContext } from "../../../contexts/AuthContext";

const AnnouncementsStudent = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const allResponse = await announcementAPI.getAll();
        const now = new Date();
        const allAnnouncements = (allResponse.data?.data || []).map(
          (announcement) => {
            const isExpired =
              announcement.date && new Date(announcement.date) < now;

            // Auto-cancel expired pending announcements on the client
            const finalStatus =
              announcement.status === "pending" && isExpired
                ? "cancelled"
                : announcement.status;

            return {
              id: announcement.id,
              title: announcement.title || "Untitled Announcement",
              description:
                announcement.description || "No description provided",
              google_meet_link: announcement.google_meet_link,
              date: announcement.date,
              status: finalStatus,
              targetAudience: announcement.target_audience || "all",
              tags: announcement.tags ? announcement.tags.split(",") : [],
              type: getTypeFromStatus(finalStatus),
              isNew: isNewAnnouncement(announcement.date),
              priority: getPriorityFromStatus(finalStatus),
              author: announcement.user?.name || "System",
              user_id: announcement.user_id,
              created_at: announcement.created_at,
              updated_at: announcement.updated_at,
              delete_at: announcement.delete_at,
            };
          }
        );

        setAnnouncements(allAnnouncements);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user]);

  const getTypeFromStatus = (status) => {
    switch (status) {
      case "published":
        return "info";
      case "pending":
        return "warning";
      case "cancelled":
        return "important";
      default:
        return "info";
    }
  };

  const getPriorityFromStatus = (status) => {
    switch (status) {
      case "published":
        return "medium";
      case "pending":
        return "high";
      case "cancelled":
        return "low";
      default:
        return "medium";
    }
  };

  const isNewAnnouncement = (dateString) => {
    if (!dateString) return false;
    const announcementDate = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now - announcementDate) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 7;
  };

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case "important":
        return <AlertCircle size={20} color="#dc2626" />;
      case "warning":
        return <AlertCircle size={20} color="#d97706" />;
      case "feature":
        return <CheckCircle size={20} color="#16a34a" />;
      case "tip":
        return <Info size={20} color="#2563eb" />;
      default:
        return <Bell size={20} color="#8b5cf6" />;
    }
  };

  const getAnnouncementColor = (type) => {
    switch (type) {
      case "important":
        return { borderColor: "#fecaca", backgroundColor: "#fef2f2" };
      case "warning":
        return { borderColor: "#fed7aa", backgroundColor: "#fffbeb" };
      case "feature":
        return { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" };
      case "tip":
        return { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" };
      default:
        return { borderColor: "#e9d5ff", backgroundColor: "#faf5ff" };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      case "medium":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      case "low":
        return { backgroundColor: "#dcfce7", color: "#166534" };
      default:
        return { backgroundColor: "#e9d5ff", color: "#6b21a8" };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date specified";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date);
  };

  const handleOpenLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    if (filter === "all") return true;
    if (filter === "new") return announcement.isNew;
    return announcement.type === filter;
  });

  if (authLoading) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <View style={styles.authRequiredCard}>
            <AlertCircle size={48} color="#ef4444" style={styles.authIcon} />
            <Text style={styles.authTitle}>Authentication Required</Text>
            <Text style={styles.authMessage}>
              You need to be logged in to view announcements. Please sign in to
              continue.
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Megaphone size={24} color="white" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSubtitle}>
              Stay updated with platform news and important information
            </Text>
          </View>
        </View>

        <View style={styles.announcementsList}>
          {filteredAnnouncements.map((announcement) => (
            <View
              key={announcement.id}
              style={[
                styles.announcementCard,
                announcement.isNew && styles.newAnnouncementCard,
              ]}
            >
              <View style={styles.announcementHeader}>
                <View style={styles.announcementIconContainer}>
                  <View
                    style={[
                      styles.iconWrapper,
                      {
                        backgroundColor: getAnnouncementColor(announcement.type)
                          .backgroundColor,
                        borderColor: getAnnouncementColor(announcement.type)
                          .borderColor,
                      },
                    ]}
                  >
                    {getAnnouncementIcon(announcement.type)}
                  </View>
                </View>
                <View style={styles.announcementTitleContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.announcementTitle}>
                      {announcement.title}
                    </Text>
                    {announcement.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.priorityBadge,
                        getPriorityColor(announcement.priority),
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityBadgeText,
                          {
                            color: getPriorityColor(announcement.priority)
                              .color,
                          },
                        ]}
                      >
                        {(announcement.priority ?? "medium").toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Users size={16} color="#6b7280" />
                      <Text style={styles.metaText}>
                        For {announcement.targetAudience || "all users"}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar size={16} color="#6b7280" />
                      <Text style={styles.metaText}>
                        {formatDate(announcement.date)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.announcementContent}>
                <Text style={styles.announcementDescription}>
                  {announcement.description}
                </Text>

                {/* Meeting Link Section */}
                {announcement.google_meet_link && (
                  <View style={styles.meetingLinkContainer}>
                    {announcement.status === "pending" ? (
                      <View style={styles.pendingMeetingContainer}>
                        <Clock size={16} color="#d97706" />
                        <Text style={styles.pendingMeetingText}>
                          Meeting link will be available when this announcement
                          is published
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() =>
                          handleOpenLink(announcement.google_meet_link)
                        }
                        style={styles.meetingLinkButton}
                      >
                        <ExternalLink size={16} color="#8b5cf6" />
                        <Text style={styles.meetingLinkText}>
                          Join Google Meet
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Tags */}
                {announcement.tags?.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {announcement.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Status and Published Info */}
                <View style={styles.statusContainer}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <Text style={styles.statusValue}>
                      {announcement.status}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Published:</Text>
                    <Text style={styles.statusValue}>
                      {formatDate(announcement.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.authorContainer}>
                  <Text style={styles.authorText}>Published by</Text>
                  <Text style={styles.authorName}>{announcement.author}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {filteredAnnouncements.length === 0 && (
          <View style={styles.noAnnouncementsContainer}>
            <View style={styles.noAnnouncementsIconContainer}>
              <Bell size={32} color="#a855f7" />
            </View>
            <Text style={styles.noAnnouncementsTitle}>
              No announcements found
            </Text>
            <Text style={styles.noAnnouncementsMessage}>
              {filter === "all"
                ? "There are no announcements at the moment."
                : `No ${filter} announcements available.`}
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4b5563",
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  authRequiredCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 400,
    width: "100%",
  },
  authIcon: {
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  authMessage: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#4b5563",
  },

  announcementsList: {
    gap: 24,
  },
  announcementCard: {
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  newAnnouncementCard: {
    borderWidth: 2,
    borderColor: "#e9d5ff",
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  announcementIconContainer: {
    marginRight: 16,
  },
  iconWrapper: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  announcementTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 8,
  },
  announcementTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  newBadge: {
    backgroundColor: "#e9d5ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  newBadgeText: {
    color: "#6b21a8",
    fontSize: 12,
    fontWeight: "bold",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "column",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: "#6b7280",
  },

  announcementContent: {
    gap: 16,
  },
  announcementDescription: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  meetingLinkContainer: {
    marginVertical: 8,
  },
  pendingMeetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingMeetingText: {
    color: "#d97706",
    fontSize: 14,
  },
  meetingLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meetingLinkText: {
    color: "#8b5cf6",
    fontSize: 16,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tagText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  statusRow: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  statusValue: {
    fontSize: 14,
    color: "#6b7280",
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authorText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  authorName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },

  noAnnouncementsContainer: {
    alignItems: "center",
    paddingVertical: 64,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  noAnnouncementsIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#f3e8ff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  noAnnouncementsTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 8,
  },
  noAnnouncementsMessage: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
});

export default AnnouncementsStudent;
