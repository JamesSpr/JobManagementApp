import React, { useState, useEffect, useCallback }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Typography, Box, Tooltip, CircularProgress, Portal, IconButton, } from '@mui/material';
import { useParams, useNavigate } from "react-router-dom";
import EstimateModule from './estimate/Tabs';
// import useEstimate from './estimate/useEstimate';
import useAuth from '../auth/useAuth';
import useApp from '../../context/useApp';
import { usePrompt } from '../../hooks/promptBlocker';
import produce from 'immer';
import { Footer, InputField, SnackBar } from '../../components/Components';

import Settings from '@mui/icons-material/Settings';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { openInNewTab } from '../../components/Functions';
import { jobAllQuery } from './Queries';
import SettingsDialog from './SettingsDialog';
import { ClientType, ContactType, EmployeeType, InvoiceType, JobStageType, JobType, LocationType, SnackType } from '../../types/types';

const JobPage = () => { 
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    const { id } = useParams();

    if(!id) {
        navigate('/missing', { replace: true, state: {missing: "job"} });
        return;
    }
    
    const { auth } = useAuth();
    const { setApp } = useApp();
    // const { estimateSet, setEstimateSet } = useEstimate();
    // const [estimateSet, setEstimateSet] = useState();

    const [snack, setSnack] = useState<SnackType>({active: false, message:"", variant:'info'})
    const [job, setJob] = useState<JobType>({
        myobUid: '',
        id: '',
        po: '',
        sr: '',
        otherId: '',
        client: '',
        location: '',
        building: '',
        detailedLocation: '',
        stage: '',
        title: '',
        priority: '',
        dateIssued: '',
        requester: '',
        pocName: '',
        pocPhone: '',
        pocEmail: '',
        altPocName: '',
        altPocPhone: '',
        altPocEmail: '',
        description: '',
        specialInstructions: '',
        inspectionBy: '',
        inspectionDate: '',
        inspectionNotes: '',
        scope: '',
        workNotes: '',
        siteManager: '',
        commencementDate: '',
        completionDate: '',
        totalHours: 0,
        bsafeLink: '',
        overdueDate: '',
        closeOutDate: '',
        workType: '',
        opportunityType: '',
        cancelled: false,
        cancelReason: '',
        estimateSet: [],
        billSet: [],
        jobinvoiceSet: {invoice: []},
    })

    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [clients, setClients] = useState<ClientType[]>([]);
    const [clientContacts, setClientContacts] = useState<ContactType[]>([]);
    const [locations, setLocations] = useState<LocationType[]>([]);
    const [jobStages, setJobStages] = useState<JobStageType[]>([]);
    // const [bills, setBills] = useState([]);
    // const [initialEstimate, setInitialEstimate] = useState([]);
    const [invoice, setInvoice] = useState<InvoiceType>({number: '', dateCreated: '', dateIssued:'', datePaid:''});
    const [stage, setStage] = useState<string>('')

    const [waiting, setWaiting] = useState({'save': false, 'invoice': false, 'invoiceSubmit': false, 'closeout': false, 'myobLink': false, 'compDocs': false, 'generateInvoice': false});
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [titleChange, setTitleChange] = useState(false);
    const [settingsDialog, setSettingsDialog] = useState(false);


    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    // let saveCommand = false;
    const handleKeyPress = useCallback((e: { code: string; metaKey: any; ctrlKey: any; preventDefault: () => void; }) => {
        if (e.code === 'KeyS' && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            // console.log(saveCommand)
            // if(!saveCommand) {
                
            //     console.log("Updating")
            //     saveCommand = true;
            //     handleUploadChanges();
            // }
        }
    }, [])

    useEffect(() => {
        // Attach event listener
        document.addEventListener('keydown', handleKeyPress);
        
        // Remove event listener
        return () => {
            document.addEventListener('keydown', handleKeyPress)
        }
    }, [handleKeyPress]);

    // // Update is required when data changes
    // useEffect(() => {
    //     setUpdateRequired(true);
    // }, [job, estimateSet])

    let id_po = "";
    let id_sr = "";
    let id_other = "";

    if(id.includes('PO')) {
        id_po = id.substring(2);
    } 
    else if (id.includes('SR')) {
        id_sr = id.substring(2);
    } 
    else {
        id_other = id;
    }

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: jobAllQuery(),
                    variables: {
                        po: id_po,
                        sr: id_sr,
                        otherId: id_other
                    },
            }),
            }).then((response) => {
                const job_data = response?.data?.data?.job_all?.edges[0]?.node;
                const location_data = response?.data?.data?.locations;
                const clients = response?.data?.data?.clients;
                const clientContacts = response?.data?.data?.clientContacts;
                const jobStages = response?.data?.data.__type?.enumValues;
                
                location_data ? setLocations(location_data) : [];
                clients ? setClients(clients) : [];
                clientContacts ? setClientContacts(clientContacts) : [];

                const users = response?.data?.data?.users.edges.map((user: { node: any; }) => {return user.node})
                // Sort users
                users.sort((a: { firstName: string; }, b: { firstName: string; }) => {
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

                users ? setEmployees(users) : [];
                jobStages ? setJobStages(jobStages) : [];

                if(!job_data) {  
                    navigate('/missing', { replace: true, state: {missing: "job"} });
                }

                // Flatten objects for field values
                job_data['location'] = job_data?.location?.id ?? "";
                job_data['client'] = job_data?.client?.id ?? "";
                job_data['requester'] = job_data?.requester?.id ?? "";
                job_data['inspectionBy'] = job_data?.inspectionBy?.id ?? "";
                job_data['siteManager'] = job_data?.siteManager?.id ?? "";

                // Correct null date values
                job_data['inspectionDate'] = job_data?.inspectionDate ?? "";
                job_data['commencementDate'] = job_data?.commencementDate ?? "";
                job_data['completionDate'] = job_data?.completionDate ?? "";
                job_data['closeOutDate'] = job_data?.closeOutDate ?? "";
                job_data['overdueDate'] = job_data?.overdueDate ?? "";

                setJob(job_data);
                // setBills(job_data.billSet);
                // setInitialEstimate(job_data.estimateSet);
                // setEstimateSet(job_data.estimateSet);
                
                setInvoice(job_data?.jobinvoiceSet[0]?.invoice ?? false);
                jobStages.map((values: JobStageType) => {
                    if(job_data.stage === values['name']){
                        setStage(values['description'])
                    }
                })

                setLoading(false);
                setUpdateRequired(false);
                setTitleChange(true);

            }).catch((err) => {
                // TODO: handle error
                if(err.name === "CanceledError") {
                    return
                }
                console.log("Error:", err);
            });
        }
        fetchData();

        return () => {
            controller.abort();
        }
    }, []);

    useEffect(() => {
        // console.log("Changing App Title", getJobName(), stage)
        setApp((prev: any) => ({...prev, title: getJobName(), subTitle: stage}));
        setTitleChange(false);
    }, [titleChange])

    const handleUploadChanges = async () => {
        let partialError = false;
        setWaiting(prev => ({...prev, 'save': true}));

        // Remove unwanted values from job state for backend
        let {jobinvoiceSet:_, myobUid:__, estimateSet:___, stage:____, billSet: _____, ...jobInput} = job

        // Define formats before sending to backend
        job['dateIssued'] === "" ? jobInput['dateIssued'] = new Date(0).toISOString().split('T')[0] : null;
        job['inspectionDate'] === "" ? jobInput['inspectionDate'] = new Date(0).toISOString().split('T')[0] : null;
        job['commencementDate'] === "" ? jobInput['commencementDate'] = new Date(0).toISOString().split('T')[0] : null;
        job['completionDate'] === "" ? jobInput['completionDate'] = new Date(0).toISOString().split('T')[0] : null;
        job['overdueDate'] === "" ? jobInput['overdueDate'] = new Date(0).toISOString().split('T')[0] : null;
        job['closeOutDate'] === "" ? jobInput['closeOutDate'] = new Date(0).toISOString().split('T')[0] : null;
        job['totalHours'] === null ? jobInput['totalHours'] = 0 : null;

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: `mutation updateJob ($input: JobInput!) { 
                update: updateJob(input: $input)
                {
                    success
                    message
                }
            }`,
            variables: {
                input: jobInput,
            },
        }),
        }).then((response) => {
            console.log("upload_job", response);
            // console.log("Job Upload Complete");
            setWaiting(prev => ({...prev, 'save': false}));
            if(response?.data?.errors || !response?.data?.data?.update.success) {
                partialError = true;
                setSnack({active: true, variant:'error', message: "Job Upload Error: " + response.data.errors[0].message})
            }
        }).catch((err) => {
            console.log('job upload error', err);
            partialError = true;
            setSnack({active: true, variant:'error', message: "Error: " + err.response?.data?.errors[0]?.message})
            setWaiting(prev => ({...prev, 'save': false}));
        })

        // If a date is removed from an estimate, make sure it is null before sending to api.
        const cleanEstimateSet = job?.estimateSet?.map((est: { approvalDate: string; issueDate: string; }) => {
            const newEstimate = produce(est, (draft: { approvalDate: null; issueDate: null; }) => {
                est.approvalDate === "" ? draft.approvalDate = null : null;
                est.issueDate === "" ? draft.issueDate = null : null;
            })
            return newEstimate;
        })

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createEstimateFromSet ( $estimateSet: [EstimateInput]!, $jobId: String! ) { 
                create_estimate_from_set: createEstimateFromSet( estimateSet: $estimateSet, jobId: $jobId)
                {
                    success
                    message
                    job {
                        stage
                        estimateSet {
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
                }
            }`,
            variables: {
                estimateSet: cleanEstimateSet,
                jobId: job.id,
            },
        }),
        }).then((response) => {
            // console.log(response);
            const res = response?.data?.data?.create_estimate_from_set;
            if(res.success) {
                setJob(prev => ({...prev, estimateSet: res.job.estimateSet}))
                // setEstimateSet(res.job.estimateSet);
                
                // Update Job Stage
                jobStages.map((values) => {
                    res?.job?.stage === values['name'] ? 
                        setStage(values['description']) : null;
                })
                setTitleChange(true);

                if(!partialError) {
                    setSnack({active: true, variant:'success', message: res.message})
                    setUpdateRequired(false);
                }
                // TODO: Update the id of any new jobs.
            } 
            else {
                setSnack({active: true, variant:'error', message: "Estimate Upload Error: " + res.message})
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, 'save': false}));
        });
    }

    const handleCloseOut = async () => {
        setWaiting(prev => ({...prev, 'closeout': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation closeOutEmail ($jobid: String!) { 
                    close_out_email: closeOutEmail(jobid: $jobid)
                {
                    success
                    message
                }
            }`,
            variables: {
                jobid: job.id,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.close_out_email;
            setStage("Invoicing");
            setTitleChange(true);
            
            if(res.success) {
                setJob(prev => ({...prev, 'closeOutDate': new Date().toISOString().slice(0, 10)}));
                setSnack({active: true, variant:'success', message: res.message});
                setUpdateRequired(false);
            }
            else {
                setSnack({active: true, variant:'error', message: "Email Error: " + res.message})
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, 'closeout': false}));
        });
    }

    const handleCreateInvoice = async () => {
        setWaiting(prev => ({...prev, 'invoice': true}))

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobCreateInvoice($uid:String!, $job:String!) {
                    myob_create_invoice: myobCreateInvoice(uid:$uid, job:$job) {
                        success
                        message
                        number
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    job: job.po,
                }
            })
        }).then((response) => {
            // console.log(response);
            const res = response.data?.data?.myob_create_invoice;

            if(res.success) {
                // console.log(res.message)
                const result = JSON.parse(res.message);
                setSnack({active: true, variant:'success', message:result})
                setInvoice(prev => ({...prev, "number": res.number, "dateCreated": new Date().toISOString().slice(0, 10)}))
            }
            else {
                // console.log(response);
                setSnack({active: true, variant:'error', message: "Invoice Error: " + res.message})
            }
        }).catch((response) => {
            setSnack({active: true, variant:'error', message: "Error Creating Invoice. Contact Developer"})
            console.log("Error", response);
        }).finally(() => {
            setWaiting(prev => ({...prev, 'invoice': false}));
        });
    }

    const handleSubmitInvoice = async () => {
        setWaiting(prev => ({...prev, 'invoiceSubmit': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation convertSale($uid:String!, $invoices: [InvoiceInput]!) {
                    convert_sale: convertSale(uid: $uid, invoices: $invoices) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    invoices: [{
                        "number": invoice.number,
                        "dateIssued": new Date().toISOString().slice(0, 10)
                    }],
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.convert_sale;

            if(res.success){
                setSnack({active: true, variant:'success', message:"Invoice Converted & Submission Tracked"})
                setInvoice(prev => ({...prev, "dateIssued": new Date().toISOString().slice(0, 10)}))
            }
            else {
                setSnack({active: true, variant:'error', message: "Error: " + res.message})
            }           
        }).finally(() => {
            setWaiting(prev => ({...prev, 'invoiceSubmit': false}));
        })
    }

    const getJobName = () => {
        let identifier = "PO" + job.po;
        if(job.po == ''){
            if(job.otherId && job.otherId.includes("VP")) {
                identifier = job.otherId
            }
            else if ( job.sr != '') {
                identifier = "SR" + job.sr;
            }
            else if (job.otherId != '') {
                identifier = job.otherId;
            }
        }

        let build = job.building + " ";
        if(job.building !== "" && !isNaN(parseFloat(job.building))) {
            build = "B" + job.building + " ";
        }
        if(job.building === "") {
            build = "";
        }

        let loc = locations[locations.findIndex(element => {
            if(element.id == job.location) {
                return true;
            }
            return false;
        })];
        
        const path = identifier + " - " + loc?.name + " - "  + build + job.title;
        return path;
    }

    const sendJobToMyob = async () => {
        setWaiting(prev => ({...prev, 'myobLink': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobCreateJob($uid:String!, $jobId:String!) {
                    create: myobCreateJob(uid:$uid, jobId:$jobId) {
                        success
                        message
                        uid
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    jobId: job.id
                }
            })
        }).then((response) => {
            const res = response.data?.data?.create;
           
            if(res.success) {
                setJob(prev => ({...prev, 'myobUid': res.uid}));
                setSnack({active: true, variant:'success', message: JSON.parse(res.message)})
                setUpdateRequired(false);
            }
            else {
                setSnack({active: true, variant:'error', message: "Invoice Error: " + JSON.parse(res.message)})
                console.log("Error", JSON.parse(res.message) ?? "");
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, 'myobLink': false}));
        });
    }

    const handleCreateCompletionDocuments = async () => {
        setWaiting(prev => ({...prev, 'compDocs': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createCompletionDocuments($jobId:String!) {
                    create_completion_documents: createCompletionDocuments(jobId:$jobId) {
                        success
                        message
                    }
                }`,
                variables: {
                    jobId: job.id
                }
            })
        }).then((response) => {
            const res = response.data?.data?.create_completion_documents;

            if(res.success) {
                setSnack({active: true, variant:'success', message: res.message})
            }
            else {
                setSnack({active: true, variant:'error', message: "Error: " + res.message})
                console.log("Error",res.message);
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, 'compDocs': false}));
        })
    }

    const handleInput = (e: { target: { name?: any; value?: any; }; }) => {
        setJob(prev => ({...prev, [e.target.name]: e.target.value}))
        setUpdateRequired(true);
    }
 
    return (
        <>
        {loading?
            <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                <CircularProgress />
            </Box>
        :
        <>
            <Grid container spacing={2} direction={'column'} alignItems={'center'}>
                {/* Request Details */}
                <Grid item xs={12} >
                    <InputField type="select" name="client" label="Client" value={job.client} onChange={handleInput}>
                        <option key={"blank_client"} value={''}></option>
                        {clients?.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))} 
                    </InputField>
                    <InputField type="date" name="dateIssued" label="Date Issued" value={job.dateIssued} onChange={handleInput} max="9999-12-31"/>
                    <InputField type="date" name="overdueDate" label="Overdue Date" value={job.overdueDate} onChange={handleInput} max="9999-12-31"/>
                </Grid>
                {/* Job Details */}
                <Grid item xs={12} > 
                    <InputField type="string" name="po" label="Purchase Order #" value={job.po} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                    <InputField type="string" name="sr" label="Service Request #" value={job.sr} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                    <InputField type="string" name="otherId" label="Other Id" value={job.otherId} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                </Grid>
                {/* Location & Title */}
                <Grid item xs={12} > 
                    <InputField type="select" name="location" label="Location" value={job.location} onChange={handleInput} onBlur={() => setTitleChange(true)}>
                        <option key="blank_location" value={""}></option>
                        {locations?.map((loc) => (
                            loc.client.id === job.client ? <option key={loc.id} value={loc.id}>{loc.name} ({loc.region.shortName})</option> : <></>
                        ))}
                    </InputField>
                    <InputField type="string" name="building" label="Building" value={job.building} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                    <InputField type="string" name="detailedLocation" label="Detailed Location" value={job.detailedLocation} onChange={handleInput}/>
                </Grid>
                {/* Extra Details */}
                <Grid item xs={12} >
                    <InputField type="select" label="Requester" name="requester" value={job.requester} onChange={handleInput}>
                        <option key={"blank_requester"} value={""}></option>
                        {clientContacts?.map((contact) => (
                            contact.client.id === job.client ? <option key={contact.id} value={contact.id}>{contact.firstName + " " + contact.lastName}</option> : /*&& contact.region.shortName === locations[location-1].region.shortName*/ <></>
                        ))}
                    </InputField>
                    <InputField type="string" name="priority" label="Priority" value={job.priority} onChange={handleInput}/>
                    <InputField type="string" name="specialInstructions" label="Special Instructions" value={job.specialInstructions} onChange={handleInput}/>
                </Grid>
                {/* Point of Contact */}
                <Grid item xs={12} >
                    <InputField type="string" name="pocName" label="POC Name" value={job.pocName} onChange={handleInput}/>
                    <InputField type="string" name="pocPhone" label="POC Phone" value={job.pocPhone} onChange={handleInput}/>
                    <InputField type="string" name="pocEmail" label="POC Email" value={job.pocEmail} onChange={handleInput}/>
                </Grid>
                {/* Alt Point of Contact */}
                <Grid item xs={12} > 
                    <InputField type="string" name="altPocName" label="Alt POC Name" value={job.altPocName} onChange={handleInput}/>
                    <InputField type="string" name="altPocPhone" label="Alt POC Phone" value={job.altPocPhone} onChange={handleInput}/>
                    <InputField type="string" name="altPocEmail" label="Alt POC Email" value={job.altPocEmail} onChange={handleInput}/>
                </Grid>
                {/* Title */}
                <Grid item xs={12} > 
                    <InputField type="string" width={750} name="title" label="Title" value={job.title} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                </Grid>
                {/* Description */}
                <Grid item xs={12} > 
                    <InputField type="string" multiline width={750} name="description" label="Description" value={job.description} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12} >
                    <Typography variant='body1'>Inspection Details</Typography>
                </Grid>
                {/* Priority and Date */}
                <Grid item xs={12} > 
                    <InputField type="date" name="inspectionDate" max='9999-12-31' label="Inspection Date" value={job.inspectionDate} onChange={handleInput}/>
                    <InputField type="select" name="inspectionBy" label="Inspector" value={job.inspectionBy} onChange={handleInput}>
                        <option key={"blank_inspector"} value={""}></option>
                        {employees?.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.firstName + " " + emp.lastName}</option>
                        ))}
                    </InputField>
                </Grid>
                <Grid item xs={12} >
                    <InputField type="string" multiline wide name="inspectionNotes" label="Inspection Notes" value={job.inspectionNotes} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12} >
                    <Typography variant='body1'>Quote Details</Typography>
                </Grid>
                <Grid item xs={12} >
                    <InputField type="string" multiline wide name="scope" label="General Scope of Works" value={job.scope} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12}  />
                <Grid item xs={12}  style={{overflowX: 'auto', width: '95%'}}>
                    <EstimateModule job={job} setJob={setJob} updateRequired={updateRequired} 
                        setUpdateRequired={setUpdateRequired} users={employees} 
                        snack={snack} setSnack={setSnack} />
                </Grid>
                <Grid item xs={12} >
                    <Typography variant='body1'>On-Site Details</Typography>
                </Grid>
                {/* On Site Details */}
                <Grid item xs={12} >
                    <InputField type="select" style={{width: '200px'}} name="siteManager" label="Site Manager" value={job.siteManager} onChange={handleInput}>
                        <option key={"blank_sitemanager"} value={""}></option>
                        {employees?.map((emp) => (
                            <option key={emp?.id} value={emp?.id}>{emp?.firstName + " " + emp?.lastName}</option>
                        ))}
                    </InputField>
                    <InputField type="date" style={{width: '146px'}} max='9999-12-31' name="commencementDate" label="Commencement Date" value={job.commencementDate} onChange={handleInput}/>
                    <InputField type="date" style={{width: '146px'}} max='9999-12-31' name="completionDate" label="Completion Date" value={job.completionDate} onChange={handleInput}/>
                    <InputField type="number" step={0.1} min={0} style={{width: '146px'}} name="totalHours" label="Hours" value={job.totalHours} onChange={handleInput}/>
                </Grid>
                {/* Job Notes */}
                <Grid item xs={12} > 
                    <InputField type="string" multiline wide name="workNotes" label="Notes" value={job.workNotes} onChange={handleInput}/>
                </Grid>
                {/* Close Out Details */}
                <Grid item xs={12} > 
                    <InputField type="date"  style={{width: '150px'}} max='9999-12-31' name="closeOutDate" label="Close Out Date" value={job.closeOutDate} onChange={handleInput}/>
                    <Tooltip placement="top" title={updateRequired ? "Please Save Changes" : job.commencementDate === "" || job.completionDate === "" || job.totalHours === 0 ? "Please Fill Out Completion Details" : ""}>
                        <Box style={{display:'inline-block'}}>
                            <Button variant='outlined' style={{margin: '10px'}} onClick={handleCloseOut} disabled={!(!updateRequired && job.commencementDate !== "" && job.completionDate !== "" && job.totalHours !== 0 && job.closeOutDate === "")}>Close Out</Button>
                        </Box>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} >
                    <Typography variant='body1'>Accounts Details</Typography>
                </Grid>
                <Grid item xs={12}  style={{paddingTop: '0px'}}> {/* Accounts */}
                    <Tooltip title={updateRequired ? "Please save changes" : job.closeOutDate === "" ? "Job Requires Close Out" : ""}>
                        <Box style={{position: 'relative', display: 'block', padding: '5px'}}>
                            <Button variant="outlined" 
                                style={{margin: '5px'}}
                                onClick={(() => handleCreateInvoice())}
                                disabled={invoice !== null|| job.closeOutDate === "" || updateRequired}
                                >
                                Create Invoice
                            </Button>
                            {waiting.invoice && (
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
                    </Tooltip>
                    <InputField disabled={true} width={150} type="text" label="MYOB Invoice" value={invoice?.number}/>
                    <InputField disabled={true} width={150} type="date" label="Date Invoice Created" value={invoice?.dateCreated}/>
                </Grid>
                <Grid item xs={12} > {/* Accounts */}
                    <InputField disabled={true} width={150} type="date" label="Date Invoice Issued" value={invoice?.dateIssued}/>
                    <InputField disabled={true} width={150} type="date" label="Date Invoice Paid" value={invoice?.datePaid}/>
                </Grid>
                <Grid item xs={12}  style={{paddingTop: '0px'}}> {/* Accounts */}
                    {job.client !== "1" ?
                        <Tooltip title={updateRequired ? "Please save changes" : ""}>
                            <Box sx={{ m: 1, position: 'relative' }}>
                                <Button variant="outlined" 
                                    style={{margin: '5px'}}
                                    onClick={() => handleSubmitInvoice()}
                                    disabled={invoice === null || updateRequired || invoice.dateIssued !== null}
                                    >
                                    Submitted Invoice
                                </Button>
                                {waiting.invoiceSubmit && (
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
                        </Tooltip>
                        : <></>
                    }
                </Grid>
            </Grid>
        </>
        }

        <SettingsDialog 
            open={settingsDialog} 
            setOpen={setSettingsDialog} 
            job={job}
            setJob={setJob}
            handleInput={handleInput}
            waiting={waiting}
            setWaiting={setWaiting}
            setSnack={setSnack}
        />

        <Portal>
            <SnackBar snack={snack} setSnack={setSnack} />
        </Portal>

        {/* Footer AppBar with Controls */}
        <Footer>
            <Tooltip title="Job Settings">
                <IconButton onClick={() => {setSettingsDialog(true)}}><Settings /></IconButton>
            </Tooltip>
            <Tooltip title={(!updateRequired || waiting.save) ? "No Changes have been made" : "Save Job"}>
                <Box sx={{display: 'inline-block'}}>
                    <IconButton disabled={!updateRequired || waiting.save} onClick={handleUploadChanges}>
                        <Box sx={{position: 'relative', display: 'inline-block', width: '24px', height: '24px'}}>
                            <SaveIcon />
                            {waiting.save && (
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
                    </IconButton>
                </Box>
            </Tooltip>
            <Tooltip title="Copy Folder Path">
                <IconButton onClick={() => {navigator.clipboard.writeText("Aurify\\Aurify - Maintenance\\Jobs\\" + getJobName())}}><FolderCopyIcon /></IconButton>
            </Tooltip>
            <Tooltip title={job.bsafeLink ? "Open BSAFE Work Order" : "No BSAFE Link Found"}>
                <Box sx={{display: 'inline-block'}}>
                    <Button 
                        style={{margin: '5px'}}
                        disabled={job.bsafeLink === ""}
                        onClick={() => openInNewTab(job.bsafeLink)}
                        >
                        BSAFE
                    </Button>
                </Box>
            </Tooltip>
            <Tooltip title={job.myobUid ? "Job Already Linked to MYOB" : "Link Job to MYOB"}>
                <Box sx={{position: 'relative', display: 'inline-block'}}>                                              
                    <Button 
                        disabled={job.myobUid !== null && job.myobUid !== ""}
                        onClick={sendJobToMyob}
                    >
                        MYOB
                    </Button>
                    {waiting.myobLink && (
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
            </Tooltip>
            <Tooltip title={updateRequired ? "Please save before creating documents" : "Create New Completion Documents"}>
                <Box sx={{display: 'inline-block'}}>
                    <IconButton disabled={updateRequired} onClick={handleCreateCompletionDocuments}>
                        <Box sx={{position: 'relative', display: 'inline-block', width: '24px', height: '24px'}} >
                            <NoteAddIcon />
                            {waiting.compDocs && (
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
                    </IconButton>
                </Box>
            </Tooltip>
        </Footer>
    </>
    );
}
export default JobPage;
// export default () => '';