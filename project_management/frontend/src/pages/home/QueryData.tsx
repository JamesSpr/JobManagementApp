export const fetchData = (number: number, next: String) => (
    JSON.stringify({
    query:`{ 
        jobPage (last:${number}, before:"${next}") {
            pageInfo {
                startCursor
                hasPreviousPage
            }
            edges {
                node {
                    id
                    po
                    sr
                    otherId
                    client {
                        name
                        displayName
                    }
                    location {
                        name
                        region {
                            shortName
                        }
                    }
                    building
                    title
                    priority
                    dateIssued
                    overdueDate
                    inspectionDate
                    inspectionBy {
                        firstName
                    }
                    siteManager {
                        firstName
                    }
                    commencementDate
                    completionDate
                    closeOutDate
                    stage
                    description
                    detailedLocation
                    estimateSet {
                        id
                        name
                        description
                        price
                        issueDate
                        approvalDate
                        quoteBy {
                            id
                        }
                    }
                    invoiceSet {
                        number
                        dateCreated
                        dateIssued
                        datePaid
                    }
                    billSet {
                        amount
                    }
                    bsafeLink
                }
            }
        }
    }`,
    variables: {}
}))

export const fetchArchivedData = () => (JSON.stringify({
    query:`{ 
        archivedJobs {
            edges {
                node {
                    id
                    po
                    sr
                    otherId
                    client {
                        name
                        displayName
                    }
                    location {
                        name
                        region {
                            shortName
                        }
                    }
                    building
                    title
                    priority
                    dateIssued
                    overdueDate
                    inspectionDate
                    inspectionBy {
                        firstName
                    }
                    siteManager {
                        firstName
                    }
                    commencementDate
                    completionDate
                    closeOutDate
                    stage
                    description
                    detailedLocation
                    estimateSet {
                        id
                        name
                        description
                        price
                        issueDate
                        approvalDate
                        quoteBy {
                            id
                        }
                    }
                    invoiceSet {
                        number
                        dateCreated
                        dateIssued
                        datePaid
                    }
                    billSet {
                        amount
                    }
                    bsafeLink
                }
            }
        }
    }`,
    variables: {}
}))

export const fetchResources = () => (JSON.stringify({
    query:`{ 
        locations{
            id
            name
            clientRef
            region {
                shortName
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
            client {
                id
            }
            active
        }
        users (isStaff: true) {
            edges {
                node {
                    id: pk
                    firstName
                    lastName
                    email
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
    }`,
    variables: {}
}))