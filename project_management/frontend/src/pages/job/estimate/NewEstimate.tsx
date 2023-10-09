import React, { useState } from 'react';
import { Grid, Typography, Button } from '@mui/material';

import { InputField, Tooltip } from '../../../components/Components';
import { EmployeeType, EstimateType, JobType, SnackType } from '../../../types/types';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';

const NewEstimate = ({job, setJob, users, snack, setSnack}: {
    job: JobType
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    users: EmployeeType[]
    snack: SnackType
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [copyOption, setCopyOption] = useState(0);
    const [valueError, setValueError] = useState(false)
    const [waiting, setWaiting] = useState(false);
    const [errorText, setErrorText] = useState("");

    const blankEstimate = {
        id: '0',
        name: '',
        description: '',
        issueDate: '',
        approvalDate: '',
        quoteBy: {
            id: undefined
        },
        price: 0,
        scope: '',
        estimateheaderSet: [],
    }

    const [newEstimate, setNewEstimate] = useState<EstimateType>(blankEstimate);

    const handleCreateEstimate = async () => {
        setWaiting(true);

        if(newEstimate.name.trim() === "" ) {
            setValueError(true);
            setErrorText("Name must not be blank");
            return
        }

        // Check if the name is a duplicate
        let dupe = false
        job.estimateSet.map((est, i) => {
            if(newEstimate.name.trim().toLowerCase() === est.name.trim().toLowerCase()){
                setValueError(true);
                setErrorText("Name must be unique")
                dupe = true; 
            }         
        })

        if(dupe) return
        newEstimate.name = newEstimate.name.trim()

        if(copyOption > 0) {
            newEstimate.scope = job.estimateSet[copyOption-1]?.scope ?? "";
            newEstimate.price = job.estimateSet[copyOption-1]?.price ?? 0.00;
            newEstimate.estimateheaderSet = job.estimateSet[copyOption-1]?.estimateheaderSet ?? [];
        }
        
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createEstimate($jobId:String!, $estimate: EstimateInput!) {
                    create: createEstimate(jobId:$jobId, estimate:$estimate) {
                        success
                        estimate {
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
                    }
                }`,
                variables: {
                    jobId: job?.id,
                    estimate: newEstimate
                },
            })
        }).then((response) => {
            const res = response?.data?.data?.create

            setWaiting(false)
            setValueError(false);
            setErrorText("");

            if(res?.success) {
                setNewEstimate(blankEstimate);
                setSnack({active: true, variant:'success', message: 'Estimate Created'})
                setJob(prev => ({...prev, estimateSet: [...prev.estimateSet, res.estimate]}))
            }
            else {
                setSnack({active: true, variant:'error', message: 'Error Creating Estimate'})
            }

        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: 'Error. Please contact Developer'})
            
            setWaiting(false)
        })
    }

    const handleInput = (e: { target: { name: any; value: any; }; }) => {
        setNewEstimate(prev => ({...prev, [e.target.name]: e.target.value}));
    }

    const handleSelection = (e: { target: { value: any; }; }) => {
        setNewEstimate(prev => ({...prev, quoteBy: {id: e.target.value}}));
    }

    return (
        <>
            <Grid container direction={'column'} alignItems={'center'}>
                <Grid item xs={12} style={{paddingBottom: '10px'}}>
                    <Typography align="center" variant='h6' style={{paddingBottom: '10px'}}>Create New Estimate</Typography>
                    <Tooltip title={valueError ? errorText : ""}>
                        <InputField type="text" label="Name" name='name' error={valueError} value={newEstimate.name} onChange={handleInput}/>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} style={{paddingBottom: '20px'}}>
                    <InputField type="text" label="Notes" name="description" value={newEstimate.description} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12} style={{paddingBottom: '20px'}}>
                    <InputField type="select" label="Quote By" name='quoteBy' value={newEstimate.quoteBy.id} onChange={handleSelection}>
                        <option key={0} value={""}></option>
                        {
                            users?.map((usr, index: number) => (
                                <option key={index} value={usr.id}>{usr.firstName + ' ' + usr.lastName}</option>
                            ))
                        }
                    </InputField>
                </Grid>
                <Grid item xs={12} style={{paddingBottom: '20px'}}>
                    <InputField type="select" label="Copy Estimate" value={copyOption} onChange={(e) => {setCopyOption(parseInt(e.target.value))}}>
                        <option key={0} value={0}>None</option>
                        {
                            job.estimateSet.map((est, index) => (
                                <option key={index + 1} value={index + 1}>{est.name}</option>
                            ))
                        }
                    </InputField>
                </Grid>
                <Grid item xs={12}>
                    <Button variant="outlined" onClick={handleCreateEstimate} disabled={newEstimate['name'] === "" || newEstimate.quoteBy.id === null}>Create Estimate</Button>
                </Grid>
            </Grid>
        </>
    )
}

export default NewEstimate;