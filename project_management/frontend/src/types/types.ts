import React, { ReactNode } from 'react';

export type User = {
    id: Number,
    email: string,
    firstName: string,
    lastName: string
}

export interface JobType {
    id: string,
    po: string,
    sr: string,
    otherId: string,
    client: {
        name: string
    }
    location: {
        name: string,
        region: {
            shortName: string
        }
    }
    building: string,
    title: string,
    priority: string,
    dateIssued: Date,
    overdueDate: Date,
    stage: string,
    description: string,
    detailedLocation: string,
    estimateSet: {
        id: Number
        name: string,
        description: string,
        price: Number,
        issueDate: Date,
        approvalDate: Date,
        quoteBy: {
            id: Number
        }
    }
    jobinvoiceSet: {
        invoice: {
            number: string,
            dateCreated: Date,
            dateIssued: Date,
            datePaid: Date,
        }
    }
    opportunityType: string,
    bsafeLink: string,
    workType: string,
    cancelled: boolean,
    cancelReason: string,

}

export type JobStage = {

}

export interface ClientType {
    id: string
    name: string
    displayName: string
}

export interface ContactType {
    id: string
    firstName: string
    lastName: string
    position: string
    phone: string
    email: string
    region: {
        id: string
    }
}

export interface LocationType {
    id: string
    clientRef: string
    name: string
    address: string
    locality: string
    state: string
    postcode: string
    region: {
        shortName: string
        name: string
        email: string
    }
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
    min?: string
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
    onChange: (event: React.ChangeEvent<HTMLElementChange>) => void
    style?: React.CSSProperties
    step?: number
    props?: any
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

export interface MYOBUserType {
    id?: string
    username: string
}