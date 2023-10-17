import React, { useState, useEffect } from "react";
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Typography, Box, AppBar, Toolbar, Portal, Snackbar, Alert } from '@mui/material';
import { useNavigate, useParams } from "react-router-dom";

import { InputField, ProgressButton, SnackBar } from "../../components/Components";
import JobAllocator from "../home/JobAllocator";
import { defineJobIdentifier, openInNewTab } from "../../components/Functions";
import { blankClient, blankJob, blankLocation, jobQueryData } from "./Queries";
import { ClientType, ContactType, EmployeeType, JobType, LocationType, SnackType } from "../../types/types";

const CreateJob = () => {
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const [openJobAllocator, setOpenJobAllocator] = useState(false);
    
    // Textfield Select Options
    const [clients, setClients] = useState<ClientType[]>([]);
    const [clientContacts, setClientContacts] = useState<ContactType[]>([]);
    const [locations, setLocations] = useState<LocationType[]>([]);
    const [users, setUsers] = useState<EmployeeType[]>([]);
    const [jobs, setJobs] = useState<JobType[]>([]);
    const [newJob, setNewJob] = useState<JobType>(blankJob)
    const [jobCreated, setJobCreated] = useState(false);
    const [snack, setSnack] = useState<SnackType>({active: false, variant:'error', message:''})
    const [waiting, setWaiting] = useState(false);

    const { input } = useParams();

    useEffect(() => {
        const abortController = new AbortController()

        const fetchData = async () => {
            // Get Data
            await axiosPrivate({
                method: 'post',
                signal: abortController.signal,
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
                            active
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
                setJobs(res?.jobs)

                const users = res?.users.edges.map((user: any) => {return user.node})
                // Sort users
                users.sort((a: EmployeeType, b: EmployeeType) => {
                    // ignore case
                    const nameA = a.firstName.toUpperCase(); 
                    const nameB = b.firstName.toUpperCase();
                    if (nameA > nameB) {
                    return 1;
                    }
                    if (nameA < nameB) {
                    return -1;
                    }
                
                    // names must be equal
                    return 0;
                });

                setUsers(users);
                setLocations(res?.locations);
                setClients(res?.clients);
                setClientContacts(res?.clientContacts);

                if(input) {
                    const inputObj = JSON.parse(input.replace(new RegExp("'", 'g'), "\""));
                    setNewJob(prev => ({...prev,
                        po: inputObj.po,
                        sr: inputObj.sr,
                        client: {...blankClient, id: res.clients.find((item: ClientType) => item.name === inputObj.client)?.id ?? ''},
                        location: {...blankLocation, id: res.locations.find((item: LocationType) => item.clientRef === inputObj.location)?.id ?? ''},
                        building: inputObj.building,
                        priority: inputObj.priority,
                        dateIssued: inputObj.dateIssued ?? null,
                        overdueDate: inputObj.overdueDate ?? null,
                        bsafeLink: inputObj.bsafeLink.replace(new RegExp("_", 'g'), "/") ?? "" ,
                    }));
                    setCheckJob(true);
                }

            }).catch((err) => {
                console.log(err)
                setSnack({active: true, variant: 'error', message: 'Error Fetching Data. Contact Developer'})
            });
        }
        fetchData();

        return () => {
            abortController.abort();
        }
    }, []);

    const handleCreate = async () => {
        setWaiting(true);

        // Remove unwanted values from job state for backend
        let {invoiceSet:_, myobUid:__, stage:____, billSet: _____, ...jobInput} = newJob
        // Define formats before sending to backend
        newJob['inspectionDate'] === "" ? jobInput['inspectionDate'] = null : null;
        newJob['commencementDate'] === "" ? jobInput['commencementDate'] = null : null;
        newJob['completionDate'] === "" ? jobInput['completionDate'] = null : null;
        newJob['overdueDate'] === "" ? jobInput['overdueDate'] = null : null;
        newJob['closeOutDate'] === "" ? jobInput['closeOutDate'] = null : null;
        newJob['totalHours'] === null ? jobInput['totalHours'] = 0 : null;

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createJob($input:JobInput!) {
                    create: createJob(input:$input) {
                        success
                        message
                        updated
                        job {
                            ${jobQueryData}                    
                        }
                    } 
                }`,
                variables: {
                    input: jobInput
                }
            })
        }).then((response) => {
            const res = response.data.data.create;
            console.log(res)

            if(res.success) {
                setSnack({active: true, variant: 'success', message: 'Job Created Successfully'})
                setNewJob(res.job);
                setJobCreated(true);
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
    
    const [duplicate, setDuplicate] = useState<JobType | null>(null);
    const [checkJob, setCheckJob] = useState(false);
    
    useEffect(() => {

        const foundPO = jobs.find(job  => newJob.po && job.po === newJob.po);
        const foundSR = jobs.find(job  => newJob.sr && job.sr === newJob.sr);
        const foundOther = jobs.find(job  => newJob.otherId && job.otherId === newJob.otherId);

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

    return (
        <>
            <Grid container spacing={3} direction={'column'} alignItems={'center'}>
                <Typography variant="h6" style={{margin: '10px auto'}}>Create New Job</Typography>
                { duplicate && 
                    <span className='centreSpan' onClick={() => openInNewTab('/job/edit/' + defineJobIdentifier(duplicate))}>
                        <p className="linkText">Job Exists in System, Click to View</p>
                    </span>
                }
                {/* Request Details */}
                <Grid item xs={12}>
                    <InputField type="select" key="clientSelect" name="client" label="Client" value={newJob.client?.id ?? ''} onChange={handleSelection}>
                        <option key={"blank_client"} value={''}></option>
                        {clients?.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))} 
                    </InputField>
                    <InputField name="dateIssued" type="datetime-local" max='9999-12-31T23:59:59' label="Date Issued" value={newJob.dateIssued} onChange={handleDateInput} />
                    <InputField name="overdueDate" type="datetime-local" max='9999-12-31T23:59:59' label="Overdue Date" value={newJob.overdueDate} onChange={handleDateInput} />
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
                <Grid item xs={12}> {/* Description */}
                    {jobCreated ? <>
                        <Button variant="outlined"
                            style={{margin: '5px'}}
                            onClick={(e) => {navigate('/job/edit/' + defineJobIdentifier(newJob), { replace: true })}}
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
            
            <JobAllocator open={openJobAllocator} onClose={() => setOpenJobAllocator(false)} job={newJob.id} users={users} setSnack={setSnack}/>

            <SnackBar snack={snack} setSnack={setSnack} />

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