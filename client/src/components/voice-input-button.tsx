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
  const isHoldingRef = useRef(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported in this browser');
    }
  }, []);

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    setIsRecording(false);
    isHoldingRef.current = false;
  };

  // Quick tap mode - auto-stop after short silence
  const startQuickMode = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Voice input not supported in this browser');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false; // Auto-stops after silence
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

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
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (finalTranscript.trim()) {
          onTranscriptionComplete(finalTranscript.trim());
        }
        setTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Hold mode - continuous recording while button is pressed
  const startHoldMode = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Voice input not supported in this browser');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true; // Keep recording
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

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
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'aborted') {
          setIsRecording(false);
          isHoldingRef.current = false;
        }
      };

      recognition.onend = () => {
        if (!isHoldingRef.current) {
          setIsRecording(false);
          if (finalTranscript.trim()) {
            onTranscriptionComplete(finalTranscript.trim());
          }
          setTranscript('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleMouseDown = () => {
    if (disabled || isRecording) return;

    // Set a timer to detect if this is a hold (300ms threshold)
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      startHoldMode();
    }, 300);
  };

  const handleMouseUp = () => {
    if (disabled) return;

    // Clear the hold detection timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If we were holding, stop recording
    if (isHoldingRef.current) {
      stopRecording();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    // If not holding and not recording yet, it's a quick tap
    if (!isRecording) {
      startQuickMode();
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
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
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
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
            : isHoldingRef.current 
              ? "Hold to keep recording..."
              : "Tap for quick input • Hold for long input"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
