export type LeadStatus = 'to_call' | 'called_no_answer' | 'yes' | 'no' | 'recall';

export interface Lead {
  id: string;
  business_name: string;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'active' | 'paused' | 'completed';
export type Manager = 'Luka' | 'Samvit' | 'Both';

export interface Project {
  id: string;
  client_name: string;
  site_url: string | null;
  description: string | null;
  retainer_fee: number;
  monthly_payment: number;
  hosting_cost: number;
  manager: Manager;
  status: ProjectStatus;
  start_date: string | null;
  created_at: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type AssignedTo = 'Luka' | 'Samvit' | 'Both';

export interface Task {
  id: string;
  title: string;
  assigned_to: AssignedTo;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  project_id: string | null;
  created_at: string;
}
