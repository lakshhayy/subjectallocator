import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle2, AlertCircle, Play, RotateCcw, Trash2, Plus, Edit2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Analytics {
  totalSubjects: number;
  totalAllocations: number;
  totalFaculty: number;
  totalPreferences?: number;
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
      allocationId: string;
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
      allocationId: string;
    }>;
  }>;
  facultyPreferences: Array<{
    user: {
      id: string;
      name: string;
      username: string;
    };
    preferences: Array<{
      id: string;
      name: string;
      code: string;
      semester: number;
    }>;
  }>;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  type: string;
  credits: number;
  description: string;
}

const SUBJECT_TYPES = ["Core", "Elective", "Lab", "Project", "Internship"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    semester: "3",
    type: "Core",
    credits: "4",
    description: "",
  });

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

  const addSubjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/subjects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add subject");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      setIsAddDialogOpen(false);
      setFormData({
        code: "",
        name: "",
        semester: "3",
        type: "Core",
        credits: "4",
        description: "",
      });
      toast({
        title: "Success",
        description: "Subject added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add subject.",
        variant: "destructive",
      });
    },
  });

  const editSubjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/subjects/${editingSubject?.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update subject");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      setIsEditDialogOpen(false);
      setEditingSubject(null);
      toast({
        title: "Success",
        description: "Subject updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subject.",
        variant: "destructive",
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/subjects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete subject");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      toast({
        title: "Success",
        description: "Subject deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete subject.",
        variant: "destructive",
      });
    },
  });

  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const data = await response.json();
      
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

  const { data: subjectsList = [] } = useQuery<Subject[]>({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch subjects");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const handleAddSubject = () => {
    addSubjectMutation.mutate({
      code: formData.code,
      name: formData.name,
      semester: parseInt(formData.semester),
      type: formData.type,
      credits: parseInt(formData.credits),
      description: formData.description,
    });
  };

  const handleEditSubject = () => {
    editSubjectMutation.mutate({
      code: formData.code,
      name: formData.name,
      semester: parseInt(formData.semester),
      type: formData.type,
      credits: parseInt(formData.credits),
      description: formData.description,
    });
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      semester: subject.semester.toString(),
      type: subject.type,
      credits: subject.credits.toString(),
      description: subject.description,
    });
    setIsEditDialogOpen(true);
  };

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
            <p className="text-muted-foreground mt-1">Manage subjects, allocations and faculty preferences</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
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
              <CardTitle className="text-sm font-medium">Final Allotments</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-allocations">{analytics.totalAllocations}</div>
              <p className="text-xs text-muted-foreground">Processed by algorithm</p>
            </CardContent>
          </Card>

          <Card data-testid="card-faculty-participated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faculty Submitted</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-faculty-participated">{analytics.totalFaculty}</div>
              <p className="text-xs text-muted-foreground">Have saved preferences</p>
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

        {/* Subject Management */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Management</CardTitle>
            <p className="text-sm text-muted-foreground">Add, edit, or remove subjects from the system</p>
          </CardHeader>
          <CardContent>
            {subjectsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects yet. Click "Add Subject" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {subjectsList.map((subject) => (
                  <div 
                    key={subject.id} 
                    className="border rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-semibold">{subject.code}</h3>
                        <p className="text-sm text-muted-foreground">Semester {subject.semester}</p>
                      </div>
                      <p className="text-sm mt-1">{subject.name}</p>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded">{subject.type}</span>
                        <span className="bg-muted px-2 py-1 rounded">{subject.credits} credits</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{subject.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(subject)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this subject?")) {
                            deleteSubjectMutation.mutate(subject.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Faculty Selections */}
        <Card>
          <CardHeader>
            <CardTitle>Current Faculty Selections (Live)</CardTitle>
            <p className="text-sm text-muted-foreground">Real-time preferences submitted by faculty members (Pre-Allotment)</p>
          </CardHeader>
          <CardContent>
            {analytics.facultyPreferences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No selections made yet
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.facultyPreferences.filter(fp => fp.preferences.length > 0).map((fp) => (
                  <div 
                    key={fp.user.id} 
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{fp.user.name}</h3>
                        <p className="text-sm text-muted-foreground">@{fp.user.username}</p>
                      </div>
                      <div className="text-sm font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                        {fp.preferences.length} preferences saved
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fp.preferences.map((subject, idx) => (
                        <div 
                          key={subject.id} 
                          className="text-xs bg-muted border border-input px-2 py-1 rounded flex items-center gap-2"
                        >
                          <span className="font-bold text-primary">#{idx + 1}</span>
                          <span>{subject.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faculty Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Faculty Allocations (Final)</CardTitle>
            <p className="text-sm text-muted-foreground">Subjects allotted by the algorithm</p>
          </CardHeader>
          <CardContent>
            {analytics.facultyAllocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No allocations yet. Run the allotment round to process selections.
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
                        {allocation.subjects.length} allotted
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

        {/* Subject wise Mapping */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Faculty Mapping (Final)</CardTitle>
            <p className="text-sm text-muted-foreground">Which faculty members are allotted to each subject</p>
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

      {/* Add Subject Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>Create a new subject for the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Subject Code</Label>
              <Input
                id="code"
                placeholder="e.g., CSE 301"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="name">Subject Name</Label>
              <Input
                id="name"
                placeholder="e.g., Machine Learning"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map(s => (
                      <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                max="10"
                value={formData.credits}
                onChange={(e) => setFormData({...formData, credits: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the subject"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubject} disabled={addSubjectMutation.isPending}>
              {addSubjectMutation.isPending ? "Adding..." : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Update subject details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-code">Subject Code</Label>
              <Input
                id="edit-code"
                placeholder="e.g., CSE 301"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Subject Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Machine Learning"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-semester">Semester</Label>
                <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map(s => (
                      <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-credits">Credits</Label>
              <Input
                id="edit-credits"
                type="number"
                min="1"
                max="10"
                value={formData.credits}
                onChange={(e) => setFormData({...formData, credits: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                placeholder="Brief description of the subject"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubject} disabled={editSubjectMutation.isPending}>
              {editSubjectMutation.isPending ? "Updating..." : "Update Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
