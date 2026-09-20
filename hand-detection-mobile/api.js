import axios from "axios";

// Real phone: your PC's LAN IP. Android emulator: 10.0.2.2
export const BASE_URL = "http://192.168.1.7:8000";

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

export const getDetections = async () => (await api.get("/api/detections/")).data;

export const createDetection = async (payload) =>
  (await api.post("/api/detections/", payload)).data;

export async function detectHand(photoUri) {
  const form = new FormData();
  form.append("image", { uri: photoUri, name: "frame.jpg", type: "image/jpeg" });
  const { data } = await api.post("/api/detect/", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 10000,
  });
  return data;
}