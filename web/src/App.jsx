import { createContext, useContext, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { loadSession, saveSession } from './api.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import AshaHome from './pages/asha/AshaHome.jsx';
import RegisterPatient from './pages/asha/RegisterPatient.jsx';
import NewVisit from './pages/asha/NewVisit.jsx';
import Worklist from './pages/Worklist.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Referrals from './pages/Referrals.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

export default function App() {
  const [session, setSession] = useState(loadSession);
  const update = (s) => {
    saveSession(s);
    setSession(s);
  };

  if (!session) {
    return (
      <SessionContext.Provider value={{ session, setSession: update }}>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </SessionContext.Provider>
    );
  }

  const role = session.user.role;
  return (
    <SessionContext.Provider value={{ session, user: session.user, setSession: update }}>
      <Layout>
        <Routes>
          {role === 'asha' && (
            <>
              <Route path="/" element={<AshaHome />} />
              <Route path="/register" element={<RegisterPatient />} />
              <Route path="/visit/:patientId" element={<NewVisit />} />
            </>
          )}
          {role === 'doctor' && (
            <>
              <Route path="/" element={<Worklist />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/referrals" element={<Referrals />} />
            </>
          )}
          {role === 'admin' && (
            <>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/patients" element={<Worklist />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/referrals" element={<Referrals />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </SessionContext.Provider>
  );
}
