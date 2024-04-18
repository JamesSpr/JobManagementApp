import { useState, useEffect } from 'react';
import { BillType, JobType, SnackType } from '../../../types/types';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import { useParams } from 'react-router-dom';
import { CircularProgress, Grid } from '@mui/material';
import { InputField } from '../../../components/Components';
import { defineJobIdentifier } from '../../../components/Functions';
import useAuth from '../../auth/useAuth';
import { blankBill, blankJob } from '../../../types/blanks';

const EditBill = ({bills, setJob, setEditing, setUpdateWaiting, toggleSave, setToggleSave, setSnack}: {
    bills: BillType
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    setEditing: React.Dispatch<React.SetStateAction<"expense" | "bill" | null>>
    setUpdateWaiting: React.Dispatch<React.SetStateAction<any>>
    toggleSave: boolean
    setToggleSave: React.Dispatch<React.SetStateAction<boolean>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();

    const [bill, setBill] = useState<BillType>(blankBill);
    const [jobs, setJobs] = useState<JobType[]>([blankJob]);
    const [loading, setLoading] = useState(true);

    // Fetch bill data if none has been passed
    const { id } = useParams<string>();
    
    useEffect(() => {

        let billString = ""
        if(!bills) {
            billString = `bills (bill: "${id}") {
                id
                myobUid
                invoiceNumber
                invoiceDate
                processDate
                amount 
                thumbnailPath
                billType
                supplier {
                    name
                }
                job {
                    id
                }
            }`
        }
        const controller = new AbortController();

        const fetchBillData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query:`{ 
                        ${billString}
                        jobs (OnlyMyobJobs: true){
                            id
                            po
                            sr
                            otherId
                            location {
                                name
                            }
                            building
                            title
                        }
                    }`,
                    variables: {},
                })
            }).then((response) => {
                const res = response?.data?.data;
                
                setJobs(res.jobs);
                setLoading(false);

                if(!bills) {
                    setBill(res.bills[0]);
                }
                else { 
                    setBill(bills);
                }

            }).catch((err) => {
                // TODO: handle error
                if(err.name === "CanceledError") {
                    return
                }
                console.log("Error:", err);
            });
        }
        fetchBillData();

    }, [])

    const handleInput = (e: { target: { name?: any; value?: any; }; }) => {
        setBill(prev => ({...prev, [e.target.name]: e.target.value}));
    }
    
    const handleNumberInput = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? 0 : e.target.value
        setBill(prev => ({...prev, [e.target.name]: val}));
    }
    
    const handleDateInput = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? null : e.target.value
        setBill(prev => ({...prev, [e.target.name]: val}));
    }
    
    const handleSelection = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? null : {id: e.target.value}
        setBill(prev => ({...prev, [e.target.name]: val}));
    }

    const handleSave = async () => {
        if(setUpdateWaiting != null) {setUpdateWaiting((prev: any) => ({...prev, update: true}));}

        // Post bill details to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobUpdateBill($uid:String!, $bill: BillInputType!) {
                    update: myobUpdateBill(uid:$uid, bill: $bill) {
                        success
                        message
                        job {
                            billSet {
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
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    bill: bill,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.update;
            if(setUpdateWaiting != null) {setUpdateWaiting((prev: any) => ({...prev, update: false}));}
            
            if(res.success) {
                setSnack({active: true, variant: 'success', message: res.message})
                setToggleSave(false);
                setJob(prev => ({...prev, billSet: res.job.billSet}));
                setEditing(null);
            }
            else {
                setSnack({active: true, variant:'error', message: res.message})
                setToggleSave(false);
            }

        }).catch((err) => {
            if(setUpdateWaiting != null) {setUpdateWaiting((prev: any) => ({...prev, update: false}));}
            setToggleSave(false);
            console.log("error:", err);
            setSnack({active: true, variant:'error', message: "Submission Error. Contact Developer"})
        })
    }

    useEffect(() => {
        if(toggleSave) {
            handleSave();
        }
    }, [toggleSave])

    return (<>
        <Grid container direction={'column'} alignItems={'center'}>
        {!loading ?
        <>
            <Grid item xs={12}>
                <h2>Bill Editor</h2>
            </Grid>
            <Grid item xs={12}>
                <InputField type="select" width={500}
                    label="Job" name="job" 
                    value={bill.job?.id ?? ""} onChange={handleSelection}
                >
                    <option key="nullJob" value=""></option>
                    {jobs.map(job => (
                        <option key={job.id} value={job.id}>{defineJobIdentifier(job)} - {job.location.name} - {job.building} {job.title}</option>
                    ))}
                </InputField> 
            </Grid>
            <Grid item xs={12}>
                <InputField type='text' width={500}
                    disabled
                    label='Contractor' 
                    name='supplier' 
                    value={bill?.supplier.name}
                />
            </Grid>
            <Grid item xs={12}>
                <div style={{paddingTop: '10px'}}>
                    <input type="radio" id="subcontractor" name="billType" value="subcontractor" 
                        checked={bill.billType === "subcontractor"}
                        onChange={handleInput}
                    />
                    <label htmlFor="subcontractor">Subcontractor</label>
                    <span style={{display:'inline-block', width:'10px'}} />
                    <input type="radio" id="material" name="billType" value="material" 
                        checked={bill.billType === "material"}
                        onChange={handleInput}
                    />
                    <label htmlFor="material">Materials</label>

                </div>
            </Grid>
            <Grid item xs={12}>
                <InputField type='text' width={150}
                    label='Invoice Number' 
                    name='invoiceNumber' 
                    value={bill?.invoiceNumber} onChange={handleInput}
                />
                <InputField type='date' width={150}
                    label='Invoice Date' 
                    name='invoiceDate' 
                    value={bill?.invoiceDate} onChange={handleDateInput}
                />
                <InputField type='number' width={150} 
                    step={0.01} min={0}
                    label='Invoice Amount' 
                    name='amount' 
                    value={bill?.amount} onChange={handleNumberInput}
                />
            </Grid>
            <div style={{padding: '10px'}} />
            <Grid item xs={12}>
                <div className='pdf-preview'>
                    <img src={"/" + bill?.thumbnailPath} alt="PDF Preview" className='pdf-img'/>
                </div>
            </Grid>
        </>
        :
            <Grid item xs={12}>
                <CircularProgress />
            </Grid>
    }   
    </Grid>

    </>);
}

export default EditBill;