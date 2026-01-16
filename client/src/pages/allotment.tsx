import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SubjectCard } from "@/components/subject-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ChevronUp, ChevronDown, BookOpen, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  type: string; // "Core" | "Elective" | "Lab" ...
  credits: number;
  description: string;
  sections: number;
  isLab: boolean; // Using the isLab flag from your schema update
}

interface Allocation {
  id: string;
  userId: string;
  subjectId: string;
  createdAt: string;
  subject: Subject;
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

  // Separate states for Theory and Lab preferences
  const [theoryPreferences, setTheoryPreferences] = useState<{ subjectId: string; rank: number }[]>([]);
  const [labPreferences, setLabPreferences] = useState<{ subjectId: string; rank: number }[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all subjects first so we can categorize preferences correctly
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch subjects");
      return response.json();
    },
  });

  // Fetch saved preferences
  const { data: savedPrefs = [] } = useQuery<(SubjectPreference & { subject: Subject })[]>({
    queryKey: ["preferences"],
    queryFn: async () => {
      const response = await fetch("/api/preferences", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    },
  });

  // Sync state with saved preferences (Split into two lists)
  useEffect(() => {
    if (savedPrefs.length > 0 && subjects.length > 0) {
      const theory: { subjectId: string; rank: number }[] = [];
      const labs: { subjectId: string; rank: number }[] = [];

      // Sort by rank first to maintain order
      const sortedPrefs = [...savedPrefs].sort((a, b) => a.rank - b.rank);

      sortedPrefs.forEach(p => {
        // Find the full subject details to check type
        const subject = subjects.find(s => s.id === p.subjectId);
        if (subject) {
          if (subject.isLab || subject.type === "Lab") {
            labs.push({ subjectId: p.subjectId, rank: labs.length + 1 });
          } else {
            theory.push({ subjectId: p.subjectId, rank: theory.length + 1 });
          }
        }
      });

      setTheoryPreferences(theory);
      setLabPreferences(labs);
    }
  }, [savedPrefs, subjects]);

  const { data: settings } = useQuery<{ minPreferences: number }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const minRequired = settings?.minPreferences ?? 3;

  // Unified Save Mutation (Merges lists back together)
  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      // Merge lists: Theory first, then Labs (or interleaved, rank doesn't strictly matter for storage as long as order is preserved relative to category)
      // Actually, we should probably re-calculate global ranks or just store them. 
      // Simplified strategy: Store Theory 1-N, then Labs (N+1)-(N+M). 
      // The backend simply stores (subjectId, rank).

      const mergedPrefs = [
        ...theoryPreferences.map((p, i) => ({ subjectId: p.subjectId, rank: i + 1 })),
        ...labPreferences.map((p, i) => ({ subjectId: p.subjectId, rank: theoryPreferences.length + i + 1 }))
      ];

      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedPrefs),
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
        description: "Your theory and lab preference lists have been updated.",
      });
    }
  });

  const addToPreferences = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const isLab = subject.isLab || subject.type === "Lab";

    if (isLab) {
      if (labPreferences.some(p => p.subjectId === subjectId)) return;
      setLabPreferences([...labPreferences, { subjectId, rank: labPreferences.length + 1 }]);
    } else {
      if (theoryPreferences.some(p => p.subjectId === subjectId)) return;
      setTheoryPreferences([...theoryPreferences, { subjectId, rank: theoryPreferences.length + 1 }]);
    }

    toast({ title: "Added", description: `Added to ${isLab ? "Lab" : "Theory"} list` });
  };

  const removeFromList = (subjectId: string, isLab: boolean) => {
    if (isLab) {
      const newPrefs = labPreferences
        .filter(p => p.subjectId !== subjectId)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));
      setLabPreferences(newPrefs);
    } else {
      const newPrefs = theoryPreferences
        .filter(p => p.subjectId !== subjectId)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));
      setTheoryPreferences(newPrefs);
    }
  };

  const moveItem = (subjectId: string, direction: 'up' | 'down', isLab: boolean) => {
    const list = isLab ? [...labPreferences] : [...theoryPreferences];
    const idx = list.findIndex(p => p.subjectId === subjectId);

    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === list.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];

    // Re-rank
    const finalList = list.map((p, i) => ({ ...p, rank: i + 1 }));

    if (isLab) setLabPreferences(finalList);
    else setTheoryPreferences(finalList);
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch = 
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSemester = semesterFilter === "all" || subject.semester.toString() === semesterFilter;

      // Strict type filter + "All" logic
      let matchesType = true;
      if (typeFilter !== "all") {
        if (typeFilter === "Lab") {
           matchesType = subject.type === "Lab" || subject.isLab;
        } else {
           matchesType = subject.type === typeFilter;
        }
      }

      return matchesSearch && matchesSemester && matchesType;
    });
  }, [subjects, searchQuery, semesterFilter, typeFilter]);

  // Render a Preference List (Reusable for both)
  const renderPreferenceList = (prefs: { subjectId: string; rank: number }[], isLab: boolean) => (
    <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-2 min-h-0">
      {prefs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
          No {isLab ? "Labs" : "Theory subjects"} selected
        </div>
      ) : (
        prefs.map((pref, index) => {
          const subject = subjects.find(s => s.id === pref.subjectId);
          if (!subject) return null;
          return (
            <div key={subject.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-sm leading-none">{subject.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{subject.code}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveItem(subject.id, 'up', isLab)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveItem(subject.id, 'down', isLab)}
                  disabled={index === prefs.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeFromList(subject.id, isLab)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (loadingSubjects) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Subject Selection</h1>
            <p className="text-muted-foreground mt-1">
              Browse available subjects and create your preference lists.
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3">
            {/* THEORY LIST SHEET */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800">
                  <BookOpen className="h-4 w-4" />
                  Theory List
                  <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {theoryPreferences.length}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Theory Preferences
                  </SheetTitle>
                  <SheetDescription>
                    Rank your preferred Theory subjects in order of priority.
                  </SheetDescription>
                </SheetHeader>
                {renderPreferenceList(theoryPreferences, false)}
                <div className="pt-4 mt-auto">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => savePreferencesMutation.mutate()}
                    disabled={savePreferencesMutation.isPending}
                  >
                    Save All Preferences
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* LAB LIST SHEET */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                  <FlaskConical className="h-4 w-4" />
                  Lab List
                  <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                    {labPreferences.length}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-purple-600" />
                    Lab Preferences
                  </SheetTitle>
                  <SheetDescription>
                    Rank your preferred Laboratories in order of priority.
                  </SheetDescription>
                </SheetHeader>
                {renderPreferenceList(labPreferences, true)}
                <div className="pt-4 mt-auto">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    onClick={() => savePreferencesMutation.mutate()}
                    disabled={savePreferencesMutation.isPending}
                  >
                    Save All Preferences
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border p-4 rounded-lg flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>Sem {sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
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
              }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 rounded-xl border-2 border-dashed">
              <BookOpen className="h-10 w-10 mb-2 opacity-20" />
              <p>No subjects found matching your criteria.</p>
            </div>
          ) : (
            filteredSubjects.map((subject) => {
              const isLab = subject.isLab || subject.type === "Lab";
              const isSelected = isLab 
                ? labPreferences.some(p => p.subjectId === subject.id)
                : theoryPreferences.some(p => p.subjectId === subject.id);

              return (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onToggle={() => isSelected ? removeFromList(subject.id, isLab) : addToPreferences(subject.id)}
                  isSelected={isSelected}
                  actionLabel={isSelected ? "Remove" : (isLab ? "Add to Labs" : "Add to Theory")}
                />
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}