import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle2, AlertCircle, Play, RotateCcw, Trash2, Plus, Edit2, GripVertical, Save, Settings, Download, Search } from "lucide-react";
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
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reorder } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";

import { createPortal } from "react-dom";

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
      credits: number;
      type: string;
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
  rawAllocations?: any[];
}

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  type: string;
  credits: number;
  description: string;
  sections?: number;
}

const SUBJECT_TYPES = ["Core", "Elective", "Lab", "Project", "Internship"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const addUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 chars"),
  password: z.string().min(6, "Password must be at least 6 chars"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  designation: z.string().optional(),
});

function FacultyManagement() {
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: "", username: "", password: "", email: "", designation: "" }
  });

  const { data: fetchedFaculty, refetch } = useQuery({
    queryKey: ["admin-faculty"],
    queryFn: async () => {
      const res = await fetch("/api/admin/faculty");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  useEffect(() => {
    if (fetchedFaculty) setFaculty(fetchedFaculty);
  }, [fetchedFaculty]);

  const handleReorder = (newOrder: any[]) => {
    setFaculty(newOrder);
  };

  const saveOrder = async () => {
    try {
      const updates = faculty.map((f, index) => ({
        id: f.id,
        seniority: index + 1
      }));

      const res = await fetch("/api/admin/faculty/seniority", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error();

      toast({ title: "Success", description: "Seniority order updated successfully" });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove all their allocations.")) return;
    try {
      await fetch(`/api/admin/faculty/${id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Faculty member removed" });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const onSubmit = async (values: z.infer<typeof addUserSchema>) => {
    try {
      const res = await fetch("/api/admin/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }

      toast({ title: "Success", description: "Faculty member added" });
      setIsDialogOpen(false);
      form.reset();
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to add faculty", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Faculty Seniority Management</h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop to rearrange seniority (Top = Most Senior). 
            Click "Save Order" to apply.
          </p>
        </div>
        <div className="flex gap-2">
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Faculty</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Faculty</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="faculty@example.com" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="designation" render={({ field }) => (
                    <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="e.g. Assistant Professor" {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="submit" className="w-full">Create Account</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button variant="default" onClick={saveOrder}><Save className="mr-2 h-4 w-4" /> Save Order</Button>
        </div>
      </div>

      <div className="border rounded-lg bg-card p-4">
        <Reorder.Group axis="y" values={faculty} onReorder={handleReorder} className="space-y-2">
          {faculty.map((f) => (
            <Reorder.Item key={f.id} value={f}>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-background hover:bg-accent/50 transition-colors">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <div className="flex-1">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.designation || "Faculty"} • @{f.username}</p>
                  {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                </div>
                <div className="text-sm text-muted-foreground mr-4">
                  Rank: {f.seniority || "N/A"}
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
    </div>
  );
}

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
    sections: "1",
  });

  const [minPreferences, setMinPreferences] = useState(7);

  // NEW: State for Search and Filter
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState("all");

  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/allotment");
    }
  }, [user, setLocation]);

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  useEffect(() => {
    if (settings?.minPreferences) {
      setMinPreferences(settings.minPreferences);
    }
  }, [settings]);

  // --- DOWNLOAD CSV FUNCTION ---
  const downloadCSV = () => {
    if (!analytics?.facultyAllocations) {
      toast({ title: "No Data", description: "There is no allocation data to export yet.", variant: "destructive" });
      return;
    }

    const headers = ["Faculty Name", "Username", "Subject Code", "Subject Name", "Semester", "Credits", "Type"];
    const rows = [];

    rows.push(headers.join(","));

    analytics.facultyAllocations.forEach(allocation => {
      const facultyName = `"${allocation.user.name}"`; 
      const username = allocation.user.username;

      allocation.subjects.forEach(subject => {
        const row = [
          facultyName,
          username,
          subject.code,
          `"${subject.name}"`, 
          subject.semester,
          subject.credits || 0,
          subject.type || ""
        ];
        rows.push(row.join(","));
      });
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "faculty_allocation_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Downloaded", description: "Report exported successfully." });
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (val: number) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minPreferences: val })
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Updated", description: "System settings updated successfully." });
      queryClient.setQueryData(["admin-settings"], data);
      setMinPreferences(data.minPreferences);
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update settings", variant: "destructive" })
  });

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
        title: data.isRound2 ? "Round 2 Completed" : "Round 1 Completed",
        description: data.isRound2 
          ? `Successfully completed the second round.`
          : `Successfully completed Round 1.`,
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
        sections: "1",
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
      sections: parseInt(formData.sections) || 1,
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
      sections: parseInt(formData.sections) || 1,
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
      sections: (subject.sections || 1).toString(),
    });
    setIsEditDialogOpen(true);
  };

  // FILTERED SUBJECTS LOGIC
  const filteredSubjects = subjectsList.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                          subject.code.toLowerCase().includes(subjectSearch.toLowerCase());

    const matchesSem = subjectSemesterFilter === "all" || subject.semester.toString() === subjectSemesterFilter;

    return matchesSearch && matchesSem;
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
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage subjects, allocations and faculty</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {document.getElementById("sidebar-tabs-portal") && createPortal(
                <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 gap-1">
                  <TabsTrigger 
                    value="overview" 
                    className="w-full justify-start gap-3 px-3 py-2 h-9 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground bg-transparent border-none shadow-none"
                  >
                    <Settings className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="faculty"
                    className="w-full justify-start gap-3 px-3 py-2 h-9 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground bg-transparent border-none shadow-none"
                  >
                    <Users className="h-4 w-4" />
                    Faculty
                  </TabsTrigger>
                  <TabsTrigger 
                    value="subjects"
                    className="w-full justify-start gap-3 px-3 py-2 h-9 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground bg-transparent border-none shadow-none"
                  >
                    <BookOpen className="h-4 w-4" />
                    Subjects
                  </TabsTrigger>
                </TabsList>,
                document.getElementById("sidebar-tabs-portal")!
              )}

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={downloadCSV}
                  className="flex items-center gap-2 h-9"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => {
                    if(confirm("Are you sure you want to reset ALL faculty preferences and allotments? This will start a completely fresh round.")) {
                      resetSystemMutation.mutate();
                    }
                  }}
                  disabled={resetSystemMutation.isPending}
                  className="flex items-center gap-2 h-9 border-destructive text-destructive hover:bg-destructive hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset All
                </Button>
                <Button 
                  onClick={() => runAllotmentMutation.mutate()} 
                  disabled={runAllotmentMutation.isPending}
                  className="flex items-center gap-2 h-9"
                >
                  <Play className="h-4 w-4" />
                  {runAllotmentMutation.isPending 
                    ? "Running..." 
                    : analytics?.totalAllocations === 0 
                      ? "Run Round 1" 
                      : "Run Round 2"}
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">System Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground">Global settings for the allocation algorithm</p>
                </div>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-end gap-4 max-w-sm">
                  <div className="grid gap-1.5 w-full">
                    <Label htmlFor="minPrefs">Minimum Required Preferences (Faculty)</Label>
                    <Input 
                      id="minPrefs" 
                      type="number" 
                      min={3} 
                      max={20}
                      value={minPreferences}
                      onChange={(e) => setMinPreferences(parseInt(e.target.value))}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                      Faculty must select at least this many subjects.
                    </p>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={() => updateSettingsMutation.mutate(minPreferences)}
                    disabled={updateSettingsMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSubjects}</div>
                  <p className="text-xs text-muted-foreground">Across all semesters</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Final Allotments</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalAllocations}</div>
                  <p className="text-xs text-muted-foreground">Processed by algorithm</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Faculty Submitted</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalFaculty}</div>
                  <p className="text-xs text-muted-foreground">Have saved preferences</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unallocated Subjects</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{analytics.unallocatedSubjects}</div>
                  <p className="text-xs text-muted-foreground">Need allocation</p>
                </CardContent>
              </Card>
            </div>

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
          </TabsContent>

          <TabsContent value="faculty">
             <FacultyManagement />
          </TabsContent>

          <TabsContent value="subjects">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Subject Management</CardTitle>
                  <p className="text-sm text-muted-foreground">Add, edit, or remove subjects</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Subject
                </Button>
              </CardHeader>

              <div className="px-6 pb-2">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or code..."
                      className="pl-9"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                    />
                  </div>

                  <div className="w-full sm:w-[180px]">
                    <Select value={subjectSemesterFilter} onValueChange={setSubjectSemesterFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {SEMESTERS.map(s => (
                          <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <CardContent>
                {filteredSubjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {subjectsList.length === 0 
                      ? "No subjects yet. Click \"Add Subject\" to create one."
                      : "No subjects match your filters."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSubjects.map((subject) => (
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
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">Sections: {subject.sections || 1}</span>
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
          </TabsContent>
        </Tabs>
      </div>

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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="sections">Sections</Label>
                <Input
                  id="sections"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1"
                  value={formData.sections}
                  onChange={(e) => setFormData({...formData, sections: e.target.value})}
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="edit-sections">Sections</Label>
                <Input
                  id="edit-sections"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.sections}
                  onChange={(e) => setFormData({...formData, sections: e.target.value})}
                />
              </div>
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
