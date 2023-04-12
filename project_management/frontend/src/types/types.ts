import React, { ReactNode } from 'react';

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

export interface IAuth {
    user : {
        id: String;
        username: String;
        refreshToken: String;
        defaultPaginationAmount: Number;
        company?: {
            id: String;
            name: String;
            logo: String;
        };
    },
    myob: {
        id: String;
    },
    accessToken: String;
    sidebar: Boolean;
}
    
export type AuthContextType = {
    auth?: IAuth;
    setAuth: (auth: IAuth) => void;
}

export interface InputFieldType {
    type: string
    label?:string
    children?: ReactNode
    multiline?: boolean
    halfWidth?: boolean
    wide?: boolean
    width?: number
    error?: boolean
    noMargin?: boolean
    value?: any
    defaultValue?:any
    onChange: (event: React.ChangeEvent<HTMLElementChange>) => void
    style?: React.CSSProperties
    props?: any
}

export type HTMLElementChange = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement