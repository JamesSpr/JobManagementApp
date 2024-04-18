import React, { useState, useEffect, useMemo } from 'react'
import useAxiosPrivate from '../../hooks/useAxiosPrivate'
import { Button, CircularProgress, Grid, IconButton, Portal } from '@mui/material'
import { Footer, Table, Tooltip, } from '../../components/Components'

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';

import { createColumnHelper } from '@tanstack/react-table'
import TimesheetEditDialog from './EditDialog'
import { IAuth, SnackType } from '../../types/types'
import { TimesheetType, EmployeeType, workDayOptions } from './Timesheets'
import TimesheetSubmission from './SubmissionDialog'

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
    const [openSubmission, setOpenSubmission] = useState(false);
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

        if(employeePayrollDetails) {
            for(let entitlement in currentEntitlements) {
                const employeeEntitlement = employeePayrollDetails['Entitlements'].find((prd: any) => prd['EntitlementCategory']['Name'] === entitlement)
                if((employeeEntitlement['Total'] - (currentEntitlements as any)[entitlement]) < 0) {
                    warning = true
                    warningMessage = entitlement + " Limit Exceeded";
                    setValidTimesheets(false);
                }
            }
        }
        
        const openTimesheetEditor = () => {
            setOpenEditor(true);
            setEmployeeEntitlements({
                id: row.id,
                employee: employee,
                work: row.original.workdaySet,
                requested: currentEntitlements,
                accrued: employeePayrollDetails['Entitlements'] ?? undefined
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
            cell: ({row, getValue}) => <p>{getValue()} ({row.original.employee.payBasis.charAt(0)})</p>,
            size: 250
        }),
        ...timesheets[0]?.workdaySet.map((workday, i) => (
            columnHelper.accessor((row: any) => row?.workdaySet[i]?.hours, {
                id: `workDay${i}`,
                header: () => new Date(workday.date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: '2-digit', year:'numeric' }),
                cell: ({getValue, row, column: { id }}) => {
                    const workType: string = row.original?.workdaySet[parseInt(id.replace("workDay", ""))]?.workType;
                    const formatType: string = (workDayOptions as any)[workType]?.colour ?? '';

                    if(getValue() == 0) {
                        return (<p style={{backgroundColor: formatType, padding: '14px 0px', margin: '0px'}}>0</p>)
                    }

                    const payBasis: string = row.original?.employee.payBasis

                    let OT = null
                    const dayOfWeek = new Date(workday.date).getDay()
                    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0)
                    const allowOvertime = row.original.workdaySet[parseInt(id.replace("workDay", ""))]?.allowOvertime;

                    if(allowOvertime && (parseFloat(getValue()) > 8 || (isWeekend && parseFloat(getValue()) > 0)) || (allowOvertime && workType == "PH")) {
                        OT = <span style={{color: "red", fontWeight: "bold"}}> *</span>
                    }

                    if(payBasis === "Salary" && !isWeekend) {
                        return (<p style={{backgroundColor: formatType, padding: '14px 0px', margin: '0px'}}>8.00 {getValue() != "8.00" ? "*" : ""}</p>)
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

    const syncPayrollCategories = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation getMyobPayrollCategories() {
                    categories: getMyobPayrollCategories() {
                        success
                        message
                    }
                }`,
                variables: {}
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
        <Grid container direction={'column'} spacing={2} style={{textAlign: 'center', overflow: "auto"}}>
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
                                    Overtime <span style={{color: "red", fontWeight: "bold"}}> *</span>
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
                {timesheets.length > 0 ?
                    <Table data={timesheets} columns={columns} />
                    : <p>No Timesheet Data Found for this period.</p>
                }
            </Grid>
        </Grid>

        <TimesheetEditDialog open={openEditor} setOpen={setOpenEditor}
            timesheets={timesheets} setTimesheets={setTimesheets} setSnack={setSnack}
            employeeEntitlements={employeeEntitlements} setEmployeeEntitlements={setEmployeeEntitlements}/>

        <TimesheetSubmission open={openSubmission} setOpen={setOpenSubmission} 
            timesheets={timesheets} setTimesheets={setTimesheets} setSnack={setSnack}
            payrollDetails={payrollDetails} dateFilter={dateFilter} auth={auth} /> 

        <Footer>
            <Tooltip title={validTimesheets ? "" : "Please fix conflicts before submitting"}>
                <Button variant='outlined'
                    disabled={!validTimesheets}
                    onClick={() => setOpenSubmission(true)}    
                >Submit Timesheets</Button>
            </Tooltip>
        </Footer>

    </> )
}

export default TimesheetView;