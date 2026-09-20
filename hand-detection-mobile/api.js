import axios from "axios";

export const BASE_URL = "https://handdetectionappbackend.onrender.com";

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

export const getDetections = async () => (await api.get("/api/detections/")).data;

export const createDetection = async (payload) =>
  (await api.post("/api/detections/", payload)).data;

export async function detectHand(photoUri) {
  const form = new FormData();
  form.append("image", { uri: photoUri, name: "frame.jpg", type: "image/jpeg" });
  const { data } = await api.post("/api/detect/", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000,
  });
  return data;
}