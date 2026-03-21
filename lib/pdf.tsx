/**
 * Certificate PDF generation using @react-pdf/renderer.
 * Called server-side in the /api/certificates/[courseId] route.
 */
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register a clean font (bundled system-safe fallback)
Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0f0c29",
    padding: 60,
    fontFamily: "Helvetica",
    position: "relative",
  },
  border: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 2,
    borderColor: "#7c3aed",
    borderStyle: "solid",
    borderRadius: 8,
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#a78bfa",
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: "#c4b5fd",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#7c3aed",
    borderTopStyle: "solid",
    marginVertical: 24,
    opacity: 0.4,
  },
  body: {
    textAlign: "center",
    color: "#e9d5ff",
  },
  presents: {
    fontSize: 13,
    color: "#a78bfa",
    marginBottom: 20,
    letterSpacing: 1,
  },
  recipientName: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
    letterSpacing: 1,
  },
  completionText: {
    fontSize: 13,
    color: "#c4b5fd",
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#a78bfa",
    marginBottom: 32,
  },
  footer: {
    marginTop: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureBlock: {
    textAlign: "center",
    flex: 1,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#7c3aed",
    borderTopStyle: "solid",
    marginBottom: 6,
    opacity: 0.6,
  },
  signatureLabel: {
    fontSize: 10,
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 11,
    color: "#c4b5fd",
    textAlign: "center",
    marginTop: 24,
  },
  certId: {
    fontSize: 9,
    color: "#7c3aed",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.5,
  },
});

interface CertificateData {
  recipientName: string;
  courseTitle:   string;
  instructorName: string;
  issuedAt:      Date;
  certificateId: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data.issuedAt);

  const doc = (
    <Document
      title={`Certificate — ${data.courseTitle}`}
      author="LearnHub"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Decorative border */}
        <View style={styles.border} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>LEARNHUB</Text>
          <Text style={styles.subtitle}>Certificate of Completion</Text>
        </View>

        <View style={styles.divider} />

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.presents}>This is to certify that</Text>
          <Text style={styles.recipientName}>{data.recipientName}</Text>
          <Text style={styles.completionText}>
            has successfully completed the course
          </Text>
          <Text style={styles.courseTitle}>{data.courseTitle}</Text>
          <Text style={styles.dateText}>Issued on {formatted}</Text>
          <Text style={styles.certId}>Certificate ID: {data.certificateId}</Text>
        </View>

        {/* Footer signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{data.instructorName}</Text>
            <Text style={{ ...styles.signatureLabel, fontSize: 9 }}>Instructor</Text>
          </View>
          <View style={{ flex: 0.3 }} />
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>LearnHub</Text>
            <Text style={{ ...styles.signatureLabel, fontSize: 9 }}>Platform</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
