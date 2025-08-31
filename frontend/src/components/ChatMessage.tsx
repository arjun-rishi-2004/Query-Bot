import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Play, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  sql?: string;
  originalQuestion?: string;
  results?: any;
  timestamp: Date;
  status?: 'generating' | 'success' | 'error';
}

interface ChatMessageProps {
  message: Message;
  onRunSql?: (sql: string) => void;
  onSaveSql?: (sql: string, originalQuestion: string) => void;
  onSqlChange?: (messageId: string, newSql: string) => void;
  isLoading?: boolean;
}

const formatSql = (sql: string) => {
  const keywords = /\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|GROUP BY|ORDER BY|HAVING|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|INDEX|TABLE|DATABASE)\b/gi;
  const strings = /'([^']*)'/g;
  const comments = /--.*$/gm;
  
  return sql
    .replace(keywords, '<span class="sql-keyword">$&</span>')
    .replace(strings, '<span class="sql-string">$&</span>')
    .replace(comments, '<span class="sql-comment">$&</span>');
};

export const ChatMessage = ({ message, onRunSql, onSaveSql, onSqlChange, isLoading }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        description: "Copied to clipboard",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        description: "Failed to copy to clipboard",
      });
    }
  };

  const isUser = message.type === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} message-fade-in`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <Card className={`p-4 ${
          isUser 
            ? 'bg-message-user border-message-border' 
            : 'bg-message-ai border-message-border shadow-sm'
        }`}>
          {/* Message header */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isUser ? "secondary" : "outline"} className="text-xs">
              {isUser ? 'You' : 'AI Assistant'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString()}
            </span>
            {message.status === 'generating' && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-accent-primary rounded-full typing-indicator"></div>
                <div className="w-1 h-1 bg-accent-primary rounded-full typing-indicator" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-accent-primary rounded-full typing-indicator" style={{animationDelay: '0.4s'}}></div>
              </div>
            )}
            {message.status === 'success' && (
              <CheckCircle className="w-4 h-4 text-accent-secondary" />
            )}
            {message.status === 'error' && (
              <AlertCircle className="w-4 h-4 text-accent-danger" />
            )}
          </div>

          {/* Message content */}
          <div className="space-y-3">
            <p className="whitespace-pre-wrap">{message.content}</p>

            {/* SQL Code Block */}
            {message.sql && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Generated SQL:</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(message.sql!)}
                    className="h-8"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <textarea
                  value={message.sql}
                  onChange={(e) => onSqlChange?.(message.id, e.target.value)}
                  className="w-full p-3 rounded-md border border-message-border bg-code-background text-sm font-mono text-foreground resize-y min-h-[120px] focus:border-accent-primary focus:outline-none"
                  placeholder="SQL query will appear here..."
                />
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => onRunSql?.(message.sql!)}
                    disabled={isLoading}
                    className="bg-accent-secondary hover:bg-accent-secondary/90"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run Query
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSaveSql?.(message.sql!, message.originalQuestion || message.content)}
                    disabled={isLoading}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save to Metabase
                  </Button>
                </div>
              </div>
            )}

            {/* Results Table */}
            {message.results && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Query Results:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-message-border rounded-lg">
                    <thead>
                      <tr className="bg-code-background">
                        {message.results.columns?.map((col: string, i: number) => (
                          <th key={i} className="border border-message-border px-3 py-2 text-left font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {message.results.rows?.map((row: any[], i: number) => (
                        <tr key={i} className="hover:bg-code-background/50">
                          {row.map((cell: any, j: number) => (
                            <td key={j} className="border border-message-border px-3 py-2">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-muted-foreground">
                  {message.results.rows?.length || 0} rows returned
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};