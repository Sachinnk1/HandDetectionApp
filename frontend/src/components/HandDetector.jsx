import { useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision';

const API_URL = 'https://handdetection-docker.onrender.com/api/detections/';

function HandDetector() {
  const videoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  const [result, setResult] = useState('Camera is stopped');
  const [confidence, setConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);

  // Load the newest saved detection when the page opens
  useEffect(() => {
    fetch(API_URL)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLastDetection(data[0]); // newest first
        }
      })
      .catch((error) =>
        console.error('Error loading last detection:', error)
      );
  }, []);

  useEffect(() => {
    const setupHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          }
        );

        handLandmarkerRef.current = handLandmarker;
      } catch (error) {
        console.error(error);
        setResult('Unable to load hand detection.');
      }
    };

    setupHandLandmarker();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  const detectHands = () => {
    if (!videoRef.current || !handLandmarkerRef.current) {
      return;
    }

    const video = videoRef.current;

    if (video.readyState >= 2) {
      const detectionResult = handLandmarkerRef.current.detectForVideo(
        video,
        performance.now()
      );

      if (detectionResult.landmarks.length > 0) {
        const hand = detectionResult.handednesses[0];
        const handType = hand[0].categoryName;
        const handConfidence = hand[0].score * 100;

        setResult(`${handType} HAND DETECTED`);
        setConfidence(handConfidence);

        const now = Date.now();

        if (now - lastSavedTimeRef.current >= 2000) {
          lastSavedTimeRef.current = now;

          fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hand_type: handType.toUpperCase(),
              confidence: handConfidence,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log('Detection saved:', data);
              if (data.id) setLastDetection(data); // ignore error responses
            })
            .catch((error) => {
              console.error('Error saving detection:', error);
            });
        }
      } else {
        setResult('NO HAND DETECTED');
        setConfidence(0);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  };

  const startCamera = async () => {
    try {
      if (!handLandmarkerRef.current) {
        setResult('Loading hand detection...');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadeddata = () => {
        setIsDetecting(true);
        setResult('NO HAND DETECTED');
        detectHands();
      };
    } catch (error) {
      console.error(error);
      setResult('Unable to access camera. Please allow camera permission.');
      setIsDetecting(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsDetecting(false);
    setResult('Camera is stopped');
    setConfidence(0);
  };

  return (
    <div className="detector-container">
      <div className="camera-card">
        <div className="camera-header">
          <h2>Hand Detection</h2>
          <span className={isDetecting ? 'status active' : 'status'}>
            {isDetecting ? '● Camera Active' : '● Camera Offline'}
          </span>
        </div>

        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted />
        </div>

        <div className="camera-controls">
          {!isDetecting ? (
            <button
              className="camera-button start-button"
              onClick={startCamera}
            >
              Start Camera
            </button>
          ) : (
            <button
              className="camera-button stop-button"
              onClick={stopCamera}
            >
              Stop Camera
            </button>
          )}
        </div>

        <div className="detection-result">
          <p className="result-label">Detection Result</p>

          <h1>{result}</h1>

          <p className="confidence-text">
            Confidence: {confidence.toFixed(1)}%
          </p>

          <div className="last-detection">
            <p className="result-label">Last Detection</p>

            {lastDetection ? (
              <>
                <h3>{lastDetection.hand_type} HAND</h3>
                <p>
                  Confidence: {Number(lastDetection.confidence).toFixed(1)}%
                </p>
                <p>
                  {new Date(lastDetection.detected_at).toLocaleString()}
                </p>
              </>
            ) : (
              <p>No detections yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HandDetector;