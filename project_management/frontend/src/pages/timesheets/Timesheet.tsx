import React, { useState, useEffect, useMemo } from 'react'
import useAxiosPrivate from '../../hooks/useAxiosPrivate'
import { useParams } from 'react-router-dom'
import { Button, CircularProgress, Grid, IconButton, Portal } from '@mui/material'
import { BasicDialog, Footer, ProgressButton, SnackBar, Table, Tooltip, } from '../../components/Components'
import { ColumnDef, RowSelection } from '@tanstack/react-table'
import useAuth from '../auth/useAuth'

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';

import { createColumnHelper } from '@tanstack/react-table'
import TimesheetEditDialog from './TimesheetEditDialog'
import { IAuth, SnackType } from '../../types/types'

interface EmployeeType {
    id: string
    name: string
    myobUid: string
    payBasis: string
}

interface WorkdayType {
    date: Date
    hours: string
    workType: string
    job: string
    notes: string
    allowOvertime: boolean
}

export interface TimesheetType {
    id: string
    startDate: Date
    endDate: Date
    employee: EmployeeType
    workdaySet: WorkdayType[]
    sentToMyob: boolean
}

export const workDayOptions = {
    "Normal": {
        name: "Normal Hours",
        colour: 'None'
    },
    "AL": {
        name: "Annual Leave",
        colour: '#caa5d4'
    },
    "SICK": {
        name: "Sick Leave",
        colour: '#44d62c'
    },
    "PH": {
        name: "Public Holiday",
        colour: '#8484d7'
    },
    "LWP": {
        name: "Leave Without Pay",
        colour: '#767875'
    },
    "": {
        name: "No Hours",
        colour: '#b1b3b1'
    },
}

const Timesheet = () => {
    const axiosPrivate = useAxiosPrivate()
    const { auth } = useAuth();

    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [timesheets, setTimesheets] = useState<TimesheetType[]>([]);
    const [payrollDetails, setPayrollDetails] = useState<any[]>([])
    const [dateFilter, setDateFilter] = useState<Date[]>([]);
    const [filterPayrollEmployees, setFilterPayrollEmployees] = useState(false);
    
    const [snack, setSnack] = useState<SnackType>({active: false, message: '', variant: 'info'});
    
    const { endDate } = useParams();

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `query TimesheetDetails($endDate: String) {
                        employees {
                            myobUid
                            id
                            name
                            payBasis
                        }
                        timesheets (endDate: $endDate){
                            id
                            employee {
                                name
                                payBasis
                            }
                            workdaySet {
                                id
                                date
                                hours
                                workType
                                job
                                notes
                                allowOvertime
                            }
                            sentToMyob
                        }
                    }`,
                    variables: {
                        endDate: endDate
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data;

                setEmployees(res.employees);

                // Ensure all timesheet workdays are sorted by date for the columns
                for(let i = 0; i < res.timesheets.length; i ++) {
                    res.timesheets[i].workdaySet.sort((a: WorkdayType, b: WorkdayType) => {
                        return a.date > b.date ? 1 : -1;
                    })
                }
                setTimesheets(res.timesheets);

                if(endDate){
                    let startDate = new Date(endDate)
                    startDate.setDate(startDate.getDate() - 13);
                    setDateFilter([startDate, new Date(endDate)]);
                }
            });
        }

        fetchData();

        const getPayrollDetails = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: ` mutation getPayrollDetails ($uid: String!) {
                        details: getPayrollDetails(uid:$uid) {
                            success
                            message
                            details
                        }
                    }`,
                    variables: {
                        uid: auth?.myob.id
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data.details;

                if(res?.success) {
                    const details = JSON.parse(res.details);
                    setPayrollDetails(details);
                    setFilterPayrollEmployees(true);
                }
                else {
                    setSnack({variant: "error", message: res.message + " - Error getting Payroll Details. Please contact Developer", active: true});
                    console.log(response)
                }
            })

        }
        getPayrollDetails();

        return () => {
            controller.abort();
        }

    }, [])

    useEffect(() => {
        if(payrollDetails.length > 0 && employees.length > 0) {
            setPayrollDetails(payrollDetails.filter((item: any) => {
                return employees.some((e) => {
                    return e.myobUid === item['Employee']['UID'];
                })
            }))
            
            setLoading(false);
            setFilterPayrollEmployees(false);
        }   
    }, [filterPayrollEmployees])

    return ( <> 
        { 
            !loading ?
            endDate ? <>
                    <TimesheetView 
                        timesheets={timesheets} setTimesheets={setTimesheets} 
                        payrollDetails={payrollDetails} employees={employees} 
                        auth={auth} dateFilter={dateFilter} setSnack={setSnack}/> 
                </>
                :  
                <>              
                    <p>Timesheets</p>
                </>
            :
            <Grid container direction={'column'} spacing={2} alignContent={'center'}>
                <Grid item xs={12}>
                    <CircularProgress />
                </Grid>
            </Grid>
        }

        <Portal>
            <SnackBar snack={snack} setSnack={setSnack} />
        </Portal>

    </>
    )
}

const TimesheetView = ({timesheets, setTimesheets, payrollDetails, employees, auth, dateFilter, setSnack }: {
    timesheets: TimesheetType[]
    setTimesheets: React.Dispatch<React.SetStateAction<TimesheetType[]>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
    payrollDetails: any
    employees: EmployeeType[],
    auth: IAuth | undefined
    dateFilter: Date[]
}) => {

    const axiosPrivate = useAxiosPrivate()
    const [employeeEntitlements, setEmployeeEntitlements] = useState<any>({});
    const [openEditor, setOpenEditor] = useState(false);
    const [validTimesheets, setValidTimesheets] = useState(true);

    useEffect(() => {
        setValidTimesheets(true);
    }, [timesheets])

    const PayrollChecks = ({ getValue, row, column: { id }, table }:
        { getValue: any, row:  any, column: { id: any }, table: any }) => {
        
        if(row.original.sentToMyob) {
            return (
                <Tooltip title="Processed in MYOB">
                    <DoneAllIcon />
                </Tooltip>
            )
        }

        if(payrollDetails.length <= 0) {
            return (
                <CheckIcon />
            )
        }

        let warning = false;
        let warningMessage = "No Issues Found";

        const employee = employees.find(emp => emp.name === row.original.employee.name)
        const employeePayrollDetails = payrollDetails.filter((pr: any) => pr['Employee']['UID'] === employee?.myobUid)[0]

        // Calculate the total entitlements for the period
        const currentEntitlements = {'Annual Leave Accrual': 0, 'Personal Leave Accrual': 0}
        row?.original?.workdaySet?.map((day: any) => {
            if(day?.workType === "AL") {
                currentEntitlements['Annual Leave Accrual'] += parseFloat(day?.hours ?? 0)
            }
            if(day?.workType === "SICK") {
                currentEntitlements['Personal Leave Accrual'] += parseFloat(day?.hours ?? 0)
            }
        })

        for(let entitlement in currentEntitlements) {
            const employeeEntitlement = employeePayrollDetails['Entitlements'].find((prd: any) => prd['EntitlementCategory']['Name'] === entitlement)
            if((employeeEntitlement['Total'] - (currentEntitlements as any)[entitlement]) < 0) {
                warning = true
                warningMessage = entitlement + " Limit Exceeded";
                setValidTimesheets(false);
            }
        }

        const openTimesheetEditor = () => {
            setOpenEditor(true);
            setEmployeeEntitlements({
                id: row.id,
                employee: employee,
                work: row.original.workdaySet,
                requested: currentEntitlements,
                accrued: employeePayrollDetails['Entitlements']
            });
        }

        if(warning) {
            return (
            <>
                <div style={{display:'inline-block', position: 'relative', top: '8px'}}>
                    <Tooltip title={warningMessage}>
                        <WarningAmberIcon />
                    </Tooltip>
                </div>
                <IconButton onClick={openTimesheetEditor}>
                    <EditIcon />
                </IconButton>
            </>
            )
        }

        return (
        <>
            <div style={{display:'inline-block', position: 'relative', top: '8px'}}>
                <Tooltip title={warningMessage}>
                    <CheckIcon />
                </Tooltip>
            </div>
            <IconButton onClick={openTimesheetEditor}>
                <EditIcon />
            </IconButton>
        </>
        )
    }

    const columnHelper = createColumnHelper<TimesheetType>()
    const columns = [
        columnHelper.accessor((row: any) => row?.employee?.name, {
            id: 'employee',
            header: () =>  <p style={{textAlign: 'center'}}>Employee</p>,
            cell: (info: any) => info.getValue(),
            size: 250
        }),
        ...timesheets[0]?.workdaySet.map((workday, i) => (
            columnHelper.accessor((row: any) => row?.workdaySet[i]?.hours, {
                id: `workDay${i}`,
                header: () => new Date(workday.date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: '2-digit', year:'numeric' }),
                cell: ({getValue, row, column: { id }}) => {

                    const workType: string = row.original?.workdaySet[parseInt(id.replace("workDay", ""))]?.workType;
                    const formatType: string = (workDayOptions as any)[workType]?.colour ?? '';

                    let OT = null
                    const dayOfWeek = new Date(workday.date).getDay()
                    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0)
                    const allowOvertime = row.original.workdaySet[parseInt(id.replace("workDay", ""))]?.allowOvertime;

                    if(allowOvertime && (parseFloat(getValue()) > 8 || (isWeekend && parseFloat(getValue()) > 0)) || (allowOvertime && workType == "PH")) {
                        OT = <span style={{color: "red", fontWeight: "bold"}}> *</span>
                    }
                    
                    return (<p style={{backgroundColor: formatType, padding: '14px 0px', margin: '0px'}}>{getValue()} {OT}</p>)
                },
                size: 80,
            })
        )) ?? {}, 
        columnHelper.display({
            id: 'status',
            header: '',
            size: 100,
            cell: PayrollChecks,    
        }),
    ]

    const handleSubmitTimesheets = async () => {
        // console.log(timesheets)
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation submitTimesheets($uid:String!, $timesheets: [TimesheetInputType]!, $startDate: String!, $endDate: String!) {
                    submit: submitTimesheets(uid:$uid, timesheets:$timesheets, startDate: $startDate, endDate: $endDate) {
                        success
                        message
                        debug
                        timesheets {
                            id
                            employee {
                                name
                            }
                            workdaySet {
                                id
                                date
                                hours
                                workType
                                job
                                notes
                                allowOvertime
                            }
                            sentToMyob
                        }
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    timesheets: timesheets,
                    startDate: dateFilter[0],
                    endDate: dateFilter[1],
                }
            }),
        }).then((response) => {
            const res = response?.data?.data?.submit;

            if(res.success) {
                // Ensure all timesheet workdays are sorted by date for the columns
                for(let i = 0; i < res.timesheets.length; i ++) {
                    res.timesheets[i].workdaySet.sort((a: WorkdayType, b: WorkdayType) => {
                        return a.date > b.date ? 1 : -1;
                    })
                }
                setTimesheets(res.timesheets)
                if(res.debug) {console.log(JSON.parse(res.debug))}
                setSnack({active: true, message:res.message, variant:'success'})
            }
            else {
                // Update if partial submission
                if(res.timesheets) {
                    // Ensure all timesheet workdays are sorted by date for the columns
                    for(let i = 0; i < res.timesheets.length; i ++) {
                        res.timesheets[i].workdaySet.sort((a: WorkdayType, b: WorkdayType) => {
                            return a.date > b.date ? 1 : -1;
                        })
                    }
                    setTimesheets(res.timesheets)
                }

                setSnack({active: true, message:"Error Updating Timesheet. Contact Developer." + res.message, variant:'error'})
                console.log(res)
            }
        });
    }

    const syncPayrollCategories = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation getMyobPayrollCategories($uid:String!) {
                    categories: getMyobPayrollCategories(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            }),
        }).then((response) => {
            const res = response?.data?.data?.categories;

            if(res.success) {
                setSnack({active: true, message:res.message, variant:'success'})
            }
            else {
                setSnack({active: true, message:"Error Updating Timesheet. Contact Developer." + res.message, variant:'error'})
                console.log(res)
            }
        });
    }

    return( <>
        <Grid container direction={'column'} spacing={2} style={{textAlign: 'center', overflow: "auto", margin: 'auto'}}>
            <Grid item xs={12}>
            {dateFilter.length > 0 && 
                <h2>{dateFilter[0]?.toLocaleDateString('en-AU', { timeZone: 'UTC' }) ?? ''} - {dateFilter[1]?.toLocaleDateString('en-AU', { timeZone: 'UTC' }) ?? ''}</h2>
            }
            </Grid>
            {/* Display the Colour Key */}
            <Grid item xs={12}>
                <div>
                    {Object.keys(workDayOptions).map((key: string, i: number) => {
                        
                        if(i == 0) {
                            return (<>
                                <p style={{backgroundColor: (workDayOptions as any)[key]['colour'] ?? '', display: 'inline', padding: '0px 5px', margin: '5px'}}>
                                    {(workDayOptions as any)[key]['name']}
                                </p>
                                <p style={{display: 'inline', padding: '0px 5px', margin: '5px'}}>
                                    <span style={{color: "red", fontWeight: "bold"}}> *</span> Overtime
                                </p> 
                            </>)
                        }

                        return (
                        <p style={{backgroundColor: (workDayOptions as any)[key]['colour'] ?? '', display: 'inline', padding: '10px 15px', margin: '5px'}}>
                            {(workDayOptions as any)[key]['name']}
                        </p>
                        )
                    })}
                </div>
            </Grid>
            <Grid item xs={12}>
                <button onClick={() => console.log(payrollDetails)}>Payroll Details</button>
                <button onClick={syncPayrollCategories}>Sync Payroll Categories</button>
            </Grid>
            <Grid item xs={12}>
                {timesheets.length > 0 ?
                    <Table data={timesheets} columns={columns} />
                    : <p>No Timesheet Data Found for this period.</p>
                }
            </Grid>
        </Grid>

        <TimesheetEditDialog open={openEditor} setOpen={setOpenEditor}
            timesheets={timesheets} setTimesheets={setTimesheets} 
            employeeEntitlements={employeeEntitlements} setEmployeeEntitlements={setEmployeeEntitlements}/>

        <Footer>
            <Tooltip title={validTimesheets ? "" : "Please fix conflicts before submitting"}>
                <Button variant='outlined'
                    disabled={!validTimesheets}
                    onClick={handleSubmitTimesheets}    
                >Submit Timesheets</Button>
            </Tooltip>
        </Footer>

    </> )
}

export default Timesheet;