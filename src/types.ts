export interface Doctor {
  _id: string;
  name: string;
  clinic_name: string;
  phone: string;
  email: string;
  address: string;
  specialization: string;
  image_url: string;
  notes?: string;
  license_number?: string;
  tax_id?: string;
  preferred_contact_method?: string;
  portal_username?: string;
  created_at: number;
}

export interface DentalCase {
  _id: string;
  doctor_id: string;
  technician_id?: string;
  doctor_name?: string;
  technician_name?: string;
  patient_name?: string;
  patient_id?: string;
  case_type: string;
  material: string;
  shade: string;
  selected_teeth: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Trial' | 'Completed' | 'Delivered' | 'Returned';
  receiving_date: string;
  due_date: string;
  delivery_date?: string;
  cost: number;
  discount_amount?: number;
  tax_amount?: number;
  is_invoiced?: boolean;
  notes: string;
  image_url: string;
  preparation_type?: string;
  created_at: number;
}

export interface Technician {
  _id: string;
  name: string;
  specialization: string;
  phone: string;
  status: 'Active' | 'Inactive';
  created_at: number;
}

export interface Payment {
  _id: string;
  doctor_id: string;
  invoice_id?: string;
  doctor_name?: string;
  amount: number;
  payment_method: string;
  reference_no: string;
  payment_date: string;
  notes: string;
  created_at: number;
}

export interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  created_at: number;
}

export interface InventoryItem {
  _id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  last_updated: number;
}

export interface CaseHistory {
  _id: string;
  case_id: string;
  status: string;
  comment: string;
  updated_at: number;
}

export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Staff' | 'Doctor' | 'Manager';
  full_name?: string;
  email?: string;
  status?: 'Active' | 'Inactive';
  doctor_id?: string;
  last_login?: string;
  created_at: number;
}

export interface RateList {
  _id: string;
  case_type: string;
  material: string;
  price: number;
  created_at: number;
}

export interface Shade {
  _id: string;
  name: string;
  created_at: number;
}

export interface Invoice {
  _id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_email?: string;
  doctor_phone?: string;
  clinic_name?: string;
  address?: string;
  phone?: string;
  invoice_no: number;
  amount: number;
  total_paid?: number;
  tax_rate?: number;
  discount_rate?: number;
  notes?: string;
  status: 'Unpaid' | 'Partial' | 'Paid';
  due_date: string;
  last_reminder_sent_at?: number;
  created_at: number;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  _id: string;
  invoice_id: string;
  case_id: string;
  patient_name?: string;
  case_type?: string;
  description: string;
  amount: number;
}

export interface CaseTask {
  _id: string;
  case_id: string;
  task_name: string;
  technician_id: string;
  technician_name?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  completed_at?: number;
  created_at: number;
}

export interface Log {
  id: number;
  user_id: number;
  username?: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}
