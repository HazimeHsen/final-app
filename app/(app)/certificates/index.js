"use client"

import { useState, useEffect, useContext } from "react"
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Modal } from "react-native"
import { useLocalSearchParams, useRouter, Link } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import * as WebBrowser from "expo-web-browser"
import * as Sharing from "expo-sharing"
import { Download, Share2, XCircle, Award } from "lucide-react-native"

import { certificateAPI } from "../../../api"
import { AuthContext } from "../../../contexts/AuthContext"

const Certificate = () => {
  const { userId } = useLocalSearchParams()
  const { user } = useContext(AuthContext)
  const router = useRouter()

  const [allCertificates, setAllCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalCertificateUrl, setModalCertificateUrl] = useState(null)

  useEffect(() => {
    fetchCertificates()
  }, [user, userId]) // Added userId to dependencies

  const fetchCertificates = async () => {
    try {
      setLoading(true)
      setError(null)
      if (!user?.id) {
        // Use user.id from context
        throw new Error("User not logged in.")
      }
      // Fetch all certificate data using the API instance
      const response = await certificateAPI.getAllForUser(user.id)

      if (response.data) {
        setAllCertificates(response.data)
      } else {
        throw new Error("No certificate data received")
      }
    } catch (error) {
      console.error("Error fetching certificates:", error)
      setError(error.response?.data?.message || error.message || "Failed to fetch certificates")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (filename) => {
    const url = `http://192.168.0.110:8000${filename}`
    try {
      await WebBrowser.openBrowserAsync(url)
    } catch (err) {
      Alert.alert("Download Error", "Could not open the certificate. Please try again.")
      console.error("WebBrowser error:", err)
    }
  }

  const handleShare = async (certificateId, filename) => {
    try {
      const url = `http://192.168.0.110:8000${filename}` // Assuming a public URL for sharing
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing Not Available", "Sharing is not available on this device.")
        return
      }
      await Sharing.shareAsync(url, {
        mimeType: "application/pdf",
        UTI: "public.pdf",
        dialogTitle: `LSL Certificate ${certificateId}`,
      })
    } catch (error) {
      console.error("Error sharing certificate:", error)
      Alert.alert("Sharing Failed", "Unable to share certificate. Please try again.")
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#8b5cf6" style={styles.spinner} />
          <Text style={styles.loadingText}>Loading certificates...</Text>
        </View>
      </LinearGradient>
    )
  }

  if (error) {
    return (
      <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.loadingContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Certificates Not Available</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.errorButtons}>
            <TouchableOpacity onPress={fetchCertificates} style={styles.tryAgainButton}>
              <Text style={styles.tryAgainButtonText}>Try Again</Text>
            </TouchableOpacity>
            <Link href="/student/dashboard" asChild>
              <TouchableOpacity style={styles.backToLevelsButton}>
                <Text style={styles.backToLevelsButtonText}>Back to Levels</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={["#f3e8ff", "#fce7f3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Certificates</Text>
          <Text style={styles.headerSubtitle}>View and manage your earned Lebanese Sign Language certificates.</Text>
        </View>

        {allCertificates.length === 0 ? (
          <View style={styles.noCertificatesContainer}>
            <Award size={64} color="#9ca3af" style={styles.noCertificatesIcon} />
            <Text style={styles.noCertificatesText}>No certificates earned yet.</Text>
            <Link href="/student/dashboard" asChild>
              <TouchableOpacity style={styles.backToLevelsButton}>
                <Text style={styles.backToLevelsButtonText}>Start Learning</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.columnLevel]}>Level ID</Text>
                <Text style={[styles.tableHeaderText, styles.columnPath]}>Certificate Path</Text>
                <Text style={[styles.tableHeaderText, styles.columnDate]}>Issued At</Text>
                <Text style={[styles.tableHeaderText, styles.columnActions]}>Actions</Text>
              </View>
              {allCertificates.map((certificate,id) => (
                <View key={id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.columnLevel]}>{certificate.level_id}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const url = `http://192.168.0.110:8000${certificate.certificate_url}`
                      console.log(url)

                      setModalCertificateUrl(url)
                    }}
                    style={[styles.tableCell, styles.columnPath]}
                  >
                    <Text style={styles.viewLink}>View</Text>
                  </TouchableOpacity>
                  <Text style={[styles.tableCell, styles.columnDate]}>
                    {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : "—"}
                  </Text>
                  <View style={[styles.tableCell, styles.columnActions, styles.actionsCell]}>
                    <TouchableOpacity
                      onPress={() => {
                        if (certificate.certificate_url) {
                          const filename = certificate.certificate_url
                          handleDownload(filename)
                        } else {
                          Alert.alert("Error", "Certificate file not available.")
                        }
                      }}
                      style={styles.actionButton}
                    >
                      <Download size={16} color="white" />
                      <Text style={styles.actionButtonText}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (certificate.certificate_url) {
                          const filename = certificate.certificate_url
                          handleShare(certificate.id, filename)
                        } else {
                          Alert.alert("Error", "Certificate file not available.")
                        }
                      }}
                      style={[styles.actionButton, styles.shareButton]}
                    >
                      <Share2 size={16} color="white" />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Modal for viewing PDF */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!modalCertificateUrl}
          onRequestClose={() => setModalCertificateUrl(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={() => setModalCertificateUrl(null)} style={styles.modalCloseButton}>
                <XCircle size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Certificate Preview</Text>
              <Text style={styles.modalSubtitle}>Opening in your browser...</Text>
              {/* In React Native, we can't embed an iframe. We'll just open the URL. */}
              {modalCertificateUrl && (
                <TouchableOpacity
                  onPress={() => WebBrowser.openBrowserAsync(modalCertificateUrl)}
                  style={styles.openInBrowserButton}
                >
                  <Text style={styles.openInBrowserButtonText}>Open in Browser</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
    maxWidth: 1024, // max-w-5xl for wider table
    alignSelf: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
  },
  loadingContent: {
    alignItems: "center",
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    color: "#4b5563",
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    textAlign: "center",
    maxWidth: 400,
    width: "100%",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 8,
  },
  errorMessage: {
    color: "#4b5563",
    marginBottom: 16,
    textAlign: "center",
  },
  errorButtons: {
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  tryAgainButton: {
    backgroundColor: "#6d28d9", // Deeper purple
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  tryAgainButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backToLevelsButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  backToLevelsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 34, // Larger title
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 18, // Slightly larger subtitle
    color: "#4b5563",
    textAlign: "center",
    maxWidth: 700,
  },

  noCertificatesContainer: {
    alignItems: "center",
    paddingVertical: 64, // More padding
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, // More pronounced shadow
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    marginHorizontal: 16,
  },
  noCertificatesIcon: {
    marginBottom: 24, // More space
    opacity: 0.7,
  },
  noCertificatesText: {
    fontSize: 20, // Larger text
    color: "#6b7280",
    marginBottom: 32, // More space
    textAlign: "center",
  },

  tableContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, // More pronounced shadow
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4c1d95", // Deeper purple for header
    paddingVertical: 16, // More padding
    paddingHorizontal: 20, // More padding
    borderBottomWidth: 1,
    borderBottomColor: "#6b21a8",
    minWidth: 800, // Added minWidth for horizontal scrolling
  },
  tableHeaderText: {
    color: "white",
    fontWeight: "700", // Bolder
    fontSize: 13, // Slightly larger font
    textTransform: "uppercase",
    letterSpacing: 0.8, // More spacing
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 16, // More padding
    paddingHorizontal: 20, // More padding
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6", // Lighter border for rows
    alignItems: "center",
    backgroundColor: "white", // Explicitly white background
    minWidth: 800, // Added minWidth for horizontal scrolling
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 15, // Slightly larger font
    color: "#374151",
    flexShrink: 1,
  },
  columnId: {
    width: "10%",
  },
  columnLevel: {
    width: "15%",
  },
  columnPath: {
    width: "25%",
  },
  columnDate: {
    width: "20%",
  },
  columnActions: {
    width: "30%",
  },
  viewLink: {
    color: "#6d28d9", // Purple link
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  actionsCell: {
    flexDirection: "row",
    gap: 10, // More space between buttons
    flexWrap: "wrap",
  },
  actionButton: {
    backgroundColor: "#8b5cf6", // Purple button
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10, // More rounded
    flexDirection: "row",
    alignItems: "center",
    gap: 6, // More space between icon and text
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  shareButton: {
    backgroundColor: "#10b981", // Green button
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13, // Slightly larger font
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)", // Darker overlay
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20, // More rounded corners
    padding: 32, // More padding
    width: "90%",
    maxWidth: 550,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: "#f3f4f6", // Light background for close button
    borderRadius: 999, // Circular
  },
  modalTitle: {
    fontSize: 28, // Larger title
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
  },
  modalSubtitle: {
    fontSize: 17,
    color: "#4b5563",
    marginBottom: 28, // More space
    textAlign: "center",
  },
  openInBrowserButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 14, // Larger button
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  openInBrowserButtonText: {
    color: "white",
    fontSize: 17, // Larger text
    fontWeight: "600",
  },
})

export default Certificate
