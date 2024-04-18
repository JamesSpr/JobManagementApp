import React, { useState, useEffect }  from 'react';
import { Grid } from '@mui/material';
import { InputField, ProgressButton } from '../../../components/Components';

import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import useAuth from '../../auth/useAuth';
import { BillType, ContractorType, JobType, SnackType } from '../../../types/types';
import { AttachmentType, BillTypes } from './JobBill';

const CreateBill = ({ id, setJob, contractors, newBill, setNewBill, attachment, setCreating, setSnack}: {
    id: string
    contractors: ContractorType[]
    newBill: BillType
    setNewBill: React.Dispatch<React.SetStateAction<BillType>>
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    attachment: AttachmentType
    setCreating: React.Dispatch<React.SetStateAction<BillTypes>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {
    const emptyContractorState: ContractorType = {
        id: '',
        myobUid: '',
        name: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bsb: '',
        abn: '',
    }

    type BillFieldErrorType = {
        contractor: boolean,
        invoiceNumber: boolean,
        invoiceDate: boolean,
        amount: boolean
    } 

    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState(false);
    const [contractor, setContractor] = useState<ContractorType>(emptyContractorState);
    const [fieldError, setFieldError] = useState<BillFieldErrorType>({'contractor': false, 'invoiceNumber': false, 'invoiceDate': false, 'amount': false});

    useEffect(() => {
        setContractor(contractors.find(contractor => contractor.id == newBill.contractor) ?? emptyContractorState)

        // TODO: Validate values
        // Check date is within a year each way
        // Check amount is below budget
        // Check invoiceNumber does not already exist

        // Highlight values that were not found

    }, [])

    const handleChange = (e: { target: { name: any; value: any; }; }) => {
        setNewBill(prev => ({...prev, [e.target.name]: e.target.value}));

        if(fieldError[e.target.name as keyof BillFieldErrorType]) {
            setFieldError(prev => ({...prev, [e.target.name]: false}));
        }
    }

    const handleSelectContractor = (e: { target: { name: any; value: string; }; }) => {
        setNewBill(prev => ({...prev, [e.target.name]:e.target.value}))

        if(fieldError[e.target.name as keyof BillFieldErrorType]) {
            setFieldError(prev => ({...prev, [e.target.name]: false}));
        }

        if(e.target.value !== "") {
            setContractor(contractors.find(contractor => contractor.id === e.target.value) ?? emptyContractorState)
        }
        else {
            setContractor(emptyContractorState)
        }
    }

    const handleSubmit = async () => {
        setWaiting(true);
        
        // Check emty values
        let err = false;
        Object.entries(fieldError).map(([key, val]) => {
            const field = newBill[key as keyof BillType]
            if(!field || field == "") {
                setFieldError(prev => ({...prev, [key]: true}))
                err = true;
            }
        })
        
        if(err) {
            setWaiting(false);
            return;
        }
        
        const {abn, job, supplier, processDate, ...bill} = newBill

        // Post bill details to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createBill($jobId:String!, $newBill: BillInput!, $attachment:String!, $attachmentName:String!) {
                    create: createBill(jobId:$jobId, newBill:$newBill, attachment:$attachment, attachmentName:$attachmentName) {
                        success
                        message
                        bill {
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
                    }
                }`,
                variables: {
                    jobId: id,
                    newBill: bill,
                    attachment: attachment.data,
                    attachmentName: attachment.name
                }
            }),
        }).then((response) => {
            const res = response?.data?.data?.create;

            if(res.success) {
                setJob(prev => ({...prev, billSet: [...prev.billSet, res.bill]}))
                setSnack({active: true, variant: 'success', message:"Successfully Created Bill"})
                setCreating(null);
            }
            else {
                setSnack({active: true, variant:'error', message: res.message})
            }
        }).catch((err) => {
            console.log("error:", err);
            setSnack({active: true, variant:'error', message: "Submission Error. Contact Developer"})
        }).finally(() => {
            setWaiting(false);
        })
    }

    return (
    <>
        <Grid container spacing={1} direction={'column'} alignItems={'center'}>
            <Grid item xs={12}>
                <h2>Contractor Details</h2>
            </Grid>
            <Grid item xs={12}>
                <InputField width={600} type="select" label="Contractor" name="contractor" 
                    error={fieldError['contractor']} value={newBill.contractor} onChange={handleSelectContractor}>
                    <option key="nullContractor" value=""></option>
                    {contractors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </InputField> 
            </Grid>
            <Grid item xs={12}>
                <InputField type="text" width={200} disabled label="ABN" value={contractor['abn']}/>
                <InputField type="text" width={400} disabled label="Account Name" value={contractor['bankAccountName']}/>
            </Grid>
            <Grid item xs={12}>
                <InputField type="text" width={200} disabled label="BSB" value={contractor['bsb']}/>
                <InputField type="text" width={200} disabled label="Account Number" value={contractor['bankAccountNumber']}/>
            </Grid>
            <Grid item xs={12}>
                <a href='/contractors'>Click here to goto contractors to add or modify</a>
            </Grid>
            <Grid item xs={12}>
                <h2>Invoice Details</h2>
            </Grid>
            <Grid item xs={12}>
                <div>
                    <input type="radio" id="subcontractor" name="billType" value="subcontractor" 
                        checked={newBill['billType'] === "subcontractor"}
                        onChange={handleChange}
                    />
                    <label htmlFor="subcontractor">Subcontractor</label>
                    <span style={{display:'inline-block', width:'10px'}} />
                    <input type="radio" id="material" name="billType" value="material" 
                        checked={newBill['billType'] === "material"}
                        onChange={handleChange}
                    />
                    <label htmlFor="material">Materials</label>

                </div>
            </Grid>
            <Grid item xs={12}>
                <InputField type="text" width={200} label="Invoice Number" name="invoiceNumber" 
                    error={fieldError['invoiceNumber']} value={newBill['invoiceNumber']} onChange={handleChange}/> 
                <InputField type="date" width={200} label="Invoice Date" name="invoiceDate" 
                    error={fieldError['invoiceDate']} value={newBill['invoiceDate']} onChange={handleChange}/> 
                <InputField type="number" width={200} label="Invoice Amount (incl. GST)" name="amount" min={0} step={0.01}
                    error={fieldError['amount']} value={newBill['amount']} onChange={handleChange}/>
            </Grid>
            <Grid item xs={12}>
                <ProgressButton name="Submit" waiting={waiting} onClick={handleSubmit} buttonVariant="outlined" />
            </Grid>
            <Grid item xs={12}>
                <div className='pdf-preview'>
                    <img src={"/" + newBill?.thumbnailPath} alt="PDF Preview" className='pdf-img'/>
                </div>
            </Grid>
        </Grid>
    </>
    )
}

export default CreateBill;