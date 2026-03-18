import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { 
  Camera, 
  ShieldAlert, 
  UserCheck, 
  Activity, 
  Maximize2,
  Minimize2,
  RefreshCw,
  Upload,
  Play,
  ChevronLeft
} from "lucide-react";
import { cn } from "../lib/utils";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

export default function LiveFeed({ 
  studentsPresent 
}: { 
  studentsPresent: string[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExamMode, setIsExamMode] = useState(false);
  const [attention, setAttention] = useState(100);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [ipCameraUrl, setIpCameraUrl] = useState<string>("");
  const [demoVideoUrl, setDemoVideoUrl] = useState<string>("");
  const [sourceType, setSourceType] = useState<"webcam" | "ip" | "demo">("webcam");
  const [liveHeadcount, setLiveHeadcount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const studentsPresentRef = useRef<string[]>(studentsPresent);

  // Keep ref in sync with prop for detection loop
  useEffect(() => {
    studentsPresentRef.current = studentsPresent;
  }, [studentsPresent]);

  useEffect(() => {
    const getDevices = async () => {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoaded(true);
        startVideo();
      } catch (err) {
        console.error("Failed to load models:", err);
      }
    };
    loadModels();
  }, []);

  const startVideo = () => {
    if (sourceType === "demo" && demoVideoUrl) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = demoVideoUrl;
        videoRef.current.loop = true;
        videoRef.current.play();
      }
      return;
    }

    if (sourceType === "ip" && ipCameraUrl) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = ipCameraUrl;
      }
      return;
    }

    const constraints = selectedDeviceId ? { video: { deviceId: { exact: selectedDeviceId } } } : { video: {} };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.src = "";
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (isLoaded) startVideo();
  }, [selectedDeviceId, ipCameraUrl, demoVideoUrl, sourceType, isLoaded]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.readyState < 2) return;

      try {
        // CCTV Optimization: Using SSD Mobilenet for much higher accuracy in wide shots
        const detections = await faceapi.detectAllFaces(
          videoRef.current, 
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
        ).withFaceLandmarks();

        setLiveHeadcount(detections.length);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Precise mapping: Match canvas to video's intrinsic resolution for 1:1 detection mapping
        // Then rely on CSS to scale the canvas over the video element
        const displaySize = { 
          width: video.videoWidth, 
          height: video.videoHeight 
        };
        
        faceapi.matchDimensions(canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          resizedDetections.forEach(detection => {
            const { x, y, width, height } = detection.detection.box;
            
            // High-visibility CCTV style boxes
            ctx.strokeStyle = isExamMode && detections.length > 1 ? "#FF4444" : "#00FF00";
            ctx.lineWidth = 4; // Thicker for CCTV
            ctx.strokeRect(x, y, width, height);
            
            // Corner Accents
            ctx.fillStyle = ctx.strokeStyle;
            const cs = Math.max(20, width * 0.2); // Responsive corner size
            ctx.fillRect(x, y, cs, 4);
            ctx.fillRect(x, y, 4, cs);
            ctx.fillRect(x + width - cs, y, cs, 4);
            ctx.fillRect(x + width - 4, y, 4, cs);
            ctx.fillRect(x, y + height - 4, cs, 4);
            ctx.fillRect(x, y + height - cs, 4, cs);
            ctx.fillRect(x + width - cs, y + height - 4, cs, 4);
            ctx.fillRect(x + width - 4, y + height - cs, 4, cs);

            // Tech Label
            ctx.font = `bold ${Math.max(14, width * 0.1)}px JetBrains Mono`;
            ctx.fillStyle = "white";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "black";
            ctx.fillText(`ID_${Math.floor(Math.random() * 1000)} [CONF: ${(detection.detection.score * 100).toFixed(0)}%]`, x, y - 10);
            ctx.shadowBlur = 0;
          });
        }

        // Attention Logic
        if (detections.length === 0) {
          setAttention(prev => Math.max(0, prev - 5));
        } else {
          setAttention(prev => Math.min(100, prev + 2));
        }

        // Exam Mode Logic
        if (isExamMode) {
          if (detections.length > 1) {
            recordAlert("Multiple faces detected in Exam Mode!", "exam_violation");
          }
          detections.forEach(d => {
            const landmarks = d.landmarks;
            const nose = landmarks.getNose()[0];
            const leftEye = landmarks.getLeftEye()[0];
            const rightEye = landmarks.getRightEye()[0];
            const horizontalDiff = Math.abs(nose.x - (leftEye.x + rightEye.x) / 2);
            if (horizontalDiff > 15) {
              recordAlert("Suspicious movement detected!", "suspicious_behavior");
            }
          });
        }

        // Attendance Logic: Total Headcount should be the maximum number of unique students seen.
        // Since we don't have real face recognition, we use the maximum simultaneous count as a proxy.
        if (detections.length > studentsPresentRef.current.length) {
          const currentCount = studentsPresentRef.current.length;
          const newCount = detections.length;
          
          for (let i = currentCount + 1; i <= newCount; i++) {
            const mockName = `Student_${i}`;
            if (!studentsPresentRef.current.includes(mockName)) {
              markAttendance(mockName);
            }
          }
        }
      } catch (err) {
        console.error("Detection error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoaded, isExamMode]);

  const recordAlert = async (message: string, type: string) => {
    try {
      await addDoc(collection(db, "alerts"), {
        message,
        type,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to record alert:", err);
    }
  };

  const markAttendance = async (name: string) => {
    const now = new Date();
    try {
      await addDoc(collection(db, "attendance"), {
        name,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        status: "Present",
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to mark attendance:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setDemoVideoUrl(url);
      setSourceType("demo");
    }
  };

  return (
    <div className="space-y-8">
      {/* Source Selection */}
      <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-[#141414] flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSourceType("webcam")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sourceType === "webcam" ? "bg-[#F27D26] text-black" : "bg-[#141414] text-[#8E9299]"
            )}
          >
            Webcam / CCTV Card
          </button>
          <button 
            onClick={() => setSourceType("ip")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sourceType === "ip" ? "bg-[#F27D26] text-black" : "bg-[#141414] text-[#8E9299]"
            )}
          >
            IP Camera (MJPEG)
          </button>
          <button 
            onClick={() => setSourceType("demo")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sourceType === "demo" ? "bg-[#F27D26] text-black" : "bg-[#141414] text-[#8E9299]"
            )}
          >
            Demo (Video File)
          </button>
        </div>

        <div className="h-8 w-[1px] bg-[#141414]" />

        {sourceType === "webcam" && (
          <select 
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-[#141414] border border-[#1A1A1A] rounded-lg px-3 py-1.5 text-[10px] text-[#8E9299] focus:outline-none focus:border-[#F27D26]/30"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
            ))}
          </select>
        )}

        {sourceType === "ip" && (
          <input 
            type="text" 
            placeholder="http://192.168.1.100:8080/video"
            value={ipCameraUrl}
            onChange={(e) => setIpCameraUrl(e.target.value)}
            className="bg-[#141414] border border-[#1A1A1A] rounded-lg px-3 py-1.5 text-[10px] text-[#8E9299] focus:outline-none focus:border-[#F27D26]/30 w-64"
          />
        )}

        {sourceType === "demo" && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#1A1A1A] text-[10px] text-[#8E9299] cursor-pointer hover:text-white transition-colors">
              <Upload size={12} />
              {demoVideoUrl ? "Change Video" : "Upload Footage"}
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
            {demoVideoUrl && (
              <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <Play size={10} /> Ready for Analysis
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#1A1A1A]">
            <Activity size={14} className="text-[#F27D26]" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Attention: {attention}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#1A1A1A]">
            <UserCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Total Headcount: {studentsPresent.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#1A1A1A] border-dashed">
            <Camera size={14} className="text-blue-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Total Live Headcount: {liveHeadcount}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExamMode(!isExamMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all uppercase text-[9px] font-bold tracking-[0.2em]",
              isExamMode 
                ? "bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]" 
                : "bg-[#141414] border-[#1A1A1A] text-[#8E9299] hover:text-white"
            )}
          >
            <ShieldAlert size={12} />
            {isExamMode ? "Exam Mode Active" : "Enable Exam Mode"}
          </button>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-full bg-[#141414] border border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors"
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className={cn(
        "relative rounded-3xl overflow-hidden bg-black border border-[#141414] shadow-2xl transition-all duration-500",
        isFullScreen ? "fixed inset-8 z-[100] m-0" : "aspect-video"
      )}>
        {isFullScreen && (
          <button 
            onClick={() => setIsFullScreen(false)}
            className="absolute top-8 left-8 z-50 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white hover:bg-black/80 transition-all group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Go Back</span>
          </button>
        )}

        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] z-20">
            <RefreshCw className="w-12 h-12 text-[#F27D26] animate-spin mb-4" />
            <p className="text-sm uppercase tracking-[0.3em] font-light">Initializing Vision Core...</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          width="1280" 
          height="720" 
          className="w-full h-full object-contain bg-black grayscale opacity-80"
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {isExamMode && (
          <div className="absolute inset-0 border-4 border-red-500/20 animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
}
