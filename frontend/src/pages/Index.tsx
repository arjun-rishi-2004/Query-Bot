import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ChatMessage, Message } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Database, Sparkles } from "lucide-react";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createMessage = (type: 'user' | 'ai', content: string, extras: Partial<Message> = {}): Message => ({
    id: Date.now().toString() + Math.random(),
    type,
    content,
    timestamp: new Date(),
    ...extras,
  });

  const handleSendMessage = async (question: string) => {
    if (!question.trim()) return;

    // Add user message
    const userMessage = createMessage('user', question);
    setMessages(prev => [...prev, userMessage]);

    // Add AI message with loading state
    const aiMessage = createMessage('ai', 'Generating SQL query...', { status: 'generating' });
    setMessages(prev => [...prev, aiMessage]);

    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:8000/generate-sql", { question });
      
      // Update AI message with SQL result
      const updatedAiMessage = createMessage('ai', `Here's the SQL query for your question:`, {
        id: aiMessage.id,
        sql: response.data.sql,
        originalQuestion: question, // Store the original question
        status: 'success'
      });

      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id ? updatedAiMessage : msg
      ));

      toast({
        description: "SQL query generated successfully",
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to generate SQL query";
      
      // Update AI message with error
      const errorAiMessage = createMessage('ai', `Sorry, I encountered an error: ${errorMessage}`, {
        id: aiMessage.id,
        status: 'error'
      });

      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id ? errorAiMessage : msg
      ));

      toast({
        variant: "destructive",
        title: "Error generating SQL",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSql = async (sql: string) => {
    setIsLoading(true);
    
    // Add status message
    const statusMessage = createMessage('ai', 'Executing SQL query...', { status: 'generating' });
    setMessages(prev => [...prev, statusMessage]);

    try {
      const response = await axios.post("http://localhost:8000/run-sql", { sql });
      
      // Update with results
      const resultsMessage = createMessage('ai', 'Query executed successfully:', {
        id: statusMessage.id,
        results: response.data,
        status: 'success'
      });

      setMessages(prev => prev.map(msg => 
        msg.id === statusMessage.id ? resultsMessage : msg
      ));

      toast({
        description: `Query returned ${response.data.rows?.length || 0} rows`,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to execute SQL query";
      
      const errorMsg = createMessage('ai', `Error executing query: ${errorMessage}`, {
        id: statusMessage.id,
        status: 'error'
      });

      setMessages(prev => prev.map(msg => 
        msg.id === statusMessage.id ? errorMsg : msg
      ));

      toast({
        variant: "destructive",
        title: "Query execution failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSql = async (sql: string, originalQuestion: string) => {
    setIsLoading(true);

    // Add status message
    const statusMessage = createMessage('ai', 'Saving query to Metabase...', { status: 'generating' });
    setMessages(prev => [...prev, statusMessage]);

    try {
      const response = await axios.post("http://localhost:8000/save-sql", {
        sql,
        name: `Q: ${originalQuestion}`,
        dashboard_id: 1,
      });

      const successMessage = createMessage('ai', `Successfully saved to Metabase as: "${response.data.card.name}"`, {
        id: statusMessage.id,
        status: 'success'
      });

      setMessages(prev => prev.map(msg => 
        msg.id === statusMessage.id ? successMessage : msg
      ));

      toast({
        description: "Query saved to Metabase successfully",
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to save to Metabase";
      
      const errorMsg = createMessage('ai', `Error saving to Metabase: ${errorMessage}`, {
        id: statusMessage.id,
        status: 'error'
      });

      setMessages(prev => prev.map(msg => 
        msg.id === statusMessage.id ? errorMsg : msg
      ));

      toast({
        variant: "destructive",
        title: "Save failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-chat-background flex flex-col">
        {/* Header */}
        <header className="border-b border-message-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-6 h-6 text-accent-primary" />
                <Sparkles className="w-5 h-5 text-accent-secondary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Iris Ask</h1>
                <p className="text-sm text-muted-foreground">
                  Ask questions about your data and get SQL queries instantly
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 relative">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="container max-w-4xl mx-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <Card className="p-8 text-center max-w-md">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Database className="w-8 h-8 text-accent-primary" />
                      <Sparkles className="w-6 h-6 text-accent-secondary" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">Welcome to AI SQL Assistant</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Ask questions about your data in natural language and I'll generate SQL queries for you.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Generate SQL from natural language</p>
                      <p>• Execute queries and see results</p>
                      <p>• Save queries to Metabase</p>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6 pb-6">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onRunSql={handleRunSql}
                      onSaveSql={handleSaveSql}
                      onSqlChange={(messageId, newSql) => {
                        setMessages(prev => prev.map(msg => 
                          msg.id === messageId ? { ...msg, sql: newSql } : msg
                        ));
                      }}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Ask a question about your data... (e.g., 'Show me the top 10 customers by revenue')"
        />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
