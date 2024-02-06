import React, { useState, useEffect }  from 'react';
import { Grid } from '@mui/material';
import { InputField, ProgressButton } from '../../../components/Components';

import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import useAuth from '../../auth/useAuth';
import { ContractorType, EmployeeType, ExpenseType, JobType, SnackType } from '../../../types/types';
import { AttachmentType, BillTypes } from './JobBill';

const CreateExpense = ({ id, setJob, employees, newExpense, setNewExpense, attachment, setCreating, setSnack}: {
    id: string
    employees: EmployeeType[]
    newExpense: ExpenseType
    setNewExpense: React.Dispatch<React.SetStateAction<ExpenseType>>
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    attachment: AttachmentType
    setCreating: React.Dispatch<React.SetStateAction<BillTypes>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState(false);
    const [fieldError, setFieldError] = useState({'vendor': false, 'locale': false, 'expenseDate': false, 'amount': false, 'employee': false});

    const handleChange = (e: { target: { name: any; value: any; }; }) => {
        setNewExpense(prev => ({...prev, [e.target.name]:e.target.value}))
    }

    const handleSubmit = async () => {
        setWaiting(true);
        
        // Check emty values
        let err = false;
        Object.entries(newExpense).map(([key, val]) => {
            if(!val) {
                setFieldError(prev => ({...prev, [key]: true}))
                err = true;
            }
        })
        
        if(err) {
            setWaiting(false);
            return;
        }
        
        // Post bill details to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobCreateExpense($uid:String!, $jobId:String!, $newExpense: ExpenseInput!, $attachment: String!, $attachmentName: String!) {
                    create: myobCreateExpense(uid:$uid, jobId:$jobId, newExpense: $newExpense, attachment: $attachment, attachmentName: $attachmentName) {
                        success
                        message
                        error
                        expense {
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
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    jobId: id,
                    newExpense: newExpense,
                    attachment: attachment.data,
                    attachmentName: attachment.name,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.create; 

            setWaiting(false);
            if(res.success) {
                setJob(prev => ({...prev, expenseSet: [...prev.expenseSet, res.expense]}))
                setCreating(null)
            }
            else {
                setSnack({active: true, variant:'error', message: res.message})
            }
        }).catch((err) => {
            setWaiting(false);
            console.log("error:", err);
            setSnack({active: true, variant:'error', message: "Submission Error. Contact Developer"})
        })
    }

    const handleSelect = (e: { target: { name: any; value: string; }; }) => {
        setNewExpense(prev => ({...prev, [e.target.name]: {id: e.target.value}}))
    }

    return (
    <>
        <Grid container spacing={1} direction={'column'} alignItems={'center'}>
            <Grid item xs={12}>
                <h2>Vendor Details</h2>
            </Grid>
            <Grid item xs={12}>
                <InputField type="text" label="Vendor Name" value={newExpense.vendor}/>
                <InputField type="text" label="Vendor Locale" value={newExpense.locale}/>
            </Grid>
            <Grid item xs={12}>
                <h2>Purchase Details</h2>
            </Grid>
            <Grid item xs={12}>
                <InputField width={500} type="select" label="Employee" name="employee" 
                    error={fieldError.employee} value={newExpense?.employee?.id ?? ''} onChange={handleSelect}>
                    <option key="nullEmployee" value=""></option>
                    {employees.map(employee => (
                        <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>
                    ))}
                </InputField> 
            </Grid>
            <Grid item xs={12}>
                <InputField type="date" label="Purchase Date" name="expenseDate" 
                    error={fieldError.expenseDate} value={newExpense.expenseDate} onChange={handleChange}/> 
                <InputField type="number" label="Total Amount (incl. GST)" name="amount" min={0} step={0.01}
                    error={fieldError['amount']} value={newExpense['amount']} onChange={handleChange}/>
            </Grid>
            <Grid item xs={12}>
                <ProgressButton name="Submit" waiting={waiting} onClick={handleSubmit} buttonVariant="outlined" />
            </Grid>
            <Grid item xs={12}>
                <div className='pdf-preview'>
                    <img src={"\\" + newExpense?.thumbnailPath} alt="PDF Preview" className='pdf-img'/>
                </div>
            </Grid>
        </Grid>
    </>
    )
}

export default CreateExpense;
