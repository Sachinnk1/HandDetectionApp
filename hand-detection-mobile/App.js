import { useEffect, useRef, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getDetections, createDetection, detectHand } from "./api";

const SCAN_DELAY = 300;      // ms between frames
const SAVE_COOLDOWN = 3000;  // save at most once every 3 s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const cameraRef = useRef(null);
  const lastSave = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [status, setStatus] = useState("Show your hand");
  const [lastDetection, setLastDetection] = useState(null);
  const [error, setError] = useState(null);

  // On startup, load only the most recent saved detection
  useEffect(() => {
    (async () => {
      try {
        const data = await getDetections(); // newest first (Meta ordering)
        if (data.length > 0) setLastDetection(data[0]);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!permission?.granted || !cameraReady || !scanning) return;
    let cancelled = false;

    const loop = async () => {
      while (!cancelled) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.2,
            skipProcessing: true,
            shutterSound: false,
            exif: false,
          });
          const res = await detectHand(photo.uri);
          if (cancelled) break;

          if (res.detected) {
            setStatus(`${res.hand_type} hand (${Math.round(res.confidence * 100)}%)`);
            const now = Date.now();
            if (now - lastSave.current > SAVE_COOLDOWN) {
              lastSave.current = now;
              const saved = await createDetection({
                hand_type: res.hand_type,
                confidence: Math.round(res.confidence * 100),
              });
              setLastDetection(saved);
            }
          } else {
            setStatus("Show your hand");
          }
          setError(null);
        } catch (e) {
          setError(JSON.stringify(e.response?.data ?? e.message));
          await sleep(1500);
        }
        await sleep(SCAN_DELAY);
      }
    };

    loop();
    return () => { cancelled = true; };
  }, [permission?.granted, cameraReady, scanning]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Hand Detection App</Text>
        <Text>Camera access is needed</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hand Detection App</Text>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        animateShutter={false}
        onCameraReady={() => setCameraReady(true)}
      />

      <Text style={styles.status}>{status}</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={scanning ? "Stop scanning" : "Start scanning"}
        onPress={() => setScanning((s) => !s)}
      />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Last detection</Text>
        {lastDetection ? (
          <>
            <Text style={styles.cardHand}>{lastDetection.hand_type} HAND</Text>
            <Text style={styles.cardText}>Confidence: {lastDetection.confidence}%</Text>
            <Text style={styles.cardTime}>
              {new Date(lastDetection.detected_at).toLocaleString()}
            </Text>
          </>
        ) : (
          <Text style={styles.cardText}>No detections yet</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
    marginBottom: 14,
  },
  camera: { height: 300, borderRadius: 12, overflow: "hidden" },
  status: { fontSize: 20, fontWeight: "700", textAlign: "center", marginVertical: 10 },
  error: { color: "red", marginBottom: 6 },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cardLabel: { fontSize: 14, color: "#6b7280", marginBottom: 6 },
  cardHand: { fontSize: 24, fontWeight: "700" },
  cardText: { fontSize: 16, marginTop: 4 },
  cardTime: { fontSize: 13, color: "#6b7280", marginTop: 6 },
});