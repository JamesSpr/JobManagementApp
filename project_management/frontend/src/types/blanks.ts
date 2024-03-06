import { ClientType, ContactType, ContractorType, ContractorContactType, InvoiceType, JobType, LocationType, RegionType } from "./types"

export const blankClient: ClientType = {
    id: '',
    name: '',
    displayName: '',
    abn: ''
}

export const blankRegion: RegionType = {
    id: '',
    shortName: '',
    name: '',
    email: '',
    billToAddress: '',
}

export const blankContact: ContactType = {
    id: '',
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    email: '',
    client: blankClient,
    region: blankRegion,
    active: true
}

export const blankLocation: LocationType = {
    id: '',
    client: blankClient,
    name: '',
    address: '',
    locality: '',
    state: '',
    postcode: '',
    region: blankRegion,
    clientRef: '',
}

export const blankInvoice: InvoiceType = {
    number: '',
    dateCreated: '',
    dateIssued: '',
    datePaid: '',
}

export const blankJob: JobType = {
    myobUid: '',
    id: '',
    po: '',
    sr: '',
    otherId: '',
    client: blankClient,
    location: blankLocation,
    requester: blankContact,
    building: '',
    detailedLocation: '',
    stage: '',
    title: '',
    priority: '',
    dateIssued: '',
    pocName: '',
    pocPhone: '',
    pocEmail: '',
    altPocName: '',
    altPocPhone: '',
    altPocEmail: '',
    description: '',
    specialInstructions: '',
    inspectionBy: {
        id: '',
    },
    inspectionDate: '',
    inspectionNotes: '',
    scope: '',
    workNotes: '',
    siteManager: {
        id: '',
    },
    commencementDate: '',
    completionDate: '',
    totalHours: 0,
    bsafeLink: '',
    overdueDate: '',
    closeOutDate: '',
    workType: '',
    opportunityType: '',
    cancelled: false,
    cancelReason: '',
    estimateSet: [],
    billSet: [],
    expenseSet: [],
    invoiceSet: [blankInvoice],
}

export const blankContractorContact: ContractorContactType = {
    id: '',
    location: 0,
    contactName: '',
    address: '',
    locality: '',
    state: 'NSW',
    postcode: '',
    country: 'Australia',
    phone1: '',
    phone2: '',
    phone3: '',
    fax: '',
    email: '',
    website: '',
}

export const blankContractor: ContractorType = {
    id: '',
    myobUid: '',
    name: '',
    abn: '',
    bsb: '',
    bankAccountName: '',
    bankAccountNumber: '',
    contacts: [blankContractorContact]
}

export const blankBill = {
    id: '',
    myobUid: '',
    invoiceNumber: '',
    invoiceDate: '',
    processDate: '',
    amount: 0,
    billType: 'subcontractor',
    thumbnailPath: '',
    supplier: blankContractor,
    job: blankJob
}

export const blankExpense = {
    id: '',
    myobUid: '',
    vendor: '',
    locale: '',
    expenseDate: '',
    processDate: '',
    amount: 0,
    thumbnailPath: '',
    employee: { id:'' },
    job: blankJob
}