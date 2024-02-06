import { useState, useEffect } from 'react';
import { BillType, ExpenseType, JobType, SnackType, User } from '../../../types/types';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import { useParams } from 'react-router-dom';
import { CircularProgress, Grid } from '@mui/material';
import { InputField } from '../../../components/Components';
import { defineJobIdentifier } from '../../../components/Functions';
import useAuth from '../../auth/useAuth';
import { blankBill, blankExpense, blankJob } from '../../../types/blanks';

const EditExpense = ({expenses, setJob, setEditing, setUpdateWaiting, toggleSave, setToggleSave, setSnack}: {
    expenses: ExpenseType
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    setEditing: React.Dispatch<React.SetStateAction<"expense" | "bill" | null>>
    setUpdateWaiting: React.Dispatch<React.SetStateAction<any>>
    toggleSave: boolean
    setToggleSave: React.Dispatch<React.SetStateAction<boolean>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();

    const [expense, setExpense] = useState<ExpenseType>(blankExpense);
    const [jobs, setJobs] = useState<JobType[]>([blankJob]);
    const [employees, setEmployees] = useState<User[]>([])
    const [loading, setLoading] = useState(true);

    // Fetch bill data if none has been passed
    const { id } = useParams<string>();
    
    useEffect(() => {

        let expenseString = ""
        if(!expenses) {
            expenseString = `expenses (expenses: "${id}") {
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
                        ${expenseString}
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
                        users {
                            edges {
                                node {
                                    id
                                    firstName
                                }
                            }
                        }
                        
                    }`,
                    variables: {},
                })
            }).then((response) => {
                const res = response?.data?.data;
                
                setJobs(res.jobs);
                const employees = res.users.edges.map((emp: any) => {return emp?.node});
                setEmployees(employees);
                
                if(!expenses) {
                    setExpense(res.expenses[0]);
                }
                else { 
                    setExpense(expenses);
                }

                setLoading(false);

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
        setExpense(prev => ({...prev, [e.target.name]: e.target.value}));
    }
    
    const handleNumberInput = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? 0 : e.target.value
        setExpense(prev => ({...prev, [e.target.name]: val}));
    }
    
    const handleDateInput = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? null : e.target.value
        setExpense(prev => ({...prev, [e.target.name]: val}));
    }
    
    const handleSelection = (e: { target: { name?: any; value?: any; }; }) => {
        const val = e.target.value === "" ? null : {id: e.target.value}
        setExpense(prev => ({...prev, [e.target.name]: val}));
    }

    const handleSave = async () => {
        if(setUpdateWaiting != null) {setUpdateWaiting((prev: any) => ({...prev, update: true}));}

        // Post bill details to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobUpdateExpense($uid:String!, $expense: ExpenseInput!) {
                    update: myobUpdateExpense(uid:$uid, expense: $expense) {
                        success
                        message
                        job {
                            expenseSet {
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
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    expense: expense,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.update;
            if(setUpdateWaiting != null) {setUpdateWaiting((prev: any) => ({...prev, update: false}));}
            
            if(res.success) {
                setSnack({active: true, variant: 'success', message: res.message})
                setToggleSave(false);
                setJob(prev => ({...prev, expenseSet: res.job.expenseSet}));
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
                    value={expense?.job?.id ?? ""} onChange={handleSelection}
                >
                    <option key="nullJob" value=""></option>
                    {jobs.map(job => (
                        <option key={job.id} value={job.id}>{defineJobIdentifier(job)} - {job.location.name} - {job.building} {job.title}</option>
                    ))}
                </InputField> 
            </Grid>
            <Grid item xs={12}>
                <InputField type="select" width={500}
                    label="Employee" name="employee" 
                    value={expense?.employee?.id ?? ""} onChange={handleSelection}
                >
                    <option key="nullJob" value=""></option>
                    {employees.map(employee => (
                        <option key={employee?.id} value={employee?.id}>{employee?.firstName}</option>
                    ))}
                </InputField> 
            </Grid>
            <Grid item xs={12}>
                <InputField type='text' width={500}
                    disabled
                    label='Contractor' 
                    name='supplier' 
                    value={expense?.vendor}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField type='date' width={150}
                    label='Invoice Date' 
                    name='invoiceDate' 
                    value={expense?.expenseDate} onChange={handleDateInput}
                />
                <InputField type='number' width={150} 
                    step={0.01} min={0}
                    label='Invoice Amount' 
                    name='amount' 
                    value={expense?.amount} onChange={handleNumberInput}
                />
            </Grid>
            <div style={{padding: '10px'}} />
            <Grid item xs={12}>
                <div className='pdf-preview'>
                    <img src={"\\" + expense?.thumbnailPath} alt="PDF Preview"  className='pdf-img'/>
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

export default EditExpense;