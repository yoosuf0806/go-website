import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Sales } from './pages/Sales'
import { AdSpend } from './pages/AdSpend'
import { Purchasing } from './pages/Purchasing'
import { Expenses } from './pages/Expenses'
import { IncomeStatement } from './pages/IncomeStatement'
import { Costing } from './pages/Costing'
import { Pipeline } from './pages/Pipeline'
import { Shares } from './pages/Shares'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-10 text-cocoa-400">Loading…</div>
  if (!session) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="ad-spend" element={<AdSpend />} />
        <Route path="purchasing" element={<Purchasing />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="income" element={<IncomeStatement />} />
        <Route path="costing" element={<Costing />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="shares" element={<Shares />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}
