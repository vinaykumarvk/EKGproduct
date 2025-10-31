import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscriptionComplete, disabled }: VoiceInputButtonProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          
          if (data.text) {
            onTranscriptionComplete(data.text);
            toast({
              title: "Voice Input Complete",
              description: "Your question has been transcribed successfully.",
            });
          } else {
            throw new Error('No transcription received');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: "Transcription Failed",
            description: "Could not transcribe your audio. Please try again or type your question.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak your question clearly...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-testid="button-voice-input"
          onClick={handleToggle}
          disabled={disabled || isProcessing}
          variant={isRecording ? "default" : "outline"}
          size="lg"
          className={`h-[60px] w-[60px] p-0 ${
            isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm">
          {isProcessing 
            ? "Transcribing your audio..." 
            : isRecording 
            ? "Click to stop recording" 
            : "Click to start voice input"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
