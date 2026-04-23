import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings, 
  Search, 
  Plus, 
  Bell, 
  Moon, 
  ChevronDown, 
  Trash2, 
  Edit2,
  CheckCircle2,
  Clock,
  Building2,
  Camera,
  Mail,
  Lock,
  ArrowRight,
  Zap,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
}

interface Task {
  id: number;
  description: string;
  status: string;
  assigned_employee_id: number;
  employee_name?: string;
}

interface Transaction {
  id: number;
  type: 'Income' | 'Expense';
  amount: number;
  description: string;
  date: string;
  assigned_employee_id: number;
  employee_name?: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Workspace Management Pro
 * A full-stack application built with React, Express, and SQLite.
 * 
 * Features:
 * - Employee CRUD (Add, List, Edit, Delete)
 * - Task Management (List, Status toggle)
 * - Live Search for employees
 * - Persistent storage with SQLite
 */

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'tasks' | 'finance' | 'settings'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({ totalRevenue: 0, totalExpenses: 0, netProfit: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', department: '' });
  const [newTask, setNewTask] = useState({ description: '', assigned_employee_id: '' });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // --- 3. Frontend JavaScript Integration ---
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      setIsAuthenticated(false);
      setAuthToken('');
      setCurrentUser(null);
      localStorage.removeItem('auth');
      throw new Error('Session expired. Please login again.');
    }
    return response;
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem('auth');
    if (!storedAuth) return;

    try {
      const parsed = JSON.parse(storedAuth) as { token: string; user: AuthUser };
      if (parsed.token && parsed.user) {
        setAuthToken(parsed.token);
        setCurrentUser(parsed.user);
        setIsAuthenticated(true);
      }
    } catch {
      localStorage.removeItem('auth');
    }
  }, []);


  /**
   * COMMUNICATION EXPLAINED:
   * The Frontend uses the `fetch()` API (as required) to send HTTP requests to the backend.
   * 1. The Browser (Client) initiates a GET/POST/PUT request to a URL like '/api/employees'.
   * 2. The Node.js Server (Backend) listens on that port, processes the Logic/Database query.
   * 3. The Server sends back a response in JSON format.
   * 4. React (Frontend) receives the data and updates the UI state, causing a re-render.
   */

  /**
   * Load data from the database on component mount.
   * This implements the requirement for loading data from the backend.
   */
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;
    fetchEmployees();
    fetchTasks();
    fetchTransactions();
    fetchFinancialSummary();
  }, [isAuthenticated, authToken]);

  const fetchEmployees = async () => {
    try {
      const response = await apiFetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await apiFetch('/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await apiFetch('/api/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const response = await apiFetch('/api/financials/summary');
      const data = await response.json();
      setFinancialSummary(data);
    } catch (error) {
      console.error('Error fetching financial summary:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (data.success) {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('auth', JSON.stringify({ token: data.token, user: data.user }));
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (error) {
      setLoginError('Server error. Please try again.');
    }
  };

  /**
   * Add Employee form submission.
   * Connects to the backend API without reloading the page.
   */
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify(newEmployee),
      });
      if (response.ok) {
        setNewEmployee({ name: '', role: '', department: '' });
        setIsAddingEmployee(false);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
      fetchEmployees();
      fetchTasks(); // Reload tasks too since foreign keys might be affected
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  /**
   * Toggle Task Status functionality.
   * Dynamically updates the database when a status is clicked.
   */
  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const response = await apiFetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ 
          description: newTask.description,
          assigned_employee_id: parseInt(newTask.assigned_employee_id),
          status: 'Pending' 
        }),
      });
      if (response.ok) {
        setNewTask({ description: '', assigned_employee_id: '' });
        setIsAddingTask(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  /**
   * Live Search functionality.
   * Filters the employee table dynamically based on user input.
   */
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center font-sans transition-colors duration-500 overflow-hidden relative ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        {/* Ambient Atmospheric Background Shifts */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none"></div>

        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md mx-4 p-8 sm:p-10 card !bg-opacity-70 backdrop-blur-[24px] shadow-2xl"
        >
          {/* Brand Anchor Indicator */}
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shadow-xl">
              <Zap className="text-white w-8 h-8 fill-white/20" />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-main tracking-tight mb-2">Ethereal Access</h1>
            <p className="text-base text-muted">Sign in to your intelligent workspace.</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium">
              {loginError}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Work Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  required
                  type="email" 
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="block w-full pl-12 pr-4 py-3 input-field rounded-xl border-none" 
                  placeholder="name@company.com" 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-muted">Password</label>
                <a className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors" href="#">Recover</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  required
                  type="password" 
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="block w-full pl-12 pr-4 py-3 input-field rounded-xl border-none" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-br from-indigo-600 to-indigo-400 hover:shadow-indigo-500/30 transition-all duration-300 group active:scale-95"
              >
                Authenticate
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
            New to the ecosystem? 
            <a className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors ml-1" href="#">Request an invite</a>
          </div>
        </motion.main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`} style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
      
      {/* --- Sidebar (Navigation) --- */}
      <aside className={`w-64 fixed left-0 top-0 h-screen transition-colors ${isDarkMode ? 'bg-[#1e1e1e]/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-xl p-4 flex flex-col gap-6 z-50 border-r`}>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Building2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-main">Workspace</h1>
            <p className="text-xs text-muted font-medium tracking-wide">Management Pro</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'employees', label: 'Employees', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'finance', label: 'Finance', icon: Wallet },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <button 
            onClick={() => {
              setActiveTab('tasks');
              setIsAddingTask(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className={`flex-1 ml-64 min-h-screen flex flex-col ${isCompact ? 'p-4' : 'p-8'}`}>
        
        {/* --- Header --- */}
        <header className="flex justify-between items-center mb-8 bg-white/50 dark:bg-[#1e1e1e]/50 backdrop-blur-md sticky top-0 py-4 px-6 rounded-2xl border border-white/20 shadow-sm z-40">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#121212] border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-main"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Moon className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400 fill-indigo-400' : 'text-slate-500'}`} />
            </button>
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                <Bell className="w-5 h-5 text-muted" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950"></span>
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-sm font-semibold text-main">{currentUser?.name || 'Admin'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </header>

        {/* --- Content Area (Render Tabs) --- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-10">
                <div className="mb-2">
                  <h2 className="text-3xl font-bold tracking-tight text-main">Overview</h2>
                  <p className="text-muted mt-1">Summary of your current workspace metrics.</p>
                </div>
                
                {/* Financial Summary Bento Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Revenue', value: `$${financialSummary.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
                    { label: 'Total Expenses', value: `$${financialSummary.totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'rose' },
                    { label: 'Net Profit', value: `$${financialSummary.netProfit.toLocaleString()}`, icon: DollarSign, color: 'indigo' },
                  ].map((stat, i) => (
                    <div key={i} className="card p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/20 flex items-center justify-center`}>
                          <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> +12%
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted">{stat.label}</p>
                        <h3 className="text-3xl font-bold text-main">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Employees', value: employees.length, icon: Users, color: 'indigo' },
                    { label: 'Active Tasks', value: tasks.filter(t => t.status === 'Pending').length, icon: Clock, color: 'amber' },
                    { label: 'Completed Tasks', value: tasks.filter(t => t.status === 'Completed').length, icon: CheckCircle2, color: 'emerald' },
                  ].map((stat, i) => (
                    <div key={i} className="card p-6 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/20 flex items-center justify-center shrink-0`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-main">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div className="space-y-6">
                <div className="flex justify-between items-end text-main">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                    <p className="text-muted mt-1">Manage and track your team members.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingEmployee(true)}
                    className="flex items-center gap-2 py-2.5 px-6 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    Add Employee
                  </button>
                </div>

                <div className="card !p-0 overflow-hidden border border-slate-100 dark:border-slate-800">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Name</th>
                        <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Role</th>
                        <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Department</th>
                        <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-main">
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800 last:border-none group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 shadow-sm border border-white/10">
                                {emp.name.charAt(0)}
                              </div>
                              <span className="font-semibold">{emp.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-muted">{emp.role}</td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700">
                              {emp.department}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredEmployees.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-muted">No employees found matching your search.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-main">Tasks</h2>
                    <p className="text-muted mt-1">Track project progress and assignments.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-2 py-2.5 px-6 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    New Task
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tasks.map((task) => (
                    <div key={task.id} className="card flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          task.status === 'Completed' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                          {task.status}
                        </div>
                        <CheckSquare className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="font-semibold text-lg text-main">{task.description}</p>
                      <div className="flex items-center gap-2 mt-auto">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-white dark:border-slate-800">
                          {task.employee_name?.charAt(0)}
                        </div>
                        <span className="text-xs text-muted">Assigned: <span className="font-medium text-main">{task.employee_name || 'Unassigned'}</span></span>
                      </div>
                      <button 
                        onClick={() => toggleTaskStatus(task)}
                        className={`mt-4 w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                          task.status === 'Completed'
                            ? 'bg-slate-100 dark:bg-slate-800 text-muted hover:bg-amber-50 hover:text-amber-600 hover:dark:text-amber-400'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 hover:bg-emerald-50 hover:text-emerald-600 hover:dark:text-emerald-400'
                        }`}
                      >
                        {task.status === 'Completed' ? 'Mark as Pending' : 'Mark as Completed'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finance Tab */}
            {activeTab === 'finance' && (
              <div className="space-y-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-main">Financial Management</h2>
                  <p className="text-muted mt-1">Monitor revenue, expenses, and employee performance.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div className="card p-6 flex flex-col gap-4 border-l-4 border-emerald-500">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-bold text-main uppercase tracking-widest opacity-60">Total Revenue</p>
                      </div>
                      <h3 className="text-3xl font-bold text-main">${financialSummary.totalRevenue.toLocaleString()}</h3>
                   </div>
                   <div className="card p-6 flex flex-col gap-4 border-l-4 border-rose-500">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                          <TrendingDown className="w-5 h-5 text-rose-600" />
                        </div>
                        <p className="text-sm font-bold text-main uppercase tracking-widest opacity-60">Total Expenses</p>
                      </div>
                      <h3 className="text-3xl font-bold text-main">${financialSummary.totalExpenses.toLocaleString()}</h3>
                   </div>
                   <div className="card p-6 flex flex-col gap-4 border-l-4 border-indigo-500">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-sm font-bold text-main uppercase tracking-widest opacity-60">Net Profit</p>
                      </div>
                      <h3 className="text-3xl font-bold text-main">${financialSummary.netProfit.toLocaleString()}</h3>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recent Transactions Table */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-main">Recent Transactions</h3>
                    <div className="card !p-0 overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Trans.</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                            <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                          </tr>
                        </thead>
                        <tbody className="text-main">
                          {transactions.slice(0, 5).map((tx) => (
                            <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-4 px-6">
                                <p className="text-sm font-semibold">{tx.description}</p>
                                <p className="text-[10px] text-muted">{tx.type} • {tx.employee_name || 'System'}</p>
                              </td>
                              <td className="py-4 px-6 text-sm font-bold">
                                <span className={tx.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}>
                                  {tx.type === 'Income' ? '+' : '-'}${tx.amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right text-[10px] text-muted font-medium">{tx.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Employee Performance Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-main">Employee Performance</h3>
                    <div className="card space-y-6">
                      {employees.slice(0, 3).map((emp, i) => {
                        const empTransactions = transactions.filter(t => t.assigned_employee_id === emp.id);
                        const empRevenue = empTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
                        const empTasks = tasks.filter(t => t.assigned_employee_id === emp.id && t.status === 'Completed').length;
                        
                        return (
                          <div key={emp.id} className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-1">
                                <p className="font-bold text-sm text-main">{emp.name}</p>
                                <p className="text-xs font-bold text-emerald-500">${empRevenue.toLocaleString()}</p>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (empRevenue / 10000) * 100)}%` }}
                                  className="h-full bg-indigo-600 rounded-full"
                                />
                              </div>
                              <p className="text-[10px] text-muted mt-1">{empTasks} Tasks Completed</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-main">Settings</h2>
                  <p className="text-muted mt-1">Manage your personal profile and workspace preferences.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Profile Section */}
                  <div className="lg:col-span-2 card p-8 space-y-8">
                    <h3 className="text-lg font-bold border-b pb-4 border-slate-100 dark:border-slate-800 text-main">Profile Details</h3>
                    <div className="flex flex-col sm:flex-row gap-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden shadow-sm">
                          <img 
                            src="https://picsum.photos/seed/avatar/200/200" 
                            alt="Profile" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Change Photo</button>
                      </div>
                      <div className="flex-1 space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-muted">First Name</label>
                            <input type="text" defaultValue="Jane" className="w-full input-field rounded-lg px-4 py-2.5 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-muted">Last Name</label>
                            <input type="text" defaultValue="Doe" className="w-full input-field rounded-lg px-4 py-2.5 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-muted">Email Address</label>
                          <input type="email" defaultValue="jane.doe@ethereal.app" className="w-full input-field rounded-lg px-4 py-2.5 text-sm" />
                        </div>
                        <div className="space-y-1.5 opacity-60">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-muted">Role</label>
                          <input type="text" defaultValue="Super Administrator" disabled className="w-full input-field rounded-lg px-4 py-2.5 text-sm cursor-not-allowed" />
                        </div>
                        <div className="pt-4 flex justify-between items-center">
                          <button 
                            onClick={async () => {
                              try {
                                await apiFetch('/api/logout', { method: 'POST' });
                              } catch {
                                // ignore logout API errors and clear local state
                              }
                              setIsAuthenticated(false);
                              setAuthToken('');
                              setCurrentUser(null);
                              localStorage.removeItem('auth');
                            }}
                            className="px-6 py-2.5 border border-rose-200 text-rose-600 dark:border-rose-900/50 dark:text-rose-400 rounded-xl font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-95"
                          >
                            Logout
                          </button>
                          <button className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95">Save Changes</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appearance Section */}
                  <div className="space-y-6">
                    <div className="card p-8 space-y-6 h-fit">
                      <h3 className="text-lg font-bold border-b pb-4 border-slate-100 dark:border-slate-800">Appearance</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 input-field rounded-xl border-none">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                              <Moon className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Dark Mode</p>
                              <p className="text-[10px] text-muted">Toggle theme</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`w-11 h-6 rounded-full relative transition-all ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`}></span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 input-field rounded-xl border-none">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Compact UI</p>
                              <p className="text-[10px] text-muted">Reduce padding</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsCompact(!isCompact)}
                            className={`w-11 h-6 rounded-full relative transition-all ${isCompact ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isCompact ? 'right-1' : 'left-1'}`}></span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* --- Add Employee Modal --- */}
      <AnimatePresence>
        {isAddingEmployee && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold italic border-l-4 border-indigo-600 pl-4 text-main">Add New Employee</h3>
                <button onClick={() => setIsAddingEmployee(false)} className="text-muted hover:text-main transition-colors">
                  <ChevronDown className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    placeholder="e.g. Jane Smith" 
                    className="w-full input-field rounded-xl px-4 py-3 text-sm" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Role</label>
                    <input 
                      required 
                      type="text" 
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                      placeholder="e.g. Developer" 
                      className="w-full input-field rounded-xl px-4 py-3 text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Dept.</label>
                    <input 
                      required 
                      type="text" 
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      placeholder="e.g. IT" 
                      className="w-full input-field rounded-xl px-4 py-3 text-sm" 
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddingEmployee(false)}
                    className="flex-1 py-3 border border-border-color rounded-xl font-bold text-muted hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                  >
                    Confirm Add
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Add Task Modal --- */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold italic border-l-4 border-indigo-600 pl-4 text-main">Create New Project</h3>
                <button onClick={() => setIsAddingTask(false)} className="text-muted hover:text-main transition-colors">
                  <ChevronDown className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Task Description</label>
                  <textarea 
                    required 
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="What needs to be done?" 
                    className="w-full input-field rounded-xl px-4 py-3 text-sm min-h-[100px] resize-none" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Assign To</label>
                  <select 
                    required 
                    value={newTask.assigned_employee_id}
                    onChange={(e) => setNewTask({...newTask, assigned_employee_id: e.target.value})}
                    className="w-full input-field rounded-xl px-4 py-3 text-sm appearance-none"
                  >
                    <option value="" disabled>Select an employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="flex-1 py-3 border border-border-color rounded-xl font-bold text-muted hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

