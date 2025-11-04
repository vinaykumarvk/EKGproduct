import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Search, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/documents/MarkdownRenderer";

interface MarketRegulationResearchProps {
  projectContext?: string;
}

export function MarketRegulationResearch({ projectContext }: MarketRegulationResearchProps) {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState(projectContext || "");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{ question: string; answer: string; timestamp: string }>>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!question.trim()) {
      toast({ title: "Please enter a question", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/research/regulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          projectContext: context.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Failed to research regulation");
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSearchHistory(prev => [{
        question: data.question,
        answer: data.answer,
        timestamp: data.timestamp
      }, ...prev.slice(0, 4)]); // Keep last 5 searches

      toast({ title: "Research completed successfully" });
    } catch (error) {
      console.error("Market regulation research error:", error);
      toast({ 
        title: "Failed to research regulation", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (item: { question: string; answer: string }) => {
    setQuestion(item.question);
    setAnswer(item.answer);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Market Regulation Research Portal</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              AI-powered research assistant for market regulations, compliance requirements, and industry standards. 
              Ask specific questions about regulatory compliance for your project.
            </p>
          </div>
        </div>
      </div>

      {/* Project Context (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Context (Optional)
        </label>
        <Textarea
          placeholder="E.g., We are implementing PFAS remediation for automotive manufacturing..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          className="resize-none"
          data-testid="input-regulation-context"
        />
        <p className="text-xs text-gray-500">Provide project context to get more relevant regulatory guidance.</p>
      </div>

      {/* Regulation Question */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Regulation Question <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="E.g., What are the EPA regulations for PFAS disposal in 2025?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleSearch();
              }
            }}
            disabled={isLoading}
            className="flex-1"
            data-testid="input-regulation-question"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !question.trim()}
            className="flex items-center gap-2"
            data-testid="button-search-regulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Research
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Answer Display */}
      {answer && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-900" data-testid="card-regulation-answer">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Search className="h-4 w-4 text-green-600" />
              Research Results
            </h4>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={answer} />
            </div>
          </div>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Searches</h4>
          <div className="space-y-2">
            {searchHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => loadFromHistory(item)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`button-history-${index}`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                  {item.question}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
