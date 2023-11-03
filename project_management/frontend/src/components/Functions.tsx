import React from 'react';
import { JobType } from "../types/types";

export const openInNewTab = (url: string) => {
    const newWindow = window.open(url, '_blank', 'noopener, noreferrer')
    if(newWindow) newWindow.opener = null
}

export const defineJobIdentifier = (job: JobType | undefined) => {
    let identifier = job?.po
    
    if (job?.po == '') {
        if (job?.otherId && job?.otherId.includes("VP")) {
            identifier = job?.otherId;
        }
        else if (job?.sr != '') {
            identifier = job?.sr;
        }
        else if (job?.otherId != ''){
            identifier = job?.otherId;
        }
    }

    return identifier;
};