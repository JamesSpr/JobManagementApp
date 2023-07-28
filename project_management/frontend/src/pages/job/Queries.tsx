export const jobAllQuery = () => {
    return `query jobAll($po:String!, $sr:String!, $otherId:String!){
            job_all: jobAll(po: $po, sr: $sr, otherId: $otherId){
                edges {
                    node {
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
                                subRows: estimateitemSet {
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
                            myobUid
                            supplier {
                                name
                            }
                            invoiceNumber
                            invoiceDate
                            amount
                            processDate
                            imgPath
                        }
                        jobinvoiceSet {
                            id
                            invoice {
                                number
                                dateCreated
                                dateIssued
                                datePaid
                            }
                        }
                    }
                }
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