import React, { ReactNode } from 'react';

export type User = {
    id: Number,
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
    }
    inspectionNotes: string
    scope: string
    workNotes: string
    siteManager: {
        id: string
    }
    estimateSet: EstimateType[]
    invoiceSet: InvoiceType[]
    billSet: BillType[]
    opportunityType: string
    bsafeLink: string
    workType: string
    cancelled: boolean
    cancelReason: string

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
    dateCreated: string
    dateIssued: string
    amount?: number
    datePaid: string
    job?: JobType
}

export interface BillType {
    id: string
    myobUid: string
    supplier: ContractorType
    invoiceNumber: string
    invoiceDate: string
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
    displayName: string
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
        defaultPaginationAmount: Number;
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
    sidebar: Boolean;
}
    
export type AuthContextType = {
    auth?: IAuth;
    setAuth: (auth: IAuth) => void;
}

export interface AppType {
    title: string
    subTitle: string
}

export type AppContextType = {
    app?: AppType;
    setApp: (app: any) => void;
}

export interface InputFieldType {
    type: string
    name?: string
    label?: string
    min?: number
    max?: string
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