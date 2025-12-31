import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle2, AlertCircle, Play, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Analytics {
  totalSubjects: number;
  totalAllocations: number;
  totalFaculty: number;
  unallocatedSubjects: number;
  facultyAllocations: Array<{
    user: {
      id: string;
      name: string;
      username: string;
    };
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      semester: number;
      allocationId: string; // Added to help with deletion
    }>;
  }>;
  subjectAllocations: Array<{
    subject: {
      id: string;
      name: string;
      code: string;
      semester: number;
    };
    faculty: Array<{
      id: string;
      name: string;
      username: string;
      allocationId: string; // Added to help with deletion
    }>;
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/allotment");
    }
  }, [user, setLocation]);

  const runAllotmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/run-allotment", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to run allotment");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast({
        title: "Allotment Completed",
        description: `Successfully allocated subjects for ${data.count} faculty members.`,
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

  const resetSystemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/reset-system", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset system");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast({
        title: "System Reset",
        description: "All allotments have been cleared and the round has been restarted.",
      });
    },
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/allocations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete allocation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast({
        title: "Success",
        description: "Allocation removed successfully.",
      });
    },
  });

  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const data = await response.json();
      
      // Map allocation IDs for deletion
      const enhancedData = {
        ...data,
        facultyAllocations: data.facultyAllocations.map((fa: any) => ({
          ...fa,
          subjects: fa.subjects.map((s: any) => ({
            ...s,
            allocationId: data.rawAllocations?.find((a: any) => a.userId === fa.user.id && a.subjectId === s.id)?.id
          }))
        }))
      };
      return enhancedData;
    },
    enabled: user?.role === "admin",
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of subject allocations and faculty preferences</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                if(confirm("Are you sure you want to reset all allotments and restart the round?")) {
                  resetSystemMutation.mutate();
                }
              }}
              disabled={resetSystemMutation.isPending}
              className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Round
            </Button>
            <Button 
              onClick={() => runAllotmentMutation.mutate()} 
              disabled={runAllotmentMutation.isPending}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {runAllotmentMutation.isPending ? "Running Algorithm..." : "Run Allotment Round"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-subjects">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-subjects">{analytics.totalSubjects}</div>
              <p className="text-xs text-muted-foreground">Across all semesters</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-allocations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-allocations">{analytics.totalAllocations}</div>
              <p className="text-xs text-muted-foreground">Subject selections made</p>
            </CardContent>
          </Card>

          <Card data-testid="card-faculty-participated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faculty Participated</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-faculty-participated">{analytics.totalFaculty}</div>
              <p className="text-xs text-muted-foreground">Have made selections</p>
            </CardContent>
          </Card>

          <Card data-testid="card-unallocated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unallocated Subjects</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-unallocated">{analytics.unallocatedSubjects}</div>
              <p className="text-xs text-muted-foreground">Need allocation</p>
            </CardContent>
          </Card>
        </div>

        {/* Faculty Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Faculty Allocations</CardTitle>
            <p className="text-sm text-muted-foreground">Subject preferences by faculty members</p>
          </CardHeader>
          <CardContent>
            {analytics.facultyAllocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No allocations yet
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.facultyAllocations.map((allocation) => (
                  <div 
                    key={allocation.user.id} 
                    className="border rounded-lg p-4"
                    data-testid={`faculty-allocation-${allocation.user.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{allocation.user.name}</h3>
                        <p className="text-sm text-muted-foreground">@{allocation.user.username}</p>
                      </div>
                      <div className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {allocation.subjects.length}/3 selected
                      </div>
                    </div>
                    <div className="space-y-2">
                      {allocation.subjects.map((subject) => (
                        <div 
                          key={subject.id} 
                          className="flex items-center justify-between text-sm bg-muted p-2 rounded"
                          data-testid={`subject-${subject.id}`}
                        >
                          <div>
                            <span className="font-medium">{subject.code}</span> - {subject.name}
                            <span className="text-muted-foreground ml-2">(Sem {subject.semester})</span>
                          </div>
                          {subject.allocationId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if(confirm("Unallot this subject?")) {
                                  deleteAllocationMutation.mutate(subject.allocationId);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Faculty Mapping</CardTitle>
            <p className="text-sm text-muted-foreground">Which faculty members chose each subject</p>
          </CardHeader>
          <CardContent>
            {analytics.subjectAllocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No allocations yet
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.subjectAllocations.map((allocation) => (
                  <div 
                    key={allocation.subject.id} 
                    className="border rounded-lg p-4"
                    data-testid={`subject-allocation-${allocation.subject.id}`}
                  >
                    <div className="mb-3">
                      <h3 className="font-medium">{allocation.subject.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {allocation.subject.code} • Semester {allocation.subject.semester} • {allocation.faculty.length} faculty
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allocation.faculty.map((faculty) => (
                        <div 
                          key={faculty.id} 
                          className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full"
                          data-testid={`faculty-${faculty.id}`}
                        >
                          {faculty.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
