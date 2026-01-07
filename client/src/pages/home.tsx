import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { BookOpen, CheckCircle, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  type: string;
  credits: number;
}

interface Allocation {
  id: string;
  subject: Subject;
  createdAt: string;
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (user?.role === "admin" && !isRedirecting) {
      setIsRedirecting(true);
      setLocation("/admin");
    }
  }, [user, setLocation, isRedirecting]);

  const { data: allocations = [] } = useQuery<Allocation[]>({
    queryKey: ["allocations", "my"],
    queryFn: async () => {
      const response = await fetch("/api/allocations/my", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch allocations");
      return response.json();
    },
    enabled: !!user && user.role === "faculty",
  });

  if (isRedirecting) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back, {user?.name.split(' ')[0] || "Faculty"}</h1>
          <p className="text-muted-foreground mt-2">Here is an overview of the ongoing subject allotment process for the upcoming academic session.</p>
        </div>

        {/* Live Allotment Section */}
        {user?.role === "faculty" && allocations.length > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg text-green-800">Your Allotted Subjects</CardTitle>
              </div>
              <CardDescription className="text-green-700">
                The administration has finalized the following allotments for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allocations.map((allocation) => (
                  <div 
                    key={allocation.id} 
                    className="bg-white p-4 rounded-lg border border-green-100 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase">
                          {allocation.subject.code}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Sem {allocation.subject.semester}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm line-clamp-2">{allocation.subject.name}</h4>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{allocation.subject.type}</span>
                      <span className="font-medium">{allocation.subject.credits} Credits</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Round</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Round 1</div>
              <p className="text-xs text-muted-foreground mt-1">Counseling in progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selection Limit</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3 Subjects</div>
              <p className="text-xs text-muted-foreground mt-1">Maximum allotment per faculty</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">52</div>
              <p className="text-xs text-muted-foreground mt-1">Available across 8 semesters</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-primary/5 rounded-xl p-8 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-primary">Ready to choose your subjects?</h2>
            <p className="text-muted-foreground max-w-lg">
              Please select up to 3 subjects you would like to teach for the upcoming semester. Ensure you review the syllabus and credit requirements.
            </p>
          </div>
          <Link href="/allotment">
            <Button size="lg" className="shrink-0">
              Go to Allotment <BookOpen className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
