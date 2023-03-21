export type User = {
    node: {
        id: Number,
        email: string,
        firstName: string,
        lastName: string
    }
}

export interface Job {
    id: Number,
    po: String,
    sr: String,
    otherId: String,
    client: {
        name: String
    }
    location: {
        name: String,
        region: {
            shortName: String
        }
    }
    building: String,
    title: String,
    priority: String,
    dateIssued: Date,
    overdueDate: Date,
    stage: String,
    description: String,
    detailedLocation: String,
    estimateSet: {
        id: Number
        name: String,
        description: String,
        price: Number,
        issueDate: Date,
        approvalDate: Date,
        quoteBy: {
            id: Number
        }
    }
    jobinvoiceSet: {
        invoice: {
            number: String,
            dateCreated: Date,
            dateIssued: Date,
            datePaid: Date,
        }
    }
    bsafeLink: String,
}

export type JobStage = {

}

export type Auth = {

}