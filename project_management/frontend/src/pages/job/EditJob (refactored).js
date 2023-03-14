import React, { useState, useEffect, useCallback, Children }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, Grid, Typography, NativeSelect, InputLabel, TextField, FormControl, Box, AppBar, Toolbar, Tooltip, Checkbox, CircularProgress, Snackbar, Alert, IconButton, DialogActions, DialogContent, DialogTitle, Dialog} from '@mui/material';
import { useParams, useNavigate } from "react-router-dom";
import EstimateModule from './estimate/Tabs';
import useEstimate from './estimate/useEstimate';
import axios from 'axios';
import useAuth from '../auth/useAuth';
import { usePrompt } from '../../hooks/promptBlocker';
import { element } from 'prop-types';

import Settings from '@mui/icons-material/Settings';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import NoteAdd from '@mui/icons-material/NoteAdd';
import produce from 'immer';

const JobPage = () => { 
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    
    const { auth } = useAuth();
    const { estimate, setEstimate, estimateSet, setEstimateSet } = useEstimate();

    const [jobId, setJobId] = useState('');
    const [po, setPO] = useState('');
    const [sr, setSR] = useState('');
    const [otherId, setOtherId] = useState('');
    const [client, setClient] = useState('');
    const [location, setLocation] = useState('');
    const [building, setBuilding] = useState('');
    const [detailedLocation, setDetailedLocation] = useState('');
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('');
    const [dateIssued, setDateIssued] = useState("");
    const [requester, setRequester] = useState('');
    const [POCName, setPOCName] = useState('');
    const [POCPhone, setPOCPhone] = useState('');
    const [POCEmail, setPOCEmail] = useState('');
    const [altPOCName, setAltPOCName] = useState('');
    const [altPOCPhone, setAltPOCPhone] = useState('');
    const [altPOCEmail, setAltPOCEmail] = useState('');
    const [description, setDescription] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [inspector, setInspector] = useState('');
    const [inspectionDate, setInspectionDate] = useState("");
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [scope, setScope] = useState('');
    const [commencementDate, setCommencementDate] = useState("");
    const [siteManager, setSiteManager] = useState('');
    const [siteNotes, setSiteNotes] = useState('');
    const [completionDate, setCompletionDate] = useState("");
    const [hours, setHours] = useState('');
    const [bsafe, setBsafe] = useState('');
    const [overdueDate, setOverdueDate] = useState('')
    const [closeOutDate, setCloseOutDate] = useState('')
    const [stage, setStage] = useState('');
    const [myobUid, setMyobUid] = useState('');    
    // const [paymentDate, setPaymentDate] = useState('');
    // const [invoiceRef, setInvoiceRef] = useState('');
    // const [invoiceDate, setInvoiceDate] = useState('');

    const [loading, setLoading] = useState(true);
    const [waiting, setWaiting] = useState({'save': false, 'invoice': false, 'invoiceSubmit': false, 'closeout': false, 'myobLink': false, 'compDocs': false, 'generateInvoice': false});
    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');
    const [updateRequired, setUpdateRequired] = useState(false);
    
    const [employees, setEmployees] = useState([]);
    const [clients, setClients] = useState([]);
    const [clientContacts, setClientContacts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [jobStages, setJobStages] = useState([]);
    const [initialEstimate, setInitialEstimate] = useState([]);
    const [job, setJob] = useState({
        'jobId': '',
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
        'POCName': '',
        'POCPhone': '',
        'POCEmail': '',
        'altPOCName': '',
        'altPOCPhone': '',
        'altPOCEmail': '',
        'description': '',
        'specialInstructions': '',
        'inspector': '',
        'inspectionDate': '',
        'inspectionNotes': '',
        'scope': '',
        'commencementDate': '',
        'siteManager': '',
        'siteNotes': '',
        'completionDate': '',
        'hours': '',
        'bsafe': '',
        'overdueDate': '',
        'closeOutDate': '',
        'stage': '',
        'myobUid': '',
    })
    const [invoiceRef, setInvoiceRef] = useState('');
    const [invoice, setInvoice] = useState({});

    // Settings
    const [settingsDialog, setSettingsDialog] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [workType, setWorkType] = useState('');
    const [opportunityType, setOpportunityType] = useState('')
    const [cancelReason, setCancelReason] = useState('');


    useEffect(() => {
        setUpdateRequired(true);
    }, [job])

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

    // Show update required when estimate changes
    useEffect(() => {
        setUpdateRequired(true);
    }, [estimateSet])

    const { id } = useParams();
    if(id) {

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
        
        useEffect(async () => {
            const cancelToken = axios.CancelToken.source();

            try {
                await axiosPrivate({
                    method: 'post',
                    cancelToken: cancelToken.token,
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
                                            name
                                        }
                                        requester {
                                            id
                                            firstName
                                            lastName
                                        }
                                        location {
                                            id
                                            name
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
                                            firstName
                                            lastName
                                        }
                                        inspectionDate
                                        inspectionNotes
                                        siteManager {
                                            id
                                            firstName
                                            lastName
                                        }
                                        commencementDate
                                        completionDate
                                        totalHours
                                        workNotes
                                        closeOutDate
                                        closeOutReference
                                        approvalDate
                                        overdueDate
                                        bsafeLink 
                                        cancelled
                                        cancelReason
                                        overdueDate
                                        stage
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
                    const users = response?.data?.data?.users?.edges;
                    const jobStages = response?.data?.data.__type?.enumValues;
                    
                    location_data ? setLocations(location_data) : null;
                    clients ? setClients(clients) : null;
                    clientContacts ? setClientContacts(clientContacts) : null;
                    users ? setEmployees(users) : null;
                    setUpdateRequired(false);
                    jobStages ? setJobStages(jobStages) : null;

                    if(job_data) {
                        setJobId(job_data.id);
                        setPO(job_data.po);
                        setSR(job_data.sr);
                        setOtherId(job_data.otherId);
                        setLocation(job_data.location?.id ?? "");
                        setBuilding(job_data.building);
                        setDetailedLocation(job_data.detailedLocation);
                        setClient(job_data.client?.id ?? "");
                        setDateIssued(job_data.dateIssued);
                        setRequester(job_data.requester?.id ?? "");
                        setPriority(job_data.priority);
                        setSpecialInstructions(job_data.specialInstructions);
                        setPOCName(job_data.pocName);
                        setPOCPhone(job_data.pocPhone);
                        setPOCEmail(job_data.pocEmail);
                        setAltPOCName(job_data.altPocName);
                        setAltPOCPhone(job_data.altPocPhone);
                        setAltPOCEmail(job_data.altPocEmail);
                        setTitle(job_data.title);
                        setDescription(job_data.description);
                        setInspector(job_data.inspectionBy?.id ?? "");
                        setInspectionDate(job_data.inspectionDate ?? "");
                        setInspectionNotes(job_data.inspectionNotes);
                        setScope(job_data.scope);
                        setSiteManager(job_data.siteManager?.id ?? "");
                        setCommencementDate(job_data.commencementDate ?? "");
                        setCompletionDate(job_data.completionDate ?? "");
                        setHours(job_data.totalHours);
                        setSiteNotes(job_data.workNotes);
                        setBsafe(job_data.bsafeLink);
                        setOverdueDate(job_data.overdueDate ?? "");
                        setCloseOutDate(job_data.closeOutDate ?? "");
                        setCancelled(job_data.cancelled);
                        setCancelReason(job_data.cancelReason);
                        setMyobUid(job_data.myobUid);

                        setJob(job_data);
                        setInitialEstimate(job_data.estimateSet);
                        setEstimateSet(job_data.estimateSet);
                        setInvoiceRef(job_data?.jobinvoiceSet[0]?.id ?? false);
                        setInvoice(job_data?.jobinvoiceSet[0]?.invoice ?? false);
                        jobStages.map((values) => {
                            job_data.stage === values['name'] ? 
                                setStage(values['description']) : null;
                        })

                        setLoading(false);
                        setUpdateRequired(false);
                    }
                    else {
                        navigate('/missing', { replace: true, state: {missing: "job"} });
                    }
                }).catch((err) => {
                    if (axios.isCancel(err)) {
                        // console.log("API Request Cancelled.")
                    } else {
                        //todo:handle errors
                        console.log("Please Contact Admin.:", err);
                    }
                });
            } catch (err) {
                console.log(err);
            }

            return () => {
                cancelToken.cancel();
            }
        }, []);
        
    }

    const handleUploadChanges = async () => {
        let partialError = false;
        setWaiting(prev => ({...prev, 'save': true}));
        // console.log(inspectionDate)
        // console.log("Uploading Job Changes")
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation updateJob (
                        $jobId: String!
                        $po: String!, 
                        $sr: String!, 
                        $otherId: String!,
                        $location: String!,
                        $building: String!,
                        $detailedLocation: String!,
                        $client: String!,
                        $dateIssued: Date!,
                        $requester: String!,
                        $priority: String!,
                        $specialInstructions: String!,
                        $pocName: String!,
                        $pocPhone: String!,
                        $pocEmail: String!,
                        $altPocName: String!,
                        $altPocPhone: String!,
                        $altPocEmail: String!,
                        $title: String!,
                        $description: String!,
                        $inspector: String!,
                        $inspectionDate: Date!,
                        $inspectionNotes: String!,
                        $scope: String!,
                        $sitemanager: String!,
                        $commencementDate: Date!,
                        $completionDate: Date!,
                        $hours: Float!,
                        $siteNotes: String!,
                        $overdueDate: Date!,
                        $closeOutDate: Date!,
                        $workType: String!,
                        $opportunityType: String!,
                        $cancelled: Boolean!,
                        $cancelReason: String!,
                        $bsafeLink: String!,
                    )
                    { update_job: updateJob( input:{
                        jobId: $jobId
                        po: $po,
                        sr: $sr,
                        otherId: $otherId,
                        location: $location,
                        building: $building,
                        detailedLocation: $detailedLocation,
                        client: $client,
                        dateIssued: $dateIssued,
                        requester: $requester,
                        priority: $priority,
                        specialInstructions: $specialInstructions,
                        pocName: $pocName,
                        pocPhone: $pocPhone,
                        pocEmail: $pocEmail,
                        altPocName: $altPocName,
                        altPocPhone: $altPocPhone,
                        altPocEmail: $altPocEmail,
                        title: $title,
                        description: $description,
                        inspector: $inspector,
                        inspectionDate: $inspectionDate,
                        inspectionNotes: $inspectionNotes,
                        scope: $scope,
                        sitemanager: $sitemanager,
                        commencementDate: $commencementDate,
                        completionDate: $completionDate,
                        hours: $hours,
                        siteNotes: $siteNotes,
                        overdueDate: $overdueDate,
                        closeOutDate: $closeOutDate,
                        workType: $workType,
                        opportunityType: $opportunityType,
                        cancelled: $cancelled,
                        cancelReason: $cancelReason,
                        bsafeLink: $bsafeLink,
                    })
                    {
                        success
                        message
                    }
                }`,
                variables: {
                    jobId: jobId.trim(),
                    po: po.trim(),
                    sr: sr.trim(),
                    otherId: otherId.trim(),
                    location: location.trim(),
                    building: building.trim(),
                    detailedLocation: detailedLocation.trim(),
                    client: client.trim(),
                    dateIssued: !dateIssued ? new Date(0).toISOString().split('T')[0] : dateIssued,
                    requester: requester.trim(),
                    priority: priority.trim(),
                    specialInstructions: specialInstructions.trim(),
                    pocName: POCName.trim(),
                    pocPhone: POCPhone.trim(),
                    pocEmail: POCEmail.trim(),
                    altPocName: altPOCName.trim(),
                    altPocPhone: altPOCPhone.trim(),
                    altPocEmail: altPOCEmail.trim(),
                    title: title.trim(),
                    description: description.trim(),
                    inspector: inspector.trim(),
                    inspectionDate: !inspectionDate ? new Date(0).toISOString().split('T')[0] : inspectionDate,
                    inspectionNotes: inspectionNotes.trim(),
                    scope: scope.trim(),
                    sitemanager: siteManager.trim(),
                    commencementDate: !commencementDate ? new Date(0).toISOString().split('T')[0] : commencementDate,
                    completionDate: !completionDate ? new Date(0).toISOString().split('T')[0] : completionDate,
                    hours: hours,
                    siteNotes: siteNotes.trim(),
                    overdueDate: !overdueDate ? new Date(0).toISOString().split('T')[0] : overdueDate,
                    closeOutDate: !closeOutDate ? new Date(0).toISOString().split('T')[0] : closeOutDate,
                    workType: workType.trim(),
                    opportunityType: opportunityType.trim(),
                    cancelled: cancelled,
                    cancelReason: cancelReason.trim(),
                    bsafeLink: bsafe.trim(),
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
                else if(!response?.data?.data?.update_job.success) {
                    partialError = true;
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Job Upload Error: " + response?.data?.data?.update_job.message);
                }
            });
        } catch (err) {
            console.log('job upload error', err);
            partialError = true;
            setSnack(true);
            setSnackVariant('error');
            setSnackMessage("Job Upload Error: " + err.response?.data?.errors[0]?.message);
            setWaiting(prev => ({...prev, 'save': false}));
        }

        // If a date is removed from an estimate, make sure it is null before sending to api.
        const cleanEstimateSet = estimateSet.map(est => {
            // console.log(est);
            const newEstimate = produce(est, draft => {
                est.approvalDate === "" ? draft.approvalDate = null : null;
                est.issueDate === "" ? draft.issueDate = null : null;
            })
            return newEstimate;
        })

        // try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation createEstimateFromSet ( $estimateSet: [EstimateInput]!, $jobId: String! ) { 
                        create_estimate_from_set: createEstimateFromSet( estimateSet: $estimateSet, jobId: $jobId)
                    {
                        success
                        job {
                            stage
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
                    jobId: jobId,
                    estimateSet: cleanEstimateSet,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data?.create_estimate_from_set;
                console.log(response);
                setWaiting(prev => ({...prev, 'save': false}));
                setSnack(true);
                // Update Job Stage
                jobStages.map((values) => {
                    res?.job?.stage === values['name'] ? 
                        setStage(values['description']) : null;
                })
                if(res.success) {
                    setEstimateSet(res.job.estimateSet);
                    if(!partialError) {
                        setSnackVariant('success');
                        setSnackMessage("Successful Upload");
                        setUpdateRequired(false);
                    }
                    // Update the id of any new jobs.
                } 
                else {
                    setSnackVariant('error');
                    setSnackMessage("Estimate Upload Error: " + response?.data?.data?.errors[0].message);
                    // setUploadStatusMessage("Estimate Upload Error: " + response?.data?.data?.errors[0].message)
                    // setUploadStatus("Error");
                }
            });
        // } catch (err) {
        //     console.log("estimateSet", estimateSet)
        //     console.log('Estimate upload error:', err);
        //     setSnack(true);
        //     setSnackVariant('error');
        //     setSnackMessage("Estimate Upload Error: " + err.response?.data?.errors[0]?.message);
        //     setWaiting(prev => ({...prev, 'save': false}));
        //     // setUploadStatusMessage("Server Error. Please Contact Admin")
        //     // setUploadStatus("Error");
        // }
    }

    const openInNewTab = (url) => {
        const newWindow = window.open(url, '_blank', 'noopener, noreferrer')
        if(newWindow) newWindow.opener = null
    }

    const handleCloseOut = async () => {
        setWaiting(prev => ({...prev, 'closeout': true}));

        try {
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
                    jobid: jobId,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data?.close_out_email;
                
                setWaiting(prev => ({...prev, 'closeout': false}));
                setSnack(true);
                
                if(res.success) {
                    setSnackVariant('success');
                    setSnackMessage(res.message);
                    setCloseOutDate(new Date().toISOString().slice(0, 10));
                }
                else {
                    setSnackVariant('error');
                    setSnackMessage("Email Error: " + res.message);
                }
            });
        } catch (err) {
            console.log("error", err);
        }
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
                    job: po,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_create_invoice;

            setWaiting(prev => ({...prev, 'invoice': false}));
            setSnack(true);

            if(res.success) {
                // console.log(res.message)
                const result = JSON.parse(res.message);
                setSnackVariant('success');
                setSnackMessage(result);
                setInvoice(prev => ({...prev, "number": res.number}))
                setInvoice(prev => ({...prev, "dateCreated": new Date().toISOString().slice(0, 10)}))
                // console.log("Invoice Created:", result)
            }
            else {
                // console.log(response);
                setSnackVariant('error');
                setSnackMessage("Invoice Error: " + res.message);
            }
        })
        
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
            console.log("Converting", response);
            const res = response?.data?.data?.convert_sale;

            if(res.success){
                axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                        query: `
                        mutation updateInvoices($invoices: [InvoiceUpdateInput]!) {
                            update_invoices: updateInvoices(invoices: $invoices) {
                                success
                                message
                            }
                        }`,
                        variables: {
                            invoices: [{
                                "number": invoice.number,
                                "dateIssued": new Date().toISOString().slice(0, 10)
                            }],
                        },
                    }),
                }).then((response) => {
                    console.log("Updating", response);
                    const res = response?.data?.data?.update_invoices;

                    setWaiting(prev => ({...prev, 'invoiceSubmit': false}));
                    setSnack(true);
                    if(res.success) {
                        setSnackVariant('success');
                        setSnackMessage("Invoice Converted & Submission Tracked");
                        setInvoice(prev => ({...prev, "dateIssued": new Date().toISOString().slice(0, 10)}))
                    }
                    else {
                        setSnackVariant('error');
                        setSnackMessage("Error: " + res.message);
                    }
                });
            }
            

           
        })
    }

    const getJobName = () => {
        let identifier = "PO" + po;
        if(po == ''){
            if ( sr != '') {
                identifier = "SR" + sr;
            }
            else if (otherId != '') {
                identifier = otherId;
            }

        }
        let build = building;
        if(!isNaN(building)) {
            build = "B" + building;
        }

        let loc = locations[locations.findIndex(element => {
            if(element.id == location) {
                return true;
            }
            return false;
        })]  
        
        const path = identifier + " - " + loc?.name + " - "  + build + " "  + title
        return path
    }

    const sendJobToMyob = async () => {

        setWaiting(prev => ({...prev, 'myobLink': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobCreateJob($uid:String!, $jobId:String!) {
                    myob_create_job: myobCreateJob(uid:$uid, jobId:$jobId) {
                        success
                        message
                        uid
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    jobId: jobId
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_create_job;

            setWaiting(prev => ({...prev, 'myobLink': false}));
            setSnack(true);

            if(res.success) {
                // console.log(res.message)
                // console.log("Jobs:", JSON.parse(res.message));
                setSnackVariant('success');
                setSnackMessage(JSON.parse(res.message));
                setMyobUid(res.uid);
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
                    jobId: jobId
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
                    jobId: jobId
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

        console.log(auth?.myob.id)

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
                    jobId: jobId,
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
                    job: jobId,
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

    // const InputField = ({id, label, key, select, date, children, ...props}) => {
    //     const initialValue = job[id];

    //     // We need to keep and update the state of the input
    //     const [value, setValue] = useState(initialValue)
    
    //     // When the input is blurred, update the state
    //     const onBlur = () => {
    //         // Dont update if the value has not changed
    //         if(!(!job[id] && value === '') && !(job[id] === value)) {
    //             setUpdateRequired(true);
    //             setJob(prev => ({...prev, [id]: value}));
    //         }            
    //     }
    
    //     if(date) {
    //         return (
    //             <TextField key={id + "_input"}
    //                 type="date"                    
    //                 inputProps={{max: '9999-12-31'}} 
    //                 InputLabelProps={{shrink: true,}} 
    //                 variant="standard" 
    //                 label={label}
    //                 value={value} 
    //                 onChange={(e) => {setValue(e.target.value)}}
    //                 onBlur={onBlur}
    //             />
    //         )   
    //     }
        
    //     if(select) {
    //         return (
    //             <TextField key={id + "_input"}
    //                 select
    //                 SelectProps={{
    //                     native: true
    //                 }}
    //                 fullWidth={true}
    //                 sx={{maxWidth: '195px'}}
    //                 variant="standard"
    //                 label={label}
    //                 value={JSON.stringify(value)}
    //                 onBlur={onBlur}
    //                 onChange={(e) => {setValue(JSON.parse(e.target.value))}}
    //             > {children} </TextField>
    //         )
    //     }
    
    //     return (
    //         <TextField key={id + "_input"} variant="standard" label={label} value={value} onChange={(e) => setValue(e.target.value)} />
    //     )
        
    // }

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    const handleInput = (e) => {
        setJob(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return (
        <>
            {loading?
                <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                    <CircularProgress />
                </Box>
            :
                <Grid container spacing={3}>
                    <Grid item xs={12} align="center">
                        {/* <Button onClick={(e) => {handleUploadChanges()}}>Upload Changes</Button> */}
                        <Typography variant='h6'>{getJobName()}</Typography>
                        <Typography variant='h6'>{stage}</Typography>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Request Details */}
                        <Typography sx={{display:'inline', verticalAlign: 'bottom', marginRight: '20px'}}>Request Details:</Typography>
                        {/* <InputField select label="Client" id="client">
                            <option key={"blank_client"} value={JSON.stringify({})}></option>
                            {clients?.map((c) => (
                                <option key={c.id} value={JSON.stringify(c)}>{c.name}</option>
                                ))}
                        </InputField> */}
                        {/* <InputField date label="Date Issued" id="dateIssued"/>
                        <InputField date label="Overdue Date" id="overdueDate"/> */}

                        <TextField select variant="standard" label="Client" value={client}
                            onChange={(e) => {setClient(e.target.value); setUpdateRequired(true)}}
                            SelectProps={{
                                native: true
                            }}
                            // fullWidth={true}
                            sx={{width: '195px'}}
                        >
                            <option key={"blank_client"} value={''}></option>
                            {clients?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))} 
                        </TextField>
                        <TextField type="date" variant="standard" label="Date Issued" value={dateIssued} onChange={(e) => {setDateIssued(e.target.value); setUpdateRequired(true)}}
                            inputProps={{max: '9999-12-31'}} InputLabelProps={{shrink: true,}} 
                        />
                        <TextField type="date" variant="standard" label="Overdue Date" value={overdueDate} onChange={(e) => {setOverdueDate(e.target.value); setUpdateRequired(true)}}
                            inputProps={{max: '9999-12-31'}} InputLabelProps={{shrink: true,}} 
                        />
                    </Grid>
                    {/* Job Details */}
                    <Grid item xs={12} align="center"> {/* Job Identifiers */}
                        <Typography sx={{display:'inline', verticalAlign: 'bottom', marginRight: '20px'}}>Job Identifiers: </Typography>
                        <TextField variant="standard" name="po" label="Purchase Order #" value={po} onChange={(e) => {setPO(e.target.value); setUpdateRequired(true)}} />
                        <TextField variant="standard" name="sr" label="Service Request #" value={sr} onChange={(e) => {setSR(e.target.value); setUpdateRequired(true)}} />
                        <TextField variant="standard" name="otherId" label="Other Id" value={otherId} onChange={(e) => {setOtherId(e.target.value); setUpdateRequired(true)}} />
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Location & Title */}
                        <Typography sx={{display:'inline', verticalAlign: 'bottom', marginRight: '20px'}}>Job Location: </Typography>
                        <FormControl>
                            <InputLabel id="location-select-label">Location</InputLabel>
                            <NativeSelect
                                id="location-select"
                                value={location}
                                label="Location"
                                onChange={(e) => {setLocation(e.target.value); setUpdateRequired(true)}} 
                                key="location-select"
                            >
                                <option key="blank_location" value={""}></option>
                                {locations?.map((loc) => (
                                loc.client.id === client ? <option key={loc.id} value={loc.id}>{loc.name}</option> : <></>
                                ))}
                            </NativeSelect>
                        </FormControl>
                        <TextField id="standard-basic" label="Building" variant="standard" value={building} onChange={(e) => {setBuilding(e.target.value); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" label="Detailed Location" variant="standard" value={detailedLocation} onChange={(e) => {setDetailedLocation(e.target.value); setUpdateRequired(true)}}/>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Special Instructions */}
                        <FormControl>
                            <InputLabel id="requester-select-label">Requester</InputLabel>
                            <NativeSelect
                                id="requester-select"
                                value={requester}
                                label="Requester"
                                onChange={(e) => {setRequester(e.target.value); setUpdateRequired(true)}} 
                                key="requester-select"
                            >
                                <option key={"blank_requester"} value={""}></option>
                                {clientContacts?.map((contact) => (
                                    contact.client.id === client ? <option key={contact.id} value={contact.id}>{contact.firstName + " " + contact.lastName}</option> : /*&& contact.region.shortName === locations[location-1].region.shortName*/ <></>
                                ))}
                            </NativeSelect>
                        </FormControl>
                        <TextField id="standard-basic" label="Priority" variant="standard" value={priority} onChange={(e) => {setPriority(e.target.value); setUpdateRequired(true)}}/>
                        <TextField multiline id="standard-basic" label="Special Instructions" variant="standard" value={specialInstructions} onChange={(e) => {setSpecialInstructions(e.target.value); setUpdateRequired(true)}}/>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Point of Contact */}
                        <Typography sx={{display:'inline', verticalAlign: 'bottom', marginRight: '20px'}}>POC Details: </Typography>
                        <TextField id="standard-basic" label="Name" variant="standard" value={POCName} onChange={(e) => {setPOCName(e.target.value); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" label="Phone" variant="standard" value={POCPhone} onChange={(e) => {setPOCPhone(e.target.value); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" label="Email" variant="standard" value={POCEmail} onChange={(e) => {setPOCEmail(e.target.value); setUpdateRequired(true)}}/>
                    </Grid>
                    {/* {altPOCName ? */}
                        <Grid item xs={12} align="center"> {/* Alt Point of Contact */}
                            <Typography sx={{display:'inline', verticalAlign: 'bottom', marginRight: '20px'}}>Alt POC Details: </Typography>
                            <TextField id="standard-basic" label="Name" variant="standard" value={altPOCName} onChange={(e) => {setAltPOCName(e.target.value); setUpdateRequired(true)}}/>
                            <TextField id="standard-basic" label="Phone" variant="standard" value={altPOCPhone} onChange={(e) => {setAltPOCPhone(e.target.value); setUpdateRequired(true)}}/>
                            <TextField id="standard-basic" label="Email" variant="standard" value={altPOCEmail} onChange={(e) => {setAltPOCEmail(e.target.value); setUpdateRequired(true)}}/>
                        </Grid>
                        {/* :
                        <></> */}
                    {/*  } */}
                    <Grid item xs={12} align="center"> {/* Title */}
                        <FormControl style={{width:'80%', maxWidth:700}}>
                            <TextField multiline id="standard-basic" label="Title" variant="standard" value={title} onChange={(e) => {setTitle(e.target.value)}} onBlur={() => setUpdateRequired(true)}/>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Description */}
                        <FormControl style={{width:'80%', maxWidth:700}}>
                            <TextField multiline id="standard-basic" label="Description" variant="standard" value={description} onChange={(e) => {setDescription(e.target.value); setUpdateRequired(true)}}/>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} align="center">
                        <Typography variant='body1'>Inspection Details</Typography>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Priority and Date */}
                        <TextField id="standard-basic"  type="date" inputProps={{max: '9999-12-31'}} InputLabelProps={{shrink: true,}} label="Inspection Date" variant="standard" value={inspectionDate} onChange={(e) => {setInspectionDate(e.target.value); setUpdateRequired(true)}}/>
                        <FormControl>
                            <InputLabel id="base-select-label">Inspector</InputLabel>
                            <NativeSelect
                                id="base-select"
                                value={inspector}
                                label="Base"
                                onChange={(e) => {setInspector(e.target.value); setUpdateRequired(true)}} 
                                key="location-select"
                            >
                                <option key={"blank_inspector"} value={""}></option>
                                {employees?.map((emp) => (
                                    <option key={emp.node.id} value={emp.node.id}>{emp.node.firstName + " " + emp.node.lastName}</option>
                                ))}
                            </NativeSelect>
                        </FormControl>
                    </Grid>
                    {/* Inspection Notes */}
                    <Grid item xs={12} align="center"> 
                        <FormControl style={{width:'80%', maxWidth:1028}}>
                            <TextField multiline id="standard-basic" label="Inspection Notes" variant="standard" value={inspectionNotes} onChange={(e) => {setInspectionNotes(e.target.value); setUpdateRequired(true)}}/>
                        </FormControl>
                    </Grid>
                    {/* Estimate Builder */}
                    <Grid item xs={12} align="center">
                        <Typography variant='body1'>Quote Details</Typography>
                        <FormControl style={{width:'80%', maxWidth:1028}}>
                            <TextField multiline id="standard-basic" label="Scope of Works" variant="standard" value={scope} onChange={(e) => {setScope(e.target.value); setUpdateRequired(true)}}/>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} align="center" />
                    <Grid item xs={12} align="center">
                        {/* {estimate.length > 0 ? <EstimateModule estimates={estimate}/> : <p>Loading...</p> } */} 
                        <EstimateModule estimates={initialEstimate} jobId={jobId} updateRequired={updateRequired} users={employees}/>
                    </Grid>
                    <Grid item xs={12} align="center">
                        <Typography variant='body1'>On-Site Details</Typography>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Priority and Date */}
                        <FormControl>
                            <InputLabel id="siteman-select-label">Site Manager</InputLabel>
                            <NativeSelect
                                id="siteman-select"
                                value={siteManager}
                                label="Site Manager"
                                onChange={(e) => {setSiteManager(e.target.value); setUpdateRequired(true)}} 
                                key="site_manager-select"
                            >
                                <option key={"blank_sitemanager"} value={""}></option>
                                {employees?.map((emp) => (
                                    <option key={emp.node.id} value={emp.node.id}>{emp.node.firstName + " " + emp.node.lastName}</option>
                                ))}
                            </NativeSelect>
                        </FormControl>
                        <TextField id="standard-basic" type="date" inputProps={{max: '9999-12-31'}} InputLabelProps={{shrink: true,}} label="Commencement Date" variant="standard" value={commencementDate} onChange={(e) => {setCommencementDate(e.target.value); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" type="date" inputProps={{max: '9999-12-31'}} InputLabelProps={{shrink: true,}} label="Completion Date" variant="standard" value={completionDate} onChange={(e) => {setCompletionDate(e.target.value); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" type="number" label="Hours" variant="standard"  value={hours} onChange={(e) => {setHours(e.target.value); setUpdateRequired(true)}}/>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Job Notes */}
                        <FormControl style={{width:'80%', maxWidth:1028}}>
                            <TextField multiline id="standard-basic" label="Notes" variant="standard" value={siteNotes} onChange={(e) => {setSiteNotes(e.target.value); setUpdateRequired(true)}}/>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Job Notes */}
                        <TextField id="standard-basic" type="date" inputProps={{max: '9999-12-31'}} InputLabelProps={{shrink: true,}} label="Close Out Date" variant="standard" value={closeOutDate} onChange={(e) => {setCloseOutDate(e.target.value); setUpdateRequired(true)}}/>
                        <Tooltip placement="top" title={updateRequired ? "Please Save Changes" : !commencementDate || !completionDate || hours === 0 || hours === "0" ? "Please Fill Out Completion Details" : ""}>
                            <Box style={{display:'inline-block'}}>
                                <Button variant='outlined' style={{margin: '10px'}} onClick={handleCloseOut} disabled={!(!updateRequired && commencementDate && completionDate && hours && !closeOutDate)}>Close Out</Button>
                            </Box>
                        </Tooltip>
                            
                    </Grid>
                    <Grid item xs={12} align="center">
                        <Typography variant='body1'>Accounts Details</Typography>
                    </Grid>
                    <Grid item xs={12} align="center" style={{paddingTop: '0px'}}> {/* Accounts */}
                        <Tooltip title={updateRequired ? "Please save changes" : ""}>
                            <Box sx={{ m: 1, position: 'relative' }}>
                                <Button variant="outlined" 
                                    style={{margin: '5px'}}
                                    onClick={(() => handleCreateInvoice())}
                                    disabled={invoice || !closeOutDate || updateRequired}
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
                        <TextField id="standard-basic" disabled={true} label="MYOB Invoice" variant="standard" value={invoice?.number ?? ""} sx={{width: '135px'}} onChange={(e) => {setInvoice(prev => ({...prev, "number": e.target.value})); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" disabled={true} type="date" InputLabelProps={{shrink: true,}} label="Date Invoice Created" variant="standard" value={invoice?.dateCreated ?? ""} onChange={(e) => {setInvoice(prev => ({...prev, "dateCreated": e.target.value})); setUpdateRequired(true)}}/>
                    </Grid>
                    <Grid item xs={12} align="center"> {/* Accounts */}
                        <TextField id="standard-basic" disabled={true} type="date" InputLabelProps={{shrink: true,}} label="Date Invoice Issued" variant="standard" value={invoice?.dateIssued ?? ""} onChange={(e) => {setInvoice(prev => ({...prev, "dateIssued": e.target.value})); setUpdateRequired(true)}}/>
                        <TextField id="standard-basic" disabled={true} type="date" InputLabelProps={{shrink: true,}} label="Date Invoice Paid" variant="standard" value={invoice?.datePaid ?? ""} onChange={(e) => {setInvoice(prev => ({...prev, "datePaid": e.target.value})); setUpdateRequired(true)}}/>
                    </Grid>
                    <Grid item xs={12} align="center" style={{paddingTop: '0px'}}> {/* Accounts */}
                        {client !== "1" ?
                            <Tooltip title={updateRequired ? "Please save changes" : ""}>
                                <Box sx={{ m: 1, position: 'relative' }}>
                                    <Button variant="outlined" 
                                        style={{margin: '5px'}}
                                        onClick={(() => handleSubmitInvoice())}
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
            }

            {/* Job Settings Dialog Box */}
            <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} fullwidth="true" maxWidth={'md'}>
                <DialogTitle sx={{margin: '0 auto'}}>Job Settings</DialogTitle>
                <DialogContent sx={{paddingTop: '10px'}}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} align="center"> {/* Accounts */}
                            <Typography variant='body1' style={{display:'inline-block', verticalAlign: 'bottom'}}> Cancelled? </Typography>
                            <Checkbox checked={cancelled} onChange={(e) => {setCancelled(e.target.checked); setUpdateRequired(true)}} style={{paddingBottom: '0px', verticalAlign: 'bottom'}}/>
                            <TextField id="standard-basic" label="Reason" variant="standard" value={cancelReason} onChange={(e) => {setCancelReason(e.target.value); setUpdateRequired(true)}}/>
                        </Grid>
                        <Grid item xs={12} align="center"> {/* Settings */}
                            <FormControl>
                                <InputLabel id="opportunity-select-label">Opportunity Type</InputLabel>
                                <NativeSelect
                                    id="opportunity-select"
                                    value={opportunityType}
                                    label="Opportunity Type"
                                    onChange={(e) => {setOpportunityType(e.target.value); setUpdateRequired(true)}} 
                                    key="opportunity-select"
                                >
                                    <option key={0} value={"COM"}>Commercial</option>
                                    <option key={1} value={"RES"}>Resedential</option>
                                </NativeSelect>
                            </FormControl>
                            <FormControl>
                                <InputLabel id="worktype-select-label">Work Type</InputLabel>
                                <NativeSelect
                                    id="worktype-select"
                                    value={workType}
                                    label="Work Type"
                                    onChange={(e) => {setWorkType(e.target.value); setUpdateRequired(true)}} 
                                    key="worktype-select"
                                >
                                    <option key={0} value={"RM"}>Reactive Maintenance</option>
                                    <option key={1} value={"PRO"}>Project</option>
                                </NativeSelect>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} align="center">
                            <TextField id="standard-basic" label="BSAFE Link" variant="standard" value={bsafe} onChange={(e) => {setBsafe(e.target.value); setUpdateRequired(true)}}/>
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
                                <Typography variant='p1'>ID: {jobId}</Typography>
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
                    <Button variant="outlined" onClick={() => {setSettingsDialog(false)}}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Notification Snackbar */}
            <Snackbar
                anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                open={snack}
                autoHideDuration={12000}
                onClose={(e) => setSnack(false)}
            >
                <Alert onClose={(e) => setSnack(false)} severity={snackVariant} sx={{width: '100%'}}>{snackMessage}</Alert>
            </Snackbar>

            {/* Footer AppBar with Controls */}
            <Box sx={{ flexGrow: 1}}>
                <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
                style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                    <Toolbar style={{minHeight: '50px'}}>
                        {loading ? <></> :
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
                                <IconButton onClick={() => {navigator.clipboard.writeText("Aurify Dropbox\\5. Projects\\02 - Brookfield WR\\00 New System\\Jobs\\" + getJobName())}}><FolderCopyIcon /></IconButton>
                            </Tooltip>
                            <Tooltip title={bsafe ? "Open BSAFE Work Order" : "No BSAFE Link Found"}>
                                <Box sx={{display: 'inline-block'}}>
                                    <Button 
                                        color='navButton'
                                        style={{margin: '5px'}}
                                        disabled={!bsafe}
                                        onClick={() => openInNewTab(bsafe)}
                                        >
                                        BSAFE
                                    </Button>
                                </Box>
                            </Tooltip>
                            <Tooltip title={myobUid ? "Job Already Linked to MYOB" : "Link Job to MYOB"}>
                                <Box sx={{position: 'relative', display: 'inline-block'}}>                                              
                                    <Button 
                                        color='navButton'
                                        disabled={myobUid}
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
                        }
                    </Toolbar>
                </AppBar>
            </Box>
        </>
    );
}

export default JobPage;