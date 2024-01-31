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
    expenseSet {
        id
        myobUid
        vendor
        locale
        expenseDate
        amount
        processDate
        thumbnailPath
        employee {
            id
        }
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