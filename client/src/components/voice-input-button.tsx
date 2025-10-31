import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { useVoiceInput } from "@/hooks/use-voice-input";
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
  
  const {
    isRecording,
    isProcessing,
    interimTranscript,
    error,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  } = useVoiceInput({
    onTranscriptionComplete: (text) => {
      onTranscriptionComplete(text);
      toast({
        title: "Transcription Complete",
        description: "Your voice input has been transcribed successfully.",
      });
    },
    onError: (errorMessage) => {
      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const getButtonVariant = () => {
    if (error) return "destructive";
    if (isRecording) return "default";
    return "outline";
  };

  const getTooltipText = () => {
    if (disabled) return "Voice input disabled while processing";
    if (error) return error;
    if (isProcessing) return "Transcribing your audio...";
    if (isRecording) return `Recording... ${interimTranscript ? `"${interimTranscript}"` : "Speak now"}`;
    if (hasPermission === false) return "Microphone permission denied. Please enable in browser settings.";
    if (hasPermission === null) return "Click to enable voice input";
    return "Click to start voice input";
  };

  const getButtonIcon = () => {
    if (isProcessing) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    if (error || hasPermission === false) {
      return <AlertCircle className="w-5 h-5" />;
    }
    if (isRecording) {
      return (
        <div className="relative">
          <Mic className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </div>
      );
    }
    return <Mic className="w-5 h-5" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-testid="button-voice-input"
          onClick={handleToggleRecording}
          disabled={disabled || isProcessing || hasPermission === false}
          variant={getButtonVariant()}
          size="lg"
          className={`h-[60px] w-[60px] p-0 transition-all ${
            isRecording ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''
          }`}
        >
          {getButtonIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm max-w-xs">
          {getTooltipText()}
        </p>
        {interimTranscript && isRecording && (
          <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
            Preview: "{interimTranscript}"
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
