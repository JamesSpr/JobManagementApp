// Imports
import React, { useState, useEffect }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Box, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Portal, Snackbar, Alert} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {InputField} from '../../components/Components';

const CreateDialog = ({ open, onClose, clients, clientContacts, locations }) => {

    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const [waiting, setWaiting] = useState(false);    
    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');
    const [createdJob, setCreatedJob] = useState({});
    const [updated, setUpdated] = useState(false);
    const [newJob, setNewJob] = useState({
        'po': '',
        'sr': '',
        'otherId': '',
        'client': '',
        'location': '',
        'building': '',
        'detailedLocation': '',
        'title': '',
        'priority': '',
        'dateIssued': '',
        'requester': '',
        'pocName': '',
        'pocPhone': '',
        'pocEmail': '',
        'altPocName': '',
        'altPocPhone': '',
        'altPocEmail': '',
        'description': '',
        'specialInstructions': '',
        'overdueDate': '',
        'bsafeLink': '',
    })

    // Empty createdJob state on open
    useEffect(() => {
        setCreatedJob({})
    }, [open])

    const defineJobIdentifier = (job) => {
        let identifier = "PO" + job.po; // Default Value is PO
        
        if (job.po == '') {
            if(job.sr != '') {
                identifier = "SR" + job.sr;
            }
            else if (job.otherId != ''){
                identifier = job.otherId;
            }
        }
    
        return identifier;
    };

    const handleCreate = async () => {
        setWaiting(true);

        newJob['dateIssued'] === "" ? newJob['dateIssued'] = new Date().toISOString().split('T')[0] : null
        newJob['overdueDate'] === "" ? newJob['overdueDate'] = new Date(0).toISOString().split('T')[0] : null

        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation createJob ($input: JobInput!) { 
                        create_job: createJob(input: $input)
                        {
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
                                }
                                location {
                                    name
                                }
                                building
                                title
                                priority
                                dateIssued
                                overdueDate
                                stage
                            }
                        }
                    }`,
                    variables: {
                        input: newJob,
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data;

                setWaiting(false);
                setSnack(true);

                if(res.create_job.success) {
                    setUpdated(res?.create_job?.updated ?? false)
                    setCreatedJob(res.create_job.job);
                    setSnackVariant('success');
                    setSnackMessage(res?.create_job?.updated ? "Job Updated" : "Job Created Successfully");
                }
                else {
                    setSnackVariant('error');
                    setSnackMessage("Job Upload Error: " + res.create_job.message);
                }
            });
        } catch (err) {
            console.log(err);
            setSnack(true);
            setWaiting(false);
            setSnackVariant('error');
            setSnackMessage("Server Error. Please Contact Admin");
        }
    }

    const handleInput = (e) => {
        setNewJob(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    const handleClose = (event, reason) => {
        if (reason !== 'backdropClick') {
            if(createdJob) {
                setNewJob({
                    'po': '',
                    'sr': '',
                    'otherId': '',
                    'client': '',
                    'location': '',
                    'building': '',
                    'detailedLocation': '',
                    'title': '',
                    'priority': '',
                    'dateIssued': '',
                    'requester': '',
                    'pocName': '',
                    'pocPhone': '',
                    'pocEmail': '',
                    'altPocName': '',
                    'altPocPhone': '',
                    'altPocEmail': '',
                    'description': '',
                    'specialInstructions': '',
                    'overdueDate': '',
                    'bsafeLink': '',
                })
            }
            onClose(event, reason, createdJob, updated)
        }
    }

    const getNextRFQ = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                query nextId { 
                    nextId
                }`,
                variables: {},
            }),
        }).then((response) => {
            const res = response?.data?.data.nextId;
            setNewJob(prev => ({...prev, 'otherId': `RFQ${res}`}))
        });
    }

    return (
        <Dialog open={open} onClose={handleClose} fullwidth="true" maxWidth={'md'}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Job</DialogTitle>
            <DialogContent sx={{paddingTop: '10px'}}>
                <Grid>
                    {/* Request Details */}
                    <Grid item xs={12} align="center">
                        <InputField type="select" key="clientSelect" name="client" label="Client" value={newJob.client} onChange={handleInput}>
                            <option key={"blank_client"} value={''}></option>
                            {clients?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))} 
                        </InputField>
                        <InputField name="dateIssued" type="date" label="Date Issued" value={newJob.dateIssued} onChange={handleInput} max="9999-12-31"/>
                        <InputField name="overdueDate" type="date" label="Overdue Date" value={newJob.overdueDate} onChange={handleInput} max="9999-12-31"/>
                    </Grid>
                    {/* newJob Details */}
                    <Grid item xs={12} align="center"> 
                        <InputField name="po" label="Purchase Order #" value={newJob.po} onChange={handleInput} />
                        <InputField name="sr" label="Service Request #" value={newJob.sr} onChange={handleInput} />
                        <InputField name="otherId" label="Other Id" value={newJob.otherId} onChange={handleInput} />
                    </Grid>
                    {/* Location & Title */}
                    <Grid item xs={12} align="center"> 
                        <InputField type="select" key="locationSelect" name="location" label="Location" value={newJob.location} onChange={handleInput}>
                            <option key="blank_location" value={""}></option>
                            {locations?.map((loc) => (
                                loc.client.id === newJob.client ? <option key={loc.id} value={loc.id}>{loc.name} ({loc.clientRef})</option> : <></>
                            ))}
                        </InputField>
                        <InputField name="building" label="Building" value={newJob.building} onChange={handleInput}/>
                        <InputField name="detailedLocation" label="Detailed Location" value={newJob.detailedLocation} onChange={handleInput}/>
                    </Grid>
                    {/* Extra Details */}
                    <Grid item xs={12} align="center">
                        <InputField type="select" key="requesterSelect" label="Requester" name="requester" value={newJob.requester} onChange={handleInput}>
                            <option key={"blank_requester"} value={""}></option>
                            {clientContacts?.map((contact) => (
                                contact.client.id === newJob.client ? <option key={contact.id} value={contact.id}>{contact.firstName + " " + contact.lastName}</option> : /*&& contact.region.shortName === locations[location-1].region.shortName*/ <></>
                            ))}
                        </InputField>
                        <InputField name="priority" label="Priority" value={newJob.priority} onChange={handleInput}/>
                        <InputField name="specialInstructions" label="Special Instructions" value={newJob.specialInstructions} onChange={handleInput}/>
                    </Grid>
                    {/* Point of Contact */}
                    <Grid item xs={12} align="center">
                        <InputField name="pocName" label="POC Name" value={newJob.pocName} onChange={handleInput}/>
                        <InputField name="pocPhone" label="POC Phone" value={newJob.pocPhone} onChange={handleInput}/>
                        <InputField name="pocEmail" label="POC Email" value={newJob.pocEmail} onChange={handleInput}/>
                    </Grid>
                    {/* Alt Point of Contact */}
                    <Grid item xs={12} align="center"> 
                        <InputField name="altPocName" label="Alt POC Name" value={newJob.altPocName} onChange={handleInput}/>
                        <InputField name="altPocPhone" label="Alt POC Phone" value={newJob.altPocPhone} onChange={handleInput}/>
                        <InputField name="altPocEmail" label="Alt POC Email" value={newJob.altPocEmail} onChange={handleInput}/>
                    </Grid>
                    {/* Title */}
                    <Grid item xs={12} align="center"> 
                        <InputField style={{width: '750px'}} name="title" label="Title" value={newJob.title} onChange={handleInput}/>
                    </Grid>
                    {/* Description */}
                    <Grid item xs={12} align="center"> 
                        <InputField multiline style={{width: '750px'}} name="description" label="Description" value={newJob.description} onChange={handleInput}/>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{justifyContent: "center"}}>
                <Button variant="outlined" onClick={handleClose}>Close</Button>
                {createdJob && Object.keys(createdJob).length !== 0 ?   
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

            <Portal>
                {/* Notification Snackbar */}
                <Snackbar
                    anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                    open={snack}
                    autoHideDuration={12000}
                    onClose={(e) => setSnack(false)}
                    >
                    <Alert onClose={(e) => setSnack(false)} severity={snackVariant} sx={{width: '100%'}}>{snackMessage}</Alert>
                </Snackbar>
            </Portal>
            
        </Dialog>
    );
}

export default CreateDialog