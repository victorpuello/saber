import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas placeholder por rol
import StudentDashboard from "@/pages/student/Dashboard";
import StudentDiagnosticPage from "@/pages/student/Diagnostic";
import DiagnosticSession from "@/pages/student/DiagnosticSession";
import StudentLayout from "@/pages/student/StudentLayout";
import StudentPlanPage from "@/pages/student/Plan";
import StudentResultsPage from "@/pages/student/Results";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminQuestionBank from "@/pages/admin/QuestionBank";
import AdminSettings from "@/pages/admin/Settings";
import AdminStudents from "@/pages/admin/Students";
import AdminExams from "@/pages/admin/Exams";
import AdminLayout from "@/pages/admin/AdminLayout";
import StudentExams from "@/pages/student/Exams";
import ExamSession from "@/pages/student/ExamSession";
import ExamResults from "@/pages/student/ExamResults";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import LegalTerms from "@/pages/LegalTerms";
import LegalPrivacy from "@/pages/LegalPrivacy";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/legal/terms" element={<LegalTerms />} />
          <Route path="/legal/privacy" element={<LegalPrivacy />} />

          {/* Estudiante */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute roles={["STUDENT", "TEACHER", "ADMIN"]}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="diagnostico" element={<StudentDiagnosticPage />} />
            <Route path="diagnostico/iniciar" element={<DiagnosticSession />} />
            <Route path="plan" element={<StudentPlanPage />} />
            <Route path="resultados" element={<StudentResultsPage />} />
            <Route path="examenes" element={<StudentExams />} />
            <Route path="examenes/sesion/:examId" element={<ExamSession />} />
            <Route path="examenes/resultados/:sessionId" element={<ExamResults />} />
          </Route>

          {/* Docente */}
          <Route path="/teacher" element={<ProtectedRoute roles={["TEACHER","ADMIN"]}><TeacherDashboard /></ProtectedRoute>} />

          {/* Admin */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="preguntas" element={<AdminQuestionBank />} />
            <Route path="estudiantes" element={<AdminStudents />} />
            <Route path="configuracion" element={<AdminSettings />} />
            <Route path="examenes" element={<AdminExams />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
