import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onRecordingComplete: (url: string) => void;
  onRecordingDeleted: () => void;
  existingUrl?: string;
  maxDurationSeconds?: number;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onRecordingDeleted,
  existingUrl,
  maxDurationSeconds = 300, // 5 minutes default
}: VoiceRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingUrl || null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-upload the recording
        await uploadRecordingBlob(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDurationSeconds - 1) {
            stopRecording();
            toast({
              title: "Maximum duration reached",
              description: `Recording stopped at ${formatTime(maxDurationSeconds)}`,
            });
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record a voice note",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    onRecordingDeleted();
  };

  const uploadRecordingBlob = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Step 1: Get a signed upload URL
      const uploadUrlResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!uploadUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadUrlResponse.json();

      // Step 2: Upload the blob directly to the signed URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: {
          'Content-Type': blob.type,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to storage failed');
      }

      // Step 3: Set metadata and get the normalized path
      const metadataResponse = await fetch('/api/objects/metadata', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileURL: uploadURL }),
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to set file metadata');
      }

      const { objectPath } = await metadataResponse.json();
      onRecordingComplete(objectPath);
      
      toast({
        title: "Voice note saved",
        description: "Your recording has been uploaded",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload voice note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;
    await uploadRecordingBlob(audioBlob);
  };

  const progressPercent = (recordingTime / maxDurationSeconds) * 100;

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {!audioUrl && !isRecording && (
        <Button
          type="button"
          variant="outline"
          onClick={startRecording}
          className="w-full gap-2"
          data-testid="button-start-recording"
        >
          <Mic className="h-4 w-4 text-red-500" />
          Start Recording
        </Button>
      )}

      {isRecording && (
        <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-medium text-red-700">Recording</span>
            </div>
            <span className="text-sm font-mono text-red-600">
              {formatTime(recordingTime)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>

          <Progress value={progressPercent} className="h-2" />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pauseRecording}
              className="flex-1"
              data-testid="button-pause-recording"
            >
              {isPaused ? (
                <>
                  <Mic className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="flex-1"
              data-testid="button-stop-recording"
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="space-y-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Voice Note ({formatTime(recordingTime)})
            </span>
            {isUploading ? (
              <span className="text-xs text-primary-600 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading...
              </span>
            ) : (
              <span className="text-xs text-green-600">✓ Saved</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={playRecording}
              className="flex-1"
              disabled={isUploading}
              data-testid="button-play-recording"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Play
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={deleteRecording}
              disabled={isUploading}
              className="text-red-600 hover:text-red-700"
              data-testid="button-delete-recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Maximum recording duration: {formatTime(maxDurationSeconds)}
      </p>
    </div>
  );
}
