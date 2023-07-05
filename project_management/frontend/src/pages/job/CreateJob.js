import React, { useState, useEffect } from "react";
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Typography, Box, AppBar, Toolbar, Portal, Snackbar, Alert } from '@mui/material';
import { useNavigate, useParams } from "react-router-dom";

import axios from 'axios';
import { InputField, ProgressButton } from "../../components/Components";
import JobAllocator from "../home/JobAllocator";
import { defineJobIdentifier } from "../../components/Functions";

const emptyJobState = {
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
}

const CreateJob = () => {
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const [openJobAllocator, setOpenJobAllocator] = useState(false);
    
    // Textfield Select Options
    const [clients, setClients] = useState([]);
    const [clientContacts, setClientContacts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [existingJob, setExistingJob] = useState("");
    const [newJob, setNewJob] = useState(emptyJobState)

    // API Response States
    const [createdJob, setCreatedJob] = useState(emptyJobState);
    const [snack, setSnack] = useState(false);
    const [snackVariant, setSnackVariant] = useState('');
    const [snackMessage, setSnackMessage] = useState('');
    const [waiting, setWaiting] = useState('');

    const { input } = useParams();

    useEffect(() => {
        const abortController = new AbortController()

        // Get Data
        axiosPrivate({
            method: 'post',
            source: abortController.source,
            data: JSON.stringify({
                query: `{
                    jobs {
                        po
                        sr
                        otherId
                    }
                    locations {
                        id
                        clientRef
                        name
                        client {
                            id
                        }
                    }
                    clients {
                        id
                        name
                    }
                    clientContacts {
                        id
                        firstName
                        lastName
                        client {
                            id
                        }
                    }
                    users (isStaff: true) {
                        edges {
                            node {
                                id: pk
                                firstName
                                lastName
                                email
                            }
                        }
                    }
                }`,
                variables: {}
            }),
        }).then((response) => {
            const res = response?.data?.data;
            // console.log("res", res);
            setJobs(res?.jobs)
            setUsers(res?.users);
            setLocations(res?.locations);
            setClients(res?.clients);
            setClientContacts(res?.clientContacts);

            if(input) {
                const inputObj = JSON.parse(input.replace(new RegExp("'", 'g'), "\""));
                setNewJob(prev => ({...prev,
                    'po': inputObj.po,
                    'sr': inputObj.sr,
                    'client': res.clients.find(item => item.name === inputObj.client)?.id,
                    'location': res.locations.find(item => item.clientRef === inputObj.location)?.id,
                    'building': inputObj.building,
                    'detailedLocation': inputObj.detailedLocation,
                    'title': inputObj.title,
                    'description': inputObj.description,
                    'priority': inputObj.priority,
                    'dateIssued': new Date(+inputObj.dateIssued.split("-")[2], inputObj.dateIssued.split("-")[1] - 1, ++inputObj.dateIssued.split("-")[0]).toISOString().split('T')[0] ?? null,
                    'overdueDate': new Date(+inputObj.overdueDate.split("-")[2], inputObj.overdueDate.split("-")[1] - 1, ++inputObj.overdueDate.split("-")[0]).toISOString().split('T')[0] ?? null,
                    'bsafeLink': inputObj.bsafeLink.replace(new RegExp("_", 'g'), "/") ?? "" ,
                }));
            }
        }).catch((err) => {
            if(err.code === 'ERR_CANCELLED') {
                return
            }
            console.log("Error:", err);
        });

        if(jobs.length > 0) {
            console.log("Checking existing jobs")
            
            jobs.map(job => {
                console.log(job.po, newJob.po)
                if (job.po === newJob.po) {
                    setExistingJob("PO" + job.po)
                }
                if(job.sr === newJob.sr) {
                    setExistingJob("SR" + job.sr)
                }
                if(job.otherId === newJob.otherId) {
                    setExistingJob(job.otherId)
                }
            })
                
            
        }

        return () => {
            abortController.abort();
        }
    }, []);

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
                const res = response?.data?.data.create_job;
                // console.log(res);

                setSnack(true);            
                setWaiting(false);

                if(res.success) {
                    setSnackVariant('success');
                    setSnackMessage('Job Created Successfully');
                    setCreatedJob(res.job);
                }
                else {
                    setSnackVariant('error');
                    setSnackMessage('Upload Error: ' + res.message);
                }
            });
        } catch (err) {
            console.log(err);
            setWaiting(false);
            setSnack(true);
            setSnackVariant('error');
            setSnackMessage('Server Error: Please Contact Support\n' + err);
        }
    }

    const handleInput = (e) => {
        setNewJob(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return (
        <>
            <Grid container spacing={3} style={{marginTop: '0px'}}>
                <Typography variant="h6" style={{margin: '10px auto'}}>Create New Job</Typography>
                {existingJob ?
                    <Grid item xs={12} align="center">
                        <Typography variant="subtitle1" style={{margin: '10px auto'}}>It looks like this may already be a job - {existingJob}</Typography>
                    </Grid> : <></>
                }   
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
                <Grid item xs={12} align="center"> {/* Description */}
                    {snackVariant === "success" ? <>
                        <Button variant="outlined"
                            style={{margin: '5px'}}
                            onClick={(e) => {navigate('/job/edit/' + defineJobIdentifier(createdJob), { replace: true })}}
                            >
                            Go To Job
                        </Button>
                        <Button variant="outlined"
                            style={{margin: '5px'}}
                            onClick={(e) => {setOpenJobAllocator(true)}}
                            >
                            Email Details
                        </Button>
                    </>
                    : <></>
                    }
                </Grid>
            </Grid>
            
            <JobAllocator open={openJobAllocator} onClose={() => setOpenJobAllocator(false)} job={createdJob.id} users={users.edges} snack={{setSnack, setSnackMessage, setSnackVariant}}/>

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

            {/* Footer AppBar with Controls */}
            <Box sx={{ flexGrow: 1}}>
                <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
                style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                    <Toolbar style={{minHeight: '50px'}}>
                        <ProgressButton centerButton name="Create" waiting={waiting} onClick={handleCreate} />
                    </Toolbar>
                </AppBar>
            </Box>
        </>
    )
}

export default CreateJob;