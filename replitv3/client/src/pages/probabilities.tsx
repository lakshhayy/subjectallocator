import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";

interface SubjectWithProbability {
  id: string;
  code: string;
  name: string;
  credits: number;
  type: string;
  probabilityScore: number;
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk";
  recommendation: "Highly Likely" | "Likely" | "Unlikely";
}

export default function ProbabilitiesPage() {
  const { user } = useAuth();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subject-probabilities"],
    queryFn: async () => {
      const response = await fetch("/api/subjects/probabilities", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch probabilities");
      return response.json();
    },
  });

  const getColorClass = (score: number) => {
    if (score >= 70) return "border-l-4 border-l-green-500 bg-green-50";
    if (score >= 40) return "border-l-4 border-l-yellow-500 bg-yellow-50";
    return "border-l-4 border-l-red-500 bg-red-50";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "Low Risk") return "bg-green-100 text-green-800";
    if (risk === "Medium Risk") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Analyzing probabilities...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subject Probability Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Based on your specialization and load history, here's your likelihood of getting each subject
          </p>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <span className="text-sm">70%+ Likely</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-yellow-500 rounded"></div>
            <span className="text-sm">40-69% Possible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-red-500 rounded"></div>
            <span className="text-sm">Below 40% Unlikely</span>
          </div>
        </div>

        {/* Subject Cards */}
        <div className="space-y-3">
          {subjects.map((subject: SubjectWithProbability) => (
            <div
              key={subject.id}
              className={`p-4 rounded-lg transition ${getColorClass(subject.probabilityScore)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg">{subject.code}</h3>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                      {subject.type}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{subject.name}</p>

                  {/* Probability Bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition ${
                          subject.probabilityScore >= 70
                            ? "bg-green-500"
                            : subject.probabilityScore >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${subject.probabilityScore}%` }}
                      ></div>
                    </div>
                    <span className={`text-xl font-bold min-w-12 ${getScoreColor(subject.probabilityScore)}`}>
                      {subject.probabilityScore}%
                    </span>
                  </div>
                </div>

                {/* Right side: Risk and Recommendation */}
                <div className="ml-4 text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getRiskColor(subject.riskLevel)}`}>
                    {subject.riskLevel}
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {subject.recommendation === "Highly Likely" && "🎯"}
                    {subject.recommendation === "Likely" && "⚠️"}
                    {subject.recommendation === "Unlikely" && "❌"}
                    {" " + subject.recommendation}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                {subject.probabilityScore >= 70
                  ? "✓ Based on your history, you're well-positioned for this subject."
                  : subject.probabilityScore >= 40
                  ? "⚠ Moderate chances. Consider alternative options too."
                  : "✗ This subject is outside your current specialization area."}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendation Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 Recommendation</h3>
          <p className="text-sm text-blue-800">
            Focus on subjects with 70%+ probability first. These align with your expertise and load history.
            For subjects below 40%, you might need to build additional skills or negotiate with administration.
          </p>
        </div>
      </div>
    </Layout>
  );
}
