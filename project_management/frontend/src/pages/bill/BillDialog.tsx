import React, { useState, useEffect }  from 'react';
import { useParams } from 'react-router-dom';

import { BillSummaryType, BillType, ContractorType, EstimateHeaderType, EstimateSummaryType, EstimateType, JobType, SnackType } from '../../types/types';
import BillHome from './JobBill';
import CreateBill from './Create';
import { blankBill } from './EditBill';

const emptyBillState = {
    id: '',
    myobUid: '',
    supplier: {
        id: '',
        myobUid: '',
        name: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bsb: '',
        abn: '',
    },
    thumbnailPath: '',
    // contractor: '',
    invoiceNumber: '',
    invoiceDate: '',
    amount: 0,
    billType: 'subcontractor'
}

export interface BillAttachmentType {
    data: string
    name: string
}

const BillDialog = ({ open, onClose, job, setJob, contractors, setSnack }: {
    open: boolean,
    onClose: (event?: {}, reason?: string) => void,
    job: JobType,
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    contractors: ContractorType[],
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const [newBill, setNewBill] = useState<BillType>(emptyBillState);
    const [billAttchment, setBillAttachment] = useState<BillAttachmentType>({'data':'', 'name':''})
    const [createBill, setCreateBill] = useState(false);
    const [data, setData] = useState<EstimateSummaryType[]>([]);

    useEffect(() => {
        const estimate = job.estimateSet.find((estimate) => estimate.approvalDate !== null)
        // console.log(estimate)
        // setData(estimate?.estimateheaderSet);
        estimate?.estimateheaderSet?.map(header => {
            header.estimateitemSet?.map(lineItem => {
                // Add the header description for meta data
                // console.log("lineItem", lineItem)
                const summaryItem = {...lineItem, header: header?.description};
                setData(prev => [...prev, summaryItem]);
            })
        });
    }, [job.estimateSet])

    const handleClose = (event?: any, reason?: string) => {
        if (reason !== 'backdropClick') {
            // TODO: Snackbar
            setCreateBill(false);
            onClose(event, reason);
        }
    }

    const handleBack = () => {
        setNewBill(emptyBillState);
        // TODO: Delete Temp Invoice File?
        setCreateBill(false);
    }

    if(createBill) {
        return <CreateBill open={open} handleClose={handleClose} handleBack={handleBack} 
            setJob={setJob} 
            id={job.po} contractors={contractors} 
            billAttachment={billAttchment}
            newBill={newBill} setNewBill={setNewBill} setSnack={setSnack}/>
    }

    if (data) {
        // Create a data structure with summarised headers and lineitem subRows
        let counter = 0;
        const summarisedData: EstimateSummaryType[] = data.reduce((items, item) => {
            const {id, description, quantity, itemType, rate, extension, gross, header} = item;

            // Check if the items descriptions are the same
            const itemIndex = items.findIndex(it => it.description.trim() === description.trim())

            if(itemIndex === -1) {
                // Create a new header row
                const subRows = [{id, description: header ?? '', quantity, itemType, rate, extension, gross}]
                items.push({id, counter, description, quantity, itemType, rate, extension, gross, subRows}); 
                counter += 1;
            } else {
                // Add to the existing header row
                items[itemIndex].quantity = items[itemIndex].quantity + quantity;
                items[itemIndex].itemType = itemType.slice(-1) == 's' ? itemType : itemType + 's';
                items[itemIndex].rate = items[itemIndex].rate + rate;
                items[itemIndex].extension = items[itemIndex].extension + extension;
                items[itemIndex].gross = items[itemIndex].gross + gross;
                items[itemIndex].subRows?.push({id, description: header ?? '', quantity, itemType, rate, extension, gross});
            }

            return items;
        }, [] as EstimateSummaryType[]);
        
        let billSummary: BillSummaryType[] = SummariseBill(job.billSet)

        return (
            <BillHome open={open} handleClose={handleClose} 
                id={job.po} data={summarisedData} 
                setJob={setJob}
                bills={billSummary}
                setBillAttachment={setBillAttachment}
                setNewBill={setNewBill} setCreateBill={setCreateBill} setSnack={setSnack}
            />
        )
    }

    return <></>
}

export const SummariseBill = (bills: BillType[]) => {
    let summarisedBill: BillSummaryType[] = [];
    if(bills.length > 0) {
        let counter = 0;
        summarisedBill = bills.reduce((items: { supplier: any; amount: any; invoiceNumber: number; subRows: any[]; }[], item: { [x: string]: any; supplier: any; amount: any; }) => {
            // console.log("items", items)
            // console.log("item", item)
            const {supplier, amount, ...other} = item;
            
            // Check if the items suppliers have the same name
            const itemIndex = items.findIndex((item: { supplier: { name: string; }; }) => item.supplier.name.trim() === supplier.name.trim())

            if(itemIndex === -1) {
                // Create a new header row
                const subRows = [{supplier, amount, ...other}]
                items.push({supplier, amount, invoiceNumber: 1, subRows}); 
                counter += 1;
            } else {
                // Add to the existing header row
                items[itemIndex].supplier.name = supplier.name;
                items[itemIndex].invoiceNumber = items[itemIndex].invoiceNumber + 1;
                items[itemIndex].amount = parseFloat(items[itemIndex].amount) + parseFloat(amount);
                items[itemIndex].subRows.push({supplier, amount, ...other});
            }

            return items
        }, [])
        
    }
    return summarisedBill;
}

export default BillDialog;