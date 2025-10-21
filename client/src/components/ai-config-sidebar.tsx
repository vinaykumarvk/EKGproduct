import { useState } from "react";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AIConfigSidebarProps {
  onConfigChange?: (config: AIConfig) => void;
}

export interface AIConfig {
  model: string;
  temperature: number;
  hops: number;
  tokenLimit: number;
  systemPrompt: string;
}

export function AIConfigSidebar({ onConfigChange }: AIConfigSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [config, setConfig] = useState<AIConfig>({
    model: "GPT-4o",
    temperature: 0.7,
    hops: 3,
    tokenLimit: 2048,
    systemPrompt: "You are a helpful wealth management AI assistant.",
  });

  const updateConfig = (updates: Partial<AIConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-border bg-card flex flex-col h-full items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          data-testid="button-expand-config-sidebar"
          className="mb-4"
          title="Expand configuration"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Settings className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground" data-testid="text-config-title">
              AI Model Configuration
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            data-testid="button-collapse-config-sidebar"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Customize AI behavior and performance
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model-select" className="text-sm font-medium">
            LLM Model
          </Label>
          <Select
            value={config.model}
            onValueChange={(value) => updateConfig({ model: value })}
          >
            <SelectTrigger id="model-select" data-testid="select-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GraphRAG" data-testid="option-graphrag">
                GraphRAG
              </SelectItem>
              <SelectItem value="OpenAI" data-testid="option-openai">
                OpenAI
              </SelectItem>
              <SelectItem value="GPT-4o" data-testid="option-gpt4o">
                GPT-4o
              </SelectItem>
              <SelectItem value="GPT-5" data-testid="option-gpt5">
                GPT-5
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the language model to use
          </p>
        </div>

        {/* Temperature Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature-slider" className="text-sm font-medium">
              Temperature
            </Label>
            <span className="text-sm font-mono text-muted-foreground" data-testid="text-temperature-value">
              {config.temperature.toFixed(2)}
            </span>
          </div>
          <Slider
            id="temperature-slider"
            data-testid="slider-temperature"
            value={[config.temperature]}
            onValueChange={([value]) => updateConfig({ temperature: value })}
            min={0}
            max={2}
            step={0.01}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controls randomness: Lower is more focused, higher is more creative
          </p>
        </div>

        {/* Hops Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="hops-slider" className="text-sm font-medium">
              Hops
            </Label>
            <span className="text-sm font-mono text-muted-foreground" data-testid="text-hops-value">
              {config.hops}
            </span>
          </div>
          <Slider
            id="hops-slider"
            data-testid="slider-hops"
            value={[config.hops]}
            onValueChange={([value]) => updateConfig({ hops: value })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Number of knowledge graph traversal steps
          </p>
        </div>

        {/* Token Limit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="token-limit" className="text-sm font-medium">
              Token Limit
            </Label>
            <span className="text-sm font-mono text-muted-foreground" data-testid="text-token-limit-value">
              {config.tokenLimit.toLocaleString()}
            </span>
          </div>
          <Input
            id="token-limit"
            type="number"
            data-testid="input-token-limit"
            value={config.tokenLimit}
            onChange={(e) => updateConfig({ tokenLimit: parseInt(e.target.value) || 0 })}
            min={128}
            max={32000}
            step={128}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum tokens for model response
          </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="system-prompt" className="text-sm font-medium">
            System Prompt
          </Label>
          <Textarea
            id="system-prompt"
            data-testid="textarea-system-prompt"
            value={config.systemPrompt}
            onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
            className="min-h-[120px] resize-none font-mono text-sm"
            placeholder="Enter custom system prompt..."
          />
          <p className="text-xs text-muted-foreground">
            Define the AI assistant's behavior and context
          </p>
        </div>
      </div>
    </div>
  );
}
