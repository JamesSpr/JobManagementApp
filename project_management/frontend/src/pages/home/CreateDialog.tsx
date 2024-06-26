// Imports
import React, { useState, useEffect }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Box, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Portal, Snackbar, Alert} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {InputField, SnackBar} from '../../components/Components';
import { defineJobIdentifier, openInNewTab } from '../../components/Functions';
import { blankJob } from '../../types/blanks';
import { ClientType, ContactType, JobType, LocationType, SnackType } from '../../types/types';

const CreateDialog = ({ open, onClose, jobs, setJobs, clients, clientContacts, locations }: {
    open: boolean,
    onClose: (event: any, reason: string) => void,
    jobs: JobType[],
    setJobs: React.Dispatch<React.SetStateAction<JobType[]>>,
    clients: ClientType[],
    clientContacts: ContactType[],
    locations: LocationType[],
}) => {

    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const [waiting, setWaiting] = useState(false);    
    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message: ''});
    const [checkJob, setCheckJob] = useState(false);
    const [duplicate, setDuplicate] = useState<JobType | null>(null);
    const [newJob, setNewJob] = useState<JobType>(blankJob)
    const [createdJob, setCreatedJob] = useState<JobType>(blankJob);

    useEffect(() => {

        const foundPO = jobs.find((job: { po: string; })  => newJob.po && job.po === newJob.po);
        const foundSR = jobs.find((job: { sr: string; })  => newJob.sr && job.sr === newJob.sr);
        const foundOther = jobs.find((job: { otherId: string; })  => newJob.otherId && job.otherId === newJob.otherId);

        setDuplicate(null);

        if(foundPO) {
            setDuplicate(foundPO);
        } else if(foundSR) {
            setDuplicate(foundSR);
        } else if (foundOther) {
            setDuplicate(foundOther);
        }

        setCheckJob(false);

    }, [checkJob])

    const handleCreate = async () => {
        setWaiting(true);

        // Remove unwanted values from job state for backend
        let {invoiceSet:_, myobUid:__, stage:____, billSet: _____, expenseSet: ______, ...jobInput} = newJob
        // Define formats before sending to backend
        newJob['inspectionDate'] === "" ? jobInput.inspectionDate = null : null;
        newJob['commencementDate'] === "" ? jobInput.commencementDate = null : null;
        newJob['completionDate'] === "" ? jobInput.completionDate = null : null;
        newJob['overdueDate'] === "" ? jobInput.overdueDate = null : null;
        newJob['closeOutDate'] === "" ? jobInput.closeOutDate = null : null;
        newJob['totalHours'] === null ? jobInput.totalHours = 0 : null;

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createJob($input:JobInput!) {
                    create: createJob(input:$input) {
                        success
                        message
                        updated
                        job {
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
                }`,
                variables: {
                    input: jobInput
                }
            })
        }).then((response) => {
            const res = response.data.data.create;

            if(res.success) {
                setSnack({active: true, variant: 'success', message: 'Job Created Successfully'})

                console.log(res)
                res.job['dateIssued'] = res.job['dateIssued'] ? new Date(res.job['dateIssued']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                res.job['overdueDate'] = res.job['overdueDate'] ? new Date(res.job['overdueDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""

                if(res.updated) {
                    // Update the job table row with the new data
                    setJobs(old => old.map((row, index) => {
                        if(row.id === res.job.id) {
                            return res.job
                        }
                        return row
                    }))
                }
                else {
                    console.log(res.job)
                    setJobs(prev => [...prev, res.job])
                }
                setCreatedJob(res.job);
                
            }
            else {
                setSnack({active: true, variant: 'error', message: 'Upload Error: ' + res.message})
            }
        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant: 'error', message: 'Server Error: Please Contact Developer'})
        }).finally(() => {
            setWaiting(false);
        })
        
    }

    const handleInput = (e: { target: { name: any; value: any; }; }) => {
        setNewJob(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    const handleDateInput = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? null : e.target.value
        setNewJob(prev => ({...prev, [e.target.name]: val}))
    }

    const handleSelection = (e: { target: { name: any; value: any; }; }) => {
        const val = e.target.value === "" ? null : {id: e.target.value}
        setNewJob(prev => ({...prev, [e.target.name]: val}))
    }

    const handleClose = (event?: any, reason?: string) => {
        if (reason !== 'backdropClick') {
            if(createdJob != blankJob) {
                setNewJob(blankJob)
                setCreatedJob(blankJob);
            }
            onClose(event, reason ?? '')
        }
    }

    const getNextRFQ = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                query nextId ($item: String){ 
                    nextId (item: $item)
                }`,
                variables: {
                    item: "job"
                },
            }),
        }).then((response) => {
            const res = response?.data?.data.nextId;
            setNewJob(prev => ({...prev, 'otherId': `RFQ${res}`}))
        });
    }

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth={'md'}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Job</DialogTitle>
            { duplicate && <span className='centreSpan' onClick={() => openInNewTab('/job/edit/' + defineJobIdentifier(duplicate))}>
                <p className="linkText">Job Already Exists in System, Click to Open</p>
            </span>
            }
            <DialogContent sx={{paddingTop: '10px'}}>
                <Grid container spacing={1} direction={'column'} alignItems={'center'} >
                    {/* Request Details */}
                    <Grid item xs={12}>
                        <InputField type="select" key="clientSelect" name="client" label="Client" value={newJob.client?.id ?? ''} onChange={handleSelection}>
                            <option key={"blank_client"} value={''}></option>
                            {clients?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))} 
                        </InputField>
                        <InputField name="dateIssued" type="datetime-local" max='9999-12-31T23:59:59' label="Date Issued" value={newJob.dateIssued} onChange={handleDateInput}/>
                        <InputField name="overdueDate" type="datetime-local" max='9999-12-31T23:59:59' label="Overdue Date" value={newJob.overdueDate} onChange={handleDateInput}/>
                    </Grid>
                    {/* newJob Details */}
                    <Grid item xs={12}> 
                        <InputField type="text" name="po" label="Purchase Order #" value={newJob.po} onChange={handleInput} onBlur={() => setCheckJob(true)} />
                        <InputField type="text" name="sr" label="Service Request #" value={newJob.sr} onChange={handleInput} onBlur={() => setCheckJob(true)} />
                        <InputField type="text" name="otherId" label="Other Id" value={newJob.otherId} onChange={handleInput} onBlur={() => setCheckJob(true)} />
                    </Grid>
                    {/* Location & Title */}
                    <Grid item xs={12}> 
                        <InputField type="select" key="locationSelect" name="location" label="Location" value={newJob.location?.id ?? ""} onChange={handleSelection}>
                            <option key="blank_location" value={""}></option>
                            {locations?.map((loc) => (
                                loc.client.id === newJob?.client?.id ? <option key={loc.id} value={loc.id}>{loc.name} ({loc.clientRef})</option> : <></>
                            ))}
                        </InputField>
                        <InputField type="text" name="building" label="Building" value={newJob.building} onChange={handleInput}/>
                        <InputField type="text" name="detailedLocation" label="Detailed Location" value={newJob.detailedLocation} onChange={handleInput}/>
                    </Grid>
                    {/* Extra Details */}
                    <Grid item xs={12}>
                        <InputField type="select" key="requesterSelect" label="Requester" name="requester" value={newJob.requester?.id ?? ""} onChange={handleSelection}>
                            <option key={"blank_requester"} value={""}></option>
                            {clientContacts?.map((contact) => (
                                contact.active && contact.client.id === newJob?.client?.id ? <option key={contact.id} value={contact.id}>{contact.firstName + " " + contact.lastName}</option> : /*&& contact.region.shortName === locations[location-1].region.shortName*/ <></>
                            ))}
                        </InputField>
                        <InputField type="text" name="priority" label="Priority" value={newJob.priority} onChange={handleInput}/>
                        <InputField type="text" name="specialInstructions" label="Special Instructions" value={newJob.specialInstructions} onChange={handleInput}/>
                    </Grid>
                    {/* Point of Contact */}
                    <Grid item xs={12}>
                        <InputField type="text" name="pocName" label="POC Name" value={newJob.pocName} onChange={handleInput}/>
                        <InputField type="text" name="pocPhone" label="POC Phone" value={newJob.pocPhone} onChange={handleInput}/>
                        <InputField type="text" name="pocEmail" label="POC Email" value={newJob.pocEmail} onChange={handleInput}/>
                    </Grid>
                    {/* Alt Point of Contact */}
                    <Grid item xs={12}> 
                        <InputField type="text" name="altPocName" label="Alt POC Name" value={newJob.altPocName} onChange={handleInput}/>
                        <InputField type="text" name="altPocPhone" label="Alt POC Phone" value={newJob.altPocPhone} onChange={handleInput}/>
                        <InputField type="text" name="altPocEmail" label="Alt POC Email" value={newJob.altPocEmail} onChange={handleInput}/>
                    </Grid>
                    {/* Title */}
                    <Grid item xs={12}> 
                        <InputField type="text" style={{width: '750px'}} name="title" label="Title" value={newJob.title} onChange={handleInput}/>
                    </Grid>
                    {/* Description */}
                    <Grid item xs={12}> 
                        <InputField type="text" multiline style={{width: '750px'}} name="description" label="Description" value={newJob.description} onChange={handleInput}/>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{justifyContent: "center"}}>
                <Button variant="outlined" onClick={handleClose}>Close</Button>
                {createdJob && createdJob !== blankJob?   
                    <Button variant="outlined" onClick={(e) => navigate('/job/edit/' + defineJobIdentifier(createdJob))}>Go To Job</Button>
                    :
                    <Box sx={{ m: 1, position: 'relative', display: 'inline-block' }}>
                        <Button variant="outlined" onClick={handleCreate} disabled={waiting}>Create</Button>
                        {waiting && (
                            <CircularProgress size={24} 
                                sx={{
                                    colour: 'primary', 
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    marginTop: '-12px',
                                    marginLeft: '-12px',
                                }}
                            />
                        )}
                    </Box>
                }
                <Button variant="outlined" onClick={(e) => getNextRFQ()}>Next RFQ</Button>
            </DialogActions>

            <SnackBar snack={snack} setSnack={setSnack} />
            
        </Dialog>
    );
}

export default CreateDialog