import { Subject } from "@/lib/mock-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Plus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubjectProbability {
  subjectId: string;
  subjectCode: string;
  probability: number;
  riskLevel: string;
  recommendation: string;
}

interface SubjectCardProps {
  subject: Subject;
  isSelected: boolean;
  onToggle: (subject: Subject) => void;
  disabled: boolean;
  probability?: SubjectProbability;
}

export function SubjectCard({ subject, isSelected, onToggle, disabled, probability }: SubjectCardProps) {
  const getProbabilityColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md border-border",
      isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "bg-card hover:border-primary/50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono bg-background text-muted-foreground border-border">
                  {subject.code}
                </Badge>
                <Badge variant={subject.type === "Core" ? "default" : "secondary"} className="text-[10px]">
                  {subject.type}
                </Badge>
              </div>
              {probability && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-help",
                        getProbabilityColor(probability.probability)
                      )}>
                        {probability.probability}% Prob.
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      <p className="font-bold mb-1">{probability.recommendation}</p>
                      <p>{probability.riskLevel} Risk of overlap or denial based on historical seniority analysis.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <CardTitle className="text-base font-medium leading-tight h-10 line-clamp-2 mt-2">
              {subject.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
          {subject.description}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">Sem {subject.semester}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">{subject.credits}</span> Credits
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className={cn("w-full transition-all", isSelected ? "bg-primary text-primary-foreground" : "")}
          onClick={() => onToggle(subject)}
          disabled={!isSelected && disabled}
        >
          {isSelected ? (
            <>
              <Check className="mr-2 h-3 w-3" /> Selected
            </>
          ) : (
            <>
              <Plus className="mr-2 h-3 w-3" /> Select Subject
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
