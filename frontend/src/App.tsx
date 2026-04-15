import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas placeholder por rol
import StudentDashboard from "@/pages/student/Dashboard";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";
import Login from "@/pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Estudiante */}
        <Route path="/student" element={<StudentDashboard />} />

        {/* Docente */}
        <Route path="/teacher" element={<TeacherDashboard />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
