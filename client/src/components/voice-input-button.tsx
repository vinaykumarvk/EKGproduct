import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export function VoiceInputButton({ onTranscriptionComplete, disabled }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported in this browser');
    }
  }, []);

  const stopRecordingWithTranscript = (finalText: string) => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    setIsRecording(false);
    setTranscript('');
    
    if (finalText.trim()) {
      onTranscriptionComplete(finalText.trim());
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Voice input not supported in this browser');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Use continuous mode for handling pauses
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      const SILENCE_TIMEOUT = 4500; // 4.5 seconds of silence

      const resetSilenceTimer = () => {
        // Clear existing timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // Start new timer - stop recording after silence
        silenceTimerRef.current = setTimeout(() => {
          stopRecordingWithTranscript(finalTranscript);
        }, SILENCE_TIMEOUT);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
        
        // Reset silence timer whenever speech is detected
        resetSilenceTimer();
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          stopRecordingWithTranscript(finalTranscript);
        }
      };

      recognition.onend = () => {
        // Only process if not already stopped by silence timer
        if (isRecording) {
          stopRecordingWithTranscript(finalTranscript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript('');
      
      // Start initial silence timer
      resetSilenceTimer();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-testid="button-voice-input"
          onClick={startRecording}
          disabled={disabled || isRecording}
          variant={isRecording ? "default" : "outline"}
          size="lg"
          className={`h-[60px] w-[60px] p-0 ${
            isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''
          }`}
        >
          <Mic className="w-5 h-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">
          {isRecording 
            ? transcript || "Listening... speak now" 
            : "Click to start voice input"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
