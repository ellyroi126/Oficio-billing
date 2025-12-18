// Client types
export interface ClientFormData {
  clientName: string
  address: string
  email: string
  mobile: string
  rentalRate: number
  vatInclusive: boolean
  rentalTerms: string
  startDate: string
  endDate: string
  contacts: ClientContactFormData[]
}

export interface ClientContactFormData {
  contactPerson: string
  contactPosition: string
  email: string
  mobile: string
  isPrimary: boolean
}

// Excel upload types
export interface ExcelClientRow {
  ClientName: string
  ContactPerson: string
  Address: string
  Email: string
  Mobile: string
  'ContactPerson\'s Position': string
  RentalRate: number
  'VAT(Inclusive/Exclusive)': 'Y' | 'N'
  RentalTerms: string
  StartDate: string | Date
  EndDate?: string | Date
}

// Company types
export interface CompanyFormData {
  name: string
  contactPerson: string
  contactPosition: string
  address: string
  email: string
  mobile: string
  plan: string
  rentalTerms: string
  leaseInclusions: string
}

// Contract types
export interface ContractFormData {
  clientId: string
  startDate: string
  endDate: string
}

// Invoice types
export interface InvoiceFormData {
  clientId: string
  amount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
}

// Payment types
export interface PaymentFormData {
  clientId: string
  invoiceId?: string
  amount: number
  paymentDate: string
  paymentMethod?: string
  referenceNumber?: string
  remarks?: string
}

// Dashboard stats
export interface DashboardStats {
  totalClients: number
  activeContracts: number
  pendingInvoices: number
  monthlyRevenue: number
  expiringContracts: number
  overduePayments: number
}
