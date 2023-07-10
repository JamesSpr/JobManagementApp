import React, { useState, useEffect, useCallback }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Typography, Box, AppBar, Toolbar, Tooltip, Checkbox, CircularProgress, Portal, Snackbar, Alert, IconButton, 
    DialogActions, DialogContent, DialogTitle, Dialog} from '@mui/material';
import { useParams, useNavigate } from "react-router-dom";
import EstimateModule from './estimate/Tabs';
import useEstimate from './estimate/useEstimate';
import axios from 'axios';
import useAuth from '../auth/useAuth';
import useApp from '../../context/useApp';
import { usePrompt } from '../../hooks/promptBlocker';
import produce from 'immer';
import { InputField } from '../../components/Components';

import Settings from '@mui/icons-material/Settings';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { openInNewTab } from '../../components/Functions';

const JobPage = () => { 
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    const { id } = useParams();

    if(!id) {
        navigate('/missing', { replace: true, state: {missing: "job"} });
    }
    
    const { auth } = useAuth();
    const { setApp } = useApp();
    const { estimateSet, setEstimateSet } = useEstimate();

    const [job, setJob] = useState({
        'myobUid': '',
        'id': '',
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
        'inspectionBy': '',
        'inspectionDate': '',
        'inspectionNotes': '',
        'scope': '',
        'workNotes': '',
        'siteManager': '',
        'commencementDate': '',
        'completionDate': '',
        'totalHours': '',
        'bsafeLink': '',
        'overdueDate': '',
        'closeOutDate': '',
        'workType': '',
        'opportunityType': '',
        'cancelled': false,
        'cancelReason': '',
    })

    const [employees, setEmployees] = useState([]);
    const [clients, setClients] = useState([]);
    const [clientContacts, setClientContacts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [jobStages, setJobStages] = useState([]);
    const [bills, setBills] = useState([]);
    const [initialEstimate, setInitialEstimate] = useState([]);
    const [invoice, setInvoice] = useState({'number': '', 'dateCreated': '', 'dateIssued':'', 'datePaid':''});
    const [stage, setStage] = useState()

    const [loading, setLoading] = useState(true);
    const [waiting, setWaiting] = useState({'save': false, 'invoice': false, 'invoiceSubmit': false, 'closeout': false, 'myobLink': false, 'compDocs': false, 'generateInvoice': false});
    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');
    const [updateRequired, setUpdateRequired] = useState(false);
    const [titleChange, setTitleChange] = useState(false);
    const [settingsDialog, setSettingsDialog] = useState(false);

    // let saveCommand = false;
    const handleKeyPress = useCallback((e) => {
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

    // Update is required when data changes
    useEffect(() => {
        setUpdateRequired(true);
    }, [job, estimateSet])

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
                query: `query jobAll($po:String!, $sr:String!, $otherId:String!){
                    job_all: jobAll(po: $po, sr: $sr, otherId: $otherId){
                        edges {
                            node {
                                myobUid
                                id
                                po
                                sr
                                otherId
                                client {
                                    id
                                }
                                requester {
                                    id
                                }
                                location {
                                    id
                                }
                                building
                                detailedLocation
                                title
                                priority
                                description
                                specialInstructions
                                scope
                                pocName
                                pocPhone
                                pocEmail
                                altPocName
                                altPocPhone
                                altPocEmail
                                dateIssued
                                inspectionBy {
                                    id
                                }
                                inspectionDate
                                inspectionNotes
                                siteManager {
                                    id
                                }
                                commencementDate
                                completionDate
                                totalHours
                                workNotes
                                closeOutDate
                                overdueDate
                                bsafeLink 
                                cancelled
                                cancelReason
                                overdueDate
                                stage
                                opportunityType
                                workType
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
                                        subRows: estimateitemSet {
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
                                billSet {
                                    myobUid
                                    supplier {
                                        name
                                    }
                                    invoiceNumber
                                    invoiceDate
                                    amount
                                    processDate
                                    imgPath
                                }
                                jobinvoiceSet {
                                    id
                                    invoice {
                                        number
                                        dateCreated
                                        dateIssued
                                        datePaid
                                    }
                                }
                            }
                        }
                    }
                    __type(name:"JobStage"){
                        name
                        enumValues {
                            name
                            description
                        }
                    }
                    locations {
                        id
                        name
                        region {
                            shortName
                            email
                        }
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
                        region {
                            shortName
                        }
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
                            }
                        }
                    }
                }`,
                variables: {
                    po: id_po,
                    sr: id_sr,
                    otherId: id_other
                },
            }),
            }).then((response) => {
                // console.log(response);
                const job_data = response?.data?.data?.job_all?.edges[0]?.node;
                const location_data = response?.data?.data?.locations;
                const clients = response?.data?.data?.clients;
                const clientContacts = response?.data?.data?.clientContacts;
                const jobStages = response?.data?.data.__type?.enumValues;
                
                location_data ? setLocations(location_data) : [];
                clients ? setClients(clients) : [];
                clientContacts ? setClientContacts(clientContacts) : [];

                const users = response?.data?.data?.users.edges.map((user) => {return user.node})
                // Sort users
                users.sort((a, b) => {
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

                //Flatten objects for field values
                job_data['location'] = job_data?.location?.id ?? "";
                job_data['client'] = job_data?.client?.id ?? "";
                job_data['requester'] = job_data?.requester?.id ?? "";
                job_data['inspectionBy'] = job_data?.inspectionBy?.id ?? "";
                job_data['siteManager'] = job_data?.siteManager?.id ?? "";

                //Correct null date values
                job_data['inspectionDate'] = job_data?.inspectionDate ?? "";
                job_data['commencementDate'] = job_data?.commencementDate ?? "";
                job_data['completionDate'] = job_data?.completionDate ?? "";
                job_data['closeOutDate'] = job_data?.closeOutDate ?? "";
                job_data['overdueDate'] = job_data?.overdueDate ?? "";

                setJob(job_data);
                setBills(job_data.billSet);
                setInitialEstimate(job_data.estimateSet);
                setEstimateSet(job_data.estimateSet);
                // setInvoiceRef(job_data?.jobinvoiceSet[0]?.id ?? false);
                setInvoice(job_data?.jobinvoiceSet[0]?.invoice ?? false);
                jobStages.map((values) => {
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
        console.log("Changing App Title", getJobName(), stage)
        setApp(prev => ({...prev, title: getJobName(), subTitle: stage}));
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
        job['totalHours'] === "" ? jobInput['totalHours'] = 0 : null;

        try {
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
                if(response?.data?.errors) {
                    partialError = true;
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Job Upload Error: " + response.data.errors[0].message);
                }
                else if(!response?.data?.data?.update.success) {
                    partialError = true;
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Job Upload Error: " + response?.data?.data?.update.message);
                }
            });
        } catch (err) {
            console.log('job upload error', err);
            partialError = true;
            setSnack(true);
            setSnackVariant('error');
            setSnackMessage("Error: " + err.response?.data?.errors[0]?.message);
            setWaiting(prev => ({...prev, 'save': false}));
        }

        // If a date is removed from an estimate, make sure it is null before sending to api.
        const cleanEstimateSet = estimateSet.map(est => {
            const newEstimate = produce(est, draft => {
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
                                subRows: estimateitemSet {
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
            console.log(response);
            const res = response?.data?.data?.create_estimate_from_set;
            setWaiting(prev => ({...prev, 'save': false}));
            setSnack(true);
            if(res.success) {
                setEstimateSet(res.job.estimateSet);
                
                // Update Job Stage
                jobStages.map((values) => {
                    res?.job?.stage === values['name'] ? 
                        setStage(values['description']) : null;
                })
                setTitleChange(true);

                if(!partialError) {
                    setSnackVariant('success');
                    setSnackMessage(res.message);
                    setUpdateRequired(false);
                }
                // TODO: Update the id of any new jobs.
            } 
            else {
                setSnackVariant('error');
                setSnackMessage("Estimate Upload Error: " + res.message);
            }
        });
    }

    const handleCloseOut = async () => {
        setWaiting(prev => ({...prev, 'closeout': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation closeOutEmail ( 
                    $jobid: String!
                )
                { close_out_email: closeOutEmail(jobid: $jobid)
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
            
            setWaiting(prev => ({...prev, 'closeout': false}));
            setSnack(true);
            setStage("Invoicing");
            setTitleChange(true);
            
            if(res.success) {
                setJob(prev => ({...prev, 'closeOutDate': new Date().toISOString().slice(0, 10)}));
                setSnackVariant('success');
                setSnackMessage(res.message);
                setUpdateRequired(false);
            }
            else {
                setSnackVariant('error');
                setSnackMessage("Email Error: " + res.message);
            }
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
            console.log(response);
            const res = response.data?.data?.myob_create_invoice;

            if(res.success) {
                // console.log(res.message)
                const result = JSON.parse(res.message);
                setSnackVariant('success');
                setSnackMessage(result);
                setInvoice(prev => ({...prev, "number": res.number}))
                setInvoice(prev => ({...prev, "dateCreated": new Date().toISOString().slice(0, 10)}))
            }
            else {
                // console.log(response);
                setSnackVariant('error');
                setSnackMessage("Invoice Error: " + res.message);
            }
        }).catch((response) => {
            console.log("Error", response);
            setSnackVariant('error');
            setSnackMessage("Error Creating Invoice. Contact Admin");
        }).finally(() => {
            setWaiting(prev => ({...prev, 'invoice': false}));
            setSnack(true);
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
                setSnackVariant('success');
                setSnackMessage("Invoice Converted & Submission Tracked");
                setInvoice(prev => ({...prev, "dateIssued": new Date().toISOString().slice(0, 10)}))
            }
            else {
                setSnackVariant('error');
                setSnackMessage("Error: " + res.message);
            }           
        }).finally(() => {
            setSnack(true);
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
        if(job.building !== "" && !isNaN(job.building)) {
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
            console.log("response", response);
            const res = response.data?.data?.create;

            setWaiting(prev => ({...prev, 'myobLink': false}));
            setSnack(true);

            if(res.success) {
                // console.log(res.message)
                // console.log("Jobs:", JSON.parse(res.message));
                setJob(prev => ({...prev, 'myobUid': res.uid}));
                setSnackVariant('success');
                setSnackMessage(JSON.parse(res.message));
                setUpdateRequired(false);
            }
            else {
                // console.log("Error!", JSON.parse(res.message) ?? "");
                setSnackVariant('error');
                setSnackMessage("Invoice Error: " + JSON.parse(res.message));
            }
        })
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
            // console.log("success", response);
            const res = response.data?.data?.create_completion_documents;

            setWaiting(prev => ({...prev, 'compDocs': false}));
            setSnack(true);

            if(res.success) {
                setSnackVariant('success');
                setSnackMessage(res.message);
            }
            else {
                // console.log("Error!", JSON.parse(res.message) ?? "");
                setSnackVariant('error');
                setSnackMessage("Error: " + res.message);
            }
        })
    }

    const checkFolder = async () => {

        setWaiting(prev => ({...prev, 'checkFolder': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation checkFolder($jobId:String!) {
                    check_folder: checkFolder(jobId:$jobId) {
                        success
                        message
                    }
                }`,
                variables: {
                    jobId: job.id
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.check_folder;

            setWaiting(prev => ({...prev, 'checkFolder': false}));
            setSnack(true);

            if(res.success) {
                // console.log(res.message)
                // console.log("Jobs:", JSON.parse(res.message));
                setSnackVariant('success');
                setSnackMessage(res.message);
            }
            else {
                // console.log("Error!", JSON.parse(res.message) ?? "");
                setSnackVariant('info');
                setSnackMessage(res.message);
            }
        })
    }

    const repairMyobSync = async () => {
        setWaiting(prev => ({...prev, 'repairMyobSync': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation repairSync($uid:String!, $jobId:String!) {
                    repair_sync: repairSync(uid:$uid, jobId:$jobId) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    jobId: job.id,
                }
            })
        }).then((response) => {
            console.log(response);
            const res = response.data?.data?.repair_sync;

            setWaiting(prev => ({...prev, 'repairMyobSync': false}));
            setSnack(true);

            if(res.success) {
                setSnackVariant('success');
                setSnackMessage(res.message);
            }
            else {
                setSnackVariant('error');
                setSnackMessage(res.message);
            }
        })

    }

    const generateInvoice = async () => {

        setWaiting(prev => ({...prev, 'generateInvoice': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation generateInvoice($uid:String!, $job:String!) {
                    generate_invoice: generateInvoice(uid:$uid, job:$job) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    job: job.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.generate_invoice;

            setWaiting(prev => ({...prev, 'generateInvoice': false}));
            setSnack(true);

            if(res.success) {
                setSnackVariant('success');
                setSnackMessage(res.message);
            }
            else {
                setSnackVariant('error');
                setSnackMessage(res.message);
            }
        })
    }

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    const handleInput = (e) => {
        setJob(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    const handleCloseSettings = (e, reason) => {
        if (reason !== 'backdropClick') {
            setSettingsDialog(false);
        }
    }
 
    return (
        <>
        {loading?
            <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                <CircularProgress />
            </Box>
        :
        <>
            <Grid container spacing={3}>
                {/* Title and Stage */}
                {/* <Grid item xs={12} align="center">
                    <Typography variant='h6'>{getJobName()}</Typography>
                    <Typography variant='h6'>{stage}</Typography>
                </Grid> */}
                {/* Request Details */}
                <Grid item xs={12} align="center">
                    <InputField type="select" name="client" label="Client" value={job.client} onChange={handleInput}>
                        <option key={"blank_client"} value={''}></option>
                        {clients?.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))} 
                    </InputField>
                    <InputField name="dateIssued" type="date" label="Date Issued" value={job.dateIssued} onChange={handleInput} max="9999-12-31"/>
                    <InputField name="overdueDate" type="date" label="Overdue Date" value={job.overdueDate} onChange={handleInput} max="9999-12-31"/>
                </Grid>
                {/* Job Details */}
                <Grid item xs={12} align="center"> 
                    <InputField name="po" label="Purchase Order #" value={job.po} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                    <InputField name="sr" label="Service Request #" value={job.sr} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                    <InputField name="otherId" label="Other Id" value={job.otherId} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                </Grid>
                {/* Location & Title */}
                <Grid item xs={12} align="center"> 
                    <InputField type="select" name="location" label="Location" value={job.location} onChange={handleInput} onBlur={() => setTitleChange(true)}>
                        <option key="blank_location" value={""}></option>
                        {locations?.map((loc) => (
                            loc.client.id === job.client ? <option key={loc.id} value={loc.id}>{loc.name} ({loc.region.shortName})</option> : <></>
                        ))}
                    </InputField>
                    <InputField name="building" label="Building" value={job.building} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                    <InputField name="detailedLocation" label="Detailed Location" value={job.detailedLocation} onChange={handleInput}/>
                </Grid>
                {/* Extra Details */}
                <Grid item xs={12} align="center">
                    <InputField type="select" label="Requester" name="requester" value={job.requester} onChange={handleInput}>
                        <option key={"blank_requester"} value={""}></option>
                        {clientContacts?.map((contact) => (
                            contact.client.id === job.client ? <option key={contact.id} value={contact.id}>{contact.firstName + " " + contact.lastName}</option> : /*&& contact.region.shortName === locations[location-1].region.shortName*/ <></>
                        ))}
                    </InputField>
                    <InputField name="priority" label="Priority" value={job.priority} onChange={handleInput}/>
                    <InputField name="specialInstructions" label="Special Instructions" value={job.specialInstructions} onChange={handleInput}/>
                </Grid>
                {/* Point of Contact */}
                <Grid item xs={12} align="center">
                    <InputField name="pocName" label="POC Name" value={job.pocName} onChange={handleInput}/>
                    <InputField name="pocPhone" label="POC Phone" value={job.pocPhone} onChange={handleInput}/>
                    <InputField name="pocEmail" label="POC Email" value={job.pocEmail} onChange={handleInput}/>
                </Grid>
                {/* Alt Point of Contact */}
                <Grid item xs={12} align="center"> 
                    <InputField name="altPocName" label="Alt POC Name" value={job.altPocName} onChange={handleInput}/>
                    <InputField name="altPocPhone" label="Alt POC Phone" value={job.altPocPhone} onChange={handleInput}/>
                    <InputField name="altPocEmail" label="Alt POC Email" value={job.altPocEmail} onChange={handleInput}/>
                </Grid>
                {/* Title */}
                <Grid item xs={12} align="center"> 
                    <InputField wide name="title" label="Title" value={job.title} onChange={handleInput} onBlur={() => setTitleChange(true)}/>
                </Grid>
                {/* Description */}
                <Grid item xs={12} align="center"> 
                    <InputField multiline wide name="description" label="Description" value={job.description} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <Typography variant='body1'>Inspection Details</Typography>
                </Grid>
                {/* Priority and Date */}
                <Grid item xs={12} align="center"> 
                    <InputField type="date" name="inspectionDate" max='9999-12-31' label="Inspection Date" value={job.inspectionDate} onChange={handleInput}/>
                    <InputField type="select" name="inspectionBy" label="Inspector" value={job.inspectionBy} onChange={handleInput}>
                        <option key={"blank_inspector"} value={""}></option>
                        {employees?.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.firstName + " " + emp.lastName}</option>
                        ))}
                    </InputField>
                </Grid>
                {/* Inspection Notes */}
                <Grid item xs={12} align="center">
                    <InputField multiline wide name="inspectionNotes" label="Inspection Notes" value={job.inspectionNotes} onChange={handleInput}/>
                </Grid>
                {/* Estimate Builder */}
                <Grid item xs={12} align="center">
                    <Typography variant='body1'>Quote Details</Typography>
                    <InputField multiline wide name="scope" label="General Scope of Works" value={job.scope} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12} align="center" />
                <Grid item xs={12} align="center" style={{overflowX: 'auto'}}>
                    <EstimateModule estimates={initialEstimate} jobId={job.id} updateRequired={updateRequired} 
                        setUpdateRequired={setUpdateRequired} users={employees} bills={bills} setBills={setBills}
                        client={job.client} myobSync={job.myobUid}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <Typography variant='body1'>On-Site Details</Typography>
                </Grid>
                {/* On Site Details */}
                <Grid item xs={12} align="center">
                    <InputField type="select" style={{width: '200px'}} name="siteManager" label="Site Manager" value={job.siteManager} onChange={handleInput}>
                        <option key={"blank_sitemanager"} value={""}></option>
                        {employees?.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.firstName + " " + emp.lastName}</option>
                        ))}
                    </InputField>
                    <InputField type="date" style={{width: '146px'}} max='9999-12-31' name="commencementDate" label="Commencement Date" value={job.commencementDate} onChange={handleInput}/>
                    <InputField type="date" style={{width: '146px'}} max='9999-12-31' name="completionDate" label="Completion Date" value={job.completionDate} onChange={handleInput}/>
                    <InputField type="number" step=".1" min={0} style={{width: '146px'}} name="totalHours" label="Hours" value={job.totalHours} onChange={handleInput}/>
                </Grid>
                {/* Job Notes */}
                <Grid item xs={12} align="center"> 
                    <InputField multiline wide name="workNotes" label="Notes" value={job.workNotes} onChange={handleInput}/>
                </Grid>
                {/* Close Out Details */}
                <Grid item xs={12} align="center"> 
                    <InputField type="date"  style={{width: '150px'}} max='9999-12-31' name="closeOutDate" label="Close Out Date" value={job.closeOutDate} onChange={handleInput}/>
                    <Tooltip placement="top" title={updateRequired ? "Please Save Changes" : job.commencementDate === "" || job.completionDate === "" || job.hours === 0 ? "Please Fill Out Completion Details" : ""}>
                        <Box style={{display:'inline-block'}}>
                            <Button variant='outlined' style={{margin: '10px'}} onClick={handleCloseOut} disabled={!(!updateRequired && job.commencementDate !== "" && job.completionDate !== "" && job.totalHours !== 0 && job.totalHours !== "" && job.closeOutDate === "")}>Close Out</Button>
                        </Box>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} align="center">
                    <Typography variant='body1'>Accounts Details</Typography>
                </Grid>
                <Grid item xs={12} align="center" style={{paddingTop: '0px'}}> {/* Accounts */}
                    <Tooltip title={updateRequired ? "Please save changes" : job.closeOutDate === "" ? "Job Requires Close Out" : ""}>
                        <Box style={{position: 'relative', display: 'block', padding: '5px'}}>
                            <Button variant="outlined" 
                                style={{margin: '5px'}}
                                onClick={(() => handleCreateInvoice())}
                                disabled={invoice || job.closeOutDate === "" || updateRequired}
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
                    <InputField disabled style={{width: '150px'}} label="MYOB Invoice" value={invoice?.number} sx={{width: '135px'}}/>
                    <InputField disabled style={{width: '150px'}} type="date" label="Date Invoice Created" value={invoice?.dateCreated}/>
                </Grid>
                <Grid item xs={12} align="center"> {/* Accounts */}
                    <InputField disabled style={{width: '150px'}} type="date" label="Date Invoice Issued" value={invoice?.dateIssued}/>
                    <InputField disabled style={{width: '150px'}} type="date" label="Date Invoice Paid" value={invoice?.datePaid}/>
                </Grid>
                <Grid item xs={12} align="center" style={{paddingTop: '0px'}}> {/* Accounts */}
                    {job.client !== "1" ?
                        <Tooltip title={updateRequired ? "Please save changes" : ""}>
                            <Box sx={{ m: 1, position: 'relative' }}>
                                <Button variant="outlined" 
                                    style={{margin: '5px'}}
                                    onClick={() => handleSubmitInvoice()}
                                    disabled={!invoice || updateRequired || invoice.dateIssued}
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

        {/* Job Settings Dialog Box */}
        <Dialog open={settingsDialog} onClose={handleCloseSettings} fullwidth="true" maxWidth={'md'}>
            <DialogTitle sx={{margin: '0 auto'}}>Job Settings</DialogTitle>
            <DialogContent sx={{paddingTop: '10px'}}>
                <Grid container spacing={3}>
                    <Grid item xs={12} align="center"> {/* Accounts */}
                        <Typography variant='body1' style={{display:'inline-block', verticalAlign: 'bottom'}}> Cancelled? </Typography>
                        <Checkbox checked={job.cancelled} onChange={(e) => {setJob(prev => ({...prev, 'cancelled': e.target.checked}))}} style={{paddingBottom: '0px', verticalAlign: 'bottom'}}/>
                        <InputField name="cancelReason" label="Reason" value={job.cancelReason} onChange={handleInput}/>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Settings */}
                        <InputField type="select" name="workType" label="Work Type" value={job.workType ?? ""} onChange={handleInput}>
                            <option key={0} value={""}>None</option>
                            <option key={1} value={"Commercial"}>Commercial</option>
                            <option key={2} value={"Resedential"}>Resedential</option>
                        </InputField>
                        <InputField type="select" name="opportunityType" label="Opportunity Type" value={job.opportunityType ?? ""} onChange={handleInput}>
                            <option key={0} value={""}>None</option>
                            <option key={1} value={"Reactive Maintenance"}>Reactive Maintenance</option>
                            <option key={2} value={"Project"}>Project</option>
                        </InputField>
                    </Grid>
                    <Grid item xs={12} align="center">
                        <InputField name="bsafeLink" label="BSAFE Link" value={job.bsafeLink} onChange={handleInput}/>
                    </Grid>
                    <Grid item xs={12} align="center">
                        <Box sx={{position: 'relative', display: 'inline-block'}}>                                              
                            <Button 
                                color='navButton'
                                onClick={checkFolder}
                                >
                                Create Job Folder
                            </Button>
                            {waiting.checkFolder && (
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
                    </Grid>
                    { auth?.user.role === "DEV" || auth?.user.role === "PMU" ?
                        <Grid item xs={12} align="center">
                            <Typography variant='p1'>ID: {job.id}</Typography>
                            <Box sx={{position: 'relative', align: "center", display: 'inline-block'}}>                                              
                                <Button 
                                    color='navButton'
                                    onClick={generateInvoice}
                                    >
                                    Generate Invoice
                                </Button>
                                {waiting.generateInvoice && (
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
                            <Box sx={{position: 'relative', align: "center", display: 'inline-block'}}>                                              
                                <Button 
                                    color='navButton'
                                    onClick={repairMyobSync}
                                    >
                                    Repair MYOB Sync
                                </Button>
                                {waiting.repairMyobSync && (
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
                        </Grid>
                        :   <></>
                    }
                </Grid>
            </DialogContent>
            <DialogActions sx={{justifyContent: "center"}}>
                <Button variant="outlined" onClick={handleCloseSettings}>Close</Button>
            </DialogActions>
        </Dialog>

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
                    <Box style={{margin: '0 auto'}}>
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
                                    color='navButton'
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
                                    color='navButton'
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
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>
        </>
    );
}
export default JobPage;