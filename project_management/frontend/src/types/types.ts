import React, { ReactNode } from 'react';

export type User = {
    id: string,
    email: string,
    firstName: string,
    lastName: string
}

export interface JobType {
    id: string
    myobUid: string
    po: string
    sr: string
    otherId: string
    client: ClientType
    requester: ContactType
    location: LocationType
    building: string
    title: string
    priority: string
    dateIssued: string | null
    overdueDate: string | null
    stage: string
    description: string
    detailedLocation: string
    inspectionDate: string | null
    commencementDate: string | null
    completionDate: string | null
    closeOutDate: string | null
    totalHours: number
    pocName: string
    pocPhone: string
    pocEmail: string
    altPocName: string
    altPocPhone: string
    altPocEmail: string
    specialInstructions: string
    inspectionBy: {
        id: string
        firstName?: string
    }
    inspectionNotes: string
    scope: string
    workNotes: string
    siteManager: {
        id: string
        firstName?: string
    }
    estimateSet: EstimateType[]
    invoiceSet: InvoiceType[]
    expenseSet: ExpenseType[]
    billSet: BillType[]
    opportunityType: string
    bsafeLink: string
    workType: string
    cancelled: boolean
    cancelReason: string
    jobName?: string
}

export interface EstimateType {
    id: string
    name: string
    description: string
    price: number
    issueDate: string
    approvalDate: string
    scope: string
    estimateheaderSet: EstimateHeaderType[]
    quoteBy: {
        id: number | undefined
    }
}

// Have to modify the type with optionals for table subRows
export interface EstimateHeaderType {
    id: string
    description: string
    quantity?: number
    itemType?: string
    rate?: number
    extension?: number
    markup: number
    gross: number
    estimateitemSet: EstimateItemType[]
}

export interface EstimateItemType {
    id: string
    description: string
    quantity: number
    itemType: string
    rate: number
    extension: number
    markup: number
    gross: number
    estimateitemSet: EstimateItemType[]
}

export interface RemittanceType {
    id: string
    myobUid: string
    date: string
    amount: number
    invoiceSet: InvoiceType[]
    client: ClientType
}

export interface InvoiceType {
    number: string
    dateCreated?: string
    dateIssued?: string
    amount?: number
    datePaid?: string
    job?: JobType
}

export interface BillType {
    id: string
    myobUid: string
    supplier: ContractorType
    invoiceNumber: string
    invoiceDate: string
    processDate: string
    amount: number
    billType: string
    thumbnailPath: string
    // Supplier data when extracting the bill
    abn?: string
    contractor?: string
    job?: JobType
}

export interface BillSummaryType {
    supplier: ContractorType
    amount: number
    invoiceNumber: number
    subRows: BillSummaryType[]
}

export interface ExpenseType {
    id: string
    myobUid: string
    vendor: string
    locale: string
    employee: { 
        id: string
        firstName?: string
    } 
    expenseDate: string
    amount: number
    thumbnailPath: string
    // Data when extracting the bill
    job?: JobType
    // employee?: UserType
}

export interface ExpenseSummaryType {
    vendor: string
    amount: number
    invoiceNumber: number
    subRows: ExpenseSummaryType[]
}

export interface EstimateSummaryType {
    id: string
    description: string
    quantity: number
    itemType: string
    rate: number
    extension: number
    gross: number
    header?: string
    counter?: number
    subRows?: EstimateSummaryType[]
}

export interface ContractorType {
    id: string
    myobUid: string
    name: string
    bankAccountName: string
    bankAccountNumber: string
    bsb: string
    abn: string
    contacts?: ContractorContactType[]
}

export interface ContractorContactType {
    id: string
    location: number
    contactName: string
    address: string
    locality: string
    state: string
    postcode: string
    country: string
    phone1: string
    phone2: string
    phone3: string
    fax: string
    email: string
    website: string
}

export interface JobStageType {
    name: '' | 'INS' | 'SUB' | 'APP' | 'QAR' | 'UND' | 'CLO' | 'INV' | 'BSA' | 'PAY' | 'FIN' | 'CAN' | 'PRO'
    description: ''
}

export interface EmployeeType {
    id?: string
    firstName: string
    lastName: string
    email: string
    position: string
    myobUser: {
        id: string
        username: string
    }
    myobAccess: boolean
    role: string
    isActive: boolean
}

export interface ClientType {
    id: string,
    name: string,
    displayName: string,
    abn: string
}

export interface ContactType {
    id: string
    firstName: string
    lastName: string
    position: string
    phone: string
    email: string
    client: ClientType
    region: RegionType
    active: boolean
}

export interface LocationType {
    id: string
    client: ClientType
    name: string
    address: string
    locality: string
    state: string
    postcode: string
    region: RegionType
    clientRef: string
}

export interface RegionType {
    id: string
    shortName: string
    name: string
    email: string
    billToAddress: string
}

export interface IAuth {
    user: {
        id: string;
        username: string;
        refreshToken: string;
        defaultPaginationAmount: number;
        role: string;
        company?: {
            id: string;
            name: string;
            logo: string;
        };
    },
    myob: {
        id: string;
    },
    accessToken: string;
    sidebar?: boolean;
}
    
export type AuthContextType = {
    auth?: IAuth;
    setAuth: React.Dispatch<React.SetStateAction<IAuth | undefined>>;
}

export interface AppType {
    title: string
    subTitle: string
}

export type AppContextType = {
    app?: AppType;
    setApp: React.Dispatch<React.SetStateAction<AppType | undefined>>;
}

export interface InputFieldType {
    type: string
    name?: string
    label?: string
    min?: number | string
    max?: string
    maxLength?: number
    children?: ReactNode
    multiline?: boolean
    rows?: number
    halfWidth?: boolean
    wide?: boolean
    width?: number
    error?: boolean
    noMargin?: boolean
    value?: any
    defaultValue?:any
    onChange?: (event: React.ChangeEvent<HTMLElementChange>) => void
    style?: React.CSSProperties
    step?: number
    props?: any
    onBlur?: (event: React.ChangeEvent<HTMLElementChange>) => void
    disabled?: boolean
}

export type HTMLElementChange = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export interface SnackType {
    active: boolean, 
    variant: 'error' | 'info' | 'success' | 'warning' , 
    message: string
}

export interface SnackBarType {
    snack: {
        active: boolean, 
        variant: 'error' | 'info' | 'success' | 'warning' , 
        message: string
    }
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}

export const AusStates = ['NSW','QLD','VIC','TAS','WA','SA','ACT','NT']


export interface CompanyInformationType {
    id: string
    name: string
    defaultMyobFile: {id: string}
    defaultMyobAccount: {id: string}
}

export interface InsuranceType {
    id?: string
    description: string
    issueDate: string
    startDate: string
    expiryDate: string
    active: boolean
    thumbnail: string
    filename?: string
}

export interface MYOBUserType {
    id?: string
    username: string
}

export interface MYOBCompanyFileType {
    id: string
    companyName: string
}