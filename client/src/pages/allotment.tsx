import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SubjectCard } from "@/components/subject-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  type: "Core" | "Elective" | "Lab" | "Project" | "Internship";
  credits: number;
  description: string;
  sections: number;
}

interface Allocation {
  id: string;
  userId: string;
  subjectId: string;
  createdAt: string;
  subject: Subject;
}

interface SubjectProbability {
  id: string;
  code: string;
  name: string;
  semester: number;
  type: string;
  credits: number;
  description: string;
  probabilityScore: number;
  riskLevel: string;
  recommendation: string;
  historicalData: {
    teachingCount: number;
    lastTaughtCount: number;
  };
}

interface SubjectPreference {
  id: string;
  userId: string;
  subjectId: string;
  rank: number;
  createdAt: string;
}

export default function Allotment() {
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [preferences, setPreferences] = useState<{ subjectId: string; rank: number }[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data: savedPrefs = [] } = useQuery<(SubjectPreference & { subject: Subject })[]>({
    queryKey: ["preferences"],
    queryFn: async () => {
      const response = await fetch("/api/preferences", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    },
  });

  // Sync state with saved preferences
  useState(() => {
    if (savedPrefs && savedPrefs.length > 0) {
      setPreferences(savedPrefs.map(p => ({ subjectId: p.subjectId, rank: p.rank })));
    }
  });

  const { data: settings } = useQuery<{ minPreferences: number }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings"); // Fixed path
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const minRequired = settings?.minPreferences ?? 3;

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: { subjectId: string; rank: number }[]) => {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast({
        title: "Preferences Saved",
        description: "Your ranked preference list has been updated.",
      });
    }
  });

  const addToPreferences = (subjectId: string) => {
    if (preferences.some(p => p.subjectId === subjectId)) return;
    setPreferences([...preferences, { subjectId, rank: preferences.length + 1 }]);
  };

  const removeFromPreferences = (subjectId: string) => {
    const newPrefs = preferences
      .filter(p => p.subjectId !== subjectId)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
    setPreferences(newPrefs);
  };

  const movePreference = (subjectId: string, direction: 'up' | 'down') => {
    const idx = preferences.findIndex(p => p.subjectId === subjectId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === preferences.length - 1) return;

    const newPrefs = [...preferences];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newPrefs[idx], newPrefs[targetIdx]] = [newPrefs[targetIdx], newPrefs[idx]];
    
    // Update ranks
    const finalPrefs = newPrefs.map((p, i) => ({ ...p, rank: i + 1 }));
    setPreferences(finalPrefs);
  };

  // Fetch all subjects
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch subjects");
      return response.json();
    },
  });

  // Fetch user's allocations
  const { data: allocations = [], isLoading: loadingAllocations } = useQuery<Allocation[]>({
    queryKey: ["allocations"],
    queryFn: async () => {
      const response = await fetch("/api/allocations/my", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch allocations");
      return response.json();
    },
  });

  // Fetch probabilities (this returns subjects with probability data)
  const { data: probabilities = [] } = useQuery<SubjectProbability[]>({
    queryKey: ["probabilities"],
    queryFn: async () => {
      const response = await fetch("/api/subjects/probabilities", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch probabilities");
      return response.json();
    },
  });

  // Create allocation mutation
  const createAllocation = useMutation({
    mutationFn: async (subjectId: string) => {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create allocation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast({
        title: "Subject Selected",
        description: "Subject has been added to your list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete allocation mutation
  const deleteAllocation = useMutation({
    mutationFn: async (allocationId: string) => {
      const response = await fetch(`/api/allocations/${allocationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete allocation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast({
        title: "Subject Removed",
        description: "Subject has been removed from your list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove subject.",
        variant: "destructive",
      });
    },
  });

  const selectedSubjectIds = new Set(allocations.map(a => a.subjectId));
  const selectedSubjects = allocations.map(a => a.subject);

  const toggleSubject = (subject: Subject) => {
    const allocation = allocations.find(a => a.subjectId === subject.id);
    
    if (allocation) {
      deleteAllocation.mutate(allocation.id);
    } else {
      if (allocations.length >= 3) {
        toast({
          title: "Limit Reached",
          description: "You can only select up to 3 subjects.",
          variant: "destructive",
        });
        return;
      }
      createAllocation.mutate(subject.id);
    }
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch = 
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSemester = semesterFilter === "all" || subject.semester.toString() === semesterFilter;
      const matchesType = typeFilter === "all" || subject.type === typeFilter;

      return matchesSearch && matchesSemester && matchesType;
    });
  }, [subjects, searchQuery, semesterFilter, typeFilter]);

  const isSelectionDisabled = allocations.length >= 3;

  // Create a map of probabilities by subject ID for quick lookup
  const probabilityMap = new Map(probabilities.map(p => [p.id, {
    subjectId: p.id,
    subjectCode: p.code,
    probability: p.probabilityScore,
    riskLevel: p.riskLevel,
    recommendation: p.recommendation
  }]));

  if (loadingSubjects || loadingAllocations) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading subjects...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Subject Allotment</h1>
            <p className="text-muted-foreground mt-1">
              Select your preferred subjects ({allocations.length}/3 selected)
            </p>
          </div>
          
            <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative" data-testid="button-view-selection">
                Ranked Preferences
                {preferences.length > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {preferences.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col h-full">
              <SheetHeader className="flex-none">
                <SheetTitle>Ranked Preferences</SheetTitle>
                <SheetDescription>
                  Rank at least {minRequired} subjects. Use arrows to change order.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto mt-8 pr-2 space-y-4 min-h-0">
                {preferences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No subjects added to preferences
                  </div>
                ) : (
                  preferences.map((pref) => {
                    const subject = subjects.find(s => s.id === pref.subjectId);
                    if (!subject) return null;
                    return (
                      <div key={subject.id} className="flex items-start justify-between p-3 bg-muted rounded-lg group" data-testid={`pref-subject-${subject.id}`}>
                        <div className="flex gap-2">
                          <div className="font-bold text-primary">{pref.rank}.</div>
                          <div>
                            <p className="font-medium text-sm">{subject.name}</p>
                            <p className="text-xs text-muted-foreground">{subject.code} • Sem {subject.semester}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => movePreference(subject.id, 'up')}
                            disabled={pref.rank === 1}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => movePreference(subject.id, 'down')}
                            disabled={pref.rank === preferences.length}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromPreferences(subject.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="flex-none pt-6 mt-4 border-t bg-background">
                 <Button 
                  className="w-full" 
                  disabled={preferences.length < minRequired || savePreferencesMutation.isPending}
                  onClick={() => savePreferencesMutation.mutate(preferences)}
                >
                  {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
                 </Button>
                 {preferences.length < minRequired && (
                   <p className="text-[10px] text-destructive text-center mt-2">
                     Minimum {minRequired} subjects required
                   </p>
                 )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border p-4 rounded-lg flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject name or code..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-full md:w-[150px]" data-testid="select-semester">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]" data-testid="select-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Elective">Elective</SelectItem>
                <SelectItem value="Lab">Lab</SelectItem>
              </SelectContent>
            </Select>
            
            {(semesterFilter !== "all" || typeFilter !== "all" || searchQuery) && (
              <Button variant="ghost" size="icon" onClick={() => {
                setSemesterFilter("all");
                setTypeFilter("all");
                setSearchQuery("");
              }} data-testid="button-clear-filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No subjects found matching your criteria.
            </div>
          ) : (
            filteredSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onToggle={() => addToPreferences(subject.id)}
                disabled={preferences.some(p => p.subjectId === subject.id)}
                isSelected={preferences.some(p => p.subjectId === subject.id)}
                probability={probabilityMap.get(subject.id)}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
