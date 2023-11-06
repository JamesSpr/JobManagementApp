import { ClientType, ContactType, InvoiceType, JobType, LocationType, RegionType } from "../../types/types"

export const blankClient: ClientType = {
    id: '',
    name: '',
    displayName: ''
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
    invoiceSet: [blankInvoice],
}

export const jobQueryData = `
    myobUid
    id
    po
    sr
    otherId
    client {
        id
    }
    requester {
        id
    }
    location {
        id
    }
    building
    detailedLocation
    title
    priority
    description
    specialInstructions
    scope
    pocName
    pocPhone
    pocEmail
    altPocName
    altPocPhone
    altPocEmail
    dateIssued
    inspectionBy {
        id
    }
    inspectionDate
    inspectionNotes
    siteManager {
        id
    }
    commencementDate
    completionDate
    totalHours
    workNotes
    closeOutDate
    overdueDate
    bsafeLink 
    cancelled
    cancelReason
    overdueDate
    stage
    opportunityType
    workType
    estimateSet {
        id
        name
        description
        price
        issueDate
        approvalDate
        scope
        quoteBy {
            id
        }
        estimateheaderSet{
            id
            description
            markup
            gross
            estimateitemSet {
                id
                description
                quantity
                itemType
                rate
                extension
                markup
                gross
            }
        }	
    }
    billSet {
        id
        myobUid
        supplier {
            name
        }
        invoiceNumber
        invoiceDate
        amount
        processDate
        thumbnailPath
        billType
        job {
            id
        }
    }
    invoiceSet {
        number
        dateCreated
        dateIssued
        datePaid
    }
`

export const jobAllQuery = () => {
    return `query jobs($identifier:String!){
            jobs: jobs(identifier: $identifier){
                ${jobQueryData}
            }
            __type(name:"JobStage"){
                name
                enumValues {
                    name
                    description
                }
            }
            locations {
                id
                name
                region {
                    shortName
                    email
                }
                client {
                    id
                }
            }
            clients {
                id
                name
            }
            clientContacts {
                id
                firstName
                lastName
                region {
                    shortName
                }
                client {
                    id
                }
            }
            users (isStaff: true) {
                edges {
                    node {
                        id: pk
                        firstName
                        lastName
                    }
                }
            }
        }`
}