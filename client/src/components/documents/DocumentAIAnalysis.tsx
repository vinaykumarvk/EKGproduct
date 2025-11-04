import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileSearch, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/documents/MarkdownRenderer";

interface DocumentAIAnalysisProps {
  document: any;
}

export function DocumentAIAnalysis({ document }: DocumentAIAnalysisProps) {
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async (customQuestion?: string) => {
    const queryQuestion = customQuestion || question;
    
    setIsAnalyzing(true);
    setAnalysis("");

    try {
      const response = await fetch(`/api/documents/${document.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: queryQuestion.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Failed to analyze document");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      toast({ title: "Document analysis completed" });
    } catch (error) {
      console.error("Document analysis error:", error);
      toast({ 
        title: "Failed to analyze document", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const quickActions = [
    { label: "Summarize", question: "Please provide a comprehensive summary of this document." },
    { label: "Key Points", question: "What are the key points and main takeaways from this document?" },
    { label: "Data & Metrics", question: "Extract all important data, metrics, and numbers from this document." },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm mb-1">
              AI Document Analysis
            </h4>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Ask questions about <span className="font-medium">{document.originalName}</span> or use quick actions below.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleAnalyze(action.question)}
            disabled={isAnalyzing}
            className="text-xs"
            data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Custom Question */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask a specific question about this document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isAnalyzing && question.trim()) {
              handleAnalyze();
            }
          }}
          disabled={isAnalyzing}
          className="flex-1 text-sm"
          data-testid="input-document-question"
        />
        <Button
          onClick={() => handleAnalyze()}
          disabled={isAnalyzing || !question.trim()}
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-analyze-document"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FileSearch className="h-3 w-3" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <Card className="p-3 bg-gray-50 dark:bg-gray-900" data-testid="card-analysis-result">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Analysis
            </h4>
            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
              <MarkdownRenderer content={analysis} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
